import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import { LegalReviewBriefDto } from './dto/legal-review-brief.dto';

@Injectable()
export class LegalBriefPdfGenerator {
  generatePdf(data: LegalReviewBriefDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          bufferPages: true,
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err: Error) => reject(err));

        const primaryColor = '#0f172a'; // Deep slate blue
        const secondaryColor = '#1e40af'; // Royal blue
        const mutedColor = '#64748b'; // Muted grey
        const darkTextColor = '#1e293b'; // Charcoal body text

        // Helper formatting function
        const formatDate = (d: Date | string | null | undefined) =>
          d ? new Date(d).toLocaleDateString('en-IN') : 'N/A';

        // -------------------------------------------------------------
        // HEADER
        // -------------------------------------------------------------
        const drawHeader = () => {
          doc
            .fontSize(18)
            .font('Helvetica-Bold')
            .fillColor(primaryColor)
            .text('LEGAL REVIEW BRIEF', { align: 'center', characterSpacing: 1 })
            .moveDown(0.2);

          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(secondaryColor)
            .text('AI POWERED ORPHANAGE CHILD SAFETY MANAGEMENT SYSTEM', { align: 'center' })
            .moveDown(0.2);

          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor(mutedColor)
            .text(`CONFIDENTIAL & PROPRIETARY — GENERATED: ${formatDate(data.generationMetadata.generatedAt)}`, { align: 'center' })
            .moveDown(0.5);

          // Rule line
          doc
            .moveTo(40, doc.y)
            .lineTo(555, doc.y)
            .strokeColor('#cbd5e1')
            .lineWidth(1)
            .stroke()
            .moveDown(0.8);
        };

        drawHeader();

        // -------------------------------------------------------------
        // SECTION 1 — Record Information
        // -------------------------------------------------------------
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text('SECTION 1 — RECORD INFORMATION')
          .moveDown(0.4);

        const recordInfo = [
          ['Record ID:', data.legalRecordInfo.recordId],
          ['Record Title / Child Name:', `${data.legalRecordInfo.childName} (${data.legalRecordInfo.childCode})`],
          ['Record Type:', 'Adoption Legal Review Record'],
          ['Relevant Parties / Parent:', data.legalRecordInfo.parentName || 'Pending Parent Linkage'],
          ['Orphanage Institution:', data.legalRecordInfo.orphanageName || 'N/A'],
          ['Created / Process Start Date:', formatDate(data.legalRecordInfo.legalProcessStart)],
          ['Review / Completion Date:', formatDate(data.legalRecordInfo.completedDate)],
        ];

        recordInfo.forEach(([label, value]) => {
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(mutedColor)
            .text(label, 45, doc.y, { continued: true, width: 180 })
            .font('Helvetica')
            .fillColor(darkTextColor)
            .text(` ${value}`, { width: 330 })
            .moveDown(0.15);
        });

        doc.moveDown(0.6);

        // -------------------------------------------------------------
        // SECTION 2 — Verification Status
        // -------------------------------------------------------------
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text('SECTION 2 — VERIFICATION STATUS')
          .moveDown(0.4);

        let verificationDisplayStatus = 'NOT REVIEWED';
        if (data.verificationStatus.overallStatus === 'SUCCESSFUL') {
          verificationDisplayStatus = 'VERIFIED';
        } else if (data.verificationStatus.overallStatus === 'FAILED') {
          verificationDisplayStatus = 'FAILED';
        } else if (data.verificationStatus.overallStatus === 'PENDING') {
          verificationDisplayStatus = 'PENDING';
        }

        const verificationInfo = [
          ['Verification Status:', verificationDisplayStatus],
          ['Parent Background Clearance:', data.verificationStatus.parentVerificationStatus],
          ['Parent Identity KYC Status:', data.verificationStatus.parentKycStatus],
          ['Police Background Clearance:', `${data.verificationStatus.policeVerificationStatus} ${data.verificationStatus.policeClearanceDate ? `(Cleared: ${formatDate(data.verificationStatus.policeClearanceDate)})` : ''}`],
          ['Document Verification Checklist:', data.verificationStatus.documentVerificationRatio],
        ];

        verificationInfo.forEach(([label, value]) => {
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(mutedColor)
            .text(label, 45, doc.y, { continued: true, width: 180 })
            .font('Helvetica-Bold')
            .fillColor(
              value.includes('VERIFIED') || value.includes('APPROVED') || value.includes('CLEARED')
                ? '#15803d'
                : value.includes('FAILED') || value.includes('REJECTED') || value.includes('FLAGGED')
                ? '#b91c1c'
                : '#b45309'
            )
            .text(` ${value}`, { width: 330 })
            .moveDown(0.15);
        });

        doc.moveDown(0.6);

        // -------------------------------------------------------------
        // SECTION 3 — Executive Review Summary
        // -------------------------------------------------------------
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text('SECTION 3 — EXECUTIVE REVIEW SUMMARY')
          .moveDown(0.4);

        const summaryMetrics = [
          ['Number of Clauses Assessed:', `${data.keyClauses.length} statutory clauses`],
          ['Number of Detected Issues:', `${data.detectedIssues.length} issue(s)`],
          ['Overall Verification Status:', verificationDisplayStatus],
          ['Overall Risk Status:', `${data.reviewSummary.riskLevel} RISK`],
        ];

        summaryMetrics.forEach(([label, value]) => {
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(mutedColor)
            .text(label, 45, doc.y, { continued: true, width: 180 })
            .font('Helvetica')
            .fillColor(darkTextColor)
            .text(` ${value}`, { width: 330 })
            .moveDown(0.15);
        });

        doc.moveDown(0.6);

        // -------------------------------------------------------------
        // SECTION 4 — Key Clauses
        // -------------------------------------------------------------
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text('SECTION 4 — KEY CLAUSES')
          .moveDown(0.4);

        data.keyClauses.forEach((clause, index) => {
          if (doc.y > 680) {
            doc.addPage();
            drawHeader();
          }

          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor(primaryColor)
            .text(`${index + 1}. ${clause.title}`, 45, doc.y)
            .fontSize(8)
            .font('Helvetica-Oblique')
            .fillColor(mutedColor)
            .text(`Category: ${clause.clauseType} | Status: ${clause.status}`, 45, doc.y)
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor(darkTextColor)
            .text(`Clause Text / Value: ${clause.value || 'N/A'}`, 45, doc.y);

          if (clause.details) {
            doc
              .fontSize(8)
              .font('Helvetica')
              .fillColor('#475569')
              .text(`Details: ${clause.details}`, 45, doc.y, { width: 500, align: 'justify' });
          }

          doc.moveDown(0.3);
        });

        doc.moveDown(0.5);

        // -------------------------------------------------------------
        // SECTION 5 — Detected Issues
        // -------------------------------------------------------------
        if (doc.y > 650) {
          doc.addPage();
          drawHeader();
        }

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text('SECTION 5 — DETECTED ISSUES')
          .moveDown(0.4);

        if (data.detectedIssues.length === 0) {
          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#15803d')
            .text('No issues detected.', 45, doc.y)
            .moveDown(0.5);
        } else {
          data.detectedIssues.forEach((issue, index) => {
            if (doc.y > 680) {
              doc.addPage();
              drawHeader();
            }

            doc
              .fontSize(9.5)
              .font('Helvetica-Bold')
              .fillColor(
                issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? '#dc2626' : '#2563eb'
              )
              .text(`Issue #${index + 1}: [${issue.severity}] ${issue.category}`, 45, doc.y)
              .fontSize(8.5)
              .font('Helvetica')
              .fillColor(darkTextColor)
              .text(`Description: ${issue.description}`, 45, doc.y, { width: 500 })
              .fontSize(8)
              .font('Helvetica-Oblique')
              .fillColor(mutedColor)
              .text(`Recommendation / Action: ${issue.isResolved ? 'Resolved' : 'Requires administrative review prior to final approval'}`, 45, doc.y);

            doc.moveDown(0.3);
          });
        }

        doc.moveDown(0.5);

        // -------------------------------------------------------------
        // SECTION 6 — Reviewer Notes
        // -------------------------------------------------------------
        if (doc.y > 650) {
          doc.addPage();
          drawHeader();
        }

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text('SECTION 6 — REVIEWER NOTES')
          .moveDown(0.4);

        if (data.reviewerNotes.length === 0) {
          doc
            .fontSize(9.5)
            .font('Helvetica-Oblique')
            .fillColor(mutedColor)
            .text('No reviewer notes provided.', 45, doc.y)
            .moveDown(0.5);
        } else {
          data.reviewerNotes.forEach((note, index) => {
            if (doc.y > 680) {
              doc.addPage();
              drawHeader();
            }

            doc
              .fontSize(9)
              .font('Helvetica-Bold')
              .fillColor(primaryColor)
              .text(`Reviewer: ${note.authorName} (${note.role || 'OFFICER'}) — Category: ${note.category}`, 45, doc.y)
              .fontSize(8)
              .font('Helvetica-Oblique')
              .fillColor(mutedColor)
              .text(`Date: ${formatDate(note.createdAt)}`, 45, doc.y)
              .fontSize(8.5)
              .font('Helvetica-Oblique')
              .fillColor(darkTextColor)
              .text(`Note: "${note.content}"`, 45, doc.y, { width: 500 });

            doc.moveDown(0.3);
          });
        }

        doc.moveDown(0.5);

        // -------------------------------------------------------------
        // SECTION 7 — Review Summary
        // -------------------------------------------------------------
        if (doc.y > 650) {
          doc.addPage();
          drawHeader();
        }

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text('SECTION 7 — REVIEW SUMMARY')
          .moveDown(0.4);

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(`Overall Outcome: ${data.reviewSummary.overallOutcome}`, 45, doc.y)
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text(`Recommendation: ${data.reviewSummary.recommendation}`, 45, doc.y)
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor(darkTextColor)
          .text(`Summary Narrative: ${data.reviewSummary.summaryText}`, 45, doc.y, { width: 500, align: 'justify' });

        doc.moveDown(0.6);

        // -------------------------------------------------------------
        // SECTION 8 — Generation Metadata
        // -------------------------------------------------------------
        if (doc.y > 680) {
          doc.addPage();
          drawHeader();
        }

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(secondaryColor)
          .text('SECTION 8 — GENERATION METADATA')
          .moveDown(0.4);

        const metadataList = [
          ['Document ID:', data.generationMetadata.documentId],
          ['Generated Date/Time:', formatDate(data.generationMetadata.generatedAt)],
          ['Application / Project Name:', 'AI Powered Orphanage Child Safety Management System'],
          ['Document Version:', `v${data.generationMetadata.systemVersion}`],
        ];

        metadataList.forEach(([label, value]) => {
          doc
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor(mutedColor)
            .text(label, 45, doc.y, { continued: true, width: 180 })
            .font('Helvetica')
            .fillColor(darkTextColor)
            .text(` ${value}`, { width: 330 })
            .moveDown(0.15);
        });

        // -------------------------------------------------------------
        // FOOTER & PAGE NUMBERING ON ALL PAGES
        // -------------------------------------------------------------
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor(mutedColor)
            .text(
              `Page ${i + 1} of ${range.count}  |  Child Safety Management System  |  Legal Review Brief`,
              40,
              790,
              { align: 'center', width: 515 }
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
