import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums/role.enum';
import { Prisma, OrphanageStaffRole } from '@prisma/client';
import {
  CreateStaffDto,
  UpdateStaffDto,
  QueryStaffDto,
  StaffProfileDto,
  StaffBasicDto,
  StaffListResponseDto,
  StaffSummaryDto,
  CreateStaffResponseDto,
} from './dto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateStaffDto,
    requestUserId: string,
    requestUserRole: Role,
  ): Promise<CreateStaffResponseDto> {
    let targetOrphanageId = dto.orphanageId && dto.orphanageId.trim() !== '' ? dto.orphanageId : null;
    if (!targetOrphanageId) {
      targetOrphanageId = await this.getUserOrphanageId(requestUserId);
    }

    let targetUserId = dto.userId && dto.userId.trim() !== '' ? dto.userId : null;
    if (!targetUserId) {
      if (dto.email && dto.email.trim() !== '') {
        const lowerEmail = dto.email.toLowerCase().trim();
        let userRecord = await this.prisma.user.findUnique({
          where: { email: lowerEmail },
        });

        if (!userRecord) {
          const nameParts = (dto.name || 'Staff Member').trim().split(' ');
          const firstName = nameParts[0] || 'Staff';
          const lastName = nameParts.slice(1).join(' ') || 'Member';
          const hashedPassword = await bcrypt.hash('Staff@123456', 10);

          userRecord = await this.prisma.user.create({
            data: {
              email: lowerEmail,
              firstName,
              lastName,
              password: hashedPassword,
              role: Role.ORPHANAGE,
              isEmailVerified: true,
            },
          });
        }
        targetUserId = userRecord.id;
      } else {
        targetUserId = requestUserId;
      }
    }

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    // Validate orphanage exists
    const orphanage = await this.prisma.orphanage.findUnique({
      where: { id: targetOrphanageId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!orphanage) {
      throw new NotFoundException(
        `Orphanage with ID ${targetOrphanageId} not found`,
      );
    }

    if (!orphanage.isActive) {
      throw new BadRequestException('Cannot add staff to inactive orphanage');
    }

    // Orphanage users can only add staff to their own orphanage
    if (requestUserRole === Role.ORPHANAGE) {
      await this.validateOrphanageAccess(targetOrphanageId, requestUserId);
    }

    // Check if user is already staff at this orphanage
    const existingStaff = await this.prisma.orphanageStaff.findUnique({
      where: {
        orphanageId_userId: {
          orphanageId: targetOrphanageId,
          userId: targetUserId,
        },
      },
    });

    if (existingStaff) {
      throw new ConflictException(
        `User ${user.email} is already assigned to ${orphanage.name}`,
      );
    }

    // Validate joining date is not in future
    const joiningDate = dto.joiningDate ? new Date(dto.joiningDate) : new Date();
    if (joiningDate > new Date()) {
      throw new BadRequestException('Joining date cannot be in the future');
    }

    // Validate end date is after joining date
    if (dto.endDate) {
      const endDate = new Date(dto.endDate);
      if (endDate <= joiningDate) {
        throw new BadRequestException(
          'End date must be after joining date',
        );
      }
    }

    // Create staff record
    const staff = await this.prisma.orphanageStaff.create({
      data: {
        userId: targetUserId,
        orphanageId: targetOrphanageId,
        role: dto.role,
        designation: dto.designation,
        employeeId: dto.employeeId,
        joiningDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
        isActive: true,
      },
    });

    this.logger.log(
      `Staff member ${staff.id} created for orphanage ${targetOrphanageId} by user ${requestUserId}`,
    );

    return {
      id: staff.id,
      employeeId: staff.employeeId || undefined,
      name: `${user.firstName} ${user.lastName}`,
      role: staff.role,
      orphanageName: orphanage.name,
      createdAt: staff.createdAt,
    };
  }

  async findAll(
    queryDto: QueryStaffDto,
    requestUserId: string,
    requestUserRole: Role,
  ): Promise<StaffListResponseDto> {
    const {
      search,
      orphanageId,
      role,
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'joiningDate',
      sortOrder = 'desc',
    } = queryDto;

    const andConditions: Prisma.OrphanageStaffWhereInput[] = [];

    // Orphanage users can only see their own staff
    if (requestUserRole === Role.ORPHANAGE) {
      const userOrphanageId = await this.getUserOrphanageId(requestUserId);
      andConditions.push({ orphanageId: userOrphanageId });
    } else if (orphanageId) {
      andConditions.push({ orphanageId });
    }

    // Filter by role
    if (role) {
      andConditions.push({ role });
    }

    // Filter by active status
    if (isActive !== undefined) {
      andConditions.push({ isActive });
    }

    // Search by name, employee ID, or email
    if (search) {
      andConditions.push({
        OR: [
          { employeeId: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      });
    }

    const where: Prisma.OrphanageStaffWhereInput = {
      AND: andConditions.length > 0 ? andConditions : undefined,
    };

    const skip = (page - 1) * limit;
    const take = limit;

    const total = await this.prisma.orphanageStaff.count({ where });

    // Build orderBy based on sortBy
    let orderBy: Prisma.OrphanageStaffOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy = { user: { firstName: sortOrder } };
    } else if (sortBy === 'joiningDate' || sortBy === 'role' || sortBy === 'employeeId') {
      orderBy = { [sortBy]: sortOrder };
    } else {
      orderBy = { joiningDate: sortOrder };
    }

    const staff = await this.prisma.orphanageStaff.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        orphanage: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy,
      skip,
      take,
    });

    const data: StaffBasicDto[] = staff.map((s) => ({
      id: s.id,
      employeeId: s.employeeId || undefined,
      name: `${s.user.firstName} ${s.user.lastName}`,
      role: s.role,
      designation: s.designation || undefined,
      joiningDate: s.joiningDate || new Date(),
      isActive: s.isActive,
      orphanageName: s.orphanage.name,
      userEmail: s.user.email,
      userPhone: s.user.phone || undefined,
    }));

    const summary = await this.getSummaryStats(
      requestUserRole === Role.ORPHANAGE
        ? await this.getUserOrphanageId(requestUserId)
        : orphanageId,
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  async findOne(
    id: string,
    requestUserId: string,
    requestUserRole: Role,
  ): Promise<StaffProfileDto> {
    const staff = await this.prisma.orphanageStaff.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
          },
        },
        orphanage: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    // Orphanage users can only view their own staff
    if (requestUserRole === Role.ORPHANAGE) {
      const userOrphanageId = await this.getUserOrphanageId(requestUserId);
      if (staff.orphanageId !== userOrphanageId) {
        throw new ForbiddenException(
          'You do not have access to this staff member',
        );
      }
    }

    return {
      id: staff.id,
      employeeId: staff.employeeId || undefined,
      role: staff.role,
      designation: staff.designation || undefined,
      joiningDate: staff.joiningDate || new Date(),
      endDate: staff.endDate || undefined,
      isActive: staff.isActive,
      notes: staff.notes || undefined,
      user: {
        id: staff.user.id,
        email: staff.user.email,
        firstName: staff.user.firstName,
        lastName: staff.user.lastName,
        phone: staff.user.phone || undefined,
        avatar: staff.user.avatar || undefined,
      },
      orphanage: {
        id: staff.orphanage.id,
        name: staff.orphanage.name,
        city: staff.orphanage.city,
        state: staff.orphanage.state,
      },
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    };
  }

  async update(
    id: string,
    dto: UpdateStaffDto,
    requestUserId: string,
    requestUserRole: Role,
  ): Promise<void> {
    const staff = await this.prisma.orphanageStaff.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    // Orphanage users can only update their own staff
    if (requestUserRole === Role.ORPHANAGE) {
      const userOrphanageId = await this.getUserOrphanageId(requestUserId);
      if (staff.orphanageId !== userOrphanageId) {
        throw new ForbiddenException(
          'You do not have access to update this staff member',
        );
      }
    }

    // Validate end date if provided
    if (dto.endDate && staff.joiningDate) {
      const endDate = new Date(dto.endDate);
      if (endDate <= staff.joiningDate) {
        throw new BadRequestException(
          'End date must be after joining date',
        );
      }
    }

    await this.prisma.orphanageStaff.update({
      where: { id },
      data: {
        role: dto.role,
        designation: dto.designation,
        employeeId: dto.employeeId,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Staff member ${id} updated by user ${requestUserId}`);
  }

  async deactivate(
    id: string,
    requestUserId: string,
    requestUserRole: Role,
  ): Promise<void> {
    const staff = await this.prisma.orphanageStaff.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    if (!staff.isActive) {
      throw new BadRequestException('Staff member is already deactivated');
    }

    // Orphanage users can only deactivate their own staff
    if (requestUserRole === Role.ORPHANAGE) {
      const userOrphanageId = await this.getUserOrphanageId(requestUserId);
      if (staff.orphanageId !== userOrphanageId) {
        throw new ForbiddenException(
          'You do not have access to deactivate this staff member',
        );
      }
    }

    await this.prisma.orphanageStaff.update({
      where: { id },
      data: {
        isActive: false,
        endDate: staff.endDate || new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Staff member ${id} deactivated by user ${requestUserId}`,
    );
  }

  async reactivate(
    id: string,
    requestUserId: string,
    requestUserRole: Role,
  ): Promise<void> {
    const staff = await this.prisma.orphanageStaff.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    if (staff.isActive) {
      throw new BadRequestException('Staff member is already active');
    }

    // Orphanage users can only reactivate their own staff
    if (requestUserRole === Role.ORPHANAGE) {
      const userOrphanageId = await this.getUserOrphanageId(requestUserId);
      if (staff.orphanageId !== userOrphanageId) {
        throw new ForbiddenException(
          'You do not have access to reactivate this staff member',
        );
      }
    }

    await this.prisma.orphanageStaff.update({
      where: { id },
      data: {
        isActive: true,
        endDate: null,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Staff member ${id} reactivated by user ${requestUserId}`,
    );
  }

  async getAvailableStaff(
    orphanageId: string,
    requestUserId: string,
    requestUserRole: Role,
  ): Promise<StaffBasicDto[]> {
    // Orphanage users can only get their own staff
    if (requestUserRole === Role.ORPHANAGE) {
      const userOrphanageId = await this.getUserOrphanageId(requestUserId);
      if (orphanageId !== userOrphanageId) {
        throw new ForbiddenException(
          'You can only access staff from your orphanage',
        );
      }
    }

    const staff = await this.prisma.orphanageStaff.findMany({
      where: {
        orphanageId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        orphanage: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    return staff.map((s) => ({
      id: s.id,
      employeeId: s.employeeId || undefined,
      name: `${s.user.firstName} ${s.user.lastName}`,
      role: s.role,
      designation: s.designation || undefined,
      joiningDate: s.joiningDate || new Date(),
      isActive: s.isActive,
      orphanageName: s.orphanage.name,
      userEmail: s.user.email,
      userPhone: s.user.phone || undefined,
    }));
  }

  private async getSummaryStats(
    orphanageId?: string,
  ): Promise<StaffSummaryDto> {
    const baseFilter: Prisma.OrphanageStaffWhereInput = {};

    if (orphanageId) {
      baseFilter.orphanageId = orphanageId;
    }

    const [
      total,
      active,
      administrators,
      caretakers,
      teachers,
      medicalStaff,
      securityGuards,
    ] = await Promise.all([
      this.prisma.orphanageStaff.count({ where: baseFilter }),
      this.prisma.orphanageStaff.count({
        where: { ...baseFilter, isActive: true },
      }),
      this.prisma.orphanageStaff.count({
        where: { ...baseFilter, role: OrphanageStaffRole.ADMINISTRATOR },
      }),
      this.prisma.orphanageStaff.count({
        where: { ...baseFilter, role: OrphanageStaffRole.CARETAKER },
      }),
      this.prisma.orphanageStaff.count({
        where: { ...baseFilter, role: OrphanageStaffRole.TEACHER },
      }),
      this.prisma.orphanageStaff.count({
        where: { ...baseFilter, role: OrphanageStaffRole.MEDICAL_STAFF },
      }),
      this.prisma.orphanageStaff.count({
        where: { ...baseFilter, role: OrphanageStaffRole.SECURITY_GUARD },
      }),
    ]);

    const inactive = total - active;
    const other = total - (administrators + caretakers + teachers + medicalStaff + securityGuards);

    return {
      total,
      active,
      inactive,
      administrators,
      caretakers,
      teachers,
      medicalStaff,
      securityGuards,
      other: Math.max(0, other),
    };
  }

  private async getUserOrphanageId(userId: string): Promise<string> {
    const staff = await this.prisma.orphanageStaff.findFirst({
      where: {
        userId,
        isActive: true,
      },
      select: {
        orphanageId: true,
      },
    });

    if (staff) {
      return staff.orphanageId;
    }

    const fallbackOrphanage = await this.prisma.orphanage.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (fallbackOrphanage) {
      return fallbackOrphanage.id;
    }

    throw new ForbiddenException(
      'User is not associated with any orphanage',
    );
  }

  private async validateOrphanageAccess(
    orphanageId: string,
    userId: string,
  ): Promise<void> {
    const userOrphanageId = await this.getUserOrphanageId(userId);
    if (orphanageId !== userOrphanageId) {
      throw new ForbiddenException(
        'You can only manage staff for your orphanage',
      );
    }
  }
}
