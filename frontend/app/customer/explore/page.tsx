"use client";



import { useEffect, useMemo, useState, type ReactNode } from "react";

import Link from "next/link";



import CustomerShell from "@/components/layout/CustomerShell";

import { fetchCustomerHomeConcerts, matchesCustomerHomeQuery } from "@/lib/customer-home-api";

import { API_URL, imageUrl, type Concert } from "@/lib/customer";



/* ==========================================================================

   1. TYPES

   ========================================================================== */



type ConcertMeta = Concert & {

  organizer_name?: string | null;

  event_type?: string | null;

  status?: string | null;

  created_at?: string | null;

  artists?: { name?: string | null; country?: string | null }[];

};



type StatusKey = "comingSoon" | "onSale" | "soldOut" | "ended" | "salesClosed" | "new";

type Option = { value: string; label: string };



/* ==========================================================================

   2. CONSTANTS

   ========================================================================== */



const PAGE_SIZE = 16;

const TOAST_DURATION_MS = 2500;



const WISHLIST_KEY = "lynora_wishlist";

const WISHLIST_EVENT = "lynora:wishlist-updated";

const WISHLIST_ICONS = {

  idle: "/icons/wishlist.png",

  active: "/icons/wishlist(1).png",

};



const ALL_CITIES = "All Indonesia";

const CITIES = [

  { name: "Jakarta", keywords: ["jakarta"] },

  { name: "Bandung", keywords: ["bandung"] },

  { name: "Surabaya", keywords: ["surabaya"] },

  { name: "Bali", keywords: ["bali", "denpasar", "badung"] },

  { name: "Yogyakarta", keywords: ["yogyakarta", "jogja"] },

  { name: "Medan", keywords: ["medan"] },

  { name: "Semarang", keywords: ["semarang"] },

  { name: "Makassar", keywords: ["makassar"] },

];



const GENRES = ["Pop", "Rock", "Hip-Hop", "EDM", "Indie", "K-Pop"];



// --- Select options ---------------------------------------------------------



const CITY_OPTIONS: Option[] = [ALL_CITIES, ...CITIES.map((c) => c.name)].map((name) => ({

  value: name,

  label: name,

}));



const CATEGORY_OPTIONS: Option[] = [

  { value: "all", label: "All" },

  ...GENRES.map((name) => ({ value: name, label: name })),

];



const DATE_OPTIONS: Option[] = [

  { value: "all", label: "Any date" },

  { value: "this-month", label: "This month" },

  { value: "next-month", label: "Next month" },

  { value: "3-months", label: "Next 3 months" },

];



const PRICE_OPTIONS: Option[] = [

  { value: "all", label: "Any price" },

  { value: "lt-500", label: "Under Rp 500.000" },

  { value: "500-1000", label: "Rp 500.000 - 1.000.000" },

  { value: "1000-2000", label: "Rp 1.000.000 - 2.000.000" },

  { value: "gt-2000", label: "Above Rp 2.000.000" },

];



const SORT_OPTIONS: Option[] = [

  { value: "relevant", label: "Most Relevant" },

  { value: "date", label: "Soonest Date" },

  { value: "price-low", label: "Price: Low to High" },

  { value: "price-high", label: "Price: High to Low" },

];



// Status badge colors (same as Home)

const STATUS: Record<StatusKey, { text: string; style: string }> = {
  comingSoon: { text: "Coming Soon", style: "bg-[#2E2723] text-[#F5B84E]" },
  onSale: { text: "On Sale", style: "bg-[#152B32] text-[#26ADA0]" },
  soldOut: { text: "Sold Out", style: "bg-[#3A202B] text-[#FF8298]" },
  ended: { text: "Ended", style: "bg-[#252A3A] text-[#AAB2C5]" },
  salesClosed: { text: "Sales Closed", style: "bg-[#252A3A] text-[#AAB2C5]" },
  new: { text: "New", style: "bg-[#2F1E2A] text-[#FF6B81]" },
};



/* ==========================================================================

   3. TAILWIND STYLE TOKENS (dikelompokkan per komponen)

   ========================================================================== */



const cx = (...classes: Array<string | false | null | undefined>) =>

  classes.filter(Boolean).join(" ");



const styles = {

  // Grid follows the Customer Home card layout: 1 mobile, 2 tablet, 3 desktop

  grid: "grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",



  chevron: "pointer-events-none h-4 w-4",



  infoRow: {

    base: "flex gap-2 text-xs text-[#D1D5E0]",

    top: "items-start leading-relaxed",

    center: "items-center",

    icon: "h-4 w-4 object-contain",

    iconTop: "mt-0.5 shrink-0",

  },



  statusBadge: "absolute left-3 top-3 rounded-md px-3 py-1.5 text-xs font-extrabold",



  filterSelect: {

    label:

      "relative flex min-w-0 items-center gap-3 px-4 text-white transition focus-within:ring-2 focus-within:ring-[#22D3EE] hover:border-[#8B5CF6]",

    text: "min-w-0 flex-1 truncate text-sm font-bold",

    chevron: "shrink-0 text-white/80",

    select: "absolute inset-0 h-full w-full cursor-pointer opacity-0",

    option: "bg-[#161624] text-white",

  },



  icons: {

    category: "h-5 w-5 shrink-0 text-white",

    price: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5B84E] text-xs font-black text-[#0B1020]",

    image: "h-5 w-5 shrink-0 object-contain",

  },



  hero: {

    root: "relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#0B1020]",

    image: "absolute inset-0 -z-20 h-full w-full object-cover object-center",

    overlay: "absolute inset-0 -z-10 bg-gradient-to-b from-[#080D20]/30 via-[#080D20]/40 to-[#080D20]/85",

    content: "flex min-h-[230px] flex-col px-4 py-5 sm:min-h-[245px] lg:min-h-[285px] sm:px-7 sm:py-7 lg:px-9",

    titleWrap: "mt-5 sm:mt-6",

    title:

      "bg-gradient-to-r from-[#8B7CF6] via-[#7C9CF0] to-[#22D3EE] bg-clip-text text-3xl font-black leading-tight text-transparent sm:text-4xl lg:text-5xl",

    subtitle: "mt-1 max-w-[560px] text-sm font-bold text-white sm:text-base",

    controls: "mt-6 flex flex-col gap-2.5 pt-2 sm:mt-auto sm:flex-row sm:items-center sm:gap-3 sm:pt-7",

    searchLabel: "relative flex min-w-0 flex-1 items-center sm:max-w-[600px]",

    searchIcon: "pointer-events-none absolute left-4 h-5 w-5 text-white",

    searchInput:

      "h-12 w-full rounded-xl border border-white/25 bg-gradient-to-r from-[#5648D6]/90 to-[#8E80F3]/80 pl-12 pr-4 text-sm font-semibold text-white outline-none placeholder:text-white/70 focus-visible:ring-2 focus-visible:ring-[#22D3EE] sm:h-14",

    cityField:

      "h-12 w-full shrink-0 gap-2 rounded-xl border border-white/10 bg-[#0B1020]/85 px-3 sm:h-14 sm:w-[220px] sm:gap-3 sm:px-4",

    cityIcon: "h-5 w-5 shrink-0 object-contain",

  },



  filters: {

    section: "mt-5 grid w-full max-w-[1040px] grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4",

    group: "min-w-0 space-y-1.5",

    label: "pl-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#929BB5]",

    field: "h-11 rounded-lg border border-[#303A5B] bg-[#151D38] px-3.5 hover:border-[#8B5CF6] sm:h-12",

    dateIcon: "h-5 w-5 shrink-0 object-contain",

  },



  toolbar: {

    wrapper: "mt-6 flex flex-wrap items-center justify-between gap-3",

    left: "flex items-center gap-3",

    bar: "h-9 w-[6px] rounded-full bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6]",

    count: "text-xl font-black text-white",

    right: "flex w-full items-center justify-end gap-3 sm:w-auto",

    sort: "h-12 w-[170px] rounded-xl border border-white/10 bg-[#2A3150] sm:w-[180px]",

  },



  card: {

    link: "group block min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]",

    root: "flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#8B5CF6]/30 bg-[#202A4F] transition-[border-color,box-shadow,transform] duration-300 group-hover:-translate-y-1 group-hover:border-[#8B5CF6]/70 group-hover:shadow-[0_12px_28px_rgba(91,52,170,0.28)]",

    media: "relative aspect-[2/1] w-full overflow-hidden",

    poster: "h-full w-full object-cover transition duration-500 group-hover:scale-105",

    fallback:

      "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#31245D] via-[#202A4F] to-[#0B1122] px-4 text-center",

    fallbackBrand: "text-3xl font-black text-[#A78BFA]",

    fallbackName: "mt-1 line-clamp-2 text-xs font-semibold text-white/75",

    fallbackTag: "mt-1 text-[9px] font-bold tracking-[0.25em] text-[#22D3EE]",

    wishlistBtn:

      "absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-[#0B1020]/85 transition hover:scale-105 hover:border-[#8B5CF6]",

    wishlistIcon: "h-5 w-5 object-contain",

    price:

      "absolute bottom-2 right-3 rounded-lg border border-[#8B5CF6] bg-[#0B1020]/95 px-2.5 py-1.5 text-xs font-extrabold text-white",

    body: "flex flex-1 flex-col px-3 py-2.5",

    title: "line-clamp-2 text-[15px] font-extrabold leading-snug text-white group-hover:text-white sm:text-base",

    category: "mt-1 text-[13px] font-bold text-[#A78BFA]",

    description: "mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[#A9AAB4]",

    divider: "my-2.5 border-t border-white/20",

    info: "flex flex-col gap-2",

  },



  pagination: {

    wrapper:

      "mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#151E36] px-4 py-4 sm:flex-row",

    summary: "text-center text-sm font-semibold text-slate-300 sm:text-left",

    nav: "flex flex-wrap items-center justify-center gap-2",

    base: "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-extrabold transition",

    idle: "bg-[#2A3150] text-slate-200 hover:bg-[#6255DF]/70 hover:text-white",

    arrowExtra: "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#2A3150]",

    active: "bg-[#6255DF] text-white",

    dots: "px-1 text-slate-400",

  },



  page: {

    main: "mx-auto w-full min-w-0 max-w-none px-3 pb-10 pt-4 sm:px-5 sm:pt-5 xl:px-7 2xl:px-8",

    results: "mt-5",

    skeleton: "h-[350px] animate-pulse rounded-xl bg-[#202A4F]",

    emptyBox: "rounded-xl border border-white/10 bg-[#151E36] px-4 py-14 text-center",

    emptyTitle: "text-lg font-extrabold text-white",

    emptyText: "mx-auto mt-1 max-w-md text-sm text-slate-400",

    toast:

      "pointer-events-none fixed bottom-5 left-1/2 z-[100] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-white/10 bg-[#080D1B]/95 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-xl backdrop-blur-md sm:px-5 sm:py-3 sm:text-sm animate-[toast-in_180ms_ease-out]",

  },

} as const;



/* ==========================================================================

   4. HELPERS

   ========================================================================== */



// --- Formatting ------------------------------------------------------------



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

  })

    .format(parsed)

    .replace(",", " ·");

}



function normalize(text?: string | null) {

  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");

}



// --- Concert data ----------------------------------------------------------



function getPoster(path?: string | null) {

  if (!path || !path.trim()) return null;



  const isLocalOrRemote =

    path.startsWith("/images/") ||

    path.startsWith("/icons/") ||

    /^https?:\/\//i.test(path);



  return isLocalOrRemote ? path : imageUrl(path);

}



function getDescription(concert: Concert) {

  return (

    concert.description?.trim() ||

    (concert.venue_name

      ? `Enjoy an unforgettable live concert experience at ${concert.venue_name}.`

      : "Enjoy an unforgettable live concert experience.")

  );

}



// Badge per concert: backend sales_status is authoritative; never infer that a future event is on sale.

function getStatus(concert: Concert): StatusKey {

  const salesStatus = String(

    (concert as ConcertMeta & { sales_status?: string }).sales_status || ""

  ).toLowerCase();



  if (salesStatus === "ended") return "ended";
  if (salesStatus === "sold_out") return "soldOut";
  if (salesStatus === "on_sale") return "onSale";
  if (salesStatus === "coming_soon") return "comingSoon";
  if (salesStatus === "not_available" || salesStatus === "sales_closed") return "salesClosed";

  const raw = String(concert.status || "").toLowerCase();
  if (raw === "new") return "new";
  return "salesClosed";

}



// --- Filters ---------------------------------------------------------------



function matchesGenre(concert: Concert, genre: string) {

  return genre === "all" || normalize(concert.category_name) === normalize(genre);

}



function isInCity(concert: Concert, cityName: string) {

  if (cityName === ALL_CITIES) return true;



  const place = `${concert.venue_name || ""} ${concert.venue_address || ""}`.toLowerCase();

  const city = CITIES.find((item) => item.name === cityName);

  return !!city && city.keywords.some((keyword) => place.includes(keyword));

}



function matchesDate(concert: Concert, filter: string) {

  if (filter === "all") return true;



  const date = new Date(concert.start_date);

  if (Number.isNaN(date.getTime())) return false;



  const now = new Date();



  if (filter === "this-month") {

    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();

  }



  if (filter === "next-month") {

    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return date.getFullYear() === next.getFullYear() && date.getMonth() === next.getMonth();

  }



  if (filter === "3-months") {

    const limit = new Date(now);

    limit.setMonth(limit.getMonth() + 3);

    return date >= now && date <= limit;

  }



  return true;

}



function matchesPrice(concert: Concert, filter: string) {

  if (filter === "all") return true;

  if (typeof concert.price !== "number") return false;



  const price = concert.price;

  if (filter === "lt-500") return price < 500_000;

  if (filter === "500-1000") return price >= 500_000 && price <= 1_000_000;

  if (filter === "1000-2000") return price > 1_000_000 && price <= 2_000_000;

  if (filter === "gt-2000") return price > 2_000_000;

  return true;

}



// --- Sorting ---------------------------------------------------------------



function startTime(concert: Concert) {

  const time = new Date(concert.start_date).getTime();

  return Number.isNaN(time) ? Infinity : time;

}



function priceOf(concert: Concert, fallback: number) {

  return typeof concert.price === "number" ? concert.price : fallback;

}



// --- Pagination ------------------------------------------------------------



// Page numbers with ellipsis: 1 2 3 4 … 8

function getPageList(current: number, total: number): (number | "...")[] {

  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);



  const pages = new Set([1, total, current - 1, current, current + 1]);

  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));

  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));



  const sorted = Array.from(pages)

    .filter((p) => p >= 1 && p <= total)

    .sort((a, b) => a - b);



  const result: (number | "...")[] = [];

  sorted.forEach((page, i) => {

    if (i > 0 && page - sorted[i - 1] > 1) result.push("...");

    result.push(page);

  });

  return result;

}



// --- Wishlist storage (localStorage only) ------------------------------------



function itemId(item: unknown): string {

  return String(

    typeof item === "object" && item !== null && "id" in item

      ? (item as { id: string | number }).id

      : item

  );

}



// Boleh melempar error (JSON.parse); pemanggil yang menangani.

function readWishlist(): unknown[] {

  const saved = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");

  return Array.isArray(saved) ? saved : [];

}



/* ==========================================================================

   5. SHARED UI

   ========================================================================== */



function Chevron({ className = "" }: { className?: string }) {

  return (

    <svg

      viewBox="0 0 20 20"

      fill="none"

      stroke="currentColor"

      strokeWidth="2"

      className={cx(styles.chevron, className)}

    >

      <path d="M5 7l5 5 5-5" />

    </svg>

  );

}



function InfoRow({

  icon,

  children,

  top = false,

}: {

  icon: string;

  children: ReactNode;

  top?: boolean;

}) {

  const s = styles.infoRow;



  return (

    <div className={cx(s.base, top ? s.top : s.center)}>

      <img src={icon} alt="" className={cx(s.icon, top && s.iconTop)} />

      {children}

    </div>

  );

}



function StatusBadge({ status }: { status: StatusKey }) {

  const { text, style } = STATUS[status];



  return <span className={cx(styles.statusBadge, style)}>{text}</span>;

}



// Dropdown: shows a label (or the chosen value) with a hidden native <select> on top,

// so it looks the same everywhere and still uses the native picker on mobile.

function FilterSelect({

  value,

  onChange,

  options,

  label,

  placeholder,

  icon,

  className = "",

}: {

  value: string;

  onChange: (value: string) => void;

  options: Option[];

  label: string;

  placeholder?: string;

  icon?: ReactNode;

  className?: string;

}) {

  const s = styles.filterSelect;

  const selected = options.find((option) => option.value === value);

  const text =

    value === "all" && placeholder ? placeholder : (selected?.label ?? placeholder ?? "");



  return (

    <label className={cx(s.label, className)}>

      {icon}

      <span className={s.text}>{text}</span>

      <Chevron className={s.chevron} />



      <select

        value={value}

        onChange={(event) => onChange(event.target.value)}

        aria-label={label}

        className={s.select}

      >

        {options.map((option) => (

          <option key={option.value} value={option.value} className={s.option}>

            {option.label}

          </option>

        ))}

      </select>

    </label>

  );

}



function CategoryIcon() {

  return (

    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.icons.category}>

      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />

      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />

      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />

      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />

    </svg>

  );

}



function PriceIcon() {

  return <span className={styles.icons.price}>$</span>;

}



function FilterField({ title, children }: { title: string; children: ReactNode }) {

  return (

    <div className={styles.filters.group}>

      <p className={styles.filters.label}>{title}</p>

      {children}

    </div>

  );

}



/* ==========================================================================

   6. HERO

   ========================================================================== */



function ExploreHero({

  search,

  onSearch,

  city,

  onCity,

}: {

  search: string;

  onSearch: (value: string) => void;

  city: string;

  onCity: (city: string) => void;

}) {

  const s = styles.hero;



  return (

    <section className={s.root}>

      <img src="/images/hero/home.jpg" alt="" className={s.image} />

      <div className={s.overlay} />



      <div className={s.content}>

        {/* Title */}

        <div className={s.titleWrap}>

          <h1 className={s.title}>EXPLORE CONCERTS</h1>

          <p className={s.subtitle}>Discover amazing concerts and live events around you</p>

        </div>



        {/* Search + city */}

        <div className={s.controls}>

          <label className={s.searchLabel}>

            <svg

              viewBox="0 0 24 24"

              fill="none"

              stroke="currentColor"

              strokeWidth="2"

              strokeLinecap="round"

              className={s.searchIcon}

            >

              <circle cx="11" cy="11" r="7" />

              <path d="M20 20l-3.5-3.5" />

            </svg>

            <input

              type="search"

              value={search}

              onChange={(event) => onSearch(event.target.value)}

              placeholder="Search concerts, artists, or venues..."

              aria-label="Search concerts"

              className={s.searchInput}

            />

          </label>



          <FilterSelect

            value={city}

            onChange={onCity}

            options={CITY_OPTIONS}

            label="Choose city"

            className={s.cityField}

            icon={<img src="/icons/flag.png" alt="" className={s.cityIcon} />}

          />

        </div>

      </div>

    </section>

  );

}



/* ==========================================================================

   7. CONCERT CARD (visual style and wishlist controls match Customer Home)

   ========================================================================== */



function ConcertCard({

  concert,

  index,

  wishlisted,

  onWishlist,

}: {

  concert: Concert;

  index: number;

  wishlisted: boolean;

  onWishlist: (concert: Concert) => void;

}) {

  const s = styles.card;

  const meta = concert as ConcertMeta;

  const poster = getPoster(concert.poster_url);

  const artistCountry = Array.from(

    new Set(meta.artists?.map((artist) => artist.country).filter(Boolean))

  ).join(", ");



  return (

    <Link href={`/events/${concert.id}?from=explore`} className={s.link}>

      <article className={s.root}>

        {/* Media */}

        <div className={s.media}>

          {poster ? (

            <img

              src={poster}

              alt={concert.name}

              className={s.poster}

              loading={index > 2 ? "lazy" : "eager"}

              onError={(event) => {

                event.currentTarget.style.display = "none";

              }}

            />

          ) : (

            <div className={s.fallback}>

              <span className={s.fallbackBrand}>LYNORA</span>

              <span className={s.fallbackName}>{concert.name}</span>

              <span className={s.fallbackTag}>LIVE EXPERIENCE</span>

            </div>

          )}



          <StatusBadge status={getStatus(concert)} />



          <button

            type="button"

            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}

            aria-pressed={wishlisted}

            onClick={(event) => {

              event.preventDefault();

              event.stopPropagation();

              onWishlist(concert);

            }}

            className={s.wishlistBtn}

          >

            <img

              src={wishlisted ? WISHLIST_ICONS.active : WISHLIST_ICONS.idle}

              alt=""

              className={s.wishlistIcon}

            />

          </button>



          <span className={s.price}>{formatPrice(concert.price)}</span>

        </div>



        {/* Body */}

        <div className={s.body}>

          <h3 className={s.title}>{concert.name}</h3>

          <p className={s.category}>{concert.category_name || "Live Concert"}</p>

          <p className={s.description}>{getDescription(concert)}</p>



          <div className={s.divider} />



          <div className={s.info}>

            <InfoRow icon="/icons/calendar (1).png">

              <strong>{formatDate(concert.start_date)}</strong>

            </InfoRow>



            <InfoRow icon="/icons/flag.png">

              <span>

                From: <strong>{artistCountry || "To be announced"}</strong>

              </span>

            </InfoRow>



            <InfoRow icon="/icons/pin.png" top>

              <strong className="line-clamp-2 break-words">

                {concert.venue_name || "Venue to be announced"}

                {concert.venue_address ? `, ${concert.venue_address}` : ""}

              </strong>

            </InfoRow>



            {meta.organizer_name && (

              <InfoRow icon="/icons/circus.png">

                <span>

                  Organized by: <strong>{meta.organizer_name}</strong>

                </span>

              </InfoRow>

            )}

          </div>

        </div>

      </article>

    </Link>

  );

}



/* ==========================================================================

   8. PAGINATION

   ========================================================================== */



function Pagination({

  page,

  totalPages,

  from,

  to,

  total,

  onPage,

}: {

  page: number;

  totalPages: number;

  from: number;

  to: number;

  total: number;

  onPage: (page: number) => void;

}) {

  const s = styles.pagination;

  const arrow = cx(s.base, s.idle, s.arrowExtra);



  return (

    <div className={s.wrapper}>

      <p className={s.summary}>

        Showing {from}-{to} of {total} concert events

      </p>



      {totalPages > 1 && (

        <nav className={s.nav} aria-label="Pagination">

          <button

            type="button"

            aria-label="Previous page"

            disabled={page === 1}

            onClick={() => onPage(page - 1)}

            className={arrow}

          >

            ‹

          </button>



          {getPageList(page, totalPages).map((item, i) =>

            item === "..." ? (

              <span key={`dots-${i}`} className={s.dots}>

                …

              </span>

            ) : (

              <button

                key={item}

                type="button"

                aria-label={`Page ${item}`}

                aria-current={item === page ? "page" : undefined}

                onClick={() => onPage(item)}

                className={cx(s.base, item === page ? s.active : s.idle)}

              >

                {item}

              </button>

            )

          )}



          <button

            type="button"

            aria-label="Next page"

            disabled={page === totalPages}

            onClick={() => onPage(page + 1)}

            className={arrow}

          >

            ›

          </button>

        </nav>

      )}

    </div>

  );

}



/* ==========================================================================

   9. PAGE

   ========================================================================== */



export default function ExplorePage() {

  const s = styles.page;



  // --- State ---------------------------------------------------------------

  const [concerts, setConcerts] = useState<Concert[]>([]);

  const [loading, setLoading] = useState(true);

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const [wishlistToast, setWishlistToast] = useState("");



  const [search, setSearch] = useState("");

  const [city, setCity] = useState(ALL_CITIES);

  const [category, setCategory] = useState("all");

  const [dateFilter, setDateFilter] = useState("all");

  const [priceFilter, setPriceFilter] = useState("all");

  const [sort, setSort] = useState("relevant");

  const [page, setPage] = useState(1);



  // Any filter change sends the user back to page 1

  const withReset =

    <T,>(setter: (value: T) => void) =>

    (value: T) => {

      setter(value);

      setPage(1);

    };



  // --- Toast: match the non-blocking wishlist toast used on Customer Home ----

  useEffect(() => {

    if (!wishlistToast) return;



    const timeout = window.setTimeout(() => setWishlistToast(""), TOAST_DURATION_MS);

    return () => window.clearTimeout(timeout);

  }, [wishlistToast]);



  // --- Wishlist: load the authenticated user's wishlist from the backend
  useEffect(() => {
    let active = true;
    async function syncWishlist() {
      const token = localStorage.getItem("token");
      if (!token) { if (active) setWishlistIds([]); return; }
      try {
        const response = await fetch(`${API_URL}/wishlist`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Gagal mengambil Wishlist.");
        const payload = await response.json();
        const rows = Array.isArray(payload?.wishlists) ? payload.wishlists : [];
        if (active) setWishlistIds(rows.map((item: any) => String(item.event_id ?? item.id ?? "")).filter(Boolean));
      } catch (error) {
        console.error("Failed to load wishlist:", error);
        if (active) setWishlistIds([]);
      }
    }
    syncWishlist();
    window.addEventListener(WISHLIST_EVENT, syncWishlist);
    return () => { active = false; window.removeEventListener(WISHLIST_EVENT, syncWishlist); };
  }, []);

  // --- Load concerts once (supports /customer/explore?category=Pop) ----------

  useEffect(() => {

    let active = true;



    const initial = new URLSearchParams(window.location.search).get("category");

    const genre = GENRES.find((name) => normalize(name) === normalize(initial));

    // eslint-disable-next-line react-hooks/set-state-in-effect

    if (genre) setCategory(genre);



    async function loadConcerts() {

      try {

        const data = await fetchCustomerHomeConcerts();

        if (active) setConcerts(data);

      } catch (error) {

        console.error("Failed to load concerts:", error);

      } finally {

        if (active) setLoading(false);

      }

    }



    loadConcerts();



    return () => {

      active = false;

    };

  }, []);



  // --- Apply every filter, then sort -----------------------------------------

  const results = useMemo(() => {

    const filtered = concerts.filter(

      (concert) =>

        matchesCustomerHomeQuery(concert, search) &&

        isInCity(concert, city) &&

        matchesGenre(concert, category) &&

        matchesDate(concert, dateFilter) &&

        matchesPrice(concert, priceFilter)

    );



    const sorted = [...filtered];



    if (sort === "date") sorted.sort((a, b) => startTime(a) - startTime(b));

    if (sort === "price-low") sorted.sort((a, b) => priceOf(a, Infinity) - priceOf(b, Infinity));

    if (sort === "price-high") sorted.sort((a, b) => priceOf(b, -1) - priceOf(a, -1));



    return sorted;

  }, [concerts, search, city, category, dateFilter, priceFilter, sort]);



  // --- Pagination ------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;

  const visible = results.slice(start, start + PAGE_SIZE);



  function changePage(next: number) {

    setPage(next);

    window.scrollTo({ top: 0, behavior: "smooth" });

  }



  // --- Wishlist toggle: persist changes through the backend ------------------
  async function toggleWishlist(concert: Concert) {
    const concertId = String(concert.id);
    const exists = wishlistIds.includes(concertId);
    const token = localStorage.getItem("token");
    if (!token) { setWishlistToast("Please log in to use your wishlist."); return; }
    try {
      const response = await fetch(`${API_URL}/wishlist/${concertId}`, {
        method: exists ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }
      if (!response.ok) throw new Error(payload?.message || "Gagal memperbarui Wishlist.");
      setWishlistIds((current) => exists
        ? current.filter((id) => id !== concertId)
        : [...new Set([...current, concertId])]);
      window.dispatchEvent(new CustomEvent(WISHLIST_EVENT));
      setWishlistToast(exists
        ? "Concert has been removed from your wishlist."
        : "Concert has been added to your wishlist.");
    } catch (error) {
      console.error("Failed to update wishlist:", error);
      setWishlistToast(error instanceof Error ? error.message : "Unable to update wishlist. Please try again.");
    }
  }

  // --- Render ----------------------------------------------------------------

  return (

    <CustomerShell

      title="Explore Concerts"

      subtitle="Find your next unforgettable experience"


    >

      <main className={s.main}>

        <ExploreHero

          search={search}

          onSearch={withReset(setSearch)}

          city={city}

          onCity={withReset(setCity)}

        />



        {/* Filters */}

        <section aria-label="Concert filters" className={styles.filters.section}>

          <FilterField title="Category">

            <FilterSelect

              value={category}

              onChange={withReset(setCategory)}

              options={CATEGORY_OPTIONS}

              label="Filter by category"

              placeholder="All categories"

              className={styles.filters.field}

              icon={<CategoryIcon />}

            />

          </FilterField>



          <FilterField title="Date">

            <FilterSelect

              value={dateFilter}

              onChange={withReset(setDateFilter)}

              options={DATE_OPTIONS}

              label="Filter by date"

              placeholder="Any date"

              className={styles.filters.field}

              icon={<img src="/icons/calendar (1).png" alt="" className={styles.filters.dateIcon} />}

            />

          </FilterField>



          <FilterField title="Price">

            <FilterSelect

              value={priceFilter}

              onChange={withReset(setPriceFilter)}

              options={PRICE_OPTIONS}

              label="Filter by price"

              placeholder="Any price"

              className={styles.filters.field}

              icon={<PriceIcon />}

            />

          </FilterField>

        </section>



        {/* Count + sort */}

        <div className={styles.toolbar.wrapper}>

          <div className={styles.toolbar.left}>

            <span className={styles.toolbar.bar} />

            <h2 className={styles.toolbar.count}>{results.length} concerts</h2>

          </div>



          <div className={styles.toolbar.right}>

            <FilterSelect

              value={sort}

              onChange={withReset(setSort)}

              options={SORT_OPTIONS}

              label="Sort concerts"

              className={styles.toolbar.sort}

            />

          </div>

        </div>



        {/* Results */}

        <section className={s.results}>

          {loading ? (

            <div className={styles.grid}>

              {Array.from({ length: 8 }, (_, i) => (

                <div key={i} className={s.skeleton} />

              ))}

            </div>

          ) : visible.length > 0 ? (

            <>

              <div className={styles.grid}>

                {visible.map((concert, index) => (

                  <ConcertCard

                    key={concert.id}

                    concert={concert}

                    index={index}

                    wishlisted={wishlistIds.includes(String(concert.id))}

                    onWishlist={toggleWishlist}

                  />

                ))}

              </div>



              <Pagination

                page={currentPage}

                totalPages={totalPages}

                from={start + 1}

                to={start + visible.length}

                total={results.length}

                onPage={changePage}

              />

            </>

          ) : (

            <div className={s.emptyBox}>

              <h3 className={s.emptyTitle}>No concerts found</h3>

              <p className={s.emptyText}>

                Try a different keyword or loosen your filters to find more concerts.

              </p>

            </div>

          )}

        </section>

      </main>



      {wishlistToast && (

        <div role="status" aria-live="polite" className={s.toast}>

          {wishlistToast}

        </div>

      )}

    </CustomerShell>

  );

}