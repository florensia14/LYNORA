"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TrendingCarousel from "@/components/layout/trending-carousel";

const C = {
  bg: "#0B1020",
  section: "#111A36",
  card: "#202A4F",
  purple: "#8B5CF6",
  cyan: "#22D3EE",
  gray: "#A9AAB4",
  red: "#C30437",
  white: "#FFFFFF",
};

const categories = [
  { name: "POP", image: "pop.jpg", count: "210 EVENTS" },
  { name: "ROCK", image: "rock.jpg", count: "122 EVENTS" },
  { name: "EDM", image: "edm.jpg", count: "98 EVENTS" },
  { name: "HIP-HOP", image: "hiphop.jpg", count: "176 EVENTS" },
  { name: "JAZZ", image: "jazz.jpg", count: "148 EVENTS" },
  { name: "INDIE", image: "indie.jpg", count: "221 EVENTS" },
  { name: "CLASSICAL", image: "classical.jpg", count: "157 EVENTS" },
  { name: "ACOUSTIC", image: "acoustic.jpg", count: "178 EVENTS" },
  { name: "K-POP", image: "kpop.jpg", count: "221 EVENTS" },
  { name: "R&B", image: "r&b.jpg", count: "88 EVENTS" },
  { name: "METAL", image: "metal.jpg", count: "92 EVENTS" },
  { name: "FESTIVAL", image: "festival.jpg", count: "130 EVENTS" },
];


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const BACKEND_URL = API_BASE_URL.replace(/\/api\/?$/, "");

type ConcertArtist = {
  id?: number;
  name: string;
  country?: string | null;
};

type Concert = {
  id: number;
  name: string;
  description?: string | null;
  poster_url?: string | null;
  starting_price?: string | number | null;
  category_name?: string | null;
  venue_name?: string | null;
  organizer_name?: string | null;
  start_date?: string | null;
  artists?: ConcertArtist[];
};

function formatConcertDate(date?: string | null) {
  if (!date) return "Date TBA";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Date TBA";

  return parsedDate.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatConcertPrice(price?: string | number | null) {
  if (price === null || price === undefined || price === "") {
    return "Price TBA";
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return "Price TBA";

  return `Rp${numericPrice.toLocaleString("id-ID")}`;
}

function getConcertPoster(poster?: string | null) {
  if (!poster) return "/images/concerts/default.jpg";
  if (poster.startsWith("http")) return poster;
  return `${BACKEND_URL}${poster.startsWith("/") ? "" : "/"}${poster}`;
}

const features = [
  {
    icon: "/icons/lock.png",
    title: "Secure Tickets",
    text: "Every ticket is encrypted and verified end-to-end, so no scalpers and duplicates ever make it to checkout.",
  },
  {
    icon: "/icons/flash-sale.png",
    title: "Fast Booking",
    text: "Complete your purchase in under a minute from selection to e-ticket delivery, no delays.",
  },
  {
    icon: "/icons/notes.png",
    title: "Transparent",
    text: "See the full price upfront. No surprise fees, no hidden charges added at the final step.",
  },
  {
    icon: "/icons/headphone.png",
    title: "Always Efficient",
    text: "One dashboard for discovering events, booking seats, and tracking every order you've made.",
  },
];

const steps = [
  {
    number: "01",
    title: "Discover",
    text: "Explore concerts and discover your favorite artists.",
  },
  {
    number: "02",
    title: "Select Your Seat",
    text: "Choose your preferred ticket and seat.",
  },
  {
    number: "03",
    title: "Secure Checkout",
    text: "Pay safely and complete your reservation.",
  },
  {
    number: "04",
    title: "Enjoy The Show",
    text: "Get your ticket and enjoy the moment.",
  },
];

const faqs = [
  {
    question: "How do I buy a ticket on Lynora?",
    answer:
      "Choose your favorite concert, select your ticket category, and complete the checkout process.",
  },
  {
    question: "Is my payment information secure?",
    answer:
      "LYNORA provides a secure payment process to protect your transaction information.",
  },
  {
    question: "Can I get a refund if I can't attend?",
    answer:
      "Refund eligibility depends on the refund policy of the event.",
  },
  {
    question: "How will I receive my ticket?",
    answer:
      "Your e-ticket will be available through your LYNORA account after successful payment.",
  },
  {
    question: "Can I transfer my ticket to someone else?",
    answer:
      "Ticket transfer availability depends on the event's ticket policy.",
  },
  {
    question: "What if the concert is cancelled or rescheduled?",
    answer:
      "You will receive information regarding cancellation or rescheduling through the available contact channels.",
  },
  {
    question: "Do you charge additional booking fees?",
    answer:
      "Any applicable booking fees will be displayed before you complete your payment.",
  },
];

const contactDetails = [
  {
    icon: "/icons/mail.png",
    label: "EMAIL",
    value: "lynora@gmail.com",
  },
  {
    icon: "/icons/phone.png",
    label: "PHONE",
    value: "+62 21 1234 5678",
  },
  {
    icon: "/icons/location.png",
    label: "OFFICE",
    value: "Jakarta, Indonesia",
  },
  {
    icon: "/icons/chat.png",
    label: "SOCIAL",
    value: "Lynora.live",
  },
  {
    icon: "/icons/clock.png",
    label: "SUPPORT HOURS",
    value: "Mon - Fri, 09:00 - 18:00 WIB",
  },
];

const FLASH_SALE_DATE = new Date(
  "2026-12-31T23:59:59+07:00"
).getTime();

type SectionHeadingProps = {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
};

function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: 38,
        width: "100%",
      }}
    >
      <span
        style={{
          background: "linear-gradient(90deg, #8B5CF6, #22D3EE)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 1,
        }}
      >
        {eyebrow}
      </span>

      <h2
        style={{
          fontSize: "clamp(26px, 4vw, 36px)",
          fontWeight: 900,
          color: C.white,
          margin: "10px 0",
        }}
      >
        {title}
      </h2>

      {description && (
        <p
          style={{
            color: C.gray,
            fontSize: 15,
            lineHeight: 1.7,
            maxWidth: 650,
            margin: "0 auto",
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [countdown, setCountdown] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  const [featuredConcerts, setFeaturedConcerts] = useState<Concert[]>([]);
  const [concertLoading, setConcertLoading] = useState(true);
  const [concertError, setConcertError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchFeaturedConcerts() {
      try {
        setConcertLoading(true);
        setConcertError("");

        const response = await fetch(`${API_BASE_URL}/events`);
        if (!response.ok) throw new Error("Gagal mengambil data konser.");

        const result = await response.json();
        const eventData = Array.isArray(result)
          ? result
          : result.events || [];

        if (isMounted) setFeaturedConcerts(eventData);
      } catch (error) {
        if (isMounted) {
          setConcertError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat mengambil data konser."
          );
        }
      } finally {
        if (isMounted) setConcertLoading(false);
      }
    }

    fetchFeaturedConcerts();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      const difference = Math.max(
        0,
        FLASH_SALE_DATE - Date.now()
      );

      setCountdown({
        days: String(
          Math.floor(difference / 86400000)
        ).padStart(2, "0"),
        hours: String(
          Math.floor(difference / 3600000) % 24
        ).padStart(2, "0"),
        minutes: String(
          Math.floor(difference / 60000) % 60
        ).padStart(2, "0"),
        seconds: String(
          Math.floor(difference / 1000) % 60
        ).padStart(2, "0"),
      });
    };

    updateCountdown();

    const timer = window.setInterval(
      updateCountdown,
      1000
    );

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="landing-page"
      style={{
        background: C.bg,
        color: C.white,
        minHeight: "100vh",
        overflow: "hidden",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >

      {/* HERO */}
      <section
        id="home"
        style={{
          padding: "75px 7%",
          minHeight: 560,
          display: "flex",
          alignItems: "center",
          scrollMarginTop: 90,
          background: `
            linear-gradient(
              90deg,
              rgba(11,16,32,.65) 0%,
              rgba(11,16,32,.35) 55%,
              rgba(11,16,32,.15) 100%
            ),
            url('/images/hero/taylor hero.jpg') center/cover no-repeat
          `,
        }}
      >
        <div style={{ maxWidth: 650 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 34,
                height: 2,
                background: C.purple,
              }}
            />

            <span style={{ fontSize: 14, fontWeight: 900 }}>
              THE PULSE OF LIVE MUSIC
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(42px, 6vw, 76px)",
              lineHeight: 1.08,
              letterSpacing: 3,
              margin: "0 0 22px",
              fontWeight: 900,
            }}
          >
            Experience
            <br />
            <span
              style={{
                background:
                  "linear-gradient(90deg, #8B5CF6, #22D3EE)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Every Moment
            </span>
          </h1>

          <p
            style={{
              color: "#D1D5E0",
              fontSize: 15,
              lineHeight: 1.6,
              maxWidth: 600,
              letterSpacing: 0.5,
            }}
          >
            Step into the front row of the digital music revolution.
            Discover exclusive concerts, legendary venues,
            and the pure energy of the crowd.
          </p>

          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 28,
            }}
          >
            <a
              href="#events"
              style={{
                background: C.purple,
                color: C.white,
                padding: "14px 18px",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              EXPLORE CONCERTS →
            </a>

            <a
              href="#how-it-works"
              style={{
                border: `1px solid ${C.red}`,
                color: C.white,
                padding: "14px 18px",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              HOW IT WORKS
            </a>
          </div>
        </div>
      </section>

      {/* STATISTICS */}
      <section
        style={{
          padding: "30px 7%",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        {[
          ["1.200+", "Concerts Available"],
          ["850K+", "Tickets Sold"],
          ["320K+", "Customers"],
          ["45+", "Cities Covered"],
        ].map(([number, label]) => (
          <div
            key={label}
            style={{
              background: C.card,
              border: "1px solid rgba(139,92,246,.6)",
              borderRadius: 6,
              padding: 20,
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>
              {number}
            </h2>

            <p style={{ color: C.gray, fontSize: 11 }}>
              {label}
            </p>
          </div>
        ))}
      </section>

      {/* FLASH SALE */}
      <section
        style={{
          background: "#8B5CF6",
          padding: "22px 7%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flex: "1 1 300px",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              minWidth: 72,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #8B5CF6, #22D3EE)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <img
              src="/icons/flash-sale.png"
              alt="Flash Sale"
              style={{
                width: 42,
                height: 42,
                objectFit: "contain",
              }}
            />
          </div>

          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 900,
                margin: "0 0 7px",
              }}
            >
              FLASH SALE COMING SOON
            </h2>

            <p style={{ fontSize: 14, margin: 0 }}>
              Up to 40% OFF on selected concert tickets.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          {[
            countdown.days,
            countdown.hours,
            countdown.minutes,
            countdown.seconds,
          ].map((value, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 52,
                  background: "rgba(76,43,160,.4)",
                  borderRadius: 7,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  fontWeight: 800,
                  boxShadow: "0 3px 8px rgba(0,0,0,.2)",
                }}
              >
                {value}
              </div>

              {index !== 3 && (
                <span style={{ fontSize: 18, fontWeight: 900 }}>
                  :
                </span>
              )}
            </div>
          ))}
        </div>

        <Link
          href="/events"
          style={{
            background: C.white,
            color: C.card,
            padding: "14px 20px",
            borderRadius: 9,
            fontSize: 12,
            fontWeight: 900,
            textDecoration: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 10px rgba(0,0,0,.15)",
          }}
        >
          View Details
        </Link>
      </section>

      {/* WHY CHOOSE LYNORA */}
      <section
        id="features"
        style={{
          padding: "75px 7%",
          scrollMarginTop: 90,
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 38,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 32,
              height: 2,
              background: C.purple,
              verticalAlign: "middle",
              marginRight: 17,
            }}
          />

          <h2
            style={{
              display: "inline",
              fontSize: "clamp(22px, 3vw, 32px)",
              letterSpacing: 3,
              fontWeight: 900,
            }}
          >
            WHY CHOOSE{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg, #8B5CF6, #22D3EE)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              LYNORA
            </span>
          </h2>

          <p
            style={{
              color: C.gray,
              fontSize: 13,
              lineHeight: 1.8,
              maxWidth: 580,
              margin: "15px auto 0",
            }}
          >
            Experience a faster, safer, and more seamless way to
            discover, book, and enjoy live concerts all in one platform.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 24,
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {features.map((feature) => (
            <article
              key={feature.title}
              style={{
                background: "#1B203B",
                border: `1px solid ${C.red}`,
                borderRadius: 6,
                padding: 20,
                minHeight: 175,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: C.purple,
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 12,
                }}
              >
                <img
                  src={feature.icon}
                  alt={feature.title}
                  style={{
                    width: 19,
                    height: 19,
                    objectFit: "contain",
                  }}
                />
              </div>

              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  margin: "0 0 17px",
                }}
              >
                {feature.title}
              </h3>

              <p
                style={{
                  color: C.gray,
                  fontSize: 10,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* BROWSE BY CATEGORY */}
      <section
        style={{
          padding: "75px 7%",
          background: C.section,
        }}
      >
        <SectionHeading
          eyebrow="Browse by Category"
          title="Find Your Sound"
          description="From arena pop to underground beats every genre has a home here."
        />

        <div
          className="category-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
            maxWidth: 1080,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/events?category=${encodeURIComponent(category.name)}`}
              className="category-card"
              style={{
                height: 145,
                minWidth: 0,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                overflow: "hidden",
                borderRadius: 6,
                border: "1px solid rgba(139,92,246,.5)",
                textDecoration: "none",
                color: C.white,
                background: C.card,
              }}
            >
              <img
                src={`/images/categories/${category.image}`}
                alt={category.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  transform: "scale(1.18)",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  padding: "9px 12px",
                  background:
                    "linear-gradient(90deg, rgba(139,92,246,.9), rgba(34,211,238,.8))",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900 }}>
                  {category.name}
                </div>

                <div
                  style={{
                    fontSize: 9,
                    marginTop: 3,
                  }}
                >
                  {category.count}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      {/* FEATURED CONCERTS */}
      <section
        id="events"
        style={{ padding: "75px 7%", scrollMarginTop: 90 }}
      >
        <SectionHeading
          eyebrow="Featured Concerts"
          title="Your Next Front Row Awaits"
          description="Discover published concerts and find your next unforgettable live music experience."
        />

        {concertLoading ? (
          <p style={{ textAlign: "center", color: C.gray }}>
            Loading concerts...
          </p>
        ) : concertError ? (
          <p style={{ textAlign: "center", color: "#FF8585" }}>
            {concertError}
          </p>
        ) : featuredConcerts.length === 0 ? (
          <p style={{ textAlign: "center", color: C.gray }}>
            No published concerts available yet.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
                maxWidth: 1250,
                width: "100%",
                margin: "0 auto",
                alignItems: "stretch",
              }}
            >
              {featuredConcerts.slice(0, 3).map((concert, index) => {
                const artist = concert.artists?.[0];
                const hasPoster = Boolean(concert.poster_url);

                return (
                  <Link
                    key={concert.id}
                    href="/events"
                    aria-label={`View ${concert.name} concert`}
                    style={{
                      display: "block",
                      minWidth: 0,
                      height: "100%",
                      color: "inherit",
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    <article
                      style={{
                        background: C.card,
                        border: "1px solid rgba(139,92,246,.4)",
                        borderRadius: 8,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        minWidth: 0,
                        transition: "transform .2s ease, border-color .2s ease",
                      }}
                    >
                      {/* POSTER — same size and layout as Trending cards */}
                      <div
                        style={{
                          height: 155,
                          position: "relative",
                          overflow: "hidden",
                          flexShrink: 0,
                          background: "#171D38",
                        }}
                      >
                        {hasPoster ? (
                          <img
                            src={getConcertPoster(concert.poster_url)}
                            alt={concert.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "grid",
                              placeItems: "center",
                              color: C.gray,
                              fontSize: 13,
                            }}
                          >
                            No concert poster
                          </div>
                        )}

                        <span
                          style={{
                            position: "absolute",
                            right: 10,
                            bottom: 10,
                            padding: "6px 9px",
                            background: "rgba(11,16,32,.9)",
                            border: `1px solid ${C.purple}`,
                            borderRadius: 5,
                            color: C.white,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {formatConcertPrice(concert.starting_price)}
                        </span>
                      </div>

                      {/* DETAILS — same typography, spacing and info rows as Trending */}
                      <div
                        style={{
                          padding: "13px 14px",
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            color: C.cyan,
                            fontSize: 10,
                            fontWeight: 800,
                            marginBottom: 6,
                          }}
                        >
                          FEATURED #{index + 1}
                        </span>

                        <h3
                          style={{
                            color: C.white,
                            fontSize: 16,
                            fontWeight: 800,
                            margin: "0 0 7px",
                            lineHeight: 1.35,
                          }}
                        >
                          {concert.name}
                        </h3>

                        <p
                          style={{
                            color: C.purple,
                            fontSize: 11,
                            fontWeight: 800,
                            margin: "0 0 8px",
                          }}
                        >
                          {concert.category_name || "Concert"}
                        </p>

                        <p
                          style={{
                            color: C.gray,
                            fontSize: 9,
                            lineHeight: 1.5,
                            margin: "0 0 10px",
                          }}
                        >
                          {concert.description || "Enjoy an unforgettable live concert experience."}
                        </p>

                        <div
                          style={{
                            height: 1,
                            background: "rgba(169,170,180,.3)",
                            marginBottom: 10,
                          }}
                        />

                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#D1D5E0", fontSize: 10, lineHeight: 1.5, marginBottom: 7 }}>
                          <img src="/icons/calendar%20(1).png" alt="" style={{ width: 13, height: 13, minWidth: 13, objectFit: "contain", marginTop: 1 }} />
                          <strong>{formatConcertDate(concert.start_date)}</strong>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#D1D5E0", fontSize: 10, lineHeight: 1.5, marginBottom: 7 }}>
                          <img src="/icons/finish.png" alt="" style={{ width: 13, height: 13, minWidth: 13, objectFit: "contain", marginTop: 1 }} />
                          <span>From: <strong>{artist?.country || "Country not available"}</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#D1D5E0", fontSize: 10, lineHeight: 1.5, marginBottom: 7 }}>
                          <img src="/icons/circus.png" alt="" style={{ width: 13, height: 13, minWidth: 13, objectFit: "contain", marginTop: 1 }} />
                          <span>Organized by: <strong>{concert.organizer_name || "Organizer TBA"}</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#D1D5E0", fontSize: 10, lineHeight: 1.5, marginBottom: 0 }}>
                          <img src="/icons/pin.png" alt="" style={{ width: 13, height: 13, minWidth: 13, objectFit: "contain", marginTop: 1 }} />
                          <strong>{concert.venue_name || "Venue TBA"}</strong>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>

            {/* VIEW ALL CONCERTS */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
              <Link
                href="/events"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "12px 25px",
                  borderRadius: 6,
                  border: `1px solid ${C.purple}`,
                  background: "linear-gradient(90deg, rgba(139,92,246,.16), rgba(34,211,238,.12))",
                  color: C.white,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: ".5px",
                  textDecoration: "none",
                }}
              >
                VIEW ALL CONCERTS <span style={{ color: C.cyan, fontSize: 16 }}>→</span>
              </Link>
            </div>
          </>
        )}
      </section>

      {/* TRENDING NOW */}
      <section
        id="trending"
        className="trending-section"
        style={{
          padding: "38px 7% 65px",
          background: C.bg,
          scrollMarginTop: 84,
        }}
      >
        <div
          style={{
            maxWidth: 1150,
            margin: "0 auto 28px",
          }}
        >
          <span
            style={{
              color: C.purple,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            — TRENDING NOW !!
          </span>

          <h2
            style={{
              fontSize: 23,
              margin: "10px 0",
              letterSpacing: 1,
            }}
          >
            TOP 5 & Everyone's{" "}
            <span style={{ color: C.cyan }}>
              Losing It
            </span>
          </h2>

          <p
            style={{
              color: C.gray,
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            The lineup your whole feed can't shut up about.
            Seats are going fast — don't be the one who missed out.
          </p>
        </div>

        <TrendingCarousel />
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        style={{
          padding: "75px 7%",
          background: C.section,
          scrollMarginTop: 90,
        }}
      >
        <SectionHeading
          eyebrow="SIMPLE & SEAMLESS"
          title="HOW IT WORKS."
          description="From discovering your favorite concert to stepping into the venue."
        />

        <div
          className="how-it-works-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 22,
            maxWidth: 1100,
            margin: "0 auto",
            position: "relative",
          }}
        >
          {/* GARIS PUTUS-PUTUS PENGHUBUNG */}
          <div
            aria-hidden="true"
            className="steps-connector"
            style={{
              position: "absolute",
              top: 32,
              left: "12.5%",
              right: "12.5%",
              height: 1,
              background:
                "repeating-linear-gradient(90deg, #8B5CF6 0 8px, transparent 8px 16px)",
              zIndex: 0,
            }}
          />

          {steps.map((step) => (
            <div
              key={step.number}
              style={{
                textAlign: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 65,
                  height: 65,
                  margin: "0 auto 16px",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  border: `1px solid ${C.purple}`,
                  background: C.section,
                  color: C.cyan,
                  fontSize: 13,
                }}
              >
                {step.number}
              </div>

              <h3 style={{ fontSize: 13 }}>
                {step.title}
              </h3>

              <p
                style={{
                  color: C.gray,
                  fontSize: 10,
                  lineHeight: 1.7,
                }}
              >
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>
           {/* NEED TO KNOW / FAQ */}
<section
  id="faq"
  style={{
    padding: "75px 7%",
    background: C.bg,
    scrollMarginTop: 90,
  }}
>
  <SectionHeading
    eyebrow="NEED TO KNOW"
    title="FREQUENTLY ASKED QUESTIONS"
    description="Everything you need to know before booking your next concert."
  />

  <div
    style={{
      maxWidth: 850,
      margin: "0 auto",
      display: "grid",
      gap: 14,
    }}
  >
    {faqs.map((faq, index) => (
      <details
        key={faq.question}
        style={{
          background: C.card,
          border: "1px solid #E5484D",
          borderRadius: 5,
          overflow: "hidden",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            padding: "19px 22px",
            color: C.white,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: ".3px",
          }}
        >
          <span>
            {faq.question}
          </span>

          <img
            src="/icons/down-arrow.png"
            alt="Toggle FAQ"
            width={17}
            height={17}
            style={{
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        </summary>

        <div
          style={{
            padding: "0 22px 19px",
          }}
        >
          <div
            style={{
              height: 1,
              background: "rgba(229,72,77,.25)",
              marginBottom: 15,
            }}
          />

          <p
            style={{
              color: C.gray,
              fontSize: 12,
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {faq.answer}
          </p>
        </div>
      </details>
    ))}
  </div>
</section>

      {/* CONTACT */}
      <section
        id="contact"
        style={{
          padding: "75px 7%",
          display: "grid",
          gridTemplateColumns: "0.8fr 1.2fr",
          gap: 65,
          background: "linear-gradient(120deg, #111A36, #0B1020)",
          scrollMarginTop: 90,
        }}
      >
        {/* CONTACT INFORMATION */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 15,
            }}
          >
            <span
              style={{
                width: 32,
                height: 2,
                background: C.purple,
              }}
            />

            <span
              style={{
                fontSize: 21,
                fontWeight: 800,
                letterSpacing: 2,
                background:
                  "linear-gradient(90deg, #8B5CF6, #22D3EE)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              GET IN TOUCH
            </span>
          </div>

          <h2
            style={{
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: 2,
              margin: "5px 0",
            }}
          >
            LET'S CONNECT
          </h2>

          <p
            style={{
              color: C.white,
              fontSize: 13,
              lineHeight: 1.5,
              maxWidth: 350,
              marginBottom: 22,
            }}
          >
            Have a question or need help with your ticket?
            We're here to help you experience every moment.
          </p>

          {contactDetails.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 15,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  background: C.purple,
                  borderRadius: 4,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  style={{
                    width: 24,
                    height: 24,
                    objectFit: "contain",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    color: "#858BA4",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  {item.label}
                </div>

                <div
                  style={{
                    color: C.white,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CONTACT FORM */}
        <form
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            columnGap: 28,
            rowGap: 23,
            alignContent: "start",
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 8,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            NAME

            <input
              type="text"
              placeholder="Your name"
              style={contactInputStyle}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 8,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            EMAIL

            <input
              type="email"
              placeholder="Your email"
              style={contactInputStyle}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 8,
              gridColumn: "1 / -1",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            SUBJECT

            <input
              type="text"
              placeholder="What can we help with ??"
              style={contactInputStyle}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 8,
              gridColumn: "1 / -1",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            MESSAGE

            <textarea
              rows={7}
              placeholder="Write your message..."
              style={{
                ...contactInputStyle,
                minHeight: 200,
                padding: 12,
                resize: "vertical",
              }}
            />
          </label>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              style={{
                padding: "13px 21px",
                background: C.purple,
                color: C.white,
                border: "none",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              SEND MESSAGE
            </button>
          </div>
        </form>
      </section>

      <style jsx global>{`
        html { scroll-behavior: smooth; scroll-padding-top: 84px; }
        #home, #events, #features, #how-it-works, #faq, #contact, #trending {
          scroll-margin-top: 84px !important;
        }
        #events { padding-top: 48px !important; padding-bottom: 28px !important; }
        #events + #trending { padding-top: 28px !important; }
        .landing-page { width: 100%; overflow-x: clip; }
        @media (max-width: 900px) {
          .landing-page section { padding-left: 5% !important; padding-right: 5% !important; }
          .landing-page .category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .landing-page #events > div[style*="grid-template-columns"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .landing-page .how-it-works-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; row-gap: 30px !important; }
          .landing-page #contact { grid-template-columns: 1fr !important; gap: 35px !important; }
        }
        @media (max-width: 600px) {
          .landing-page section { padding-top: 48px !important; padding-bottom: 48px !important; }
          .landing-page .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }
          .landing-page #events > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; max-width: 430px !important; }
          .landing-page #events article { min-height: 0; }
          .landing-page .how-it-works-grid { grid-template-columns: 1fr 1fr !important; }
          .landing-page .steps-connector { display: none !important; }
          .landing-page #contact form { grid-template-columns: 1fr !important; }
          .landing-page #contact form label { grid-column: 1 / -1 !important; }
          .landing-page #faq summary { padding: 15px !important; }
          .landing-page #home { min-height: 520px !important; padding-top: 55px !important; padding-bottom: 55px !important; }
        }
      `}</style>
    </div>
  );
}

const contactInputStyle = {
  width: "100%",
  height: 54,
  padding: "0 12px",
  background: "#0B1020",
  border: "1px solid #C30437",
  borderRadius: 4,
  color: "#FFFFFF",
  outline: "none",
  fontSize: 11,
};

const concertInfoStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  color: "#D1D5E0",
  fontSize: 10,
  lineHeight: 1.5,
  marginBottom: 0,
};

const concertInfoIconStyle = {
  width: 13,
  height: 13,
  minWidth: 13,
  objectFit: "contain",
  marginTop: 2,
};