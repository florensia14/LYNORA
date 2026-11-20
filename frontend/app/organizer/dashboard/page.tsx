"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import OrganizerPageHero from "../../../components/layout/OrganizerPageHero";

type DashboardRange = "day" | "week" | "month" | "year";

type ConcertRow = {
  id: number;
  name: string;
  poster_url: string | null;
  start_date: string;
  end_date: string;
  venue_name: string;
  venue_address: string;
  category_name: string;
  quota: number;
  sold: number;
  revenue: number;
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
  type: "order" | "check_in" | "approved" | "rejected";
  title: string;
  description: string;
  at: string;
};

type UpcomingConcert = {
  id: number;
  name: string;
  poster_url: string | null;
  start_date: string;
  venue_name: string;
  venue_address: string;
  category_name: string;
  artists: string;
  quota: number;
  sold: number;
};

type DashboardData = {
  range: DashboardRange;
  stats: {
    total_concerts: number;
    active_concerts: number;
    tickets_sold: number;
    tickets_checked_in: number;
    gross_revenue: number;
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
  upcoming: UpcomingConcert | null;
  recent_activity: ActivityItem[];
  concerts: ConcertRow[];
  payment_methods: { label: string; count: number; percent: number }[];
  balance: { available: number };
};

// ------------------------------------------------------------------
// Request helper
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

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  // Change "token" if your localStorage key is different.
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_ORIGIN}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Your session has expired. Please log in again.");
    }
    throw new Error(body?.message || "Failed to load data.");
  }

  return body as T;
}

function getOrganizerDashboard(
  range: DashboardRange,
  signal?: AbortSignal
) {
  return request<DashboardData>(
    `/api/events/organizer/dashboard?range=${range}`,
    signal
  );
}

// ------------------------------------------------------------------
// Formatters
// ------------------------------------------------------------------

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-US");
}

// 1,250,000,000 -> "Rp 1.25B" · 12,400,000 -> "Rp 12.4M"
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


// Rename the files to match the PNG/JPG icons in your public/icons folder.
const ICON = {
  order: "/icons/orders.png",
  checkIn: "/icons/qr.png",
  approved: "/icons/check (1).png",
  rejected: "/icons/warning (1).png",
};

const RANGES: { id: DashboardRange; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

const STATUS_STYLE: Record<string, string> = {
  Published: "bg-[#0A3B35] text-[#2EE6A6]",
  Ongoing: "bg-[#17365B] text-[#38BDF8]",
  Draft: "bg-[#4A3A17] text-[#FBBF24]",
  Pending: "bg-[#4A3A17] text-[#FBBF24]",
  Rejected: "bg-[#4B1D2B] text-[#FB7185]",
  Completed: "bg-[#27304F] text-slate-300",
};

const ACTIVITY_STYLE: Record<ActivityItem["type"], { icon: string; tone: string }> = {
  order: { icon: ICON.order, tone: "bg-[#17365B]" },
  check_in: { icon: ICON.checkIn, tone: "bg-[#063D35]" },
  approved: { icon: ICON.approved, tone: "bg-[#39245E]" },
  rejected: { icon: ICON.rejected, tone: "bg-[#4B1D2B]" },
};

const PAGE_SIZE = 5;

// ------------------------------------------------------------------
// Small building blocks
// ------------------------------------------------------------------

function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-white/[0.07] bg-[#111833] p-3.5 shadow-[0_5px_18px_rgba(0,0,0,0.12)] ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-bold text-white">{title}</h2>}
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
      {up ? "+" : "-"}{Math.abs(value)}%{" "}
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
        <p className="truncate text-[11px] font-medium text-slate-400">{label}</p>
      </div>
      <p className="mt-2 truncate text-xl font-bold leading-none text-white sm:text-2xl">
        {value}
      </p>
      <div className="mt-2 truncate">{note}</div>
    </div>
  );
}

function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#161C38] p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={value === tab.id}
          className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
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

  const values = points.map((p) => (metric === "tickets" ? p.tickets : p.revenue));
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
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
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

      <path d={area} fill="url(#trend-fill)" />
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
}: {
  rate: number;
  checkedIn: number;
  notCheckedIn: number;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#2A2F55" strokeWidth="12" />
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
          Not checked in: <b className="text-white">{formatNumber(notCheckedIn)}</b>
        </li>
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------
// Sections
// ------------------------------------------------------------------

function UpcomingCard({ data }: { data: DashboardData["upcoming"] }) {
  if (!data) {
    return (
      <Card title="Upcoming Concert">
        <p className="py-10 text-center text-xs text-slate-400">
          No upcoming concerts have been published yet.
        </p>
      </Card>
    );
  }

  const percent = data.quota
    ? Math.min(100, Math.round((data.sold / data.quota) * 1000) / 10)
    : 0;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(data.start_date).getTime() - Date.now()) / 86400000)
  );

  return (
    <Card title="Upcoming Concert">
      <div className="flex gap-3">
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-[linear-gradient(160deg,#F59E0B_0%,#7C3AED_100%)]">
          {data.poster_url && (
            <img
              src={toAbsoluteUrl(data.poster_url)}
              alt={data.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{data.name}</p>
          {data.artists && (
            <p className="truncate text-[11px] text-slate-400">{data.artists}</p>
          )}
          <p className="mt-2 text-[11px] text-slate-300">
            {formatDate(data.start_date)} · {data.venue_name}
          </p>
          <p className="text-[11px] text-slate-400">{data.category_name}</p>

          <p className="mt-2 text-[11px] font-semibold text-[#C4B5FD]">
            {daysLeft === 0
              ? "Today"
              : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>
            <b className="text-white">{formatNumber(data.sold)}</b> /{" "}
            {formatNumber(data.quota)} tickets
          </span>
          <span className="text-[#A78BFA]">{percent}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#2EE672]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <Link
        href="/organizer/manage-concert"
        className="mt-3 inline-flex h-8 items-center rounded-lg bg-[#7C3AED] px-3 text-[11px] font-semibold text-white transition hover:brightness-110"
      >
        Manage concert
      </Link>
    </Card>
  );
}

function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card title="Recent Activity">
      {items.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-400">
          No activity yet.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {items.map((item, i) => {
            const style = ACTIVITY_STYLE[item.type];
            return (
              <li key={`${item.type}-${item.at}-${i}`} className="flex gap-3 py-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm text-white ${style.tone}`}
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

function ConcertTable({ concerts }: { concerts: ConcertRow[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(concerts.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = concerts.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <Card
      title="Recent & Ongoing Concert"
      action={
        <Link
          href="/organizer/manage-concert"
          className="text-[11px] font-semibold text-[#C084FC] transition hover:text-[#22D3EE]"
        >
          See all
        </Link>
      }
      className="overflow-hidden"
    >
      <div className="-mx-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="bg-[#3B2BB0] text-[10px] font-bold text-white">
              <th className="px-4 py-2.5">Concert</th>
              <th className="px-3 py-2.5">Date &amp; Venue</th>
              <th className="px-3 py-2.5">Tickets Sold</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-xs text-slate-400">
                  No concerts yet.
                </td>
              </tr>
            ) : (
              visible.map((c) => {
                const percent = c.quota
                  ? Math.min(100, Math.round((c.sold / c.quota) * 100))
                  : 0;
                return (
                  <tr key={c.id} className="border-t border-white/[0.06]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-8 shrink-0 overflow-hidden rounded bg-[linear-gradient(160deg,#F59E0B_0%,#7C3AED_100%)]">
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
                        <span className="max-w-[160px] truncate text-[11px] font-bold text-white">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-slate-300">
                      <p>{formatDate(c.start_date)}</p>
                      <p className="max-w-[140px] truncate text-slate-400">
                        {c.venue_name}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-[10px] text-slate-400">
                        <b className="text-white">{formatNumber(c.sold)}</b> /{" "}
                        {formatNumber(c.quota)}
                      </p>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#2EE672]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold ${
                          STATUS_STYLE[c.display_status] ?? STATUS_STYLE.Draft
                        }`}
                      >
                        {c.display_status}
                      </span>
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
          Showing {visible.length} of {concerts.length} concerts
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
    </Card>
  );
}

function PaymentCard({
  methods,
  balance,
}: {
  methods: DashboardData["payment_methods"];
  balance: number;
}) {
  const top = methods.slice(0, 4);

  return (
    <Card title="Payment Methods">
      {top.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          No payments yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {top.map((m) => (
            <li key={m.label}>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-200">{m.label}</span>
                <span className="font-semibold text-white">{m.percent}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#8B5CF6]"
                  style={{ width: `${m.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-lg border border-[#7650C8]/50 bg-[#161C38] p-3">
        <p className="text-[10px] text-slate-400">Available Balance</p>
        <p className="mt-0.5 text-lg font-bold text-white">{formatRupiah(balance)}</p>
        <button
          type="button"
          disabled
          title="Fund withdrawal is not available yet"
          className="mt-2 h-8 w-full cursor-not-allowed rounded-lg bg-[#7C3AED]/40 text-[11px] font-semibold text-white/70"
        >
          Withdraw Funds
        </button>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function OrganizerDashboardPage() {
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

    getOrganizerDashboard(range, controller.signal)
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

    const header = ["Concert", "Date", "Venue", "Sold", "Quota", "Revenue", "Status"];
    const rows = data.concerts.map((c) => [
      c.name,
      formatDate(c.start_date),
      c.venue_name,
      c.sold,
      c.quota,
      c.revenue,
      c.display_status,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "lynora-concerts.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!data && loading) {
    return <p className="py-24 text-center text-sm text-slate-400">Loading dashboard...</p>;
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
      <OrganizerPageHero
        eyebrow="LYNORA ORGANIZER WORKSPACE"
        title={`Welcome back, ${name || "Organizer"}`}
        description="Manage your concerts, monitor ticket sales, and keep track of your event performance in one place."
        className="mb-0"
      >
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex h-9 w-fit items-center rounded-lg bg-[linear-gradient(100deg,#8B5CF6_0%,#6539D5_100%)] px-3.5 text-[11px] font-semibold text-white shadow-[0_6px_20px_rgba(139,92,246,0.4)] transition hover:brightness-110"
        >
          Export Data
        </button>
      </OrganizerPageHero>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {/* STATS */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Total Concerts"
          value={formatNumber(stats.total_concerts)}
          icon="/icons/clipboard (1).png"
          note={<span className="text-[10px] text-slate-400">All your concerts</span>}
        />
        <StatCard
          label="Active Concerts"
          value={formatNumber(stats.active_concerts)}
          icon="/icons/active.png"
          note={<span className="text-[10px] text-slate-400">Published &amp; not yet finished</span>}
        />
        <StatCard
          label="Tickets Sold"
          value={formatNumber(stats.tickets_sold)}
          icon="/icons/ticket (1).png"
          note={<Change value={stats.tickets_sold_change} />}
        />
        <StatCard
          label="Tickets Checked In"
          value={formatNumber(stats.tickets_checked_in)}
          icon="/icons/qr(1).png"
          note={
            <span className="text-[10px] text-slate-400">
              {data.attendance.rate}% of tickets sold
            </span>
          }
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
          />
        </Card>
      </div>

      {/* UPCOMING + ACTIVITY */}
      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingCard data={data.upcoming} />
        <ActivityCard items={data.recent_activity} />
      </div>

      {/* TABLE + PAYMENT */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <ConcertTable concerts={data.concerts} />
        <PaymentCard
          methods={data.payment_methods}
          balance={data.balance.available}
        />
      </div>
    </div>
  );
}