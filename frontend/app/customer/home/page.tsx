"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import CustomerShell from "@/components/layout/CustomerShell";

import { fetchConcerts, matchesQuery } from "@/lib/api";

import { imageUrl, type Concert } from "@/lib/customer";

// Types

type ConcertMeta = Concert & {

  organizer_name?: string | null;

  artists?: { name?: string | null; country?: string | null }[];

};

type StatusKey = "comingSoon" | "onSale" | "new";

// Constants

const GENRES = [

  { name: "All", icon: "category (1).png" },

  { name: "Pop", icon: "microphone.png" },

  { name: "Rock", icon: "hand.png" },

  { name: "Hip-Hop", icon: "boombox.png" },

  { name: "EDM", icon: "technology.png" },

  { name: "Indie", icon: "wave-sound.png" },

  { name: "K-Pop", icon: "disco-ball.png" },

];

// Status badge colors

const STATUS: Record<StatusKey, { text: string; style: string }> = {

  comingSoon: { text: "Coming Soon", style: "bg-[#2E2723] text-[#F5B84E]" },

  onSale: { text: "On Sale", style: "bg-[#152B32] text-[#26ADA0]" },

  new: { text: "New", style: "bg-[#2F1E2A] text-[#FF6B81]" },

};

// Cities in Indonesia, matched against venue name/address

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

const LOCATIONS = [ALL_CITIES, ...CITIES.map((city) => city.name)];

const WISHLIST_ICONS = {

  idle: "/icons/wishlist.png",

  active: "/icons/wishlist(1).png",

  gray: "/icons/heart-gray.png",

};

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

const HERO_BTN =

  "flex h-12 w-12 items-center justify-center rounded-xl border border-white/30 bg-[#0B1020]/80";

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

// Always English, built from concert data

function getDescription(concert: Concert) {

  return concert.venue_name

    ? `Enjoy an unforgettable live concert experience at ${concert.venue_name}.`

    : "Enjoy an unforgettable live concert experience.";

}

function sameGenre(concert: Concert, genre: string) {

  return concert.category_name?.toLowerCase() === genre.toLowerCase();

}

// Check if a concert is held in the chosen city (or anywhere in Indonesia)

function isInCity(concert: Concert, cityName: string) {

  const place = `${concert.venue_name || ""} ${concert.venue_address || ""}`.toLowerCase();

  if (cityName === ALL_CITIES) {

    return (

      place.includes("indonesia") ||

      CITIES.some((city) => city.keywords.some((keyword) => place.includes(keyword)))

    );

  }

  const city = CITIES.find((item) => item.name === cityName);

  return !!city && city.keywords.some((keyword) => place.includes(keyword));

}

// Shared UI

function SectionTitle({ children }: { children: ReactNode }) {

  return (

    <div className="flex items-center gap-4">

      <span className="h-11 w-[6px] rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#22D3EE]" />

      <h2 className="text-2xl font-black text-white sm:text-3xl">{children}</h2>

    </div>

  );

}

function SectionHeading({

  title,

  extra,

  href = "/customer/explore",

}: {

  title: string;

  extra?: ReactNode;

  href?: string;

}) {

  return (

    <div className="mb-6 flex items-center justify-between gap-3">

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">

        <SectionTitle>{title}</SectionTitle>

        {extra}

      </div>

      <Link

        href={href}

        className="shrink-0 text-sm font-extrabold text-[#E54869] hover:text-cyan-300"

      >

        See All →

      </Link>

    </div>

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

      className={`flex gap-2 text-[11px] text-[#D1D5E0] sm:text-xs ${

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

// City picker for Near You

function CityPicker({

  value,

  onChange,

}: {

  value: string;

  onChange: (city: string) => void;

}) {

  return (

    <label className="relative inline-flex items-center">

      <img

        src="/icons/pin.png"

        alt=""

        className="pointer-events-none absolute left-3 h-4 w-4 object-contain"

      />

      <select

        value={value}

        onChange={(event) => onChange(event.target.value)}

        aria-label="Choose city"

        className="cursor-pointer appearance-none rounded-full bg-[#6B6F8F] py-2 pl-9 pr-10 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"

      >

        {LOCATIONS.map((location) => (

          <option key={location} value={location} className="bg-[#161624] text-white">

            {location}

          </option>

        ))}

      </select>

      <svg

        viewBox="0 0 20 20"

        fill="none"

        stroke="currentColor"

        strokeWidth="2"

        className="pointer-events-none absolute right-3 h-4 w-4 text-white/70"

      >

        <path d="M5 7l5 5 5-5" />

      </svg>

    </label>

  );

}

// Genre filter

function GenreSection({

  selectedGenre,

  onSelect,

  concerts,

}: {

  selectedGenre: string;

  onSelect: (genre: string) => void;

  concerts: Concert[];

}) {

  return (

    <section className="mt-8 sm:mt-10">

      <div className="mb-6">

        <SectionTitle>Browse by Genre</SectionTitle>

      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7 lg:gap-2.5">

        {GENRES.map(({ name, icon }) => {

          const active = selectedGenre === name;

          const count =

            name === "All"

              ? concerts.length

              : concerts.filter((c) => sameGenre(c, name)).length;

          return (

            <button

              key={name}

              type="button"

              onClick={() => onSelect(name)}

              aria-pressed={active}

              className={`flex min-h-[100px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 transition sm:min-h-[112px] ${

                active

                  ? "border-[#6255DF] bg-[#6255DF] text-white"

                  : "border-white/10 bg-[#161624] text-slate-300 hover:border-[#8B5CF6]"

              }`}

            >

              <img

                src={`/images/categories/${icon}`}

                alt=""

                className="h-6 w-6 object-contain sm:h-7 sm:w-7"

              />

              <span className="text-xs font-extrabold sm:text-sm">{name}</span>

              <span className={`text-[10px] ${active ? "text-white/80" : "text-slate-400"}`}>

                {count} Events

              </span>

            </button>

          );

        })}

      </div>

    </section>

  );

}

// Concert card

function ConcertCard({

  concert,

  index,

  label,

  status,

  isWishlisted,

  onWishlistClick,

}: {

  concert: Concert;

  index: number;

  label: string;

  status: StatusKey;

  isWishlisted: boolean;

  onWishlistClick: (concert: Concert) => void;

}) {

  const router = useRouter();

  const meta = concert as ConcertMeta;

  const artistCountry = Array.from(

    new Set(meta.artists?.map((artist) => artist.country).filter(Boolean))

  ).join(", ");

  return (

    <article

      role="link"

      tabIndex={0}

      aria-label={`View details for ${concert.name}`}

      onClick={() => router.push(`/events/${concert.id}`)}

      onKeyDown={(event) => {

        if (event.key === "Enter" || event.key === " ") {

          event.preventDefault();

          router.push(`/events/${concert.id}`);

        }

      }}

      className="group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-[#8B5CF6]/30 bg-[#202A4F] transition duration-300 hover:-translate-y-1 hover:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"

    >

        <div className="relative h-[125px] overflow-hidden sm:h-[140px]">

          <img

            src={getPoster(concert.poster_url)}

            alt={concert.name}

            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"

            loading={index > 2 ? "lazy" : "eager"}

          />

          <StatusBadge status={status} />

          <button

            type="button"

            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}

            aria-pressed={isWishlisted}

            onClick={(event) => {

              event.preventDefault();

              event.stopPropagation();

              onWishlistClick(concert);

            }}

            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-[#0B1020]/85 transition hover:scale-105 hover:border-[#8B5CF6]"

          >

            <img

              src={isWishlisted ? WISHLIST_ICONS.active : WISHLIST_ICONS.idle}

              alt=""

              className="h-5 w-5 object-contain"

            />

          </button>

          <span className="absolute bottom-2 right-3 rounded-lg border border-[#8B5CF6] bg-[#0B1020]/95 px-2.5 py-1.5 text-xs font-extrabold text-white">

            {formatPrice(concert.price)}

          </span>

        </div>

        <div className="flex flex-1 flex-col p-3">

          <span className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#22D3EE]">

            {label} #{index + 1}

          </span>

          <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-white group-hover:text-cyan-300 sm:text-[17px]">

            {concert.name}

          </h3>

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

              <span>

                From: <strong>{artistCountry || "To be announced"}</strong>

              </span>

            </InfoRow>

            <InfoRow icon="/icons/pin.png" top>

              <strong>

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

  );

}

// Concert section

function ConcertSection({

  title,

  concerts,

  label,

  status,

  extra,

  emptyText = "No concerts available right now.",

  wishlistIds,

  onWishlistClick,

}: {

  title: string;

  concerts: Concert[];

  label: string;

  status: StatusKey;

  extra?: ReactNode;

  emptyText?: string;

  wishlistIds: string[];

  onWishlistClick: (concert: Concert) => void;

}) {

  return (

    <section className="mt-8 sm:mt-10">

      <SectionHeading title={title} extra={extra} />

      {concerts.length > 0 ? (

        <div className={GRID}>

          {concerts.slice(0, 3).map((concert, index) => (

            <ConcertCard

              key={`${label}-${concert.id}`}

              concert={concert}

              index={index}

              label={label}

              status={status}

              isWishlisted={wishlistIds.includes(String(concert.id))}

              onWishlistClick={onWishlistClick}

            />

          ))}

        </div>

      ) : (

        <div className="rounded-xl border border-white/10 bg-[#151E36] px-4 py-10 text-center">

          <p className="text-sm text-slate-400">{emptyText}</p>

        </div>

      )}

    </section>

  );

}

// Hero banner
function HeroBanner({
  concert,
  isWishlisted,
  onWishlistClick,
}: {
  concert?: Concert;
  isWishlisted: boolean;
  onWishlistClick: (concert: Concert) => void;
}) {
  return (
    <section className="relative isolate min-h-[240px] overflow-hidden rounded-2xl border border-white/10 bg-[#0B1020] sm:min-h-[280px] lg:min-h-[320px]">
      <img
        src="/images/hero/blackpink.jpg"
        alt="Featured live concert"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080D20]/95 via-[#080D20]/65 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080D20]/60 to-transparent" />

      <div className="absolute right-3 top-3 text-right sm:right-6 sm:top-5">
        <p className="text-[11px] text-slate-300 sm:text-sm">Starting From</p>
        <p className="text-sm font-black text-white sm:text-lg">Rp. 1.350.000 +</p>
      </div>

      <div className="flex min-h-[240px] flex-col justify-center px-4 py-6 sm:min-h-[280px] sm:px-8 sm:py-7 lg:min-h-[320px] lg:px-10">
        <div className="max-w-[600px]">
          <span className="inline-flex rounded-full bg-[#C30437] px-4 py-1.5 text-[11px] font-black text-white sm:px-5 sm:py-2 sm:text-sm">
            NOW PLAYING
          </span>
          <p className="mt-3 text-xs font-black tracking-[0.18em] text-pink-300 sm:mt-4 sm:text-sm sm:tracking-[0.2em]">
            BLACKPINK WORLD TOUR
          </p>
          <h1 className="mt-1.5 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
            BORN PINK <span className="text-[#D6B4FF]">JAKARTA</span>
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white sm:mt-4 sm:gap-x-6 sm:text-sm">
            <div className="flex items-center gap-2">
              <img src="/icons/calendar (1).png" alt="" className="h-4 w-4 object-contain sm:h-5 sm:w-5" />
              11 - 12 Nov 2026
            </div>
            <div className="flex items-center gap-2">
              <img src="/icons/location.png" alt="" className="h-4 w-4 object-contain sm:h-5 sm:w-5" />
              Jakarta, Indonesia
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3">
            <Link href="/customer/explore" className="flex items-center gap-2 rounded-lg bg-[#6255DF] px-4 py-2.5 text-xs font-extrabold text-white shadow-lg transition hover:bg-[#786CF0] sm:rounded-xl sm:px-5 sm:py-3 sm:text-sm">
              <img src="/icons/ticket (1).png" alt="" className="h-4 w-4 object-contain sm:h-5 sm:w-5" />
              Buy Tickets Now
            </Link>
            <button
              type="button"
              aria-label={isWishlisted ? "Remove featured concert from wishlist" : "Add featured concert to wishlist"}
              aria-pressed={isWishlisted}
              disabled={!concert}
              onClick={() => concert && onWishlistClick(concert)}
              title={!concert ? "Featured concert is not available" : isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-[#0B1020]/80 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11 sm:rounded-xl"
            >
              <img src={isWishlisted ? WISHLIST_ICONS.active : WISHLIST_ICONS.idle} alt="" className="h-5 w-5 object-contain" />
            </button>
            <button type="button" aria-label="Play concert trailer" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-[#0B1020]/80 sm:h-11 sm:w-11 sm:rounded-xl">
              <img src="/icons/play.png" alt="" className="h-5 w-5 object-contain" />
            </button>
          </div>
          {!concert && (
            <p className="mt-2 text-xs text-white/60">
              Featured concert is not listed in available events yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}


// Page

export default function CustomerHomePage() {

  const [concerts, setConcerts] = useState<Concert[]>([]);

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const [search, setSearch] = useState("");

  const [selectedGenre, setSelectedGenre] = useState("All");

  const [city, setCity] = useState("Jakarta");

  const [loading, setLoading] = useState(true);

  // Restore saved wishlist state.

  useEffect(() => {

    try {

      const saved = JSON.parse(localStorage.getItem("lynora_wishlist") || "[]");

      if (Array.isArray(saved)) {

        setWishlistIds(

          saved

            .map((item: unknown) =>

              String(typeof item === "object" && item !== null && "id" in item

                ? (item as { id: string | number }).id

                : item)

            )

            .filter(Boolean)

        );

      }

    } catch {

      localStorage.removeItem("lynora_wishlist");

    }

  }, []);

  const handleWishlistClick = (concert: Concert) => {

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

        : [...items.filter((item) => typeof item === "object"), concert];

      localStorage.setItem("lynora_wishlist", JSON.stringify(updated));

      setWishlistIds(updated.map((item) =>

        String(typeof item === "object" && item !== null && "id" in item

          ? (item as { id: string | number }).id

          : item)

      ));

      window.dispatchEvent(new CustomEvent("lynora:wishlist-updated"));

      if (exists) {

        window.alert("Concert has been removed from your wishlist.");

      } else {

        window.alert("Concert has been added to your wishlist.");

      }

    } catch (error) {

      console.error("Failed to update wishlist:", error);

    }

  };

  // Load concerts once

  useEffect(() => {

    let active = true;

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

  // Apply search and genre filters

  const filteredConcerts = useMemo(

    () =>

      concerts.filter(

        (concert) =>

          matchesQuery(concert, search) &&

          (selectedGenre === "All" || sameGenre(concert, selectedGenre))

      ),

    [concerts, search, selectedGenre]

  );

  const upcoming = filteredConcerts.slice(0, 3);

  const recommended = filteredConcerts.slice(1, 4);

  const nearYou = useMemo(

    () => filteredConcerts.filter((concert) => isInCity(concert, city)),

    [filteredConcerts, city]

  );

  const trending = useMemo(() => [...filteredConcerts].reverse(), [filteredConcerts]);

  return (

    <CustomerShell

      title="Home"

      subtitle="Discover the hottest live events and music experiences."

      search={{

        value: search,

        onChange: setSearch,

        placeholder: "Search concerts, artists, or venues...",

      }}

    >

      <main className="mx-auto w-full max-w-[1320px] px-4 pb-12 pt-4 sm:px-6 sm:pt-5 lg:px-8">

        <HeroBanner

          concert={concerts.find((item) => /blackpink|born pink/i.test(item.name))}

          isWishlisted={concerts.some((item) => /blackpink|born pink/i.test(item.name) && wishlistIds.includes(String(item.id)))}

          onWishlistClick={handleWishlistClick}

        />

        {loading ? (

          <div className={`mt-10 ${GRID}`}>

            {[1, 2, 3].map((item) => (

              <div key={item} className="h-[300px] animate-pulse rounded-xl bg-[#202A4F]" />

            ))}

          </div>

        ) : (

          <>

            <ConcertSection

              title="Upcoming Concert"

              concerts={upcoming}

              label="Featured"

              status="comingSoon"

              wishlistIds={wishlistIds}

              onWishlistClick={handleWishlistClick}

            />

            <GenreSection

              selectedGenre={selectedGenre}

              onSelect={setSelectedGenre}

              concerts={concerts}

            />

            <ConcertSection

              title="Recommended For You"

              concerts={recommended}

              label="Recommended"

              status="new"

              wishlistIds={wishlistIds}

              onWishlistClick={handleWishlistClick}

            />

            <ConcertSection

              title="Near You"

              concerts={nearYou}

              label="Nearby"

              status="onSale"

              extra={<CityPicker value={city} onChange={setCity} />}

              emptyText={`No concerts in ${city === ALL_CITIES ? "Indonesia" : city} right now.`}

              wishlistIds={wishlistIds}

              onWishlistClick={handleWishlistClick}

            />

            <ConcertSection

              title="Trending Now"

              concerts={trending}

              label="Trending"

              status="onSale"

              wishlistIds={wishlistIds}

              onWishlistClick={handleWishlistClick}

            />

          </>

        )}

      </main>

    </CustomerShell>

  );

}