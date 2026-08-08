import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiFilter,
  FiLoader,
  FiMessageSquare,
  FiRefreshCw,
  FiShield,
  FiSlash,
  FiUser,
  FiUsers,
  FiX,
  FiSearch,
  FiPlay,
  FiActivity,
  FiChevronRight,
  FiHome,
  FiMapPin,
  FiPlus,
  FiArrowUpRight,
  FiArrowDownRight,
} from "react-icons/fi";
import { RiQrCodeLine } from "react-icons/ri";
import Breadcrumb from "../components/Breadcrumb";
import { PageSkeleton } from "../components/Loader";
import Button from "../components/Button";
import Card from "../components/Card";
import { classNames } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import ToastContainer from "../components/Toast";
import { visitRequestsService } from "../services/visitRequestsService";

// Helper Avatar generator
function avatarDataUri(initials, startColor, endColor) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="30" fill="url(#g)" />
      <circle cx="60" cy="52" r="24" fill="rgba(255,255,255,0.22)" />
      <path d="M26 100c5-18 19-28 34-28s29 10 34 28" fill="rgba(255,255,255,0.22)" />
      <text x="60" y="69" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="white">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(baseDate, offset) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offset);
  return localIsoDate(date);
}

function formatDisplayDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short"
  });
}

function formatClockTime(value) {
  if (!value || value === "-" || value === "--" || value.includes("AM") || value.includes("PM")) {
    return value;
  }

  const [hoursPart, minutesPart] = value.split(":");
  const hours = Number(hoursPart);
  const minutes = minutesPart || "00";

  if (Number.isNaN(hours)) {
    return value;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;

  return `${normalizedHours}:${minutes} ${suffix}`;
}

function formatTimer(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const seconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getMonthGrid(baseDate, visits) {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const padding = monthStart.getDay();
  const cells = [];
  const safeVisits = Array.isArray(visits) ? visits : [];
  const eventMap = safeVisits.reduce((map, visit) => {
    if (!map[visit.visitDate]) {
      map[visit.visitDate] = [];
    }
    map[visit.visitDate].push(visit);
    return map;
  }, {});

  for (let index = 0; index < padding; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), day);
    const isoDate = localIsoDate(date);

    cells.push({
      iso: isoDate,
      day,
      events: eventMap[isoDate] || []
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function statusTone(status) {
  const map = {
    Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
    Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
    Completed: "bg-civic-100 text-civic-700 dark:bg-civic-500/15 dark:text-civic-100",
    Rescheduled: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-100"
  };

  return map[status] || map.Pending;
}

function riskTone(risk) {
  const map = {
    Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    Medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
    High: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
  };

  return map[risk] || map.Low;
}

const arrivalTone = {
  CheckedIn: "bg-emerald-600",
  Checked_Out: "bg-slate-600",
  Pending: "bg-amber-500",
  Delayed: "bg-rose-600",
};

const priorityTone = {
  LOW: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300",
  HIGH: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300",
  High: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300",
};

function ModalShell({ open, title, subtitle, onClose, children, widthClass = "max-w-5xl" }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={classNames("glass-panel max-h-[92vh] w-full overflow-y-auto rounded-3xl", widthClass)}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/50 px-6 py-5 dark:border-white/10">
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
              </div>
              <Button variant="ghost" icon={FiX} onClick={onClose} aria-label="Close modal" className="px-3" />
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SectionTitle({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-civic-600 dark:text-civic-100">{eyebrow}</p>
        <h3 className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function LabelValue({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/55">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function RequestStatusCard({ label, value, trend, icon: Icon, tone, accent }) {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70"
      whileHover={{ y: -3 }}
    >
      <div className={classNames("absolute inset-x-0 top-0 h-1.5", accent)} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</h3>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            {trend.startsWith("+") ? <FiArrowUpRight className="h-4 w-4 text-safety" /> : <FiArrowDownRight className="h-4 w-4 text-alert" />}
            <span>{trend} this week</span>
          </div>
        </div>
        <div className={classNames("rounded-2xl p-3", tone)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-civic-500 focus:ring-2 focus:ring-civic-500/20 dark:border-slate-800 dark:bg-slate-950/80 dark:text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-civic-500 focus:ring-2 focus:ring-civic-500/20 dark:border-slate-800 dark:bg-slate-950/80 dark:text-white"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-civic-500 focus:ring-2 focus:ring-civic-500/20 dark:border-slate-800 dark:bg-slate-950/80 dark:text-white"
      />
    </label>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={classNames(
          "relative h-7 w-12 rounded-full transition",
          checked ? "bg-civic-600" : "bg-slate-300 dark:bg-slate-700"
        )}
        aria-pressed={checked}
      >
        <span
          className={classNames(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-6" : "left-1"
          )}
        />
      </button>
    </label>
  );
}

function ActionButton({ children, variant = "secondary", ...props }) {
  return (
    <Button variant={variant} className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide" {...props}>
      {children}
    </Button>
  );
}

export default function ManageVisitRequests() {
  const { user } = useAuth();
  const { toasts, success: showSuccess, error: showError, removeToast } = useToast();

  const todayIso = localIsoDate(new Date());

  const [requests, setRequests] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [staffFilter, setStaffFilter] = useState("All");
  const [roomFilter, setRoomFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // Drawer & Modal States
  const [activeRequest, setActiveRequest] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'qr' | 'report' | 'calendar' | 'reschedule'
  const [visitTimerSeconds, setVisitTimerSeconds] = useState(1455); // 24m 15s mock timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveForm, setApproveForm] = useState({
    visitDate: todayIso,
    visitTime: "10:00",
    meetingRoom: "Room A",
    staffMember: "Unassigned",
    visitorLimit: "10",
    instructions: "",
    generateQr: true,
    notifyParent: true,
  });
  const [rejectForm, setRejectForm] = useState({
    reason: "Incomplete Documents",
    comments: "",
  });
  const [rescheduleForm, setRescheduleForm] = useState({
    newDate: shiftDate(todayIso, 2),
    newTime: "11:00",
    reason: "Staff availability",
    notifyParent: true,
  });
  const [documentsForm, setDocumentsForm] = useState({
    aadhaar: true,
    pan: true,
    incomeCertificate: true,
    marriageCertificate: false,
    addressProof: false,
    note: "Please submit the marked documents before the next slot can be confirmed.",
  });

  // Post-Visit Report Form State
  const [postReport, setPostReport] = useState({
    parentBehaviour: "Exemplary",
    childComfort: "High",
    childEmotion: "Happy & Calm",
    meetingOutcome: "Successful - Approved for Adoption Step",
    recommendation: "Approved for Next Visit",
    followUpRequired: false,
    staffNotes: "Parent demonstrated great affection and caregiving readiness during the session.",
  });

  useEffect(() => {
    loadPageData();
    loadTodayVisits();
  }, []);

  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setVisitTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const loadPageData = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'All') params.status = statusFilter.toUpperCase();
      if (priorityFilter !== 'All') params.riskLevel = priorityFilter.toUpperCase();
      if (dateFilter) params.visitDate = dateFilter;

      const response = await visitRequestsService.getAll(params);
      setRequests(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      showError(err.message || "Failed to load visit requests");
    } finally {
      setLoading(false);
    }
  };

  const loadTodayVisits = async () => {
    try {
      const visits = await visitRequestsService.getTodayVisits();
      setTodayVisits(visits || []);
    } catch (err) {
      console.error('Error loading today visits:', err);
    }
  };

  const filteredRequests = requests;

  const counts = {
    pending: requests.filter((request) => request.status === "PENDING").length,
    today: todayVisits.length,
    approved: requests.filter((request) => request.status === "APPROVED").length,
    rejected: requests.filter((request) => request.status === "REJECTED").length,
    completed: requests.filter((request) => request.status === "COMPLETED").length,
    highRisk: requests.filter((request) => request.riskLevel === "HIGH").length
  };

  const riskData = {
    labels: ["Low", "Medium", "High"],
    datasets: [
      {
        data: [
          requests.filter((request) => request.riskLevel === "LOW").length,
          requests.filter((request) => request.riskLevel === "MEDIUM").length,
          requests.filter((request) => request.riskLevel === "HIGH").length
        ],
        backgroundColor: ["#0f9f6e", "#f59e0b", "#dc2626"],
        borderWidth: 0
      }
    ]
  };

  const visitTrendData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Visits Reviewed",
        data: [12, 15, 17, 14, 21, 19, 24],
        borderColor: "#1c74d8",
        backgroundColor: "rgba(28, 116, 216, 0.14)",
        tension: 0.38,
        fill: true
      },
      {
        label: "Approved",
        data: [8, 10, 13, 11, 16, 15, 19],
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124, 58, 237, 0.12)",
        tension: 0.38,
        fill: true
      }
    ]
  };

  const today = new Date();
  const monthGrid = getMonthGrid(today, requests);
  const activeSelection =
    (activeRequest && requests.find((request) => request.id === activeRequest.id)) ||
    activeRequest ||
    selectedRequest;
  const activeVisit = activeRequest || activeSelection;
  const kpi = {
    pending: counts.pending,
    today: todayVisits.length,
    ongoing: 0,
    waitingCheckins: 0,
    completedToday: counts.completed,
    highPriority: counts.highRisk,
    availableStaff: 6,
    avgDuration: "45m",
  };

  const openDetails = (request) => {
    setActiveRequest(request);
    setActiveModal("details");
  };

  const openApprove = (request = selectedRequest) => {
    setActiveRequest(request);
    setApproveForm({
      visitDate: request.visitDate,
      visitTime: request.visitTime,
      meetingRoom: request.meetingRoom,
      staffMember: request.assignedStaff,
      visitorLimit: String(request.visitorsCount),
      instructions: request.specialNotes,
      generateQr: true,
      notifyParent: true
    });
    setActiveModal("approve");
  };

  const openReject = (request = selectedRequest) => {
    setActiveRequest(request);
    setRejectForm({
      reason: request.risk === "High" ? "High Risk" : "Incomplete Documents",
      comments: ""
    });
    setActiveModal("reject");
  };

  const openReschedule = (request = selectedRequest) => {
    setActiveRequest(request);
    setRescheduleForm({
      newDate: shiftDate(todayIso, 2),
      newTime: "11:00",
      reason: "Staff availability",
      notifyParent: true
    });
    setActiveModal("reschedule");
  };

  const openDocuments = (request = selectedRequest) => {
    setActiveRequest(request);
    setDocumentsForm({
      aadhaar: true,
      pan: true,
      incomeCertificate: true,
      marriageCertificate: false,
      addressProof: false,
      note: "Please submit the marked documents before the next slot can be confirmed."
    });
    setActiveModal("documents");
  };

  const updateRequest = (requestId, patch) => {
    setRequests((current) =>
      current.map((request) =>
        request.requestId === requestId
          ? {
              ...request,
              ...patch
            }
          : request
      )
    );
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await visitRequestsService.approve(selectedRequest.id, {
        visitDate: approveForm.visitDate,
        visitTime: approveForm.visitTime,
        meetingRoom: approveForm.meetingRoom,
        assignedStaff: approveForm.staffMember,
        visitorsLimit: parseInt(approveForm.visitorLimit, 10),
        instructions: approveForm.instructions,
        generateQrPass: approveForm.generateQr,
        notifyParent: approveForm.notifyParent,
      });
      
      showSuccess('Visit request approved successfully');
      setActiveModal(null);
      loadPageData();
      loadTodayVisits();
    } catch (err) {
      showError(err.message || 'Failed to approve visit request');
      console.error('Error approving request:', err);
    }
  };

  const handleStartVisit = () => {
    setTimerRunning(true);
    showSuccess(`Visit started for ${activeVisit?.parentName || 'Parent'}. Live timer running.`);
  };

  const handleCompleteVisit = () => {
    setTimerRunning(false);
    setActiveModal("report");
  };

  const handleSaveReport = () => {
    showSuccess("Post-Visit Report Saved & Logged Successfully!");
    setActiveModal(null);
  };

  if (loading && requests.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="relative space-y-8 overflow-hidden pb-12">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header & Title Banner */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:p-8 border border-white/10"
      >
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-3.5 py-1.5 text-xs font-bold text-blue-200 border border-blue-400/30 backdrop-blur-md">
              <FiShield className="h-4 w-4 text-blue-300" />
              Government Child Protection Safety Operations Center
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl tracking-tight">
              Orphanage Visit Request & Safety Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-blue-100/80 leading-relaxed">
              Real-time monitoring of parent visits, live check-ins, security QR verification, caretaker scheduling, and post-visit child comfort reporting.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              icon={RiQrCodeLine}
              onClick={() => setActiveModal("qr")}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 shadow-lg"
            >
              Scan QR Gate Pass
            </Button>
            <Button
              icon={FiCalendar}
              variant="secondary"
              onClick={() => setActiveModal("calendar")}
              className="rounded-xl px-5 py-3 font-extrabold"
            >
              Monthly Calendar
            </Button>
          </div>
        </div>
      </motion.header>

      {/* 8 Enhanced Dashboard KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Pending Approvals" value={kpi.pending} subtitle="Requires staff review" icon={FiClock} color="amber" />
        <KpiCard title="Today's Visits" value={kpi.today} subtitle="Scheduled for today" icon={FiCalendar} color="blue" />
        <KpiCard title="Ongoing Visits" value={kpi.ongoing} subtitle="Active in meeting rooms" icon={FiActivity} color="emerald" />
        <KpiCard title="Waiting Check-ins" value={kpi.waitingCheckins} subtitle="Parents in reception" icon={FiUsers} color="purple" />
        <KpiCard title="Completed Today" value={kpi.completedToday} subtitle="Successful sessions" icon={FiCheckCircle} color="indigo" />
        <KpiCard title="High Priority" value={kpi.highPriority} subtitle="Expedited review" icon={FiAlertCircle} color="rose" />
        <KpiCard title="Available Staff" value={kpi.availableStaff} subtitle="Active caretakers" icon={FiUser} color="teal" />
        <KpiCard title="Avg Visit Duration" value={kpi.avgDuration} subtitle="Standard 45 mins" icon={FiClock} color="sky" />
      </div>

      {/* Top Operations Panel: Live Today's Schedule & Live Check-in Control Console */}
      <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
        {/* 1. Live Today's Schedule */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                <FiCalendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Today's Live Visit Schedule
                </h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Chronological timeline of approved visits today
                </p>
              </div>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              4 Visits Scheduled
            </span>
          </div>

          <div className="space-y-4">
            {todayVisits.map((visit, idx) => (
              <div
                key={visit.id || idx}
                onClick={() => setSelectedRequest(visit)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 transition hover:border-blue-300 hover:shadow-md cursor-pointer dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <img src={visit.parentPhoto || avatarDataUri("PR", "#2563eb", "#4f46e5")} alt={visit.parentName} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {visit.parentName}
                    </h4>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Child: {visit.childName || "Rahul Sharma"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                      <FiClock className="h-3.5 w-3.5 text-blue-500" />
                      {visit.visitTime || "10:30 AM"}
                    </p>
                    <p className="text-[11px] text-slate-400">{visit.meetingRoom || "Room R-102"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-slate-400">Assigned Staff</p>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">{visit.assignedStaff || "Meera Nair"}</p>
                  </div>
                  <span className={classNames("rounded-full px-3 py-1 text-[11px] font-extrabold border", arrivalTone[visit.arrivalStatus] || "bg-blue-500 text-white")}>
                    {visit.arrivalStatus || "Checked In"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 2. Live Check-in Control Console */}
        <Card className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
              <FiActivity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Live Check-in Console</h2>
              <p className="text-xs font-medium text-blue-200/70">Real-time visit session monitor</p>
            </div>
          </div>
          <div className="space-y-4">
            {/* Live Visit Session Timer */}
            <div className="rounded-2xl bg-black/30 p-4 text-center border border-white/10">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-300">Live Session Elapsed Time</span>
              <p className="text-3xl font-black text-emerald-400 tracking-wider my-1 font-mono">{formatTimer(visitTimerSeconds)}</p>
              <p className="text-[11px] text-blue-200/70">Standard duration 45:00 minutes</p>
            </div>

            {/* Control Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleStartVisit}
                disabled={timerRunning}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-xs font-extrabold text-white shadow-lg transition disabled:opacity-50"
              >
                <FiPlay className="h-4 w-4" />
                Start Visit
              </button>
              <button
                onClick={handleCompleteVisit}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-xs font-extrabold text-white shadow-lg transition"
              >
                <FiCheckCircle className="h-4 w-4" />
                Complete Visit
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Smart Filters Bar */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FiFilter className="h-5 w-5 text-blue-600" />
            Smart Operations Filter Bar
          </h3>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("All");
              setPriorityFilter("All");
              setStaffFilter("All");
              setRoomFilter("All");
              setDateFilter("");
            }}
            className="text-xs font-extrabold text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Parent / Child / ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            <option value="All">Status: All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="In_Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            <option value="All">Priority: All</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            <option value="All">Staff: All</option>
            <option value="Meera Nair">Meera Nair</option>
            <option value="Ramesh Kumar">Ramesh Kumar</option>
          </select>

          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            <option value="All">Room: All</option>
            <option value="Room R-102">Room R-102</option>
            <option value="Conference Room B">Conference Room B</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </Card>

      {/* 4. Visit Queue Table */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Visit Queue & Master Operations Table
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredRequests.length} verified visit request records
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  {[
                    "Parent Photo",
                    "Parent Name",
                    "Child Name",
                    "Visit ID",
                    "Date & Time Slot",
                    "Verification",
                    "Assigned Staff",
                    "Room",
                    "Arrival Status",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3.5 text-left font-extrabold text-slate-500 uppercase tracking-wider">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/80 dark:divide-slate-800 dark:bg-slate-950/40">
                {filteredRequests.map((req) => (
                  <tr key={req.id || req.visitId} className="transition hover:bg-blue-50/40 dark:hover:bg-slate-900/60">
                    <td className="px-4 py-3.5">
                      <img src={req.parentPhoto} alt={req.parentName} className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 object-cover shadow-sm" />
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900 dark:text-white">
                      {req.parentName}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-blue-600 dark:text-blue-400">
                      {req.childName}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-600 dark:text-slate-300">
                      {req.visitId}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                      <p className="font-extrabold">{new Date(req.visitDate).toLocaleDateString()}</p>
                      <p className="text-[11px] text-slate-400">{req.timeSlot}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        {req.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {req.assignedStaff}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {req.meetingRoom}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={classNames("rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white", arrivalTone[req.arrivalStatus] || "bg-blue-500")}>
                        {req.arrivalStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={classNames("rounded-full px-2.5 py-1 text-[11px] font-extrabold border", statusTone[req.status] || statusTone.PENDING)}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 transition"
                      >
                        <FiEye className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* 5. Bottom Operations Row: Recent Activity Feed & Interactive Monthly Calendar */}
      <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
        {/* Recent Activity Feed */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 backdrop-blur-md">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <FiActivity className="h-5 w-5 text-blue-600" />
            Live Operations Recent Activity Feed
          </h3>
          <div className="space-y-3.5">
            {requests.slice(0, 5).map((req, i) => (
              <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <img src={req.parentPhoto} alt={req.parentName} className="h-10 w-10 rounded-xl object-cover" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {req.parentName} requested visit for <span className="text-blue-600 dark:text-blue-400">{req.childName}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">10 mins ago • Purpose: {req.purpose}</p>
                  </div>
                </div>
                <span className={classNames("rounded-full px-2.5 py-1 text-[10px] font-extrabold border", priorityTone[req.priority] || priorityTone.LOW)}>
                  {req.priority} PRIORITY
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Calendar Card */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 backdrop-blur-md">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <FiCalendar className="h-5 w-5 text-blue-600" />
            Interactive Visit Calendar
          </h3>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center">
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">August 2026 Scheduled Visits</p>
            <div className="grid grid-cols-7 gap-1 mt-3 text-[11px] font-bold text-slate-400">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mt-2">
              {Array.from({ length: 31 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveModal("calendar")}
                  className={classNames(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition",
                    i === 4 ? "bg-blue-600 text-white shadow-md" : i % 5 === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20" : "bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Right-side Detail Drawer / Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="h-full w-full max-w-2xl bg-white p-6 shadow-2xl overflow-y-auto dark:bg-slate-950 dark:text-white space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Visit Request Details
                  </h3>
                  <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    ID: {selectedRequest.visitId}
                  </p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              {/* Lifecycle Timeline */}
              <VisitLifecycleTimeline status={selectedRequest.status} />

              {/* Parent & Child Profile Header */}
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <img src={selectedRequest.parentPhoto} alt={selectedRequest.parentName} className="h-16 w-16 rounded-2xl object-cover shadow-sm" />
                <div>
                  <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedRequest.parentName}</h4>
                  <p className="text-xs font-semibold text-slate-500">Visiting Child: <span className="text-blue-600 font-extrabold">{selectedRequest.childName}</span></p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-extrabold text-emerald-700">
                    <FiCheckCircle className="h-3.5 w-3.5" /> Identity Verified
                  </span>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Verified Uploaded Documents</h4>
                <div className="grid gap-2 sm:grid-cols-2 text-xs font-bold">
                  <div className="rounded-xl border border-slate-200 p-3 flex justify-between items-center dark:border-slate-800">
                    <span>Aadhaar Card Photo ID</span>
                    <span className="text-emerald-600 font-extrabold">Verified</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3 flex justify-between items-center dark:border-slate-800">
                    <span>Income Certificate</span>
                    <span className="text-emerald-600 font-extrabold">Verified</span>
                  </div>
                </div>
              </div>

              {/* Schedule Controls */}
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Schedule Controls</h4>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Assigned Caretaker</label>
                    <input type="text" defaultValue={selectedRequest.assignedStaff} className="w-full rounded-xl border p-2.5 text-xs font-semibold dark:bg-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Meeting Room</label>
                    <input type="text" defaultValue={selectedRequest.meetingRoom} className="w-full rounded-xl border p-2.5 text-xs font-semibold dark:bg-slate-900" />
                  </div>
                </div>
              </div>

              {/* Drawer Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    showSuccess("Visit Request Approved & QR Pass Generated!");
                    setSelectedRequest(null);
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 text-xs shadow-md"
                >
                  Approve & Generate Pass
                </button>
                <button
                  onClick={() => {
                    showSuccess("Visit Request Rejected.");
                    setSelectedRequest(null);
                  }}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 text-xs shadow-md"
                >
                  Reject Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Scanner & Pass Modal */}
      {activeModal === "qr" && (
        <QrPassModal onClose={() => setActiveModal(null)} onSimulateScan={() => {
          showSuccess("QR Scan Verified! Arrival Status updated to CHECKED IN.");
          setActiveModal(null);
        }} />
      )}

      {/* Post-Visit Report Modal */}
      {activeModal === "report" && (
        <PostVisitReportModal
          postReport={postReport}
          setPostReport={setPostReport}
          onClose={() => setActiveModal(null)}
          onSave={handleSaveReport}
        />
      )}

      {/* Calendar Modal */}
      {activeModal === "calendar" && (
        <CalendarModal onClose={() => setActiveModal(null)} todayVisits={todayVisits} />
      )}
    </div>
  );
}

/* ==========================================================================
   HELPER SUB-COMPONENTS
   ========================================================================== */

function KpiCard({ title, value, subtitle, icon: Icon, color }) {
  const colorMap = {
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
    teal: "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300",
    sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
  };

  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{title}</span>
        <div className={classNames("flex h-9 w-9 items-center justify-center rounded-xl", colorMap[color] || colorMap.blue)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-slate-400">{subtitle}</p>
    </Card>
  );
}

function VisitLifecycleTimeline({ status }) {
  const steps = [
    "Submitted",
    "Verified",
    "Approved",
    "Scheduled",
    "Checked In",
    "Started",
    "Completed",
    "Reported",
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Visit Lifecycle Progress</span>
      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={classNames("h-3 w-3 rounded-full border-2", i <= 4 ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300")} />
            <span className="hidden sm:inline">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QrPassModal({ onClose, onSimulateScan }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-950 dark:text-white space-y-4">
        <h3 className="text-lg font-extrabold">QR Gate Pass Check-in</h3>
        <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50 p-4 dark:bg-blue-950/30">
          <RiQrCodeLine className="h-32 w-32 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-xs text-slate-500">Scan QR code at reception to instantly update parent arrival status.</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onSimulateScan} className="rounded-xl bg-blue-600 text-white font-extrabold py-2.5 text-xs">Simulate Scan</button>
          <button onClick={onClose} className="rounded-xl bg-slate-100 dark:bg-slate-800 font-extrabold py-2.5 text-xs">Close</button>
        </div>
      </div>
    </div>
  );
}

function PostVisitReportModal({ postReport, setPostReport, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-950 dark:text-white space-y-4">
        <h3 className="text-lg font-extrabold flex items-center gap-2">
          <FiFileText className="text-blue-600" /> Post Visit Caretaker Report
        </h3>
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-500 mb-1">Parent Behaviour</label>
            <select value={postReport.parentBehaviour} onChange={(e) => setPostReport({...postReport, parentBehaviour: e.target.value})} className="w-full rounded-xl border p-2.5 font-semibold dark:bg-slate-900">
              <option>Exemplary</option>
              <option>Normal</option>
              <option>Confrontational</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-500 mb-1">Child Emotional Response</label>
            <select value={postReport.childEmotion} onChange={(e) => setPostReport({...postReport, childEmotion: e.target.value})} className="w-full rounded-xl border p-2.5 font-semibold dark:bg-slate-900">
              <option>Happy & Calm</option>
              <option>Neutral</option>
              <option>Anxious</option>
              <option>Distressed</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-500 mb-1">Staff Notes & Observations</label>
            <textarea rows={3} value={postReport.staffNotes} onChange={(e) => setPostReport({...postReport, staffNotes: e.target.value})} className="w-full rounded-xl border p-2.5 font-semibold dark:bg-slate-900" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={onSave} className="rounded-xl bg-blue-600 text-white font-extrabold py-3 text-xs">Save Report</button>
          <button onClick={onClose} className="rounded-xl bg-slate-100 dark:bg-slate-800 font-extrabold py-3 text-xs">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function CalendarModal({ onClose, todayVisits }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-950 dark:text-white space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold">August 2026 Scheduled Visits</h3>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100"><FiX /></button>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {todayVisits.map((v, i) => (
            <div key={i} className="flex justify-between items-center rounded-xl border p-3 text-xs font-bold">
              <div>
                <p className="text-slate-900 dark:text-white">{v.parentName} ({v.childName})</p>
                <p className="text-slate-400">{v.meetingRoom} • {v.assignedStaff}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Approved</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
