import {
  API_URL,
  demoConcerts,
  type Concert,
} from "./customer";

type ApiArtist = {
  name?: string | null;
  country?: string | null;
};

type ApiEvent = {
  id?: number | string;

  name?: string | null;
  description?: string | null;

  poster_url?: string | null;

  starting_price?: number | string | null;
  price?: number | string | null;

  category_id?: number | string | null;
  category_name?: string | null;
  category?: {
    id?: number | string;
    name?: string | null;
  } | null;

  venue_id?: number | string | null;
  venue_name?: string | null;
  venue_address?: string | null;

  venue?: {
    id?: number | string;
    name?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;

  start_date?: string | null;
  end_date?: string | null;

  status?: string | null;

  artist?: string | null;

  artists?: ApiArtist[] | null;

  organizer_name?: string | null;

  organizer?: {
    name?: string | null;
  } | null;
};

function toNumber(
  value: unknown
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function toIsoDate(
  value?: string | null,
  fallback?: string | null
): string {
  const candidate = value || fallback;

  if (candidate) {
    const parsed = new Date(candidate);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

export function normalizeEvent(
  event: ApiEvent,
  index = 0
): Concert {
  const fallback =
    demoConcerts[index % demoConcerts.length];

  const startDate = toIsoDate(
    event.start_date,
    fallback?.start_date
  );

  const endDate = toIsoDate(
    event.end_date,
    startDate
  );

  const artistNames =
    event.artists
      ?.map((artist) => artist.name)
      .filter(
        (name): name is string =>
          Boolean(name)
      )
      .join(", ");

  const firstArtist = event.artists?.[0];

  return {
    id: Number(event.id) || index + 1,

    name:
      event.name ||
      fallback?.name ||
      "Untitled Concert",

    description:
      event.description ??
      fallback?.description ??
      null,

    poster_url:
      event.poster_url ||
      fallback?.poster_url ||
      null,

    start_date: startDate,

    end_date: endDate,

    status:
      event.status ||
      fallback?.status,

    category_id:
      toNumber(
        event.category_id ??
        event.category?.id
      ) ??
      fallback?.category_id,

    category_name:
      event.category_name ||
      event.category?.name ||
      fallback?.category_name,

    venue_id:
      toNumber(
        event.venue_id ??
        event.venue?.id
      ) ??
      fallback?.venue_id,

    venue_name:
      event.venue_name ||
      event.venue?.name ||
      fallback?.venue_name,

    venue_address:
      event.venue_address ||
      event.venue?.address ||
      event.venue?.city ||
      fallback?.venue_address,

    price:
      toNumber(event.starting_price) ??
      toNumber(event.price) ??
      fallback?.price,

    artist:
      event.artist ||
      artistNames ||
      fallback?.artist,

    artist_country:
      firstArtist?.country ||
      fallback?.artist_country,

    organizer_name:
      event.organizer_name ||
      event.organizer?.name ||
      fallback?.organizer_name,
  };
}

export async function fetchConcerts(): Promise<Concert[]> {
  const controller = new AbortController();

  const timeout = window.setTimeout(
    () => controller.abort(),
    6000
  );

  try {
    const response = await fetch(
      `${API_URL}/events`,
      {
        signal: controller.signal,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Unable to load concerts: ${response.status}`
      );
    }

    const payload = await response.json();

    const events: ApiEvent[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.events)
        ? payload.events
        : [];

    if (events.length === 0) {
      return demoConcerts;
    }

    return events.map((event, index) =>
      normalizeEvent(event, index)
    );
  } catch (error) {
    console.error(
      "LYNORA: Failed to fetch concerts. Using demo data.",
      error
    );

    return demoConcerts;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function matchesQuery(
  concert: Concert,
  query: string
): boolean {
  const term = query.trim().toLowerCase();

  if (!term) return true;

  return [
    concert.name,
    concert.artist,
    concert.artist_country,
    concert.category_name,
    concert.venue_name,
    concert.venue_address,
    concert.organizer_name,
  ]
    .filter(Boolean)
    .some((value) =>
      String(value)
        .toLowerCase()
        .includes(term)
    );
}

export function isInCity(
  concert: Concert,
  city: string
): boolean {
  const target = city.trim().toLowerCase();

  if (!target) return true;

  return `
    ${concert.venue_name || ""}
    ${concert.venue_address || ""}
  `
    .toLowerCase()
    .includes(target);
}
