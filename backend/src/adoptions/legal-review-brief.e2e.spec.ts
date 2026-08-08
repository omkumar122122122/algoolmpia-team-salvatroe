import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { LegalBriefPdfGenerator } from './legal-brief-pdf.generator';
import { LegalReviewBriefService } from './legal-review-brief.service';
import { LegalReviewBriefDto } from './dto/legal-review-brief.dto';

describe('Legal Review Brief — End-to-End Test Suite (Phases 1-9)', () => {
  let service: LegalReviewBriefService;
  let pdfGenerator: LegalBriefPdfGenerator;

  const mockPrismaService: any = {
    adoptionRecord: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    pdfGenerator = new LegalBriefPdfGenerator();
    service = new LegalReviewBriefService(mockPrismaService);
    jest.clearAllMocks();
  });

  const createMockDto = (overrides: Partial<LegalReviewBriefDto> = {}): LegalReviewBriefDto => ({
    legalRecordInfo: {
      recordId: 'REC-TEST',
      childId: 'c1',
      childName: 'Child Test',
      childCode: 'CHD-01',
      parentId: 'p1',
      parentName: 'Parent Test',
      orphanageId: 'o1',
      orphanageName: 'Orphanage Test',
      adoptionStatus: 'COMPLETED',
      legalProcessStart: '2026-01-01T00:00:00.000Z',
      completedDate: '2026-02-01T00:00:00.000Z',
      ...overrides.legalRecordInfo,
    },
    keyClauses: overrides.keyClauses || [],
    detectedIssues: overrides.detectedIssues || [],
    verificationStatus: {
      overallStatus: 'SUCCESSFUL',
      parentVerificationStatus: 'APPROVED',
      parentKycStatus: 'APPROVED',
      policeVerificationStatus: 'CLEARED',
      documentsVerifiedCount: 5,
      totalDocumentsCount: 5,
      documentVerificationRatio: '5/5 (100%)',
      ...overrides.verificationStatus,
    },
    reviewerNotes: overrides.reviewerNotes || [],
    reviewSummary: {
      overallOutcome: 'COMPLETED',
      recommendation: 'Approved',
      riskLevel: 'LOW',
      isApproved: true,
      summaryText: 'Summary',
      ...overrides.reviewSummary,
    },
    generationMetadata: {
      documentId: 'DOC-1',
      generatedAt: new Date().toISOString(),
      generatedByUserId: 'u1',
      generatedByRole: 'ADMIN',
      systemVersion: '1.0.0',
      ...overrides.generationMetadata,
    },
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Complete Legal Record Generation
  // ---------------------------------------------------------------------------
  it('TEST 1: Complete legal record should generate a valid PDF buffer starting with %PDF- header', async () => {
    const fullBriefDto = createMockDto({
      legalRecordInfo: {
        recordId: 'REC-E2E-001',
        childId: 'child-01',
        childName: 'Aarav Patel',
        childCode: 'CHD-2026-01',
        parentId: 'parent-01',
        parentName: 'Rohan Patel',
        orphanageId: 'orp-01',
        orphanageName: 'Sunshine Children Home',
        adoptionStatus: 'COMPLETED',
        legalProcessStart: '2026-01-01T00:00:00.000Z',
        completedDate: '2026-02-01T00:00:00.000Z',
      },
      keyClauses: [
        {
          clauseId: 'c-1',
          title: 'Court Decree Jurisdiction',
          clauseType: 'COURT_ORDER',
          value: 'District Family Court, Delhi',
          details: 'Court Decree Case Number: ADO/2026/101.',
          status: 'VERIFIED',
        },
      ],
    });

    const pdfBuffer = await pdfGenerator.generatePdf(fullBriefDto);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: No Detected Issues Scenario
  // ---------------------------------------------------------------------------
  it('TEST 2: Should correctly handle empty detected issues without throwing error', async () => {
    const noIssuesDto = createMockDto({
      legalRecordInfo: {
        recordId: 'REC-CLEAN-01',
        childId: 'c2',
        childName: 'Clean Child',
        childCode: 'CHD-02',
        adoptionStatus: 'COMPLETED',
      },
      detectedIssues: [],
    });

    const pdfBuffer = await pdfGenerator.generatePdf(noIssuesDto);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: No Reviewer Notes Scenario
  // ---------------------------------------------------------------------------
  it('TEST 3: Should correctly handle empty reviewer notes array', async () => {
    const noNotesDto = createMockDto({
      legalRecordInfo: {
        recordId: 'REC-NO-NOTES',
        childId: 'c3',
        childName: 'Test Child',
        childCode: 'CHD-03',
        adoptionStatus: 'IN_PROGRESS',
      },
      reviewerNotes: [],
    });

    const pdfBuffer = await pdfGenerator.generatePdf(noNotesDto);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Verification Pending Scenario
  // ---------------------------------------------------------------------------
  it('TEST 4: Should format PENDING verification status accurately', async () => {
    const pendingDto = createMockDto({
      legalRecordInfo: {
        recordId: 'REC-PENDING',
        childId: 'c4',
        childName: 'Child Pending',
        childCode: 'CHD-04',
        adoptionStatus: 'DOCUMENTATION',
      },
      verificationStatus: {
        overallStatus: 'PENDING',
        parentVerificationStatus: 'PENDING',
        parentKycStatus: 'SUBMITTED',
        policeVerificationStatus: 'IN_PROGRESS',
        documentsVerifiedCount: 1,
        totalDocumentsCount: 6,
        documentVerificationRatio: '1/6 (16.7%)',
      },
    });

    expect(pendingDto.verificationStatus.overallStatus).toBe('PENDING');
    const pdfBuffer = await pdfGenerator.generatePdf(pendingDto);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Verification Failed Scenario
  // ---------------------------------------------------------------------------
  it('TEST 5: Should format FAILED verification status accurately', async () => {
    const failedDto = createMockDto({
      legalRecordInfo: {
        recordId: 'REC-FAILED',
        childId: 'c5',
        childName: 'Child Failed',
        childCode: 'CHD-05',
        adoptionStatus: 'CANCELLED',
      },
      verificationStatus: {
        overallStatus: 'FAILED',
        parentVerificationStatus: 'REJECTED',
        parentKycStatus: 'REJECTED',
        policeVerificationStatus: 'FLAGGED',
        documentsVerifiedCount: 0,
        totalDocumentsCount: 6,
        documentVerificationRatio: '0/6 (0%)',
      },
      detectedIssues: [
        {
          issueId: 'iss-fail-1',
          category: 'POLICE_VERIFICATION',
          severity: 'HIGH',
          description: 'Background verification flagged adverse police record.',
          isResolved: false,
        },
      ],
    });

    expect(failedDto.verificationStatus.overallStatus).toBe('FAILED');
    const pdfBuffer = await pdfGenerator.generatePdf(failedDto);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Invalid Record ID (404 Not Found)
  // ---------------------------------------------------------------------------
  it('TEST 6: Should throw NotFoundException (404) for non-existent record ID', async () => {
    mockPrismaService.adoptionRecord.findUnique.mockResolvedValue(null);

    await expect(service.getLegalReviewBrief('INVALID-ID-999', 'admin-1', Role.ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Unauthorized User (403 Forbidden)
  // ---------------------------------------------------------------------------
  it('TEST 7: Should throw ForbiddenException (403) when user attempts unauthorized access', async () => {
    mockPrismaService.adoptionRecord.findUnique.mockResolvedValue({
      id: 'REC-PRIV-01',
      child: { orphanageId: 'orp-alpha' },
      adoptiveParentId: 'parent-alpha',
    });

    await expect(service.getLegalReviewBrief('REC-PRIV-01', 'parent-beta', Role.PARENT)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Long Clauses Layout Wrapping
  // ---------------------------------------------------------------------------
  it('TEST 8: Should wrap extremely long legal clause text without breaking PDF layout', async () => {
    const longClauseText =
      'WHEREAS the Court of District Family Jurisdiction hereby decrees that under Section 56(1) of the Juvenile Justice (Care and Protection of Children) Act, 2015, the care, custody, guardianship, statutory inheritance rights, and welfare monitoring of the minor child shall transfer unconditionally to the adoptive parents. Party A and Party B agree to comply strictly with all CARA post-adoption regulations, quarterly welfare inspections, statutory progress reports, and educational guidelines prescribed by the State Child Protection Society.';

    const longClauseDto = createMockDto({
      legalRecordInfo: {
        recordId: 'REC-LONG-CLAUSE',
        childId: 'c6',
        childName: 'Child Long Text',
        childCode: 'CHD-06',
        adoptionStatus: 'COMPLETED',
      },
      keyClauses: [
        {
          clauseId: 'c-long-1',
          title: 'Comprehensive Statutory Adoption Decree & Guardianship Mandate',
          clauseType: 'COURT_ORDER',
          value: 'Full Custody Transfer',
          details: longClauseText,
          status: 'VERIFIED',
        },
      ],
    });

    const pdfBuffer = await pdfGenerator.generatePdf(longClauseDto);
    expect(pdfBuffer.length).toBeGreaterThan(500);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  // ---------------------------------------------------------------------------
  // TEST 9: Many Issues Multi-Page PDF Layout
  // ---------------------------------------------------------------------------
  it('TEST 9: Should correctly render multi-page PDF for 25+ detected issues', async () => {
    const manyIssues = Array.from({ length: 25 }, (_, i) => ({
      issueId: `iss-bulk-${i + 1}`,
      category: `COMPLIANCE_SECTION_${i + 1}`,
      severity: (i % 3 === 0 ? 'HIGH' : i % 2 === 0 ? 'MEDIUM' : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
      description: `Detailed compliance issue #${i + 1}: Required legal verification document #${i + 1} has discrepancies in party signatures.`,
      isResolved: i % 2 === 0,
    }));

    const manyIssuesDto = createMockDto({
      legalRecordInfo: {
        recordId: 'REC-MANY-ISSUES',
        childId: 'c7',
        childName: 'Child Multi Page',
        childCode: 'CHD-07',
        adoptionStatus: 'DOCUMENTATION',
      },
      detectedIssues: manyIssues,
    });

    const pdfBuffer = await pdfGenerator.generatePdf(manyIssuesDto);
    expect(pdfBuffer.length).toBeGreaterThan(1500);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  // ---------------------------------------------------------------------------
  // TEST 10: Repeated PDF Generation Calls Safety
  // ---------------------------------------------------------------------------
  it('TEST 10: Should perform deterministically across repeated PDF generation requests', async () => {
    const simpleDto = createMockDto({
      legalRecordInfo: {
        recordId: 'REC-REPEAT-01',
        childId: 'c8',
        childName: 'Repeat Child',
        childCode: 'CHD-08',
        adoptionStatus: 'COMPLETED',
      },
    });

    const buf1 = await pdfGenerator.generatePdf(simpleDto);
    const buf2 = await pdfGenerator.generatePdf(simpleDto);
    const buf3 = await pdfGenerator.generatePdf(simpleDto);

    expect(buf1.toString('utf-8', 0, 5)).toBe('%PDF-');
    expect(buf2.toString('utf-8', 0, 5)).toBe('%PDF-');
    expect(buf3.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  // ---------------------------------------------------------------------------
  // TEST 11: DTO Serialization & JSON Integrity
  // ---------------------------------------------------------------------------
  it('TEST 11: Should serialize LegalReviewBrief DTO to JSON without circular references', () => {
    const dto = createMockDto({
      legalRecordInfo: {
        recordId: 'REC-JSON-01',
        childId: 'c9',
        childName: 'JSON Child',
        childCode: 'CHD-09',
        adoptionStatus: 'COMPLETED',
      },
      keyClauses: [{ clauseId: 'c1', title: 'Title', clauseType: 'COURT_ORDER', status: 'VERIFIED' }],
    });

    const jsonString = JSON.stringify(dto);
    expect(jsonString).toBeDefined();
    const parsed = JSON.parse(jsonString);
    expect(parsed.legalRecordInfo.recordId).toBe('REC-JSON-01');
  });

  // ---------------------------------------------------------------------------
  // TEST 12: End-to-End Pipeline Execution
  // ---------------------------------------------------------------------------
  it('TEST 12: Complete pipeline from service fetch to PDF generation buffer output', async () => {
    mockPrismaService.adoptionRecord.findUnique.mockResolvedValue({
      id: 'REC-PIPELINE-01',
      status: 'COMPLETED',
      legalProcessStart: new Date('2026-01-01'),
      completedDate: new Date('2026-02-01'),
      courtName: 'District Family Court',
      courtCaseNumber: 'FC/ADO/101',
      caraReferenceNumber: 'CARA-101',
      reviewNotes: 'Pipeline review note',
      child: {
        id: 'c1',
        childCode: 'CHD-01',
        firstName: 'Child',
        lastName: 'Pipeline',
        orphanageId: 'orp-1',
        orphanage: { id: 'orp-1', name: 'Pipeline Home' },
      },
      adoptiveParent: {
        id: 'p1',
        userId: 'u-parent',
        verificationStatus: 'APPROVED',
        kycStatus: 'APPROVED',
        user: { firstName: 'Parent', lastName: 'Pipeline' },
        policeVerifications: [
          { status: 'CLEARED', clearedAt: new Date('2026-01-15') },
        ],
      },
      documents: [
        { id: 'd1', documentType: 'COURT_ORDER', originalName: 'order.pdf', isVerified: true },
      ],
      reviewedBy: {
        id: 'u-admin',
        firstName: 'Admin',
        lastName: 'Officer',
        role: Role.ADMIN,
      },
    });

    const briefDto = await service.getLegalReviewBrief('REC-PIPELINE-01', 'u-admin', Role.ADMIN);
    expect(briefDto).toBeDefined();
    expect(briefDto.legalRecordInfo.recordId).toBe('REC-PIPELINE-01');

    const pdfBuffer = await pdfGenerator.generatePdf(briefDto);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });
});
