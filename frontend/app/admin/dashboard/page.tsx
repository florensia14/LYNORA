"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type DashboardRange = "day" | "week" | "month" | "year";

type ConcertRow = {
  id: number;
  name: string;
  poster_url: string | null;
  start_date: string;
  end_date: string;
  organizer_name: string;
  venue_name: string;
  category_name: string;
  approval_status: string;
  publication_status: string;
  display_status: string;
};

type TrendPoint = {
  label: string;
  tickets: number;
  revenue: number;
};

type ActivityItem = {
  type: "organizer" | "submission" | "order" | "approved" | "rejected";
  title: string;
  description: string;
  at: string;
};

type DashboardData = {
  range: DashboardRange;
  stats: {
    total_users: number;
    active_users: number;
    active_user_percent: number;
    total_organizers: number;
    total_concerts: number;
    pending_concerts: number;
    tickets_sold: number;
    gross_revenue: number;
    users_change: number | null;
    organizers_change: number | null;
    concerts_change: number | null;
    tickets_sold_change: number | null;
    revenue_change: number | null;
  };
  trend: TrendPoint[];
  attendance: {
    checked_in: number;
    not_checked_in: number;
    total: number;
    rate: number;
  };
  concerts: ConcertRow[];
  recent_activity: ActivityItem[];
};

// ------------------------------------------------------------------
// Request helpers
// ------------------------------------------------------------------

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

function toAbsoluteUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_ORIGIN}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Your session has expired. Please log in again.");
    }
    if (res.status === 403) {
      throw new Error("You do not have access to this page.");
    }
    throw new Error(body?.message || "Request failed.");
  }

  return body as T;
}

const getAdminDashboard = (range: DashboardRange, signal?: AbortSignal) =>
  request<DashboardData>(`/api/events/admin/dashboard?range=${range}`, { signal });

const approveConcert = (id: number) =>
  request(`/api/events/${id}/approve`, { method: "PATCH" });

const rejectConcert = (id: number, reason: string) =>
  request(`/api/events/${id}/reject`, {
    method: "PATCH",
    body: { rejection_reason: reason },
  });

// ------------------------------------------------------------------
// Formatters
// ------------------------------------------------------------------

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-US");
}

// 48,900,000 -> "Rp 48.9M" · 1,250,000,000 -> "Rp 1.25B"
function formatRupiah(value: number) {
  const n = Number(value || 0);
  const fmt = (x: number, digits: number) =>
    x.toLocaleString("en-US", { maximumFractionDigits: digits });

  if (n >= 1_000_000_000) return `Rp ${fmt(n / 1_000_000_000, 2)}B`;
  if (n >= 1_000_000) return `Rp ${fmt(n / 1_000_000, 1)}M`;
  return `Rp ${fmt(n, 0)}`;
}

function compactNumber(value: number) {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `${+(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return "";

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return formatDate(value);
}

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const RANGES: { id: DashboardRange; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

const STATUS_STYLE: Record<string, string> = {
  Pending: "bg-[#4A3A17] text-[#FBBF24]",
  Revision: "bg-[#4A2A17] text-[#FB923C]",
  Approved: "bg-[#39245E] text-[#C084FC]",
  Published: "bg-[#0A3B35] text-[#2EE6A6]",
  Ongoing: "bg-[#17365B] text-[#38BDF8]",
  Rejected: "bg-[#4B1D2B] text-[#FB7185]",
  Completed: "bg-[#27304F] text-slate-300",
};

const ACTIVITY_STYLE: Record<
  ActivityItem["type"],
  { icon: string; tone: string }
> = {
  organizer: { icon: "/icons/Attendees.png", tone: "bg-[#4A3A17]" },
  submission: { icon: "/icons/clipboard.png", tone: "bg-[#39245E]" },
  order: { icon: "/icons/orders.png", tone: "bg-[#17365B]" },
  approved: { icon: "/icons/check (1).png", tone: "bg-[#063D35]" },
  rejected: { icon: "/icons/warning (1).png", tone: "bg-[#4B1D2B]" },
};

const PAGE_SIZE = 5;

// ------------------------------------------------------------------
// Small building blocks
// ------------------------------------------------------------------

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-white/[0.07] bg-[#111833] p-3.5 shadow-[0_5px_18px_rgba(0,0,0,0.12)] ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-white">{title}</h2>}
            {subtitle && (
              <p className="mt-0.5 text-[10px] text-slate-400">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-[10px] text-slate-500">No comparison yet</span>;
  }

  const up = value >= 0;
  return (
    <span
      className={`text-[10px] font-semibold ${
        up ? "text-[#2EE6A6]" : "text-rose-400"
      }`}
    >
      {up ? "+" : "-"}
      {Math.abs(value)}%{" "}
      <span className="font-normal text-slate-400">vs previous period</span>
    </span>
  );
}

function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: ReactNode;
  icon: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.07] bg-[#161C38] p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#39256B]">
          <img src={icon} alt="" className="h-4 w-4 object-contain" />
        </span>
        <p className="truncate text-[11px] font-medium text-slate-400">
          {label}
        </p>
      </div>
      <p className="mt-2 truncate text-xl font-bold leading-none text-white sm:text-2xl">
        {value}
      </p>
      <div className="mt-2">{note}</div>
    </div>
  );
}

function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  pill = false,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  pill?: boolean;
}) {
  return (
    <div
      className={`inline-flex border border-white/[0.08] bg-[#161C38] p-0.5 ${
        pill ? "rounded-full" : "rounded-lg"
      }`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={value === tab.id}
          className={`px-3 py-1.5 text-[11px] font-semibold transition ${
            pill ? "rounded-full" : "rounded-md"
          } ${
            value === tab.id
              ? "bg-[#7C3AED] text-white"
              : "text-slate-300 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Charts (pure SVG, no library)
// ------------------------------------------------------------------

function TrendChart({
  points,
  metric,
}: {
  points: TrendPoint[];
  metric: "tickets" | "revenue";
}) {
  const W = 600;
  const H = 220;
  const L = 46;
  const R = 12;
  const T = 12;
  const B = 26;

  const values = points.map((p) =>
    metric === "tickets" ? p.tickets : p.revenue
  );
  const max = Math.max(...values, 1);
  const x = (i: number) =>
    L + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);

  const line = values
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)} ${H - B} L${x(0).toFixed(1)} ${H - B} Z`;
  const step = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Ticket sales chart"
    >
      <defs>
        <linearGradient id="admin-trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line
            x1={L}
            x2={W - R}
            y1={y(max * t)}
            y2={y(max * t)}
            stroke="rgba(255,255,255,0.07)"
          />
          <text
            x={L - 6}
            y={y(max * t) + 3}
            textAnchor="end"
            fontSize="9"
            fill="#94A3B8"
          >
            {compactNumber(max * t)}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#admin-trend-fill)" />
      <path
        d={line}
        fill="none"
        stroke="#A78BFA"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          <circle cx={x(i)} cy={y(values[i])} r="3" fill="#C4B5FD">
            <title>
              {p.label}:{" "}
              {metric === "tickets"
                ? `${formatNumber(p.tickets)} tickets`
                : formatRupiah(p.revenue)}
            </title>
          </circle>
          {i % step === 0 && (
            <text
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#94A3B8"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function AttendanceDonut({
  rate,
  checkedIn,
  notCheckedIn,
  total,
}: {
  rate: number;
  checkedIn: number;
  notCheckedIn: number;
  total: number;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#2A2F55"
              strokeWidth="12"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#A78BFA"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(c * Math.min(rate, 100)) / 100} ${c}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{rate}%</span>
            <span className="text-[10px] text-slate-400">Attendance</span>
          </div>
        </div>

        <ul className="space-y-2 text-xs text-slate-300">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#A78BFA]" />
            Checked in: <b className="text-white">{formatNumber(checkedIn)}</b>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2A2F55]" />
            Not checked in:{" "}
            <b className="text-white">{formatNumber(notCheckedIn)}</b>
          </li>
        </ul>
      </div>

      <p className="text-[11px] text-slate-400">
        From {formatNumber(total)} tickets sold
      </p>
    </div>
  );
}

// ------------------------------------------------------------------
// Sections
// ------------------------------------------------------------------

function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card
      title="Recent Platform Activity"
      subtitle="Latest important activity across the platform."
    >
      {items.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-400">
          No activity yet.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {items.map((item, i) => {
            const style = ACTIVITY_STYLE[item.type];
            return (
              <li
                key={`${item.type}-${item.at}-${i}`}
                className="flex gap-3 py-2.5"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.tone}`}
                >
                  <img
                    src={style.icon}
                    alt=""
                    aria-hidden="true"
                    className="h-4 w-4 object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {timeAgo(item.at)}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-400">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function RejectModal({
  concert,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  concert: ConcertRow;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Reject concert"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#7650C8]/50 bg-[#111833] p-5 shadow-2xl">
        <h3 className="text-base font-bold text-white">Reject concert</h3>
        <p className="mt-1 text-xs text-slate-400">
          Tell the organizer why{" "}
          <b className="text-slate-200">{concert.name}</b> was rejected.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Rejection reason (required)"
          className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-[#161A25] p-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#A78BFA]"
        />

        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-9 rounded-lg border border-white/10 px-3.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || !reason.trim()}
            className="h-9 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConcertTable({
  concerts,
  search,
  onChanged,
}: {
  concerts: ConcertRow[];
  search: string;
  onChanged: () => void;
}) {
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [rejecting, setRejecting] = useState<ConcertRow | null>(null);
  const [rejectError, setRejectError] = useState("");

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return concerts;

    return concerts.filter((c) =>
      [c.name, c.organizer_name, c.venue_name, c.category_name]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [concerts, search]);

  useEffect(() => setPage(1), [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice(
    (current - 1) * PAGE_SIZE,
    current * PAGE_SIZE
  );

  async function handleApprove(concert: ConcertRow) {
    setBusyId(concert.id);
    setActionError("");
    try {
      await approveConcert(concert.id);
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to approve.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(reason: string) {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    setRejectError("");
    try {
      await rejectConcert(rejecting.id, reason);
      setRejecting(null);
      onChanged();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "Failed to reject.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card
      title="Recent & Ongoing Concert"
      subtitle={
        search
          ? `Showing results for "${search}"`
          : "Latest concert submissions that require your action."
      }
      action={
        <Link
          href="/admin/approvals"
          className="shrink-0 text-[11px] font-semibold text-[#C084FC] transition hover:text-[#22D3EE]"
        >
          See all
        </Link>
      }
      className="overflow-hidden"
    >
      {actionError && (
        <p className="mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {actionError}
        </p>
      )}

      <div className="-mx-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="bg-[#3B2BB0] text-[10px] font-bold text-white">
              <th className="px-4 py-2.5">Concert</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-xs text-slate-400"
                >
                  {search ? "No concerts match your search." : "No concerts yet."}
                </td>
              </tr>
            ) : (
              visible.map((c) => {
                const needsAction =
                  c.approval_status === "pending" ||
                  c.approval_status === "revision_required";
                const busy = busyId === c.id;

                return (
                  <tr key={c.id} className="border-t border-white/[0.06]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-[linear-gradient(160deg,#F59E0B_0%,#7C3AED_100%)]">
                          {c.poster_url && (
                            <img
                              src={toAbsoluteUrl(c.poster_url)}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[190px] truncate text-[11px] font-bold text-white">
                            {c.name}
                          </p>
                          <p className="max-w-[190px] truncate text-[10px] text-slate-400">
                            by {c.organizer_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-slate-300">
                      <p>{formatDate(c.start_date)}</p>
                      <p className="max-w-[140px] truncate text-slate-400">
                        {c.venue_name}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold ${
                          STATUS_STYLE[c.display_status] ?? STATUS_STYLE.Pending
                        }`}
                      >
                        {c.display_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {needsAction ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleApprove(c)}
                            className="h-7 rounded-md bg-[#0A3B35] px-2.5 text-[10px] font-semibold text-[#2EE6A6] transition hover:brightness-125 disabled:opacity-50"
                          >
                            {busy ? "..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setRejectError("");
                              setRejecting(c);
                            }}
                            className="h-7 rounded-md bg-[#4B1D2B] px-2.5 text-[10px] font-semibold text-[#FB7185] transition hover:brightness-125 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <p className="text-right text-[10px] text-slate-500">
                          —
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-slate-400">
          Showing {visible.length} of {filtered.length} concerts
        </p>
        <nav aria-label="Pagination" className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === current ? "page" : undefined}
              className={`h-6 min-w-6 rounded px-1.5 text-[10px] font-semibold transition ${
                n === current
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#1D2548] text-slate-200 hover:bg-[#28326A]"
              }`}
            >
              {n}
            </button>
          ))}
        </nav>
      </div>

      {rejecting && (
        <RejectModal
          concert={rejecting}
          busy={busyId === rejecting.id}
          error={rejectError}
          onCancel={() => setRejecting(null)}
          onConfirm={handleReject}
        />
      )}
    </Card>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";

  const [range, setRange] = useState<DashboardRange>("week");
  const [metric, setMetric] = useState<"tickets" | "revenue">("tickets");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      setName(stored ? JSON.parse(stored)?.name || "" : "");
    } catch {
      setName("");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    getAdminDashboard(range, controller.signal)
      .then(setData)
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [range, reloadKey]);

  function exportCsv() {
    if (!data) return;

    const { stats } = data;
    const summary = [
      ["Total Users", stats.total_users],
      ["Total Organizers", stats.total_organizers],
      ["Total Concerts", stats.total_concerts],
      ["Pending Approvals", stats.pending_concerts],
      ["Tickets Sold", stats.tickets_sold],
      ["Gross Revenue", stats.gross_revenue],
    ];

    const header = ["Concert", "Organizer", "Date", "Venue", "Category", "Status"];
    const rows = data.concerts.map((c) => [
      c.name,
      c.organizer_name,
      formatDate(c.start_date),
      c.venue_name,
      c.category_name,
      c.display_status,
    ]);

    const csv = [["Metric", "Value"], ...summary, [], header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "lynora-admin-overview.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!data && loading) {
    return (
      <p className="py-24 text-center text-sm text-slate-400">
        Loading dashboard...
      </p>
    );
  }

  if (!data) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm font-semibold text-rose-400">
          {error || "Failed to load dashboard."}
        </p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-3 rounded-lg bg-[#7C3AED] px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110"
        >
          Try again
        </button>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-3.5">
      {/* WELCOME */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#8B5CF6]/20">
        <img
          src="/images/hero/hero.jpg"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,17,34,0.92)_0%,rgba(37,35,77,0.75)_55%,rgba(11,17,34,0.35)_100%)]" />

        <div className="flex flex-col justify-between gap-5 px-5 py-7 sm:flex-row sm:items-end sm:px-7 sm:py-9">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[2.5px] text-[#A5A0FF] sm:text-[11px]">
              LYNORA SUPER ADMIN
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              Hallo,
              <br />
              <span className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">
                {name || "Admin"}
              </span>{" "}
              👋
            </h1>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 w-fit shrink-0 items-center rounded-lg bg-[linear-gradient(100deg,#8B5CF6_0%,#6539D5_100%)] px-3.5 text-[11px] font-semibold text-white shadow-[0_6px_20px_rgba(139,92,246,0.4)] transition hover:brightness-110"
          >
            Export Data
          </button>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {/* STATS */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Total Users"
          value={formatNumber(stats.total_users)}
          icon="/icons/user (1).png"
          note={
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#A78BFA]"
                  style={{ width: `${stats.active_user_percent}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {stats.active_user_percent}% active accounts
              </p>
            </div>
          }
        />
        <StatCard
          label="Total Organizers"
          value={formatNumber(stats.total_organizers)}
          icon="/icons/sales(1).png"
          note={<Change value={stats.organizers_change} />}
        />
        <StatCard
          label="Total Concerts"
          value={formatNumber(stats.total_concerts)}
          icon="/icons/calender (1).png"
          note={
            <span className="text-[10px] text-slate-400">
              <b className="text-[#FBBF24]">{stats.pending_concerts}</b> awaiting
              approval
            </span>
          }
        />
        <StatCard
          label="Tickets Sold"
          value={formatNumber(stats.tickets_sold)}
          icon="/icons/ticket (1).png"
          note={<Change value={stats.tickets_sold_change} />}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            label="Gross Revenue"
            value={formatRupiah(stats.gross_revenue)}
            icon="/icons/dollar.png"
            note={<Change value={stats.revenue_change} />}
          />
        </div>
      </section>

      {/* RANGE */}
      <SegmentedTabs tabs={RANGES} value={range} onChange={setRange} />

      {/* TREND + ATTENDANCE */}
      <div
        className={`grid gap-4 transition-opacity lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] ${
          loading ? "opacity-60" : ""
        }`}
      >
        <Card
          title="Ticket Sales Trend"
          action={
            <SegmentedTabs
              pill
              tabs={[
                { id: "tickets", label: "Tickets Sold" },
                { id: "revenue", label: "Revenue" },
              ]}
              value={metric}
              onChange={setMetric}
            />
          }
        >
          <TrendChart points={data.trend} metric={metric} />
        </Card>

        <Card title="Attendance Overview">
          <AttendanceDonut
            rate={data.attendance.rate}
            checkedIn={data.attendance.checked_in}
            notCheckedIn={data.attendance.not_checked_in}
            total={data.attendance.total}
          />
        </Card>
      </div>

      {/* CONCERTS + ACTIVITY */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <ConcertTable
          concerts={data.concerts}
          search={search}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
        <ActivityCard items={data.recent_activity} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-slate-400">
          Loading dashboard...
        </p>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
