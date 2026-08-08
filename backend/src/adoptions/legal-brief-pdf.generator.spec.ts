import { LegalBriefPdfGenerator } from './legal-brief-pdf.generator';
import { LegalReviewBriefDto } from './dto/legal-review-brief.dto';

describe('LegalBriefPdfGenerator', () => {
  let generator: LegalBriefPdfGenerator;

  beforeEach(() => {
    generator = new LegalBriefPdfGenerator();
  });

  it('should be defined', () => {
    expect(generator).toBeDefined();
  });

  it('should generate a valid PDF buffer starting with %PDF- header', async () => {
    const sampleBriefDto: LegalReviewBriefDto = {
      legalRecordInfo: {
        recordId: 'rec-test-123',
        childId: 'child-test-1',
        childName: 'Ananya Sharma',
        childCode: 'CHD-0042',
        parentId: 'parent-test-1',
        parentName: 'Vikram Sharma',
        orphanageId: 'orp-test-1',
        orphanageName: 'Hope Children Home',
        adoptionStatus: 'COMPLETED',
        legalProcessStart: '2026-01-01T00:00:00.000Z',
        completedDate: '2026-02-01T00:00:00.000Z',
      },
      keyClauses: [
        {
          clauseId: 'c-1',
          title: 'Court Jurisdiction & Venue',
          clauseType: 'COURT_ORDER',
          value: 'District Family Court, New Delhi',
          details: 'Court Case Number: ADO/2026/8899. Decree Issued on 2026-01-20.',
          status: 'VERIFIED',
        },
        {
          clauseId: 'c-2',
          title: 'CARA Registration Clearance',
          clauseType: 'CARA_REF',
          value: 'CARA-2026-REG-7788',
          details: 'Central Adoption Resource Authority cleared for statutory adoption transfer.',
          status: 'VERIFIED',
        },
      ],
      detectedIssues: [],
      verificationStatus: {
        overallStatus: 'SUCCESSFUL',
        parentVerificationStatus: 'APPROVED',
        parentKycStatus: 'APPROVED',
        policeVerificationStatus: 'CLEARED',
        policeClearanceDate: '2026-01-15T00:00:00.000Z',
        documentsVerifiedCount: 8,
        totalDocumentsCount: 8,
        documentVerificationRatio: '8/8 (100%)',
      },
      reviewerNotes: [
        {
          noteId: 'n-1',
          authorId: 'user-admin',
          authorName: 'Legal Officer (System)',
          role: 'ADMIN',
          category: 'GENERAL',
          content: 'All documents and background checks verified per statutory guidelines.',
          createdAt: '2026-02-01T00:00:00.000Z',
        },
      ],
      reviewSummary: {
        overallOutcome: 'COMPLETED',
        recommendation: 'Recommended for final legal adoption approval.',
        riskLevel: 'LOW',
        isApproved: true,
        summaryText: 'Adoption record rec-test-123 for child Ananya Sharma has passed all statutory verification checks cleanly.',
      },
      generationMetadata: {
        documentId: 'LEGAL-BRIEF-TEST-001',
        generatedAt: new Date().toISOString(),
        generatedByUserId: 'admin-user-1',
        generatedByRole: 'ADMIN',
        systemVersion: '1.0.0',
        environment: 'test',
      },
    };

    const pdfBuffer = await generator.generatePdf(sampleBriefDto);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(100);

    // Verify PDF header magic bytes "%PDF-"
    const pdfHeader = pdfBuffer.toString('utf-8', 0, 5);
    expect(pdfHeader).toBe('%PDF-');
  });

  it('should handle empty issues and empty reviewer notes without throwing error', async () => {
    const sampleBriefDto: LegalReviewBriefDto = {
      legalRecordInfo: {
        recordId: 'rec-test-empty',
        childId: 'c-empty',
        childName: 'Child Empty',
        childCode: 'CHD-0000',
        adoptionStatus: 'PENDING',
      },
      keyClauses: [],
      detectedIssues: [],
      verificationStatus: {
        overallStatus: 'PENDING',
        parentVerificationStatus: 'PENDING',
        parentKycStatus: 'PENDING',
        policeVerificationStatus: 'PENDING',
        documentsVerifiedCount: 0,
        totalDocumentsCount: 8,
        documentVerificationRatio: '0/8 (0%)',
      },
      reviewerNotes: [],
      reviewSummary: {
        overallOutcome: 'PENDING',
        recommendation: 'Pending verification',
        riskLevel: 'MEDIUM',
        isApproved: false,
        summaryText: 'Pending review',
      },
      generationMetadata: {
        documentId: 'LEGAL-BRIEF-EMPTY',
        generatedAt: new Date().toISOString(),
        generatedByUserId: 'user-1',
        generatedByRole: 'ORPHANAGE',
        systemVersion: '1.0.0',
      },
    };

    const pdfBuffer = await generator.generatePdf(sampleBriefDto);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });
});
