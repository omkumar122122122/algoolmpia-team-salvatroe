import { REQUIRED_ADOPTION_DOCUMENTS } from '../adoptions.service';
import {
  GenerationMetadataDto,
  LegalClauseDto,
  LegalIssueDto,
  LegalRecordInfoDto,
  LegalReviewBriefDto,
  ReviewerNoteDto,
  ReviewSummaryDto,
  VerificationStatusDto,
} from '../dto/legal-review-brief.dto';

export class LegalReviewBriefMapper {
  static fromPrisma(
    record: any,
    options: { userId: string; role: string }
  ): LegalReviewBriefDto {
    const parent = record.adoptiveParent;
    const police = parent?.policeVerification;
    const child = record.child;
    const documents = record.documents || [];

    // 1. Legal Record Information
    const legalRecordInfo: LegalRecordInfoDto = {
      recordId: record.id,
      childId: child.id,
      childName: `${child.firstName} ${child.lastName || ''}`.trim(),
      childCode: child.childCode,
      parentId: parent?.id || null,
      parentName: parent?.user ? `${parent.user.firstName} ${parent.user.lastName || ''}`.trim() : null,
      orphanageId: child.orphanage?.id || null,
      orphanageName: child.orphanage?.name || null,
      adoptionStatus: record.status,
      legalProcessStart: record.legalProcessStart,
      completedDate: record.completedDate,
    };

    // 2. Key Clauses (Supports multiple clauses & long text)
    const verifiedDocs = documents.filter((d: any) => d.isVerified);
    const verifiedDocCount = verifiedDocs.length;
    const totalDocCount = REQUIRED_ADOPTION_DOCUMENTS.length;

    const keyClauses: LegalClauseDto[] = [
      {
        clauseId: `clause-court-jurisdiction-${record.id}`,
        title: 'Court Jurisdiction & Venue',
        clauseType: 'COURT_ORDER',
        value: record.courtName || 'Pending Court Allocation',
        details: `Court order date: ${record.courtOrderDate ? new Date(record.courtOrderDate).toLocaleDateString('en-IN') : 'N/A'}, Case Number: ${record.courtCaseNumber || 'N/A'}. Order URL: ${record.courtOrderUrl || 'N/A'}`,
        status: record.courtName ? 'VERIFIED' : 'PENDING',
      },
      {
        clauseId: `clause-court-case-${record.id}`,
        title: 'Court Order Authorization & Filing',
        clauseType: 'COURT_CASE',
        value: record.courtCaseNumber || 'Pending Case Number',
        details: `Adoption decree case record ref: ${record.courtCaseNumber || 'Unassigned'}. Statutory approval date: ${record.courtOrderDate ? new Date(record.courtOrderDate).toLocaleDateString('en-IN') : 'Pending'}`,
        status: record.courtCaseNumber ? 'VERIFIED' : 'PENDING',
      },
      {
        clauseId: `clause-adoption-cert-${record.id}`,
        title: 'Adoption Certificate Issuance',
        clauseType: 'ADOPTION_CERTIFICATE',
        value: record.adoptionCertNumber || 'Pending Final Completion',
        details: `Official adoption certificate reference number: ${record.adoptionCertNumber || 'N/A'}. Storage URL: ${record.adoptionCertUrl || 'N/A'}`,
        status: record.adoptionCertNumber ? 'VERIFIED' : 'PENDING',
      },
      {
        clauseId: `clause-cara-ref-${record.id}`,
        title: 'Central Adoption Resource Authority (CARA) Clearance',
        clauseType: 'CARA_REF',
        value: record.caraReferenceNumber || 'Pending CARA Linkage',
        details: `Central Adoption Resource Authority (CARA) statutory reference: ${record.caraReferenceNumber || 'N/A'}. CARA Status: ${record.caraStatus || 'UNDER_PROCESS'}`,
        status: record.caraReferenceNumber ? 'VERIFIED' : 'PENDING',
      },
      {
        clauseId: `clause-doc-checklist-${record.id}`,
        title: 'Required Legal Documentation Checklist',
        clauseType: 'DOCUMENTATION',
        value: `${verifiedDocCount} of ${totalDocCount} verified`,
        details: `Standard required document checklist (${REQUIRED_ADOPTION_DOCUMENTS.join(', ')}). Uploaded: ${documents.length}/${totalDocCount}. Verified: ${verifiedDocCount}/${totalDocCount}.`,
        status: verifiedDocCount >= totalDocCount ? 'VERIFIED' : 'PENDING',
      },
    ];

    // 3. Detected Issues (Multiple issues, missing issues, severity levels, long text)
    const detectedIssues: LegalIssueDto[] = [];
    let issueIdx = 1;

    if (record.status === 'CANCELLED' && record.cancellationReason) {
      detectedIssues.push({
        issueId: `issue-${record.id}-${issueIdx++}`,
        severity: 'CRITICAL',
        category: 'CANCELLATION',
        description: `Adoption process was cancelled. Reason: ${record.cancellationReason}`,
        detectedAt: record.cancelledDate || record.updatedAt,
        isResolved: false,
      });
    }

    if (parent && parent.verificationStatus !== 'APPROVED') {
      detectedIssues.push({
        issueId: `issue-${record.id}-${issueIdx++}`,
        severity: parent.verificationStatus === 'REJECTED' ? 'CRITICAL' : 'HIGH',
        category: 'PARENT_VERIFICATION',
        description: `Adoptive parent background verification status is '${parent.verificationStatus}' (Notes: ${parent.verificationNotes || 'None'}).`,
        detectedAt: parent.updatedAt || null,
        isResolved: false,
      });
    }

    if (parent && parent.kycStatus !== 'APPROVED') {
      detectedIssues.push({
        issueId: `issue-${record.id}-${issueIdx++}`,
        severity: parent.kycStatus === 'REJECTED' ? 'CRITICAL' : 'HIGH',
        category: 'KYC',
        description: `Parent identity KYC verification status is '${parent.kycStatus}'. Complete KYC clearance required.`,
        detectedAt: null,
        isResolved: false,
      });
    }

    if (police?.crimeRecordFound) {
      detectedIssues.push({
        issueId: `issue-${record.id}-${issueIdx++}`,
        severity: 'CRITICAL',
        category: 'POLICE_RECORD',
        description: `Police verification flagged criminal history record: ${police.crimeRecordDetails || 'Details under review'}`,
        detectedAt: police.updatedAt || null,
        isResolved: false,
      });
    }

    if (police && police.status === 'FLAGGED') {
      detectedIssues.push({
        issueId: `issue-${record.id}-${issueIdx++}`,
        severity: 'HIGH',
        category: 'POLICE_VERIFICATION',
        description: `Police background clearance is FLAGGED. Reason: ${police.flagReason || 'Unspecified police flag'}`,
        detectedAt: police.updatedAt || null,
        isResolved: false,
      });
    }

    const missingOrUnverified = REQUIRED_ADOPTION_DOCUMENTS.filter(
      (docType) => !documents.some((d: any) => d.documentType === docType && d.isVerified)
    );
    if (missingOrUnverified.length > 0) {
      detectedIssues.push({
        issueId: `issue-${record.id}-${issueIdx++}`,
        severity: 'MEDIUM',
        category: 'DOCUMENTATION',
        description: `${missingOrUnverified.length} required documents are unverified or missing: ${missingOrUnverified.join(', ')}.`,
        detectedAt: null,
        isResolved: false,
      });
    }

    if (child.specialNotes) {
      detectedIssues.push({
        issueId: `issue-${record.id}-${issueIdx++}`,
        severity: 'INFO',
        category: 'CHILD_SPECIAL_NOTES',
        description: `Child special welfare notes: ${child.specialNotes}`,
        detectedAt: null,
        isResolved: true,
      });
    }

    // 4. Verification Status (Pending, failed, successful)
    const parentStatus = parent?.verificationStatus || 'PENDING';
    const parentKyc = parent?.kycStatus || 'PENDING';
    const policeStatus = police?.status || 'PENDING';

    let overallStatus: 'SUCCESSFUL' | 'PENDING' | 'FAILED' = 'PENDING';
    const hasCriticalOrRejected = detectedIssues.some(
      (i) => i.severity === 'CRITICAL' || parentStatus === 'REJECTED' || parentKyc === 'REJECTED'
    );
    if (hasCriticalOrRejected || record.status === 'CANCELLED') {
      overallStatus = 'FAILED';
    } else if (
      record.status === 'COMPLETED' &&
      parentStatus === 'APPROVED' &&
      parentKyc === 'APPROVED' &&
      policeStatus === 'CLEARED' &&
      verifiedDocCount >= totalDocCount
    ) {
      overallStatus = 'SUCCESSFUL';
    }

    const documentVerificationRatio = `${verifiedDocCount}/${totalDocCount} (${Math.round((verifiedDocCount / totalDocCount) * 100)}%)`;

    const verificationStatus: VerificationStatusDto = {
      overallStatus,
      parentVerificationStatus: parentStatus,
      parentKycStatus: parentKyc,
      policeVerificationStatus: policeStatus,
      policeClearanceDate: police?.clearedAt || null,
      documentsVerifiedCount: verifiedDocCount,
      totalDocumentsCount: totalDocCount,
      documentVerificationRatio,
    };

    // 5. Reviewer Notes (Multiple notes, missing notes supported, long text)
    const reviewerNotes: ReviewerNoteDto[] = [];
    let noteIdx = 1;

    if (record.reviewNotes) {
      reviewerNotes.push({
        noteId: `note-${record.id}-${noteIdx++}`,
        authorId: record.reviewedById || null,
        authorName: record.reviewedBy
          ? `${record.reviewedBy.firstName} ${record.reviewedBy.lastName || ''}`.trim()
          : 'Adoption Review Officer',
        role: record.reviewedBy?.role || 'ADMIN',
        category: 'GENERAL',
        content: record.reviewNotes,
        createdAt: record.updatedAt || null,
      });
    }

    if (police?.reviewNotes) {
      reviewerNotes.push({
        noteId: `note-${record.id}-${noteIdx++}`,
        authorId: null,
        authorName: 'Police Verification Officer',
        role: 'POLICE_AUTHORITY',
        category: 'POLICE_VERIFICATION',
        content: police.reviewNotes,
        createdAt: police.updatedAt || null,
      });
    }

    if (record.postAdoptionNotes) {
      reviewerNotes.push({
        noteId: `note-${record.id}-${noteIdx++}`,
        authorId: null,
        authorName: 'Welfare Assessment Officer',
        role: 'SOCIAL_WORKER',
        category: 'LEGAL_ASSESSMENT',
        content: record.postAdoptionNotes,
        createdAt: record.updatedAt || null,
      });
    }

    // 6. Review Summary
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (detectedIssues.some((i) => i.severity === 'CRITICAL')) {
      riskLevel = 'CRITICAL';
    } else if (detectedIssues.some((i) => i.severity === 'HIGH')) {
      riskLevel = 'HIGH';
    } else if (detectedIssues.some((i) => i.severity === 'MEDIUM')) {
      riskLevel = 'MEDIUM';
    }

    let recommendation = 'Pending mandatory verification checks.';
    if (overallStatus === 'SUCCESSFUL') {
      recommendation = 'Recommended for final legal adoption approval and certificate issuance.';
    } else if (overallStatus === 'FAILED') {
      recommendation = 'Adoption process blocked due to unresolved critical compliance issues or rejection.';
    } else if (verifiedDocCount > 0) {
      recommendation = 'In-progress. Complete remaining document uploads and verification clearance.';
    }

    const reviewSummary: ReviewSummaryDto = {
      overallOutcome: record.status,
      recommendation,
      riskLevel,
      isApproved: record.status === 'COMPLETED',
      summaryText: `Adoption record ${record.id} for child ${child.firstName} ${child.lastName || ''} (${child.childCode}) is currently at status '${record.status}'. Verification status is ${overallStatus} with ${detectedIssues.length} detected issue(s) and ${verifiedDocCount}/${totalDocCount} documents verified.`,
    };

    // 7. Generation Metadata
    const generationMetadata: GenerationMetadataDto = {
      documentId: `LEGAL-BRIEF-${record.id.slice(0, 8).toUpperCase()}-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      generatedByUserId: options.userId,
      generatedByRole: options.role,
      systemVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    return {
      legalRecordInfo,
      keyClauses,
      detectedIssues,
      verificationStatus,
      reviewerNotes,
      reviewSummary,
      generationMetadata,
    };
  }
}
