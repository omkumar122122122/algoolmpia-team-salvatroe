import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome, FiUsers, FiShield, FiChevronRight, FiSearch, FiFilter,
  FiX, FiRotateCcw, FiAlertTriangle, FiCheckCircle, FiLayers, FiUser,
  FiActivity, FiFileText, FiCreditCard
} from "react-icons/fi";
import Breadcrumb from "../components/Breadcrumb";
import { PageSkeleton } from "../components/Loader";
import { orphanagesService } from "../services/orphanagesService";
import { percentage } from "../utils/formatters";
import heroBanner from "../assets/image copy.png";

function complianceColor(val) {
  if (val >= 90) return "text-green-600 dark:text-green-400";
  if (val >= 75) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function occupancyBar(occupancy, capacity) {
  const occ = Math.max(0, Number(occupancy) || 0);
  const cap = Math.max(0, Number(capacity) || 0);

  if (!cap || cap <= 0 || isNaN(occ) || isNaN(cap)) {
    return { pct: 0, color: "bg-slate-200 dark:bg-slate-700", text: "0%" };
  }

  const rawPct = (occ / cap) * 100;
  const pct = Math.min(100, Math.max(0, Math.round(rawPct)));

  let color = "bg-green-500";
  if (pct === 0) {
    color = "bg-slate-200 dark:bg-slate-700";
  } else if (pct >= 90) {
    color = "bg-red-500";
  } else if (pct >= 75) {
    color = "bg-amber-500";
  }

  return { pct, color, text: `${pct}%` };
}

function statusTone(status) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200";
    case "UNDER_REVIEW":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200";
    case "SUSPENDED":
    case "INACTIVE":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200";
  }
}

// Helper: Safely highlight search text matches without dangerouslySetInnerHTML
function HighlightText({ text, query }) {
  if (!text || !query || !query.trim()) return <>{text}</>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-amber-200/90 text-slate-900 dark:bg-amber-500/40 dark:text-amber-100 px-0.5 rounded font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function Orphanages() {
  const navigate = useNavigate();
  const [rawOrphanages, setRawOrphanages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter Controls State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [missingDataFilter, setMissingDataFilter] = useState("all"); // 'all' | 'complete' | 'missing'

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    loadOrphanages();
  }, []);

  async function loadOrphanages() {
    try {
      setLoading(true);
      setError(null);
      const result = await orphanagesService.getAll({ limit: 100 });
      const records = Array.isArray(result) ? result : (result?.data || []);
      setRawOrphanages(records);
    } catch (err) {
      console.error("Failed to load orphanages:", err);
      setError(err.message || "Failed to load orphanages");
    } finally {
      setLoading(false);
    }
  }

  // Derive missing data status & owner info dynamically per record
  const processedOrphanages = useMemo(() => {
    return rawOrphanages.map((item) => {
      const missingFields = [];
      if (!item.governmentLicenseNumber) missingFields.push("Govt License");
      if (!item.bankName && !item.bankAccountNumber) missingFields.push("Bank Account");
      if (!item.emergencyContactPerson) missingFields.push("Emergency Contact");
      if (!item.panNumber && !item.gstNumber) missingFields.push("Tax Info (PAN/GST)");
      if (item.isVerified === false) missingFields.push("KYC Verification");

      const isComplete = missingFields.length === 0;

      const occ = Math.max(0, Number(item.occupancy ?? item.currentOccupancy ?? item.numberOfChildren) || 0);
      const cap = Math.max(0, Number(item.capacity ?? item.totalCapacity) || 0);

      const { pct, color, text: occupancyRateText } = occupancyBar(occ, cap);

      const facilitiesList = Array.isArray(item.facilities)
        ? item.facilities
        : typeof item.facilities === "string"
        ? [item.facilities]
        : [];

      return {
        ...item,
        occupancy: occ,
        capacity: cap,
        occupancyRate: occupancyRateText,
        pct,
        color,
        complianceRate: Math.max(0, Number(item.compliance ?? item.complianceScore) || 0),
        missingFields,
        isComplete,
        facilitiesList,
        ownerName: item.owner?.name || item.emergencyContactPerson || item.administrator?.name || "Unassigned",
      };
    });
  }, [rawOrphanages]);

  // Extract unique Owners / Agents list for dropdown
  const availableOwners = useMemo(() => {
    const set = new Set();
    processedOrphanages.forEach((item) => {
      if (item.ownerName && item.ownerName !== "Unassigned") {
        set.add(item.ownerName);
      }
    });
    return Array.from(set);
  }, [processedOrphanages]);

  // Combined client-side filtering logic
  const filteredOrphanages = useMemo(() => {
    return processedOrphanages.filter((item) => {
      // 1. Text Search Filter (Name, Code, Reg #, License #, City, State, Contact, Facilities)
      if (debouncedQuery.trim()) {
        const q = debouncedQuery.trim().toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(q);
        const codeMatch = item.code?.toLowerCase().includes(q);
        const regMatch = item.registrationNumber?.toLowerCase().includes(q);
        const licMatch = item.governmentLicenseNumber?.toLowerCase().includes(q);
        const cityMatch = item.city?.toLowerCase().includes(q);
        const stateMatch = item.state?.toLowerCase().includes(q);
        const emailMatch = item.officialEmail?.toLowerCase().includes(q);
        const ownerMatch = item.ownerName?.toLowerCase().includes(q);
        const facilityMatch = item.facilitiesList.some((f) => String(f).toLowerCase().includes(q));

        if (!(nameMatch || codeMatch || regMatch || licMatch || cityMatch || stateMatch || emailMatch || ownerMatch || facilityMatch)) {
          return false;
        }
      }

      // 2. Section Filter
      if (sectionFilter !== "all") {
        switch (sectionFilter) {
          case "organization":
            if (!item.name || !item.registrationNumber) return false;
            break;
          case "license":
            if (!item.governmentLicenseNumber) return false;
            break;
          case "contact":
            if (!item.phone && !item.officialEmail) return false;
            break;
          case "address":
            if (!item.city || !item.state) return false;
            break;
          case "bank":
            if (!item.bankName && !item.bankAccountNumber) return false;
            break;
          case "emergency":
            if (!item.emergencyContactPerson) return false;
            break;
          case "facilities":
            if (!item.facilitiesList || item.facilitiesList.length === 0) return false;
            break;
          default:
            break;
        }
      }

      // 3. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "verified_only") {
          if (!item.isVerified) return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }

      // 4. Owner / Agent Filter
      if (ownerFilter !== "all") {
        if (item.ownerName !== ownerFilter) return false;
      }

      // 5. Missing Data Filter
      if (missingDataFilter === "complete" && !item.isComplete) return false;
      if (missingDataFilter === "missing" && item.isComplete) return false;

      return true;
    });
  }, [processedOrphanages, debouncedQuery, sectionFilter, statusFilter, ownerFilter, missingDataFilter]);

  // Reset all filters action
  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setSectionFilter("all");
    setStatusFilter("all");
    setOwnerFilter("all");
    setMissingDataFilter("all");
  }, []);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    sectionFilter !== "all" ||
    statusFilter !== "all" ||
    ownerFilter !== "all" ||
    missingDataFilter !== "all";

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-bold">Error: {error}</p>
          <button
            onClick={loadOrphanages}
            className="mt-4 px-4 py-2 bg-civic-500 text-white rounded-xl hover:bg-civic-600 font-bold text-xs shadow-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={["Admin", "Orphanages"]} />

      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/85 p-6 shadow-card backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={heroBanner}
            alt="Page Header Background"
            className="h-full w-full object-cover object-right opacity-35 dark:opacity-25 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 dark:to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] dark:bg-blue-500/10 dark:text-blue-400">
              <FiHome className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A] dark:text-white font-display">
                Registered Orphanages
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-[#64748B] dark:text-slate-300 font-sans max-w-lg">
                Level-search generated profile content, section statuses, owners, and missing data flags.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total: </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-display">
                {filteredOrphanages.length} / {processedOrphanages.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Search & Operations Control Bar */}
      <div className="rounded-[20px] border border-slate-200/80 bg-white/90 p-5 shadow-card backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orphanage name, reg #, license #, city, owner, AI facilities..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
            >
              <FiRotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Section Filter */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <FiLayers className="h-3 w-3 text-blue-500" /> Profile Section
            </label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">All Sections</option>
              <option value="organization">Organization Details</option>
              <option value="license">Govt License & Registration</option>
              <option value="contact">Contact Information</option>
              <option value="address">Address & Location</option>
              <option value="facilities">Facilities & Tech Features</option>
              <option value="bank">Bank & Financial Details</option>
              <option value="emergency">Emergency Contacts</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <FiActivity className="h-3 w-3 text-emerald-500" /> Operational Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="verified_only">KYC VERIFIED ONLY</option>
            </select>
          </div>

          {/* Owner / Agent Filter */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <FiUser className="h-3 w-3 text-indigo-500" /> Owner / Contact Agent
            </label>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">All Owners / Agents</option>
              {availableOwners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>

          {/* Missing Data Segmented Selector */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <FiAlertTriangle className="h-3 w-3 text-amber-500" /> Profile Completion Data
            </label>
            <select
              value={missingDataFilter}
              onChange={(e) => setMissingDataFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">All Profiles</option>
              <option value="complete">Complete Profiles Only ✓</option>
              <option value="missing">Missing Required Data Only ⚠️</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredOrphanages.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-card dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
            <FiFilter className="h-6 w-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            No records found matching your filters.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Try adjusting your search keywords, section filters, or click reset to clear all criteria.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-civic-500 hover:bg-civic-600 px-4 py-2 text-xs font-extrabold text-white shadow-md transition"
          >
            <FiRotateCcw className="h-3.5 w-3.5" />
            Reset All Filters
          </button>
        </div>
      )}

      {/* Cards Grid */}
      {filteredOrphanages.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {filteredOrphanages.map((orphanage, i) => (
            <motion.div
              key={orphanage.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/admin/orphanages/${orphanage.id}`)}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Top Accent */}
              <div className="h-1 w-full bg-gradient-to-r from-civic-500 via-indigo-500 to-blue-500" />

              <div className="p-5 space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-civic-50 text-civic-600 dark:bg-civic-500/10 dark:text-civic-400 text-sm font-bold">
                      {orphanage.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <HighlightText text={orphanage.name} query={debouncedQuery} />
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <HighlightText text={orphanage.code} query={debouncedQuery} /> ·{" "}
                        <HighlightText text={orphanage.city} query={debouncedQuery} />
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${statusTone(orphanage.status)}`}>
                      {orphanage.status || "ACTIVE"}
                    </span>
                    <FiChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-civic-500 transition-colors dark:text-slate-600" />
                  </div>
                </div>

                {/* Missing Data Warning Badges */}
                {orphanage.missingFields.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {orphanage.missingFields.map((field, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200/80 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300">
                        <FiAlertTriangle className="h-3 w-3" /> Missing {field}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300">
                    <FiCheckCircle className="h-3 w-3" /> Complete Profile
                  </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="field-block text-center">
                    <div className="flex justify-center text-slate-400"><FiUsers className="h-3.5 w-3.5" /></div>
                    <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{orphanage.occupancy}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">of {orphanage.capacity}</p>
                  </div>
                  <div className="field-block text-center">
                    <div className="flex justify-center text-slate-400"><FiShield className="h-3.5 w-3.5" /></div>
                    <p className={`mt-1 text-base font-bold ${complianceColor(orphanage.complianceRate)}`}>{orphanage.complianceRate}%</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Compliance</p>
                  </div>
                  <div className="field-block text-center">
                    <div className="flex justify-center text-slate-400"><FiHome className="h-3.5 w-3.5" /></div>
                    <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{orphanage.pct}%</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Occupancy</p>
                  </div>
                </div>

                {/* Occupancy Progress Bar */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Occupancy Rate</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{orphanage.occupancyRate}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                    <div className={`h-full rounded-full transition-all ${orphanage.color}`} style={{ width: `${orphanage.pct}%` }} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Table View */}
      {filteredOrphanages.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">All Orphanages — Tabular View</h2>
            <span className="text-xs text-slate-500 font-medium">{filteredOrphanages.length} Records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="table-header">
                <tr>
                  {["Code", "Name", "City", "Owner / Agent", "Capacity", "Status", "Data Status", "Compliance"].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {filteredOrphanages.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/admin/orphanages/${row.id}`)}
                    className="table-row cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-850"
                  >
                    <td className="table-td font-medium text-civic-700 dark:text-civic-400">
                      <HighlightText text={row.code} query={debouncedQuery} />
                    </td>
                    <td className="table-td font-semibold text-slate-900 dark:text-white">
                      <HighlightText text={row.name} query={debouncedQuery} />
                    </td>
                    <td className="table-td">
                      <HighlightText text={row.city} query={debouncedQuery} />
                    </td>
                    <td className="table-td font-medium text-slate-700 dark:text-slate-300">
                      <HighlightText text={row.ownerName} query={debouncedQuery} />
                    </td>
                    <td className="table-td">{row.capacity}</td>
                    <td className="table-td">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${statusTone(row.status)}`}>
                        {row.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="table-td">
                      {row.isComplete ? (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <FiCheckCircle className="h-3 w-3" /> Complete
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <FiAlertTriangle className="h-3 w-3" /> {row.missingFields.length} Missing
                        </span>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={`text-sm font-bold ${complianceColor(row.complianceRate)}`}>{row.complianceRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
