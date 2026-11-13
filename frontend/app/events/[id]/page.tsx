"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CustomerShell from "@/components/layout/CustomerShell";
import { fetchConcerts } from "@/lib/api";
import { imageUrl, type Concert } from "@/lib/customer";

type Artist = {
  id?: number;
  name?: string | null;
  country?: string | null;
  photo_url?: string | null;
  image_url?: string | null;
  bio?: string | null;
};

type TicketCategory = {
  id?: number;
  name: string;
  price: number;
  available?: number;
  description?: string;
};

type ScheduleItem = {
  time?: string;
  title?: string;
  description?: string;
};

type ConcertDetail = Concert & {
  artists?: Artist[];
  organizer_name?: string | null;
  venue_description?: string | null;
  venue_image?: string | null;
  ticket_categories?: TicketCategory[];
  schedule?: ScheduleItem[];
};

const FALLBACK_POSTER = "/images/hero/blackpink.jpg";
const WISHLIST_KEY = "lynora_wishlist";
const WISHLIST_EVENT = "lynora:wishlist-updated";

type TabKey = "overview" | "tickets" | "venue" | "terms";

function posterUrl(path?: string | null) {
  if (!path) return FALLBACK_POSTER;
  if (path.startsWith("/") || /^https?:\/\//i.test(path)) return path;
  return imageUrl(path);
}

function money(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Price unavailable";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateTime(value?: string) {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be announced";
  return (
    new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(date) + " WIB"
  );
}

function readWishlist(): Concert[] {
  try {
    const value = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (item): item is Concert =>
            Boolean(item) && typeof item === "object" && "id" in item,
        )
      : [];
  } catch {
    return [];
  }
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-7 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#22D3EE]" />
      <h2 className="text-base font-black text-white sm:text-lg">{children}</h2>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-[#676D89] bg-[#161624] p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

const tabs: { id: TabKey; label: string }[] = [
  { id: "overview", label: "Overview & Lineup" },
  { id: "tickets", label: "Ticket categories" },
  { id: "venue", label: "Venue & seating" },
  { id: "terms", label: "Terms & FAQ" },
];

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = String(params.id || "");

  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [similar, setSimilar] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlisted, setWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedTicket, setSelectedTicket] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadEvent() {
      try {
        setLoading(true);
        setError("");
        const events = await fetchConcerts();
        if (!mounted) return;

        const found = events.find((item) => String(item.id) === eventId) as
          | ConcertDetail
          | undefined;

        if (!found) {
          setConcert(null);
          setError("The concert you're looking for could not be found.");
          return;
        }

        setConcert(found);
        setSimilar(
          events
            .filter((item) => String(item.id) !== eventId)
            .sort(
              (a, b) =>
                Number(b.category_name === found.category_name) -
                Number(a.category_name === found.category_name),
            )
            .slice(0, 4),
        );
      } catch (loadError) {
        console.error("Failed to load event detail:", loadError);
        if (mounted) setError("Unable to load concert details. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEvent();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    const sync = () => {
      setWishlisted(readWishlist().some((item) => String(item.id) === eventId));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(WISHLIST_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(WISHLIST_EVENT, sync);
    };
  }, [eventId]);

  const tickets = useMemo<TicketCategory[]>(() => {
    if (concert?.ticket_categories?.length) return concert.ticket_categories;
    if (!concert) return [];
    const base = typeof concert.price === "number" ? concert.price : 0;
    return [
      { name: "CAT 1 - Festival Floor", price: base, description: "Standing area close to the stage" },
      { name: "CAT 2 - Lower Tribune", price: Math.round(base * 0.8), description: "Numbered seating with a clear stage view" },
      { name: "CAT 3 - Tribune", price: Math.round(base * 0.65), description: "Reserved seating with a comfortable view" },
      { name: "CAT 4 - Upper Tribune", price: Math.round(base * 0.5), description: "Upper-level seating area" },
    ].filter((ticket) => ticket.price > 0);
  }, [concert]);

  const currentTicket = tickets[selectedTicket];
  const totalPrice = (currentTicket?.price || 0) * quantity;

  function toggleWishlist() {
    if (!concert) return;
    const items = readWishlist();
    const exists = items.some((item) => String(item.id) === String(concert.id));
    const next = exists
      ? items.filter((item) => String(item.id) !== String(concert.id))
      : [...items, concert];

    localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    setWishlisted(!exists);
    window.dispatchEvent(new Event(WISHLIST_EVENT));
    window.alert(
      exists
        ? "Concert has been removed from your wishlist."
        : "Concert has been added to your wishlist.",
    );
  }

  if (loading) {
    return (
      <CustomerShell title="Concert Details" subtitle="Discover every detail of this live experience.">
        <main className="w-full min-w-0 px-3 py-5 sm:px-5 lg:px-7">
          <div className="h-[230px] animate-pulse rounded-2xl bg-[#161624]" />
          <div className="mt-5 h-14 animate-pulse rounded-xl bg-[#161624]" />
          <div className="mt-5 h-[520px] animate-pulse rounded-xl bg-[#161624]" />
        </main>
      </CustomerShell>
    );
  }

  if (!concert) {
    return (
      <CustomerShell title="Concert Details" subtitle="Concert information">
        <main className="w-full px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-[#676D89] bg-[#161624] p-8 text-center">
            <p className="text-xs font-black text-[#F5B84E]">EVENT NOT FOUND</p>
            <h1 className="mt-3 text-2xl font-black text-white">Concert unavailable</h1>
            <p className="mt-2 text-sm text-slate-400">{error || "This event may have been removed."}</p>
            <Link href="/customer/explore" className="mt-6 inline-flex rounded-xl bg-[#6255DF] px-5 py-3 text-sm font-extrabold text-white">
              Explore concerts
            </Link>
          </div>
        </main>
      </CustomerShell>
    );
  }

  const artists = concert.artists?.length
    ? concert.artists
    : [{ name: concert.artist || concert.name, country: concert.artist_country }];

  const schedule = concert.schedule?.length
    ? concert.schedule
    : [
        { time: "4:00 PM", title: "Gates open and merch booths start" },
        { time: "6:30 PM", title: "Entry for Floor and Lower Tribune closes" },
        { time: "7:30 PM", title: "Show starts" },
        { time: "~10:00 PM", title: "Show ends and staggered exit begins" },
      ];

  return (
    <CustomerShell title="Concert Details" subtitle="Discover every detail of this live experience.">
      <main className="w-full min-w-0 px-3 pb-8 pt-4 sm:px-5 sm:pb-10 sm:pt-5 lg:px-7 xl:px-8">
        {/* BACK BUTTON: berada di luar hero dan responsif */}
        <div className="mb-3 flex w-full items-center sm:mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] sm:min-h-10 sm:px-3 sm:text-sm"
          >
            <img
              src="/icons/back.png"
              alt=""
              className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5"
            />
            <span>Back</span>
          </button>
        </div>

        {/* HERO */}
        <section className="relative isolate min-h-[220px] w-full overflow-hidden rounded-2xl border border-[#676D89] bg-[#161624] sm:min-h-[250px] lg:min-h-[270px]">
          <img
            src={posterUrl(concert.poster_url)}
            alt={concert.name}
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080D20]/95 via-[#080D20]/75 to-[#080D20]/25" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080D20]/85 via-transparent to-[#080D20]/10" />


          <div className="flex min-h-[220px] items-end p-4 pt-16 sm:min-h-[250px] sm:p-6 sm:pt-16 lg:min-h-[270px] lg:p-7 lg:pt-16">
            <div className="w-full min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#C30437] px-3.5 py-1.5 text-[10px] font-black tracking-wide text-white">LIVE EVENT</span>
                {concert.category_name && <span className="rounded-full border border-white/30 bg-[#161624]/60 px-3.5 py-1.5 text-[10px] font-extrabold text-white">{concert.category_name}</span>}
                {concert.status && <span className="rounded-full border border-[#26ADA0]/40 bg-[#152B32]/90 px-3.5 py-1.5 text-[10px] font-extrabold text-[#5DE0D0]">{concert.status}</span>}
              </div>
              <h1 className="max-w-4xl break-words text-2xl font-black leading-tight text-white drop-shadow-lg sm:text-3xl lg:text-4xl">{concert.name}</h1>
              <div className="mt-3 flex flex-col gap-2 text-xs font-bold text-white sm:flex-row sm:flex-wrap sm:gap-x-6">
                <span className="flex min-w-0 items-center gap-2">
                  <img src="/icons/calendar (1).png" alt="" className="h-5 w-5 shrink-0 object-contain" />
                  <span>{dateTime(concert.start_date)}</span>
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <img src="/icons/pin.png" alt="" className="h-5 w-5 shrink-0 object-contain" />
                  <span className="break-words">{concert.venue_name || "Venue to be announced"}{concert.venue_address ? `, ${concert.venue_address}` : ""}</span>
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("tickets")}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#6255DF] px-5 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-[#786CF0]"
                >
                  <img src="/icons/ticket (1).png" alt="" className="h-5 w-5 object-contain" />
                  Find Tickets
                </button>
                <button
                  type="button"
                  onClick={toggleWishlist}
                  aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/30 bg-[#161624]/80 transition hover:scale-105 hover:border-[#8B5CF6]"
                >
                  <img src={wishlisted ? "/icons/wishlist(1).png" : "/icons/wishlist.png"} alt="" className="h-6 w-6 object-contain" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* TAB BAR: one outer border, clean tabs like the reference */}
        <nav
          aria-label="Event detail sections"
          className="mt-4 flex w-full min-w-0 gap-1.5 overflow-x-auto rounded-xl border border-[#454B63] bg-[#161624] p-1.5 sm:mt-5 sm:gap-2 sm:p-2"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`min-h-10 min-w-[145px] flex-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-[11px] font-bold transition sm:min-w-0 sm:px-3 sm:text-sm ${
                activeTab === tab.id
                  ? "bg-[#514FE5] text-white shadow-sm"
                  : "border border-transparent bg-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* TAB CONTENT: konten kiri + ticket panel kanan, keduanya mengisi lebar penuh */}
        <div className="mt-4 grid w-full min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:gap-5">
          <div className="min-w-0 space-y-4">
            {activeTab === "overview" && (
              <>
                <Panel>
                  <div className="flex items-center justify-between gap-3">
                    <SectionHeading>About the show</SectionHeading>
                    <span className="shrink-0 text-[9px] font-bold text-cyan-300">2 exclusive nights in Jakarta</span>
                  </div>
                  <p className="whitespace-pre-line text-xs leading-6 text-slate-300 sm:text-sm">
                    {concert.description || `Get ready for an unforgettable live music experience at ${concert.venue_name || "the venue"}. Join fellow music fans for a night of incredible performances.`}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["Stadium capacity", "77,000+ seats"],
                      ["Running time", "150 min"],
                      ["Sound system", "360° Dolby Live"],
                      ["Official promoter", concert.organizer_name || "LYNORA"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-[#676D89] bg-[#161624]/60 p-3">
                        <p className="text-[9px] font-bold text-slate-500">{label}</p>
                        <p className="mt-1 text-xs font-black text-cyan-300">{value}</p>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel>
                  <div className="flex items-center justify-between gap-3">
                    <SectionHeading>Lineup & artist profiles</SectionHeading>
                    <span className="text-[9px] font-bold text-cyan-300">Headlining act</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {artists.map((artist, index) => (
                      <article key={`${artist.name || "artist"}-${index}`} className="min-w-0 overflow-hidden rounded-lg border border-[#676D89] bg-[#161624]/70">
                        <div className="h-32 overflow-hidden bg-gradient-to-br from-[#6255DF]/40 to-[#22D3EE]/10 sm:h-40">
                          <img src={posterUrl(artist.photo_url || artist.image_url || concert.poster_url)} alt={artist.name || "Artist"} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-2.5">
                          <h3 className="truncate text-xs font-extrabold text-white">{artist.name || "Artist to be announced"}</h3>
                          <p className="mt-1 text-[10px] text-slate-400">{artist.country || concert.artist_country || "Artist"}</p>
                          {artist.bio && <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-slate-400">{artist.bio}</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg border border-[#676D89] bg-[#161624]/60 p-3">
                    <p className="text-xs font-extrabold text-white">Official <span className="text-pink-300">[{concert.name}]</span> World Tour setlist</p>
                    <p className="mt-1 text-[10px] text-slate-400">Setlist and performance details will be announced by the organizer.</p>
                  </div>
                </Panel>

                <Panel>
                  <SectionHeading>Event schedule · both nights</SectionHeading>
                  <div className="divide-y divide-white/10">
                    {schedule.map((item, index) => (
                      <div key={`${item.time || "time"}-${index}`} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[110px_minmax(0,1fr)]">
                        <p className="text-xs font-black text-cyan-300 sm:text-sm">{item.time || "TBA"}</p>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-200">{item.title || "Event activity"}</p>
                          {item.description && <p className="mt-1 text-[10px] text-slate-400">{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </>
            )}

            {activeTab === "tickets" && (
              <>
                <Panel>
                  <div className="flex items-center justify-between gap-3">
                    <SectionHeading>Ticket categories & benefits</SectionHeading>
                    <span className="text-[9px] font-bold text-cyan-300">All prices include tax</span>
                  </div>
                  <div className="space-y-3">
                    {tickets.map((ticket, index) => (
                      <button
                        key={`${ticket.name}-${index}`}
                        type="button"
                        onClick={() => setSelectedTicket(index)}
                        className={`w-full rounded-lg border p-3 text-left transition sm:p-4 ${
                          selectedTicket === index ? "border-[#8B5CF6] bg-[#6255DF]/15" : "border-[#676D89] bg-[#161624]/50 hover:border-[#8B5CF6]/60"
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="text-xs font-black text-white sm:text-sm">{ticket.name}</h3>
                            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{ticket.description || "Enjoy the live concert experience with this ticket category."}</p>
                            {typeof ticket.available === "number" && <p className="mt-1 text-[10px] text-cyan-300">{ticket.available} tickets available</p>}
                          </div>
                          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                            <span className="text-xs font-black text-white">{money(ticket.price)}</span>
                            <span className={`rounded-md px-3 py-1.5 text-[10px] font-extrabold ${selectedTicket === index ? "bg-[#8B5CF6] text-white" : "bg-[#6255DF]/30 text-violet-200"}`}>
                              {selectedTicket === index ? "Selected" : "Select ticket"}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                    {!tickets.length && <p className="rounded-lg bg-[#161624]/60 p-4 text-xs text-slate-400">Ticket categories have not been published yet.</p>}
                  </div>
                </Panel>
                <Panel>
                  <SectionHeading>Ticket rules</SectionHeading>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      ["Purchase limit", "Each account may purchase up to the limit shown during checkout."],
                      ["E-ticket delivery", "Your e-ticket will be available in My Tickets after successful payment."],
                      ["Name & ID check", "Bring a valid identification document matching the ticket details."],
                      ["Payment options", "Available payment methods will be displayed during checkout."],
                    ].map(([title, description]) => (
                      <div key={title} className="rounded-lg border border-[#676D89] bg-[#161624]/60 p-3">
                        <h3 className="text-xs font-extrabold text-white">{title}</h3>
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{description}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              </>
            )}

            {activeTab === "venue" && (
              <>
                <Panel>
                  <SectionHeading>Venue & location</SectionHeading>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <div className="h-48 overflow-hidden rounded-lg border border-[#676D89] bg-[#161624] sm:h-56">
                      <img
                        src={concert.venue_image ? posterUrl(concert.venue_image) : "/images/hero/maps.png"}
                        alt="Gelora Bung Karno venue map"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-white">{concert.venue_name || "Venue to be announced"}</h3>
                      <p className="mt-1 text-xs text-slate-400">{concert.venue_address || "Venue address will be announced."}</p>
                      {concert.venue_description && <p className="mt-3 text-xs leading-6 text-slate-300">{concert.venue_description}</p>}
                      <ul className="mt-3 space-y-2 text-[10px] text-slate-300">
                        <li>• Capacity: To be confirmed by venue</li>
                        <li>• Gates open: Check event schedule</li>
                        <li>• Accessibility: Contact the venue for assistance</li>
                      </ul>
                    </div>
                  </div>
                </Panel>
                <Panel>
                  <SectionHeading>Seating & entry gates</SectionHeading>
                  <div className="divide-y divide-white/10">
                    {[
                      ["Festival Floor", "Enter via Gate 5. Pit A on the left, Pit B on the right of the stage."],
                      ["Lower Tribune", "Enter via Gates 3–7. Follow the signs to your block and row."],
                      ["Tribune", "Enter via Gates 3–7. Escalators lead to the upper rings."],
                      ["Upper Tribune", "Enter via Gates 1–2 or 8–10. Allow extra time for stairs."],
                    ].map(([name, description]) => (
                      <div key={name} className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
                        <h3 className="text-xs font-black text-cyan-300 sm:text-sm">{name}</h3>
                        <p className="text-xs leading-relaxed text-slate-400">{description}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <SectionHeading>Getting there</SectionHeading>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      ["MRT", "Istora Mandiri station is approximately 8 minutes on foot."],
                      ["Park & ride", "Official parking and drop-off information will be announced by the venue."],
                      ["Ride-hailing", "Use the designated drop-off point and follow event traffic directions."],
                      ["Facilities", "Food stalls, prayer rooms, first aid and official merchandise booths are available at the venue."],
                    ].map(([title, description]) => (
                      <div key={title} className="rounded-lg border border-[#676D89] bg-[#161624]/60 p-3">
                        <h3 className="text-xs font-extrabold text-white">{title}</h3>
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{description}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              </>
            )}

            {activeTab === "terms" && (
              <>
                <Panel>
                  <SectionHeading>Terms & conditions</SectionHeading>
                  <ul className="space-y-3 text-xs leading-relaxed text-slate-300">
                    {[
                      "Tickets are non-transferable except through the official LYNORA resale process.",
                      "Guests under 17 must be accompanied by an adult with a valid ticket.",
                      "Professional cameras, drones, outside food and drinks, and sharp objects are prohibited.",
                      "The promoter may change the schedule or running order without prior notice.",
                      "Duplicate or resold tickets outside official channels may be rejected at the gate.",
                    ].map((term) => <li key={term} className="flex gap-2"><span className="text-violet-400">●</span><span>{term}</span></li>)}
                  </ul>
                </Panel>
                <Panel>
                  <SectionHeading>Frequently asked questions</SectionHeading>
                  <div className="space-y-2">
                    {[
                      ["How will I receive my ticket?", "Your e-ticket will be available in My Tickets after payment has been confirmed."],
                      ["Can I get a refund or resell my ticket?", "Refunds and resale follow the official event organizer's policy. Check the policy before completing payment."],
                      ["What can I bring into the stadium?", "Bring your e-ticket and valid identification. Prohibited items are subject to venue rules."],
                      ["Is there an age limit?", "Please check the event age policy and attend with an adult if required."],
                      ["What if the show is cancelled or rescheduled?", "Updates and available options will be shared through official LYNORA notifications."],
                    ].map(([question, answer], index) => (
                      <details key={question} className="rounded-lg border border-[#676D89] bg-[#161624]/60 p-3" open={index === 1}>
                        <summary className="cursor-pointer text-xs font-extrabold text-white">{question}</summary>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{answer}</p>
                      </details>
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <h3 className="text-xs font-extrabold text-white">Need help?</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">Contact LYNORA Support through My Orders. Our team will assist with event and ticket questions.</p>
                </Panel>
              </>
            )}
          </div>

          {/* Ticket purchase panel: same visual role as reference, uses the full right column */}
          <aside className="min-w-0 lg:sticky lg:top-5">
            <Panel className="border-[#676D89] shadow-xl shadow-black/20">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-[#3A202E] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#FF6B81]">Fast-selling ticket</span>
                <span className="text-[9px] text-slate-500">Tax included</span>
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase text-slate-400">Starting from</p>
              <p className="mt-1 text-2xl font-black text-[#B9A7FF]">{money(tickets.length ? Math.min(...tickets.map((ticket) => ticket.price)) : concert.price)}</p>

              <div className="mt-4">
                <p className="mb-2 text-xs font-extrabold text-white">Select date</p>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1].map((day) => (
                    <button key={day} type="button" onClick={() => setSelectedDate(day)} className={`rounded-lg border px-2 py-2 text-[10px] font-bold ${selectedDate === day ? "border-[#8B5CF6] bg-[#6255DF] text-white" : "border-[#676D89] bg-[#161624] text-slate-300"}`}>
                      Day {day + 1}<br />{day === 0 ? "Sat, Nov 11" : "Sun, Nov 12"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="ticket-category" className="mb-2 block text-xs font-extrabold text-white">Ticket category</label>
                <select id="ticket-category" value={selectedTicket} onChange={(event) => setSelectedTicket(Number(event.target.value))} className="w-full rounded-lg border border-[#676D89] bg-[#161624] px-3 py-2.5 text-xs text-white outline-none focus:border-[#8B5CF6]">
                  {tickets.map((ticket, index) => <option key={`${ticket.name}-${index}`} value={index}>{ticket.name} - {money(ticket.price)}</option>)}
                </select>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-white">Quantity</p>
                  <p className="mt-0.5 text-[9px] text-slate-500">Maximum 10 tickets per ID</p>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-[#676D89] bg-[#161624] p-1">
                  <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-7 w-7 place-items-center rounded text-white hover:bg-white/10" aria-label="Decrease quantity">−</button>
                  <span className="min-w-4 text-center text-xs font-black text-white">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((value) => Math.min(10, value + 1))} className="grid h-7 w-7 place-items-center rounded text-white hover:bg-white/10" aria-label="Increase quantity">+</button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg border border-[#676D89] bg-[#161624]/70 p-3">
                <span className="text-[10px] font-bold text-slate-400">Estimated total</span>
                <span className="text-sm font-black text-[#B9A7FF]">{money(totalPrice || concert.price)}</span>
              </div>

              <button
                type="button"
                disabled={!tickets.length}
                onClick={() => window.alert("Ticket checkout will be connected to the LYNORA booking flow next.")}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-[#6255DF] to-[#8B5CF6] px-4 py-3 text-xs font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Buy Ticket
              </button>
              <ul className="mt-4 space-y-2 text-[10px] leading-relaxed text-slate-400">
                <li className="flex gap-2"><span className="text-green-400">✓</span>100% official tickets with instant barcode validation</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span>SafePass 256-bit encryption with anti-bot protection</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span>Refund and resale follow LYNORA policy</li>
              </ul>
            </Panel>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-8 w-full min-w-0">
            <SectionHeading>Similar concerts you may like</SectionHeading>
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((item) => (
                <Link key={item.id} href={`/events/${item.id}`} className="group min-w-0 overflow-hidden rounded-xl border border-[#676D89] bg-[#161624] transition hover:-translate-y-1 hover:border-[#22D3EE]">
                  <div className="h-24 overflow-hidden sm:h-32">
                    <img src={posterUrl(item.poster_url)} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs font-extrabold text-white group-hover:text-cyan-300">{item.name}</p>
                    <p className="mt-2 text-[10px] font-bold text-[#B9A7FF]">{money(item.price)}</p>
                    <p className="mt-1 line-clamp-1 text-[10px] text-slate-400">{item.venue_name || "Venue to be announced"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </CustomerShell>
  );
}
