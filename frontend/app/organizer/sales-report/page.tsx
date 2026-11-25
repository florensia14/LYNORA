
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

type Range = "7d" | "30d" | "90d" | "all";

type Concert = {
  id: number;
  name: string;
  poster_url?: string | null;
  start_date?: string;
  end_date?: string;
  category_name?: string;
  venue_name?: string;
  display_status?: string;
  status?: string;
  sold?: number;
  quota?: number;
  revenue?: number;
};

type Order = {
  id: number;
  order_code: string;
  customer_name?: string;
  event_names?: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
  payment_method?: string | null;
};

type Attendee = {
  ticket_id: number;
  ticket_status: string;
  event_id: number;
  event_name: string;
  checked_at?: string | null;
};

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const PAGE_SIZE = 7;

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function number(value: number) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function dateLabel(value?: string) {
  if (!value) return "Date TBA";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isPaid(status?: string) {
  return String(status || "").toLowerCase() === "paid";
}

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getDateStart(range: Range) {
  if (range === "all") return null;

  const date = new Date();
  date.setHours(0, 0, 0, 0);

  const days = range === "7d" ? 6 : range === "30d" ? 29 : 89;
  date.setDate(date.getDate() - days);

  return date;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function getConcertStatus(concert: Concert) {
  const raw = String(
    concert.display_status || concert.status || "Unknown"
  );

  const normalized = raw.toLowerCase().replace(/[_-]/g, " ");

  if (
    normalized.includes("publish") ||
    normalized === "active"
  ) {
    return "Published";
  }

  if (normalized.includes("complete")) return "Completed";
  if (normalized.includes("ongoing")) return "Ongoing";
  if (normalized.includes("pending")) return "Pending";
  if (normalized.includes("reject")) return "Rejected";
  if (normalized.includes("draft")) return "Draft";

  return raw;
}

function statusClass(status: string) {
  if (status === "Published" || status === "Ongoing") {
    return "border-[#26ADA0]/20 bg-[#152B32] text-[#42D6C5]";
  }

  if (status === "Completed") {
    return "border-[#8B5CF6]/20 bg-[#282044] text-[#C4B5FD]";
  }

  if (status === "Pending") {
    return "border-[#F5B84E]/20 bg-[#2E2723] text-[#F5B84E]";
  }

  if (status === "Rejected") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  }

  return "border-white/10 bg-white/[0.05] text-slate-400";
}

function MetricCard({
  title,
  value,
  icon,
  foot,
}: {
  title: string;
  value: string;
  icon: string;
  foot: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.07] bg-[#171F3B] p-4 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#35245F]">
          <img
            src={icon}
            alt=""
            className="h-5 w-5 object-contain"
          />
        </span>

        <p className="truncate text-[11px] font-medium text-slate-400">
          {title}
        </p>
      </div>

      <p className="mt-4 truncate text-xl font-bold text-white sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-slate-500">
        {foot}
      </p>
    </div>
  );
}

function Trend({
  orders,
  range,
}: {
  orders: Order[];
  range: Range;
}) {
  const start = getDateStart(range);
  const days = range === "7d" ? 7 : range === "90d" ? 12 : 30;

  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    if (range === "90d") {
      date.setDate(date.getDate() - (days - 1 - index) * 7);
    } else {
      date.setDate(date.getDate() - (days - 1 - index));
    }

    return {
      date,
      label:
        range === "90d"
          ? `${date.getDate()}/${date.getMonth() + 1}`
          : date.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
      total: 0,
    };
  });

  orders
    .filter(
      (order) =>
        isPaid(order.status) &&
        (!start || new Date(order.created_at) >= start)
    )
    .forEach((order) => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);

      const index = buckets.findIndex((bucket, i) => {
        if (range === "90d") {
          const nextDate =
            buckets[i + 1]?.date ||
            new Date(Date.now() + 86400000);

          return (
            orderDate >= bucket.date &&
            orderDate < nextDate
          );
        }

        return bucket.date.getTime() === orderDate.getTime();
      });

      if (index >= 0) {
        buckets[index].total += Number(order.quantity || 0);
      }
    });

  const max = Math.max(1, ...buckets.map((item) => item.total));

  const width = 640;
  const height = 210;
  const left = 38;
  const right = 12;
  const top = 14;
  const bottom = 30;

  const x = (index: number) =>
    left +
    (buckets.length <= 1
      ? 0
      : (index / (buckets.length - 1)) * (width - left - right));

  const y = (value: number) =>
    top +
    (1 - value / max) * (height - top - bottom);

  const linePath = buckets
    .map(
      (bucket, index) =>
        `${index === 0 ? "M" : "L"}${x(index)},${y(bucket.total)}`
    )
    .join(" ");

  const areaPath = `${linePath} L${x(buckets.length - 1)},${
    height - bottom
  } L${x(0)},${height - bottom} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Ticket sales trend"
      >
        <defs>
          <linearGradient
            id="sales-area-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#A855F7"
              stopOpacity=".38"
            />
            <stop
              offset="100%"
              stopColor="#A855F7"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((value) => (
          <g key={value}>
            <line
              x1={left}
              x2={width - right}
              y1={y(max * value)}
              y2={y(max * value)}
              stroke="rgba(255,255,255,.08)"
              strokeDasharray="3 4"
            />

            <text
              x={left - 8}
              y={y(max * value) + 3}
              fill="#71809F"
              fontSize="9"
              textAnchor="end"
            >
              {Math.round(max * value)}
            </text>
          </g>
        ))}

        <path
          d={areaPath}
          fill="url(#sales-area-gradient)"
        />

        <path
          d={linePath}
          fill="none"
          stroke="#B58BFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {buckets.map((bucket, index) => (
          <g key={bucket.label}>
            <circle
              cx={x(index)}
              cy={y(bucket.total)}
              r="3.2"
              fill="#D8C5FF"
            >
              <title>
                {bucket.label}: {bucket.total} tickets
              </title>
            </circle>

            {(index % Math.max(1, Math.ceil(buckets.length / 7)) === 0 ||
              index === buckets.length - 1) && (
              <text
                x={x(index)}
                y={height - 8}
                fill="#8190AA"
                fontSize="9"
                textAnchor="middle"
              >
                {bucket.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function Donut({
  checked,
  total,
}: {
  checked: number;
  total: number;
}) {
  const rate = total
    ? Math.round((checked / total) * 100)
    : 0;

  const circumference = 2 * Math.PI * 39;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="-rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r="39"
            fill="none"
            stroke="#293451"
            strokeWidth="12"
          />

          <circle
            cx="50"
            cy="50"
            r="39"
            fill="none"
            stroke="#B36BFF"
            strokeWidth="12"
            strokeDasharray={`${(circumference * rate) / 100} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <b className="text-xl text-white">{rate}%</b>
          <span className="text-[9px] text-slate-400">
            Attended
          </span>
        </div>
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <p className="text-slate-400">Checked-In</p>
          <b className="text-white">{number(checked)}</b>
        </div>

        <div>
          <p className="text-slate-400">Not Checked-In</p>
          <b className="text-white">
            {number(Math.max(0, total - checked))}
          </b>
        </div>

        <div>
          <p className="text-slate-400">Total Tickets</p>
          <b className="text-white">{number(total)}</b>
        </div>
      </div>
    </div>
  );
}

export default function OrganizerSalesReportPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  const [range, setRange] = useState<Range>("30d");
  const [eventId, setEventId] = useState("all");
  const [category, setCategory] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [concertResponse, orderResponse, attendeeResponse] =
        await Promise.all([
          fetch(`${API}/events/organizer/concerts`, {
            headers: authHeaders(),
            cache: "no-store",
          }),
          fetch(`${API}/orders/organizer-orders`, {
            headers: authHeaders(),
            cache: "no-store",
          }),
          fetch(`${API}/tickets/organizer/attendees`, {
            headers: authHeaders(),
            cache: "no-store",
          }),
        ]);

      const [concertPayload, orderPayload, attendeePayload] =
        await Promise.all([
          concertResponse.json(),
          orderResponse.json(),
          attendeeResponse.json(),
        ]);

      if (!concertResponse.ok) {
        throw new Error(
          concertPayload?.message || "Failed to load concerts."
        );
      }

      if (!orderResponse.ok) {
        throw new Error(
          orderPayload?.message || "Failed to load transactions."
        );
      }

      if (!attendeeResponse.ok) {
        throw new Error(
          attendeePayload?.message || "Failed to load attendance data."
        );
      }

      const concertRows = Array.isArray(concertPayload.concerts)
        ? concertPayload.concerts
        : Array.isArray(concertPayload.data)
          ? concertPayload.data
          : [];

      setConcerts(concertRows);
      setOrders(
        Array.isArray(orderPayload.data) ? orderPayload.data : []
      );
      setAttendees(
        Array.isArray(attendeePayload.data)
          ? attendeePayload.data
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load sales report."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [range, eventId, category]);

  const selectedConcert = useMemo(
    () => concerts.find((concert) => String(concert.id) === eventId),
    [concerts, eventId]
  );

  const filteredConcerts = useMemo(
    () =>
      concerts.filter((concert) => {
        const eventMatches =
          eventId === "all" || String(concert.id) === eventId;

        const categoryMatches =
          category === "all" ||
          concert.category_name === category;

        return eventMatches && categoryMatches;
      }),
    [concerts, eventId, category]
  );

  const filteredOrders = useMemo(() => {
    const start = getDateStart(range);

    return orders.filter((order) => {
      const dateMatches =
        !start || new Date(order.created_at) >= start;

      const eventMatches =
        eventId === "all" ||
        String(order.event_names || "")
          .toLowerCase()
          .includes(String(selectedConcert?.name || "").toLowerCase());

      const categoryMatches =
        category === "all" ||
        eventId !== "all" ||
        filteredConcerts.some((concert) =>
          String(order.event_names || "")
            .toLowerCase()
            .includes(concert.name.toLowerCase())
        );

      return dateMatches && eventMatches && categoryMatches;
    });
  }, [orders, range, eventId, category, selectedConcert, filteredConcerts]);

  const paidOrders = filteredOrders.filter((order) =>
    isPaid(order.status)
  );

  const totalTicketsSold = filteredConcerts.reduce(
    (sum, concert) => sum + Number(concert.sold || 0),
    0
  );

  const totalRevenue = filteredConcerts.reduce(
    (sum, concert) => sum + Number(concert.revenue || 0),
    0
  );

  const totalQuota = filteredConcerts.reduce(
    (sum, concert) => sum + Number(concert.quota || 0),
    0
  );

  const totalOrders = paidOrders.length;

  const averageOrderValue = totalOrders
    ? totalRevenue / totalOrders
    : 0;

  const attendance = useMemo(
    () =>
      attendees.filter((attendee) => {
        const eventMatches =
          eventId === "all" ||
          String(attendee.event_id) === eventId;

        const categoryMatches =
          category === "all" ||
          filteredConcerts.some(
            (concert) =>
              String(concert.id) === String(attendee.event_id)
          );

        return eventMatches && categoryMatches;
      }),
    [attendees, eventId, category, filteredConcerts]
  );

  const checkedIn = attendance.filter(
    (attendee) =>
      String(attendee.ticket_status).toLowerCase() === "used" ||
      Boolean(attendee.checked_at)
  ).length;

  const byConcert = filteredConcerts
    .map((concert) => {
      const sold = Number(concert.sold || 0);
      const quota = Number(concert.quota || 0);
      const revenue = Number(concert.revenue || 0);

      const matchedOrders = orders.filter(
        (order) =>
          isPaid(order.status) &&
          String(order.event_names || "")
            .toLowerCase()
            .includes(concert.name.toLowerCase())
      );

      return {
        concert,
        tickets: sold,
        quota,
        revenue,
        progress:
          quota > 0 ? Math.min(100, (sold / quota) * 100) : 0,
        orders: matchedOrders.length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const totalPages = Math.max(
    1,
    Math.ceil(byConcert.length / PAGE_SIZE)
  );

  const visible = byConcert.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const categories = Array.from(
    new Set(
      concerts
        .map((concert) => concert.category_name)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const exportCsv = () => {
    const rows = [
      [
        "Concert",
        "Concert Code",
        "Category",
        "Date",
        "Venue",
        "Tickets Sold",
        "Quota",
        "Sales Progress",
        "Gross Revenue",
        "Status",
      ],
      ...byConcert.map((row) => [
        row.concert.name,
        `CNS-${row.concert.id}`,
        row.concert.category_name || "",
        row.concert.start_date || "",
        row.concert.venue_name || "",
        row.tickets,
        row.quota,
        `${row.progress.toFixed(1)}%`,
        row.revenue,
        getConcertStatus(row.concert),
      ]),
    ];

    const csv = [
      "\uFEFF" +
        rows
          .map((row) => row.map(csvCell).join(","))
          .join("\r\n"),
    ];

    const blob = new Blob(csv, {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "lynora-sales-report.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#0B1122] px-4 py-5 text-white sm:px-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">

        {/* PAGE HERO */}
        <OrganizerPageHero
          eyebrow="ORGANIZER ANALYTICS"
          title={
            <>
              Sales{" "}
              <span className="bg-[linear-gradient(90deg,#A78BFA,#22D3EE)] bg-clip-text text-transparent">
                Report
              </span>
            </>
          }
          description="Monitor ticket sales, revenue performance, and attendance across your concerts."
          className="mb-0"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#202A4F] px-4 text-xs font-semibold text-slate-200 transition hover:border-[#8B5CF6]/50 hover:bg-[#29345C] disabled:opacity-50"
            >
              <span className={loading ? "animate-spin" : ""}>↻</span>
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || byConcert.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6338D5] px-4 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition hover:brightness-110 disabled:opacity-50"
            >
              <img
                src="/icons/direct-download.png"
                alt=""
                className="h-4 w-4 object-contain"
              />
              Export Data
            </button>
          </div>
        </OrganizerPageHero>

        {/* FILTERS */}
        <section className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-[#111A32] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Period
            </span>

            <div className="flex flex-wrap rounded-lg border border-white/10 bg-[#0B1122] p-1">
              {(
                [
                  { id: "7d", label: "7 Days" },
                  { id: "30d", label: "30 Days" },
                  { id: "90d", label: "90 Days" },
                  { id: "all", label: "All Time" },
                ] as { id: Range; label: string }[]
              ).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setRange(item.id)}
                  className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${
                    range === item.id
                      ? "bg-[#7546D8] text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className="h-9 min-w-[175px] rounded-lg border border-white/10 bg-[#0B1122] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]"
            >
              <option value="all">All Concerts</option>
              {concerts.map((concert) => (
                <option key={concert.id} value={concert.id}>
                  {concert.name}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-9 min-w-[145px] rounded-lg border border-white/10 bg-[#0B1122] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]"
            >
              <option value="all">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
            <button
              type="button"
              onClick={() => void load()}
              className="ml-3 font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* KPI CARDS */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            title="Tickets Sold"
            value={loading ? "—" : number(totalTicketsSold)}
            icon="/icons/ticket (1).png"
            foot={`From ${number(totalQuota)} total quota`}
          />

          <MetricCard
            title="Gross Revenue"
            value={loading ? "—" : money(totalRevenue)}
            icon="/icons/dollar.png"
            foot="Based on paid ticket sales"
          />

          <MetricCard
            title="Paid Orders"
            value={loading ? "—" : number(totalOrders)}
            icon="/icons/orders(1).png"
            foot="Orders in selected period"
          />

          <MetricCard
            title="Average Order Value"
            value={loading ? "—" : money(averageOrderValue)}
            icon="/icons/atm-card.png"
            foot="Revenue divided by paid orders"
          />
        </section>

        {/* CHARTS */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
          <div className="rounded-xl border border-white/[0.07] bg-[#111A32] p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Ticket Sales Trend
                </h2>
                <p className="mt-1 text-[10px] text-slate-500">
                  Ticket quantity from paid orders
                </p>
              </div>

              <span className="rounded-full border border-[#8B5CF6]/30 bg-[#2B2050] px-2.5 py-1 text-[9px] font-semibold text-[#C4B5FD]">
                Tickets Sold
              </span>
            </div>

            {loading ? (
              <div className="h-48 animate-pulse rounded-lg bg-white/[0.03]" />
            ) : (
              <Trend orders={filteredOrders} range={range} />
            )}
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#111A32] p-4 sm:p-5">
            <h2 className="text-sm font-bold text-white">
              Attendance Overview
            </h2>

            <p className="mt-1 text-[10px] text-slate-500">
              Check-in status for registered tickets
            </p>

            <div className="mt-5 flex min-h-[145px] items-center justify-center">
              {loading ? (
                <div className="h-28 w-28 animate-pulse rounded-full bg-white/[0.05]" />
              ) : (
                <Donut
                  checked={checkedIn}
                  total={attendance.length}
                />
              )}
            </div>
          </div>
        </section>

        {/* SALES BY CONCERT */}
        <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111A32] shadow-[0_12px_35px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8B5CF6]/15">
                <img
                  src="/icons/sales(1).png"
                  alt=""
                  className="h-5 w-5 object-contain"
                />
              </div>

              <div>
                <h2 className="text-sm font-bold text-white">
                  Sales by Concert
                </h2>
                <p className="mt-1 text-[10px] text-slate-500">
                  Ticket performance, sales revenue, and publication status
                </p>
              </div>
            </div>

            <span className="text-[10px] font-medium text-slate-400">
              {number(byConcert.length)} concerts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-gradient-to-r from-[#4A28B5] via-[#4930B9] to-[#3726A4] text-[9px] uppercase tracking-wider text-white">
                <tr>
                  <th className="px-4 py-3.5 font-bold">
                    Concert Details
                  </th>
                  <th className="px-3 py-3.5 font-bold">
                    Date & Venue
                  </th>
                  <th className="px-3 py-3.5 font-bold">
                    Tickets Sold
                  </th>
                  <th className="px-3 py-3.5 font-bold">
                    Gross Revenue
                  </th>
                  <th className="px-3 py-3.5 font-bold">
                    Status
                  </th>
                  <th className="px-3 py-3.5 text-center font-bold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-xs text-slate-500"
                    >
                      Loading sales report...
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-xs text-slate-500"
                    >
                      No concerts found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  visible.map(
                    ({
                      concert,
                      tickets,
                      quota,
                      revenue,
                      progress,
                    }) => {
                      const status = getConcertStatus(concert);

                      return (
                        <tr
                          key={concert.id}
                          className="transition-colors hover:bg-[#202A4F]/35"
                        >
                          {/* CONCERT DETAILS */}
                          <td className="px-4 py-3.5">
                            <div className="flex min-w-[210px] items-center gap-3">
                              <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#202A4F]">
                                {concert.poster_url ? (
                                  <img
                                    src={concert.poster_url}
                                    alt={concert.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <img
                                      src="/icons/ticket (1).png"
                                      alt=""
                                      className="h-5 w-5 object-contain opacity-60"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[190px] truncate text-xs font-bold text-white">
                                  {concert.name}
                                </p>

                                <p className="mt-1 text-[9px] text-slate-400">
                                  {concert.category_name || "Uncategorized"}
                                </p>

                                <p className="mt-0.5 text-[9px] text-slate-600">
                                  CNS-{concert.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* DATE & VENUE */}
                          <td className="px-3 py-3.5">
                            <div className="min-w-[130px] space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <img
                                  src="/icons/calendar (1).png"
                                  alt=""
                                  className="h-3 w-3 object-contain opacity-70"
                                />
                                <span className="text-[10px] text-slate-300">
                                  {dateLabel(concert.start_date)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <img
                                  src="/icons/location.png"
                                  alt=""
                                  className="h-3 w-3 object-contain opacity-70"
                                />
                                <span className="max-w-[145px] truncate text-[9px] text-slate-500">
                                  {concert.venue_name || "Venue TBA"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* TICKETS SOLD */}
                          <td className="px-3 py-3.5">
                            <div className="w-[145px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-white">
                                  {number(tickets)}
                                </span>

                                <span className="text-[9px] text-slate-500">
                                  / {number(quota)}
                                </span>
                              </div>

                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#293451]">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#26ADA0] transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>

                              <p className="mt-1 text-[8px] font-medium text-[#22D3EE]">
                                {progress.toFixed(1)}% sold
                              </p>
                            </div>
                          </td>

                          {/* REVENUE */}
                          <td className="whitespace-nowrap px-3 py-3.5">
                            <p className="text-xs font-bold text-white">
                              {money(revenue)}
                            </p>
                            <p className="mt-1 text-[9px] text-slate-500">
                              Paid ticket sales
                            </p>
                          </td>

                          {/* STATUS */}
                          <td className="px-3 py-3.5">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-bold ${statusClass(status)}`}
                            >
                              {status}
                            </span>
                          </td>

                          {/* ACTION */}
                          <td className="px-3 py-3.5 text-center">
                            <Link
                              href={`/organizer/sales-report/${concert.id}`}
                              title={`View sales detail for ${concert.name}`}
                              aria-label={`View sales detail for ${concert.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#202A4F]/70 transition hover:border-[#8B5CF6]/60 hover:bg-[#8B5CF6]/20"
                            >
                              <img
                                src="/icons/eye (1).png"
                                alt=""
                                className="h-4 w-4 object-contain"
                              />
                            </Link>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-slate-500">
              Showing{" "}
              {byConcert.length
                ? (page - 1) * PAGE_SIZE + 1
                : 0}
              {"–"}
              {Math.min(page * PAGE_SIZE, byConcert.length)}
              {" "}of {byConcert.length} concerts
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                className="rounded-md border border-white/10 px-3 py-1.5 text-[10px] text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Prev
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              )
                .slice(0, 5)
                .map((pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`h-7 min-w-7 rounded-md px-2 text-[10px] font-bold transition ${
                      page === pageNumber
                        ? "bg-[#7546D8] text-white shadow-lg shadow-purple-950/30"
                        : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

              <button
                type="button"
                disabled={page === totalPages}
                onClick={() =>
                  setPage((current) =>
                    Math.min(totalPages, current + 1)
                  )
                }
                className="rounded-md border border-white/10 px-3 py-1.5 text-[10px] text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <p className="text-center text-[9px] text-slate-600">
          Concert sales are calculated from paid ticket items and organizer concert data.
        </p>
      </div>
    </main>
  );
}
