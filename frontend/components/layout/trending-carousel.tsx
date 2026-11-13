"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const BACKEND_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const MAX_TRENDING = 5; // section title says "TOP 5"

const C = {
  card: "#202A4F",
  purple: "#7E54DF",
  cyan: "#22D3EE",
  gray: "#A9AAB4",
  white: "#FFFFFF",
};

type Concert = {
  id: number;
  name: string;
  description?: string;
  poster_url?: string | null;
  start_date?: string;
  category_name?: string;
  venue_name?: string;
  venue_address?: string;
  organizer_name?: string;
  artists?: {
    id?: number;
    name?: string;
    country?: string;
  }[];
  starting_price?: string | number | null;
};

const infoStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 9,
  color: "#D1D5E0",
  fontSize: 10,
  lineHeight: 1.5,
  marginBottom: 8,
};

const infoIconStyle: CSSProperties = {
  width: 13,
  height: 13,
  minWidth: 13,
  objectFit: "contain",
  marginTop: 1,
};

const messageStyle: CSSProperties = {
  maxWidth: 1250,
  margin: "0 auto",
  padding: "35px 48px",
  textAlign: "center",
};

function formatDate(date?: string) {
  if (!date) return "Date not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })
    .format(parsedDate)
    .replace(",", " ·");
}

function formatPrice(price?: string | number | null) {
  if (price === null || price === undefined || price === "") {
    return "Price unavailable";
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return "Price unavailable";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numericPrice);
}

function getPoster(poster?: string | null) {
  if (!poster) return null;

  if (poster.startsWith("http")) return poster;

  return `${BACKEND_URL}${poster.startsWith("/") ? "" : "/"}${poster}`;
}

function getArtistCountry(event: Concert) {
  const countries = event.artists
    ?.map((artist) => artist.country)
    .filter(Boolean);

  return countries?.length
    ? [...new Set(countries)].join(", ")
    : "Country not available";
}

function getVenue(event: Concert) {
  const name = event.venue_name || "";
  const address = event.venue_address || "";

  return [name, address].filter(Boolean).join(", ") || "Venue not available";
}

// 3 cards on desktop, 2 on tablet, 1 on mobile
function useVisibleCount() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      setCount(width <= 600 ? 1 : width <= 900 ? 2 : 3);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}

export default function TrendingCarousel() {
  const [events, setEvents] = useState<Concert[]>([]);
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const visibleCount = useVisibleCount();

  useEffect(() => {
    const controller = new AbortController();

    async function fetchTrendingEvents() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/events`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load concert data.");
        }

        const result = await response.json();

        const eventData: Concert[] = Array.isArray(result)
          ? result
          : result.events || [];

        setEvents(eventData.slice(0, MAX_TRENDING));
        setPosition(0);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchTrendingEvents();

    return () => controller.abort();
  }, []);

  const maxPosition = Math.max(events.length - visibleCount, 0);
  const currentPosition = Math.min(position, maxPosition); // keeps it valid after resize
  const visibleCards = events.slice(
    currentPosition,
    currentPosition + visibleCount
  );

  const handleNext = () =>
    setPosition(Math.min(currentPosition + 1, maxPosition));
  const handlePrevious = () => setPosition(Math.max(currentPosition - 1, 0));

  if (loading) {
    return (
      <div style={{ ...messageStyle, color: C.gray }}>
        Loading trending concerts...
      </div>
    );
  }

  if (error) {
    return <div style={{ ...messageStyle, color: "#FF8585" }}>{error}</div>;
  }

  if (events.length === 0) {
    return (
      <div style={{ ...messageStyle, color: C.gray }}>
        No published concerts available yet.
      </div>
    );
  }

  const arrowStyle = (disabled: boolean): CSSProperties => ({
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 42,
    height: 42,
    border: "none",
    borderRadius: "50%",
    background: C.purple,
    display: "grid",
    placeItems: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    zIndex: 5,
  });

  const atStart = currentPosition === 0;
  const atEnd = currentPosition >= maxPosition;

  return (
    <div
      style={{
        position: "relative",
        maxWidth: 1250,
        margin: "0 auto",
        padding: "0 48px",
      }}
    >
      <button
        type="button"
        aria-label="Previous concerts"
        onClick={handlePrevious}
        disabled={atStart}
        style={{ ...arrowStyle(atStart), left: 0 }}
      >
        <img
          src="/icons/leftt.png"
          alt=""
          style={{ width: 22, height: 22, objectFit: "contain" }}
        />
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))`,
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {visibleCards.map((item, index) => {
          const poster = getPoster(item.poster_url);

          return (
            <Link
              key={item.id}
              href="/events"
              aria-label={`View ${item.name} concert`}
              style={{
                display: "block",
                minWidth: 0,
                color: "inherit",
                textDecoration: "none",
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
                }}
              >
                {/* POSTER */}
                <div
                  style={{
                    height: 155,
                    position: "relative",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#171D38",
                  }}
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt={item.name}
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
                        fontSize: 12,
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
                    {formatPrice(item.starting_price)}
                  </span>
                </div>

                {/* CONTENT */}
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
                    TRENDING #{currentPosition + index + 1}
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
                    {item.name}
                  </h3>

                  <p
                    style={{
                      color: C.purple,
                      fontSize: 11,
                      fontWeight: 800,
                      margin: "0 0 8px",
                    }}
                  >
                    {item.category_name || "Live Concert"}
                  </p>

                  <p
                    style={{
                      color: C.gray,
                      fontSize: 9,
                      lineHeight: 1.5,
                      margin: "0 0 10px",
                    }}
                  >
                    {item.description ||
                      "Enjoy an unforgettable live concert experience."}
                  </p>

                  <div
                    style={{
                      height: 1,
                      background: "rgba(169,170,180,.3)",
                      marginBottom: 10,
                    }}
                  />

                  <div style={infoStyle}>
                    <img
                      src="/icons/calendar%20(1).png"
                      alt=""
                      style={infoIconStyle}
                    />
                    <strong>{formatDate(item.start_date)}</strong>
                  </div>

                  <div style={infoStyle}>
                    <img src="/icons/finish.png" alt="" style={infoIconStyle} />
                    <span>
                      From: <strong>{getArtistCountry(item)}</strong>
                    </span>
                  </div>

                  <div style={infoStyle}>
                    <img src="/icons/circus.png" alt="" style={infoIconStyle} />
                    <span>
                      Organized by:{" "}
                      <strong>
                        {item.organizer_name || "Organizer not available"}
                      </strong>
                    </span>
                  </div>

                  <div style={{ ...infoStyle, marginBottom: 0 }}>
                    <img src="/icons/pin.png" alt="" style={infoIconStyle} />
                    <strong>{getVenue(item)}</strong>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Next concerts"
        onClick={handleNext}
        disabled={atEnd}
        style={{ ...arrowStyle(atEnd), right: 0 }}
      >
        <img
          src="/icons/right.png"
          alt=""
          style={{ width: 22, height: 22, objectFit: "contain" }}
        />
      </button>
    </div>
  );
}