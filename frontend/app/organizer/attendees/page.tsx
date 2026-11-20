"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

type Concert = { id: number; name: string; start_date?: string; venue_name?: string };
type Attendee = {
  ticket_id: number;
  ticket_code: string;
  ticket_status: string;
  attendee_name: string;
  attendee_email: string;
  category_name: string;
  order_code: string;
  event_id: number;
  event_name: string;
  issued_at: string | null;
  checked_at: string | null;
};

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const number = (value: number) => new Intl.NumberFormat("id-ID").format(value || 0);
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const statusOf = (status: string) => String(status).toLowerCase() === "used" ? "checked" : "not_checked";

function headers() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function OrganizerAttendeesPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [eventId, setEventId] = useState("all");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [checkin, setCheckin] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [concertResponse, attendeeResponse] = await Promise.all([
        fetch(`${API}/events/organizer/concerts`, { headers: headers(), cache: "no-store" }),
        fetch(`${API}/tickets/organizer/attendees${eventId !== "all" ? `?eventId=${encodeURIComponent(eventId)}` : ""}`, { headers: headers(), cache: "no-store" }),
      ]);
      const [concertPayload, attendeePayload] = await Promise.all([concertResponse.json(), attendeeResponse.json()]);
      if (!concertResponse.ok) throw new Error(concertPayload?.message || "Failed to load concerts.");
      if (!attendeeResponse.ok) throw new Error(attendeePayload?.message || "Failed to load attendee data.");
      setConcerts(Array.isArray(concertPayload.concerts) ? concertPayload.concerts : []);
      setAttendees(Array.isArray(attendeePayload.data) ? attendeePayload.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while loading attendees.");
    } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setPage(1); }, [query, category, checkin, eventId]);

  const categories = useMemo(() => Array.from(new Set(attendees.map((item) => item.category_name).filter(Boolean))).sort(), [attendees]);
  const filtered = useMemo(() => attendees.filter((item) => {
    const text = [item.attendee_name, item.attendee_email, item.ticket_code, item.order_code, item.event_name].join(" ").toLowerCase();
    return text.includes(query.toLowerCase()) && (category === "all" || item.category_name === category) && (checkin === "all" || statusOf(item.ticket_status) === checkin);
  }), [attendees, query, category, checkin]);
  const checked = attendees.filter((item) => statusOf(item.ticket_status) === "checked").length;
  const notChecked = attendees.length - checked;
  const rate = attendees.length ? Math.round((checked / attendees.length) * 100) : 0;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const columns = ["Ticket ID", "Attendee", "Email", "Concert", "Category", "Order ID", "Status", "Check-In Time"];
    const values = filtered.map((item) => [item.ticket_code, item.attendee_name, item.attendee_email, item.event_name, item.category_name, item.order_code, statusOf(item.ticket_status) === "checked" ? "Checked-In" : "Not Checked-In", item.checked_at || ""]);
    const csv = [columns, ...values].map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "lynora-attendees.csv"; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#0B1122] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <OrganizerPageHero title="Attendees" description="View ticket holders, track attendance, and export attendee data." eyebrow="ORGANIZER MANAGEMENT">
          <button onClick={exportCsv} disabled={!filtered.length} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-[#111A32]/80 px-4 text-sm font-semibold text-white transition hover:border-[#22D3EE]/50 hover:bg-[#202A4F] disabled:cursor-not-allowed disabled:opacity-40"><img src="/icons/direct-download.png" alt="" className="h-4 w-4 rounded-sm object-contain" />Export CSV</button>
          <button onClick={loadData} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#5456DE] px-4 text-sm font-semibold text-white transition hover:bg-[#6668F0]">↻ Refresh</button>
        </OrganizerPageHero>

        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#111A32] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><p className="text-sm font-semibold">Concert Overview</p><p className="mt-1 text-xs text-slate-500">Select a concert to view its attendees.</p></div>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#0B1122] px-3 text-sm text-slate-200 outline-none focus:border-[#8B5CF6] sm:max-w-sm"><option value="all">All Concerts</option>{concerts.map((concert) => <option key={concert.id} value={concert.id}>{concert.name}</option>)}</select>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total Attendees" value={number(attendees.length)} icon="/icons/Attendees.png" tone="blue" />
          <Stat label="Checked-In" value={number(checked)} icon="/icons/check (1).png" tone="cyan" />
          <Stat label="Not Checked-In" value={number(notChecked)} icon="/icons/clock.png" tone="yellow" />
          <Stat label="Check-In Rate" value={`${rate}%`} icon="/icons/sales.png" tone="purple" />
        </section>

        <section className="mb-3 rounded-2xl border border-white/[0.07] bg-[#111A32] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="shrink-0">
              <h2 className="font-semibold">Attendee List</h2>
              <p className="mt-1 text-xs text-slate-500">{number(filtered.length)} attendees found</p>
            </div>
            <div className="w-full lg:max-w-sm">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, ticket..." className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1122] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#8B5CF6]" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Filter:</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 min-w-[150px] rounded-lg border border-white/10 bg-[#0B1122] px-3 text-xs text-slate-200 outline-none transition focus:border-[#8B5CF6]"><option value="all">All Categories</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select>
            <select value={checkin} onChange={(e) => setCheckin(e.target.value)} className="h-9 min-w-[170px] rounded-lg border border-white/10 bg-[#0B1122] px-3 text-xs text-slate-200 outline-none transition focus:border-[#8B5CF6]"><option value="all">All Check-In Status</option><option value="checked">Checked-In</option><option value="not_checked">Not Checked-In</option></select>
            {(category !== "all" || checkin !== "all" || query) && <button type="button" onClick={() => { setCategory("all"); setCheckin("all"); setQuery(""); }} className="h-9 rounded-lg px-3 text-xs font-medium text-[#A5B4FC] transition hover:bg-white/[0.05]">Reset filters</button>}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111A32]">
          {loading ? <div className="space-y-3 p-6">{[1,2,3,4,5].map((n) => <div key={n} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />)}</div> : error ? <div className="p-10 text-center"><p className="font-semibold text-rose-300">Failed to load attendees</p><p className="mt-2 text-sm text-slate-400">{error}</p><button onClick={loadData} className="mt-4 rounded-lg bg-[#5456DE] px-4 py-2 text-sm font-semibold">Try Again</button></div> : rows.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#202A4F]"><img src="/icons/Attendees.png" alt="" className="h-7 w-7 object-contain" /></div><h3 className="mt-4 font-semibold">No attendees found</h3><p className="mt-2 text-sm text-slate-500">Attendees from paid ticket orders will appear here.</p></div> : <>
            <div className="hidden lg:block"><table className="w-full table-fixed text-left"><colgroup><col style={{ width: "16%" }} /><col style={{ width: "18%" }} /><col style={{ width: "16%" }} /><col style={{ width: "10%" }} /><col style={{ width: "15%" }} /><col style={{ width: "12%" }} /><col style={{ width: "13%" }} /></colgroup><thead className="bg-white/[0.025] text-[10px] uppercase tracking-wider text-slate-500"><tr>{["Ticket ID", "Attendee", "Concert", "Category", "Order ID", "Status", "Check-In Time"].map((label) => <th key={label} className="px-3 py-4 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-white/[0.05]">{rows.map((item) => <tr key={item.ticket_id} className="transition hover:bg-white/[0.025]"><td className="break-words px-3 py-4"><span className="break-all text-sm font-semibold text-[#A5B4FC]">{item.ticket_code}</span></td><td className="break-words px-3 py-4"><p className="text-sm font-medium text-slate-200">{item.attendee_name || "Customer"}</p><p className="mt-1 text-xs text-slate-500">{item.attendee_email || "—"}</p></td><td className="px-3 py-4 text-sm text-slate-300"><span className="line-clamp-2">{item.event_name}</span></td><td className="break-words px-3 py-4 text-sm text-slate-300">{item.category_name}</td><td className="break-all px-3 py-4 text-xs text-slate-400">{item.order_code}</td><td className="px-3 py-4"><Status status={item.ticket_status} /></td><td className="px-3 py-4 text-xs text-slate-400">{dateTime(item.checked_at)}</td></tr>)}</tbody></table></div>
            <div className="divide-y divide-white/[0.06] lg:hidden">{rows.map((item) => <article key={item.ticket_id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#A5B4FC]">{item.ticket_code}</p><p className="mt-1 text-xs text-slate-500">{item.order_code}</p></div><Status status={item.ticket_status} /></div><div><p className="text-sm font-medium">{item.attendee_name || "Customer"}</p><p className="text-xs text-slate-500">{item.attendee_email || "—"}</p></div><p className="text-xs text-slate-400">{item.event_name} · {item.category_name}</p><p className="text-xs text-slate-500">Check-in: {dateTime(item.checked_at)}</p></article>)}</div>
            <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} attendees</p><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-30">Previous</button><span className="px-2 text-xs text-slate-400">{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-30">Next</button></div></div>
          </>}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon: string; tone: "blue" | "cyan" | "yellow" | "purple" }) {
  const styles = { blue: "bg-[#202A4F]", cyan: "bg-[#152B32]", yellow: "bg-[#2E2723]", purple: "bg-[#282044]" };
  return <div className="rounded-2xl border border-white/[0.07] bg-[#111A32] p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-400">{label}</p><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}><img src={icon} alt="" className="h-5 w-5 object-contain" /></span></div><p className="mt-4 text-2xl font-bold">{value}</p></div>;
}

function Status({ status }: { status: string }) {
  const checked = statusOf(status) === "checked";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${checked ? "border-[#26ADA0]/20 bg-[#152B32] text-[#42D6C5]" : "border-[#F5B84E]/20 bg-[#2E2723] text-[#F5B84E]"}`}>{checked ? "Checked-In" : "Not Checked-In"}</span>;
}
