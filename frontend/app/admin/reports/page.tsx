
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import AdminPageHero from "@/components/layout/AdminPageHero";

// ======================================================
// TYPES
// ======================================================

type Range = "day" | "week" | "month" | "year";
type Metric = "revenue" | "tickets";

type UserDistribution = {
  customers: number;
  organizers: number;
  customerPercent: number;
  organizerPercent: number;
};

type TrendPoint = {
  label: string;
  tickets: number;
  revenue: number;
};

type Concert = {
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

type DashboardData = {
  success: boolean;
  range: Range;
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
  concerts: Concert[];
  recent_activity?: unknown[];
};

// ======================================================
// CONSTANTS
// ======================================================

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const RANGES: { id: Range; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

const ICONS = {
  users: "/icons/user (1).png",
  organizers: "/icons/Attendees.png",
  concerts: "/icons/calendar.png",
  tickets: "/icons/ticket (1).png",
  revenue: "/icons/dollar.png",
  download: "/icons/direct-download.png",
  location: "/icons/location.png",
  clock: "/icons/clock.png",
};

// ======================================================
// HELPERS
// ======================================================

function getToken(): string {
  if (typeof window === "undefined") return "";

  return localStorage.getItem("token") || "";
}

async function fetchDashboard(
  range: Range,
  signal: AbortSignal
): Promise<DashboardData> {
  const response = await fetch(
    `${API_BASE}/events/admin/dashboard?range=${range}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    }
  );

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Failed to retrieve analytics data."
    );
  }

  return result as DashboardData;
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString("id-ID");
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function compactMoney(value: number): string {
  const number = Number(value || 0);

  if (number >= 1_000_000_000) {
    return `Rp ${(number / 1_000_000_000).toFixed(2)}B`;
  }

  if (number >= 1_000_000) {
    return `Rp ${(number / 1_000_000).toFixed(1)}M`;
  }

  if (number >= 1_000) {
    return `Rp ${(number / 1_000).toFixed(1)}K`;
  }

  return `Rp ${formatNumber(number)}`;
}

function formatDate(value: string): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getChangeText(value: number | null): string {
  if (value === null || value === undefined) {
    return "No comparison yet";
  }

  return `${value >= 0 ? "+" : ""}${value}%`;
}

// ======================================================
// REUSABLE COMPONENTS
// ======================================================

function Icon({
  src,
  size = 19,
}: {
  src: string;
  size?: number;
}) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
    />
  );
}

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-white/[0.07] bg-[#11172D] p-3.5 shadow-[0_5px_18px_rgba(0,0,0,0.12)] sm:p-4 ${className}`}
    >
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-white sm:text-sm">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-[9px] leading-4 text-slate-500 sm:text-[10px]">
              {subtitle}
            </p>
          )}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

// ======================================================
// STAT CARD
// ======================================================

function StatCard({
  label,
  value,
  icon,
  tone,
  change,
}: {
  label: string;
  value: string;
  icon: string;
  tone: string;
  change?: number | null;
}) {
  const positive = (change ?? 0) >= 0;

  return (
    <div className="min-w-0 rounded-xl border border-white/[0.07] bg-[#11172D] p-3 shadow-lg shadow-black/10 transition duration-200 hover:border-[#8B5CF6]/40 sm:p-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}
        >
          <Icon src={icon} size={19} />
        </div>

        <p className="min-w-0 truncate text-[10px] font-medium text-slate-400 sm:text-xs">
          {label}
        </p>
      </div>

      <div className="mt-3 min-w-0">
        <p className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
          {value}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {change === undefined || change === null ? (
            <span className="text-[9px] text-slate-500">
              {change === null ? "No comparison yet" : "All time"}
            </span>
          ) : (
            <>
              <span
                className={`text-[9px] font-bold ${
                  positive ? "text-[#2EE6A6]" : "text-rose-400"
                }`}
              >
                {getChangeText(change)}
              </span>

              <span className="text-[9px] text-slate-500">
                vs previous period
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// RANGE SELECTOR
// ======================================================

function RangeSelector({
  value,
  onChange,
}: {
  value: Range;
  onChange: (value: Range) => void;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-1 rounded-lg border border-white/[0.07] bg-[#0B1122] p-1">
      {RANGES.map((range) => (
        <button
          key={range.id}
          type="button"
          onClick={() => onChange(range.id)}
          className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition sm:px-3.5 sm:text-xs ${
            value === range.id
              ? "bg-gradient-to-r from-[#8B5CF6] to-[#6539D5] text-white shadow-md"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

// ======================================================
// SALES CHART
// ======================================================

function SalesChart({
  points,
  metric,
}: {
  points: TrendPoint[];
  metric: Metric;
}) {
  const values = points.map((point) =>
    Number(point[metric] || 0)
  );

  const max = Math.max(...values, 1);
  const hasData = values.some((value) => value > 0);

  const width = 700;
  const height = 220;
  const left = 12;
  const right = 12;
  const top = 15;
  const bottom = 30;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const coordinates = values.map((value, index) => {
    const x =
      left +
      (values.length <= 1
        ? chartWidth / 2
        : (index / (values.length - 1)) * chartWidth);

    const y =
      top + chartHeight - (value / max) * chartHeight;

    return { x, y, value };
  });

  const linePath = coordinates
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath = hasData
    ? `${linePath} L ${
        coordinates[coordinates.length - 1].x
      } ${top + chartHeight} L ${
        coordinates[0].x
      } ${top + chartHeight} Z`
    : "";

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[9px] text-slate-500">
            {metric === "revenue"
              ? "Revenue generated"
              : "Total tickets sold"}
          </p>

          <p className="mt-1 text-base font-extrabold text-white sm:text-lg">
            {metric === "revenue"
              ? compactMoney(values.reduce((a, b) => a + b, 0))
              : formatNumber(values.reduce((a, b) => a + b, 0))}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
          <span className="text-[9px] text-slate-400">
            {metric === "revenue" ? "Revenue" : "Tickets Sold"}
          </span>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[180px] w-full overflow-visible sm:h-[220px]"
          preserveAspectRatio="none"
          role="img"
          aria-label={
            metric === "revenue"
              ? "Revenue trend chart"
              : "Ticket sales trend chart"
          }
        >
          <defs>
            <linearGradient
              id="salesAreaGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#8B5CF6"
                stopOpacity="0.32"
              />
              <stop
                offset="100%"
                stopColor="#8B5CF6"
                stopOpacity="0"
              />
            </linearGradient>

            <linearGradient
              id="salesLineGradient"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((index) => {
            const y = top + (chartHeight / 3) * index;

            return (
              <line
                key={index}
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="#FFFFFF"
                strokeOpacity="0.07"
                strokeDasharray="4 5"
              />
            );
          })}

          {hasData && (
            <>
              <path
                d={areaPath}
                fill="url(#salesAreaGradient)"
              />

              <path
                d={linePath}
                fill="none"
                stroke="url(#salesLineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {coordinates.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#22D3EE"
                  stroke="#11172D"
                  strokeWidth="2"
                >
                  <title>
                    {points[index].label}:{" "}
                    {metric === "revenue"
                      ? formatMoney(point.value)
                      : formatNumber(point.value)}
                  </title>
                </circle>
              ))}
            </>
          )}

          {points.map((point, index) => {
            const x =
              left +
              (points.length <= 1
                ? chartWidth / 2
                : (index / (points.length - 1)) * chartWidth);

            return (
              <text
                key={index}
                x={x}
                y={height - 5}
                textAnchor="middle"
                fill="#64748B"
                fontSize="10"
              >
                {point.label}
              </text>
            );
          })}
        </svg>
      </div>

      {!hasData && (
        <div className="py-2 text-center text-[10px] text-slate-500">
          No sales data available for this period.
        </div>
      )}
    </div>
  );
}

// ======================================================
// ATTENDANCE ANALYTICS
// ======================================================

function AttendanceAnalytics({
  attendance,
}: {
  attendance: DashboardData["attendance"];
}) {
  const rate = Math.max(
    0,
    Math.min(100, attendance.rate || 0)
  );

  return (
    <div className="flex flex-col items-center gap-5 py-2 sm:flex-row sm:justify-around">
      <div
        className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#8B5CF6 0% ${rate}%, #26304D ${rate}% 100%)`,
        }}
      >
        <div className="grid h-[108px] w-[108px] place-items-center rounded-full bg-[#11172D]">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-white">
              {rate}%
            </p>

            <p className="mt-0.5 text-[9px] text-slate-500">
              Check-in Rate
            </p>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 space-y-4 sm:max-w-[190px]">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#8B5CF6]" />
              <span className="text-[10px] text-slate-400">
                Checked In
              </span>
            </div>

            <span className="text-xs font-bold text-white">
              {formatNumber(attendance.checked_in)}
            </span>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#8B5CF6]"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#33415F]" />
              <span className="text-[10px] text-slate-400">
                Not Checked In
              </span>
            </div>

            <span className="text-xs font-bold text-white">
              {formatNumber(attendance.not_checked_in)}
            </span>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#33415F]"
              style={{ width: `${100 - rate}%` }}
            />
          </div>
        </div>

        <div className="border-t border-white/[0.07] pt-3">
          <p className="text-[9px] text-slate-500">
            Total Tickets
          </p>

          <p className="mt-1 text-sm font-bold text-white">
            {formatNumber(attendance.total)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// CONCERT STATUS
// ======================================================

function ConcertStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: "bg-amber-500/15 text-amber-300",
    Revision: "bg-orange-500/15 text-orange-300",
    Approved: "bg-violet-500/15 text-violet-300",
    Published: "bg-emerald-500/15 text-emerald-300",
    Ongoing: "bg-cyan-500/15 text-cyan-300",
    Rejected: "bg-rose-500/15 text-rose-300",
    Completed: "bg-slate-500/15 text-slate-300",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${
        styles[status] || "bg-slate-500/15 text-slate-300"
      }`}
    >
      {status}
    </span>
  );
}

// ======================================================
// GROWTH ITEM
// ======================================================

function GrowthItem({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: number;
  percent: number;
  color: string;
}) {
  const safePercent = Math.max(
    0,
    Math.min(100, percent)
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">
          {label}
        </span>

        <span className="text-xs font-bold text-white">
          {formatNumber(value)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
}

// ======================================================
// MAIN PAGE
// ======================================================

export default function ReportsAnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  const [range, setRange] = useState<Range>("month");
  const [metric, setMetric] = useState<Metric>("revenue");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // ====================================================
  // FETCH ANALYTICS
  // ====================================================

  const loadAnalytics = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError("");

      try {
        const result = await fetchDashboard(range, signal);

        if (signal.aborted) return;

        setData(result);
      } catch (err) {
        if (signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load analytics."
        );
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [range]
  );

  useEffect(() => {
    const controller = new AbortController();

    loadAnalytics(controller.signal);

    return () => controller.abort();
  }, [loadAnalytics, reloadKey]);

  // ====================================================
  // DERIVED DATA
  // ====================================================

  const stats = data?.stats;

  const totalTrendRevenue = useMemo(
    () =>
      data?.trend.reduce(
        (total, point) =>
          total + Number(point.revenue || 0),
        0
      ) || 0,
    [data]
  );

  const totalTrendTickets = useMemo(
    () =>
      data?.trend.reduce(
        (total, point) =>
          total + Number(point.tickets || 0),
        0
      ) || 0,
    [data]
  );

  // FIXED: EXPLICIT USER DISTRIBUTION TYPE

  const userDistribution = useMemo<UserDistribution>(() => {
    if (!stats) {
      return {
        customers: 0,
        organizers: 0,
        customerPercent: 0,
        organizerPercent: 0,
      };
    }

    const customers = Math.max(
      0,
      stats.total_users - stats.total_organizers
    );

    const organizers = stats.total_organizers;
    const total = customers + organizers;

    return {
      customers,
      organizers,
      customerPercent:
        total > 0 ? (customers / total) * 100 : 0,
      organizerPercent:
        total > 0 ? (organizers / total) * 100 : 0,
    };
  }, [stats]);

  // ====================================================
  // EXPORT CSV
  // ====================================================

  function exportReport() {
    if (!data) return;

    const rows: (string | number)[][] = [
      ["LYNORA - SUPER ADMIN ANALYTICS REPORT"],
      ["Generated At", new Date().toLocaleString("id-ID")],
      ["Selected Period", range.toUpperCase()],
      [],
      ["PLATFORM OVERVIEW"],
      ["Metric", "Value"],
      ["Total Users", stats?.total_users || 0],
      ["Active Users", stats?.active_users || 0],
      ["Total Organizers", stats?.total_organizers || 0],
      ["Total Concerts", stats?.total_concerts || 0],
      ["Pending Concerts", stats?.pending_concerts || 0],
      ["Total Tickets Sold", stats?.tickets_sold || 0],
      ["Gross Revenue", stats?.gross_revenue || 0],
      [],
      ["PERIOD SALES PERFORMANCE"],
      ["Period", "Tickets Sold", "Revenue"],
      ...data.trend.map((point) => [
        point.label,
        point.tickets,
        point.revenue,
      ]),
      [],
      ["ATTENDANCE"],
      ["Checked In", data.attendance.checked_in],
      ["Not Checked In", data.attendance.not_checked_in],
      ["Total Tickets", data.attendance.total],
      ["Attendance Rate", `${data.attendance.rate}%`],
    ];

    const escapeCsv = (value: string | number) => {
      return `"${String(value ?? "").replace(/"/g, '""')}"`;
    };

    const csv = rows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `lynora-analytics-${range}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (!data && loading) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-[1180px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />

          <p className="mt-3 text-xs text-slate-400">
            Loading reports & analytics...
          </p>
        </div>
      </div>
    );
  }

  // ====================================================
  // ERROR STATE
  // ====================================================

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-[1180px] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-rose-500/20 bg-[#11172D] p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-500/10">
            <span className="text-xl text-rose-400">!</span>
          </div>

          <h2 className="mt-3 text-sm font-bold text-white">
            Unable to Load Reports
          </h2>

          <p className="mt-2 text-[10px] leading-5 text-slate-400">
            {error || "Something went wrong while retrieving analytics data."}
          </p>

          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-4 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6539D5] px-5 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // MAIN CONTENT
  // ====================================================

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-3.5">

      {/* ==============================================
          HERO SECTION
      ============================================== */}

      <AdminPageHero
        eyebrow="LYNORA SUPER ADMIN"
        title={
          <>
            Reports{" "}
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">
              & Analytics
            </span>
          </>
        }
        description="Track platform performance, monitor ticket sales, analyze revenue, and gain insights into LYNORA's overall growth."
      >
        <button
          type="button"
          onClick={exportReport}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6539D5] px-3.5 text-[10px] font-semibold text-white shadow-lg shadow-purple-950/30 transition hover:brightness-110 sm:text-[11px]"
        >
          <Icon src={ICONS.download} size={14} />
          Export Report
        </button>
      </AdminPageHero>

      {/* ==============================================
          FILTER SECTION
      ============================================== */}

      <section className="flex flex-col justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#11172D] p-3 sm:flex-row sm:items-center sm:px-4">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-white">
            Analytics Overview
          </h2>

          <p className="mt-1 text-[9px] text-slate-500">
            Select a period to view platform performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RangeSelector
            value={range}
            onChange={setRange}
          />

          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
            title="Refresh analytics"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#171D35] text-slate-300 transition hover:border-[#8B5CF6] hover:text-white disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""}>
              ↻
            </span>
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5">
          <p className="text-[10px] text-amber-300">
            Showing previously loaded data. Refresh failed: {error}
          </p>

          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="shrink-0 text-[10px] font-bold text-white underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ==============================================
          PLATFORM OVERVIEW
      ============================================== */}

      <section>
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-white">
              Platform Overview
            </h2>

            <p className="mt-0.5 text-[9px] text-slate-500">
              Overall platform statistics
            </p>
          </div>

          <span className="rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-2.5 py-1 text-[9px] font-semibold text-[#C4B5FD]">
            All Time
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
          <StatCard
            label="Total Users"
            value={formatNumber(stats?.total_users || 0)}
            icon={ICONS.users}
            tone="bg-violet-500/20"
            change={stats?.users_change ?? null}
          />

          <StatCard
            label="Total Organizers"
            value={formatNumber(stats?.total_organizers || 0)}
            icon={ICONS.organizers}
            tone="bg-indigo-500/20"
            change={stats?.organizers_change ?? null}
          />

          <StatCard
            label="Total Concerts"
            value={formatNumber(stats?.total_concerts || 0)}
            icon={ICONS.concerts}
            tone="bg-cyan-500/20"
            change={stats?.concerts_change ?? null}
          />

          <StatCard
            label="Tickets Sold"
            value={formatNumber(stats?.tickets_sold || 0)}
            icon={ICONS.tickets}
            tone="bg-emerald-500/20"
            change={stats?.tickets_sold_change ?? null}
          />

          <div className="col-span-2 xl:col-span-1">
            <StatCard
              label="Gross Revenue"
              value={compactMoney(stats?.gross_revenue || 0)}
              icon={ICONS.revenue}
              tone="bg-rose-500/20"
              change={stats?.revenue_change ?? null}
            />
          </div>
        </div>
      </section>

      {/* ==============================================
          SALES PERFORMANCE & ATTENDANCE
      ============================================== */}

      <div className="grid min-w-0 gap-3.5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">

        {/* SALES PERFORMANCE */}

        <Card
          title="Sales Performance"
          subtitle="Track ticket sales and revenue over time."
          action={
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.07] bg-[#0B1122] p-1">
              <button
                type="button"
                onClick={() => setMetric("revenue")}
                className={`rounded-md px-2.5 py-1.5 text-[9px] font-semibold transition ${
                  metric === "revenue"
                    ? "bg-[#6539D5] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Revenue
              </button>

              <button
                type="button"
                onClick={() => setMetric("tickets")}
                className={`rounded-md px-2.5 py-1.5 text-[9px] font-semibold transition ${
                  metric === "tickets"
                    ? "bg-[#6539D5] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Tickets
              </button>
            </div>
          }
          className={loading ? "opacity-70" : ""}
        >
          <SalesChart
            points={data.trend}
            metric={metric}
          />

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-3">
            <div className="rounded-lg bg-[#0B1122] p-3">
              <p className="text-[9px] text-slate-500">
                Period Revenue
              </p>

              <p className="mt-1 truncate text-sm font-bold text-white">
                {compactMoney(totalTrendRevenue)}
              </p>
            </div>

            <div className="rounded-lg bg-[#0B1122] p-3">
              <p className="text-[9px] text-slate-500">
                Period Tickets Sold
              </p>

              <p className="mt-1 text-sm font-bold text-white">
                {formatNumber(totalTrendTickets)}
              </p>
            </div>
          </div>
        </Card>

        {/* ATTENDANCE */}

        <Card
          title="Attendance Analytics"
          subtitle="Ticket check-in performance across the platform."
        >
          <AttendanceAnalytics
            attendance={data.attendance}
          />
        </Card>
      </div>

      {/* ==============================================
          PLATFORM GROWTH & CONCERT OVERVIEW
      ============================================== */}

      <div className="grid min-w-0 gap-3.5 lg:grid-cols-2">

        {/* PLATFORM GROWTH */}

        <Card
          title="Platform Growth"
          subtitle="Account distribution and user activity."
        >
          <div className="space-y-5">

            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-300">
                  Account Distribution
                </span>

                <span className="text-[9px] text-slate-500">
                  {formatNumber(stats?.total_users || 0)} total users
                </span>
              </div>

              <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#6539D5]"
                  style={{
                    width: `${userDistribution.customerPercent}%`,
                  }}
                />

                <div
                  className="h-full bg-[#22D3EE]"
                  style={{
                    width: `${userDistribution.organizerPercent}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#8B5CF6]" />

                  <span className="text-[9px] text-slate-400">
                    Customers ({formatNumber(userDistribution.customers)})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#22D3EE]" />

                  <span className="text-[9px] text-slate-400">
                    Organizers ({formatNumber(userDistribution.organizers)})
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.07] pt-4">
              <GrowthItem
                label="Active Customer Accounts"
                value={stats?.active_users || 0}
                percent={stats?.active_user_percent || 0}
                color="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE]"
              />

              <p className="mt-2 text-right text-[9px] text-slate-500">
                {stats?.active_user_percent || 0}% active customer accounts
              </p>
            </div>
          </div>
        </Card>

        {/* CONCERT OVERVIEW */}

        <Card
          title="Concert Overview"
          subtitle="Current event submission and approval overview."
        >
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-white/[0.05] bg-[#0B1122] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-400" />

                <p className="text-[9px] text-slate-400">
                  Total Concerts
                </p>
              </div>

              <p className="mt-2 text-xl font-extrabold text-white">
                {formatNumber(stats?.total_concerts || 0)}
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.05] bg-[#0B1122] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />

                <p className="text-[9px] text-slate-400">
                  Awaiting Approval
                </p>
              </div>

              <p className="mt-2 text-xl font-extrabold text-white">
                {formatNumber(stats?.pending_concerts || 0)}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                Approved / Processed
              </span>

              <span className="text-xs font-bold text-white">
                {formatNumber(
                  Math.max(
                    0,
                    (stats?.total_concerts || 0) -
                      (stats?.pending_concerts || 0)
                  )
                )}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE]"
                style={{
                  width: `${
                    stats?.total_concerts
                      ? Math.max(
                          0,
                          Math.min(
                            100,
                            ((stats.total_concerts -
                              stats.pending_concerts) /
                              stats.total_concerts) *
                              100
                          )
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <p className="text-[9px] leading-4 text-slate-500">
              This overview summarizes the current concert approval workload.
            </p>
          </div>
        </Card>
      </div>

      {/* ==============================================
          RECENT CONCERT OVERVIEW
      ============================================== */}

      <Card
        title="Recent Concert Overview"
        subtitle="Latest concert submissions and their current status."
        action={
          <a
            href="/admin/concerts"
            className="shrink-0 text-[10px] font-semibold text-[#A78BFA] transition hover:text-[#22D3EE]"
          >
            View All →
          </a>
        }
      >
        {data.concerts.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-slate-400">
              No concert data available.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: "32%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>

                <thead>
                  <tr className="bg-[#4025A5] text-[10px] font-bold text-white">
                    <th className="rounded-l-lg px-3 py-3">
                      Concert
                    </th>

                    <th className="px-3 py-3">
                      Organizer
                    </th>

                    <th className="px-3 py-3">
                      Category
                    </th>

                    <th className="px-3 py-3">
                      Event Date
                    </th>

                    <th className="rounded-r-lg px-3 py-3">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {data.concerts.slice(0, 6).map((concert) => (
                    <tr
                      key={concert.id}
                      className="text-[10px] transition hover:bg-white/[0.025]"
                    >
                      <td className="overflow-hidden px-3 py-3">
                        <p
                          className="truncate font-semibold text-slate-200"
                          title={concert.name}
                        >
                          {concert.name}
                        </p>

                        <p className="mt-1 truncate text-[9px] text-slate-500">
                          {concert.venue_name}
                        </p>
                      </td>

                      <td className="overflow-hidden px-3 py-3">
                        <span className="block truncate text-slate-300">
                          {concert.organizer_name}
                        </span>
                      </td>

                      <td className="overflow-hidden px-3 py-3">
                        <span className="block truncate text-slate-400">
                          {concert.category_name}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-slate-400">
                        {formatDate(concert.start_date)}
                      </td>

                      <td className="px-3 py-3">
                        <ConcertStatus
                          status={concert.display_status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}

            <div className="space-y-2 lg:hidden">
              {data.concerts.slice(0, 6).map((concert) => (
                <article
                  key={concert.id}
                  className="rounded-lg border border-white/[0.06] bg-[#0B1122] p-3"
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">
                        {concert.name}
                      </p>

                      <p className="mt-1 truncate text-[9px] text-slate-500">
                        {concert.organizer_name}
                      </p>
                    </div>

                    <ConcertStatus
                      status={concert.display_status}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3">
                    <div className="flex items-center gap-1.5">
                      <Icon src={ICONS.location} size={12} />

                      <span className="text-[9px] text-slate-400">
                        {concert.venue_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Icon src={ICONS.clock} size={12} />

                      <span className="text-[9px] text-slate-400">
                        {formatDate(concert.start_date)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* ==============================================
          FOOTER
      ============================================== */}

      <div className="flex flex-col justify-between gap-2 border-t border-white/[0.06] py-3 sm:flex-row sm:items-center">
        <p className="text-[9px] text-slate-500">
          LYNORA Super Admin · Reports & Analytics
        </p>

        <p className="text-[9px] text-slate-500">
          Data provided by LYNORA platform analytics
        </p>
      </div>
    </div>
  );
}
