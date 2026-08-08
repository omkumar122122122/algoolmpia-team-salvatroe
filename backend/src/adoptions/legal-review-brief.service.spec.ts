import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { LegalReviewBriefService } from './legal-review-brief.service';

describe('LegalReviewBriefService', () => {
  let service: LegalReviewBriefService;
  let prisma: PrismaService;

  const mockPrismaService = {
    adoptionRecord: {
      findUnique: jest.fn(),
    },
    orphanageStaff: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalReviewBriefService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LegalReviewBriefService>(LegalReviewBriefService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLegalReviewBrief', () => {
    it('should throw NotFoundException (404) if record does not exist', async () => {
      mockPrismaService.adoptionRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.getLegalReviewBrief('non-existent-id', 'user-1', Role.ADMIN)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException (403) if parent tries to access another parent adoption record', async () => {
      mockPrismaService.adoptionRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        child: { id: 'child-1', orphanageId: 'orp-1' },
        adoptiveParent: { id: 'parent-1', userId: 'other-user' },
      });

      await expect(
        service.getLegalReviewBrief('record-1', 'parent-user-2', Role.PARENT)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException (403) if orphanage staff tries to access record of another orphanage', async () => {
      mockPrismaService.adoptionRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        child: { id: 'child-1', orphanageId: 'orp-1' },
        adoptiveParent: { id: 'parent-1', userId: 'parent-user-1' },
      });
      mockPrismaService.orphanageStaff.findFirst.mockResolvedValue({
        orphanageId: 'other-orp',
      });

      await expect(
        service.getLegalReviewBrief('record-1', 'staff-user-1', Role.ORPHANAGE)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully compile LegalReviewBrief DTO for authorized ADMIN', async () => {
      const mockRecord = {
        id: 'record-123',
        status: 'COMPLETED',
        legalProcessStart: new Date('2026-01-01'),
        completedDate: new Date('2026-02-01'),
        courtName: 'Family Court',
        courtCaseNumber: 'CASE-100',
        courtOrderDate: new Date('2026-01-15'),
        adoptionCertNumber: 'CERT-500',
        caraReferenceNumber: 'CARA-99',
        reviewNotes: 'All checks passed cleanly',
        updatedAt: new Date(),
        child: {
          id: 'child-1',
          childCode: 'CHD-0001',
          firstName: 'Ravi',
          lastName: 'Kumar',
          orphanage: { id: 'orp-1', name: 'Sunshine Home' },
        },
        adoptiveParent: {
          id: 'parent-1',
          verificationStatus: 'APPROVED',
          kycStatus: 'APPROVED',
          user: { id: 'user-p', firstName: 'Priya', lastName: 'Sharma' },
          policeVerification: {
            status: 'CLEARED',
            crimeRecordFound: false,
            clearedAt: new Date('2026-01-10'),
          },
        },
        documents: [
          { documentType: 'Adoption Agreement', isVerified: true },
          { documentType: 'Court Order', isVerified: true },
          { documentType: 'Guardian Consent', isVerified: true },
          { documentType: 'Identity Documents', isVerified: true },
          { documentType: 'Medical Clearance', isVerified: true },
          { documentType: 'Child Transfer Form', isVerified: true },
          { documentType: 'Final Verification Letter', isVerified: true },
          { documentType: 'Additional Documents', isVerified: true },
        ],
        reviewedBy: { id: 'user-admin', firstName: 'Admin', lastName: 'Officer', role: 'ADMIN' },
      };

      mockPrismaService.adoptionRecord.findUnique.mockResolvedValue(mockRecord);

      const brief = await service.getLegalReviewBrief('record-123', 'admin-1', Role.ADMIN);

      expect(brief).toBeDefined();
      expect(brief.legalRecordInfo.recordId).toBe('record-123');
      expect(brief.legalRecordInfo.childName).toBe('Ravi Kumar');
      expect(brief.verificationStatus.overallStatus).toBe('SUCCESSFUL');
      expect(brief.detectedIssues.length).toBe(0);
      expect(brief.reviewerNotes.length).toBe(1);
      expect(brief.reviewSummary.isApproved).toBe(true);
    });
  });
});
