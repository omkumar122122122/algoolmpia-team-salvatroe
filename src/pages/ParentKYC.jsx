import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiShield, FiUser, FiCalendar, FiCheckCircle, FiAlertCircle,
  FiClock, FiUpload, FiDownload, FiEye, FiFileText,
  FiX, FiCheck, FiChevronDown, FiChevronUp, FiRefreshCw,
  FiLock, FiInfo, FiAlertTriangle, FiUserCheck
} from "react-icons/fi";
import Breadcrumb from "../components/Breadcrumb";
import { PageSkeleton } from "../components/Loader";
import Button from "../components/Button";
import { classNames } from "../utils/formatters";
import { parentsService } from "../services/parentsService";
import { useAuth } from "../context/AuthContext";

/* ── Helpers ─────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

/* ── Status badge config ─────────────────────────────────── */
const statusCfg = {
  Verified:             { badge: "badge-success", icon: FiCheckCircle, label: "Verified" },
  Approved:             { badge: "badge-success", icon: FiCheckCircle, label: "Approved" },
  APPROVED:             { badge: "badge-success", icon: FiCheckCircle, label: "Approved (One-Time Verified)" },
  Submitted:            { badge: "badge-blue",    icon: FiFileText,    label: "Submitted" },
  SUBMITTED:            { badge: "badge-blue",    icon: FiFileText,    label: "Submitted (Under Review)" },
  "Under Review":       { badge: "badge-blue",    icon: FiClock,       label: "Under Review" },
  UNDER_REVIEW:         { badge: "badge-blue",    icon: FiClock,       label: "Under Review" },
  Pending:              { badge: "badge-warning", icon: FiClock,       label: "Draft / Pending" },
  PENDING:              { badge: "badge-warning", icon: FiClock,       label: "Draft / Pending" },
  "Re-upload Required": { badge: "badge-warning", icon: FiAlertTriangle, label: "Re-upload Required" },
  RE_UPLOAD_REQUIRED:   { badge: "badge-warning", icon: FiAlertTriangle, label: "Re-upload Required" },
  Compliant:            { badge: "badge-success", icon: FiCheckCircle, label: "Compliant" },
  REJECTED:             { badge: "badge-danger",  icon: FiX,           label: "Rejected" },
  Rejected:             { badge: "badge-danger",  icon: FiX,           label: "Rejected" },
};

function StatusBadge({ status }) {
  const cfg = statusCfg[status] ?? statusCfg["Pending"];
  const Icon = cfg.icon;
  return (
    <span className={classNames("badge gap-1.5 px-3 py-1 text-xs font-bold", cfg.badge)}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label || status}
    </span>
  );
}

/* ── Shared field-block display ──────────────────────────── */
function InfoField({ label, value, accent = false, icon: Icon }) {
  return (
    <div className="field-block min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={classNames(
        "text-sm font-bold text-slate-900 dark:text-white truncate",
        accent ? "text-civic-700 dark:text-civic-400" : ""
      )} title={String(value || "—")}>
        {value || "—"}
      </p>
    </div>
  );
}

/* ── Section wrapper (card with header) ─────────────────── */
function Section({ title, icon: Icon, iconBg = "bg-civic-50 text-civic-600 dark:bg-civic-500/10 dark:text-civic-400", action, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={classNames("flex h-8 w-8 items-center justify-center rounded-xl", iconBg)}>
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE: ParentKYC
 ═══════════════════════════════════════════════════════════ */
export default function ParentKYC() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Modal state */
  const [kycOpen, setKycOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [requestUpdateOpen, setRequestUpdateOpen] = useState(false);

  useEffect(() => {
    loadKycStatus();
  }, []);

  async function loadKycStatus() {
    setLoading(true);
    try {
      const data = await parentsService.getKycStatus();
      setKyc(data);
    } catch (err) {
      setError(err?.message || "Failed to load KYC status");
    } finally {
      setLoading(false);
    }
  }

  async function handleKycSubmit(notes) {
    try {
      await parentsService.submitKyc(notes);
      await loadKycStatus();
      setKycOpen(false);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleFileUpload(type, file, docNumber) {
    try {
      await parentsService.uploadDocument(kyc.parentId, type, file, docNumber);
      await loadKycStatus();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRequestUpdateSubmit(reason) {
    try {
      await parentsService.requestDocumentUpdate(reason);
      alert('Document update request submitted successfully for administrator review.');
      setRequestUpdateOpen(false);
      await loadKycStatus();
    } catch (err) {
      alert(err?.message || 'Failed to submit document update request');
    }
  }

  function handleAcknowledgementDownload() {
    if (!kyc?.documents || kyc.documents.length === 0) {
      alert('No uploaded KYC documents found.');
      return;
    }
    setDocsOpen(true);
  }

  if (loading) return <PageSkeleton />;

  if (error) return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-700">
      <FiAlertCircle className="mx-auto mb-3 h-12 w-12" />
      <h2 className="text-lg font-bold">Error Loading KYC</h2>
      <p className="mt-1">{error}</p>
      <Button className="mt-4" onClick={loadKycStatus}>Retry</Button>
    </div>
  );

  const isApproved = kyc.kycStatus === 'APPROVED';
  const canSubmit = kyc.kycStatus === 'PENDING' || kyc.kycStatus === 'RE_UPLOAD_REQUIRED';

  const summaryCards = [
    { label: "KYC Status", value: kyc.kycStatus, sub: isApproved ? "One-Time Complete" : "Verification Pending", accent: isApproved ? "border-l-green-500" : "border-l-amber-500", iconBg: "bg-green-50 text-green-600" },
    { label: "Compliance Status", value: kyc.complianceStatus, sub: isApproved ? "Compliant & Verified" : "Action Needed", accent: isApproved ? "border-l-emerald-500" : "border-l-amber-500", iconBg: "bg-emerald-50 text-emerald-600" },
    { label: "Submitted Date", value: formatDate(kyc.lastKycDate), sub: kyc.lastKycDate ? "Package Submitted" : "Not Submitted", accent: "border-l-indigo-500", iconBg: "bg-indigo-50 text-indigo-600" },
    { label: "Verified Date", value: formatDate(kyc.kycApprovedAt), sub: isApproved ? "Verification Granted" : "Pending Verification", accent: "border-l-violet-500", iconBg: "bg-violet-50 text-violet-600" },
    { label: "Trust Score", value: `${kyc.trustScore}/100`, sub: kyc.trustScore >= 70 ? "High Trust Rating" : "Standard Rating", accent: "border-l-blue-500", iconBg: "bg-blue-50 text-blue-600" },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={["Parent", "KYC Verification"]} />

      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-civic-50 text-civic-600 dark:bg-civic-500/10 dark:text-civic-400">
              <FiShield className="h-6 w-6" />
            </div>
            <div>
              <p className="section-eyebrow">Pre-Adoption Background Check</p>
              <h1 className="page-title">Identity Verification (KYC)</h1>
              <p className="page-subtitle">One-Time Identity &amp; Background Verification prior to adoption</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canSubmit && (
              <Button icon={FiRefreshCw} onClick={() => setKycOpen(true)}>Submit KYC Package</Button>
            )}
            {isApproved && (
              <Button icon={FiLock} variant="secondary" onClick={() => setRequestUpdateOpen(true)}>Request Document Update</Button>
            )}
            <Button icon={FiEye} variant="secondary" onClick={() => setDocsOpen(true)}>View Documents</Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card, i) => (
          <div key={i} className={classNames("rounded-2xl border border-gray-100 bg-white p-5 shadow-sm border-l-4 dark:bg-slate-900 dark:border-slate-800", card.accent)}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
                <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{card.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{card.sub}</p>
              </div>
              <div className={classNames("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", card.iconBg)}>
                <FiCheckCircle className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Identity Verification Main Card */}
          <IdentityVerificationCard kyc={kyc} onViewDocs={() => setDocsOpen(true)} onRequestUpdate={() => setRequestUpdateOpen(true)} />
          {/* Document Management Section */}
          <KycFormSection kyc={kyc} onUpload={handleFileUpload} />
          {/* History Section */}
          <VerificationHistory history={kyc.verificationHistory} />
        </div>

        {/* Right Sidebar: Status & Document Summary */}
        <div className="space-y-6">
          <IdentityStatusSummaryPanel kyc={kyc} onViewDocs={() => setDocsOpen(true)} />
        </div>
      </div>

      {/* Modals */}
      <SubmitKycModal open={kycOpen} onClose={() => setKycOpen(false)} onConfirm={handleKycSubmit} />
      <RequestUpdateModal open={requestUpdateOpen} onClose={() => setRequestUpdateOpen(false)} onConfirm={handleRequestUpdateSubmit} />
      <ViewDocsModal open={docsOpen} onClose={() => setDocsOpen(false)} docs={kyc.documents} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   COMPONENTS
 ═══════════════════════════════════════════════════════════ */

/* ── Identity Verification Card ─────────────────────────── */
function IdentityVerificationCard({ kyc, onViewDocs, onRequestUpdate }) {
  const isApproved = kyc.kycStatus === 'APPROVED';
  const docsSubmittedCount = kyc.documents?.length || 0;
  const docsRequiredCount = kyc.requiredDocuments?.length || 0;

  return (
    <Section
      title="Identity Verification"
      icon={FiShield}
      action={
        <Button icon={FiEye} variant="secondary" size="sm" onClick={onViewDocs}>
          View Documents
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Profile Avatar & Status Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-civic-600 text-xl font-bold text-white shadow-sm">
              {kyc.parentAvatar || 'P'}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{kyc.parentName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Parent ID: {kyc.parentId}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{kyc.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verification Status</span>
            <StatusBadge status={kyc.kycStatus} />
          </div>
        </div>

        {/* Required Verification Fields */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoField label="Identity Verification" value={isApproved ? "Verified One-Time" : "Pending Verification"} icon={FiShield} accent={isApproved} />
          <InfoField label="Status" value={kyc.kycStatus} icon={FiCheckCircle} />
          <InfoField label="Submitted Date" value={formatDate(kyc.lastKycDate)} icon={FiCalendar} />
          <InfoField label="Verified Date" value={formatDate(kyc.kycApprovedAt)} icon={FiUserCheck} />
          <InfoField label="Verified By" value={kyc.verifiedBy || (isApproved ? "Central Authority Admin" : "Pending Review")} icon={FiUser} />
          <InfoField label="Documents Submitted" value={`${docsSubmittedCount} of ${docsRequiredCount} Files`} icon={FiFileText} />
        </div>

        {/* Lock / Update Notice */}
        {isApproved ? (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50/70 p-4 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <FiLock className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">KYC Verification Completed</p>
              <p className="mt-0.5 opacity-90">Your identity and background verification is complete (One-Time Verification). Documents are locked for security. If you need to revise any document, submit a formal request.</p>
            </div>
            <Button size="sm" variant="secondary" icon={FiLock} onClick={onRequestUpdate}>Request Update</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 text-xs">
            <FiInfo className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p><span className="font-bold">Verification Pending:</span> Please upload all required identity documents and submit your KYC package for review.</p>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ── Document Management Section ─────────────────────────── */
function KycFormSection({ kyc, onUpload }) {
  const isApproved = kyc.kycStatus === 'APPROVED';
  const [selectedDoc, setSelectedDoc] = useState(kyc.missingDocuments?.[0] || "");
  const [file, setFile] = useState(null);
  const [docNum, setDocNum] = useState("");

  const handleUpload = () => {
    if (!selectedDoc || !file) return;
    onUpload(selectedDoc, file, docNum);
    setFile(null);
    setDocNum("");
  };

  return (
    <Section title="Documents Submitted" icon={FiUpload}>
      <div className="p-6 space-y-5">
        {/* Required Documents Pills */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Required Verification Documents</label>
          <div className="flex flex-wrap gap-2">
            {kyc.requiredDocuments?.map((d) => {
              const isMissing = kyc.missingDocuments?.includes(d);
              return (
                <span
                  key={d}
                  className={classNames(
                    "px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5",
                    isMissing
                      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                  )}
                >
                  {isMissing ? <FiClock className="h-3 w-3" /> : <FiCheckCircle className="h-3 w-3" />}
                  {d.replace(/_/g, ' ')}
                </span>
              );
            })}
          </div>
        </div>

        {/* Upload Interface (Disabled if Approved) */}
        {!isApproved ? (
          <div className="border-t border-gray-100 dark:border-slate-800 pt-4 space-y-3">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Upload / Re-upload Document</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <select
                value={selectedDoc}
                onChange={(e) => setSelectedDoc(e.target.value)}
                className="input-field w-full"
              >
                <option value="">Select Document Type</option>
                {kyc.requiredDocuments?.map((d) => (
                  <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Document Number (Optional)"
                className="input-field w-full"
                value={docNum}
                onChange={(e) => setDocNum(e.target.value)}
              />
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files[0])}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-civic-50 file:text-civic-700 hover:file:bg-civic-100 cursor-pointer"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleUpload} disabled={!file || !selectedDoc} icon={FiUpload}>
                Upload Document
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-100 dark:border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-semibold">
              <FiLock className="h-4 w-4 text-emerald-600" />
              Direct document upload disabled for verified accounts.
            </span>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ── Verification History ────────────────────────────────── */
function VerificationHistory({ history }) {
  return (
    <Section title="Verification History & Audit Log" icon={FiClock}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold text-xs">
            <tr>
              <th className="p-3.5">Document Type</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Date</th>
              <th className="p-3.5">Review Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {history?.map((h, i) => (
              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{h.type.replace(/_/g, ' ')}</td>
                <td className="p-3.5"><StatusBadge status={h.status} /></td>
                <td className="p-3.5 text-xs text-slate-500">{formatDate(h.date)}</td>
                <td className="p-3.5 text-xs text-slate-400">{h.notes || '—'}</td>
              </tr>
            ))}
            {(!history || history.length === 0) && (
              <tr><td colSpan="4" className="p-8 text-center text-slate-400">No verification activity logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ── Right Panel: Identity Status & Documents Summary ────── */
function IdentityStatusSummaryPanel({ kyc, onViewDocs }) {
  const isApproved = kyc.kycStatus === 'APPROVED';

  return (
    <div className="space-y-4">
      {/* Identity Verification Summary Box */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-civic-50 text-civic-600 dark:bg-civic-500/10 dark:text-civic-400">
            <FiShield className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Identity Verification Summary</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Identity Verification</span>
            <span className="font-bold text-slate-900 dark:text-white">{isApproved ? "Verified (One-Time)" : "Pending"}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Status</span>
            <StatusBadge status={kyc.kycStatus} />
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Submitted Date</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatDate(kyc.lastKycDate)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Verified Date</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatDate(kyc.kycApprovedAt)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Verified By</span>
            <span className="font-bold text-slate-900 dark:text-white">{kyc.verifiedBy || (isApproved ? "Authority Admin" : "—")}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Documents Submitted</span>
            <span className="font-bold text-slate-900 dark:text-white">{kyc.documents?.length || 0} / {kyc.requiredDocuments?.length || 0}</span>
          </div>
        </div>

        <Button fullWidth variant="secondary" icon={FiEye} onClick={onViewDocs}>
          View Documents
        </Button>
      </div>

      {/* Security Info Card */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-950 dark:text-blue-100">
          <FiInfo className="h-4 w-4 text-blue-600" />
          One-Time KYC Policy
        </div>
        <p className="leading-relaxed opacity-90">
          KYC verification is completed once prior to child adoption. After approval, documents are securely archived and locked against unauthorized edits.
        </p>
      </div>
    </div>
  );
}

/* ── Modals ──────────────────────────────────────────────── */
function SubmitKycModal({ open, onClose, onConfirm }) {
  const [notes, setNotes] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <h3 className="text-lg font-bold">Submit KYC Package</h3>
        <p className="text-sm text-slate-500">Submit your uploaded identity documents for administrator review.</p>
        <textarea
          className="input-field w-full h-24 resize-none"
          placeholder="Optional submission notes for the reviewer..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button fullWidth onClick={() => onConfirm(notes)}>Submit Package</Button>
        </div>
      </div>
    </div>
  );
}

function RequestUpdateModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <h3 className="text-lg font-bold">Request Document Update</h3>
        <p className="text-sm text-slate-500">Specify why you need to update or replace your verified identity documents.</p>
        <textarea
          className="input-field w-full h-24 resize-none"
          placeholder="Reason for update (e.g. Address changed, Passport renewed)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button fullWidth disabled={!reason.trim()} onClick={() => onConfirm(reason)}>Send Request</Button>
        </div>
      </div>
    </div>
  );
}

function ViewDocsModal({ open, onClose, docs }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 className="text-lg font-bold">Submitted Identity Documents</h3>
          <Button variant="ghost" icon={FiX} onClick={onClose} />
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {docs?.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <FiFileText className="h-5 w-5 text-civic-600" />
                <div>
                  <p className="text-sm font-bold">{doc.documentType.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-slate-400">{doc.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={doc.status} />
                {doc.storageUrl && (
                  <a
                    href={doc.storageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-slate-400 hover:text-civic-600 hover:bg-white dark:hover:bg-slate-800 transition"
                    title="View Document"
                  >
                    <FiDownload className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {(!docs || docs.length === 0) && (
            <p className="text-center py-10 text-slate-400 text-sm">No documents submitted yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
