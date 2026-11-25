
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHero from "@/components/layout/AdminPageHero";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "").replace(/\/$/, "");
const API_URL = `${API_ORIGIN}/api`;
const PAGE_SIZE = 5;

type Tab = "pending" | "approved" | "revision" | "rejected" | "all";

type Concert = {
  id: number;
  name: string;
  poster_url: string | null;
  start_date: string;
  end_date?: string;
  submitted_at?: string;
  created_at?: string;
  organizer_name: string;
  venue_name: string;
  category_name: string;
  approval_status: string;
  publication_status?: string;
  display_status?: string;
  status?: string;
  rejection_reason?: string;
};

const ICONS = {
  total: "/icons/clipboard (1).png",
  pending: "/icons/notification (3).png",
  approved: "/icons/check (1).png",
  revision: "/icons/draft.png",
  rejected: "/icons/close.png",
  calendar: "/icons/calendar (1).png",
  eye: "/icons/eye (1).png",
};

function PngIcon({ src, size = 18 }: { src: string; size?: number }) {
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} className="shrink-0 object-contain" />;
}

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

async function apiRequest<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session has expired. Please log in again.");
    if (response.status === 403) throw new Error("You do not have access to this page.");
    throw new Error(payload?.message || "Request failed.");
  }

  return payload as T;
}

function imageUrl(path?: string | null) {
  if (!path) return "";
  const value = path.trim();
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(concert: Concert): Tab {
  const status = String(concert.approval_status || "").toLowerCase();

  if (status === "approved") return "approved";
  if (status === "revision_required" || status === "revision") return "revision";
  if (status === "rejected") return "rejected";

  return "pending";
}

function getDisplayStatus(concert: Concert) {
  const rawStatus = String(
    concert.display_status ||
    concert.publication_status ||
    concert.status ||
    concert.approval_status ||
    ""
  ).toLowerCase().replace(/[_-]/g, " ");

  if (rawStatus.includes("reject")) return "Rejected";
  if (rawStatus.includes("complete") || rawStatus.includes("ended")) return "Completed";
  if (rawStatus.includes("publish")) return "Published";
  if (rawStatus.includes("cancel")) return "Cancelled";
  if (rawStatus.includes("draft")) return "Draft";
  if (rawStatus.includes("revision")) return "Revision";
  if (rawStatus.includes("pending")) return "Pending Review";
  if (rawStatus.includes("approved")) return "Approved";

  return "Pending Review";
}

function StatusBadge({ concert }: { concert: Concert }) {
  const status = getDisplayStatus(concert);

  const styles: Record<string, string> = {
    Published: "bg-[#103D32] text-[#35D5B2]",
    Completed: "bg-[#29324B] text-slate-300",
    Rejected: "bg-[#4A202D] text-[#FF8196]",
    Draft: "bg-[#49391B] text-[#F4C44E]",
    Cancelled: "bg-[#4A202D] text-[#FF8196]",
    "Pending Review": "bg-[#49391B] text-[#F4C44E]",
    Revision: "bg-[#49301A] text-[#F5A64A]",
    Approved: "bg-[#103D32] text-[#35D5B2]",
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${styles[status] || "bg-[#29324B] text-slate-300"}`}>
      {status}
    </span>
  );
}

function StatusFilterBadge({ status }: { status: Tab }) {
  const styles: Record<Tab, string> = {
    pending: "bg-[#49391B] text-[#F4C44E]",
    approved: "bg-[#103D32] text-[#35D5B2]",
    revision: "bg-[#49301A] text-[#F5A64A]",
    rejected: "bg-[#4A202D] text-[#FF8196]",
    all: "bg-[#29324B] text-slate-300",
  };

  const labels: Record<Tab, string> = {
    pending: "Pending Review",
    approved: "Approved",
    revision: "Revision",
    rejected: "Rejected",
    all: "All Requests",
  };

  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status]}`}>{labels[status]}</span>;
}

function StatCard({ label, value, icon, tone, color = "text-white" }: {
  label: string;
  value: number;
  icon: string;
  tone: string;
  color?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.07] bg-[#161C38] p-3.5">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
          <PngIcon src={icon} size={21} />
        </span>
        <p className="truncate text-[11px] font-medium text-slate-400 sm:text-xs">{label}</p>
      </div>
      <p className={`mt-3 text-2xl font-extrabold ${color}`}>{value.toLocaleString("en-US")}</p>
    </div>
  );
}

function RejectModal({ concert, busy, error, onCancel, onConfirm }: {
  concert: Concert;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[#7650C8]/50 bg-[#111833] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white">Reject Concert</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Please provide a reason for rejecting <b className="text-white">{concert.name}</b>.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Write rejection reason..."
          className="mt-4 w-full resize-none rounded-lg border border-white/10 bg-[#0B1122] p-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#8B5CF6]"
        />
        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">Cancel</button>
          <button type="button" onClick={() => onConfirm(reason.trim())} disabled={busy || !reason.trim()} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50">
            {busy ? "Rejecting..." : "Reject Concert"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ concert, onClose }: { concert: Concert; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#6750A6] bg-[#111A34] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[2px] text-[#A78BFA]">SUBMISSION DETAILS</p>
            <h3 className="mt-1 text-base font-bold text-white">{concert.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">Close</button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-[150px_1fr]">
          <div className="h-48 overflow-hidden rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#7C3AED]">
            {concert.poster_url && <img src={imageUrl(concert.poster_url)} alt={concert.name} className="h-full w-full object-cover" />}
          </div>
          <div className="space-y-3 text-xs">
            <div><p className="text-slate-500">Organizer</p><p className="mt-1 font-semibold text-white">{concert.organizer_name || "-"}</p></div>
            <div><p className="text-slate-500">Category</p><p className="mt-1 text-white">{concert.category_name || "-"}</p></div>
            <div><p className="text-slate-500">Event Date</p><p className="mt-1 text-white">{formatDate(concert.start_date)}{concert.end_date ? ` – ${formatDate(concert.end_date)}` : ""}</p></div>
            <div><p className="text-slate-500">Venue</p><p className="mt-1 text-white">{concert.venue_name || "-"}</p></div>
            <div><p className="text-slate-500">Submitted At</p><p className="mt-1 text-white">{formatDateTime(concert.submitted_at || concert.created_at)}</p></div>
            <div><p className="text-slate-500">Status</p><div className="mt-1"><StatusBadge concert={concert} /></div></div>
            {concert.rejection_reason && <div><p className="text-slate-500">Rejection Reason</p><p className="mt-1 text-rose-300">{concert.rejection_reason}</p></div>}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ConcertApprovalsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [organizerFilter, setOrganizerFilter] = useState("All Organizers");
  const [dateFilter, setDateFilter] = useState("All Date");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<Concert | null>(null);
  const [rejectError, setRejectError] = useState("");
  const [selected, setSelected] = useState<Concert | null>(null);

  const loadConcerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest<{ concerts?: Concert[] }>("/events/admin/concerts");
      setConcerts(payload.concerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load concert submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConcerts();
  }, [loadConcerts]);

  const categories = useMemo(
    () => [...new Set(concerts.map((c) => c.category_name).filter(Boolean))].sort(),
    [concerts]
  );

  const organizers = useMemo(
    () => [...new Set(concerts.map((c) => c.organizer_name).filter(Boolean))].sort(),
    [concerts]
  );

  const counts = useMemo(() => ({
    total: concerts.length,
    pending: concerts.filter((c) => getStatus(c) === "pending").length,
    approved: concerts.filter((c) => getStatus(c) === "approved").length,
    revision: concerts.filter((c) => getStatus(c) === "revision").length,
    rejected: concerts.filter((c) => getStatus(c) === "rejected").length,
  }), [concerts]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return concerts.filter((c) => {
      const submitted = c.submitted_at || c.created_at;
      const submittedDate = submitted ? new Date(submitted) : null;

      const matchesSearch = !keyword || [
        c.name,
        c.organizer_name,
        c.category_name,
        String(c.id),
      ].join(" ").toLowerCase().includes(keyword);

      const matchesTab = activeTab === "all" || getStatus(c) === activeTab;
      const matchesCategory = categoryFilter === "All Categories" || c.category_name === categoryFilter;
      const matchesOrganizer = organizerFilter === "All Organizers" || c.organizer_name === organizerFilter;
      const matchesDate = dateFilter === "All Date" || (
        submittedDate &&
        !Number.isNaN(submittedDate.getTime()) &&
        submittedDate.toDateString() === new Date().toDateString()
      );

      return matchesSearch && matchesTab && matchesCategory && matchesOrganizer && matchesDate;
    });
  }, [concerts, search, activeTab, categoryFilter, organizerFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, activeTab, categoryFilter, organizerFilter, dateFilter]);

  async function handleApprove(concert: Concert) {
    setBusyId(concert.id);
    setActionError("");

    try {
      await apiRequest(`/events/${concert.id}/approve`, { method: "PATCH" });
      await loadConcerts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to approve concert.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(reason: string) {
    if (!rejecting) return;

    setBusyId(rejecting.id);
    setRejectError("");

    try {
      await apiRequest(`/events/${rejecting.id}/reject`, {
        method: "PATCH",
        body: { rejection_reason: reason },
      });

      setRejecting(null);
      await loadConcerts();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "Failed to reject concert.");
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pending Review", count: counts.pending },
    { id: "approved", label: "Approved", count: counts.approved },
    { id: "revision", label: "Revision", count: counts.revision },
    { id: "rejected", label: "Rejected", count: counts.rejected },
    { id: "all", label: "All Requests", count: counts.total },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 text-white">
      <AdminPageHero
        eyebrow="LYNORA SUPER ADMIN"
        title={<>Concert <span className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">Approval</span></>}
        description="Review and take action on concert submissions from event organizers."
      />

      {/* STATISTICS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Requests" value={counts.total} icon={ICONS.total} tone="bg-[#39256B]" />
        <StatCard label="Pending Review" value={counts.pending} icon={ICONS.pending} tone="bg-[#49391B]" color="text-[#F4C44E]" />
        <StatCard label="Approved" value={counts.approved} icon={ICONS.approved} tone="bg-[#103D32]" color="text-[#35D5B2]" />
        <StatCard label="Revision" value={counts.revision} icon={ICONS.revision} tone="bg-[#39256B]" color="text-[#C4B5FD]" />
        <StatCard label="Rejected" value={counts.rejected} icon={ICONS.rejected} tone="bg-[#4A202D]" color="text-[#FF8196]" />
      </section>

      {/* STATUS TABS */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full border px-4 py-2.5 text-[11px] font-semibold transition sm:px-5 ${
              activeTab === tab.id
                ? "border-[#9B55F5] bg-gradient-to-r from-[#9333EA] to-[#7C3AED] text-white shadow-[0_5px_20px_rgba(139,92,246,.25)]"
                : "border-white/[0.09] bg-[#151B34] text-slate-300 hover:border-[#8B5CF6] hover:text-white"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <section className="w-full min-w-0 overflow-hidden rounded-xl border border-white/[0.07] bg-[#111833] p-3.5 shadow-[0_5px_18px_rgba(0,0,0,.12)] sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white">Concert Submissions</h2>
          <p className="mt-1 text-[11px] text-slate-400">Review and manage event submissions from organizers.</p>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="mb-4 grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_160px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by concert title, organizer, or request ID..."
            className="h-10 min-w-0 w-full rounded-lg border border-[#343B60] bg-[#0B1122] px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#8B5CF6]"
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 min-w-0 w-full rounded-lg border border-[#343B60] bg-[#161C38] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]">
            <option>All Categories</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={organizerFilter} onChange={(e) => setOrganizerFilter(e.target.value)} className="h-10 min-w-0 w-full rounded-lg border border-[#343B60] bg-[#161C38] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]">
            <option>All Organizers</option>
            {organizers.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 min-w-0 w-full rounded-lg border border-[#343B60] bg-[#161C38] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]">
            <option>All Date</option>
            <option value="Today">Today</option>
          </select>
        </div>

        {error && <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}
        {actionError && <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{actionError}</div>}

        {/* TABLE */}
        <div className="w-full min-w-0">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "14%" }} />
              <col className="hidden md:table-column" style={{ width: "12%" }} />
              <col style={{ width: "13%" }} />
              <col className="hidden lg:table-column" style={{ width: "13%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr className="bg-[#4025A5] text-[10px] font-bold text-white sm:text-[11px]">
                <th className="rounded-l-lg px-1 py-3 text-center">No.</th>
                <th className="px-2 py-3">Concert Submission</th>
                <th className="px-2 py-3">Organizer</th>
                <th className="hidden px-2 py-3 md:table-cell">Category</th>
                <th className="px-2 py-3">Event Date</th>
                <th className="hidden px-2 py-3 lg:table-cell">Submitted At</th>
                <th className="px-2 py-3 text-center">Status</th>
                <th className="rounded-r-lg px-1 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-xs text-slate-400">Loading concert submissions...</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-xs text-slate-400">No concert submissions found.</td></tr>
              ) : visible.map((concert, index) => (
                <tr key={concert.id} className="transition hover:bg-white/[0.025]">
                  <td className="px-1 py-3 text-center">
                    <span className="text-[10px] font-semibold tabular-nums text-slate-400">
                      {(currentPage - 1) * PAGE_SIZE + index + 1}
                    </span>
                  </td>
                  <td className="overflow-hidden px-2 py-3">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-[#F59E0B] to-[#7C3AED] sm:h-12 sm:w-[54px]">
                        {concert.poster_url && <img src={imageUrl(concert.poster_url)} alt={concert.name} className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-white sm:text-[11px]">{concert.name}</p>
                        <p className="mt-1 truncate text-[9px] text-slate-500 sm:text-[10px]">REQ-{String(concert.id).padStart(6, "0")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="overflow-hidden px-2 py-3">
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] text-[10px] font-bold">
                        {(concert.organizer_name || "O").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate text-[9px] text-slate-300 sm:text-[10px]">{concert.organizer_name || "-"}</span>
                    </div>
                  </td>
                  <td className="hidden overflow-hidden px-2 py-3 md:table-cell">
                    <span className="inline-block max-w-full truncate rounded-full bg-[#39245E] px-2.5 py-1.5 text-[10px] font-semibold text-[#D8B4FE]">
                      {concert.category_name || "-"}
                    </span>
                  </td>
                  <td className="overflow-hidden px-2 py-3">
                    <div className="flex min-w-0 items-center gap-1.5 text-[9px] text-slate-300 sm:gap-2 sm:text-[10px]">
                      <PngIcon src={ICONS.calendar} size={13} />
                      <span className="truncate">{formatDate(concert.start_date)}</span>
                    </div>
                  </td>
                  <td className="hidden overflow-hidden px-2 py-3 text-[10px] text-slate-400 lg:table-cell">
                    {formatDateTime(concert.submitted_at || concert.created_at)}
                  </td>
                  <td className="overflow-hidden px-1 py-3 text-center">
                    <div className="flex justify-center">
                      <StatusBadge concert={concert} />
                    </div>
                  </td>
                  <td className="px-1 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelected(concert)}
                      aria-label={`View ${concert.name}`}
                      title="View details"
                      className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#59617C] transition hover:border-[#A78BFA] hover:bg-[#7C3AED]/20"
                    >
                      <PngIcon src={ICONS.eye} size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-slate-400">
            Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} requests
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-30">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <button key={number} type="button" onClick={() => setPage(number)} className={`h-8 min-w-8 rounded-lg px-2 text-[11px] font-semibold ${currentPage === number ? "bg-[#7C3AED] text-white" : "border border-white/10 bg-[#161C38] text-slate-300 hover:border-[#8B5CF6]"}`}>
                {number}
              </button>
            ))}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-30">›</button>
          </div>
        </div>
      </section>

      {selected && <DetailModal concert={selected} onClose={() => setSelected(null)} />}
      {rejecting && <RejectModal concert={rejecting} busy={busyId === rejecting.id} error={rejectError} onCancel={() => setRejecting(null)} onConfirm={handleReject} />}
    </div>
  );
}
