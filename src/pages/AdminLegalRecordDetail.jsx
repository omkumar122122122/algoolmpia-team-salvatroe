import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiX,
} from "react-icons/fi";
import Breadcrumb from "../components/Breadcrumb";
import Button from "../components/Button";
import { PageSkeleton } from "../components/Loader";
import { adoptionsService } from "../services/adoptionsService";

function LegalBriefPreviewModal({ open, briefData, onClose, onDownloadPdf, downloading }) {
  if (!open || !briefData) return null;

  const {
    legalRecordInfo = {},
    keyClauses = [],
    detectedIssues = [],
    verificationStatus = {},
    reviewerNotes = [],
    reviewSummary = {},
  } = briefData;

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "N/A");

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-modal dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-civic-50 text-civic-700 dark:bg-civic-500/10 dark:text-civic-300">
                <FiShield className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">LEGAL REVIEW BRIEF — PREVIEW</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  AI Powered Orphanage Child Safety Management System | Confidential
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Close preview modal"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 space-y-6 text-sm text-slate-800 dark:text-slate-200">
            {/* 1. Record Information */}
            <div className="rounded-2xl border border-gray-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <h3 className="text-xs font-black uppercase tracking-wider text-civic-700 dark:text-civic-400">1. Record Information</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div><span className="text-xs font-bold text-slate-400 uppercase">Record ID:</span> <p className="font-semibold text-slate-900 dark:text-white">{legalRecordInfo.recordId}</p></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Child Name & Code:</span> <p className="font-semibold text-slate-900 dark:text-white">{legalRecordInfo.childName} ({legalRecordInfo.childCode})</p></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Adoptive Parent:</span> <p className="font-semibold text-slate-900 dark:text-white">{legalRecordInfo.parentName || "Pending Parent Linkage"}</p></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Orphanage Institution:</span> <p className="font-semibold text-slate-900 dark:text-white">{legalRecordInfo.orphanageName || "N/A"}</p></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Process Started:</span> <p className="font-semibold text-slate-900 dark:text-white">{formatDate(legalRecordInfo.legalProcessStart)}</p></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Completion Date:</span> <p className="font-semibold text-slate-900 dark:text-white">{formatDate(legalRecordInfo.completedDate)}</p></div>
              </div>
            </div>

            {/* 2. Verification Status */}
            <div className="rounded-2xl border border-gray-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <h3 className="text-xs font-black uppercase tracking-wider text-civic-700 dark:text-civic-400">2. Verification Status</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div><span className="text-xs font-bold text-slate-400 uppercase">Overall Status:</span> <p className="font-bold text-green-600 dark:text-green-400">{verificationStatus.overallStatus}</p></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Parent Background:</span> <p className="font-semibold text-slate-900 dark:text-white">{verificationStatus.parentVerificationStatus}</p></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Parent Identity KYC:</span> <p className="font-semibold text-slate-900 dark:text-white">{verificationStatus.parentKycStatus}</p></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Police Clearance:</span> <p className="font-semibold text-slate-900 dark:text-white">{verificationStatus.policeVerificationStatus}</p></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Document Ratio:</span> <p className="font-semibold text-slate-900 dark:text-white">{verificationStatus.documentVerificationRatio}</p></div>
              </div>
            </div>

            {/* 3. Key Clauses */}
            <div className="rounded-2xl border border-gray-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <h3 className="text-xs font-black uppercase tracking-wider text-civic-700 dark:text-civic-400">3. Key Clauses</h3>
              <div className="mt-3 space-y-3">
                {keyClauses.map((clause) => (
                  <div key={clause.clauseId} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="font-bold text-slate-900 dark:text-white">{clause.title}</p>
                    <p className="text-xs text-slate-500">Value: {clause.value || "N/A"} | Status: {clause.status}</p>
                    {clause.details && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 break-words">{clause.details}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Detected Issues */}
            <div className="rounded-2xl border border-gray-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <h3 className="text-xs font-black uppercase tracking-wider text-civic-700 dark:text-civic-400">4. Detected Issues</h3>
              {detectedIssues.length === 0 ? (
                <p className="mt-2 text-xs font-bold text-green-700 dark:text-green-300">✓ No issues detected — all checks passed.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {detectedIssues.map((issue) => (
                    <div key={issue.issueId} className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                      <span className="font-bold">[{issue.severity}] {issue.category}:</span> {issue.description}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Reviewer Notes */}
            <div className="rounded-2xl border border-gray-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <h3 className="text-xs font-black uppercase tracking-wider text-civic-700 dark:text-civic-400">5. Reviewer Notes</h3>
              {reviewerNotes.length === 0 ? (
                <p className="mt-2 text-xs italic text-slate-500">No reviewer notes provided.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {reviewerNotes.map((note) => (
                    <div key={note.noteId} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>{note.authorName} ({note.role || "OFFICER"})</span>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs italic text-slate-700 dark:text-slate-300">"{note.content}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Review Summary */}
            <div className="rounded-2xl border border-civic-100 bg-civic-50/60 p-4 dark:border-civic-500/20 dark:bg-civic-500/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-civic-800 dark:text-civic-300">6. Review Summary</h3>
              <p className="mt-2 text-xs font-bold text-slate-900 dark:text-white">Outcome: {reviewSummary.overallOutcome} | Risk: {reviewSummary.riskLevel}</p>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{reviewSummary.recommendation}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{reviewSummary.summaryText}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button
              variant="primary"
              icon={downloading ? FiRefreshCw : FiDownload}
              disabled={downloading}
              onClick={() => onDownloadPdf(legalRecordInfo.recordId)}
            >
              {downloading ? "Generating PDF..." : "Download PDF"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminLegalRecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [briefData, setBriefData] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (id) {
      loadBriefData();
    }
  }, [id]);

  const loadBriefData = async () => {
    try {
      setLoading(true);
      const data = await adoptionsService.getBriefData(id);
      setBriefData(data);
      if (data.reviewerNotes?.length > 0) {
        setReviewNotes(data.reviewerNotes[data.reviewerNotes.length - 1].content || "");
      }
    } catch (err) {
      addToast(err.message || "Unable to load legal record details.");
    } finally {
      setLoading(false);
    }
  };

  const addToast = (message) => {
    const toastId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${message}`;
    setToasts((current) => [...current, { id: toastId, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== toastId));
    }, 2600);
  };

  const handleSaveNotes = async () => {
    if (!id || savingNotes) return;
    try {
      setSavingNotes(true);
      await adoptionsService.updateStatus(id, { reviewNotes });
      addToast("Reviewer notes saved successfully.");
    } catch (err) {
      addToast("Failed to save reviewer notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDownloadPdf = async (targetId) => {
    const recordId = targetId || id;
    if (!recordId || downloading) return;
    try {
      setDownloading(true);
      await adoptionsService.generateBrief(recordId, "pdf");
      addToast("Brief downloaded successfully.");
    } catch (err) {
      addToast(err.message || "Unable to generate legal review brief PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!briefData) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={["Admin", "Legal Review", id || "Record"]} />
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Legal Record Not Found</h2>
          <p className="mt-1 text-sm text-slate-500">The requested legal record ID could not be loaded.</p>
          <div className="mt-6">
            <Button variant="outline" icon={FiArrowLeft} onClick={() => navigate("/admin/legal-records")}>
              Back to Legal Records
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const {
    legalRecordInfo = {},
    keyClauses = [],
    detectedIssues = [],
    verificationStatus = {},
    reviewerNotes = [],
    reviewSummary = {},
  } = briefData;

  const isDemo = id === "DEMO-LR-001";

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl"
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <LegalBriefPreviewModal
        open={previewOpen}
        briefData={briefData}
        onClose={() => setPreviewOpen(false)}
        onDownloadPdf={handleDownloadPdf}
        downloading={downloading}
      />

      <Breadcrumb items={["Admin", "Legal Review", id]} />

      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={FiArrowLeft} onClick={() => navigate("/admin/legal-records")}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Legal Record: {legalRecordInfo.recordId}
              </h1>
              {isDemo && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Demo Sample
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Child: <span className="font-semibold text-slate-900 dark:text-white">{legalRecordInfo.childName}</span> ({legalRecordInfo.childCode}) | Parent: <span className="font-semibold text-slate-900 dark:text-white">{legalRecordInfo.parentName || "Pending"}</span>
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={FiEye} onClick={() => setPreviewOpen(true)}>
            Preview Brief
          </Button>
          <Button
            variant="primary"
            icon={downloading ? FiRefreshCw : FiDownload}
            disabled={downloading}
            onClick={() => handleDownloadPdf(id)}
          >
            {downloading ? "Generating Brief..." : "Generate Legal Review Brief"}
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols wide) */}
        <div className="space-y-6 lg:col-span-2">
          {/* SECTION 1: KEY CLAUSES */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-civic-700 dark:text-civic-400">
              <FiFileText className="h-4 w-4" /> Section 1 — Key Clauses
            </h2>
            <div className="mt-4 space-y-4">
              {keyClauses.length === 0 ? (
                <p className="text-xs italic text-slate-500">No key clauses recorded for this adoption record.</p>
              ) : (
                keyClauses.map((clause, idx) => (
                  <div key={clause.clauseId} className="rounded-xl border border-gray-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-civic-600 dark:text-civic-400">Clause 0{idx + 1}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {clause.status}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{clause.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Reference / Value: {clause.value || "N/A"}</p>
                    {clause.details && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300 break-words">
                        {clause.details}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 2: DETECTED ISSUES */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-civic-700 dark:text-civic-400">
              <FiAlertTriangle className="h-4 w-4" /> Section 2 — Detected Issues
            </h2>
            <div className="mt-4">
              {detectedIssues.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <FiCheckCircle className="h-5 w-5 shrink-0" />
                  <p className="text-xs font-bold">No issues detected for this record.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detectedIssues.map((issue) => (
                    <div
                      key={issue.issueId}
                      className={`rounded-xl border p-4 text-xs ${
                        issue.severity === "HIGH"
                          ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                          : issue.severity === "MEDIUM"
                          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                          : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black tracking-wider uppercase">[{issue.severity}] {issue.category}</span>
                        <span className="font-semibold">{issue.isResolved ? "Resolved" : "Active Flag"}</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed font-medium">{issue.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col wide) */}
        <div className="space-y-6">
          {/* SECTION 3: VERIFICATION STATUS */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-civic-700 dark:text-civic-400">
              <FiShield className="h-4 w-4" /> Section 3 — Verification Status
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Overall Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{verificationStatus.overallStatus}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Parent Background</span>
                <span className="font-bold text-slate-900 dark:text-white">{verificationStatus.parentVerificationStatus}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Parent Identity KYC</span>
                <span className="font-bold text-slate-900 dark:text-white">{verificationStatus.parentKycStatus}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Police Clearance</span>
                <span className="font-bold text-slate-900 dark:text-white">{verificationStatus.policeVerificationStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Document Checklist</span>
                <span className="font-bold text-slate-900 dark:text-white">{verificationStatus.documentVerificationRatio}</span>
              </div>
            </div>
          </div>

          {/* SECTION 4: REVIEWER NOTES */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-civic-700 dark:text-civic-400">
              <FiClock className="h-4 w-4" /> Section 4 — Reviewer Notes
            </h2>

            {/* List existing notes */}
            <div className="mt-4 space-y-3">
              {reviewerNotes.length === 0 ? (
                <p className="text-xs italic text-slate-500">No reviewer notes recorded.</p>
              ) : (
                reviewerNotes.map((note) => (
                  <div key={note.noteId} className="rounded-xl border border-gray-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex justify-between font-bold text-slate-500">
                      <span>{note.authorName} ({note.role})</span>
                      <span>{new Date(note.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                    <p className="mt-1 italic text-slate-800 dark:text-slate-200">"{note.content}"</p>
                  </div>
                ))
              )}
            </div>

            {/* Editable note input */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Add / Edit Officer Note</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter officer notes or compliance verification details..."
                className="mt-2 w-full rounded-xl border border-gray-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-civic-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  variant="secondary"
                  icon={savingNotes ? FiRefreshCw : FiSave}
                  disabled={savingNotes}
                  className="min-h-[32px] px-3 py-1 text-xs"
                  onClick={handleSaveNotes}
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
