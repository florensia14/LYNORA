"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

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

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
const dateTime = (value: string) => new Date(value).toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const statusLabel = (value: string) => {
  const status = String(value || "").toLowerCase();
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  if (["expired", "cancelled", "canceled", "failed"].includes(status)) return "Cancelled";
  if (status === "refunded") return "Refunded";
  return value || "Unknown";
};
const statusClass = (value: string) => {
  const status = statusLabel(value);
  if (status === "Paid") return "border-[#26ADA0]/20 bg-[#152B32] text-[#42D6C5]";
  if (status === "Pending") return "border-[#F5B84E]/20 bg-[#2E2723] text-[#F5B84E]";
  if (status === "Refunded") return "border-[#8B5CF6]/20 bg-[#282044] text-[#B9A0FF]";
  return "border-rose-500/20 bg-rose-500/10 text-rose-300";
};

export default function OrganizerOrdersPage() {
  const searchParams = useSearchParams();
  const concertId = searchParams.get("concert") || "";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Login session not found. Please sign in again.");
      const params = new URLSearchParams();
      if (concertId) params.set("event_id", concertId);
      const response = await fetch(`${API_URL}/orders/organizer-orders${params.size ? `?${params}` : ""}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || `Failed to load orders (${response.status}).`);
      setOrders(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while loading orders.");
    } finally {
      setLoading(false);
    }
  }, [concertId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = useMemo(() => orders.filter((order) => {
    const matchesText = [order.order_code, order.customer_name, order.customer_email, order.event_names]
      .some((value) => String(value || "").toLowerCase().includes(query.toLowerCase()));
    const matchesStatus = status === "all" || statusLabel(order.status).toLowerCase() === status;
    return matchesText && matchesStatus;
  }), [orders, query, status]);

  useEffect(() => setPage(1), [query, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleOrders = filtered.slice((page - 1) * pageSize, page * pageSize);
  const paidOrders = orders.filter((item) => String(item.status).toLowerCase() === "paid");
  const pendingOrders = orders.filter((item) => String(item.status).toLowerCase() === "pending");
  const revenue = paidOrders.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

  return (
    <main className="min-h-screen bg-[#0B1122] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OrganizerPageHero eyebrow="ORDER MANAGEMENT" title="Orders" description="Track orders, payments, and ticket transactions across all your concerts.">
          <button onClick={loadOrders} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#161C38] px-4 text-sm font-semibold text-slate-200 transition hover:border-[#8B5CF6]/60 hover:bg-[#202A4F]">
            <img src="/icons/time-left.png" alt="" aria-hidden="true" className="h-4 w-4 object-contain" /> Refresh data
          </button>
        </OrganizerPageHero>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total Orders" value={orders.length.toLocaleString("en-US")} icon="/icons/orders.png" />
          <Stat label="Paid Orders" value={paidOrders.length.toLocaleString("en-US")} icon="/icons/check (1).png" accent="cyan" />
          <Stat label="Pending Payment" value={pendingOrders.length.toLocaleString("en-US")} icon="/icons/clock.png" accent="yellow" />
          <Stat label="Total Revenue" value={money(revenue)} icon="/icons/dollar.png" accent="purple" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111A32]">
          <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><h2 className="font-semibold">All Orders</h2><p className="mt-1 text-xs text-slate-500">{filtered.length} orders found</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <img src="/icons/search.png" alt="" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 object-contain opacity-60" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order, customer, event..." className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1122] pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#8B5CF6] sm:w-72" />
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#0B1122] px-3 text-sm text-slate-200 outline-none focus:border-[#8B5CF6]">
                <option value="all">All Status</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {loading ? <div className="space-y-3 p-6">{[1,2,3,4].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />)}</div> : error ? (
            <div className="p-8 text-center"><p className="font-semibold text-rose-300">Failed to load orders</p><p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{error}</p><button onClick={loadOrders} className="mt-4 rounded-lg bg-[#5456DE] px-4 py-2 text-sm font-semibold">Try again</button></div>
          ) : visibleOrders.length === 0 ? (
            <div className="px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#202A4F]"><img src="/icons/orders.png" alt="" aria-hidden="true" className="h-7 w-7 object-contain" /></div><h3 className="mt-4 font-semibold">No orders yet</h3><p className="mt-2 text-sm text-slate-500">Orders for your concerts will appear here.</p></div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-white/[0.025] text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4 font-semibold">Order ID</th><th className="px-5 py-4 font-semibold">Customer</th><th className="px-5 py-4 font-semibold">Concert</th><th className="px-5 py-4 font-semibold">Tickets</th><th className="px-5 py-4 font-semibold">Total</th><th className="px-5 py-4 font-semibold">Payment</th><th className="px-5 py-4 font-semibold">Status</th><th className="px-5 py-4 font-semibold">Date</th></tr></thead>
                  <tbody className="divide-y divide-white/[0.05]">{visibleOrders.map((order) => <tr key={order.id} className="transition hover:bg-white/[0.025]"><td className="px-5 py-4"><span className="font-semibold text-[#A5B4FC]">{order.order_code}</span><p className="mt-1 text-[11px] text-slate-600">#{order.id}</p></td><td className="px-5 py-4"><p className="text-sm font-medium text-slate-200">{order.customer_name || "Customer"}</p><p className="mt-1 text-xs text-slate-500">{order.customer_email || "-"}</p></td><td className="max-w-[220px] px-5 py-4 text-sm text-slate-300"><span className="line-clamp-2">{order.event_names || "-"}</span></td><td className="px-5 py-4 text-sm text-slate-300">{order.quantity}</td><td className="px-5 py-4 text-sm font-semibold text-white">{money(Number(order.total_amount))}</td><td className="px-5 py-4 text-xs text-slate-400">{order.payment_method || "-"}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(order.status)}`}>{statusLabel(order.status)}</span></td><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{dateTime(order.created_at)}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="divide-y divide-white/[0.06] md:hidden">{visibleOrders.map((order) => <article key={order.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#A5B4FC]">{order.order_code}</p><p className="mt-1 text-xs text-slate-500">{dateTime(order.created_at)}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(order.status)}`}>{statusLabel(order.status)}</span></div><div><p className="text-sm font-medium">{order.customer_name || "Customer"}</p><p className="text-xs text-slate-500">{order.customer_email || "-"}</p></div><p className="text-sm text-slate-400">{order.event_names || "-"}</p><div className="flex items-center justify-between border-t border-white/[0.06] pt-3"><span className="text-xs text-slate-500">{order.quantity} tickets · {order.payment_method || "Payment unavailable"}</span><span className="text-sm font-bold">{money(Number(order.total_amount))}</span></div></article>)}</div>
              <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} orders</p><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-30">Previous</button><span className="px-2 text-xs text-slate-400">{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-30">Next</button></div></div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, icon, accent = "blue" }: { label: string; value: string; icon: string; accent?: "blue" | "cyan" | "yellow" | "purple" }) {
  const tones = { blue: "bg-[#202A4F] text-[#A5B4FC]", cyan: "bg-[#152B32] text-[#42D6C5]", yellow: "bg-[#2E2723] text-[#F5B84E]", purple: "bg-[#282044] text-[#B9A0FF]" };
  return <div className="rounded-2xl border border-white/[0.07] bg-[#111A32] p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-400">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[accent]}`}><img src={icon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" /></span></div><p className="mt-4 truncate text-xl font-bold sm:text-2xl">{value}</p></div>;
}
