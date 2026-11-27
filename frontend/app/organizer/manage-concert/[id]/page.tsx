// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function imageUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:)/i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function formatDate(value, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("id-ID", withTime
    ? { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }
    : { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusLabel(concert) {
  const approval = String(concert.approval_status || "").toLowerCase();
  const publication = String(concert.publication_status || "").toLowerCase();
  const display = String(concert.display_status || "").toLowerCase();

  if (approval === "rejected" || display === "rejected") return "Rejected";
  if (approval === "revision_required" || display === "revision") return "Revision Required";
  if (approval !== "approved") return "Pending Review";
  if (publication !== "published") return "Draft";
  if (display === "ongoing") return "Ongoing";
  if (display === "completed") return "Completed";
  return "Published";
}

function StatusBadge({ children }) {
  const value = String(children).toLowerCase();
  const color = value.includes("reject")
    ? "border-rose-400/20 bg-rose-500/10 text-rose-300"
    : value.includes("pending") || value.includes("revision")
      ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
      : value === "draft"
        ? "border-violet-400/20 bg-violet-500/10 text-violet-300"
        : value === "ongoing"
          ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-300"
          : value === "completed"
            ? "border-slate-400/20 bg-slate-500/10 text-slate-300"
            : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>{children}</span>;
}

function InfoCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#151D38] p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 break-words text-lg font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Section({ title, subtitle, children, action }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#111A33] p-4 shadow-[0_12px_35px_rgba(0,0,0,0.12)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white sm:text-lg">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-400 sm:text-sm">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function OrganizerConcertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const concertId = String(params?.id || "");

  const [concert, setConcert] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketLoading, setTicketLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticketError, setTicketError] = useState("");

  const loadDetail = useCallback(async () => {
    if (!concertId || !/^\d+$/.test(concertId)) {
      setError("ID konser tidak valid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Use the organizer-only list endpoint so Draft, Pending, and Rejected
      // concerts can also be viewed. The public GET /events/:id endpoint
      // intentionally returns only approved and published concerts.
      const response = await fetch(`${API_ORIGIN}/api/events/organizer/concerts`, {
        headers: { ...authHeaders() },
        cache: "no-store",
      });

      const body = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error("Sesi login berakhir. Silakan login kembali.");
      if (!response.ok) throw new Error(body.message || "Gagal mengambil data konser.");

      const list = Array.isArray(body.concerts) ? body.concerts : [];
      const found = list.find((item) => String(item.id) === concertId);
      if (!found) throw new Error("Konser tidak ditemukan atau bukan milik akun Organizer ini.");

      setConcert(found);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mengambil detail konser.");
    } finally {
      setLoading(false);
    }
  }, [concertId]);

  const loadTickets = useCallback(async () => {
    if (!concertId || !/^\d+$/.test(concertId)) {
      setTicketLoading(false);
      return;
    }

    setTicketLoading(true);
    setTicketError("");
    try {
      const response = await fetch(`${API_ORIGIN}/api/events/${concertId}/tickets`, {
        headers: { ...authHeaders() },
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error("Sesi login berakhir. Silakan login kembali.");
      if (!response.ok) throw new Error(body.message || "Gagal mengambil kategori tiket.");

      setTickets(Array.isArray(body.ticket_categories) ? body.ticket_categories : []);
    } catch (err) {
      setTicketError(err.message || "Kategori tiket belum dapat dimuat.");
      setTickets([]);
    } finally {
      setTicketLoading(false);
    }
  }, [concertId]);

  useEffect(() => {
    loadDetail();
    loadTickets();
  }, [loadDetail, loadTickets]);

  const totals = useMemo(() => {
    const quota = tickets.reduce((sum, item) => sum + Number(item.quota || 0), 0);
    const sold = tickets.reduce((sum, item) => sum + Number(item.sold || 0), 0);
    const remaining = tickets.reduce((sum, item) => sum + Number(item.remaining ?? Math.max(0, Number(item.quota || 0) - Number(item.sold || 0))), 0);
    const revenue = tickets.reduce((sum, item) => sum + Number(item.sold || 0) * Number(item.price || 0), 0);
    return { quota, sold, remaining, revenue, percent: quota ? Math.min(100, (sold / quota) * 100) : 0 };
  }, [tickets]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-white/10" />
          <div className="h-56 rounded-2xl bg-white/[0.06]" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1,2,3,4].map((x) => <div key={x} className="h-24 rounded-xl bg-white/[0.06]" />)}</div>
          <div className="h-64 rounded-2xl bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="mx-auto flex min-h-[55vh] w-full max-w-[900px] items-center justify-center px-3">
        <div className="w-full rounded-2xl border border-rose-400/15 bg-[#111A33] p-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-2xl text-rose-300">!</div>
          <h1 className="mt-4 text-lg font-bold text-white">Concert detail unavailable</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">{error || "Data konser tidak ditemukan."}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button onClick={loadDetail} className="rounded-xl bg-[#5456DE] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">Try again</button>
            <Link href="/organizer/manage-concert" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5">Back to Manage Concerts</Link>
          </div>
        </div>
      </div>
    );
  }

  const title = concert.name || "Untitled Concert";
  const poster = imageUrl(concert.poster_url);
  const status = statusLabel(concert);
  const start = concert.start_date;
  const end = concert.end_date;
  const mapUrl = concert.latitude != null && concert.longitude != null
    ? `https://www.openstreetmap.org/?mlat=${concert.latitude}&mlon=${concert.longitude}#map=16/${concert.latitude}/${concert.longitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(concert.venue_address || concert.venue_name || "")}`;

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-[#A99AFF]">ORGANIZER MANAGEMENT</p>
          <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Concert Details</h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">View your concert information and sales performance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/organizer/manage-concert" className="inline-flex items-center rounded-xl border border-white/10 bg-[#151D38] px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-[#8B5CF6]/50 hover:bg-[#202A4F]">
            ← Back to concerts
          </Link>
          <Link href={`/organizer/manage-tickets?concert=${concert.id}`} className="inline-flex items-center rounded-xl bg-[linear-gradient(100deg,#8B5CF6,#5456DE)] px-3.5 py-2.5 text-xs font-bold text-white shadow-[0_6px_20px_rgba(139,92,246,0.22)] transition hover:brightness-110">
            Manage Tickets
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#8B5CF6]/25 bg-[linear-gradient(110deg,#171D3D_0%,#202A4F_52%,#17172F_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
        <div className="grid min-w-0 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="relative min-h-[220px] overflow-hidden bg-[#202A4F] md:min-h-[270px]">
            {poster ? <img src={poster} alt={`${title} poster`} className="absolute inset-0 h-full w-full object-cover" /> : (
              <div className="flex h-full min-h-[220px] items-center justify-center bg-[radial-gradient(circle_at_top,#8B5CF6_0%,#202A4F_55%,#0B1122_100%)] text-5xl font-black text-white/70">L</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1122]/55 to-transparent md:bg-gradient-to-r" />
          </div>
          <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge>{status}</StatusBadge>
              {concert.category_name ? <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-slate-300">{concert.category_name}</span> : null}
              <span className="text-xs text-slate-500">ID: CNS-{concert.id}</span>
            </div>
            <h2 className="mt-4 break-words text-2xl font-extrabold leading-tight text-white sm:text-3xl">{title}</h2>
            <p className="mt-3 line-clamp-4 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-300">{concert.description || "No concert description provided."}</p>
            <div className="mt-5 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div><span className="text-slate-500">Concert date</span><p className="mt-1 font-semibold text-white">{formatDate(start, true)}</p></div>
              <div><span className="text-slate-500">Venue</span><p className="mt-1 font-semibold text-white">{concert.venue_name || "-"}</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <InfoCard label="Tickets Sold" value={`${totals.sold.toLocaleString("id-ID")} / ${totals.quota.toLocaleString("id-ID")}`} hint="Paid ticket orders" />
        <InfoCard label="Available Tickets" value={totals.remaining.toLocaleString("id-ID")} hint="Remaining quota" />
        <InfoCard label="Estimated Gross Revenue" value={rupiah(totals.revenue)} hint="Based on paid tickets" />
        <InfoCard label="Sales Progress" value={`${totals.percent.toFixed(1)}%`} hint="Sold tickets compared with quota" />
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
        <div className="min-w-0 space-y-4">
          <Section title="Ticket Categories" subtitle="Ticket prices, quota, and sales availability for this concert." action={<button onClick={loadTickets} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">Refresh</button>}>
            {ticketLoading ? (
              <div className="space-y-2">{[1,2].map((x) => <div key={x} className="h-20 animate-pulse rounded-xl bg-white/[0.05]" />)}</div>
            ) : ticketError ? (
              <div className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-4 text-sm text-amber-200">{ticketError}</div>
            ) : tickets.length ? (
              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const quota = Number(ticket.quota || 0);
                  const sold = Number(ticket.sold || 0);
                  const percent = quota ? Math.min(100, (sold / quota) * 100) : 0;
                  return (
                    <div key={ticket.id} className="rounded-xl border border-white/[0.07] bg-[#151D38] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-white">{ticket.name}</h3>
                          <p className="mt-1 text-xs text-slate-400">{ticket.benefit || "No additional benefits provided."}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#B9A5FF]">{rupiah(ticket.price)}</p>
                          <span className="mt-1 inline-block rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-300">{ticket.status || "—"}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                        <span>{sold.toLocaleString("id-ID")} sold</span>
                        <span>{quota.toLocaleString("id-ID")} quota</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#0B1122]">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#8B5CF6]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-300">No ticket categories yet</p>
                <p className="mt-1 text-xs text-slate-500">Add ticket categories to start managing ticket sales.</p>
                <Link href={`/organizer/manage-tickets?concert=${concert.id}`} className="mt-4 inline-flex rounded-lg bg-[#5456DE] px-4 py-2 text-xs font-bold text-white hover:brightness-110">Manage Tickets</Link>
              </div>
            )}
          </Section>

          <Section title="Concert Description" subtitle="Full event description">
            <p className="whitespace-pre-line text-sm leading-7 text-slate-300">{concert.description || "No description provided."}</p>
          </Section>
        </div>

        <div className="min-w-0 space-y-4">
          <Section title="Date & Schedule" subtitle="Concert and ticket sales timeline">
            <div className="space-y-4">
              <div className="border-l-2 border-[#8B5CF6] pl-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Concert starts</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatDate(start, true)}</p>
              </div>
              <div className="border-l-2 border-[#22D3EE] pl-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Concert ends</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatDate(end, true)}</p>
              </div>
              <div className="grid gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-2 xl:grid-cols-1">
                <div><p className="text-[11px] text-slate-500">Ticket sales start</p><p className="mt-1 text-sm font-semibold text-white">{formatDate(concert.sales_start_at, true)}</p></div>
                <div><p className="text-[11px] text-slate-500">Ticket sales end</p><p className="mt-1 text-sm font-semibold text-white">{formatDate(concert.sales_end_at, true)}</p></div>
              </div>
            </div>
          </Section>

          <Section title="Venue & Location" subtitle="Saved concert venue information">
            <h3 className="text-sm font-bold text-white">{concert.venue_name || "Venue not set"}</h3>
            <p className="mt-2 text-xs leading-6 text-slate-400">{concert.venue_address || "No venue address available."}</p>
            {concert.latitude != null && concert.longitude != null ? (
              <div className="mt-3 rounded-xl border border-white/[0.07] bg-[#151D38] p-3">
                <p className="text-[11px] text-slate-500">Coordinates</p>
                <p className="mt-1 break-all text-xs font-medium text-slate-200">{concert.latitude}, {concert.longitude}</p>
              </div>
            ) : null}
            <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#8B5CF6]/40 px-3 py-2 text-xs font-semibold text-[#C4B5FD] transition hover:bg-[#8B5CF6]/10">
              View on OpenStreetMap ↗
            </a>
          </Section>

          <Section title="Concert Status" subtitle="Approval and publication workflow">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-400">Approval</span><StatusBadge>{concert.approval_status || "Pending"}</StatusBadge></div>
              <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-400">Publication</span><StatusBadge>{concert.publication_status || "Draft"}</StatusBadge></div>
              <div className="border-t border-white/[0.07] pt-3 text-xs leading-5 text-slate-500">
                {String(concert.approval_status).toLowerCase() === "rejected"
                  ? "This concert was rejected. Review the feedback in your concert workflow before making changes."
                  : String(concert.approval_status).toLowerCase() !== "approved"
                    ? "This concert is waiting for Super Admin review and is not visible to customers yet."
                    : String(concert.publication_status).toLowerCase() === "published"
                      ? "This concert is approved and published for customers."
                      : "This concert is approved but currently saved as a draft."}
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/organizer/manage-concert" className="rounded-xl border border-white/10 bg-[#151D38] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5">Back</Link>
        <Link href={`/organizer/manage-tickets?concert=${concert.id}`} className="rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-4 py-2.5 text-xs font-bold text-white hover:brightness-110">Manage Tickets</Link>
      </div>
    </main>
  );
}
