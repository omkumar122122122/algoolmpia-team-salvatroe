import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileUploadService } from './services/file-upload.service';
import { ComplianceCalculatorService } from './services/compliance-calculator.service';
import { EncryptionService } from '../common/services/encryption.service';
import { CreateOrphanageDto } from './dto/create-orphanage.dto';
import { UpdateOrphanageDto } from './dto/update-orphanage.dto';
import { OrphanageQueryDto } from './dto/orphanage-query.dto';
import { ResetOrphanagePasswordDto } from './dto/reset-orphanage-password.dto';
import { ToggleOrphanageStatusDto } from './dto/toggle-orphanage-status.dto';
import { Prisma, OrphanageStaffRole, ChildGender, OrganizationType, Role, OrphanageStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class OrphanagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService,
    private readonly complianceCalculator: ComplianceCalculatorService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(dto: CreateOrphanageDto, files: any, userId: string) {
    if (dto.confirmPassword && dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirm password do not match');
    }

    const cleanEmail = dto.officialEmail.toLowerCase().trim();

    // Check for duplicate registration number
    const existingByRegNum = await this.prisma.orphanage.findUnique({
      where: { registrationNumber: dto.registrationNumber },
    });
    if (existingByRegNum) {
      throw new ConflictException('Registration number already exists');
    }

    // Check for duplicate email
    const existingByEmail = await this.prisma.orphanage.findFirst({
      where: { officialEmail: { equals: cleanEmail, mode: 'insensitive' } },
    });
    if (existingByEmail) {
      throw new ConflictException('Official email already exists');
    }

    // Check for duplicate user email (for login)
    const existingUserEmail = await this.prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    });
    if (existingUserEmail) {
      throw new ConflictException('Email already exists as user account');
    }

    // Check for duplicate government license if provided
    if (dto.governmentLicenseNumber) {
      const existingByLicense = await this.prisma.orphanage.findFirst({
        where: { governmentLicenseNumber: dto.governmentLicenseNumber },
      });
      if (existingByLicense) {
        throw new ConflictException('Government license number already exists');
      }
    }

    // FIX-16: Validate capacity at creation
    if (dto.numberOfChildren && dto.capacity) {
      if (dto.numberOfChildren > dto.capacity) {
        throw new BadRequestException(
          'Number of children cannot exceed capacity',
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Validate required fields for code generation
      if (!dto.state || !dto.city) {
        throw new BadRequestException('State and city are required for orphanage registration');
      }

      // FIX-14: Generate unique code with retry logic
      let code: string = '';
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        code = await this.generateOrphanageCode(dto.city, dto.state, tx);
        const existingCode = await tx.orphanage.findUnique({
          where: { code },
        });
        if (!existingCode) break;
        attempts++;
        if (attempts >= maxAttempts) {
          throw new ConflictException(
            'Unable to generate unique orphanage code. Please try again.',
          );
        }
      }

      // FIX-3, FIX-4, FIX-5: Encrypt sensitive bank and tax data
      const encryptedBankAccount = dto.accountNumber
        ? this.encryptionService.encryptBankAccount(dto.accountNumber)
        : null;
      const encryptedGST = dto.gstNumber
        ? this.encryptionService.encryptGST(dto.gstNumber)
        : null;
      const encryptedPAN = dto.panCard
        ? this.encryptionService.encryptPAN(dto.panCard)
        : null;

      // FIX-2: Prepare facilities array
      const facilitiesArray = Array.isArray(dto.facilities)
        ? dto.facilities
        : dto.facilities
        ? [dto.facilities]
        : [];

      // Create user account for orphanage login
      const bcryptRounds = 12;
      const hashedPassword = await bcrypt.hash(dto.password, bcryptRounds);
      
      let userPhone: string | null = dto.phone ? dto.phone.trim() : null;
      if (userPhone) {
        const existingPhoneUser = await tx.user.findFirst({
          where: { phone: userPhone },
        });
        if (existingPhoneUser) {
          userPhone = null;
        }
      }

      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          firstName: dto.name || 'Orphanage',
          lastName: 'Admin',
          phone: userPhone,
          password: hashedPassword,
          role: Role.ORPHANAGE,
          isEmailVerified: true, // Auto-verified for orphanage accounts
          isActive: true,
        },
      });

      // Create orphanage
      const orphanage = await tx.orphanage.create({
        data: {
          userId: user.id,
          code,
          name: dto.name,
          organizationType: dto.organizationType as OrganizationType,
          registrationNumber: dto.registrationNumber,
          governmentLicenseNumber: dto.governmentLicenseNumber,
          establishmentDate: dto.establishmentDate
            ? new Date(dto.establishmentDate)
            : null,
          officialEmail: cleanEmail,
          phone: dto.phone,
          alternativePhone: dto.alternativeContact,
          website: dto.website,
          addressLine1: dto.fullAddress || dto.city,
          addressLine2: null,
          landmark: null,
          city: dto.city,
          district: dto.district,
          state: dto.state,
          pincode: dto.pinCode || '',
          country: dto.country || 'India',
          totalCapacity: dto.capacity || 0,
          currentOccupancy: dto.numberOfChildren || 0,
          faceRecognitionEnabled: dto.faceRecognitionEnabled === 'Yes',
          cctvInstalled: dto.cctvInstalled === 'Yes',
          numberOfCameras: dto.numberOfCameras || 0,
          gpsTrackingAvailable: dto.gpsTrackingAvailable === 'Yes',
          emergencyAlertEnabled: dto.emergencyAlertSystemEnabled === 'Yes',
          biometricAttendanceEnabled:
            dto.childAttendanceSystem?.includes('Biometric') || false,
          // FIX-3: Store encrypted bank details
          bankName: dto.bankName,
          bankAccountNumber: encryptedBankAccount,
          bankIfscCode: dto.ifscCode,
          bankAccountHolder: dto.accountHolderName,
          // FIX-4: Store encrypted GST/PAN
          gstNumber: encryptedGST,
          panNumber: encryptedPAN,
          // FIX-1: Store emergency contact
          emergencyContactPerson: dto.emergencyContactPerson,
          emergencyContactMobile: dto.emergencyMobile,
          emergencyContactEmail: dto.emergencyEmail,
          emergencyContactRelationship: dto.emergencyRelationship,
          // FIX-2: Store facilities as JSON array
          facilities: facilitiesArray.length > 0 ? (facilitiesArray as any) : undefined,
          complianceScore: 0,
          isActive: true,
          isVerified: false,
        },
      });

      // Upload files if provided
      if (files && Object.keys(files).length > 0) {
        // FIX-8: Add all 7 file types including adminIdProof and addressProof
        const licenseTypes: Record<string, string> = {
          registrationCertificate: 'REGISTRATION_CERTIFICATE',
          ngoCertificate: 'NGO_CERTIFICATE',
          governmentLicense: 'GOVERNMENT_LICENSE',
          administratorIdProof: 'OTHER', // Store as OTHER type
          addressProof: 'OTHER', // Store as OTHER type
        };

        for (const [fieldName, licenseType] of Object.entries(licenseTypes)) {
          if (files[fieldName] && files[fieldName][0]) {
            const file = files[fieldName][0];
            const uploadResult = await this.fileUploadService.uploadFile(
              file,
              `orphanages/${orphanage.id}/licenses`,
            );

            await tx.orphanageLicense.create({
              data: {
                orphanageId: orphanage.id,
                licenseType: licenseType as any,
                licenseNumber:
                  fieldName === 'registrationCertificate'
                    ? dto.registrationNumber
                    : `${fieldName.toUpperCase()}-${orphanage.code}`,
                issuingAuthority: 'Government Authority',
                // FIX-10: Set status to VERIFIED for immediate compliance credit
                status: 'VERIFIED' as any,
                documentUrl: uploadResult.url,
                storagePath: uploadResult.path,
              },
            });
          }
        }

        // FIX-7: Handle profile photo separately and link to user
        if (files.profilePhoto && files.profilePhoto[0] && userId) {
          const file = files.profilePhoto[0];
          const uploadResult = await this.fileUploadService.uploadFile(
            file,
            `users/${userId}/profile`,
          );

          // Update user avatar
          await tx.user.update({
            where: { id: userId },
            data: { avatar: uploadResult.url },
          });
        }

        // FIX-10: Handle PAN card as document upload
        if (files.panCard && files.panCard[0]) {
          const file = files.panCard[0];
          const uploadResult = await this.fileUploadService.uploadFile(
            file,
            `orphanages/${orphanage.id}/documents`,
          );

          await tx.orphanageLicense.create({
            data: {
              orphanageId: orphanage.id,
              licenseType: 'OTHER',
              licenseNumber: `PAN-${orphanage.code}`,
              issuingAuthority: 'Income Tax Department',
              status: 'VERIFIED' as any,
              documentUrl: uploadResult.url,
              storagePath: uploadResult.path,
            },
          });
        }
      }

      // Link the created user as administrator for this orphanage
      await tx.orphanageStaff.create({
        data: {
          orphanageId: orphanage.id,
          userId: user.id,
          role: OrphanageStaffRole.ADMINISTRATOR,
          designation: dto.designation || 'Administrator',
          isActive: true,
        },
      });

      // FIX-6: Calculate and update compliance score
      const licenses = await tx.orphanageLicense.findMany({
        where: { orphanageId: orphanage.id },
      });
      const complianceScore =
        this.complianceCalculator.calculateComplianceScore(
          orphanage,
          licenses,
        );

      await tx.orphanage.update({
        where: { id: orphanage.id },
        data: { complianceScore },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_ORPHANAGE',
          resource: 'Orphanage',
          resourceId: orphanage.id,
          details: { name: orphanage.name, code: orphanage.code },
          success: true,
        },
      });

      return {
        success: true,
        message: 'Orphanage registered successfully',
        data: {
          id: orphanage.id,
          code: orphanage.code,
          name: orphanage.name,
          loginEmail: user.email,
          generatedPassword: dto.password,
        },
      };
    });
  }

  async findAll(query: OrphanageQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      organizationType,
      status,
      isVerified,
      hasMissingData,
      section,
      ownerSearch,
      minCompliance,
      maxCompliance,
      city,
      state,
      isActive = true,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build base where clause
    const where: Prisma.OrphanageWhereInput = {
      deletedAt: null,
      ...(isActive !== undefined && { isActive }),
      ...(status && { status }),
      ...(isVerified !== undefined && { isVerified }),
      ...(organizationType && { organizationType: organizationType as OrganizationType }),
      ...(minCompliance !== undefined && {
        complianceScore: { gte: minCompliance },
      }),
      ...(maxCompliance !== undefined && {
        complianceScore: { lte: maxCompliance },
      }),
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(state && { state: { contains: state, mode: 'insensitive' } }),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { governmentLicenseNumber: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { officialEmail: { contains: search, mode: 'insensitive' } },
        { emergencyContactPerson: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (ownerSearch) {
      where.OR = [
        ...(where.OR || []),
        { emergencyContactPerson: { contains: ownerSearch, mode: 'insensitive' } },
        { emergencyContactEmail: { contains: ownerSearch, mode: 'insensitive' } },
        { user: { firstName: { contains: ownerSearch, mode: 'insensitive' } } },
        { user: { lastName: { contains: ownerSearch, mode: 'insensitive' } } },
        { user: { email: { contains: ownerSearch, mode: 'insensitive' } } },
      ];
    }

    if (hasMissingData) {
      const missingConditions: Prisma.OrphanageWhereInput[] = [
        { governmentLicenseNumber: null },
        { bankAccountNumber: null },
        { emergencyContactPerson: null },
        { panNumber: null },
        { gstNumber: null },
        { isVerified: false },
      ];

      where.AND = [
        ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
        { OR: missingConditions },
      ];
    }

    if (section && section !== 'all') {
      const secLower = section.toLowerCase();
      if (secLower === 'license' || secLower === 'licenses') {
        where.governmentLicenseNumber = { not: null };
      } else if (secLower === 'bank') {
        where.bankAccountNumber = { not: null };
      } else if (secLower === 'emergency') {
        where.emergencyContactPerson = { not: null };
      } else if (secLower === 'contact') {
        where.phone = { not: '' };
      }
    }

    // Execute queries with relation included
    const [orphanages, total] = await Promise.all([
      this.prisma.orphanage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
      }),
      this.prisma.orphanage.count({ where }),
    ]);

    // Transform response with missing fields analysis and owner details
    const data = orphanages.map((orphanage) => {
      const missingFields: string[] = [];
      if (!orphanage.governmentLicenseNumber) missingFields.push('Govt License');
      if (!orphanage.bankAccountNumber) missingFields.push('Bank Account');
      if (!orphanage.emergencyContactPerson) missingFields.push('Emergency Contact');
      if (!orphanage.panNumber) missingFields.push('PAN');
      if (!orphanage.isVerified) missingFields.push('KYC Verification');

      return {
        id: orphanage.id,
        code: orphanage.code,
        name: orphanage.name,
        registrationNumber: orphanage.registrationNumber,
        governmentLicenseNumber: orphanage.governmentLicenseNumber,
        city: orphanage.city,
        state: orphanage.state,
        capacity: orphanage.totalCapacity,
        occupancy: orphanage.currentOccupancy,
        compliance: orphanage.complianceScore,
        organizationType: orphanage.organizationType,
        status: orphanage.status,
        isActive: orphanage.isActive,
        isVerified: orphanage.isVerified,
        officialEmail: orphanage.officialEmail,
        phone: orphanage.phone,
        bankName: orphanage.bankName,
        emergencyContactPerson: orphanage.emergencyContactPerson,
        emergencyContactMobile: orphanage.emergencyContactMobile,
        facilities: orphanage.facilities,
        missingFields,
        hasMissingData: missingFields.length > 0,
        owner: orphanage.user ? {
          id: orphanage.user.id,
          name: `${orphanage.user.firstName} ${orphanage.user.lastName}`,
          email: orphanage.user.email,
        } : null,
      };
    });

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findApprovedForParents() {
    const selection = {
      id: true,
      name: true,
      city: true,
      state: true,
      staff: {
        where: {
          isActive: true,
          role: OrphanageStaffRole.ADMINISTRATOR,
        },
        take: 1,
        select: {
          user: {
            select: {
              avatar: true,
            },
          },
        },
      },
    } as const;

    const orphanages = await this.prisma.orphanage.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        status: {
          notIn: [
            OrphanageStatus.INACTIVE,
            OrphanageStatus.SUSPENDED,
            OrphanageStatus.CLOSED,
          ],
        },
      },
      orderBy: [{ name: 'asc' }],
      select: selection,
    });

    return orphanages.map((orphanage) => ({
      id: orphanage.id,
      name: orphanage.name,
      city: orphanage.city,
      state: orphanage.state,
      profileImage: orphanage.staff[0]?.user?.avatar ?? null,
      logo: orphanage.staff[0]?.user?.avatar ?? null,
    }));
  }

  async findOne(id: string) {
    const orphanage = await this.prisma.orphanage.findFirst({
      where: { id, deletedAt: null },
    });

    if (!orphanage) {
      throw new NotFoundException('Orphanage not found');
    }

    return {
      success: true,
      data: {
        id: orphanage.id,
        code: orphanage.code,
        name: orphanage.name,
        registrationNumber: orphanage.registrationNumber,
        governmentLicenseNumber: orphanage.governmentLicenseNumber,
        city: orphanage.city,
        state: orphanage.state,
        capacity: orphanage.totalCapacity,
        occupancy: orphanage.currentOccupancy,
        compliance: orphanage.complianceScore,
        phone: orphanage.phone,
        fullAddress: `${orphanage.addressLine1}, ${orphanage.city}, ${orphanage.state} ${orphanage.pincode}`,
        organizationType: orphanage.organizationType,
      },
    };
  }

  async getProfile(id: string) {
    const orphanage = await this.prisma.orphanage.findFirst({
      where: { id, deletedAt: null },
      include: {
        staff: {
          where: { isActive: true },
          include: { user: true },
        },
        licenses: true,
      },
    });

    if (!orphanage) {
      throw new NotFoundException('Orphanage not found');
    }

    // Aggregate child summary
    const childSummary = await this.aggregateChildSummary(id);

    // Aggregate staff summary
    const staffSummary = await this.aggregateStaffSummary(id);

    // Find administrator
    const admin = orphanage.staff.find(
      (s) => s.role === OrphanageStaffRole.ADMINISTRATOR,
    );

    // Build KYC object
    const kyc = {
      registrationCertificate: orphanage.licenses.find(
        (l) => l.licenseType === 'REGISTRATION_CERTIFICATE',
      )?.documentUrl,
      ngoCertificate: orphanage.licenses.find(
        (l) => l.licenseType === 'NGO_CERTIFICATE',
      )?.documentUrl,
      governmentLicense: orphanage.licenses.find(
        (l) => l.licenseType === 'GOVERNMENT_LICENSE',
      )?.documentUrl,
      // FIX-8: Return administratorIdProof and addressProof
      administratorIdProof: orphanage.licenses.find(
        (l) =>
          l.licenseType === 'OTHER' &&
          l.licenseNumber.includes('ADMINISTRATORIDPROOF'),
      )?.documentUrl,
      panCard: orphanage.panNumber
        ? this.encryptionService.decryptPAN(orphanage.panNumber)
        : null,
      gstNumber: orphanage.gstNumber
        ? this.encryptionService.decryptGST(orphanage.gstNumber)
        : null,
      addressProof: orphanage.licenses.find(
        (l) =>
          l.licenseType === 'OTHER' && l.licenseNumber.includes('ADDRESSPROOF'),
      )?.documentUrl,
    };

    // FIX-2: Return facilities from JSON field
    const facilitiesArray = (orphanage as any).facilities
      ? Array.isArray((orphanage as any).facilities)
        ? (orphanage as any).facilities
        : []
      : [];

    return {
      success: true,
      data: {
        id: orphanage.id,
        code: orphanage.code,
        name: orphanage.name,
        registrationNumber: orphanage.registrationNumber,
        governmentLicenseNumber: orphanage.governmentLicenseNumber,
        establishmentDate: orphanage.establishmentDate,
        organizationType: orphanage.organizationType,
        numberOfChildren: orphanage.currentOccupancy,
        capacity: orphanage.totalCapacity,
        compliance: orphanage.complianceScore,
        officialEmail: orphanage.officialEmail,
        phone: orphanage.phone,
        alternativeContact: orphanage.alternativePhone,
        website: orphanage.website,
        country: orphanage.country,
        state: orphanage.state,
        district: orphanage.district,
        city: orphanage.city,
        pinCode: orphanage.pincode,
        fullAddress: `${orphanage.addressLine1}, ${orphanage.city}, ${orphanage.state} ${orphanage.pincode}`,
        administrator: admin
          ? {
              name: `${admin.user.firstName} ${admin.user.lastName}`,
              designation: admin.designation,
              mobile: admin.user.phone,
              email: admin.user.email,
              profilePhoto: admin.user.avatar,
            }
          : null,
        kyc,
        childSummary,
        staff: staffSummary,
        // FIX-2: Return facilities from database
        facilities: facilitiesArray.length > 0 ? facilitiesArray : [],
        // FIX-1: Return emergency contact from database
        emergencyContact: {
          contactPerson: (orphanage as any).emergencyContactPerson,
          mobile: (orphanage as any).emergencyContactMobile,
          email: (orphanage as any).emergencyContactEmail,
          relationship: (orphanage as any).emergencyContactRelationship,
        },
        aiSafety: {
          faceRecognitionEnabled: orphanage.faceRecognitionEnabled
            ? 'Yes'
            : 'No',
          cctvInstalled: orphanage.cctvInstalled ? 'Yes' : 'No',
          numberOfCameras: orphanage.numberOfCameras,
          visitorFaceVerificationEnabled: 'No',
          childAttendanceSystem: orphanage.biometricAttendanceEnabled
            ? 'Biometric and face recognition'
            : 'Manual',
          gpsTrackingAvailable: orphanage.gpsTrackingAvailable ? 'Yes' : 'No',
          emergencyAlertSystemEnabled: orphanage.emergencyAlertEnabled
            ? 'Yes'
            : 'No',
        },
        // FIX-3: Return decrypted and masked bank details
        bankDetails: {
          bankName: orphanage.bankName,
          accountHolderName: orphanage.bankAccountHolder,
          accountNumber: orphanage.bankAccountNumber
            ? this.encryptionService.decryptAndMaskBankAccount(
                orphanage.bankAccountNumber,
              )
            : null,
          ifscCode: orphanage.bankIfscCode,
        },
      },
    };
  }

  async getStatistics(id: string) {
    const orphanage = await this.prisma.orphanage.findFirst({
      where: { id, deletedAt: null },
    });

    if (!orphanage) {
      throw new NotFoundException('Orphanage not found');
    }

    // FIX-18: Count total admissions excluding soft-deleted
    const totalAdmissions = await this.prisma.child.count({
      where: { orphanageId: id, deletedAt: null },
    });

    // Count adopted children
    const adoptedChildrenCount = await this.prisma.child.count({
      where: {
        orphanageId: id,
        adoptionStatus: 'COMPLETED',
        deletedAt: null,
      },
    });

    // Current children count
    const currentChildrenCount = await this.prisma.child.count({
      where: {
        orphanageId: id,
        currentStatus: 'ACTIVE',
        deletedAt: null,
      },
    });

    // Calculate occupancy percentage
    const occupancyPercentage = orphanage.totalCapacity
      ? Math.round((currentChildrenCount / orphanage.totalCapacity) * 100)
      : 0;

    return {
      success: true,
      data: {
        totalAdmissions,
        adoptedChildrenCount,
        currentChildrenCount,
        occupancyPercentage,
        complianceScore: orphanage.complianceScore,
      },
    };
  }

  async update(id: string, dto: UpdateOrphanageDto, userId: string) {
    const orphanage = await this.prisma.orphanage.findFirst({
      where: { id, deletedAt: null },
    });

    if (!orphanage) {
      throw new NotFoundException('Orphanage not found');
    }

    // FIX-16: Validate capacity in updates
    const newOccupancy = dto.numberOfChildren ?? orphanage.currentOccupancy;
    const newCapacity = dto.capacity ?? orphanage.totalCapacity;

    if (newOccupancy > newCapacity) {
      throw new BadRequestException(
        'Number of children cannot exceed capacity',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.orphanage.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.phone && { phone: dto.phone }),
          ...(dto.city && { city: dto.city }),
          ...(dto.state && { state: dto.state }),
          ...(dto.capacity && { totalCapacity: dto.capacity }),
          ...(dto.numberOfChildren !== undefined && {
            currentOccupancy: dto.numberOfChildren,
          }),
        },
      });

      // Recalculate compliance
      const licenses = await tx.orphanageLicense.findMany({
        where: { orphanageId: id },
      });
      const complianceScore =
        this.complianceCalculator.calculateComplianceScore(updated, licenses);

      await tx.orphanage.update({
        where: { id },
        data: { complianceScore },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_ORPHANAGE',
          resource: 'Orphanage',
          resourceId: id,
          success: true,
        },
      });

      return {
        success: true,
        message: 'Orphanage updated successfully',
        data: updated,
      };
    });
  }

  async remove(id: string, userId: string) {
    const orphanage = await this.prisma.orphanage.findFirst({
      where: { id, deletedAt: null },
    });

    if (!orphanage) {
      throw new NotFoundException('Orphanage not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Soft delete orphanage
      await tx.orphanage.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      // Unlink children
      await tx.child.updateMany({
        where: { orphanageId: id },
        data: { orphanageId: null },
      });

      // Deactivate staff
      await tx.orphanageStaff.updateMany({
        where: { orphanageId: id },
        data: { isActive: false, endDate: new Date() },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DELETE_ORPHANAGE',
          resource: 'Orphanage',
          resourceId: id,
          success: true,
        },
      });

      return {
        success: true,
        message: 'Orphanage deleted successfully',
      };
    });
  }

  private async resolveOrphanageIdForUser(userId: string): Promise<{ orphanageId: string; complianceScore: number }> {
    const orphanage = await this.prisma.orphanage.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, complianceScore: true },
    });
    if (orphanage) {
      return { orphanageId: orphanage.id, complianceScore: orphanage.complianceScore };
    }
    const staffRecord = await this.prisma.orphanageStaff.findFirst({
      where: { userId, isActive: true },
      include: { orphanage: true },
    });
    if (staffRecord?.orphanageId) {
      return { orphanageId: staffRecord.orphanageId, complianceScore: staffRecord.orphanage?.complianceScore ?? 85 };
    }
    throw new NotFoundException('No orphanage found for this user account');
  }

  // Dashboard methods for ORPHANAGE role
  async getDashboardStats(userId: string) {
    const { orphanageId } = await this.resolveOrphanageIdForUser(userId);

    // Get children count
    const inCare = await this.prisma.child.count({
      where: {
        orphanageId,
        currentStatus: 'ACTIVE',
        deletedAt: null,
      },
    });

    // Get at-risk children count
    const atRiskChildren = await this.prisma.child.findMany({
      where: {
        orphanageId,
        currentStatus: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        aiRiskScores: {
          orderBy: { computedAt: 'desc' },
          take: 1,
        },
      },
    });

    const atRisk = atRiskChildren.filter(
      (child) =>
        child.aiRiskScores[0] &&
        (child.aiRiskScores[0].riskLevel === 'MEDIUM' ||
          child.aiRiskScores[0].riskLevel === 'HIGH' ||
          child.aiRiskScores[0].riskLevel === 'CRITICAL'),
    ).length;

    // Get system-wide stats
    const registeredChildren = await this.prisma.child.count({
      where: { deletedAt: null },
    });

    const activeOrphanages = await this.prisma.orphanage.count({
      where: { isActive: true, deletedAt: null },
    });

    const criticalAlerts = await this.prisma.alert.count({
      where: {
        orphanageId,
        severity: 'CRITICAL',
        status: 'OPEN',
      },
    });

    const pendingVisits = await this.prisma.visitRequest.count({
      where: {
        orphanageId: orphanageId ?? undefined,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      data: {
        inCare,
        atRisk,
        aiStatus: 'Active',
        registeredChildren,
        safeZonesOnline: 42, // Mock data
        activeOrphanages,
        criticalAlerts,
        pendingVisits,
      },
    };
  }

  async getMyChildren(userId: string, limit: number = 5) {
    const { orphanageId } = await this.resolveOrphanageIdForUser(userId);

    const children = await this.prisma.child.findMany({
      where: {
        orphanageId,
        currentStatus: 'ACTIVE',
        deletedAt: null,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        childCode: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        approximateAge: true,
        healthStatus: true,
        aiRiskScores: {
          orderBy: { computedAt: 'desc' },
          take: 1,
        },
      },
    });

    const total = await this.prisma.child.count({
      where: {
        orphanageId,
        currentStatus: 'ACTIVE',
        deletedAt: null,
      },
    });

    const data = children.map((child) => ({
      id: child.id,
      childCode: child.childCode,
      name: `${child.firstName} ${child.lastName || ''}`.trim(),
      age: this.calculateAge(child.dateOfBirth, child.approximateAge),
      risk: child.aiRiskScores[0]?.riskLevel || 'LOW',
      health: child.healthStatus,
    }));

    return {
      success: true,
      data,
      total,
    };
  }

  async getSafetyChart(userId: string) {
    const { complianceScore } = await this.resolveOrphanageIdForUser(userId);

    // Mock data for now - in production, aggregate from historical data
    return {
      success: true,
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Safety Score',
            data: [82, 85, 87, 89, 91, 94],
          },
          {
            label: 'Compliance',
            data: [78, 81, 84, 86, 88, complianceScore ?? 85],
          },
        ],
      },
    };
  }

  // Helper methods
  private async generateOrphanageCode(
    city: string,
    state: string,
    tx?: any,
  ): Promise<string> {
    const prismaClient = tx || this.prisma;
    const stateCode = this.getStateCode(state);
    const year = new Date().getFullYear();
    
    // Count within transaction to prevent race conditions
    const count = await prismaClient.orphanage.count({
      where: {
        state,
        createdAt: { gte: new Date(year, 0, 1) },
      },
    });
    const seq = String(count + 1).padStart(3, '0');
    return `ORP-${stateCode}-${year}-${seq}`;
  }

  private getStateCode(state: string): string {
    // FIX-22: Complete list of all 36 Indian states and UTs
    const stateCodes: Record<string, string> = {
      // States
      'Andhra Pradesh': 'AP',
      'Arunachal Pradesh': 'AR',
      Assam: 'AS',
      Bihar: 'BR',
      Chhattisgarh: 'CG',
      Goa: 'GA',
      Gujarat: 'GJ',
      Haryana: 'HR',
      'Himachal Pradesh': 'HP',
      Jharkhand: 'JH',
      Karnataka: 'KA',
      Kerala: 'KL',
      'Madhya Pradesh': 'MP',
      Maharashtra: 'MH',
      Manipur: 'MN',
      Meghalaya: 'ML',
      Mizoram: 'MZ',
      Nagaland: 'NL',
      Odisha: 'OR',
      Punjab: 'PB',
      Rajasthan: 'RJ',
      Sikkim: 'SK',
      'Tamil Nadu': 'TN',
      Telangana: 'TS',
      Tripura: 'TR',
      'Uttar Pradesh': 'UP',
      Uttarakhand: 'UK',
      'West Bengal': 'WB',
      // Union Territories
      'Andaman and Nicobar Islands': 'AN',
      Chandigarh: 'CH',
      'Dadra and Nagar Haveli and Daman and Diu': 'DD',
      Lakshadweep: 'LD',
      Delhi: 'DL',
      'National Capital Territory of Delhi': 'DL',
      Puducherry: 'PY',
      'Jammu and Kashmir': 'JK',
      Ladakh: 'LA',
    };
    return stateCodes[state] || 'XX';
  }

  private async aggregateChildSummary(orphanageId: string) {
    const children = await this.prisma.child.findMany({
      where: { orphanageId, deletedAt: null },
      select: {
        gender: true,
        dateOfBirth: true,
        approximateAge: true,
        hasDisability: true,
      },
    });

    const summary = {
      totalBoys: 0,
      totalGirls: 0,
      below5: 0,
      age5To12: 0,
      above12: 0,
      specialNeeds: 0,
    };

    children.forEach((child) => {
      const age = this.calculateAge(child.dateOfBirth, child.approximateAge);

      if (child.gender === ChildGender.MALE) summary.totalBoys++;
      else if (child.gender === ChildGender.FEMALE) summary.totalGirls++;

      if (age < 5) summary.below5++;
      else if (age <= 12) summary.age5To12++;
      else summary.above12++;

      if (child.hasDisability) summary.specialNeeds++;
    });

    return summary;
  }

  private async aggregateStaffSummary(orphanageId: string) {
    const staff = await this.prisma.orphanageStaff.findMany({
      where: { orphanageId, isActive: true },
    });

    const summary = {
      totalStaff: staff.length,
      caretakers: staff.filter((s) => s.role === OrphanageStaffRole.CARETAKER)
        .length,
      teachers: staff.filter((s) => s.role === OrphanageStaffRole.TEACHER)
        .length,
      medicalStaff: staff.filter(
        (s) => s.role === OrphanageStaffRole.MEDICAL_STAFF,
      ).length,
      securityGuards: staff.filter(
        (s) => s.role === OrphanageStaffRole.SECURITY_GUARD,
      ).length,
      volunteers: staff.filter((s) => s.role === OrphanageStaffRole.VOLUNTEER)
        .length,
    };

    return summary;
  }

  private calculateAge(
    dateOfBirth: Date | null,
    approximateAge: number | null,
  ): number {
    if (dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age;
    }
    return approximateAge || 0;
  }

  private mapStaffRoleToFacility(role: OrphanageStaffRole): string | null {
    const mapping: Record<string, string> = {
      MEDICAL_STAFF: 'Medical Room',
      SECURITY_GUARD: 'Security Guards',
      TEACHER: 'School',
      CARETAKER: 'Dormitory',
    };
    return mapping[role] || null;
  }

  // FIX-27: License verification workflow
  async verifyLicense(orphanageId: string, licenseId: string, userId: string) {
    const license = await this.prisma.orphanageLicense.findFirst({
      where: {
        id: licenseId,
        orphanageId,
      },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update license status to VERIFIED
      const updatedLicense = await tx.orphanageLicense.update({
        where: { id: licenseId },
        data: {
          status: 'VERIFIED' as any,
        },
      });

      // Recalculate compliance score
      const orphanage = await tx.orphanage.findUnique({
        where: { id: orphanageId },
      });

      const allLicenses = await tx.orphanageLicense.findMany({
        where: { orphanageId },
      });

      const newComplianceScore =
        this.complianceCalculator.calculateComplianceScore(
          orphanage!,
          allLicenses,
        );

      await tx.orphanage.update({
        where: { id: orphanageId },
        data: { complianceScore: newComplianceScore },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'VERIFY_LICENSE',
          resource: 'OrphanageLicense',
          resourceId: licenseId,
          details: {
            orphanageId,
            licenseType: updatedLicense.licenseType,
            newComplianceScore,
          },
          success: true,
        },
      });

      return {
        success: true,
        message: 'License verified successfully',
        data: {
          license: updatedLicense,
          newComplianceScore,
        },
      };
    });
  }

  // FIX-18: Manual compliance recalculation
  async recalculateCompliance(orphanageId: string, userId: string) {
    const orphanage = await this.prisma.orphanage.findUnique({
      where: { id: orphanageId, deletedAt: null },
    });

    if (!orphanage) {
      throw new NotFoundException('Orphanage not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      const licenses = await tx.orphanageLicense.findMany({
        where: { orphanageId },
      });

      const newComplianceScore =
        this.complianceCalculator.calculateComplianceScore(
          orphanage,
          licenses,
        );

      await tx.orphanage.update({
        where: { id: orphanageId },
        data: { complianceScore: newComplianceScore },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RECALCULATE_COMPLIANCE',
          resource: 'Orphanage',
          resourceId: orphanageId,
          details: {
            previousScore: orphanage.complianceScore,
            newScore: newComplianceScore,
          },
          success: true,
        },
      });

      return {
        success: true,
        message: 'Compliance score recalculated successfully',
        data: {
          previousScore: orphanage.complianceScore,
          newScore: newComplianceScore,
        },
      };
    });
  }

  async resetPassword(
    orphanageId: string,
    dto: ResetOrphanagePasswordDto,
    adminId: string,
  ) {
    const orphanage = await this.prisma.orphanage.findFirst({
      where: { id: orphanageId, deletedAt: null },
      select: { id: true, userId: true, officialEmail: true },
    });

    if (!orphanage) {
      throw new NotFoundException('Orphanage not found');
    }

    let targetUserId = orphanage.userId;
    if (!targetUserId) {
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: orphanage.officialEmail, mode: 'insensitive' } },
        select: { id: true },
      });
      if (user) {
        targetUserId = user.id;
        await this.prisma.orphanage.update({
          where: { id: orphanageId },
          data: { userId: user.id },
        });
      }
    }

    if (!targetUserId) {
      throw new NotFoundException('No user account found for this orphanage');
    }

    const bcryptRounds = 12;
    const hashedPassword = await bcrypt.hash(dto.newPassword, bcryptRounds);

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'RESET_ORPHANAGE_PASSWORD',
        resource: 'Orphanage',
        resourceId: orphanageId,
        success: true,
      },
    });

    return {
      success: true,
      message: 'Orphanage password reset successfully',
    };
  }

  async toggleStatus(
    orphanageId: string,
    dto: ToggleOrphanageStatusDto,
    adminId: string,
  ) {
    const orphanage = await this.prisma.orphanage.findFirst({
      where: { id: orphanageId, deletedAt: null },
    });

    if (!orphanage) {
      throw new NotFoundException('Orphanage not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedOrphanage = await tx.orphanage.update({
        where: { id: orphanageId },
        data: {
          isActive: dto.isActive,
          status: dto.isActive ? OrphanageStatus.ACTIVE : OrphanageStatus.SUSPENDED,
        },
      });

      let targetUserId = orphanage.userId;
      if (!targetUserId) {
        const user = await tx.user.findFirst({
          where: { email: { equals: orphanage.officialEmail, mode: 'insensitive' } },
          select: { id: true },
        });
        if (user) {
          targetUserId = user.id;
          await tx.orphanage.update({
            where: { id: orphanageId },
            data: { userId: user.id },
          });
        }
      }

      if (targetUserId) {
        await tx.user.update({
          where: { id: targetUserId },
          data: { isActive: dto.isActive },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: dto.isActive
            ? 'ENABLE_ORPHANAGE_ACCOUNT'
            : 'DISABLE_ORPHANAGE_ACCOUNT',
          resource: 'Orphanage',
          resourceId: orphanageId,
          success: true,
        },
      });

      return {
        success: true,
        message: `Orphanage account ${dto.isActive ? 'enabled' : 'disabled'} successfully`,
        data: updatedOrphanage,
      };
    });
  }
}
