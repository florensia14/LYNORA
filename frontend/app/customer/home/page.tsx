"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent, } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomerShell from "@/components/layout/CustomerShell";
// Backend/API imports: tidak diubah sama sekali
import { fetchCustomerHomeConcerts, matchesCustomerHomeQuery } from "@/lib/customer-home-api";
import { API_URL, imageUrl, type Concert } from "@/lib/customer";
// 1. TYPES
type ConcertMeta = Concert;
type StatusKey = "comingSoon" | "onSale" | "soldOut" | "ended" | "new";
// 2. CONSTANTS
const CATEGORY_ICONS: Record<string, string> = {
    pop: "microphone.png",
    rock: "hand.png",
    "hip-hop": "boombox.png",
    "hip hop": "boombox.png",
    edm: "technology.png",
    kpop: "disco-ball.png",
    "k-pop": "disco-ball.png",
    indie: "wave-sound.png",
    festivall: "festival.png",
};
const HOME_CATEGORY_ORDER = [
    { label: "POP", aliases: ["pop"] },
    { label: "ROCK", aliases: ["rock"] },
    { label: "HIP-HOP", aliases: ["hip-hop", "hip hop"] },
    { label: "EDM", aliases: ["edm"] },
    { label: "KPOP", aliases: ["kpop", "k-pop"] },
    { label: "INDIE", aliases: ["indie"] },
    { label: "festivall", aliases: ["festivall"] },
] as const;
function getCategoryIcon(name: string) {
    const key = name.trim().toLowerCase();
    return `/images/categories/${CATEGORY_ICONS[key] || "category (1).png"}`;
}
function getCanonicalGenreName(name: string): string | null {
    const key = name.trim().toLowerCase();
    if (["pop"].includes(key)) return "POP";
    if (["rock"].includes(key)) return "ROCK";
    if (["hip-hop", "hip hop", "hiphop"].includes(key)) return "HIP-HOP";
    if (["edm"].includes(key)) return "EDM";
    if (["kpop", "k-pop", "k pop"].includes(key)) return "KPOP";
    if (["indie"].includes(key)) return "INDIE";
    if (["festivall", "festival"].includes(key)) return "festivall";
    return null;
}
const STATUS: Record<StatusKey, {
    text: string;
    style: string;
}> = {
    comingSoon: { text: "Coming Soon", style: "bg-[#2E2723] text-[#F5B84E]" },
    onSale: { text: "On Sale", style: "bg-[#152B32] text-[#26ADA0]" },
    soldOut: { text: "Sold Out", style: "bg-[#3A202B] text-[#FF8298]" },
    ended: { text: "Ended", style: "bg-[#252A3A] text-[#AAB2C5]" },
    new: { text: "New", style: "bg-[#2F1E2A] text-[#FF6B81]" },
};
const HERO_STATUS_LABEL: Record<string, string> = {
    on_sale: "NOW ON SALE",
    coming_soon: "COMING SOON",
    sold_out: "SOLD OUT",
    ended: "ENDED",
};
const HERO_STATUS_FALLBACK = "FEATURED CONCERT";
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
const WISHLIST_EVENT = "lynora:wishlist-updated";
const WISHLIST_ICONS = {
    idle: "/icons/wishlist.png",
    active: "/icons/wishlist(1).png",
    gray: "/icons/heart-gray.png",
};
const HERO_INTERVAL_MS = 7000;
const HERO_SWIPE_THRESHOLD = 45;
const TOAST_DURATION_MS = 2200;
const SECTION_LIMIT = 3;
// 3. TAILWIND STYLE TOKENS (dikelompokkan per komponen)
const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");
const styles = {
    // Responsive concert card grid. Preserve card proportions.
    grid: "grid w-full min-w-0 grid-cols-1 gap-x-3 gap-y-4 [grid-auto-rows:auto] min-[560px]:grid-cols-2 lg:grid-cols-3 sm:gap-x-4 sm:gap-y-5",
    section: "mt-6 w-full min-w-0 pb-2 pt-1 sm:mt-7 sm:pb-3 lg:mt-8",
    sectionTitle: {
        wrapper: "flex min-w-0 items-center gap-3 sm:gap-4",
        bar: "h-8 w-[5px] shrink-0 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#22D3EE] sm:h-11 sm:w-[6px]",
        text: "text-xl font-black text-white sm:text-2xl lg:text-3xl",
    },
    sectionHeading: {
        wrapper: "mb-4 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-3 sm:mb-6 sm:py-2.5",
        left: "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3",
        link: "shrink-0 py-1 text-sm font-extrabold text-[#E54869] hover:text-cyan-300",
    },
    infoRow: {
        base: "flex min-w-0 gap-2 text-xs text-[#D1D5E0]",
        top: "items-start leading-relaxed",
        center: "items-center",
        icon: "h-4 w-4 shrink-0 object-contain",
        iconTop: "mt-0.5",
        content: "min-w-0 break-words",
    },
    statusBadge: "absolute left-3 top-3 rounded-md px-2.5 py-1 text-[11px] font-extrabold sm:px-3 sm:py-1.5 sm:text-xs",
    cityPicker: {
        label: "relative inline-flex max-w-full items-center",
        pin: "pointer-events-none absolute left-3 h-4 w-4 object-contain",
        select: "min-h-[40px] max-w-full cursor-pointer appearance-none rounded-full bg-[#6B6F8F] py-2 pl-9 pr-10 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]",
        option: "bg-[#161624] text-white",
        arrow: "pointer-events-none absolute right-4 h-2 w-2 -translate-y-0.5 rotate-45 border-b-2 border-r-2 border-white/70",
    },
    genre: {
        titleWrap: "mb-4 sm:mb-6",
        list: "-mx-3 flex w-full min-w-0 snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-5 sm:px-5 lg:mx-0 lg:gap-2.5 lg:px-0",
        button: "flex min-h-[88px] w-[96px] min-w-[96px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 transition sm:min-h-[96px] sm:w-[112px] sm:min-w-[112px]",
        buttonActive: "border-[#5456DE] bg-[#5456DE] text-white",
        buttonIdle: "border-white/10 bg-[#161624] text-slate-300 hover:border-[#8B5CF6]",
        icon: "h-6 w-6 object-contain",
        name: "text-sm font-extrabold",
        count: "text-[10px]",
        countActive: "text-white/80",
        countIdle: "text-slate-400",
    },
    card: {
        root: "group flex h-full min-h-0 min-w-0 cursor-pointer flex-col self-stretch overflow-hidden rounded-xl border border-[#8B5CF6]/30 bg-[#202A4F] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#8B5CF6]/70 hover:shadow-[0_14px_34px_rgba(91,52,170,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]",
        media: "relative aspect-[16/9] w-full min-w-0 shrink-0 overflow-hidden",
        poster: "h-full w-full object-cover transition duration-500 group-hover:scale-105",
        fallback: "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#31245D] via-[#202A4F] to-[#0B1122] px-4 text-center",
        fallbackBrand: "text-2xl font-black text-[#A78BFA] sm:text-3xl",
        fallbackName: "mt-1 line-clamp-2 text-xs font-semibold text-white/75",
        fallbackTag: "mt-1 text-[9px] font-bold tracking-[0.25em] text-[#22D3EE]",
        wishlistBtn: "absolute right-2.5 top-2.5 z-10 grid h-10 w-10 place-items-center rounded-lg border border-white/25 bg-[#0B1122]/85 transition hover:scale-105 hover:border-[#8B5CF6] focus-visible:ring-2 focus-visible:ring-[#22D3EE]",
        wishlistIcon: "h-5 w-5 object-contain",
        price: "absolute bottom-2 right-2.5 max-w-[80%] truncate rounded-lg border border-[#8B5CF6] bg-[#0B1122]/95 px-2.5 py-1.5 text-xs font-extrabold text-white",
        body: "flex min-w-0 flex-1 flex-col bg-transparent px-3 py-2 sm:px-3.5 sm:py-2.5",
        label: "mb-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#22D3EE]",
        title: "line-clamp-2 break-words text-sm font-extrabold leading-snug text-white",
        category: "mt-1 text-[13px] font-bold text-[#A78BFA]",
        description: "mt-1 line-clamp-2 text-[11px] leading-snug text-[#A9AAB4]",
        divider: "mb-1.5 mt-2 border-t border-white/20",
        info: "flex flex-col gap-1",
    },
    empty: {
        box: "rounded-xl border border-white/10 bg-[#151E36] px-4 py-10 text-center",
        text: "text-sm text-slate-400",
    },
    hero: {
        root: "relative isolate flex min-h-[230px] w-full min-w-0 select-none items-end overflow-hidden rounded-xl border border-white/10 bg-[#0B1122] sm:min-h-[250px] sm:items-center lg:min-h-[275px]",
        image: "absolute inset-0 -z-20 h-full w-full object-cover object-center",
        imageFallback: "absolute inset-0 -z-20 bg-gradient-to-br from-[#31245D] via-[#202A4F] to-[#0B1122]",
        overlay: "absolute inset-0 -z-10 bg-gradient-to-t from-[#080D20] via-[#080D20]/75 to-[#080D20]/25 sm:bg-gradient-to-r sm:from-[#080D20]/95 sm:via-[#080D20]/70 sm:to-[#080D20]/20",
        content: "w-full min-w-0 p-4 pb-10 sm:p-6 sm:pb-11 lg:p-7 lg:pb-12",
        inner: "w-full min-w-0 max-w-[560px]",
        topRow: "flex items-start justify-between gap-3",
        badge: "inline-flex rounded-full bg-[#C30437] px-3.5 py-1.5 text-[10px] font-black tracking-wide text-white shadow-md shadow-[#C30437]/20 sm:px-4 sm:py-1.5 sm:text-xs",
        priceMobile: "shrink-0 text-right sm:hidden",
        priceDesktop: "absolute right-5 top-4 hidden text-right sm:block",
        priceLabelMobile: "text-[11px] text-slate-300",
        priceValueMobile: "text-sm font-black text-white",
        priceLabelDesktop: "text-xs text-slate-300",
        priceValueDesktop: "text-base font-black text-white",
        title: "mt-2.5 line-clamp-2 break-words text-xl font-black leading-tight text-white min-[420px]:text-2xl sm:mt-3 sm:text-[28px] lg:text-[32px]",
        titleGradient: "bg-gradient-to-r from-[#FF8DB7] via-[#DCA4FF] to-[#9B8CFF] bg-clip-text text-transparent",
        meta: "mt-2.5 flex flex-col gap-1.5 text-[11px] font-semibold text-white sm:mt-3 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:text-xs",
        metaRow: "flex items-center gap-2",
        metaRowVenue: "flex min-w-0 items-start gap-2 sm:items-center",
        metaIcon: "h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5",
        metaIconVenue: "mt-0.5 h-4 w-4 shrink-0 object-contain sm:mt-0 sm:h-5 sm:w-5",
        venueText: "line-clamp-2 min-w-0 break-words",
        actions: "mt-3 flex items-center gap-2 sm:mt-4 sm:gap-2.5",
        btnBase: "flex items-center justify-center gap-1.5 rounded-lg bg-[#5456DE] px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#6B6DE8] focus-visible:ring-2 focus-visible:ring-[#22D3EE]",
        btnView: "flex-1 sm:flex-none",
        btnIcon: "h-4 w-4 object-contain",
        wishlistBtn: "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-[#0B1122]/80 transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#22D3EE]",
        wishlistIcon: "h-[18px] w-[18px] object-contain",
        emptyWrap: "w-full px-5 py-12 text-white sm:px-8",
        emptyBadge: "rounded-full bg-[#C30437] px-4 py-2 text-xs font-black",
        emptyTitle: "mt-4 text-2xl font-black sm:text-4xl",
        emptyText: "mt-2 text-sm text-slate-300",
        emptyCta: "mt-5 w-fit",
        dots: "absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5",
        dot: "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        dotActive: "w-5 bg-white/80",
        dotIdle: "w-1.5 bg-white/35 hover:bg-white/60",
    },
    page: {
        main: "mx-auto w-full min-w-0 max-w-none overflow-x-clip px-3 pb-10 pt-4 sm:px-4 sm:pb-12 sm:pt-5 md:px-5 lg:px-6 xl:px-7",
        skeletonWrap: "mt-8",
        skeleton: "h-[280px] animate-pulse rounded-xl bg-[#202A4F]",
        errorBox: "mt-8 rounded-xl border border-red-400/20 bg-red-950/20 px-4 py-6 text-center",
        errorTitle: "text-sm font-semibold text-red-300",
        errorText: "mt-2 break-words text-xs text-slate-400",
        retryBtn: "mt-4 min-h-[40px] rounded-lg bg-[#5456DE] px-4 py-2 text-sm font-bold text-white hover:bg-[#6B6DE8]",
        toastWrap: "pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4 transition duration-200",
        toastShow: "translate-y-0 opacity-100",
        toastHide: "translate-y-2 opacity-0",
        toast: "max-w-sm rounded-xl border border-white/15 bg-[#0B1122]/95 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl",
    },
} as const;
// 4. HELPERS
// --- Formatting ------------------------------------------------------------
function formatPrice(price?: number) {
    if (typeof price !== "number")
        return "Price unavailable";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(price);
}
function formatDate(date?: string) {
    if (!date)
        return "Date unavailable";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime()))
        return "Date unavailable";
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
// --- Concert data ----------------------------------------------------------
function getPoster(path?: string | null) {
    if (!path || !path.trim())
        return null;
    const isLocalOrRemote = path.startsWith("/images/") ||
        path.startsWith("/icons/") ||
        /^https?:\/\//i.test(path);
    return isLocalOrRemote ? path : imageUrl(path);
}
function getConcertStatus(concert: Concert): StatusKey {
    switch (concert.sales_status) {
        case "on_sale":
            return "onSale";
        case "sold_out":
            return "soldOut";
        case "ended":
            return "ended";
        case "coming_soon":
        case "not_available":
        default:
            return "comingSoon";
    }
}
function getDescription(concert: Concert) {
    return (concert.description?.trim() ||
        (concert.venue_name
            ? `Enjoy an unforgettable live concert experience at ${concert.venue_name}.`
            : "Enjoy an unforgettable live concert experience."));
}
function sameGenre(concert: Concert, genre: string) {
    const category = (concert.category_name || "").trim().toLowerCase();
    const aliases: Record<string, string[]> = {
        POP: ["pop"],
        ROCK: ["rock"],
        "HIP-HOP": ["hip-hop", "hip hop", "hiphop"],
        EDM: ["edm"],
        KPOP: ["kpop", "k-pop", "k pop"],
        INDIE: ["indie"],
        festivall: ["festivall", "festival"],
    };
    return (aliases[genre] || [genre.toLowerCase()]).includes(category);
}
function isInCity(concert: Concert, cityName: string) {
    const place = `${concert.venue_name || ""} ${concert.venue_address || ""}`.toLowerCase();
    if (cityName === ALL_CITIES) {
        return (place.includes("indonesia") ||
            CITIES.some((city) => city.keywords.some((keyword) => place.includes(keyword))));
    }
    const city = CITIES.find((item) => item.name === cityName);
    return !!city && city.keywords.some((keyword) => place.includes(keyword));
}
function startTime(concert: Concert) {
    const time = new Date(concert.start_date || "").getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}
// --- Wishlist storage (localStorage only, tidak menyentuh backend) ----------
type WishlistApiRow = {
    event_id?: number | string;
    id?: number | string;
};
type WishlistApiResponse = {
    wishlists?: WishlistApiRow[];
    message?: string;
};
function getWishlistToken() {
    return localStorage.getItem("token");
}
async function fetchWishlistIds(): Promise<string[]> {
    const token = getWishlistToken();
    if (!token) {
        window.location.href = "/login";
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
    }
    const response = await fetch(`${API_URL}/wishlist`, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as WishlistApiResponse | null;
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        throw new Error("Sesi login berakhir. Silakan login kembali.");
    }
    if (!response.ok)
        throw new Error(payload?.message || "Gagal mengambil Wishlist.");
    return Array.isArray(payload?.wishlists)
        ? payload.wishlists
            .map((row) => String(row.event_id ?? row.id ?? ""))
            .filter(Boolean)
        : [];
}
async function updateWishlistApi(eventId: string, shouldAdd: boolean) {
    const token = getWishlistToken();
    if (!token) {
        window.location.href = "/login";
        throw new Error("Silakan login untuk menggunakan Wishlist.");
    }
    const response = await fetch(`${API_URL}/wishlist/${eventId}`, {
        method: shouldAdd ? "POST" : "DELETE",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    const payload = (await response.json().catch(() => null)) as {
        message?: string;
    } | null;
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        throw new Error("Sesi login berakhir. Silakan login kembali.");
    }
    if (!response.ok)
        throw new Error(payload?.message || "Gagal memperbarui Wishlist.");
}
// 5. SHARED UI
function SectionTitle({ children }: {
    children: ReactNode;
}) {
    return (<div className={styles.sectionTitle.wrapper}>

      <span className={styles.sectionTitle.bar}/>

      <h2 className={styles.sectionTitle.text}>{children}</h2>

    </div>);
}
function SectionHeading({ title, extra, href = "/customer/explore", }: {
    title: string;
    extra?: ReactNode;
    href?: string;
}) {
    return (<div className={styles.sectionHeading.wrapper}>

      <div className={styles.sectionHeading.left}>

        <SectionTitle>{title}</SectionTitle>

        {extra}

      </div>

      <Link href={href} className={styles.sectionHeading.link}>

        See All →

      </Link>

    </div>);
}
function InfoRow({ icon, children, top = false, }: {
    icon: string;
    children: ReactNode;
    top?: boolean;
}) {
    const s = styles.infoRow;
    return (<div className={cx(s.base, top ? s.top : s.center)}>

      <img src={icon} alt="" className={cx(s.icon, top && s.iconTop)}/>

      <div className={s.content}>{children}</div>

    </div>);
}
function StatusBadge({ status }: {
    status: StatusKey;
}) {
    const { text, style } = STATUS[status];
    return <span className={cx(styles.statusBadge, style)}>{text}</span>;
}
function CityPicker({ value, onChange, }: {
    value: string;
    onChange: (city: string) => void;
}) {
    const s = styles.cityPicker;
    return (<label className={s.label}>

      <img src="/icons/pin.png" alt="" className={s.pin}/>

      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Choose city" className={s.select}>

        {LOCATIONS.map((location) => (<option key={location} value={location} className={s.option}>

            {location}

          </option>))}

      </select>

      <span aria-hidden="true" className={s.arrow}/>

    </label>);
}
// 6. GENRE FILTER (dynamic from active categories API, horizontal scrolling)
type HomeCategory = {
    id: number;
    name: string;
    description?: string | null;
};
function GenreSection({ selectedGenre, onSelect, concerts, categories, }: {
    selectedGenre: string;
    onSelect: (genre: string) => void;
    concerts: Concert[];
    categories: HomeCategory[];
}) {
    const s = styles.genre;
    const genres = [
        { id: "all", name: "All" },
        ...categories.map((category) => ({
            id: String(category.id),
            name: getCanonicalGenreName(category.name),
        })).filter((category): category is { id: string; name: string } => Boolean(category.name)),
    ];
    return (<section className={styles.section}>
      <div className={s.titleWrap}>
        <SectionTitle>Browse by Genre</SectionTitle>
      </div>
      <div className={s.list}>
        {genres.map(({ id, name }) => {
            const active = selectedGenre === name;
            const count = name === "All"
                ? concerts.length
                : concerts.filter((concert) => sameGenre(concert, name)).length;
            return (<button key={id} type="button" onClick={() => onSelect(name)} aria-pressed={active} className={cx(s.button, active ? s.buttonActive : s.buttonIdle)}>
              <img src={name === "All" ? "/images/categories/category (1).png" : getCategoryIcon(name)} alt="" className={s.icon}/>
              <span className={s.name}>{name}</span>
              <span className={cx(s.count, active ? s.countActive : s.countIdle)}>
                {count} Events
              </span>
            </button>);
        })}
      </div>
    </section>);
}
// 7. CONCERT CARD
function ConcertCard({ concert, index, label, isWishlisted, onWishlistClick, className = "", }: {
    concert: Concert;
    index: number;
    label: string;
    isWishlisted: boolean;
    onWishlistClick: (concert: Concert) => void;
    className?: string;
}) {
    const s = styles.card;
    const router = useRouter();
    const meta = concert as ConcertMeta;
    const poster = getPoster(concert.poster_url);
    const [posterFailed, setPosterFailed] = useState(false);
    const artistCountry = Array.from(new Set(meta.artists?.map((artist) => artist.country).filter(Boolean))).join(", ");
    const goToDetail = () => router.push(`/events/${concert.id}?from=home`);
    return (<article role="link" tabIndex={0} aria-label={`View details for ${concert.name}`} onClick={goToDetail} onKeyDown={(event) => {
            // Abaikan event dari tombol di dalam kartu (mis. wishlist)
            if (event.target !== event.currentTarget)
                return;
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                goToDetail();
            }
        }} className={cx(s.root, className)}>

      {/* Media */}

      <div className={s.media}>

        {poster && !posterFailed ? (<img src={poster} alt={concert.name} className={s.poster} loading={index > 2 ? "lazy" : "eager"} onError={() => setPosterFailed(true)}/>) : (<div className={s.fallback}>

            <span className={s.fallbackBrand}>LYNORA</span>

            <span className={s.fallbackName}>{concert.name}</span>

            <span className={s.fallbackTag}>LIVE EXPERIENCE</span>

          </div>)}

        <StatusBadge status={getConcertStatus(concert)}/>

        <button type="button" aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={isWishlisted} onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onWishlistClick(concert);
        }} className={s.wishlistBtn}>

          <img src={isWishlisted ? WISHLIST_ICONS.active : WISHLIST_ICONS.idle} alt="" className={s.wishlistIcon}/>

        </button>

        <span className={s.price}>{formatPrice(concert.price)}</span>

      </div>

      {/* Body */}

      <div className={s.body}>

        <span className={s.label}>

          {label} #{index + 1}

        </span>

        <h3 className={s.title}>{concert.name}</h3>

        <p className={s.category}>{concert.category_name || "Live Concert"}</p>

        <p className={s.description}>{getDescription(concert)}</p>

        <div className={s.divider}/>

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

            <strong>

              {concert.venue_name || "Venue to be announced"}

              {concert.venue_address ? `, ${concert.venue_address}` : ""}

            </strong>

          </InfoRow>

          {meta.organizer_name && (<InfoRow icon="/icons/circus.png">

              <span>

                Organized by: <strong>{meta.organizer_name}</strong>

              </span>

            </InfoRow>)}

        </div>

      </div>

    </article>);
}
// 8. CONCERT SECTION
function ConcertSection({ title, concerts, label, extra, emptyText = "No concerts available right now.", wishlistIds, onWishlistClick, }: {
    title: string;
    concerts: Concert[];
    label: string;
    extra?: ReactNode;
    emptyText?: string;
    wishlistIds: string[];
    onWishlistClick: (concert: Concert) => void;
}) {
    const visible = concerts.slice(0, SECTION_LIMIT);
    return (<section className={styles.section}>

      <SectionHeading title={title} extra={extra} href="/customer/explore"/>

      {visible.length > 0 ? (<div className={cx(styles.grid, "mt-3")}>

          {visible.map((concert, index) => (<ConcertCard key={`${label}-${concert.id}`} concert={concert} index={index} label={label} isWishlisted={wishlistIds.includes(String(concert.id))} onWishlistClick={onWishlistClick}/>))}

        </div>) : (<div className={styles.empty.box}>

          <p className={styles.empty.text}>{emptyText}</p>

        </div>)}

    </section>);
}
// 9. HERO BANNER
function HeroTitle({ name }: {
    name: string;
}) {
    const words = name.trim().split(/\s+/);
    const firstWord = words.shift() || name;
    const remainingWords = words.join(" ");
    return (<>

      <span>{firstWord}</span>

      {remainingWords && (<>

          {" "}

          <span className={styles.hero.titleGradient}>{remainingWords}</span>

        </>)}

    </>);
}
function HeroBanner({ concerts, wishlistIds, onWishlistClick, }: {
    concerts: Concert[];
    wishlistIds: string[];
    onWishlistClick: (concert: Concert) => void;
}) {
    const s = styles.hero;
    const [activeIndex, setActiveIndex] = useState(0);
    const [posterFailed, setPosterFailed] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const slideCount = concerts.length;
    const activeConcert = slideCount > 0 ? concerts[activeIndex % slideCount] : undefined;
    const poster = getPoster(activeConcert?.poster_url);
    // Autoplay
    useEffect(() => {
        setActiveIndex((current) => (slideCount > 0 ? current % slideCount : 0));
        if (slideCount <= 1)
            return;
        const interval = window.setInterval(() => {
            setActiveIndex((current) => (current + 1) % slideCount);
        }, HERO_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [slideCount]);
    // Reset error poster saat slide berganti
    useEffect(() => {
        setPosterFailed(false);
    }, [activeConcert?.id, activeConcert?.poster_url]);
    const goToSlide = (index: number) => setActiveIndex(index);
    const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
    };
    const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
        if (touchStartX.current === null || slideCount <= 1)
            return;
        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const distance = touchStartX.current - endX;
        touchStartX.current = null;
        if (Math.abs(distance) < HERO_SWIPE_THRESHOLD)
            return;
        setActiveIndex((current) => distance > 0
            ? (current + 1) % slideCount
            : (current - 1 + slideCount) % slideCount);
    };
    // Derived data
    const venue = [activeConcert?.venue_name, activeConcert?.venue_address]
        .filter(Boolean)
        .join(", ");
    const isWishlisted = activeConcert
        ? wishlistIds.includes(String(activeConcert.id))
        : false;
    const statusLabel = (activeConcert?.sales_status && HERO_STATUS_LABEL[activeConcert.sales_status]) ||
        HERO_STATUS_FALLBACK;
    return (<section aria-label="Featured concerts carousel" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={s.root}>

      {/* Background */}

      {poster && !posterFailed ? (<img key={activeConcert?.id} src={poster} alt={activeConcert?.name || "Featured concert"} onError={() => setPosterFailed(true)} className={s.image}/>) : (<div className={s.imageFallback}/>)}

      <div className={s.overlay}/>

      {/* Content */}

      {activeConcert ? (<>

          <div className={s.content}>

            <div className={s.inner}>

              <div className={s.topRow}>

                <span className={s.badge}>{statusLabel}</span>

                <div className={s.priceMobile}>

                  <p className={s.priceLabelMobile}>Starting From</p>

                  <p className={s.priceValueMobile}>{formatPrice(activeConcert.price)}</p>

                </div>

              </div>

              <h1 className={s.title}>

                <HeroTitle name={activeConcert.name}/>

              </h1>

              <div className={s.meta}>

                {activeConcert.start_date && (<div className={s.metaRow}>

                    <img src="/icons/calendar (1).png" alt="" className={s.metaIcon}/>

                    <span>{formatDate(activeConcert.start_date)}</span>

                  </div>)}

                {venue && (<div className={s.metaRowVenue}>

                    <img src="/icons/pin.png" alt="" className={s.metaIconVenue}/>

                    <span className={s.venueText}>{venue}</span>

                  </div>)}

              </div>

              <div className={s.actions}>

                <Link href={`/events/${activeConcert.id}?from=home`} className={cx(s.btnBase, s.btnView)}>

                  <img src="/icons/ticket (1).png" alt="" className={s.btnIcon}/>

                  View Concert

                </Link>

                <button type="button" aria-label={isWishlisted ? "Remove concert from wishlist" : "Add concert to wishlist"} aria-pressed={isWishlisted} onClick={() => onWishlistClick(activeConcert)} className={s.wishlistBtn}>

                  <img src={isWishlisted ? WISHLIST_ICONS.active : WISHLIST_ICONS.idle} alt="" className={s.wishlistIcon}/>

                </button>

              </div>

            </div>

          </div>

          <div className={s.priceDesktop}>

            <p className={s.priceLabelDesktop}>Starting From</p>

            <p className={s.priceValueDesktop}>{formatPrice(activeConcert.price)}</p>

          </div>

        </>) : (<div className={s.emptyWrap}>

          <span className={s.emptyBadge}>LYNORA LIVE</span>

          <h1 className={s.emptyTitle}>Discover Live Concerts</h1>

          <p className={s.emptyText}>

            Explore upcoming events and find your next live experience.

          </p>

          <Link href="/customer/explore" className={cx(s.btnBase, s.emptyCta)}>

            Browse Events

          </Link>

        </div>)}

      {/* Dots */}

      {slideCount > 1 && (<div className={s.dots} aria-label="Choose featured concert">

          {concerts.map((concert, index) => (<button key={`${concert.id}-${index}`} type="button" aria-label={`Show slide ${index + 1}: ${concert.name}`} aria-current={index === activeIndex ? "true" : undefined} onClick={() => goToSlide(index)} className={cx(s.dot, index === activeIndex ? s.dotActive : s.dotIdle)}/>))}

        </div>)}

    </section>);
}
// 10. PAGE
export default function CustomerHomePage() {
    const s = styles.page;
    // --- State ---------------------------------------------------------------
    const [concerts, setConcerts] = useState<Concert[]>([]);
    const [categories, setCategories] = useState<HomeCategory[]>([]);
    const [wishlistIds, setWishlistIds] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("All");
    const [city, setCity] = useState("Jakarta");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [toast, setToast] = useState("");
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // --- Toast ---------------------------------------------------------------
    const showToast = useCallback((message: string) => {
        setToast(message);
        if (toastTimer.current)
            clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(""), TOAST_DURATION_MS);
    }, []);
    useEffect(() => () => {
        if (toastTimer.current)
            clearTimeout(toastTimer.current);
    }, []);
    // --- Load active categories from the same database used by Manage Categories ---
    useEffect(() => {
        let active = true;
        async function loadCategories() {
            try {
                const response = await fetch(`${API_URL}/categories/public`, {
                    method: "GET",
                    cache: "no-store",
                });
                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload?.message || "Failed to load categories.");
                }
                const rows: HomeCategory[] = Array.isArray(payload?.categories)
                    ? payload.categories
                    : [];
                const seen = new Set<string>();
                const normalized = rows.reduce<HomeCategory[]>((result, category) => {
                    const canonicalName = getCanonicalGenreName(category.name || "");
                    if (!canonicalName || seen.has(canonicalName)) return result;
                    seen.add(canonicalName);
                    result.push({ ...category, name: canonicalName });
                    return result;
                }, []);
                const order = ["POP", "ROCK", "HIP-HOP", "EDM", "KPOP", "INDIE", "festivall"];
                normalized.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
                if (active) setCategories(normalized);
            } catch (error) {
                console.error("Failed to load categories:", error);
                if (active) setCategories([]);
            }
        }
        loadCategories();
        return () => {
            active = false;
        };
    }, []);
    // --- Load concerts dari backend -------------------------------------------
    useEffect(() => {
        let active = true;
        async function loadConcerts() {
            try {
                setLoading(true);
                setLoadError("");
                const data = await fetchCustomerHomeConcerts();
                if (active)
                    setConcerts(data);
            }
            catch (error) {
                console.error("Failed to load concerts:", error);
                if (active) {
                    setLoadError(error instanceof Error ? error.message : "Failed to load concerts.");
                }
            }
            finally {
                if (active)
                    setLoading(false);
            }
        }
        loadConcerts();
        return () => {
            active = false;
        };
    }, [reloadKey]);
    useEffect(() => {
        if (selectedGenre !== "All" && !categories.some((category) => category.name === selectedGenre)) {
            setSelectedGenre("All");
        }
    }, [categories, selectedGenre]);
    // --- Filter and prepare Home sections -----------------------------------
    const filteredConcerts = useMemo(() => concerts.filter((concert) => matchesCustomerHomeQuery(concert, search) &&
        (selectedGenre === "All" || sameGenre(concert, selectedGenre))), [concerts, search, selectedGenre]);
    const upcoming = useMemo(() => filteredConcerts
        .filter((concert) => concert.sales_status !== "ended")
        .sort((a, b) => startTime(a) - startTime(b))
        .slice(0, 3), [filteredConcerts]);
    const recommended = useMemo(() => {
        const upcomingIds = new Set(upcoming.map((concert) => concert.id));
        const rest = filteredConcerts.filter((concert) => !upcomingIds.has(concert.id));
        const pool = rest.length > 0 ? rest : filteredConcerts;
        const onSaleFirst = [
            ...pool.filter((concert) => concert.sales_status === "on_sale"),
            ...pool.filter((concert) => concert.sales_status !== "on_sale"),
        ];
        return onSaleFirst.slice(0, 3);
    }, [filteredConcerts, upcoming]);
    const nearYou = useMemo(() => filteredConcerts.filter((concert) => isInCity(concert, city)), [filteredConcerts, city]);
    const trending = useMemo(() => filteredConcerts.filter((concert) => concert.sales_status === "on_sale").slice(0, 3), [filteredConcerts]);
    const heroConcerts = useMemo(() => [...recommended, ...upcoming, ...trending], [recommended, upcoming, trending]);
    const emptyFiltered = search.trim() || selectedGenre !== "All"
        ? "No concerts match your search or genre."
        : undefined;
    useEffect(() => {
        let active = true;
        fetchWishlistIds()
            .then((ids) => {
            if (active)
                setWishlistIds(ids);
        })
            .catch((error) => {
            console.error("Failed to load wishlist:", error);
            if (active)
                showToast(error instanceof Error ? error.message : "Gagal memuat Wishlist.");
        });
        return () => {
            active = false;
        };
    }, [showToast]);
    const handleWishlistClick = useCallback(async (concert: Concert) => {
        const concertId = String(concert.id);
        const exists = wishlistIds.includes(concertId);
        try {
            await updateWishlistApi(concertId, !exists);
            setWishlistIds((current) => exists
                ? current.filter((id) => id !== concertId)
                : current.includes(concertId) ? current : [...current, concertId]);
            window.dispatchEvent(new CustomEvent(WISHLIST_EVENT));
            showToast(exists
                ? "Concert has been removed from your wishlist."
                : "Concert has been added to your wishlist.");
        }
        catch (error) {
            console.error("Failed to update wishlist:", error);
            showToast(error instanceof Error ? error.message : "Unable to update wishlist. Please try again.");
        }
    }, [wishlistIds, showToast]);
    const wishlistProps = {
        wishlistIds,
        onWishlistClick: handleWishlistClick,
    };
    // --- Render --------------------------------------------------------------
    return (<CustomerShell title="Home" subtitle="Discover the hottest live events and music experiences." search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search concerts, artists, or venues...",
        }}>

      <main className={s.main}>

        <HeroBanner concerts={heroConcerts} {...wishlistProps}/>

        {loading ? (<div className={cx(s.skeletonWrap, styles.grid)}>

            {[1, 2, 3].map((item) => (<div key={item} className={s.skeleton}/>))}

          </div>) : loadError ? (<div className={s.errorBox}>

            <p className={s.errorTitle}>Unable to load concerts.</p>

            <p className={s.errorText}>{loadError}</p>

            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className={s.retryBtn}>

              Try Again

            </button>

          </div>) : (<>

            <ConcertSection title="Upcoming Concert" concerts={upcoming} label="Featured" emptyText={emptyFiltered} {...wishlistProps}/>

            <GenreSection selectedGenre={selectedGenre} onSelect={setSelectedGenre} concerts={concerts} categories={categories}/>

            <ConcertSection title="Recommended For You" concerts={recommended} label="Recommended" emptyText={emptyFiltered} {...wishlistProps}/>

            <ConcertSection title="Near You" concerts={nearYou} label="Nearby" extra={<CityPicker value={city} onChange={setCity}/>} emptyText={`No concerts in ${city === ALL_CITIES ? "Indonesia" : city} right now.`} {...wishlistProps}/>

            <ConcertSection title="Trending Now" concerts={trending} label="Trending" emptyText={emptyFiltered} {...wishlistProps}/>

          </>)}

      </main>

      {/* Toast pengganti window.alert */}

      <div role="status" aria-live="polite" className={cx(s.toastWrap, toast ? s.toastShow : s.toastHide)}>

        {toast && <p className={s.toast}>{toast}</p>}

      </div>

    </CustomerShell>);
}
