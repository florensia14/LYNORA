"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

type Concert = {
  id: number;
  name: string;
  start_date?: string;
  venue_name?: string;
  poster_url?: string;
};

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
const PAGE_SIZE = 10;

const formatNumber = (value: number) => new Intl.NumberFormat("id-ID").format(value || 0);

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value?: string) {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCheckInStatus(status: string) {
  return String(status).toLowerCase() === "used" ? "checked" : "not_checked";
}

function getHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function OrganizerAttendeesPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [eventId, setEventId] = useState("all");
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [checkin, setCheckin] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const attendeeUrl =
          `${API}/tickets/organizer/attendees` +
          (eventId !== "all" ? `?eventId=${encodeURIComponent(eventId)}` : "");

        const [concertResponse, attendeeResponse] = await Promise.all([
          fetch(`${API}/events/organizer/concerts`, {
            headers: getHeaders(),
            cache: "no-store",
          }),
          fetch(attendeeUrl, {
            headers: getHeaders(),
            cache: "no-store",
          }),
        ]);

        const [concertPayload, attendeePayload] = await Promise.all([
          concertResponse.json(),
          attendeeResponse.json(),
        ]);

        if (!concertResponse.ok) {
          throw new Error(concertPayload?.message || "Failed to load concerts.");
        }

        if (!attendeeResponse.ok) {
          throw new Error(attendeePayload?.message || "Failed to load attendee data.");
        }

        setConcerts(Array.isArray(concertPayload?.concerts) ? concertPayload.concerts : []);
        setAttendees(Array.isArray(attendeePayload?.data) ? attendeePayload.data : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading attendees."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [query, category, checkin, eventId]);

  const selectedConcert = concerts.find((concert) => String(concert.id) === eventId);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(attendees.map((item) => item.category_name).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [attendees]
  );

  const filteredAttendees = useMemo(() => {
    const search = query.trim().toLowerCase();

    return attendees.filter((item) => {
      const searchableText = [
        item.attendee_name,
        item.attendee_email,
        item.ticket_code,
        item.order_code,
        item.event_name,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(search);
      const matchesCategory = category === "all" || item.category_name === category;
      const matchesCheckin =
        checkin === "all" || getCheckInStatus(item.ticket_status) === checkin;

      return matchesSearch && matchesCategory && matchesCheckin;
    });
  }, [attendees, query, category, checkin]);

  const checkedCount = attendees.filter(
    (item) => getCheckInStatus(item.ticket_status) === "checked"
  ).length;
  const notCheckedCount = attendees.length - checkedCount;
  const checkInRate = attendees.length
    ? Math.round((checkedCount / attendees.length) * 100)
    : 0;

  const totalPages = Math.max(1, Math.ceil(filteredAttendees.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleAttendees = filteredAttendees.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const exportCsv = () => {
    const columns = [
      "Ticket ID",
      "Attendee",
      "Email",
      "Concert",
      "Category",
      "Order ID",
      "Status",
      "Check-In Time",
    ];

    const rows = filteredAttendees.map((item) => [
      item.ticket_code,
      item.attendee_name,
      item.attendee_email,
      item.event_name,
      item.category_name,
      item.order_code,
      getCheckInStatus(item.ticket_status) === "checked" ? "Checked-In" : "Not Checked-In",
      item.checked_at || "",
    ]);

    const csv = [columns, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blobUrl = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "lynora-attendees.csv";
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setCheckin("all");
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 text-white">
      <OrganizerPageHero
        eyebrow="LYNORA EVENT MANAGEMENT"
        title="Attendees"
        description="View and manage the ticket holders of your concerts. Monitor attendance and check-in activity."
      >
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredAttendees.length === 0}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-[#111A32]/70 px-4 text-xs font-bold text-white transition hover:border-[#22D3EE]/40 hover:bg-[#202A4F] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <img src="/icons/direct-download.png" alt="" className="h-4 w-4 object-contain" />
          Export Data
        </button>
        <button
          type="button"
          onClick={() => void loadData(true)}
          disabled={loading || refreshing}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-4 text-xs font-bold text-white shadow-lg shadow-purple-950/30 transition hover:brightness-110 disabled:opacity-50"
        >
          <span className={refreshing ? "animate-spin" : ""}>↻</span>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </OrganizerPageHero>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151C36]">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {selectedConcert?.poster_url ? (
              <img
                src={selectedConcert.poster_url}
                alt={selectedConcert.name}
                className="h-[68px] w-[68px] shrink-0 rounded-xl border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-xl border border-[#8B5CF6]/20 bg-gradient-to-br from-[#45258B] to-[#172C50]">
                <img src="/icons/Attendees(1).png" alt="" className="h-8 w-8 object-contain" />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Selected Concert
              </p>
              <h2 className="mt-1 truncate text-sm font-extrabold text-white sm:text-base">
                {selectedConcert?.name || "All Concerts"}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                {selectedConcert?.start_date && <span>{formatShortDate(selectedConcert.start_date)}</span>}
                {selectedConcert?.venue_name && <span>{selectedConcert.venue_name}</span>}
                {eventId === "all" && <span>Showing all your concerts</span>}
              </div>
            </div>
          </div>

          <div className="w-full lg:max-w-[330px]">
            <label
              htmlFor="attendees-concert-filter"
              className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-500"
            >
              Choose Concert
            </label>
            <select
              id="attendees-concert-filter"
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#0B1122] px-3 text-xs text-slate-200 outline-none transition focus:border-[#8B5CF6]"
            >
              <option value="all">All Concerts</option>
              {concerts.map((concert) => (
                <option key={concert.id} value={concert.id}>
                  {concert.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total Tickets"
          value={formatNumber(attendees.length)}
          icon="/icons/Attendees(1).png"
          tone="blue"
        />
        <StatCard
          label="Check-Ins"
          value={formatNumber(checkedCount)}
          icon="/icons/check (1).png"
          tone="green"
        />
        <StatCard
          label="Not Checked-In"
          value={formatNumber(notCheckedCount)}
          icon="/icons/clock.png"
          tone="yellow"
        />
        <StatCard
          label="Check-In Rate"
          value={`${checkInRate}%`}
          icon="/icons/sales(1).png"
          tone="purple"
          progress={checkInRate}
        />
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#151C36] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#22D3EE]" />
              <h2 className="text-base font-bold text-white">Attendee List</h2>
            </div>
            <p className="mt-1 pl-3 text-[10px] text-slate-500">
              {formatNumber(filteredAttendees.length)} attendees found
            </p>
          </div>

          <div className="relative w-full xl:max-w-[350px]">
            <img
              src="/icons/search.png"
              alt=""
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 object-contain opacity-50"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, ticket..."
              className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1122] pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-[#8B5CF6]"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Filter:
          </span>
          <select
            value={checkin}
            onChange={(event) => setCheckin(event.target.value)}
            className="h-9 min-w-[145px] rounded-lg border border-white/10 bg-[#0B1122] px-3 text-[10px] text-slate-200 outline-none transition focus:border-[#8B5CF6]"
          >
            <option value="all">All Status</option>
            <option value="checked">Checked-In</option>
            <option value="not_checked">Not Checked-In</option>
          </select>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-9 min-w-[145px] rounded-lg border border-white/10 bg-[#0B1122] px-3 text-[10px] text-slate-200 outline-none transition focus:border-[#8B5CF6]"
          >
            <option value="all">All Categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {(query || category !== "all" || checkin !== "all") && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-9 rounded-lg px-3 text-[10px] font-semibold text-[#B9A8FF] transition hover:bg-white/[0.05] hover:text-white"
            >
              Reset Filters
            </button>
          )}
          <span className="ml-auto text-[10px] text-slate-500">
            {formatNumber(checkedCount)} checked-in
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151C36] shadow-[0_15px_40px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col gap-2 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#202A4F]">
              <img src="/icons/Attendees(1).png" alt="" className="h-4 w-4 object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Attendee Records</h2>
              <p className="mt-0.5 text-[9px] text-slate-500">Ticket holder and check-in information</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500">
            {formatNumber(filteredAttendees.length)} records
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : error ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-bold text-rose-300">Failed to load attendees</p>
            <p className="mt-2 text-xs text-slate-400">{error}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-4 rounded-xl bg-[#5456DE] px-4 py-2 text-xs font-bold text-white"
            >
              Try Again
            </button>
          </div>
        ) : visibleAttendees.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#202A4F]">
              <img src="/icons/Attendees.png" alt="" className="h-7 w-7 object-contain" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-white">No attendees found</h3>
            <p className="mt-2 text-xs text-slate-500">
              Attendees from paid ticket orders will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "7%" }} />
                </colgroup>
                <thead className="bg-gradient-to-r from-[#512BB9] to-[#4025A1] text-[9px] uppercase tracking-wider text-white">
                  <tr>
                    {["#", "Ticket ID", "Attendee", "Concert", "Category", "Order ID", "Check-In Status", "Action"].map(
                      (label) => (
                        <th key={label} className="px-2 py-3.5 font-bold">
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.055]">
                  {visibleAttendees.map((item, index) => (
                    <tr key={item.ticket_id} className="transition-colors hover:bg-[#202A4F]/35">
                      <td className="px-2 py-4 text-[10px] font-semibold text-slate-500">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="overflow-hidden px-2 py-4">
                        <p title={item.ticket_code} className="break-all text-[10px] font-bold leading-4 text-[#B9A8FF]">
                          {item.ticket_code}
                        </p>
                      </td>
                      <td className="overflow-hidden px-2 py-4">
                        <p className="truncate text-xs font-semibold text-slate-200">
                          {item.attendee_name || "Customer"}
                        </p>
                        <p className="mt-1 truncate text-[9px] text-slate-500">
                          {item.attendee_email || "—"}
                        </p>
                      </td>
                      <td className="overflow-hidden px-2 py-4">
                        <p title={item.event_name} className="line-clamp-2 text-[10px] leading-4 text-slate-300">
                          {item.event_name}
                        </p>
                      </td>
                      <td className="overflow-hidden px-2 py-4">
                        <span title={item.category_name} className="inline-flex max-w-full truncate rounded-md bg-[#202A4F] px-2 py-1 text-[9px] font-semibold text-[#C4B5FD]">
                          {item.category_name}
                        </span>
                      </td>
                      <td className="overflow-hidden px-2 py-4">
                        <p title={item.order_code} className="break-all text-[9px] leading-4 text-slate-400">
                          {item.order_code}
                        </p>
                      </td>
                      <td className="overflow-hidden px-2 py-4">
                        <StatusBadge status={item.ticket_status} />
                      </td>
                      <td className="px-2 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedAttendee(item)}
                          aria-label={`View details for ${item.attendee_name || "attendee"}`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-[#8B5CF6]/25 bg-[#282044] px-2 text-[9px] font-bold text-[#C4B5FD] transition hover:border-[#22D3EE]/40 hover:bg-[#202A4F] hover:text-white"
                        >
                          <img src="/icons/eye (1).png" alt="" className="h-3.5 w-3.5 object-contain" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/[0.06] lg:hidden">
              {visibleAttendees.map((item, index) => (
                <article key={item.ticket_id} className="space-y-3 p-4 transition hover:bg-white/[0.02] sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#202A4F] text-[10px] font-bold text-[#B9A8FF]">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="break-all text-xs font-bold text-[#B9A8FF]">{item.ticket_code}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{item.order_code}</p>
                      </div>
                    </div>
                    <StatusBadge status={item.ticket_status} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-200">{item.attendee_name || "Customer"}</p>
                    <p className="mt-1 break-all text-[10px] text-slate-500">{item.attendee_email || "—"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0 rounded-lg bg-[#202A4F]/50 p-3">
                      <p className="text-[9px] text-slate-500">Concert</p>
                      <p className="mt-1 line-clamp-2 text-[10px] text-slate-300">{item.event_name}</p>
                    </div>
                    <div className="min-w-0 rounded-lg bg-[#202A4F]/50 p-3">
                      <p className="text-[9px] text-slate-500">Ticket Category</p>
                      <p className="mt-1 truncate text-[10px] text-slate-300">{item.category_name}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                    <p className="text-[10px] text-slate-500">Check-in: {formatDateTime(item.checked_at)}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedAttendee(item)}
                      className="rounded-lg border border-[#8B5CF6]/25 bg-[#282044] px-3 py-2 text-[10px] font-bold text-[#C4B5FD]"
                    >
                      View Details
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/[0.07] bg-[#0E172D]/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[10px] text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-300">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredAttendees.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-300">{formatNumber(filteredAttendees.length)}</span> attendees
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="h-9 rounded-lg border border-white/10 px-3 text-[10px] font-semibold text-slate-300 transition hover:border-[#8B5CF6]/50 hover:bg-[#202A4F] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="min-w-[64px] text-center text-[10px] font-semibold text-slate-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className="h-9 rounded-lg border border-white/10 px-3 text-[10px] font-semibold text-slate-300 transition hover:border-[#8B5CF6]/50 hover:bg-[#202A4F] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <AttendeeDetailModal
        attendee={selectedAttendee}
        onClose={() => setSelectedAttendee(null)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  progress,
}: {
  label: string;
  value: string;
  icon: string;
  tone: "blue" | "green" | "yellow" | "purple";
  progress?: number;
}) {
  const iconBackground = {
    blue: "bg-[#202A4F]",
    green: "bg-[#152B32]",
    yellow: "bg-[#2E2723]",
    purple: "bg-[#282044]",
  }[tone];

  return (
    <article className="h-[112px] min-w-0 rounded-xl border border-white/[0.07] bg-[#111A32] p-3.5 sm:h-[120px] sm:p-4">
      {progress !== undefined ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium text-slate-400 sm:text-sm">
              {label}
            </p>
            <p className="shrink-0 text-sm font-bold text-[#C4B5FD] sm:text-base">
              {value}
            </p>
          </div>

          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#252C4B]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500 sm:text-xs">
              Attendance completion
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium text-slate-400 sm:text-sm">
              {label}
            </p>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBackground}`}>
              <img src={icon} alt="" className="h-5 w-5 object-contain" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold leading-none text-white sm:text-[28px]">
            {value}
          </p>
        </>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const checked = getCheckInStatus(status) === "checked";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-bold ${
        checked
          ? "border-[#26ADA0]/25 bg-[#152B32] text-[#42D6C5]"
          : "border-[#F5B84E]/25 bg-[#2E2723] text-[#F5B84E]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${checked ? "bg-[#42D6C5]" : "bg-[#F5B84E]"}`} />
      {checked ? "Checked-In" : "Not Checked-In"}
    </span>
  );
}

function AttendeeDetailModal({
  attendee,
  onClose,
}: {
  attendee: Attendee | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!attendee) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [attendee]);

  if (!attendee) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendee-detail-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[440px] max-h-[calc(100dvh-24px)] overflow-hidden rounded-2xl border border-white/10 bg-[#151C36] shadow-2xl sm:max-h-[calc(100dvh-40px)]"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-[#512BB9] to-[#4025A1] px-4 py-3">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-purple-200">
              Ticket Information
            </p>
            <h2
              id="attendee-detail-title"
              className="mt-0.5 text-sm font-bold text-white"
            >
              Attendee Details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-base text-white transition hover:bg-white/20"
          >
            ×
          </button>
        </div>

        <div className="space-y-1 px-4 py-3">
          <div className="mb-2 rounded-lg border border-white/[0.07] bg-[#0B1122]/70 px-3 py-2.5">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-500">
              Ticket Code
            </p>
            <p className="mt-1 break-all text-xs font-bold leading-4 text-[#B9A8FF]">
              {attendee.ticket_code}
            </p>
          </div>

          <DetailRow
            label="Attendee"
            value={attendee.attendee_name || "Customer"}
          />
          <DetailRow
            label="Email"
            value={attendee.attendee_email || "—"}
          />
          <DetailRow
            label="Concert"
            value={attendee.event_name || "—"}
          />
          <DetailRow
            label="Ticket Category"
            value={attendee.category_name || "—"}
          />
          <DetailRow
            label="Order ID"
            value={attendee.order_code || "—"}
          />
          <DetailRow
            label="Issued At"
            value={formatDateTime(attendee.issued_at)}
          />
          <DetailRow
            label="Check-In Time"
            value={formatDateTime(attendee.checked_at)}
          />

          <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-2.5">
            <span className="text-[10px] text-slate-400">
              Check-In Status
            </span>
            <StatusBadge status={attendee.ticket_status} />
          </div>
        </div>

        <div className="border-t border-white/[0.07] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-full rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] text-[11px] font-bold text-white transition hover:brightness-110"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[30px] items-center justify-between gap-3 border-b border-white/[0.045] py-1.5">
      <span className="shrink-0 text-[9px] text-slate-500">
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-[10px] font-medium leading-4 text-slate-200">
        {value}
      </span>
    </div>
  );
}
