"use client";



import { useEffect, useMemo, useState, type ReactNode } from "react";

import Link from "next/link";

import CustomerShell from "@/components/layout/CustomerShell";

import { fetchConcerts, matchesQuery } from "@/lib/api";

import { imageUrl, type Concert } from "@/lib/customer";



// Types

type ConcertMeta = Concert & {

  organizer_name?: string | null;

  event_type?: string | null;

  status?: string | null;

  created_at?: string | null;

  artists?: { name?: string | null; country?: string | null }[];

};



type StatusKey = "comingSoon" | "onSale" | "new";

type TabKey = "upcoming" | "onSale";

type Option = { value: string; label: string };



// Constants

const PAGE_SIZE = 16;

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

const CITY_OPTIONS: Option[] = [ALL_CITIES, ...CITIES.map((c) => c.name)].map((name) => ({

  value: name,

  label: name,

}));



const GENRES = ["Pop", "Rock", "Hip-Hop", "EDM", "Indie", "K-Pop"];

const CATEGORY_OPTIONS: Option[] = [

  { value: "all", label: "All" },

  ...GENRES.map((name) => ({ value: name, label: name })),

];



// Artist origin: international acts touring Indonesia + local Indonesian acts.

// `aliases` cover the different spellings the API might return.

const COUNTRIES = [

  { name: "Indonesia", aliases: ["indonesia", "id", "indo"] },

  { name: "South Korea", aliases: ["south korea", "korea", "korea selatan", "republic of korea", "korea s.", "kr"] },

  { name: "Japan", aliases: ["japan", "jepang", "jp"] },

  { name: "United States", aliases: ["united states", "united states of america", "usa", "us", "america", "amerika serikat"] },

  { name: "United Kingdom", aliases: ["united kingdom", "uk", "england", "britain", "great britain", "inggris"] },

  { name: "Australia", aliases: ["australia", "au"] },

  { name: "Canada", aliases: ["canada", "kanada"] },

  { name: "Singapore", aliases: ["singapore", "singapura"] },

  { name: "Malaysia", aliases: ["malaysia"] },

  { name: "Thailand", aliases: ["thailand", "thai"] },

  { name: "Philippines", aliases: ["philippines", "filipina"] },

  { name: "China", aliases: ["china", "tiongkok", "cn"] },

  { name: "Taiwan", aliases: ["taiwan"] },

  { name: "India", aliases: ["india"] },

  { name: "Germany", aliases: ["germany", "jerman"] },

  { name: "France", aliases: ["france", "prancis"] },

  { name: "Sweden", aliases: ["sweden", "swedia"] },

  { name: "Netherlands", aliases: ["netherlands", "belanda", "holland"] },

];

const COUNTRY_OPTIONS: Option[] = [

  { value: "all", label: "All countries" },

  ...COUNTRIES.map((c) => ({ value: c.name, label: c.name })),

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

  new: { text: "New", style: "bg-[#2F1E2A] text-[#FF6B81]" },

};



// Grid: 1 col on phones, 2 on tablets, 3 on laptops, 4 on wide screens

const GRID =

  "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 min-[1500px]:grid-cols-4";



const FIELD = "h-12 rounded-xl border border-white/10 bg-[#10162E]";



// Helpers

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



function getPoster(path?: string | null) {

  if (!path) return "/images/hero/blackpink.jpg";



  const isLocalOrRemote =

    path.startsWith("/images/") ||

    path.startsWith("/icons/") ||

    /^https?:\/\//i.test(path);



  return isLocalOrRemote ? path : imageUrl(path);

}



function getDescription(concert: Concert) {

  return concert.venue_name

    ? `Enjoy an unforgettable live concert experience at ${concert.venue_name}.`

    : "Enjoy an unforgettable live concert experience.";

}



function getCountries(concert: Concert) {

  const meta = concert as ConcertMeta;

  return Array.from(

    new Set(

      (meta.artists ?? [])

        .map((artist) => artist.country)

        .filter((country): country is string => Boolean(country))

    )

  );

}



function normalize(text?: string | null) {

  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");

}



function matchesGenre(concert: Concert, genre: string) {

  return genre === "all" || normalize(concert.category_name) === normalize(genre);

}



function matchesCountry(concert: Concert, countryName: string) {

  if (countryName === "all") return true;



  const country = COUNTRIES.find((item) => item.name === countryName);

  if (!country) return false;



  const aliases = country.aliases.map(normalize);

  return getCountries(concert).some((value) => aliases.includes(normalize(value)));

}



// Badge per concert: uses the API status if there is one, otherwise derives it

function getStatus(concert: Concert): StatusKey {

  const meta = concert as ConcertMeta;

  const raw = (meta.status || "").toLowerCase();



  if (raw.includes("sale")) return "onSale";

  if (raw.includes("soon") || raw.includes("coming")) return "comingSoon";

  if (raw === "new") return "new";



  const DAY = 24 * 60 * 60 * 1000;

  const now = Date.now();



  const created = meta.created_at ? new Date(meta.created_at).getTime() : NaN;

  if (!Number.isNaN(created) && now - created < 14 * DAY) return "new";



  const start = new Date(concert.start_date).getTime();

  if (!Number.isNaN(start) && start - now > 45 * DAY) return "comingSoon";



  return "onSale";

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



// Shared UI

function Chevron({ className = "" }: { className?: string }) {

  return (

    <svg

      viewBox="0 0 20 20"

      fill="none"

      stroke="currentColor"

      strokeWidth="2"

      className={`pointer-events-none h-4 w-4 ${className}`}

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

  return (

    <div

      className={`flex gap-2 text-xs text-[#D1D5E0] ${

        top ? "items-start leading-relaxed" : "items-center"

      }`}

    >

      <img

        src={icon}

        alt=""

        className={`h-4 w-4 object-contain ${top ? "mt-0.5 shrink-0" : ""}`}

      />

      {children}

    </div>

  );

}



function StatusBadge({ status }: { status: StatusKey }) {

  const { text, style } = STATUS[status];



  return (

    <span

      className={`absolute left-3 top-3 rounded-md px-3 py-1.5 text-xs font-extrabold ${style}`}

    >

      {text}

    </span>

  );

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

  const selected = options.find((option) => option.value === value);

  const text =

    value === "all" && placeholder ? placeholder : (selected?.label ?? placeholder ?? "");



  return (

    <label

      className={`relative flex min-w-0 items-center gap-3 px-4 text-white transition focus-within:ring-2 focus-within:ring-[#22D3EE] hover:border-[#8B5CF6] ${className}`}

    >

      {icon}

      <span className="min-w-0 flex-1 truncate text-sm font-bold">{text}</span>

      <Chevron className="shrink-0 text-white/80" />



      <select

        value={value}

        onChange={(event) => onChange(event.target.value)}

        aria-label={label}

        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"

      >

        {options.map((option) => (

          <option key={option.value} value={option.value} className="bg-[#161624] text-white">

            {option.label}

          </option>

        ))}

      </select>

    </label>

  );

}



function CategoryIcon() {

  return (

    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-white">

      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />

      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />

      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />

      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />

    </svg>

  );

}



function PriceIcon() {

  return (

    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5B84E] text-xs font-black text-[#0B1020]">

      $

    </span>

  );

}



// Hero

function ExploreHero({

  tab,

  onTab,

  search,

  onSearch,

  city,

  onCity,

}: {

  tab: TabKey;

  onTab: (tab: TabKey) => void;

  search: string;

  onSearch: (value: string) => void;

  city: string;

  onCity: (city: string) => void;

}) {

  const tabs: { key: TabKey; label: string }[] = [

    { key: "upcoming", label: "Upcoming" },

    { key: "onSale", label: "On Sale" },

  ];



  return (

    <section className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#0B1020]">

      <img

        src="/images/hero/home.jpg"

        alt=""

        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"

      />

      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#080D20]/30 via-[#080D20]/40 to-[#080D20]/85" />



      <div className="flex min-h-[240px] flex-col px-4 py-4 sm:min-h-[280px] sm:px-7 sm:py-6 lg:min-h-[320px] lg:px-10 lg:py-7">

        <div className="flex gap-3" role="tablist" aria-label="Concert status">

          {tabs.map(({ key, label }) => {

            const active = tab === key;

            return (

              <button

                key={key}

                type="button"

                role="tab"

                aria-selected={active}

                onClick={() => onTab(key)}

                className={`rounded-full border px-5 py-1.5 text-sm font-extrabold text-white transition sm:px-7 sm:py-2 ${

                  active

                    ? "border-[#A78BFA] bg-gradient-to-r from-[#6255DF] to-[#8B5CF6]"

                    : "border-[#E54869] bg-[#0B1020]/30 hover:bg-[#E54869]/20"

                }`}

              >

                {label}

              </button>

            );

          })}

        </div>



        <div className="mt-3 sm:mt-4">

          <h1 className="bg-gradient-to-r from-[#8B7CF6] via-[#7C9CF0] to-[#22D3EE] bg-clip-text text-2xl font-black leading-tight text-transparent sm:text-3xl lg:text-4xl">

            EXPLORE CONCERTS

          </h1>



          <p className="mt-1 max-w-[560px] text-xs font-bold text-white sm:text-sm">

            Discover amazing concerts and live events around you

          </p>

        </div>



        <div className="mt-auto flex items-center gap-2 pt-4 sm:gap-3 sm:pt-5">

          <label className="relative flex min-w-0 flex-1 items-center sm:max-w-[600px]">

            <svg

              viewBox="0 0 24 24"

              fill="none"

              stroke="currentColor"

              strokeWidth="2"

              strokeLinecap="round"

              className="pointer-events-none absolute left-4 h-5 w-5 text-white"

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

              className="h-10 w-full rounded-xl border border-white/25 bg-gradient-to-r from-[#5648D6]/90 to-[#8E80F3]/80 pl-11 pr-3 text-xs font-semibold text-white outline-none placeholder:text-white/70 focus-visible:ring-2 focus-visible:ring-[#22D3EE] sm:h-11 sm:text-sm"

            />

          </label>



          <FilterSelect

            value={city}

            onChange={onCity}

            options={CITY_OPTIONS}

            label="Choose city"

            className="h-10 w-[118px] shrink-0 gap-2 rounded-xl border border-white/10 bg-[#0B1020]/85 px-2.5 sm:h-11 sm:w-[150px] sm:gap-3 sm:px-3"

            icon={<img src="/icons/flag.png" alt="" className="h-5 w-5 shrink-0 object-contain" />}

          />

        </div>

      </div>

    </section>

  );

}



// Concert card: visual style and wishlist controls match Customer Home
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
  const meta = concert as ConcertMeta;
  const artistCountry = Array.from(
    new Set(meta.artists?.map((artist) => artist.country).filter(Boolean))
  ).join(", ");

  return (
    <Link href={`/events/${concert.id}`} className="group block min-w-0">
      <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#8B5CF6]/30 bg-[#202A4F] transition duration-300 hover:-translate-y-1 hover:border-[#22D3EE]">
        <div className="relative h-[125px] overflow-hidden sm:h-[140px]">
          <img src={getPoster(concert.poster_url)} alt={concert.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading={index > 2 ? "lazy" : "eager"} />
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
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-[#0B1020]/85 transition hover:scale-105 hover:border-[#8B5CF6]"
          >
            <img src={wishlisted ? WISHLIST_ICONS.active : WISHLIST_ICONS.idle} alt="" className="h-5 w-5 object-contain" />
          </button>
          <span className="absolute bottom-2 right-3 rounded-lg border border-[#8B5CF6] bg-[#0B1020]/95 px-2.5 py-1.5 text-xs font-extrabold text-white">{formatPrice(concert.price)}</span>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <span className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#22D3EE]">Explore #{index + 1}</span>
          <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-white group-hover:text-cyan-300 sm:text-[17px]">{concert.name}</h3>
          <p className="mt-1 text-[13px] font-bold text-[#A78BFA]">{concert.category_name || "Live Concert"}</p>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[#A9AAB4]">{getDescription(concert)}</p>
          <div className="my-2.5 border-t border-white/20" />
          <div className="flex flex-col gap-2">
            <InfoRow icon="/icons/calendar (1).png"><strong>{formatDate(concert.start_date)}</strong></InfoRow>
            <InfoRow icon="/icons/flag.png"><span>From: <strong>{artistCountry || "To be announced"}</strong></span></InfoRow>
            <InfoRow icon="/icons/pin.png" top><strong>{concert.venue_name || "Venue to be announced"}{concert.venue_address ? `, ${concert.venue_address}` : ""}</strong></InfoRow>
            {meta.organizer_name && <InfoRow icon="/icons/circus.png"><span>Organized by: <strong>{meta.organizer_name}</strong></span></InfoRow>}
          </div>
        </div>
      </article>
    </Link>
  );
}

// Pagination

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

  const base =

    "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-extrabold transition";

  const idle = "bg-[#2A3150] text-slate-200 hover:bg-[#6255DF]/70 hover:text-white";

  const arrow = `${base} ${idle} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#2A3150]`;



  return (

    <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#151E36] px-4 py-4 sm:flex-row">

      <p className="text-center text-sm font-semibold text-slate-300 sm:text-left">

        Showing {from}-{to} of {total} concert events

      </p>



      {totalPages > 1 && (

        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">

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

              <span key={`dots-${i}`} className="px-1 text-slate-400">

                …

              </span>

            ) : (

              <button

                key={item}

                type="button"

                aria-label={`Page ${item}`}

                aria-current={item === page ? "page" : undefined}

                onClick={() => onPage(item)}

                className={`${base} ${item === page ? "bg-[#6255DF] text-white" : idle}`}

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



// Page

export default function ExplorePage() {

  const [concerts, setConcerts] = useState<Concert[]>([]);

  const [loading, setLoading] = useState(true);

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);



  const [search, setSearch] = useState("");

  const [tab, setTab] = useState<TabKey>("upcoming");

  const [city, setCity] = useState(ALL_CITIES);

  const [category, setCategory] = useState("all");

  const [country, setCountry] = useState("all");

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



  // Restore and sync the same saved wishlist used by Customer Home.
  useEffect(() => {
    const syncWishlist = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("lynora_wishlist") || "[]");
        if (Array.isArray(saved)) {
          setWishlistIds(saved.map((item: unknown) =>
            String(typeof item === "object" && item !== null && "id" in item
              ? (item as { id: string | number }).id
              : item)
          ).filter(Boolean));
        } else {
          setWishlistIds([]);
        }
      } catch (error) {
        console.error("Failed to read wishlist:", error);
        setWishlistIds([]);
      }
    };

    syncWishlist();
    window.addEventListener("storage", syncWishlist);
    window.addEventListener("lynora:wishlist-updated", syncWishlist);
    return () => {
      window.removeEventListener("storage", syncWishlist);
      window.removeEventListener("lynora:wishlist-updated", syncWishlist);
    };
  }, []);

  // Load concerts once (supports /customer/explore?category=Pop)

  useEffect(() => {

    let active = true;



    const initial = new URLSearchParams(window.location.search).get("category");

    const genre = GENRES.find((name) => normalize(name) === normalize(initial));

    // eslint-disable-next-line react-hooks/set-state-in-effect

    if (genre) setCategory(genre);



    async function loadConcerts() {

      try {

        const data = await fetchConcerts();

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



  // Apply every filter, then sort

  const results = useMemo(() => {

    const now = Date.now();



    const filtered = concerts.filter((concert) => {

      if (!matchesQuery(concert, search)) return false;



      if (tab === "upcoming") {

        const start = new Date(concert.start_date).getTime();

        if (!Number.isNaN(start) && start < now) return false;

      } else if (getStatus(concert) !== "onSale") {

        return false;

      }



      return (

        isInCity(concert, city) &&

        matchesGenre(concert, category) &&

        matchesCountry(concert, country) &&

        matchesDate(concert, dateFilter) &&

        matchesPrice(concert, priceFilter)

      );

    });



    const sorted = [...filtered];

    const time = (c: Concert) => {

      const t = new Date(c.start_date).getTime();

      return Number.isNaN(t) ? Infinity : t;

    };

    const price = (c: Concert, fallback: number) =>

      typeof c.price === "number" ? c.price : fallback;



    if (sort === "date") sorted.sort((a, b) => time(a) - time(b));

    if (sort === "price-low") sorted.sort((a, b) => price(a, Infinity) - price(b, Infinity));

    if (sort === "price-high") sorted.sort((a, b) => price(b, -1) - price(a, -1));



    return sorted;

  }, [concerts, search, tab, city, category, country, dateFilter, priceFilter, sort]);



  // Pagination

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;

  const visible = results.slice(start, start + PAGE_SIZE);



  function toggleWishlist(concert: Concert) {
    try {
      const saved = JSON.parse(localStorage.getItem("lynora_wishlist") || "[]");
      const items: unknown[] = Array.isArray(saved) ? saved : [];
      const concertId = String(concert.id);
      const exists = items.some((item) =>
        String(typeof item === "object" && item !== null && "id" in item
          ? (item as { id: string | number }).id
          : item) === concertId
      );
      const updated = exists
        ? items.filter((item) =>
            String(typeof item === "object" && item !== null && "id" in item
              ? (item as { id: string | number }).id
              : item) !== concertId
          )
        : [...items.filter((item) => typeof item === "object" && item !== null), concert];

      localStorage.setItem("lynora_wishlist", JSON.stringify(updated));
      setWishlistIds(updated.map((item) =>
        String(typeof item === "object" && item !== null && "id" in item
          ? (item as { id: string | number }).id
          : item)
      ).filter(Boolean));
      window.dispatchEvent(new Event("lynora:wishlist-updated"));
      window.alert(exists
        ? "Concert has been removed from your wishlist."
        : "Concert has been added to your wishlist.");
    } catch (error) {
      console.error("Failed to update wishlist:", error);
      window.alert("Unable to update wishlist. Please try again.");
    }
  }

  function changePage(next: number) {

    setPage(next);

    window.scrollTo({ top: 0, behavior: "smooth" });

  }



  return (

    <CustomerShell

      title="Explore Concerts"

      subtitle="Find your next unforgettable experience"

      search={{

        value: search,

        onChange: withReset(setSearch),

        placeholder: "Search concerts, artists, or venues...",

      }}

    >

      <main className="mx-auto w-full max-w-[1320px] px-4 pb-12 pt-4 sm:px-6 sm:pt-5 lg:px-8">

        <ExploreHero

          tab={tab}

          onTab={withReset(setTab)}

          search={search}

          onSearch={withReset(setSearch)}

          city={city}

          onCity={withReset(setCity)}

        />



        {/* Filters: 2x2 on phones, one row on desktop */}

        <section className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 lg:grid-cols-4 lg:gap-4">

          <FilterSelect

            value={category}

            onChange={withReset(setCategory)}

            options={CATEGORY_OPTIONS}

            label="Filter by category"

            placeholder="Category"

            className={FIELD}

            icon={<CategoryIcon />}

          />

          <FilterSelect

            value={country}

            onChange={withReset(setCountry)}

            options={COUNTRY_OPTIONS}

            label="Filter by artist country"

            placeholder="Country"

            className={FIELD}

            icon={<img src="/icons/pin.png" alt="" className="h-5 w-5 shrink-0 object-contain" />}

          />

          <FilterSelect

            value={dateFilter}

            onChange={withReset(setDateFilter)}

            options={DATE_OPTIONS}

            label="Filter by date"

            placeholder="Date"

            className={FIELD}

            icon={

              <img

                src="/icons/calendar (1).png"

                alt=""

                className="h-5 w-5 shrink-0 object-contain"

              />

            }

          />

          <FilterSelect

            value={priceFilter}

            onChange={withReset(setPriceFilter)}

            options={PRICE_OPTIONS}

            label="Filter by price"

            placeholder="Price"

            className={FIELD}

            icon={<PriceIcon />}

          />

        </section>



        {/* Count + sort */}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center gap-3">

            <span className="h-9 w-[6px] rounded-full bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6]" />

            <h2 className="text-xl font-black text-white">{results.length} concerts</h2>

          </div>



          <div className="flex items-center gap-3">

            <FilterSelect

              value={sort}

              onChange={withReset(setSort)}

              options={SORT_OPTIONS}

              label="Sort concerts"

              className="h-12 w-[170px] rounded-xl border border-white/10 bg-[#2A3150] sm:w-[200px]"

            />

          </div>

        </div>



        {/* Results */}

        <section className="mt-5">

          {loading ? (

            <div className={GRID}>

              {Array.from({ length: 8 }, (_, i) => (

                <div key={i} className="h-[350px] animate-pulse rounded-xl bg-[#202A4F]" />

              ))}

            </div>

          ) : visible.length > 0 ? (

            <>

              <div className={GRID}>

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

            <div className="rounded-xl border border-white/10 bg-[#151E36] px-4 py-14 text-center">

              <h3 className="text-lg font-extrabold text-white">No concerts found</h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">

                Try a different keyword or loosen your filters to find more concerts.

              </p>

            </div>

          )}

        </section>

      </main>

    </CustomerShell>

  );

}
