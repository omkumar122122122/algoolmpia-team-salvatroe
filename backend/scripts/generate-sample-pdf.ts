import * as fs from 'fs';
import * as path from 'path';
import { LegalBriefPdfGenerator } from '../src/adoptions/legal-brief-pdf.generator';
import { LegalReviewBriefDto } from '../src/adoptions/dto/legal-review-brief.dto';

async function generateSamplePdf() {
  console.log('📄 Generating Real Sample Legal Review Brief PDF for Hackathon Judges...');

  const sampleBriefDto: LegalReviewBriefDto = {
    legalRecordInfo: {
      recordId: 'DEMO-LR-001',
      childId: 'c-sun-002',
      childName: 'Priya Sharma',
      childCode: 'CHILD-SUN-002',
      parentId: 'parent-demo-1',
      parentName: 'Vikram Sharma',
      orphanageId: 'orp-sun-001',
      orphanageName: 'Sunshine Children Home',
      adoptionStatus: 'COMPLETED',
      legalProcessStart: '2026-01-01T00:00:00.000Z',
      completedDate: '2026-02-01T00:00:00.000Z',
    },
    keyClauses: [
      {
        clauseId: 'c-1',
        title: 'Court Jurisdiction & Decree Venue',
        clauseType: 'COURT_ORDER',
        value: 'District Family Court, Central New Delhi',
        details: 'Court Case Number: FC/ADO/2026/0492. Final Adoption Decree Issued on 2026-01-20.',
        status: 'VERIFIED',
      },
      {
        clauseId: 'c-2',
        title: 'Central Adoption Resource Authority Clearance',
        clauseType: 'CARA_REF',
        value: 'CARA-REG-2026-ND-8899',
        details: 'CARA Statutory Clearance Status: APPROVED for inter-state and domestic adoption custody transfer.',
        status: 'VERIFIED',
      },
      {
        clauseId: 'c-3',
        title: 'Statutory Post-Adoption Welfare Follow-up Schedule',
        clauseType: 'FOLLOW_UP',
        value: 'Schedule Initiated',
        details: 'First Post-Adoption Welfare Review due on 2026-05-01 per CARA Guidelines.',
        status: 'SCHEDULED',
      },
    ],
    detectedIssues: [
      {
        issueId: 'iss-1',
        category: 'DOCUMENTATION',
        severity: 'MEDIUM',
        description: 'Document annual_income_statement.pdf (FINANCIAL_PROOFS) is pending manual officer verification.',
        isResolved: false,
      },
      {
        issueId: 'iss-2',
        category: 'COMPLIANCE',
        severity: 'LOW',
        description: 'Post-adoption quarterly welfare follow-up 2 is scheduled but pending execution date confirmation.',
        isResolved: false,
      },
    ],
    verificationStatus: {
      overallStatus: 'SUCCESSFUL',
      parentVerificationStatus: 'APPROVED',
      parentKycStatus: 'APPROVED',
      policeVerificationStatus: 'CLEARED',
      policeClearanceDate: '2026-01-15T00:00:00.000Z',
      documentsVerifiedCount: 5,
      totalDocumentsCount: 6,
      documentVerificationRatio: '5/6 (83.3%)',
    },
    reviewerNotes: [
      {
        noteId: 'note-1',
        authorId: 'user-admin-1',
        authorName: 'Aarav Sharma',
        role: 'ADMIN',
        category: 'LEGAL_COMPLIANCE',
        content: 'All statutory adoption checks cleared cleanly per juvenile welfare guidelines. Final court order decree validated on 2026-01-20.',
        createdAt: '2026-02-01T10:00:00.000Z',
      },
      {
        noteId: 'note-2',
        authorId: 'user-police-1',
        authorName: 'Inspector Rajesh Verma',
        role: 'POLICE_OFFICER',
        category: 'POLICE_VERIFICATION',
        content: 'Background verification clean. Criminal background check returned clear across all national police databases (PCC-DL-2026-77881).',
        createdAt: '2026-01-15T14:30:00.000Z',
      },
    ],
    reviewSummary: {
      overallOutcome: 'COMPLETED',
      recommendation: 'Final Legal Adoption Approved. Child successfully placed in permanent adoptive home.',
      riskLevel: 'LOW',
      isApproved: true,
      summaryText: 'Adoption record DEMO-LR-001 for child Priya Sharma has satisfied all statutory verification requirements. 5 out of 6 legal documents are verified, police clearance is confirmed clean, and court order decree FC/ADO/2026/0492 has been legally executed.',
    },
    generationMetadata: {
      documentId: 'LEGAL-BRIEF-DEMO-LR-001',
      generatedAt: new Date().toISOString(),
      generatedByUserId: 'user-admin-1',
      generatedByRole: 'ADMIN',
      systemVersion: '1.0.0',
      environment: 'demo-production',
    },
  };

  const generator = new LegalBriefPdfGenerator();
  const pdfBuffer = await generator.generatePdf(sampleBriefDto);

  // Target directories
  const docsDir = path.join(process.cwd(), '..', 'docs', 'samples');
  const uploadsDir = path.join(process.cwd(), 'uploads', 'samples');

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const docsFilePath = path.join(docsDir, 'legal-review-brief-sample.pdf');
  const uploadsFilePath = path.join(uploadsDir, 'legal-review-brief-sample.pdf');

  fs.writeFileSync(docsFilePath, pdfBuffer);
  fs.writeFileSync(uploadsFilePath, pdfBuffer);

  console.log(`✅ Sample PDF generated successfully!`);
  console.log(`   📁 Doc Path:    ${docsFilePath}`);
  console.log(`   📁 Upload Path: ${uploadsFilePath}`);
  console.log(`   📊 File Size:   ${pdfBuffer.length} bytes`);
  console.log(`   🔒 Header:      ${pdfBuffer.toString('utf-8', 0, 5)}`);
}

generateSamplePdf().catch((err) => {
  console.error('❌ Failed to generate sample PDF:', err);
  process.exit(1);
});
