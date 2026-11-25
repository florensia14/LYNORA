"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageHero from "@/components/layout/AdminPageHero";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const PAGE_SIZE = 8;

type OrderStatus = "paid" | "pending" | "failed" | "refunded" | "cancelled" | "expired";
type OrderRow = {
  id: number;
  order_code: string;
  customer_name: string;
  customer_email: string;
  concert_name: string;
  poster_url?: string | null;
  quantity: number;
  total_amount: number;
  order_status: OrderStatus;
  payment_status: string;
  payment_method: string;
  transaction_date: string;
  transaction_id?: string | null;
};
type Summary = {
  total_orders: number;
  total_transactions: number;
  successful_payments: number;
  failed_pending: number;
};
type Detail = {
  order: OrderRow;
  items: Array<{
    concert_name: string;
    ticket_category: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
};

const ICON = {
  orders: "/icons/orders.png",
  money: "/icons/dollar.png",
  success: "/icons/check (1).png",
  failed: "/icons/close.png",
  search: "/icons/search.png",
  calendar: "/icons/calendar.png",
  eye: "/icons/eye (1).png",
  download: "/icons/direct-download.png",
  ticket: "/icons/ticket.png",
};

function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data as T;
}

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function dateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function Icon({ src, size = 18 }: { src: string; size?: number }) {
  return <img src={src} alt="" width={size} height={size} className="shrink-0 object-contain" />;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "pending").toLowerCase();
  const config: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-400",
    success: "bg-emerald-500/15 text-emerald-400",
    pending: "bg-amber-500/15 text-amber-300",
    failed: "bg-rose-500/15 text-rose-400",
    cancelled: "bg-rose-500/15 text-rose-400",
    expired: "bg-slate-500/20 text-slate-300",
    refunded: "bg-violet-500/15 text-violet-300",
  };
  const label: Record<string, string> = {
    paid: "Paid",
    success: "Paid",
    pending: "Pending",
    failed: "Failed",
    cancelled: "Failed",
    expired: "Expired",
    refunded: "Refunded",
  };
  return (
    <span className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold ${config[normalized] || config.pending}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label[normalized] || normalized}
    </span>
  );
}

function StatCard({ label, value, icon, tone, suffix }: {
  label: string; value: string; icon: string; tone: string; suffix?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-[#11172D] p-3 shadow-lg shadow-black/10">
      <div className="flex items-center gap-2.5">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}>
          <Icon src={icon} size={19} />
        </div>
        <p className="truncate text-[10px] font-medium text-slate-400 sm:text-xs">{label}</p>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">{value}</p>
        {suffix && <span className="mb-1 text-[9px] text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}

export default function OrdersTransactionsPage() {
  const [summary, setSummary] = useState<Summary>({
    total_orders: 0, total_transactions: 0, successful_payments: 0, failed_pending: 0,
  });
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [concerts, setConcerts] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [eventId, setEventId] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status: tab,
        search,
        payment_status: paymentStatus,
        event_id: eventId,
        date: dateFilter,
      });
      const result = await request<{
        success: boolean; summary: Summary; data: OrderRow[]; pagination: { total: number };
      }>(`/orders/admin?${params.toString()}`);
      setSummary(result.summary);
      setRows(result.data || []);
      setTotal(Number(result.pagination?.total || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [page, tab, search, paymentStatus, eventId, dateFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    request<{ success: boolean; data: Array<{ id: number; name: string }> }>("/admin/orders/events")
      .then((result) => setConcerts(result.data || []))
      .catch(() => setConcerts([]));
  }, []);

  useEffect(() => { setPage(1); }, [tab, search, paymentStatus, eventId, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function viewOrder(id: number) {
    setDetailLoading(true);
    try {
      const result = await request<Detail>(`/orders/admin/${id}`);
      setSelected(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order details.");
    } finally {
      setDetailLoading(false);
    }
  }

  function exportCsv() {
    const headers = ["Order ID", "Customer", "Email", "Concert", "Tickets", "Total Payment", "Payment Method", "Status", "Transaction Date", "Transaction ID"];
    const csvRows = rows.map((row) => [
      row.order_code, row.customer_name, row.customer_email, row.concert_name,
      row.quantity, row.total_amount, row.payment_method, row.order_status,
      row.transaction_date, row.transaction_id || "",
    ]);
    const csv = [headers, ...csvRows].map((line) =>
      line.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lynora-orders-page-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const tabs = [
    ["all", "All Orders"],
    ["paid", "Paid"],
    ["pending", "Pending"],
    ["failed", "Failed"],
    ["refunded", "Refunded"],
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-4 text-white">
      <AdminPageHero
        eyebrow="LYNORA SUPER ADMIN"
        title={
          <>
            Orders{" "}
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">
              & Transactions
            </span>
          </>
        }
        description="Monitor customer orders, payment status, and transaction activity across LYNORA."
      />

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard label="Total Orders" value={summary.total_orders.toLocaleString("en-US")} icon={ICON.orders} tone="bg-violet-500/20" />
        <StatCard label="Total Transactions" value={money(summary.total_transactions)} icon={ICON.money} tone="bg-indigo-500/20" />
        <StatCard label="Successful Payments" value={summary.successful_payments.toLocaleString("en-US")} icon={ICON.success} tone="bg-emerald-500/20" />
        <StatCard label="Failed / Pending" value={summary.failed_pending.toLocaleString("en-US")} icon={ICON.failed} tone="bg-rose-500/20" />
      </section>

      <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#11172D] p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {tabs.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setTab(value)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition sm:text-xs ${tab === value ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-lg shadow-purple-950/30" : "border border-white/10 bg-[#171D35] text-slate-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(150px,175px)_minmax(150px,190px)_minmax(145px,160px)_auto]">
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"><Icon src={ICON.search} size={15} /></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID, transaction ID, or concert..."
              className="h-10 w-full min-w-0 rounded-lg border border-[#303858] bg-[#0B1122] pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#8B5CF6]" />
          </div>
          <div className="relative min-w-0">
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
              className="h-10 w-full min-w-0 appearance-none rounded-lg border border-[#303858] bg-[#171D35] py-2 pl-3 pr-10 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]">
              <option value="all">All Payment Status</option><option value="success">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-slate-300 h-2 w-2" />
          </div>
          <div className="relative min-w-0">
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}
              className="h-10 w-full min-w-0 appearance-none rounded-lg border border-[#303858] bg-[#171D35] py-2 pl-3 pr-10 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]">
              <option value="all">All Concerts</option>
              {concerts.map((concert) => <option key={concert.id} value={concert.id}>{concert.name}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-slate-300 h-2 w-2" />
          </div>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 w-full min-w-0 rounded-lg border border-[#303858] bg-[#171D35] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]" />
          <button type="button" onClick={exportCsv}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#8B5CF6]/50 bg-[#21163D] px-3 text-xs font-semibold text-[#C4B5FD] transition hover:bg-[#33205D] sm:col-span-2 xl:col-span-1">
            <Icon src={ICON.download} size={14} /> Export
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}

        <div className="hidden w-full min-w-0 overflow-hidden xl:block">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "12%" }} /><col style={{ width: "15%" }} /><col style={{ width: "17%" }} />
              <col style={{ width: "6%" }} /><col style={{ width: "12%" }} /><col style={{ width: "10%" }} />
              <col style={{ width: "9%" }} /><col style={{ width: "13%" }} /><col style={{ width: "6%" }} />
            </colgroup>
            <thead><tr className="bg-[#4025A5] text-[10px] font-bold text-white">
              <th className="rounded-l-lg px-2 py-3">Order ID</th><th className="px-2 py-3">Customer</th><th className="px-2 py-3">Concert</th>
              <th className="px-1 py-3 text-center">Tickets</th><th className="px-2 py-3">Total Payment</th><th className="px-2 py-3">Payment Method</th>
              <th className="px-1 py-3">Status</th><th className="px-2 py-3">Transaction Date</th><th className="rounded-r-lg px-1 py-3 text-center">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? <tr><td colSpan={9} className="py-12 text-center text-xs text-slate-400">Loading orders...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={9} className="py-12 text-center text-xs text-slate-400">No orders found.</td></tr>
              : rows.map((row) => <tr key={row.id} className="text-[11px] transition hover:bg-white/[0.025]">
                  <td className="overflow-hidden px-2 py-3 font-semibold text-slate-200"><span className="block truncate" title={row.order_code}>{row.order_code}</span></td>
                  <td className="overflow-hidden px-2 py-3"><p className="truncate font-semibold text-slate-200" title={row.customer_name}>{row.customer_name}</p><p className="truncate text-[9px] text-slate-500" title={row.customer_email}>{row.customer_email}</p></td>
                  <td className="overflow-hidden px-2 py-3"><div className="flex min-w-0 items-center gap-2">{row.poster_url ? <img src={row.poster_url.startsWith("http") ? row.poster_url : `${API_BASE.replace(/\/api$/, "")}${row.poster_url}`} alt="" className="h-8 w-8 shrink-0 rounded object-cover" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-[#28204B]"><Icon src={ICON.ticket} size={14} /></span>}<span className="min-w-0 truncate text-slate-300" title={row.concert_name}>{row.concert_name || "-"}</span></div></td>
                  <td className="px-1 py-3 text-center text-slate-300">{row.quantity}</td>
                  <td className="overflow-hidden px-2 py-3 font-semibold text-slate-200"><span className="block truncate" title={money(row.total_amount)}>{money(row.total_amount)}</span></td>
                  <td className="overflow-hidden px-2 py-3 text-slate-400"><span className="block truncate" title={row.payment_method || "Not available"}>{row.payment_method || "Not available"}</span></td>
                  <td className="px-1 py-3"><StatusBadge status={row.order_status} /></td>
                  <td className="overflow-hidden px-2 py-3 text-slate-400"><span className="block truncate" title={dateTime(row.transaction_date)}>{dateTime(row.transaction_date)}</span></td>
                  <td className="px-1 py-3"><div className="flex items-center justify-center"><button type="button" onClick={() => viewOrder(row.id)} title="View order details" className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-[#171D35] hover:border-[#8B5CF6]"><Icon src={ICON.eye} size={15} /></button></div></td>
                </tr>)}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 xl:hidden">
          {loading ? <div className="py-10 text-center text-xs text-slate-400">Loading orders...</div>
          : rows.length === 0 ? <div className="py-10 text-center text-xs text-slate-400">No orders found.</div>
          : rows.map((row) => <article key={row.id} className="min-w-0 rounded-xl border border-white/[0.07] bg-[#0D1429] p-3 sm:p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Order ID</p><p className="mt-1 break-all text-xs font-bold text-white">{row.order_code}</p></div>
                <StatusBadge status={row.order_status} />
              </div>
              <div className="mt-3 flex min-w-0 items-center gap-3 border-t border-white/[0.06] pt-3">
                {row.poster_url ? <img src={row.poster_url.startsWith("http") ? row.poster_url : `${API_BASE.replace(/\/api$/, "")}${row.poster_url}`} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#28204B]"><Icon src={ICON.ticket} size={18} /></span>}
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{row.concert_name || "-"}</p><p className="mt-1 truncate text-[10px] text-slate-400">{row.customer_name} · {row.customer_email}</p></div>
                <button type="button" onClick={() => viewOrder(row.id)} aria-label="View order details" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#171D35] hover:border-[#8B5CF6]"><Icon src={ICON.eye} size={16} /></button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3">
                <div><p className="text-[9px] text-slate-500">Tickets</p><p className="mt-0.5 text-xs font-semibold text-slate-200">{row.quantity}</p></div>
                <div><p className="text-[9px] text-slate-500">Total Payment</p><p className="mt-0.5 text-xs font-semibold text-white">{money(row.total_amount)}</p></div>
                <div><p className="text-[9px] text-slate-500">Payment Method</p><p className="mt-0.5 truncate text-xs text-slate-300">{row.payment_method || "Not available"}</p></div>
                <div><p className="text-[9px] text-slate-500">Transaction Date</p><p className="mt-0.5 text-xs text-slate-300">{dateTime(row.transaction_date)}</p></div>
              </div>
            </article>)}
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[9px] text-slate-500">Showing {total ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString("en-US")} orders</p>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7 rounded-md border border-white/10 text-slate-400 disabled:opacity-30">‹</button>
            <span className="grid h-7 min-w-7 place-items-center rounded-md bg-[#7C3AED] px-2 text-[10px] font-bold text-white">{page}</span>
            <span className="px-1 text-[9px] text-slate-500">of {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7 rounded-md border border-white/10 text-slate-400 disabled:opacity-30">›</button>
          </div>
        </div>
      </section>

      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={() => !detailLoading && setSelected(null)}>
          <section className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#7650C8]/40 bg-[#111833] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? <p className="p-8 text-center text-xs text-slate-400">Loading order details...</p> : selected && (
              <>
                <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
                  <div><p className="text-[9px] font-bold tracking-[2px] text-[#A78BFA]">ORDER DETAILS</p><h2 className="mt-1 text-lg font-bold text-white">{selected.order.order_code}</h2><p className="mt-1 text-[10px] text-slate-400">{selected.order.customer_name} · {selected.order.customer_email}</p></div>
                  <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300">Close</button>
                </div>
                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#0B1122] p-3"><p className="text-[9px] text-slate-500">Total Payment</p><p className="mt-1 text-sm font-bold text-white">{money(selected.order.total_amount)}</p></div>
                    <div className="rounded-lg bg-[#0B1122] p-3"><p className="text-[9px] text-slate-500">Payment Status</p><div className="mt-1"><StatusBadge status={selected.order.order_status} /></div></div>
                  </div>
                  <div><p className="mb-2 text-xs font-bold text-white">Purchased Tickets</p>
                    <div className="space-y-2">{selected.items.map((item, index) => <div key={index} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0B1122] p-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-200">{item.concert_name}</p><p className="mt-1 text-[10px] text-slate-500">{item.ticket_category} · {item.quantity} tickets</p></div><p className="whitespace-nowrap text-xs font-semibold text-white">{money(item.subtotal)}</p></div>)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div><p className="text-slate-500">Payment Method</p><p className="mt-1 text-slate-200">{selected.order.payment_method || "Not available"}</p></div>
                    <div><p className="text-slate-500">Transaction Date</p><p className="mt-1 text-slate-200">{dateTime(selected.order.transaction_date)}</p></div>
                    <div className="col-span-2"><p className="text-slate-500">Transaction ID</p><p className="mt-1 break-all text-slate-200">{selected.order.transaction_id || "Not available"}</p></div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
