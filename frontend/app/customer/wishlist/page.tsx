"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import CustomerShell from "@/components/layout/CustomerShell";
import {
  formatCurrency,
  formatDateRange,
  imageUrl,
  type Concert,
} from "@/lib/customer";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "lynora_wishlist";
const FALLBACK_POSTER = "/images/hero/home.jpg";

type WishlistTab = "all" | "upcoming" | "past";

const TABS: { value: WishlistTab; label: string }[] = [
  { value: "all", label: "All Saved" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past Sale" },
];

const CATEGORIES = [
  { label: "All Category", value: "all", icon: "category (1).png" },
  { label: "Pop", value: "Pop", icon: "guitar.png" },
  { label: "Rock", value: "Rock", icon: "hand.png" },
  { label: "Hip-Hop", value: "Hip-Hop", icon: "boombox.png" },
  { label: "EDM", value: "EDM", icon: "technology.png" },
  { label: "Indie", value: "Indie", icon: "wave-sound.png" },
  { label: "K-Pop", value: "K-Pop", icon: "disco-ball.png" },
];

const GRID_CLASS =
  "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 min-[1500px]:grid-cols-4";

const PRIMARY_GRADIENT = "bg-gradient-to-r from-[#8065E9] to-[#A65BE8]";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const startOfToday = () => new Date().setHours(0, 0, 0, 0);

function isUpcoming(concert: Concert) {
  const start = new Date(concert.start_date).getTime();
  return !Number.isNaN(start) && start >= startOfToday();
}

function isPast(concert: Concert) {
  const end = new Date(concert.end_date || concert.start_date).getTime();
  return !Number.isNaN(end) && end < startOfToday();
}

function normalizeCategory(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function getPoster(path?: string | null) {
  return path ? imageUrl(path) : FALLBACK_POSTER;
}

function getEventStatus(concert: Concert) {
  return isPast(concert)
    ? { label: "PAST SALE", className: "bg-[#42202F] text-[#FF879D]" }
    : { label: "ON SALE", className: "bg-[#153B3B] text-[#48D6BB]" };
}

function formatPrice(price?: number) {
  if (typeof price !== "number") return "Price unavailable";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(date?: string) {
  if (!date) return "Date unavailable";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(parsed).replace(",", " ·");
}

function getDescription(concert: Concert) {
  return concert.venue_name
    ? `Enjoy an unforgettable live concert experience at ${concert.venue_name}.`
    : "Enjoy an unforgettable live concert experience.";
}

type WishlistStatus = "comingSoon" | "onSale" | "new";
const STATUS_STYLES: Record<WishlistStatus, { label: string; className: string }> = {
  comingSoon: { label: "Coming Soon", className: "bg-[#2E2723] text-[#F5B84E]" },
  onSale: { label: "On Sale", className: "bg-[#152B32] text-[#26ADA0]" },
  new: { label: "New", className: "bg-[#2F1E2A] text-[#FF6B81]" },
};

function getCardStatus(concert: Concert): WishlistStatus {
  const meta = concert as Concert & { status?: string | null; created_at?: string | null };
  const raw = (meta.status || "").toLowerCase();
  if (raw.includes("sale")) return "onSale";
  if (raw.includes("soon") || raw.includes("coming")) return "comingSoon";
  if (raw === "new") return "new";
  const created = meta.created_at ? new Date(meta.created_at).getTime() : NaN;
  if (!Number.isNaN(created) && Date.now() - created < 14 * 24 * 60 * 60 * 1000) return "new";
  const start = new Date(concert.start_date).getTime();
  if (!Number.isNaN(start) && start - Date.now() > 45 * 24 * 60 * 60 * 1000) return "comingSoon";
  return "onSale";
}

function matchesSearch(concert: Concert, keyword: string) {
  if (!keyword) return true;
  return [concert.name, concert.category_name, concert.venue_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(keyword);
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function Svg({
  children,
  className = "h-4 w-4",
  strokeWidth = 2,
}: {
  children: ReactNode;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const SearchIcon = () => (
  <Svg className="h-5 w-5">
    <circle cx="11" cy="11" r="7" />
    <path d="m16 16 4 4" />
  </Svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <Svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

const CheckIcon = () => (
  <Svg className="h-4 w-4 text-[#A78BFA]" strokeWidth={2.5}>
    <path d="m5 12 4 4L19 6" />
  </Svg>
);

const TrashIcon = () => (
  <Svg strokeWidth={1.8}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5m4-5v5" />
  </Svg>
);

function CategoryIcon({
  icon,
  className = "h-5 w-5",
}: {
  icon: string;
  className?: string;
}) {
  return (
    <img
      src={`/icons/${encodeURIComponent(icon)}`}
      alt=""
      className={`${className} shrink-0 object-contain`}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function WishlistHero({
  tab,
  setTab,
  search,
  setSearch,
}: {
  tab: WishlistTab;
  setTab: (value: WishlistTab) => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-xl border border-white/10">
      <img
        src={FALLBACK_POSTER}
        alt=""
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#15132F]/90 via-[#17143B]/65 to-[#101426]/45" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0B1020]/80 to-transparent" />

      <div className="flex min-h-[270px] flex-col justify-between p-5 sm:min-h-[290px] sm:p-7 lg:p-8">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                tab === item.value
                  ? `${PRIMARY_GRADIENT} text-white shadow-lg shadow-purple-500/20`
                  : "border border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <h1 className="bg-gradient-to-r from-[#A78BFA] via-[#9C8AF5] to-[#45D5E9] bg-clip-text text-4xl font-black leading-tight text-transparent sm:text-5xl">
            MY WISHLIST
          </h1>
          <p className="mt-1 text-sm font-semibold text-white">
            Your saved concerts and events, all in one spot.
          </p>
        </div>

        <div className="relative mt-5 w-full sm:max-w-[600px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/80">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search concerts, artists, or venues..."
            className="h-11 w-full rounded-lg border border-white/20 bg-gradient-to-r from-[#6756D8]/90 to-[#8875E8]/85 pl-11 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-white/70 focus:border-[#B9A6FF] focus:ring-2 focus:ring-purple-400/30"
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Category dropdown                                                   */
/* ------------------------------------------------------------------ */

function CategoryDropdown({
  category,
  setCategory,
}: {
  category: string;
  setCategory: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold text-white transition ${
          open
            ? "border-[#8875E8] bg-[#202A4F]"
            : "border-white/10 bg-[#151B30] hover:border-[#8875E8]"
        }`}
      >
        <CategoryIcon icon={selected.icon} className="h-4 w-4" />
        <span>{selected.label}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close category dropdown"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#151B30] p-1.5 shadow-2xl shadow-black/50">
            {CATEGORIES.map((item) => {
              const active = category === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setCategory(item.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                    active
                      ? "bg-[#6756D8]/30 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <CategoryIcon icon={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {active && <CheckIcon />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Event card                                                          */
/* ------------------------------------------------------------------ */

function InfoRow({ icon, children, top = false }: { icon: string; children: ReactNode; top?: boolean }) {
  return (
    <div className={`flex gap-2 text-xs text-[#D1D5E0] ${top ? "items-start leading-relaxed" : "items-center"}`}>
      <img src={icon} alt="" className={`h-4 w-4 object-contain ${top ? "mt-0.5 shrink-0" : ""}`} />
      {children}
    </div>
  );
}

function EventCard({
  concert,
  index,
  onRemove,
}: {
  concert: Concert;
  index: number;
  onRemove: (id: number) => void;
}) {
  const status = STATUS_STYLES[getCardStatus(concert)];
  const detailHref = `/events/${concert.id}`;
  const meta = concert as Concert & {
    organizer_name?: string | null;
    venue_address?: string | null;
    artists?: { name?: string | null; country?: string | null }[];
  };
  const artistCountry = Array.from(
    new Set(meta.artists?.map((artist) => artist.country).filter(Boolean)),
  ).join(", ");

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#8B5CF6]/30 bg-[#202A4F] transition duration-300 hover:-translate-y-1 hover:border-[#22D3EE]">
      <div className="relative h-[125px] overflow-hidden sm:h-[140px]">
        <Link href={detailHref} className="block h-full w-full">
          <img
            src={getPoster(concert.poster_url)}
            alt={concert.name}
            loading={index > 2 ? "lazy" : "eager"}
            onError={(event) => { event.currentTarget.src = FALLBACK_POSTER; }}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>
        <span className={`absolute left-3 top-3 rounded-md px-3 py-1.5 text-xs font-extrabold ${status.className}`}>
          {status.label}
        </span>
        <button
          type="button"
          onClick={() => onRemove(concert.id)}
          title="Remove from wishlist"
          aria-label={`Remove ${concert.name} from wishlist`}
          aria-pressed="true"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-[#0B1020]/85 transition hover:scale-105 hover:border-[#8B5CF6]"
        >
          <img src="/icons/wishlist (1).png" alt="" className="h-5 w-5 object-contain" />
        </button>
        <span className="absolute bottom-2 right-3 rounded-lg border border-[#8B5CF6] bg-[#0B1020]/95 px-2.5 py-1.5 text-xs font-extrabold text-white">
          {formatPrice(concert.price)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <span className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#22D3EE]">
          Saved #{index + 1}
        </span>
        <Link href={detailHref}>
          <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-white transition group-hover:text-cyan-300 sm:text-[17px]">
            {concert.name}
          </h3>
        </Link>
        <p className="mt-1 text-[13px] font-bold text-[#A78BFA]">
          {concert.category_name || "Live Concert"}
        </p>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[#A9AAB4]">
          {getDescription(concert)}
        </p>
        <div className="my-2.5 border-t border-white/20" />
        <div className="flex flex-col gap-2">
          <InfoRow icon="/icons/calendar (1).png">
            <strong>{formatDate(concert.start_date)}</strong>
          </InfoRow>
          <InfoRow icon="/icons/flag.png">
            <span>From: <strong>{artistCountry || "To be announced"}</strong></span>
          </InfoRow>
          <InfoRow icon="/icons/pin.png" top>
            <strong>
              {concert.venue_name || "Venue to be announced"}
              {meta.venue_address ? `, ${meta.venue_address}` : ""}
            </strong>
          </InfoRow>
          {meta.organizer_name && (
            <InfoRow icon="/icons/circus.png">
              <span>Organized by: <strong>{meta.organizer_name}</strong></span>
            </InfoRow>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyWishlist({ hasItems }: { hasItems: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#151B30] px-5 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6756D8]/20">
        <img
          src="/icons/wishlist.png"
          alt=""
          className="h-9 w-9 object-contain"
        />
      </div>

      <h3 className="mt-5 text-lg font-extrabold text-white">
        {hasItems ? "No concerts found" : "Your wishlist is still empty"}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
        {hasItems
          ? "Try another keyword, category, or filter to find your saved concerts."
          : "Save your favorite concerts by clicking the bookmark icon on the concert card, then find them here."}
      </p>

      <Link
        href="/customer/explore"
        className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg ${PRIMARY_GRADIENT} px-6 text-xs font-extrabold text-white transition hover:brightness-110`}
      >
        EXPLORE CONCERTS
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function WishlistPage() {
  const [items, setItems] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<WishlistTab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // Load wishlist from the same localStorage key used by the homepage.
  useEffect(() => {
    const loadWishlist = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        setItems(Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object" && "id" in item) : []);
      } catch (error) {
        console.error("Failed to load wishlist:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    loadWishlist();
    window.addEventListener("lynora:wishlist-updated", loadWishlist);
    window.addEventListener("storage", loadWishlist);
    return () => {
      window.removeEventListener("lynora:wishlist-updated", loadWishlist);
      window.removeEventListener("storage", loadWishlist);
    };
  }, []);

  function persist(next: Concert[]) {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("lynora:wishlist-updated"));
    } catch (error) {
      console.error("Failed to save wishlist:", error);
    }
  }

  const removeItem = (id: number) => {
    const removedConcert = items.find(
      (item) => String(item.id) === String(id),
    );

    const nextItems = items.filter(
      (item) => String(item.id) !== String(id),
    );

    persist(nextItems);

    if (removedConcert) {
      window.alert("Concert has been removed from your wishlist.");
    }
  };

  const removeAll = () => {
    if (items.length === 0) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove all concerts from your wishlist?",
    );

    if (!confirmed) return;

    persist([]);
    window.alert("All concerts have been removed from your wishlist.");
  };

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const selectedCategory = normalizeCategory(category);

    return items.filter((concert) => {
      if (!matchesSearch(concert, keyword)) return false;
      if (tab === "upcoming" && !isUpcoming(concert)) return false;
      if (tab === "past" && !isPast(concert)) return false;
      if (
        category !== "all" &&
        normalizeCategory(concert.category_name) !== selectedCategory
      ) {
        return false;
      }
      return true;
    });
  }, [items, search, tab, category]);

  return (
    <CustomerShell title="Wishlist" subtitle="Your saved concerts for later">
      <main className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-3 sm:px-6 lg:px-8">
        <WishlistHero
          tab={tab}
          setTab={setTab}
          search={search}
          setSearch={setSearch}
        />

        {/* Section header */}
        <section className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-9 w-[5px] rounded-full bg-gradient-to-b from-[#22D3EE] to-[#8B5CF6]" />
            <div>
              <h2 className="text-sm font-extrabold text-white">
                {filteredItems.length} Saved Concerts
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Your favorite events in one place
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CategoryDropdown category={category} setCategory={setCategory} />

            {items.length > 0 && (
              <button
                type="button"
                onClick={removeAll}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E96B82]/30 bg-[#E96B82]/10 px-3 text-[10px] font-bold text-[#FF8A9D] transition hover:bg-[#E96B82] hover:text-white"
              >
                <TrashIcon />
                Remove All
              </button>
            )}
          </div>
        </section>

        {/* Grid */}
        <section className="mt-5">
          {loading ? (
            <div className={GRID_CLASS}>
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="h-[350px] animate-pulse rounded-xl bg-[#202A4F]"
                />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className={GRID_CLASS}>
              {filteredItems.map((concert) => (
                <EventCard
                  key={concert.id}
                  concert={concert}
                  index={filteredItems.indexOf(concert)}
                  onRemove={removeItem}
                />
              ))}
            </div>
          ) : (
            <EmptyWishlist hasItems={items.length > 0} />
          )}
        </section>

        {/* Bottom banner */}
        {!loading && items.length > 0 && (
          <section className="mt-10 flex flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#151B30] p-5 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5B84E]/10">
                <span className="text-xl" aria-hidden="true">
                  ✨
                </span>
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">
                  Discover more concerts based on artists you follow
                </h3>
                <p className="mt-1 text-[10px] text-slate-400">
                  Find your next unforgettable live music experience.
                </p>
              </div>
            </div>

            <Link
              href="/customer/explore"
              className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#8065E9] to-[#22D3E9] px-5 text-[10px] font-extrabold text-white transition hover:brightness-110"
            >
              EXPLORE CONCERTS
            </Link>
          </section>
        )}
      </main>
    </CustomerShell>
  );
}