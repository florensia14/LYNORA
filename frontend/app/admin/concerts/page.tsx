
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHero from "@/components/layout/AdminPageHero";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "").replace(/\/$/, "");
const API_URL = `${API_ORIGIN}/api`;

type Concert = {
  id: number;
  name: string;
  poster_url: string | null;
  start_date: string;
  end_date: string;
  venue_name: string;
  venue_address: string;
  category_name: string;
  organizer_name: string;
  quota: number;
  sold: number;
  revenue: number;
  approval_status: string;
  publication_status: string;
  display_status: string;
};

type Stats = {
  total: number;
  ongoing: number;
  published: number;
  draft: number;
  cancelled: number;
};

const emptyStats: Stats = {
  total: 0,
  ongoing: 0,
  published: 0,
  draft: 0,
  cancelled: 0,
};

const ICONS = {
  clipboard: "/icons/clipboard (1).png",
  notification: "/icons/notification (3).png",
  check: "/icons/check (1).png",
  draft: "/icons/draft.png",
  close: "/icons/close.png",
  calendar: "/icons/calendar (1).png",
  location: "/icons/location (1).png",
  category: "/icons/category.png",
  eye: "/icons/eye (1).png",
};

function PngIcon({ name, size = 18 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <img
      src={ICONS[name]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="shrink-0 object-contain"
    />
  );
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function imageUrl(value: string | null) {
  if (!value) return "/images/hero/ao.jpg";
  if (/^(https?:|data:)/i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function statusLabel(item: Concert) {
  if (item.approval_status === "pending") return "Pending";
  if (item.approval_status === "rejected") return "Rejected";
  if (item.display_status === "Ongoing") return "Ongoing";
  if (item.display_status === "Completed") return "Completed";
  if (item.publication_status === "published") return "Published";

  if (
    item.publication_status === "unpublished" ||
    item.publication_status === "draft"
  ) {
    return "Draft";
  }

  return item.display_status || "Approved";
}

function Status({ value }: { value: string }) {
  const style =
    value === "Published" || value === "Ongoing"
      ? "bg-[#0D3A36] text-[#35D5B2]"
      : value === "Pending"
        ? "bg-[#49391B] text-[#F4C44E]"
        : value === "Rejected" || value === "Cancelled"
          ? "bg-[#4A202D] text-[#FF8196]"
          : value === "Completed"
            ? "bg-[#27324A] text-[#B7C4DD]"
            : "bg-[#30254F] text-[#C4B5FD]";

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold ${style}`}>
      {value}
    </span>
  );
}

export default function ManageConcertsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [organizerFilter, setOrganizerFilter] = useState("All Organizers");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Concert | null>(null);

  const pageSize = 7;

  const loadConcerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/events/admin/concerts`, {
        headers: authHeaders(),
        cache: "no-store",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || "Unable to load concerts.");
      }

      setConcerts(payload.concerts || []);
      setStats(payload.stats || emptyStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load concerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConcerts();
  }, [loadConcerts]);

  const organizers = useMemo(
    () => [...new Set(concerts.map((c) => c.organizer_name).filter(Boolean))].sort(),
    [concerts]
  );

  const categories = useMemo(
    () => [...new Set(concerts.map((c) => c.category_name).filter(Boolean))].sort(),
    [concerts]
  );

  const filtered = useMemo(
    () =>
      concerts.filter((c) => {
        const status = statusLabel(c);
        const q = search.trim().toLowerCase();

        const matchesSearch =
          !q ||
          [c.name, c.organizer_name, c.venue_name, c.category_name, String(c.id)].some(
            (v) => String(v || "").toLowerCase().includes(q)
          );

        return (
          matchesSearch &&
          (statusFilter === "All Status" || status === statusFilter) &&
          (organizerFilter === "All Organizers" || c.organizer_name === organizerFilter) &&
          (categoryFilter === "All Categories" || c.category_name === categoryFilter)
        );
      }),
    [concerts, search, statusFilter, organizerFilter, categoryFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, organizerFilter, categoryFilter]);

  const statCards = [
    {
      label: "Total Concerts",
      value: stats.total,
      icon: "clipboard" as const,
      glow: "bg-[#8B5CF6]/20",
    },
    {
      label: "Ongoing",
      value: stats.ongoing,
      icon: "notification" as const,
      glow: "bg-[#22D3EE]/15",
    },
    {
      label: "Published",
      value: stats.published,
      icon: "check" as const,
      glow: "bg-[#35D5B2]/15",
    },
    {
      label: "Draft",
      value: stats.draft,
      icon: "draft" as const,
      glow: "bg-[#F4C44E]/15",
    },
    {
      label: "Cancel",
      value: stats.cancelled,
      icon: "close" as const,
      glow: "bg-[#FB7185]/15",
    },
  ];

  return (
    <div className="min-w-0 space-y-5 text-white">
      <AdminPageHero
        title={
          <>
            Manage{" "}
            <span className="bg-gradient-to-r from-[#22D3EE] to-[#C4B5FD] bg-clip-text text-transparent">
              Concerts
            </span>
          </>
        }
        description="View and manage all concerts across the LYNORA platform."
        backgroundImage="/images/hero/ao.jpg"
      />

      {/* STATISTICS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {statCards.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#343B60] bg-[#171D39] p-3.5 shadow-[0_8px_22px_rgba(0,0,0,.12)] sm:p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.glow}`}>
                <PngIcon name={item.icon} size={20} />
              </span>
              <span className="truncate text-[11px] text-slate-400 sm:text-xs">
                {item.label}
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* CONCERT DIRECTORY */}
      <section className="overflow-hidden rounded-xl border border-[#303957] bg-[#111A34] shadow-[0_12px_35px_rgba(0,0,0,.16)]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-bold text-white sm:text-lg">
              Concert Directory
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Manage concert listings, organizers, ticket capacity, and publication status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadConcerts}
            disabled={loading}
            className="rounded-lg border border-[#514477] px-3 py-2 text-xs font-semibold text-[#D8CCFF] transition hover:bg-white/5 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {/* SEARCH & FILTER */}
        <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-[minmax(0,1fr)_170px_180px_170px] sm:px-5">
          <label className="flex h-10 min-w-0 items-center gap-2.5 rounded-lg border border-[#514477] bg-[#0B1122] px-3 focus-within:border-[#8B5CF6]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search concert, organizer, venue..."
              className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 min-w-0 rounded-lg border border-[#394363] bg-[#171D39] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]"
          >
            {[
              "All Status",
              "Pending",
              "Published",
              "Ongoing",
              "Draft",
              "Completed",
              "Rejected",
              "Cancelled",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <select
            value={organizerFilter}
            onChange={(e) => setOrganizerFilter(e.target.value)}
            className="h-10 min-w-0 rounded-lg border border-[#394363] bg-[#171D39] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]"
          >
            <option>All Organizers</option>
            {organizers.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 min-w-0 rounded-lg border border-[#394363] bg-[#171D39] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]"
          >
            <option>All Categories</option>
            {categories.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mx-4 mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 sm:mx-5">
            {error}
          </div>
        )}

        {/* CONCERT TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left">
            <thead>
              <tr className="bg-[#4025A5] text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]">
                <th className="px-4 py-3">Concert Details</th>
                <th className="px-3 py-3">Date, Venue &amp; Category</th>
                <th className="px-3 py-3">Organizer</th>
                <th className="px-3 py-3 text-center">Tickets</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#28324F]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400">
                    Loading concerts...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400">
                    No concerts found.
                  </td>
                </tr>
              ) : (
                visible.map((c) => {
                  const status = statusLabel(c);

                  return (
                    <tr key={c.id} className="transition hover:bg-white/[0.025]">
                      <td className="px-4 py-3">
                        <div className="flex min-w-[220px] items-center gap-3">
                          <img
                            src={imageUrl(c.poster_url)}
                            alt={c.name}
                            onError={(e) => {
                              e.currentTarget.src = "/icons/music.png";
                            }}
                            className="h-14 w-12 shrink-0 rounded-md border border-white/10 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate text-xs font-bold text-white">
                              {c.name}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500">
                              ID: CNS-{String(c.id).padStart(3, "0")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="space-y-1.5 text-[10px] text-slate-300">
                          <p className="flex items-center gap-1.5">
                            <PngIcon name="calendar" size={13} />
                            {formatDate(c.start_date)}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <PngIcon name="location" size={13} />
                            <span className="max-w-[145px] truncate">
                              {c.venue_name}
                            </span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <PngIcon name="category" size={13} />
                            {c.category_name}
                          </p>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] text-[10px] font-bold">
                            {(c.organizer_name || "O").slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[110px] truncate text-xs font-semibold">
                              {c.organizer_name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Organizer
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <p className="text-xs font-bold text-white">
                          {c.sold.toLocaleString("id-ID")}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          / {c.quota.toLocaleString("id-ID")}
                        </p>
                      </td>

                      <td className="px-3 py-3">
                        <Status value={status} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            title="View Concert Details"
                            aria-label={`View details of ${c.name}`}
                            onClick={() => setSelected(c)}
                            className="grid h-9 w-9 place-items-center rounded-lg transition hover:bg-white/10"
                          >
                            <PngIcon name="eye" size={19} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col gap-2 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[10px] text-slate-400">
            Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} concerts
          </p>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`h-7 min-w-7 rounded-md border px-2 text-[10px] font-semibold ${
                  page === n
                    ? "border-[#8B5CF6] bg-[#7544DD] text-white"
                    : "border-[#38415E] bg-[#111A34] text-slate-300 hover:border-[#8B5CF6]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CONCERT DETAIL MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#6750A6] bg-[#111A34] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold tracking-[2px] text-[#A78BFA]">
                  CONCERT DETAILS
                </p>
                <h3 className="mt-1 text-lg font-bold text-white">
                  {selected.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-400 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-[150px_1fr]">
              <img
                src={imageUrl(selected.poster_url)}
                alt={selected.name}
                className="h-48 w-full rounded-lg object-cover sm:w-[150px]"
              />

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-slate-500">Organizer</p>
                  <p className="font-semibold text-white">
                    {selected.organizer_name}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Date</p>
                  <p className="text-white">
                    {formatDate(selected.start_date)} – {formatDate(selected.end_date)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Venue</p>
                  <p className="text-white">
                    {selected.venue_name} · {selected.venue_address}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Category</p>
                  <p className="text-white">{selected.category_name}</p>
                </div>

                <div>
                  <p className="text-slate-500">Tickets sold / quota</p>
                  <p className="text-white">
                    {selected.sold.toLocaleString("id-ID")} / {selected.quota.toLocaleString("id-ID")}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Status</p>
                  <Status value={statusLabel(selected)} />
                </div>

                <div>
                  <p className="text-slate-500">Revenue</p>
                  <p className="font-semibold text-white">
                    {money(selected.revenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 p-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
