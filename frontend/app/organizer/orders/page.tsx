"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";
import { API_URL } from "@/lib/customer";

type Order = {
  id: number;
  order_code: string;
  customer_name: string;
  customer_email: string;
  event_names: string;
  quantity: number;
  total_amount: number;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
};

type OrderStatus = "paid" | "pending" | "cancelled" | "refunded" | "other";

const PAGE_SIZE = 8;

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("token") || localStorage.getItem("accessToken")
    : null;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function numberLabel(value: number) {
  return Number(value || 0).toLocaleString("id-ID");
}

function dateTime(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizedStatus(value?: string): OrderStatus {
  const status = String(value || "").trim().toLowerCase();
  if (status === "paid") return "paid";
  if (status === "pending") return "pending";
  if (status === "refunded") return "refunded";
  if (["expired", "cancelled", "canceled", "failed"].includes(status)) return "cancelled";
  return "other";
}

function statusLabel(value?: string) {
  const status = normalizedStatus(value);
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  if (status === "cancelled") return "Cancelled";
  if (status === "refunded") return "Refunded";
  return value || "Unknown";
}

function statusClass(value?: string) {
  const status = normalizedStatus(value);
  if (status === "paid") return "border-[#26ADA0]/25 bg-[#152B32] text-[#42D6C5]";
  if (status === "pending") return "border-[#F5B84E]/25 bg-[#2E2723] text-[#F5B84E]";
  if (status === "refunded") return "border-[#8B5CF6]/25 bg-[#282044] text-[#C4B5FD]";
  if (status === "cancelled") return "border-rose-400/20 bg-rose-500/10 text-rose-300";
  return "border-slate-500/20 bg-slate-500/10 text-slate-300";
}

function paymentStatusLabel(value?: string | null) {
  if (!value) return "Payment status unavailable";
  const status = value.toLowerCase();
  if (status === "settlement" || status === "capture" || status === "paid") return "Payment confirmed";
  if (status === "pending") return "Awaiting payment";
  if (["deny", "failure", "cancel", "expire", "expired"].includes(status)) return "Payment unsuccessful";
  return value.replaceAll("_", " ");
}

function StatCard({
  label,
  value,
  icon,
  tone = "purple",
  helper,
}: {
  label: string;
  value: string;
  icon: string;
  tone?: "purple" | "cyan" | "yellow" | "blue";
  helper: string;
}) {
  const tones = {
    purple: "bg-[#282044] text-[#C4B5FD] ring-[#8B5CF6]/15",
    cyan: "bg-[#152B32] text-[#42D6C5] ring-[#26ADA0]/15",
    yellow: "bg-[#2E2723] text-[#F5B84E] ring-[#F5B84E]/15",
    blue: "bg-[#202A4F] text-[#A5B4FC] ring-[#5456DE]/20",
  };

  return (
    <article className="group min-w-0 rounded-xl border border-white/[0.07] bg-[#151C36] px-4 py-3 shadow-[0_8px_22px_rgba(0,0,0,0.10)] transition duration-200 hover:border-[#8B5CF6]/25 sm:px-4 sm:py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-2 truncate text-xl font-extrabold tracking-tight text-white sm:text-[22px]">{value}</p>
          <p className="mt-1 text-[9px] leading-3 text-slate-500">{helper}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${tones[tone]}`}>
          <img src={icon} alt="" aria-hidden="true" className="h-[18px] w-[18px] object-contain" />
        </span>
      </div>
    </article>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass(value)}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${normalizedStatus(value) === "paid" ? "bg-[#42D6C5]" : normalizedStatus(value) === "pending" ? "bg-[#F5B84E]" : normalizedStatus(value) === "refunded" ? "bg-[#C4B5FD]" : "bg-rose-300"}`} />
      {statusLabel(value)}
    </span>
  );
}

function OrganizerOrdersContent() {
  const searchParams = useSearchParams();
  const concertId = searchParams.get("concert") || "";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (concertId) params.set("event_id", concertId);
      const queryString = params.toString();
      const response = await fetch(
        `${API_URL}/orders/organizer-orders${queryString ? `?${queryString}` : ""}`,
        { headers: authHeaders(), cache: "no-store" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || `Failed to load orders (${response.status}).`);
      setOrders(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while loading orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [concertId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const paidOrders = useMemo(() => orders.filter((order) => normalizedStatus(order.status) === "paid"), [orders]);
  const pendingOrders = useMemo(() => orders.filter((order) => normalizedStatus(order.status) === "pending"), [orders]);
  const revenue = useMemo(() => paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0), [paidOrders]);
  const totalTickets = useMemo(() => orders.reduce((sum, order) => sum + Number(order.quantity || 0), 0), [orders]);

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesText = !needle || [order.order_code, order.customer_name, order.customer_email, order.event_names]
        .some((value) => String(value || "").toLowerCase().includes(needle));
      const matchesStatus = status === "all" || normalizedStatus(order.status) === status;
      return matchesText && matchesStatus;
    });
  }, [orders, query, status]);

  useEffect(() => setPage(1), [query, status]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const visibleOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstItem = filteredOrders.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, filteredOrders.length);

  return (
    <main className="min-h-screen w-full min-w-0 space-y-5 overflow-x-hidden pb-10 text-white sm:space-y-6">
      <OrganizerPageHero
        eyebrow="ORDER MANAGEMENT"
        title="Manage"
        highlight="Orders"
        description="Keep track of customer purchases, payment progress, and ticket transactions across your concerts."
      >
        <button
          type="button"
          onClick={() => void loadOrders(true)}
          disabled={loading || refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#111A32]/75 px-4 text-xs font-bold text-white backdrop-blur transition hover:border-[#8B5CF6]/60 hover:bg-[#202A4F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <img src="/icons/time-left.png" alt="" aria-hidden="true" className={`h-4 w-4 object-contain ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </OrganizerPageHero>

      {concertId && (
        <div className="flex items-center gap-2 rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/[0.08] px-4 py-3 text-xs text-[#C4B5FD]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />
          Showing orders related to the selected concert
          <span className="ml-auto rounded-md bg-[#8B5CF6]/15 px-2 py-1 font-bold">Event #{concertId}</span>
        </div>
      )}

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <StatCard label="Total Orders" value={numberLabel(orders.length)} icon="/icons/orders (1).png" tone="blue" helper="All recorded transactions" />
        <StatCard label="Paid Orders" value={numberLabel(paidOrders.length)} icon="/icons/check (1).png" tone="cyan" helper="Successfully paid orders" />
        <StatCard label="Pending Payment" value={numberLabel(pendingOrders.length)} icon="/icons/clock.png" tone="yellow" helper="Waiting for payment" />
        <StatCard label="Total Revenue" value={money(revenue)} icon="/icons/dollar.png" tone="purple" helper="From paid orders only" />
      </section>

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#151C36] shadow-[0_14px_35px_rgba(0,0,0,0.12)]">
        <div className="border-b border-white/[0.07] bg-[#151C36] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#22D3EE]" />
                <h2 className="text-base font-bold text-white">All Orders</h2>
              </div>
              <p className="mt-1.5 pl-3 text-xs text-slate-500">Review customer transactions and payment information.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <label className="relative block min-w-0 flex-1 xl:w-[310px]">
                <span className="sr-only">Search orders</span>
                <img src="/icons/search.png" alt="" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 object-contain opacity-50" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search order, customer, concert..."
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1122] pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10"
                />
              </label>
              <label className="block sm:w-[160px]">
                <span className="sr-only">Filter by payment status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1122] px-3 text-xs text-slate-200 outline-none transition focus:border-[#8B5CF6]"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500"><span className="font-semibold text-slate-300">{numberLabel(filteredOrders.length)}</span> orders found</p>
            <p className="text-[10px] text-slate-600">{numberLabel(totalTickets)} tickets across all loaded orders</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-4 sm:p-5">
            {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-[74px] animate-pulse rounded-xl border border-white/[0.04] bg-white/[0.035]" />)}
          </div>
        ) : error ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/15 bg-rose-500/10">
              <span className="text-xl font-bold text-rose-300">!</span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-white">Unable to load orders</h3>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-400">{error}</p>
            <button type="button" onClick={() => void loadOrders()} className="mt-5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-5 py-2.5 text-xs font-bold text-white transition hover:brightness-110">Try again</button>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#8B5CF6]/15 bg-[#8B5CF6]/10">
              <img src="/icons/orders.png" alt="" aria-hidden="true" className="h-7 w-7 object-contain opacity-80" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-white">{orders.length === 0 ? "No orders yet" : "No matching orders"}</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
              {orders.length === 0 ? "Customer orders for your concerts will appear here once a purchase is made." : "Try another keyword or change the status filter to see more results."}
            </p>
            {(query || status !== "all") && (
              <button type="button" onClick={() => { setQuery(""); setStatus("all"); }} className="mt-4 text-xs font-bold text-[#A99BFF] transition hover:text-white">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden xl:block">
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[17%]" />
                  <col className="w-[14%]" />
                  <col className="w-[7%]" />
                  <col className="w-[13%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead className="bg-gradient-to-r from-[#4A28B5] via-[#4930B9] to-[#3726A4] text-[10px] uppercase tracking-[0.08em] text-white">
                  <tr>
                    <th className="px-3 py-3 font-bold">Order Details</th>
                    <th className="px-3 py-3 font-bold">Customer</th>
                    <th className="px-3 py-3 font-bold">Concert</th>
                    <th className="px-2 py-3 text-center font-bold">Tickets</th>
                    <th className="px-3 py-3 font-bold">Total</th>
                    <th className="px-3 py-3 font-bold">Payment</th>
                    <th className="px-3 py-3 font-bold">Status</th>
                    <th className="px-3 py-3 font-bold">Order Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {visibleOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-[#202A4F]/45">
                      <td className="min-w-0 overflow-hidden px-3 py-3">
                        <p title={order.order_code || `ORD-${order.id}`} className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold text-[#B9A8FF]">
                          {order.order_code || `ORD-${order.id}`}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-slate-600">Transaction #{order.id}</p>
                      </td>
                      <td className="min-w-0 overflow-hidden px-3 py-3">
                        <p title={order.customer_name || "Customer"} className="truncate text-[11px] font-semibold text-slate-200">
                          {order.customer_name || "Customer"}
                        </p>
                        <p title={order.customer_email || "Email unavailable"} className="mt-1 truncate text-[10px] text-slate-500">
                          {order.customer_email || "Email unavailable"}
                        </p>
                      </td>
                      <td className="min-w-0 overflow-hidden px-3 py-3">
                        <p title={order.event_names || "Concert unavailable"} className="line-clamp-2 break-words text-[11px] leading-4 text-slate-300">
                          {order.event_names || "Concert unavailable"}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-[#202A4F] px-2.5 py-1.5 text-xs font-bold text-[#C4B5FD]">{numberLabel(order.quantity)}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[11px] font-bold text-white">{money(order.total_amount)}</td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-medium text-slate-300">{order.payment_method || "Not available"}</p>
                        <p className="mt-1 text-[10px] text-slate-600">{paymentStatusLabel(order.payment_status)}</p>
                      </td>
                      <td className="px-3 py-3"><StatusBadge value={order.status} /></td>
                      <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-500">{dateTime(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/[0.06] xl:hidden">
              {visibleOrders.map((order) => (
                <article key={order.id} className="space-y-3 p-3.5 transition-colors hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all text-xs font-extrabold text-[#B9A8FF]">{order.order_code || `ORD-${order.id}`}</p>
                      <p className="mt-1 text-[10px] text-slate-600">Transaction #{order.id}</p>
                    </div>
                    <StatusBadge value={order.status} />
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-[#0D162D] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</p>
                    <p className="mt-1.5 text-[11px] font-semibold text-slate-200">{order.customer_name || "Customer"}</p>
                    <p className="mt-1 break-all text-[10px] text-slate-500">{order.customer_email || "Email unavailable"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Concert</p>
                    <p className="mt-1.5 text-[11px] leading-4 text-slate-300">{order.event_names || "Concert unavailable"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[#202A4F]/55 p-3">
                      <p className="text-[10px] text-slate-500">Tickets</p>
                      <p className="mt-1 text-sm font-bold text-white">{numberLabel(order.quantity)}</p>
                    </div>
                    <div className="rounded-xl bg-[#202A4F]/55 p-3">
                      <p className="text-[10px] text-slate-500">Total Amount</p>
                      <p className="mt-1 break-words text-sm font-extrabold text-white">{money(order.total_amount)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                    <div>
                      <p className="text-[10px] text-slate-500">{order.payment_method || "Payment unavailable"}</p>
                      <p className="mt-1 text-[10px] text-slate-600">{paymentStatusLabel(order.payment_status)}</p>
                    </div>
                    <p className="text-right text-[10px] text-slate-500">{dateTime(order.created_at)}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/[0.07] bg-[#151C36] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[10px] text-slate-500">Showing <span className="font-semibold text-slate-300">{numberLabel(firstItem)}–{numberLabel(lastItem)}</span> of <span className="font-semibold text-slate-300">{numberLabel(filteredOrders.length)}</span> orders</p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="h-9 rounded-lg border border-white/10 px-3 text-[10px] font-semibold text-slate-300 transition hover:border-[#8B5CF6]/50 hover:bg-[#202A4F] disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
                <span className="min-w-[64px] text-center text-[10px] font-semibold text-slate-400">{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="h-9 rounded-lg border border-white/10 px-3 text-[10px] font-semibold text-slate-300 transition hover:border-[#8B5CF6]/50 hover:bg-[#202A4F] disabled:cursor-not-allowed disabled:opacity-30">Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-600">
        <span>Order information is synced from your concert transactions.</span>
        <span className="text-slate-500">Revenue is calculated from paid orders only.</span>
      </div>
    </main>
  );
}

export default function OrganizerOrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[#0B1122]" />}>
      <OrganizerOrdersContent />
    </Suspense>
  );
}
