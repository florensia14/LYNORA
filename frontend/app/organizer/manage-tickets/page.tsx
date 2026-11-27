"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import Link from "next/link";

import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

import { API_URL, imageUrl } from "@/lib/customer";

type Concert = {

  id: number;

  name: string;

  start_date?: string;

  end_date?: string;

  venue_name?: string;

  poster_url?: string | null;

  display_status?: string;

  approval_status?: string;

  publication_status?: string;

};

type TicketCategory = {

  id: number;

  event_id: number;

  name: string;

  price: number;

  quota: number;

  benefit?: string | null;

  sold: number;

  remaining: number;

  status: "On Sale" | "Coming Soon" | "Sold Out" | "Ended" | "Unavailable";

};

type FormState = {

  name: string;

  price: string;

  quota: string;

  benefit: string;

};

const EMPTY_FORM: FormState = { name: "", price: "", quota: "", benefit: "" };

function authHeaders(json = false): HeadersInit {

  const token = typeof window !== "undefined"

    ? localStorage.getItem("token") || localStorage.getItem("accessToken")

    : null;

  return {

    ...(json ? { "Content-Type": "application/json" } : {}),

    ...(token ? { Authorization: `Bearer ${token}` } : {}),

  };

}

function assetUrl(path?: string | null) {

  return path ? imageUrl(path) : "";

}

function money(value: number) {

  return new Intl.NumberFormat("id-ID", {

    style: "currency",

    currency: "IDR",

    maximumFractionDigits: 0,

  }).format(Number(value || 0));

}

// Format angka harga dengan pemisah ribuan Indonesia.

// Contoh: 150000 menjadi 150.000.

function formatPriceInput(value: string) {

  const digits = value.replace(/\D/g, "");

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

}

function dateLabel(value?: string) {

  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {

    day: "2-digit",

    month: "short",

    year: "numeric",

  });

}

function statusClass(status: TicketCategory["status"]) {

  switch (status) {

    case "On Sale":

      return "border-[#26ADA0]/20 bg-[#152B32] text-[#26ADA0]";

    case "Coming Soon":

      return "border-[#F5B84E]/20 bg-[#2E2723] text-[#F5B84E]";

    case "Sold Out":

      return "border-rose-400/20 bg-rose-500/10 text-rose-300";

    case "Ended":

      return "border-slate-500/20 bg-slate-500/10 text-slate-300";

    default:

      return "border-slate-500/20 bg-slate-500/10 text-slate-400";

  }

}

function Field({

  label,

  required,

  children,

}: {

  label: string;

  required?: boolean;

  children: React.ReactNode;

}) {

  return (

    <label className="block text-xs font-semibold text-slate-300">

      {label}{required && <span className="ml-1 text-rose-400">*</span>}

      {children}

    </label>

  );

}

const inputClass = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0F1730] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#8B5CF6]";

function Stat({ label, value, icon }: { label: string; value: string | number; icon: string }) {

  return (

    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-[#161C38] px-3 py-3 sm:px-4">

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/15">

        <img src={icon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />

      </span>

      <div className="min-w-0">

        <p className="truncate text-[11px] text-slate-400">{label}</p>

        <p className="mt-0.5 truncate text-lg font-bold leading-tight text-white sm:text-xl">{value}</p>

      </div>

    </div>

  );

}

function ConcertPoster({ concert }: { concert?: Concert }) {

  const [failed, setFailed] = useState(false);

  const src = assetUrl(concert?.poster_url);

  useEffect(() => { setFailed(false); }, [src]);

  return (

    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0B1122]">

      {src && !failed ? (

        <img src={src} alt={concert?.name || "Concert poster"} className="h-full w-full object-cover" onError={() => setFailed(true)} />

      ) : (

        <div className="flex h-full w-full items-center justify-center">

          <img src="/icons/ticket (1).png" alt="" className="h-5 w-5 object-contain opacity-60" />

        </div>

      )}

    </div>

  );

}

function ManageTicketsContent() {

  const searchParams = useSearchParams();

  const queryConcertId = Number(searchParams.get("concert")) || 0;

  const [concerts, setConcerts] = useState<Concert[]>([]);

  const [selectedId, setSelectedId] = useState(queryConcertId);

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

  const selectedConcert = useMemo(

    () => concerts.find((concert) => Number(concert.id) === selectedId),

    [concerts, selectedId]

  );

  const totalQuota = tickets.reduce((sum, ticket) => sum + Number(ticket.quota || 0), 0);

  const totalPotentialRevenue = tickets.reduce(

    (sum, ticket) => sum + Number(ticket.price || 0) * Number(ticket.quota || 0),

    0

  );

  const loadConcerts = useCallback(async () => {

    setLoadingConcerts(true);

    try {

      const response = await fetch(`${API_URL}/events/organizer/concerts`, {

        headers: authHeaders(),

        cache: "no-store",

      });

      const payload = await response.json();

      if (!response.ok) throw new Error(payload.message || "Failed to load concerts.");

      const rows: Concert[] = Array.isArray(payload.concerts) ? payload.concerts : [];

      setConcerts(rows);

      setSelectedId((current) => {

        if (rows.some((item) => Number(item.id) === current)) return current;

        if (queryConcertId && rows.some((item) => Number(item.id) === queryConcertId)) return queryConcertId;

        return Number(rows[0]?.id) || 0;

      });

    } catch (err) {

      setError(err instanceof Error ? err.message : "Unable to load concerts.");

    } finally {

      setLoadingConcerts(false);

    }

  }, [queryConcertId]);

  const loadTickets = useCallback(async (concertId: number) => {

    if (!concertId) {

      setTickets([]);

      return;

    }

    setLoadingTickets(true);

    setError("");

    try {

      const response = await fetch(`${API_URL}/events/${concertId}/tickets`, {

        headers: authHeaders(),

        cache: "no-store",

      });

      const payload = await response.json();

      if (!response.ok) throw new Error(payload.message || "Failed to load ticket categories.");

      setTickets(Array.isArray(payload.ticket_categories) ? payload.ticket_categories : []);

    } catch (err) {

      setTickets([]);

      setError(err instanceof Error ? err.message : "Unable to load ticket categories.");

    } finally {

      setLoadingTickets(false);

    }

  }, []);

  useEffect(() => { void loadConcerts(); }, [loadConcerts]);

  useEffect(() => { void loadTickets(selectedId); }, [loadTickets, selectedId]);

  function openCreate() {

    setEditing(null);

    setForm(EMPTY_FORM);

    setModalOpen(true);

  }

  function openEdit(ticket: TicketCategory) {

    setEditing(ticket);

    setForm({

      name: ticket.name,

      price: formatPriceInput(String(ticket.price)),

      quota: String(ticket.quota),

      benefit: ticket.benefit || "",

    });

    setModalOpen(true);

  }

  async function saveTicket(event: React.FormEvent<HTMLFormElement>) {

    event.preventDefault();

    if (!selectedId) return;

    setSaving(true);

    setError("");

    setNotice("");

    try {

      const body = {

        name: form.name.trim(),

        price: Number(form.price.replace(/\./g, "")),

        quota: Number(form.quota),

        benefit: form.benefit.trim(),

      };

      const url = editing

        ? `${API_URL}/events/${selectedId}/tickets/${editing.id}`

        : `${API_URL}/events/${selectedId}/tickets`;

      const response = await fetch(url, {

        method: editing ? "PUT" : "POST",

        headers: authHeaders(true),

        body: JSON.stringify(body),

      });

      const payload = await response.json();

      if (!response.ok) throw new Error(payload.message || "Failed to save ticket category.");

      setModalOpen(false);

      setNotice(editing ? "Ticket category updated successfully." : "Ticket category created successfully.");

      await loadTickets(selectedId);

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to save ticket category.");

    } finally {

      setSaving(false);

    }

  }

  async function deleteTicket(ticket: TicketCategory) {

    if (!window.confirm(`Hapus kategori tiket "${ticket.name}"?`)) return;

    setDeletingId(ticket.id);

    setError("");

    setNotice("");

    try {

      const response = await fetch(`${API_URL}/events/${selectedId}/tickets/${ticket.id}`, {

        method: "DELETE",

        headers: authHeaders(),

      });

      const payload = await response.json();

      if (!response.ok) throw new Error(payload.message || "Failed to delete ticket category.");

      setNotice("Ticket category deleted successfully.");

      await loadTickets(selectedId);

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to delete ticket category.");

    } finally {

      setDeletingId(null);

    }

  }

  return (

    <main className="min-h-screen space-y-5 pb-10 text-white">

      <OrganizerPageHero

        eyebrow="TICKET MANAGEMENT"

        title="Manage"
        highlight="Tickets"

        description="Manage ticket categories, pricing, quotas, and benefits for each concert."

      />

      <section className="rounded-xl border border-white/[0.08] bg-[#151C36] px-4 py-4 sm:px-5 sm:py-4">

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6">

          <div className="min-w-0">

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9D9ABF]">Selected Event</p>

            <h2 className="mt-1.5 truncate text-base font-bold sm:text-lg">

              {selectedConcert?.name || (loadingConcerts ? "Loading concerts..." : "Select a concert")}

            </h2>

            <p className="mt-1 text-xs text-slate-400">

              {selectedConcert

                ? `${dateLabel(selectedConcert.start_date)} · ${selectedConcert.venue_name || "Venue TBA"}`

                : "Select a concert to manage its ticket categories."}

            </p>

          </div>

          <div className="min-w-0">

            <label htmlFor="concert-select" className="mb-1.5 block text-xs font-semibold text-slate-400">Choose concert</label>

            <select

              id="concert-select"

              value={selectedId || ""}

              onChange={(event) => setSelectedId(Number(event.target.value))}

              disabled={loadingConcerts || !concerts.length}

              className="h-11 w-full rounded-xl border border-white/10 bg-[#0F1730] px-3.5 text-sm text-white outline-none transition focus:border-[#8B5CF6] disabled:opacity-60"

            >

              {!concerts.length && <option value="">No concerts available</option>}

              {concerts.map((concert) => (

                <option key={concert.id} value={concert.id}>{concert.name}</option>

              ))}

            </select>

          </div>

        </div>

      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>}

      {notice && <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">{notice}</div>}

      <section className="grid gap-3 md:grid-cols-3">

        <Stat label="Ticket categories" value={tickets.length} icon="/icons/ticket (1).png" />

        <Stat label="Total ticket quota" value={totalQuota.toLocaleString("id-ID")} icon="/icons/Attendees (1).png" />

        <Stat label="Potential revenue" value={money(totalPotentialRevenue)} icon="/icons/dollar.png" />

      </section>

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#151C36]">

        <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

          <div>

            <h2 className="text-base font-bold">Manage Ticket Categories</h2>

            <p className="mt-1 text-xs text-slate-400">View ticket categories, sales, quota, and availability.</p>

          </div>

          <button

            type="button"

            onClick={openCreate}

            disabled={!selectedId}

            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-5 text-xs font-bold text-white shadow-lg shadow-purple-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"

          >

            <span className="text-lg leading-none">+</span> Add Ticket Category

          </button>

        </div>

        {loadingTickets ? (

          <div className="p-10 text-center text-xs text-slate-400">Loading ticket categories...</div>

        ) : !selectedId ? (

          <div className="p-10 text-center text-xs text-slate-400">No concerts available to manage.</div>

        ) : tickets.length === 0 ? (

          <div className="flex flex-col items-center px-5 py-12 text-center">

            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B5CF6]/15">

              <img src="/icons/ticket (1).png" alt="" className="h-6 w-6 object-contain" />

            </div>

            <h3 className="text-sm font-bold">No ticket categories yet</h3>

            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">Add a category such as Regular, VIP, or VVIP for this concert.</p>

            <button type="button" onClick={openCreate} className="mt-4 rounded-lg bg-[#5456DE] px-4 py-2.5 text-xs font-bold transition hover:bg-[#6668F0]">Create First Category</button>

          </div>

        ) : (

          <>

            <div className="hidden md:block">

              <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

                <table className="w-full min-w-[880px] table-fixed text-left">

                  <colgroup>

                    <col className="w-[25%]" /><col className="w-[17%]" /><col className="w-[13%]" /><col className="w-[9%]" /><col className="w-[8%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[8%]" />

                  </colgroup>

                  <thead className="bg-gradient-to-r from-[#4A28B5] via-[#4930B9] to-[#3726A4] text-[10px] uppercase tracking-[0.08em] text-white">

                    <tr>

                      <th className="px-4 py-3.5 font-bold">Concerts</th>

                      <th className="px-3 py-3.5 font-bold">Ticket Category</th>

                      <th className="px-3 py-3.5 font-bold">Price</th>

                      <th className="px-3 py-3.5 font-bold">Quota</th>

                      <th className="px-3 py-3.5 font-bold">Sold</th>

                      <th className="px-3 py-3.5 font-bold">Remaining</th>

                      <th className="px-3 py-3.5 font-bold">Status</th>

                      <th className="px-3 py-3.5 text-center font-bold">Actions</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-white/[0.07]">

                    {tickets.map((ticket) => (

                      <tr key={ticket.id} className="transition-colors hover:bg-[#202A4F]/45">

                        <td className="px-4 py-3.5">

                          <div className="flex min-w-0 items-center gap-3">

                            <ConcertPoster concert={selectedConcert} />

                            <div className="min-w-0">

                              <p className="truncate text-xs font-bold text-white">{selectedConcert?.name || "Unknown Concert"}</p>

                              <p className="mt-1 text-[10px] text-slate-400">{dateLabel(selectedConcert?.start_date)}</p>

                              <p className="mt-0.5 truncate text-[10px] text-slate-500">{selectedConcert?.venue_name || "Venue TBA"}</p>

                            </div>

                          </div>

                        </td>

                        <td className="px-3 py-3.5">

                          <div className="flex min-w-0 items-center gap-2">

                            <span className="flex h-6 min-w-7 shrink-0 items-center justify-center rounded bg-[#8B5CF6]/20 px-1.5 text-[9px] font-extrabold text-[#C4B5FD]">CAT</span>

                            <span className="truncate text-xs font-bold text-white">{ticket.name}</span>

                          </div>

                        </td>

                        <td className="whitespace-nowrap px-3 py-3.5 text-xs font-semibold text-white">{money(ticket.price)}</td>

                        <td className="px-3 py-3.5 text-xs text-slate-300">{Number(ticket.quota).toLocaleString("id-ID")}</td>

                        <td className="px-3 py-3.5 text-xs font-semibold text-[#22D3EE]">{Number(ticket.sold || 0).toLocaleString("id-ID")}</td>

                        <td className="px-3 py-3.5 text-xs text-slate-300">{Number(ticket.remaining ?? 0).toLocaleString("id-ID")}</td>

                        <td className="px-3 py-3.5">

                          <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[9px] font-bold ${statusClass(ticket.status)}`}>{ticket.status}</span>

                        </td>

                        <td className="px-3 py-3.5">

                          <div className="flex items-center justify-center gap-1.5">

                            <button type="button" onClick={() => openEdit(ticket)} aria-label={`Edit ${ticket.name}`} title="Edit" className="">

                              <img src="/icons/edit.png" alt="" className="h-5 w-5 object-contain" />

                            </button>

                            <button type="button" disabled={deletingId === ticket.id} onClick={() => void deleteTicket(ticket)} aria-label={`Delete ${ticket.name}`} title="Delete" className="">

                              {deletingId === ticket.id ? <span className="text-[10px]">...</span> : <img src="/icons/bin.png" alt="" className="h-5 w-5 object-contain" />}

                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

            <div className="divide-y divide-white/[0.07] md:hidden">

              {tickets.map((ticket) => (

                <article key={ticket.id} className="space-y-3 p-4">

                  <div className="flex items-center gap-3">

                    <ConcertPoster concert={selectedConcert} />

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-xs font-bold">{selectedConcert?.name || "Unknown Concert"}</p>

                      <p className="mt-1 text-[10px] text-slate-400">{dateLabel(selectedConcert?.start_date)} · {selectedConcert?.venue_name || "Venue TBA"}</p>

                    </div>

                    <span className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold ${statusClass(ticket.status)}`}>{ticket.status}</span>

                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-[#10182F] p-3 text-xs">

                    <div><p className="text-[10px] text-slate-500">Category</p><p className="mt-0.5 font-semibold">{ticket.name}</p></div>

                    <div><p className="text-[10px] text-slate-500">Price</p><p className="mt-0.5 font-semibold">{money(ticket.price)}</p></div>

                    <div><p className="text-[10px] text-slate-500">Quota</p><p className="mt-0.5 font-semibold">{Number(ticket.quota).toLocaleString("id-ID")}</p></div>

                    <div><p className="text-[10px] text-slate-500">Sold</p><p className="mt-0.5 font-semibold text-[#22D3EE]">{Number(ticket.sold || 0).toLocaleString("id-ID")}</p></div>

                    <div><p className="text-[10px] text-slate-500">Remaining</p><p className="mt-0.5 font-semibold">{Number(ticket.remaining ?? 0).toLocaleString("id-ID")}</p></div>

                  </div>

                  <div className="flex justify-end gap-2">

                    <button type="button" onClick={() => openEdit(ticket)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#8B5CF6]/30 px-3 py-2 text-[10px] font-semibold text-[#C4B5FD]"><img src="/icons/edit.png" alt="" className="h-3.5 w-3.5" /> Edit</button>

                    <button type="button" disabled={deletingId === ticket.id} onClick={() => void deleteTicket(ticket)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/20 px-3 py-2 text-[10px] font-semibold text-rose-300 disabled:opacity-50"><img src="/icons/bin.png" alt="" className="h-3.5 w-3.5" /> Delete</button>

                  </div>

                </article>

              ))}

            </div>

          </>

        )}

      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">

        <span>Ticket category changes are saved directly to your event.</span>

        <Link href="/organizer/manage-concert" className="font-semibold text-[#A99BFF] transition hover:text-white">← Back to Manage Concerts</Link>

      </div>

      {modalOpen && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>

          <form onSubmit={saveTicket} className="my-8 w-full max-w-lg rounded-2xl border border-white/10 bg-[#171F3B] p-5 shadow-2xl sm:p-6">

            <div className="mb-5 flex items-start justify-between gap-4">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#A99BFF]">Ticket Configuration</p>

                <h2 className="mt-1 text-xl font-bold">{editing ? "Edit Ticket Category" : "Add Ticket Category"}</h2>

                <p className="mt-1 text-xs text-slate-400">{selectedConcert?.name}</p>

              </div>

              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="rounded-lg px-2 py-1 text-xl text-slate-400 transition hover:bg-white/5 hover:text-white">×</button>

            </div>

            <div className="space-y-4">

              <Field label="Category Name" required>

                <input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. VIP, Regular, VVIP" className={inputClass} />

              </Field>

              <div className="grid gap-4 sm:grid-cols-2">

                <Field label="Ticket Price (IDR)" required>

                  <input

                    required

                    type="text"

                    inputMode="numeric"

                    value={form.price}

                    onChange={(event) =>

                      setForm({ ...form, price: formatPriceInput(event.target.value) })

                    }

                    placeholder="150.000"

                    className={inputClass}

                  />

                </Field>

                <Field label="Ticket Quota" required>

                  <input required min="1" step="1" type="number" value={form.quota} onChange={(event) => setForm({ ...form, quota: event.target.value })} placeholder="100" className={inputClass} />

                </Field>

              </div>

              <Field label="Benefits (Optional)">

                <textarea rows={3} maxLength={500} value={form.benefit} onChange={(event) => setForm({ ...form, benefit: event.target.value })} placeholder="e.g. Exclusive merchandise, fast lane access..." className={`${inputClass} h-auto resize-none py-3`} />

              </Field>

            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">

              <button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-xl border border-white/10 px-4 text-xs font-semibold text-slate-300 transition hover:bg-white/5">Cancel</button>

              <button type="submit" disabled={saving} className="h-10 rounded-xl bg-[#5456DE] px-5 text-xs font-bold text-white transition hover:bg-[#6668F0] disabled:opacity-50">{saving ? "Saving..." : editing ? "Save Changes" : "Create Category"}</button>

            </div>

          </form>

        </div>

      )}

    </main>

  );

}

export default function ManageTicketsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading ticket categories...</div>}>
      <ManageTicketsContent />
    </Suspense>
  );
}
