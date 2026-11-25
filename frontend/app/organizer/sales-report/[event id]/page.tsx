
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

type EventInfo = {
  id: number;
  name: string;
  description?: string;
  poster_url?: string | null;
  start_date?: string;
  end_date?: string;
  status?: string;
  venue_name?: string;
  venue_address?: string;
  category_name?: string;
};

type Category = {
  id: number;
  name: string;
  price: number;
  quota: number;
  sold: number;
  remaining: number;
  revenue: number;
};

type Transaction = {
  id: number;
  order_code: string;
  status: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  quantity: number;
  event_amount: number;
  payment_method?: string | null;
  payment_status?: string | null;
};

type SalesData = {
  event: EventInfo;
  summary: {
    tickets_sold: number;
    gross_revenue: number;
    paid_orders: number;
    average_order_value: number;
    refunded_amount: number;
    refunded_orders: number;
  };
  categories: Category[];
  trend: {
    date: string;
    tickets: number;
    revenue: number;
  }[];
  payments: {
    payment_type: string;
    payment_label: string;
    orders: number;
    amount: number;
  }[];
  attendance: {
    total_tickets: number;
    checked_in: number;
    not_checked_in: number;
    progress: number;
  };
  transactions: Transaction[];
};

const API = (() => {
  const configured = (
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000/api"
  )
    .trim()
    .replace(/\/+$/, "");

  return /\/api$/i.test(configured)
    ? configured
    : `${configured}/api`;
})();

const API_ORIGIN = API.replace(/\/api\/?$/i, "");

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const number = (value: number) =>
  new Intl.NumberFormat("id-ID").format(Number(value || 0));

const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/* =========================================================
   POSTER URL HANDLER
========================================================= */

function getPosterUrl(path?: string | null): string | null {
  if (!path) return null;

  const value = String(path).trim();

  if (!value) return null;

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }

  return `${API_ORIGIN}/${value.replace(/^\/+/, "")}`;
}

function PosterThumbnail({
  posterUrl,
  title,
}: {
  posterUrl?: string | null;
  title: string;
}) {
  const [failed, setFailed] = useState(false);

  const src = getPosterUrl(posterUrl);

  if (!src || failed) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#202A4F] text-xl text-slate-300">
        ♫
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${title} poster`}
      className="h-14 w-14 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}

/* =========================================================
   AUTH
========================================================= */

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") ||
        localStorage.getItem("accessToken")
      : null;

  return {
    Accept: "application/json",
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
  };
}

/* =========================================================
   METRIC CARD
========================================================= */

function Metric({
  label,
  value,
  helper,
  icon,
  tone = "purple",
}: {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone?: "purple" | "cyan" | "blue" | "yellow";
}) {
  const tones = {
    purple: "bg-[#282044]",
    cyan: "bg-[#152B32]",
    blue: "bg-[#202A4F]",
    yellow: "bg-[#2E2723]",
  };

  return (
    <article className="min-w-0 rounded-xl border border-white/[0.07] bg-[#151C36] p-4 shadow-[0_8px_22px_rgba(0,0,0,.1)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          <img
            src={icon}
            alt=""
            className="h-5 w-5 object-contain"
          />
        </span>
      </div>

      <p className="mt-3 truncate text-xl font-extrabold text-white sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-slate-500">
        {helper}
      </p>
    </article>
  );
}

/* =========================================================
   STATUS
========================================================= */

function Status({ value }: { value: string }) {
  const status = String(value || "").toLowerCase();

  const style =
    status === "paid"
      ? "border-[#26ADA0]/25 bg-[#152B32] text-[#42D6C5]"
      : status === "pending"
        ? "border-[#F5B84E]/25 bg-[#2E2723] text-[#F5B84E]"
        : status === "refunded"
          ? "border-[#8B5CF6]/25 bg-[#282044] text-[#C4B5FD]"
          : "border-rose-400/20 bg-rose-500/10 text-rose-300";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold capitalize ${style}`}
    >
      {status || "unknown"}
    </span>
  );
}

/* =========================================================
   SALES TREND CHART
========================================================= */

function TrendChart({
  rows,
}: {
  rows: SalesData["trend"];
}) {
  const values = useMemo(() => {
    const map = new Map(
      rows.map((row) => [
        String(row.date).slice(0, 10),
        row,
      ])
    );

    return Array.from({ length: 30 }, (_, index) => {
      const d = new Date();

      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (29 - index));

      const key = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

      return {
        key,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        tickets: Number(map.get(key)?.tickets || 0),
      };
    });
  }, [rows]);

  const max = Math.max(
    1,
    ...values.map((item) => item.tickets)
  );

  const W = 640;
  const H = 190;
  const L = 28;
  const R = 10;
  const T = 12;
  const B = 26;

  const x = (i: number) =>
    L + (i / 29) * (W - L - R);

  const y = (v: number) =>
    T + (1 - v / max) * (H - T - B);

  const path = values
    .map(
      (item, i) =>
        `${i ? "L" : "M"}${x(i)},${y(item.tickets)}`
    )
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Ticket sales for the last 30 days"
    >
      <defs>
        <linearGradient
          id="detail-sales-area"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="#A78BFA"
            stopOpacity=".35"
          />
          <stop
            offset="100%"
            stopColor="#A78BFA"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((part) => (
        <line
          key={part}
          x1={L}
          x2={W - R}
          y1={y(max * part)}
          y2={y(max * part)}
          stroke="rgba(255,255,255,.08)"
          strokeDasharray="3 4"
        />
      ))}

      <path
        d={`${path} L${x(29)},${H - B} L${x(0)},${H - B} Z`}
        fill="url(#detail-sales-area)"
      />

      <path
        d={path}
        fill="none"
        stroke="#B58BFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {values
        .filter((_, i) => i % 5 === 0 || i === 29)
        .map((item) => (
          <text
            key={item.key}
            x={x(
              values.findIndex(
                (v) => v.key === item.key
              )
            )}
            y={H - 7}
            fill="#8190AA"
            fontSize="9"
            textAnchor="middle"
          >
            {item.label}
          </text>
        ))}
    </svg>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function OrganizerSalesDetailPage() {
  const params = useParams<Record<string, string | string[]>>();
  const pathname = usePathname();
  const router = useRouter();

  const routeParam = params?.eventId;
  const pathParts =
    pathname?.split("/").filter(Boolean) || [];

  const pathSegment =
    pathParts[pathParts.length - 1] || "";

  const eventId = String(
    Array.isArray(routeParam)
      ? routeParam[0]
      : routeParam || pathSegment
  ).trim();

  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD SALES DETAIL
  ======================================================= */

  const load = useCallback(async (refresh = false) => {
    if (!eventId || !/^\d+$/.test(eventId)) {
      setLoading(false);
      setData(null);

      setError(
        "ID konser tidak ditemukan pada URL. Pastikan halaman dibuka dari tombol detail di Sales Report."
      );

      return;
    }

    refresh
      ? setRefreshing(true)
      : setLoading(true);

    setError("");

    try {
      const response = await fetch(
        `${API}/orders/organizer-sales/${encodeURIComponent(eventId)}`,
        {
          method: "GET",
          headers: authHeaders(),
          cache: "no-store",
        }
      );

      const responseText = await response.text();

      let payload: any = {};

      try {
        payload = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error(
          `Server mengirim respons yang bukan JSON (HTTP ${response.status}). Periksa URL API dan backend.`
        );
      }

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          throw new Error(
            "Akses ditolak. Login kembali menggunakan akun Event Organizer."
          );
        }

        throw new Error(
          payload?.message ||
            `Gagal memuat sales detail (HTTP ${response.status}).`
        );
      }

      if (!payload?.success || !payload?.data?.event) {
        throw new Error(
          payload?.message ||
            "Data konser tidak ditemukan atau respons API tidak sesuai."
        );
      }

      setData(payload.data as SalesData);
    } catch (err) {
      setData(null);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat sales detail."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* =======================================================
     EXPORT CSV
  ======================================================= */

  const exportCsv = () => {
    if (!data) return;

    const lines = [
      [
        "Order Code",
        "Customer",
        "Email",
        "Status",
        "Tickets",
        "Concert Revenue",
        "Created At",
      ],
      ...data.transactions.map((row) => [
        row.order_code,
        row.customer_name,
        row.customer_email,
        row.status,
        row.quantity,
        row.event_amount,
        row.created_at,
      ]),
    ];

    const csv = lines
      .map((line) =>
        line
          .map(
            (value) =>
              `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      })
    );

    const link = document.createElement("a");

    link.href = url;
    link.download = `lynora-sales-${eventId}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const event = data?.event;
  const summary = data?.summary;
  const attendance = data?.attendance;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen min-w-0 space-y-5 overflow-x-hidden pb-10 text-white">
      <div className="space-y-5">

        {/* PAGE HERO */}

        <OrganizerPageHero
          eyebrow="ORGANIZER MANAGEMENT"
          title="Sales Detail"
          description="Explore ticket sales, revenue, payment activity, and attendance for this concert."
        >
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-[#111A32]/75 px-4 text-xs font-bold text-white transition hover:border-[#8B5CF6]/60 disabled:opacity-40"
          >
            <img
              src="/icons/direct-download.png"
              alt=""
              className="h-4 w-4 object-contain"
            />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#5456DE] px-4 text-xs font-bold text-white transition hover:bg-[#6668F0] disabled:opacity-50"
          >
            <img
              src="/icons/time-left.png"
              alt=""
              className={`h-4 w-4 object-contain ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </OrganizerPageHero>

        {/* SELECTED CONCERT */}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#151C36] p-3.5 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <PosterThumbnail
              posterUrl={event?.poster_url}
              title={event?.name || "Concert"}
            />

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Selected Concert
              </p>

              <h2 className="mt-1 truncate text-sm font-bold text-white">
                {loading
                  ? "Loading concert..."
                  : event?.name || "Concert unavailable"}
              </h2>

              <p className="mt-1 truncate text-[10px] text-slate-400">
                {event
                  ? `${date(event.start_date)} · ${
                      event.venue_name || "Venue unavailable"
                    }`
                  : "—"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/organizer/sales-report")
            }
            className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-[#8B5CF6]/50 hover:text-white"
          >
            ← Back to Sales Report
          </button>
        </div>

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

        {/* KPI */}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric
            label="Tickets Sold"
            value={
              loading
                ? "—"
                : number(summary?.tickets_sold || 0)
            }
            helper="Paid tickets for this concert"
            icon="/icons/ticket (1).png"
            tone="blue"
          />

          <Metric
            label="Gross Revenue"
            value={
              loading
                ? "—"
                : money(summary?.gross_revenue || 0)
            }
            helper="From this concert's paid items"
            icon="/icons/dollar.png"
            tone="cyan"
          />

          <Metric
            label="Paid Orders"
            value={
              loading
                ? "—"
                : number(summary?.paid_orders || 0)
            }
            helper="Orders containing this concert"
            icon="/icons/orders (1).png"
            tone="purple"
          />

          <Metric
            label="Average Order Value"
            value={
              loading
                ? "—"
                : money(summary?.average_order_value || 0)
            }
            helper="Concert revenue per paid order"
            icon="/icons/atm-card.png"
            tone="yellow"
          />
        </section>

        {/* TREND + ATTENDANCE */}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">

          <div className="rounded-xl border border-white/[0.07] bg-[#111A32] p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold">
                Ticket Sales Trend
              </h2>

              <p className="mt-1 text-[10px] text-slate-500">
                Daily paid ticket quantity · last 30 days
              </p>
            </div>

            {loading ? (
              <div className="h-44 animate-pulse rounded-lg bg-white/[0.03]" />
            ) : data?.trend.length ? (
              <TrendChart rows={data.trend} />
            ) : (
              <p className="py-16 text-center text-xs text-slate-500">
                No paid sales recorded in the last 30 days.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#111A32] p-4 sm:p-5">
            <h2 className="text-sm font-bold">
              Attendance Overview
            </h2>

            <p className="mt-1 text-[10px] text-slate-500">
              Ticket check-in progress for this concert
            </p>

            <div className="mt-5 flex items-center gap-4">
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
                    strokeWidth="11"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="39"
                    fill="none"
                    stroke="#A78BFA"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={`${
                      2 *
                      Math.PI *
                      39 *
                      (Number(attendance?.progress || 0) / 100)
                    } ${2 * Math.PI * 39}`}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <b className="text-xl">
                    {loading
                      ? "—"
                      : `${Number(attendance?.progress || 0)}%`}
                  </b>

                  <span className="text-[9px] text-slate-500">
                    Checked-in
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-slate-500">Checked-In</p>
                  <b>{number(attendance?.checked_in || 0)}</b>
                </div>

                <div>
                  <p className="text-slate-500">
                    Not Checked-In
                  </p>
                  <b>
                    {number(attendance?.not_checked_in || 0)}
                  </b>
                </div>

                <div>
                  <p className="text-slate-500">
                    Total Tickets
                  </p>
                  <b>
                    {number(attendance?.total_tickets || 0)}
                  </b>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORY + PAYMENT */}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">

          {/* CATEGORY */}

          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111A32]">
            <div className="border-b border-white/[0.07] px-4 py-4">
              <h2 className="text-sm font-bold">
                Ticket Category Breakdown
              </h2>

              <p className="mt-1 text-[10px] text-slate-500">
                Sales and remaining quota by ticket category
              </p>
            </div>

            {loading ? (
              <div className="space-y-3 p-4">
                <div className="h-10 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-10 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ) : !data?.categories.length ? (
              <p className="p-8 text-center text-xs text-slate-500">
                No ticket categories found.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {data.categories.map((category) => {
                  const percent = category.quota
                    ? Math.min(
                        100,
                        (category.sold / category.quota) * 100
                      )
                    : 0;

                  return (
                    <div
                      key={category.id}
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">
                            {category.name}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-500">
                            {money(category.price)} per ticket
                          </p>
                        </div>

                        <p className="shrink-0 text-xs font-bold text-white">
                          {number(category.sold)}

                          <span className="font-normal text-slate-500">
                            {" "}/ {number(category.quota)}
                          </span>
                        </p>
                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#252E4A]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="mt-2 flex justify-between gap-2 text-[9px] text-slate-500">
                        <span>
                          {number(category.remaining)} remaining
                        </span>

                        <span>
                          {money(category.revenue)} revenue
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PAYMENT */}

          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111A32]">
            <div className="border-b border-white/[0.07] px-4 py-4">
              <h2 className="text-sm font-bold">
                Payment Summary
              </h2>

              <p className="mt-1 text-[10px] text-slate-500">
                Payment methods from paid orders
              </p>
            </div>

            {loading ? (
              <div className="space-y-3 p-4">
                <div className="h-10 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-10 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ) : !data?.payments.length ? (
              <p className="p-8 text-center text-xs text-slate-500">
                No payment records found.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {data.payments.map((payment) => (
                  <div
                    key={payment.payment_type}
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-200">
                        {payment.payment_label}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">
                        {number(payment.orders)} paid orders
                      </p>
                    </div>

                    <p className="shrink-0 text-xs font-bold text-white">
                      {money(payment.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-white/[0.06] px-4 py-3">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">
                  Refunded orders
                </span>

                <span className="font-semibold text-[#C4B5FD]">
                  {number(summary?.refunded_orders || 0)}
                </span>
              </div>

              <div className="mt-1 flex justify-between text-[10px]">
                <span className="text-slate-500">
                  Refunded amount
                </span>

                <span className="font-semibold text-[#C4B5FD]">
                  {money(summary?.refunded_amount || 0)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* RECENT TRANSACTIONS */}

        <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111A32]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-bold">
                Recent Transactions
              </h2>

              <p className="mt-1 text-[10px] text-slate-500">
                Latest orders containing tickets for this concert
              </p>
            </div>

            <Link
              href={`/organizer/orders?concert=${eventId}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#5456DE] px-3 text-[10px] font-bold text-white transition hover:bg-[#6668F0]"
            >
              View All Orders
              <span>↗</span>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 p-4">
              <div className="h-12 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-12 animate-pulse rounded bg-white/[0.04]" />
            </div>
          ) : !data?.transactions.length ? (
            <p className="p-10 text-center text-xs text-slate-500">
              No transactions found for this concert.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="bg-[#171F3B] text-[9px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {[
                        "Order ID",
                        "Customer",
                        "Date",
                        "Tickets",
                        "Concert Amount",
                        "Status",
                      ].map((label) => (
                        <th
                          key={label}
                          className="px-4 py-3 font-semibold"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.05]">
                    {data.transactions.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 text-[10px] font-bold text-[#B9A8FF]">
                          {row.order_code}
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-200">
                            {row.customer_name}
                          </p>

                          <p className="mt-1 text-[9px] text-slate-500">
                            {row.customer_email}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-[10px] text-slate-400">
                          {dateTime(row.created_at)}
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-300">
                          {number(row.quantity)}
                        </td>

                        <td className="px-4 py-3 text-xs font-semibold text-white">
                          {money(row.event_amount)}
                        </td>

                        <td className="px-4 py-3">
                          <Status value={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-white/[0.06] px-4 py-3 text-[10px] text-slate-500">
                Showing latest {data.transactions.length} transactions.
              </div>
            </>
          )}
        </section>

        <p className="text-center text-[9px] text-slate-600">
          Sales values are calculated from this concert's order items.
          Only paid orders contribute to ticket sales and gross revenue.
        </p>
      </div>
    </main>
  );
}
