"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";
import { API_URL } from "@/lib/customer";

type Concert = { id: number; name: string; start_date?: string; venue_name?: string; display_status?: string; poster_url?: string };
type TicketCategory = { id: number; event_id: number; name: string; price: number; quota: number; benefit?: string | null; created_at?: string };
type FormState = { name: string; price: string; quota: string; benefit: string };
const EMPTY_FORM: FormState = { name: "", price: "", quota: "", benefit: "" };

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
}
function dateLabel(value?: string) {
  if (!value) return "Tanggal belum tersedia";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}
function headers(json = false): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function ManageTicketsPage() {
  const searchParams = useSearchParams();
  const queryConcertId = Number(searchParams.get("concert")) || 0;
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [selectedId, setSelectedId] = useState<number>(queryConcertId);
  const [tickets, setTickets] = useState<TicketCategory[]>([]);
  const [loadingConcerts, setLoadingConcerts] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TicketCategory | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const selectedConcert = useMemo(() => concerts.find((concert) => concert.id === selectedId), [concerts, selectedId]);
  const totalQuota = tickets.reduce((sum, ticket) => sum + Number(ticket.quota || 0), 0);
  const totalValue = tickets.reduce((sum, ticket) => sum + Number(ticket.price || 0) * Number(ticket.quota || 0), 0);

  const loadConcerts = useCallback(async () => {
    setLoadingConcerts(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/events/organizer/concerts`, { headers: headers(), cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to load concerts.");
      const rows: Concert[] = Array.isArray(payload.concerts) ? payload.concerts : Array.isArray(payload.data) ? payload.data : [];
      setConcerts(rows);
      setSelectedId((current) => rows.some((item) => item.id === current) ? current : (queryConcertId && rows.some((item) => item.id === queryConcertId) ? queryConcertId : rows[0]?.id || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengambil konser.");
    } finally { setLoadingConcerts(false); }
  }, [queryConcertId]);

  const loadTickets = useCallback(async (concertId: number) => {
    if (!concertId) { setTickets([]); return; }
    setLoadingTickets(true); setError("");
    try {
      const response = await fetch(`${API_URL}/events/${concertId}/tickets`, { headers: headers(), cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to load ticket categories.");
      setTickets(Array.isArray(payload.ticket_categories) ? payload.ticket_categories : []);
    } catch (err) {
      setTickets([]); setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengambil tiket.");
    } finally { setLoadingTickets(false); }
  }, []);

  useEffect(() => { void loadConcerts(); }, [loadConcerts]);
  useEffect(() => { void loadTickets(selectedId); }, [loadTickets, selectedId]);

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(ticket: TicketCategory) {
    setEditing(ticket);
    setForm({ name: ticket.name, price: String(ticket.price), quota: String(ticket.quota), benefit: ticket.benefit || "" });
    setModalOpen(true);
  }
  async function saveTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    setSaving(true); setError(""); setNotice("");
    const body = { name: form.name.trim(), price: Number(form.price), quota: Number(form.quota), benefit: form.benefit.trim() };
    try {
      const url = editing ? `${API_URL}/events/${selectedId}/tickets/${editing.id}` : `${API_URL}/events/${selectedId}/tickets`;
      const response = await fetch(url, { method: editing ? "PUT" : "POST", headers: headers(true), body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to save ticket category.");
      setModalOpen(false); setNotice(editing ? "Ticket category updated successfully." : "Ticket category created successfully.");
      await loadTickets(selectedId);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save ticket category."); }
    finally { setSaving(false); }
  }
  async function deleteTicket(ticket: TicketCategory) {
    if (!window.confirm(`Hapus kategori tiket “${ticket.name}”?`)) return;
    setDeletingId(ticket.id); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/events/${selectedId}/tickets/${ticket.id}`, { method: "DELETE", headers: headers() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to delete ticket category.");
      setNotice("Ticket category deleted successfully."); await loadTickets(selectedId);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to delete ticket category."); }
    finally { setDeletingId(null); }
  }

  return (
    <main className="min-h-screen space-y-6 pb-10 text-white">
      <OrganizerPageHero eyebrow="TICKET MANAGEMENT" title="Manage Tickets" description="Manage ticket categories, pricing, quotas, and benefits for each concert." />

      <section className="rounded-2xl border border-white/[0.08] bg-[#151C36] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[1.8px] text-[#9D9ABF]">Selected event</p><h2 className="mt-1 text-lg font-bold">{selectedConcert?.name || (loadingConcerts ? "Loading concerts..." : "Select a concert")}</h2><p className="mt-1 text-xs text-slate-400">{selectedConcert ? `${dateLabel(selectedConcert.start_date)}${selectedConcert.venue_name ? ` · ${selectedConcert.venue_name}` : ""}` : "Select a concert to manage its ticket categories."}</p></div>
          <div className="flex flex-col gap-2 sm:min-w-[260px]">
            <label htmlFor="concert-select" className="text-[11px] font-semibold text-slate-400">Choose concert</label>
            <select id="concert-select" value={selectedId || ""} onChange={(event) => setSelectedId(Number(event.target.value))} disabled={loadingConcerts || !concerts.length} className="h-11 rounded-xl border border-white/10 bg-[#0F1730] px-3 text-sm text-white outline-none focus:border-[#8B5CF6]">
              {!concerts.length && <option value="">No concerts available</option>}
              {concerts.map((concert) => <option key={concert.id} value={concert.id}>{concert.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Ticket categories" value={tickets.length} icon="/icons/ticket.png" />
        <Stat label="Total ticket quota" value={totalQuota.toLocaleString("en-US")} icon="/icons/Attendees.png" />
        <Stat label="Potential revenue" value={money(totalValue)} icon="/icons/dollar.png" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151C36]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="text-base font-bold">Ticket categories</h2><p className="mt-1 text-xs text-slate-400">Manage the ticket types available for this concert.</p></div>
          <button type="button" onClick={openCreate} disabled={!selectedId} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#5456DE] px-4 text-xs font-bold text-white transition hover:bg-[#6668F0] disabled:cursor-not-allowed disabled:opacity-40"><span className="text-lg leading-none">+</span> Add ticket category</button>
        </div>
        {loadingTickets ? <div className="p-12 text-center text-sm text-slate-400">Loading ticket categories...</div> : !selectedId ? <div className="p-12 text-center text-sm text-slate-400">No concerts available to manage.</div> : tickets.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5CF6]/15 text-2xl text-[#B7A2FF]">♧</div><h3 className="text-sm font-bold">No ticket categories yet</h3><p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">Start by adding a category such as Regular, VIP, or VVIP for your selected concert.</p><button type="button" onClick={openCreate} className="mt-5 rounded-xl bg-[#5456DE] px-4 py-2.5 text-xs font-bold hover:bg-[#6668F0]">Create first category</button></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#10172E] text-[10px] uppercase tracking-[1.3px] text-slate-500"><tr><th className="px-5 py-4 font-semibold">Category</th><th className="px-5 py-4 font-semibold">Price</th><th className="px-5 py-4 font-semibold">Quota</th><th className="px-5 py-4 font-semibold">Benefit</th><th className="px-5 py-4 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-white/[0.06]">{tickets.map((ticket) => <tr key={ticket.id} className="transition hover:bg-white/[0.025]"><td className="px-5 py-4"><div className="font-semibold text-white">{ticket.name}</div><div className="mt-1 text-[10px] text-slate-500">Ticket ID #{ticket.id}</div></td><td className="px-5 py-4 text-sm font-semibold text-[#B8AEFF]">{money(ticket.price)}</td><td className="px-5 py-4 text-sm text-slate-200">{Number(ticket.quota).toLocaleString("en-US")} <span className="text-xs text-slate-500">tickets</span></td><td className="max-w-[260px] px-5 py-4 text-xs text-slate-400">{ticket.benefit || "—"}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(ticket)} aria-label={`Edit ${ticket.name}`} title="Edit" className="rounded-lg border border-[#8B5CF6]/30 p-2 hover:bg-[#8B5CF6]/10"><img src="/icons/edit.png" alt="Edit" className="h-4 w-4 object-contain" /></button><button type="button" disabled={deletingId === ticket.id} onClick={() => void deleteTicket(ticket)} className="rounded-lg border border-rose-400/20 px-3 py-2 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">{deletingId === ticket.id ? "Deleting..." : <img src="/icons/bin.png" alt="Delete" className="h-4 w-4 object-contain" />}</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Ticket category changes are saved directly to your event.</span><Link href="/organizer/manage-concert" className="font-semibold text-[#A99BFF] hover:text-white">← Back to Manage Concerts</Link></div>

      {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><form onSubmit={saveTicket} className="my-8 w-full max-w-lg rounded-2xl border border-white/10 bg-[#171F3B] p-5 shadow-2xl sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#A99BFF]">Ticket configuration</p><h2 className="mt-1 text-xl font-bold">{editing ? "Edit ticket category" : "Add ticket category"}</h2><p className="mt-1 text-xs text-slate-400">{selectedConcert?.name}</p></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-white/5 hover:text-white">×</button></div>
        <div className="space-y-4"><Field label="Category name" required><input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. VIP, Regular, VVIP" className={inputClass} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Ticket price (IDR)" required><input required min="0" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="150000" className={inputClass} /></Field><Field label="Ticket quota" required><input required min="1" step="1" type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} placeholder="100" className={inputClass} /></Field></div><Field label="Benefits (optional)"><textarea rows={3} maxLength={500} value={form.benefit} onChange={(e) => setForm({ ...form, benefit: e.target.value })} placeholder="e.g. Exclusive merchandise, fast lane access..." className={`${inputClass} h-auto resize-none py-3`} /></Field></div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-xl border border-white/10 px-4 text-xs font-semibold text-slate-300 hover:bg-white/5">Cancel</button><button type="submit" disabled={saving} className="h-10 rounded-xl bg-[#5456DE] px-5 text-xs font-bold text-white hover:bg-[#6668F0] disabled:opacity-50">{saving ? "Saving..." : editing ? "Save changes" : "Create category"}</button></div>
      </form></div>}
    </main>
  );
}

const inputClass = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0F1730] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#8B5CF6]";
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-300">{label}{required && <span className="ml-1 text-rose-400">*</span>}{children}</label>; }
function Stat({ label, value, icon }: { label: string; value: string | number; icon: string }) { return <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#151C36] p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15"><img src={icon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" /></span><div className="min-w-0"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 truncate text-lg font-bold text-white">{value}</p></div></div>; }
