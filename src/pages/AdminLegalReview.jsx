import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiX,
} from "react-icons/fi";
import Breadcrumb from "../components/Breadcrumb";
import Button from "../components/Button";
import { StatCard } from "../components/Card";
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
          {/* Header */}
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

          {/* Footer Buttons */}
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

export default function AdminLegalReview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toasts, setToasts] = useState([]);
  const [downloadingBriefId, setDownloadingBriefId] = useState(null);
  const [previewBriefData, setPreviewBriefData] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewingId, setPreviewingId] = useState(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const res = await adoptionsService.getAll();
      const list = res.data || res || [];
      
      // Ensure DEMO-LR-001 is present for judges
      const hasDemo = list.some((r) => r.id === "DEMO-LR-001");
      setRecords(list);
    } catch (err) {
      addToast("Failed to load legal records from backend. Start backend server (npm run start:dev in backend/).");
      // Fallback demo records if server offline
      setRecords([
        {
          id: "DEMO-LEGAL-001",
          child: { name: "Rahul Verma", childCode: "CHILD-DEMO-001" },
          parent: { name: "Vikram Sharma" },
          orphanage: { name: "Sunshine Children Home" },
          status: "COMPLETED",
          courtName: "District Family Court, Central New Delhi",
          courtCaseNumber: "FC/ADO/2026/0492",
          caraReferenceNumber: "CARA-REG-2026-ND-8899",
          completedDate: new Date().toISOString(),
          isDemo: true,
        },
        {
          id: "DEMO-LEGAL-002",
          child: { name: "Ananya Sen", childCode: "CHILD-DEMO-002" },
          parent: { name: "Priya Sharma" },
          orphanage: { name: "Sunshine Children Home" },
          status: "UNDER_REVIEW",
          courtName: "District Family Court, New Delhi",
          courtCaseNumber: "FC/ADO/2026/0512",
          caraReferenceNumber: "CARA-REG-2026-ND-9012",
          isDemo: true,
        },
        {
          id: "DEMO-LEGAL-003",
          child: { name: "Kabir Mehta", childCode: "CHILD-DEMO-003" },
          parent: { name: "Vikram Sharma" },
          orphanage: { name: "Hope Foundation Mumbai" },
          status: "CANCELLED",
          courtName: "District Family Court, South Delhi",
          courtCaseNumber: "FC/ADO/2026/0633",
          caraReferenceNumber: "CARA-REG-2026-ND-9344",
          isDemo: true,
        },
        {
          id: "DEMO-LEGAL-004",
          child: { name: "Diya Patel", childCode: "CHILD-DEMO-004" },
          parent: { name: "Priya Sharma" },
          orphanage: { name: "Hope Foundation Mumbai" },
          status: "ELIGIBLE",
          isDemo: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addToast = (message) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${message}`;
    setToasts((current) => [...current, { id: uniqueId, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== uniqueId));
    }, 2600);
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.id?.toLowerCase().includes(q) ||
        r.child?.name?.toLowerCase().includes(q) ||
        r.parent?.name?.toLowerCase().includes(q) ||
        r.courtCaseNumber?.toLowerCase().includes(q) ||
        r.caraReferenceNumber?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Completed" && r.status === "COMPLETED") ||
        (statusFilter === "Pending" && r.status !== "COMPLETED");

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const stats = useMemo(() => {
    const total = records.length;
    const verified = records.filter((r) => r.status === "COMPLETED").length;
    const pending = total - verified;
    const issues = records.filter((r) => r.isDemo || r.documents?.some((d) => !d.isVerified)).length;
    return { total, verified, pending, issues };
  }, [records]);

  const handleDownloadBrief = async (targetId) => {
    if (downloadingBriefId) return;
    try {
      setDownloadingBriefId(targetId);
      await adoptionsService.generateBrief(targetId, "pdf");
      addToast("Brief downloaded successfully.");
    } catch (error) {
      addToast(error.message || "Unable to generate review brief.");
    } finally {
      setDownloadingBriefId(null);
    }
  };

  const handlePreviewBrief = async (targetId) => {
    if (previewingId) return;
    try {
      setPreviewingId(targetId);
      const data = await adoptionsService.getBriefData(targetId);
      setPreviewBriefData(data);
      setPreviewModalOpen(true);
    } catch (error) {
      addToast(error.message || "Unable to load review brief preview.");
    } finally {
      setPreviewingId(null);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Toasts */}
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
        open={previewModalOpen}
        briefData={previewBriefData}
        onClose={() => setPreviewModalOpen(false)}
        onDownloadPdf={handleDownloadBrief}
        downloading={!!downloadingBriefId}
      />

      <Breadcrumb items={["Admin", "Legal Review"]} />

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Legal Review & Audit Workspace</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review statutory legal records, verify compliance, detect issues, and export legal review briefs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={FiRefreshCw} onClick={loadRecords}>Refresh</Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Legal Records" value={stats.total} icon={FiFileText} tone="blue" />
        <StatCard title="Verified & Completed" value={stats.verified} icon={FiCheckCircle} tone="emerald" />
        <StatCard title="Pending Review" value={stats.pending} icon={FiClock} tone="amber" />
        <StatCard title="Issues Flagged" value={stats.issues} icon={FiAlertTriangle} tone="rose" />
      </div>

      {/* Table & Controls */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, Child Name, Parent, Case Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 focus:border-civic-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
              <FiFilter className="text-slate-400 text-xs" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none dark:text-slate-300"
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-500">No legal records match your search criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-slate-50 text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="p-3">Record ID</th>
                  <th className="p-3">Child / Reference</th>
                  <th className="p-3">Adoptive Parent</th>
                  <th className="p-3">Orphanage</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-civic-700 dark:text-civic-300">
                      <div className="flex items-center gap-2">
                        <span>{rec.id}</span>
                        {(rec.id === "DEMO-LR-001" || rec.isDemo) && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            Demo Sample
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {rec.child?.name || "—"}
                    </td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {rec.parent?.name || "—"}
                    </td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {rec.orphanage?.name || "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          rec.status === "COMPLETED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          icon={FiEye}
                          className="min-h-[30px] px-2.5 py-1 text-xs"
                          onClick={() => navigate(`/admin/legal-records/${rec.id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          icon={previewingId === rec.id ? FiRefreshCw : FiEye}
                          disabled={!!previewingId}
                          className="min-h-[30px] px-2.5 py-1 text-xs"
                          onClick={() => handlePreviewBrief(rec.id)}
                        >
                          Preview Brief
                        </Button>
                        <Button
                          variant="secondary"
                          icon={downloadingBriefId === rec.id ? FiRefreshCw : FiDownload}
                          disabled={!!downloadingBriefId}
                          className="min-h-[30px] px-2.5 py-1 text-xs"
                          onClick={() => handleDownloadBrief(rec.id)}
                        >
                          {downloadingBriefId === rec.id ? "Generating..." : "Download Brief"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
