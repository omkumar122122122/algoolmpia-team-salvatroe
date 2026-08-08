import { Injectable } from '@nestjs/common';
import { LegalReviewBriefDto } from './dto/legal-review-brief.dto';

@Injectable()
export class BriefGeneratorService {
  generateHtml(data: LegalReviewBriefDto): Buffer {
    const formatDate = (d: Date | string | null | undefined) =>
      d ? new Date(d).toLocaleDateString('en-IN') : 'N/A';

    const {
      legalRecordInfo,
      keyClauses,
      detectedIssues,
      verificationStatus,
      reviewerNotes,
      reviewSummary,
      generationMetadata,
    } = data;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legal Review Brief - ${legalRecordInfo.recordId}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; max-width: 850px; margin: 0 auto; padding: 40px; background-color: #ffffff; }
        .header { text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #0f172a; font-size: 24px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; }
        .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; font-weight: 600; }
        .section { margin-bottom: 32px; }
        .section h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; color: #1e40af; font-size: 16px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .field { margin-bottom: 8px; }
        .label { font-weight: 700; color: #64748b; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-size: 14px; color: #0f172a; font-weight: 600; }
        .clause-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
        .clause-title { font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px; }
        .clause-details { font-size: 12px; color: #475569; }
        .clause-status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 6px; }
        .status-VERIFIED { background-color: #dcfce7; color: #166534; }
        .status-PENDING { background-color: #fef3c7; color: #92400e; }
        .issues-list { list-style-type: none; padding: 0; margin: 0; }
        .issue-item { padding: 12px; border-radius: 6px; margin-bottom: 10px; font-size: 13px; border-left: 4px solid; }
        .severity-CRITICAL { background-color: #fef2f2; border-color: #dc2626; color: #991b1b; }
        .severity-HIGH { background-color: #fff7ed; border-color: #ea580c; color: #9a3412; }
        .severity-MEDIUM { background-color: #fefce8; border-color: #ca8a04; color: #854d0e; }
        .severity-LOW { background-color: #f0fdf4; border-color: #16a34a; color: #166534; }
        .severity-INFO { background-color: #eff6ff; border-color: #2563eb; color: #1e40af; }
        .no-issues { padding: 12px; background-color: #f0fdf4; border-left: 4px solid #22c55e; color: #166534; font-size: 13px; font-weight: 700; border-radius: 6px; }
        .notes-card { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; margin-bottom: 12px; }
        .note-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
        .note-content { font-size: 13px; color: #334155; font-style: italic; white-space: pre-wrap; }
        .summary-box { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 16px; border-radius: 6px; }
        .badge { inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .badge-SUCCESSFUL { background-color: #dcfce7; color: #15803d; }
        .badge-PENDING { background-color: #fef3c7; color: #b45309; }
        .badge-FAILED { background-color: #fee2e2; color: #b91c1c; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LEGAL REVIEW BRIEF — ADOPTION RECORD</h1>
        <p>AI Powered Orphanage Child Safety Management System</p>
        <p>Generated: ${formatDate(generationMetadata.generatedAt)} | CONFIDENTIAL & PROPRIETARY</p>
    </div>

    <!-- 1. LEGAL RECORD INFORMATION -->
    <div class="section">
        <h2>1. LEGAL RECORD INFORMATION</h2>
        <div class="grid">
            <div class="field">
                <span class="label">Adoption Record ID</span>
                <span class="value">${legalRecordInfo.recordId}</span>
            </div>
            <div class="field">
                <span class="label">Orphanage Institution</span>
                <span class="value">${legalRecordInfo.orphanageName || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="label">Child Name & Code</span>
                <span class="value">${legalRecordInfo.childName} (${legalRecordInfo.childCode})</span>
            </div>
            <div class="field">
                <span class="label">Adoptive Parent</span>
                <span class="value">${legalRecordInfo.parentName || 'Pending Parent Linkage'}</span>
            </div>
            <div class="field">
                <span class="label">Legal Process Start</span>
                <span class="value">${formatDate(legalRecordInfo.legalProcessStart)}</span>
            </div>
            <div class="field">
                <span class="label">Adoption Completion Date</span>
                <span class="value">${formatDate(legalRecordInfo.completedDate)}</span>
            </div>
        </div>
    </div>

    <!-- 2. KEY CLAUSES -->
    <div class="section">
        <h2>2. KEY CLAUSES & STATUTORY COMPLIANCE</h2>
        ${keyClauses
          .map(
            (clause) => `
            <div class="clause-card">
                <div class="clause-title">${clause.title}</div>
                <div class="clause-details">Value: <strong>${clause.value || 'N/A'}</strong></div>
                ${clause.details ? `<div class="clause-details" style="margin-top: 4px;">${clause.details}</div>` : ''}
                <span class="clause-status status-${clause.status}">${clause.status}</span>
            </div>
        `
          )
          .join('')}
    </div>

    <!-- 3. VERIFICATION STATUS -->
    <div class="section">
        <h2>3. VERIFICATION & CLEARANCE STATUS</h2>
        <div class="grid">
            <div class="field">
                <span class="label">Overall Verification Status</span>
                <span class="badge badge-${verificationStatus.overallStatus}">${verificationStatus.overallStatus}</span>
            </div>
            <div class="field">
                <span class="label">Parent Background Verification</span>
                <span class="value">${verificationStatus.parentVerificationStatus}</span>
            </div>
            <div class="field">
                <span class="label">Parent Identity KYC Status</span>
                <span class="value">${verificationStatus.parentKycStatus}</span>
            </div>
            <div class="field">
                <span class="label">Police Clearance Status</span>
                <span class="value">${verificationStatus.policeVerificationStatus} ${verificationStatus.policeClearanceDate ? `(${formatDate(verificationStatus.policeClearanceDate)})` : ''}</span>
            </div>
            <div class="field">
                <span class="label">Required Document Checklist</span>
                <span class="value">${verificationStatus.documentVerificationRatio}</span>
            </div>
        </div>
    </div>

    <!-- 4. DETECTED ISSUES -->
    <div class="section">
        <h2>4. DETECTED COMPLIANCE ISSUES</h2>
        ${
          detectedIssues.length === 0
            ? '<div class="no-issues">✓ No compliance issues detected — all checks passed.</div>'
            : `<ul class="issues-list">${detectedIssues
                .map(
                  (issue) => `
                <li class="issue-item severity-${issue.severity}">
                    <strong>[${issue.severity}] ${issue.category}:</strong> ${issue.description}
                </li>
            `
                )
                .join('')}</ul>`
        }
    </div>

    <!-- 5. REVIEWER NOTES -->
    <div class="section">
        <h2>5. REVIEWER & AUDIT NOTES</h2>
        ${
          reviewerNotes.length === 0
            ? '<div class="notes-card"><div class="note-content">No reviewer notes recorded for this record.</div></div>'
            : reviewerNotes
                .map(
                  (note) => `
                <div class="notes-card">
                    <div class="note-header">
                        <span>${note.authorName} (${note.role || 'OFFICER'}) - Category: ${note.category}</span>
                        <span>${formatDate(note.createdAt)}</span>
                    </div>
                    <div class="note-content">${note.content}</div>
                </div>
            `
                )
                .join('')
        }
    </div>

    <!-- 6. REVIEW SUMMARY -->
    <div class="section">
        <h2>6. LEGAL REVIEW SUMMARY & RECOMMENDATION</h2>
        <div class="summary-box">
            <div class="grid" style="margin-bottom: 12px;">
                <div>
                    <span class="label">Overall Outcome</span>
                    <span class="value">${reviewSummary.overallOutcome}</span>
                </div>
                <div>
                    <span class="label">Assessed Risk Level</span>
                    <span class="value" style="color: ${reviewSummary.riskLevel === 'CRITICAL' ? '#dc2626' : reviewSummary.riskLevel === 'HIGH' ? '#ea580c' : '#16a34a'};">${reviewSummary.riskLevel} RISK</span>
                </div>
            </div>
            <div style="margin-bottom: 8px;">
                <span class="label">Recommendation</span>
                <div class="value">${reviewSummary.recommendation}</div>
            </div>
            <div>
                <span class="label">Summary Narrative</span>
                <div class="value" style="font-weight: 400; font-size: 13px;">${reviewSummary.summaryText}</div>
            </div>
        </div>
    </div>

    <!-- 7. GENERATION METADATA -->
    <div class="footer">
        Document ID: ${generationMetadata.documentId} | Generated By: User ${generationMetadata.generatedByUserId} (${generationMetadata.generatedByRole})<br>
        System Version: ${generationMetadata.systemVersion} | Env: ${generationMetadata.environment || 'production'}
    </div>
</body>
</html>
    `;

    return Buffer.from(html, 'utf-8');
  }
}
