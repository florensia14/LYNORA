
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHero from "@/components/layout/AdminPageHero";

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

type ConcertResponse = {
  success: boolean;
  message?: string;
  total: number;
  stats: {
    total: number;
    ongoing: number;
    published: number;
    draft: number;
    cancelled: number;
  };
  concerts: Concert[];
};

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

const API_URL = `${API_ORIGIN}/api`;

const FILTERS = [
  "All Status",
  "Published",
  "Ongoing",
  "Draft",
  "Pending",
  "Rejected",
  "Completed",
  "Cancelled",
];

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("id-ID");
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function imageUrl(value: string | null) {
  if (!value) return "";

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

function statusStyle(status: string) {
  const styles: Record<string, string> = {
    Published: "bg-emerald-500/15 text-emerald-400",
    Ongoing: "bg-cyan-500/15 text-cyan-400",
    Completed: "bg-slate-500/20 text-slate-300",
    Draft: "bg-amber-500/15 text-amber-400",
    Pending: "bg-yellow-500/15 text-yellow-400",
    Rejected: "bg-rose-500/15 text-rose-400",
    Cancelled: "bg-rose-500/15 text-rose-400",
  };

  return styles[status] || "bg-slate-500/20 text-slate-300";
}

export default function AdminConcertsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    ongoing: 0,
    published: 0,
    draft: 0,
    cancelled: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Status");

  const loadConcerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      const response = await fetch(
        `${API_URL}/events/admin/concerts`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const result: ConcertResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil daftar konser.",
        );
      }

      setConcerts(
        Array.isArray(result.concerts) ? result.concerts : [],
      );

      setStats(
        result.stats || {
          total: 0,
          ongoing: 0,
          published: 0,
          draft: 0,
          cancelled: 0,
        },
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data konser.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConcerts();
  }, [loadConcerts]);

  const filteredConcerts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return concerts.filter((concert) => {
      const matchesSearch = [
        concert.name,
        concert.organizer_name,
        concert.category_name,
        concert.venue_name,
      ].some((value) =>
        String(value || "").toLowerCase().includes(keyword),
      );

      const matchesStatus =
        filter === "All Status" ||
        concert.display_status === filter;

      return matchesSearch && matchesStatus;
    });
  }, [concerts, search, filter]);

  const statCards = [
    {
      label: "Total Concerts",
      value: stats.total,
      icon: "/icons/clipboard (1).png",
    },
    {
      label: "Ongoing",
      value: stats.ongoing,
      icon: "/icons/calendar (1).png",
    },
    {
      label: "Published",
      value: stats.published,
      icon: "/icons/check (1).png",
    },
    {
      label: "Draft",
      value: stats.draft,
      icon: "/icons/draft.png",
    },
    {
      label: "Cancelled",
      value: stats.cancelled,
      icon: "/icons/close.png",
    },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <AdminPageHero
        eyebrow="SUPER ADMIN WORKSPACE"
        title="Manage Concerts"
        description="Monitor and manage all concerts registered on LYNORA."
      >
        <button
          type="button"
          onClick={loadConcerts}
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </AdminPageHero>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/[0.07] bg-[#161F3B] p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#8B5CF6]/20">
                <img
                  src={card.icon}
                  alt=""
                  className="h-5 w-5 object-contain"
                />
              </div>
              <span className="text-xs text-slate-400">
                {card.label}
              </span>
            </div>

            <p className="text-2xl font-extrabold text-white">
              {formatNumber(card.value)}
            </p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111A32]">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-white">
              All Concerts
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {filteredConcerts.length} concerts found
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search concert, organizer..."
              className="min-w-0 rounded-lg border border-white/10 bg-[#0B1122] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] sm:w-64"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#0B1122] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
            >
              {FILTERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
            <button
              type="button"
              onClick={loadConcerts}
              className="ml-3 font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-[#3E2DAA] text-xs font-bold text-white">
              <tr>
                <th className="px-4 py-4">Concert Details</th>
                <th className="px-4 py-4">Organizer</th>
                <th className="px-4 py-4">Date & Venue</th>
                <th className="px-4 py-4">Tickets Sold</th>
                <th className="px-4 py-4">Gross Revenue</th>
                <th className="px-4 py-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.07]">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    Loading concerts...
                  </td>
                </tr>
              ) : filteredConcerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    No concerts found.
                  </td>
                </tr>
              ) : (
                filteredConcerts.map((concert) => (
                  <tr
                    key={concert.id}
                    className="transition hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-4">
                      <div className="flex min-w-[190px] items-center gap-3">
                        {concert.poster_url ? (
                          <img
                            src={imageUrl(concert.poster_url)}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#27234A] text-lg">
                            🎵
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-bold text-white">
                            {concert.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {concert.category_name || "-"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {concert.organizer_name || "-"}
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm text-white">
                        {formatDate(concert.start_date)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {concert.venue_name || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {formatNumber(concert.sold)} /{" "}
                      {formatNumber(concert.quota)}
                    </td>

                    <td className="px-4 py-4 text-sm font-semibold text-white">
                      {formatRupiah(concert.revenue)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${statusStyle(
                          concert.display_status,
                        )}`}
                      >
                        {concert.display_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
