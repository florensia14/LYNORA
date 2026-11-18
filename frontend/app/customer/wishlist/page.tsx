"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import CustomerShell from "@/components/layout/CustomerShell";
import { imageUrl, type Concert } from "@/lib/customer";
import { fetchConcerts } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Types & constants                                                          */
/* -------------------------------------------------------------------------- */

type WishlistTab = "all" | "upcoming" | "past";
type StatusKey = "comingSoon" | "onSale" | "new";

type WishlistEvent = Omit<
  Concert,
  "artist" | "artist_country" | "artists" | "price"
> & {
  wishlist_id?: number;
  wishlisted_at?: string;
  starting_price?: number | string | null;
  price?: number | string | null;
  sales_status?: string | null;
  artists?: { id?: number; name?: string | null; country?: string | null }[];
  artist?: string | null;
  artist_country?: string | null;
  organizer_name?: string | null;
};

type WishlistResponse = {
  message?: string;
  total?: number;
  items?: WishlistEvent[];
  wishlists?: WishlistEvent[];
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const FALLBACK_POSTER = "/images/hero/home.jpg";
const TOAST_DURATION_MS = 2500;

const TABS: { value: WishlistTab; label: string }[] = [
  { value: "all", label: "All Saved" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past Events" },
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

const GRID =
  "grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

const STATUS: Record<StatusKey, { text: string; style: string }> = {
  comingSoon: { text: "Coming Soon", style: "bg-[#2E2723] text-[#F5B84E]" },
  onSale: { text: "On Sale", style: "bg-[#152B32] text-[#26ADA0]" },
  new: { text: "New", style: "bg-[#2F1E2A] text-[#FF6B81]" },
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeWishlistEvent(event: WishlistEvent): WishlistEvent {
  const artists = Array.isArray(event.artists) ? event.artists : [];
  const firstArtist = artists.find((artist) => artist?.name);

  return {
    ...event,
    id: Number(event.id),
    description: event.description ?? null,
    poster_url: event.poster_url ?? null,
    end_date: event.end_date || event.start_date,
    price: toNumber(event.starting_price ?? event.price),
    artist: event.artist ?? firstArtist?.name ?? null,
    artist_country: event.artist_country ?? firstArtist?.country ?? null,
    artists,
  };
}

function getPoster(path?: string | null) {
  if (!path?.trim()) return null;

  const isLocalOrRemote =
    path.startsWith("/images/") ||
    path.startsWith("/icons/") ||
    /^https?:\/\//i.test(path);

  return isLocalOrRemote ? path : imageUrl(path);
}

function formatPrice(price?: number | string | null) {
  const amount = toNumber(price);
  if (amount === undefined) return "Price unavailable";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date?: string | null) {
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

function getDescription(concert: WishlistEvent) {
  return concert.description?.trim() || "Description not available.";
}

function getStatus(concert: WishlistEvent): StatusKey {
  const salesStatus = String(concert.sales_status || "").toLowerCase();

  if (salesStatus === "on_sale") return "onSale";
  if (salesStatus === "coming_soon" || salesStatus === "not_available") {
    return "comingSoon";
  }

  const rawStatus = String(concert.status || "").toLowerCase();
  if (rawStatus === "new") return "new";

  // Match Explore's safe default: do not infer "On Sale" from event date.
  return "comingSoon";
}

function normalizeCategory(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function isUpcoming(concert: WishlistEvent) {
  const start = new Date(concert.start_date).getTime();
  return !Number.isNaN(start) && start >= new Date().setHours(0, 0, 0, 0);
}

function isPast(concert: WishlistEvent) {
  const end = new Date(concert.end_date || concert.start_date).getTime();
  return !Number.isNaN(end) && end < new Date().setHours(0, 0, 0, 0);
}

function getApiMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
  ) {
    return (payload as { message: string }).message;
  }
  return fallback;
}

/* -------------------------------------------------------------------------- */
/* Small UI elements                                                          */
/* -------------------------------------------------------------------------- */

function Svg({
  children,
  className = "h-4 w-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <Svg className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Svg>
  );
}

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <Svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg className="h-4 w-4">
      <path d="M3 6h18M8 6V4h8v2m2 0-1 14H7L6 6m4 4v6m4-6v6" />
    </Svg>
  );
}

function CategoryIcon({ icon }: { icon: string }) {
  return (
    <img
      src={`/icons/${encodeURIComponent(icon)}`}
      alt=""
      className="h-4 w-4 shrink-0 object-contain"
      onError={(event) => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Hero — same image, height, overlay, title typography and search treatment  */
/* as ExploreHero                                                             */
/* -------------------------------------------------------------------------- */

function WishlistHero({
  tab,
  onTabChange,
  search,
  onSearch,
}: {
  tab: WishlistTab;
  onTabChange: (tab: WishlistTab) => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <section className="relative isolate min-h-[300px] overflow-hidden rounded-xl border border-white/10 bg-[#0B1020] sm:min-h-[312px]">
      <img
        src={FALLBACK_POSTER}
        alt=""
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#080D20]/35 via-[#080D20]/45 to-[#080D20]/80" />

      <div className="relative flex min-h-[300px] flex-col px-5 py-5 sm:min-h-[312px] sm:px-6 sm:py-6 lg:px-7">
        <div className="flex w-fit max-w-full flex-wrap items-center gap-2">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onTabChange(item.value)}
              aria-pressed={tab === item.value}
              className={`flex h-9 min-w-[112px] items-center justify-center rounded-full border px-5 text-sm font-bold transition sm:min-w-[145px] sm:text-base ${
                tab === item.value
                  ? "border-[#7950D5] bg-[#7950D5] text-white shadow-[0_4px_16px_rgba(121,80,213,0.28)]"
                  : "border-white/25 bg-white/[0.06] text-white hover:border-[#8B5CF6] hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5 sm:mt-6">
          <h1 className="w-fit bg-gradient-to-r from-[#8B7CF6] via-[#7C9CF0] to-[#22D3EE] bg-clip-text text-4xl font-black leading-[1.05] text-transparent sm:text-5xl lg:text-[52px]">
            MY WISHLIST
          </h1>
          <p className="mt-1 max-w-[560px] text-base font-bold leading-snug text-white sm:text-lg">
            Your saved concerts and events, all in one spot.
          </p>
        </div>

        <div className="mt-5 sm:mt-5">
          <label className="relative flex w-full min-w-0 sm:max-w-[490px]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search concerts, artists, or venues..."
              aria-label="Search wishlist"
              className="h-12 w-full rounded-xl border border-white/25 bg-gradient-to-r from-[#5648D6]/90 to-[#8E80F3]/80 pl-12 pr-4 text-sm font-semibold text-white outline-none placeholder:text-white/70 focus-visible:ring-2 focus-visible:ring-[#22D3EE] sm:h-14"
            />
          </label>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Category dropdown                                                          */
/* -------------------------------------------------------------------------- */

function CategoryDropdown({
  category,
  onChange,
}: {
  category: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = CATEGORIES.find((item) => item.value === category) ?? CATEGORIES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex h-12 min-w-[150px] items-center gap-2 rounded-xl border px-3 text-sm font-bold text-white transition sm:h-14 ${
          open
            ? "border-[#8B5CF6] bg-[#202A4F]"
            : "border-white/10 bg-[#10162E] hover:border-[#8B5CF6]"
        }`}
      >
        <CategoryIcon icon={selected.icon} />
        <span className="flex-1 text-left">{selected.label}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close category menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#151B30] p-1.5 shadow-2xl shadow-black/50">
            {CATEGORIES.map((item) => {
              const active = item.value === category;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold transition ${
                    active
                      ? "bg-[#6756D8]/30 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <CategoryIcon icon={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {active && <span className="text-[#22D3EE]">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Concert card — follows Explore card proportions and Home typography       */
/* -------------------------------------------------------------------------- */

function InfoRow({
  icon,
  children,
  top = false,
}: {
  icon: string;
  children: ReactNode;
  top?: boolean;
}) {
  return (
    <div
      className={`flex gap-2 text-xs text-[#D1D5E0] ${
        top ? "items-start leading-relaxed" : "items-center"
      }`}
    >
      <img
        src={icon}
        alt=""
        className={`h-4 w-4 shrink-0 object-contain ${top ? "mt-0.5" : ""}`}
      />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function EventCard({
  concert,
  index,
  onRemove,
  removing,
}: {
  concert: WishlistEvent;
  index: number;
  onRemove: (id: number) => void;
  removing: boolean;
}) {
  const status = STATUS[getStatus(concert)];
  const poster = getPoster(concert.poster_url);
  const artists = Array.isArray(concert.artists) ? concert.artists : [];
  const artistLabel =
    concert.artist ||
    artists.map((artist) => artist.name).filter(Boolean).join(", ") ||
    "To be announced";
  const countryLabel =
    concert.artist_country ||
    artists.map((artist) => artist.country).filter(Boolean).join(", ") ||
    "To be announced";

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#8B5CF6]/30 bg-[#202A4F] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#8B5CF6]/70 hover:shadow-[0_12px_28px_rgba(91,52,170,0.28)]">
      <div className="relative aspect-[2/1] w-full overflow-hidden bg-[#171D37]">
        <Link href={`/customer/explore/${concert.id}`} className="relative block h-full w-full">
          {poster ? (
            <>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#31245D] via-[#202A4F] to-[#0B1122] px-4 text-center">
                <span className="text-3xl font-black text-[#A78BFA]">LYNORA</span>
                <span className="mt-1 line-clamp-2 text-xs font-semibold text-white/75">{concert.name}</span>
                <span className="mt-1 text-[9px] font-bold tracking-[0.25em] text-[#22D3EE]">LIVE EXPERIENCE</span>
              </div>
              <img
                src={poster}
                alt={concert.name}
                loading={index > 2 ? "lazy" : "eager"}
                onError={(event) => { event.currentTarget.style.display = "none"; }}
                className="relative h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#31245D] via-[#202A4F] to-[#0B1122] px-4 text-center">
              <span className="text-3xl font-black text-[#A78BFA]">LYNORA</span>
              <span className="mt-1 line-clamp-2 text-xs font-semibold text-white/75">{concert.name}</span>
              <span className="mt-1 text-[9px] font-bold tracking-[0.25em] text-[#22D3EE]">LIVE EXPERIENCE</span>
            </div>
          )}
        </Link>

        <span className={`absolute left-3 top-3 rounded-md px-3 py-1.5 text-xs font-extrabold ${status.style}`}>
          {status.text}
        </span>

        <button
          type="button"
          onClick={() => onRemove(Number(concert.id))}
          disabled={removing}
          title="Remove from wishlist"
          aria-label={`Remove ${concert.name} from wishlist`}
          aria-pressed="true"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-[#0B1020]/85 transition hover:scale-105 hover:border-[#8B5CF6] disabled:cursor-wait disabled:opacity-60"
        >
          <img src="/icons/wishlist (1).png" alt="" className="h-5 w-5 object-contain" />
        </button>

        <span className="absolute bottom-3 right-3 rounded-lg border border-[#8B5CF6] bg-[#0B1020]/95 px-3 py-1.5 text-xs font-extrabold text-white">
          {formatPrice(concert.price)}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-3 py-2.5">
        <Link href={`/customer/explore/${concert.id}`}>
          <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug text-white transition group-hover:text-white sm:text-base">
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
            <span>From: <strong>{countryLabel}</strong></span>
          </InfoRow>
          <InfoRow icon="/icons/pin.png" top>
            <strong>
              {concert.venue_name || "Venue to be announced"}
              {concert.venue_address ? `, ${concert.venue_address}` : ""}
            </strong>
          </InfoRow>
          {concert.organizer_name && (
            <InfoRow icon="/icons/circus.png">
              <span>Organized by: <strong>{concert.organizer_name}</strong></span>
            </InfoRow>
          )}
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty / error / toast states                                               */
/* -------------------------------------------------------------------------- */

function EmptyWishlist({ hasSavedItems }: { hasSavedItems: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#151B30] px-5 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6756D8]/20">
        <img src="/icons/wishlist.png" alt="" className="h-9 w-9 object-contain" />
      </div>
      <h3 className="mt-5 text-lg font-extrabold text-white">
        {hasSavedItems ? "No concerts found" : "Your wishlist is still empty"}
      </h3>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
        {hasSavedItems
          ? "Try another keyword, category, or tab to find your saved concerts."
          : "Save your favorite concerts by clicking the bookmark icon on a concert card, then find them here."}
      </p>
      <Link
        href="/customer/explore"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#8065E9] to-[#22D3E9] px-6 text-xs font-extrabold text-white transition hover:brightness-110"
      >
        EXPLORE CONCERTS
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<WishlistTab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removingAll, setRemovingAll] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadWishlist = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/wishlist`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const payload: unknown = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(getApiMessage(payload, "Gagal mengambil Wishlist."));
      }

      const result = payload as WishlistResponse & { items?: WishlistEvent[] };
      const wishlistRows = Array.isArray(result?.items)
        ? result.items
        : Array.isArray(result?.wishlists)
          ? result.wishlists
          : [];

      // Use the same event records as Explore for poster, price, artist,
      // venue, organizer, and category consistency. Keep the wishlist order.
      let exploreEvents: Concert[] = [];
      try {
        exploreEvents = await fetchConcerts();
      } catch (catalogError) {
        console.warn("Explore catalog unavailable; using wishlist event data:", catalogError);
      }

      const normalizeName = (value?: string | null) =>
        (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      const exploreById = new Map(
        exploreEvents.map((event) => [Number(event.id), event]),
      );
      const exploreByName = new Map(
        exploreEvents.map((event) => [normalizeName(event.name), event]),
      );

      const mergedRows = wishlistRows.map((savedEvent) => {
        // API wishlist returns the event ID as `id`; tolerate `event_id`
        // too so catalog matching remains stable if the response shape changes.
        const savedEventId = Number(
          (savedEvent as WishlistEvent & { event_id?: number | string }).event_id ??
          savedEvent.id,
        );
        const canonicalEvent =
          exploreById.get(savedEventId) ||
          exploreByName.get(normalizeName(savedEvent.name));

        // Prefer the exact catalog record used by Explore for visual data,
        // especially poster_url. Fall back to the saved row only when needed.
        return normalizeWishlistEvent({
          ...(savedEvent as WishlistEvent),
          ...(canonicalEvent || {}),
          id: savedEventId || Number(savedEvent.id),
          wishlist_id: savedEvent.wishlist_id,
          wishlisted_at: savedEvent.wishlisted_at,
          poster_url:
            (canonicalEvent?.poster_url || savedEvent.poster_url || null) as string | null,
          price:
            canonicalEvent?.price ?? savedEvent.starting_price ?? savedEvent.price,
          starting_price:
            (canonicalEvent as WishlistEvent | undefined)?.starting_price ??
            savedEvent.starting_price,
          category_name: canonicalEvent?.category_name || savedEvent.category_name,
          venue_name: canonicalEvent?.venue_name || savedEvent.venue_name,
          venue_address: canonicalEvent?.venue_address || savedEvent.venue_address,
          organizer_name:
            canonicalEvent?.organizer_name || savedEvent.organizer_name,
          artists:
            (canonicalEvent as WishlistEvent | undefined)?.artists?.length
              ? (canonicalEvent as WishlistEvent).artists
              : savedEvent.artists,
          artist:
            (canonicalEvent as WishlistEvent | undefined)?.artist || savedEvent.artist,
          artist_country:
            (canonicalEvent as WishlistEvent | undefined)?.artist_country ||
            savedEvent.artist_country,
        } as WishlistEvent);
      });

      setItems(mergedRows);
    } catch (err) {
      console.error("Load wishlist error:", err);
      setError(err instanceof Error ? err.message : "Gagal mengambil Wishlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWishlist();
  }, [loadWishlist]);

  const removeItem = async (eventId: number) => {
    const token = localStorage.getItem("token");
    if (!token || removingId !== null) return;

    setRemovingId(eventId);
    try {
      const response = await fetch(`${API_BASE_URL}/wishlist/${eventId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiMessage(payload, "Gagal menghapus event dari Wishlist."));
      }

      setItems((current) => current.filter((item) => Number(item.id) !== eventId));
      showToast("Concert removed from your Wishlist.");
      window.dispatchEvent(new CustomEvent("lynora:wishlist-updated"));
    } catch (err) {
      console.error("Remove wishlist error:", err);
      showToast(err instanceof Error ? err.message : "Gagal menghapus event.");
    } finally {
      setRemovingId(null);
    }
  };

  const removeAll = async () => {
    if (items.length === 0 || removingAll) return;
    const confirmed = window.confirm(
      "Are you sure you want to remove all concerts from your Wishlist?",
    );
    if (!confirmed) return;

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setRemovingAll(true);
    try {
      const response = await fetch(`${API_BASE_URL}/wishlist`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiMessage(payload, "Gagal mengosongkan Wishlist."));
      }

      setItems([]);
      showToast("Your Wishlist is now empty.");
      window.dispatchEvent(new CustomEvent("lynora:wishlist-updated"));
    } catch (err) {
      console.error("Clear wishlist error:", err);
      showToast(err instanceof Error ? err.message : "Gagal mengosongkan Wishlist.");
    } finally {
      setRemovingAll(false);
    }
  };

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const selectedCategory = normalizeCategory(category);

    return items.filter((concert) => {
      const searchable = [
        concert.name,
        concert.description,
        concert.artist,
        concert.category_name,
        concert.venue_name,
        concert.venue_address,
        concert.organizer_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (keyword && !searchable.includes(keyword)) return false;
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
      <main className="mx-auto w-full max-w-[1600px] min-w-0 px-4 pb-12 pt-3 sm:px-6 lg:px-8">
        <WishlistHero
          tab={tab}
          onTabChange={setTab}
          search={search}
          onSearch={setSearch}
        />

        <section className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="h-8 w-[5px] shrink-0 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#22D3EE] sm:h-11 sm:w-[6px]" />
            <div className="min-w-0">
              <h2 className="max-w-full break-words text-xl font-black leading-tight text-white sm:text-2xl lg:text-3xl">
                {filteredItems.length} Saved Concerts
              </h2>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Your favorite events in one place
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <CategoryDropdown category={category} onChange={setCategory} />
            {items.length > 0 && (
              <button
                type="button"
                onClick={removeAll}
                disabled={removingAll}
                className="flex h-12 items-center gap-2 rounded-xl border border-[#E96B82]/30 bg-[#E96B82]/10 px-4 text-xs font-extrabold text-[#FF8A9D] transition hover:bg-[#E96B82] hover:text-white disabled:cursor-wait disabled:opacity-60 sm:h-14"
              >
                <TrashIcon />
                {removingAll ? "Removing..." : "Remove All"}
              </button>
            )}
          </div>
        </section>

        <section className="mt-5">
          {error ? (
            <div className="rounded-xl border border-[#F87171]/30 bg-[#7F1D1D]/15 p-5 text-sm text-[#FCA5A5]">
              <p className="font-bold">Wishlist could not be loaded</p>
              <p className="mt-1 text-xs">{error}</p>
              <button
                type="button"
                onClick={() => void loadWishlist()}
                className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className={GRID}>
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="aspect-[2/1] animate-pulse rounded-xl bg-[#202A4F]"
                />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className={GRID}>
              {filteredItems.map((concert, index) => (
                <EventCard
                  key={concert.id}
                  concert={concert}
                  index={index}
                  onRemove={removeItem}
                  removing={removingId === Number(concert.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyWishlist hasSavedItems={items.length > 0} />
          )}
        </section>

        {!loading && !error && items.length > 0 && (
          <section className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#151B30] p-5 sm:flex-row sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5B84E]/10">
                <span className="text-xl" aria-hidden="true">✨</span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Discover more concerts
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Find your next unforgettable live music experience.
                </p>
              </div>
            </div>
            <Link
              href="/customer/explore"
              className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#8065E9] to-[#22D3E9] px-5 text-xs font-extrabold text-white transition hover:brightness-110"
            >
              EXPLORE CONCERTS
            </Link>
          </section>
        )}
      </main>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-[#8B5CF6]/40 bg-[#151B30] px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-black/40"
        >
          {toast}
        </div>
      )}
    </CustomerShell>
  );
}
