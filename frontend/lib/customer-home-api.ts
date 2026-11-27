import type { Concert } from "@/lib/customer";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export type ApiArtist = {
  id?: number;
  name: string;
  country?: string | null;
  photo?: string | null;
};

export type CustomerHomeConcert = Concert & {
  latitude?: number | null;
  longitude?: number | null;
};

type ApiEvent = {
  id: number | string;
  name: string;
  description?: string | null;
  poster_url?: string | null;
  start_date: string;
  end_date?: string | null;

  status?: string;

  approval_status?: Concert["approval_status"];
  publication_status?: Concert["publication_status"];

  sales_start_at?: string | null;
  sales_end_at?: string | null;
  sales_status?: Concert["sales_status"];
  lifecycle_status?: Concert["lifecycle_status"];

  total_quota?: number | string;
  total_sold?: number | string;
  remaining_tickets?: number | string;

  category_id?: number;
  category_name?: string;

  venue_id?: number;
  venue_name?: string;
  venue_address?: string;

  latitude?: number | null;
  longitude?: number | null;

  starting_price?: number | string | null;
  price?: number | string | null;

  artist?: string | null;
  artist_country?: string | null;
  artists?: ApiArtist[];

  organizer_id?: number;
  organizer_name?: string | null;
};

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function unwrapEvents(payload: unknown): ApiEvent[] {
  if (Array.isArray(payload)) {
    return payload as ApiEvent[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = payload as {
    events?: unknown;
    data?: unknown;
    results?: unknown;
  };

  if (Array.isArray(data.events)) {
    return data.events as ApiEvent[];
  }

  if (Array.isArray(data.data)) {
    return data.data as ApiEvent[];
  }

  if (data.data && typeof data.data === "object") {
    const nested = data.data as {
      events?: unknown;
      results?: unknown;
    };

    if (Array.isArray(nested.events)) {
      return nested.events as ApiEvent[];
    }

    if (Array.isArray(nested.results)) {
      return nested.results as ApiEvent[];
    }
  }

  if (Array.isArray(data.results)) {
    return data.results as ApiEvent[];
  }

  return [];
}

function normalizeEvent(event: ApiEvent): CustomerHomeConcert {
  const artists = Array.isArray(event.artists) ? event.artists : [];

  const firstArtist = artists.find((artist) => artist?.name);

  return {
    id: Number(event.id),
    name: event.name,
    description: event.description ?? null,
    poster_url: event.poster_url ?? null,

    start_date: event.start_date,
    end_date: event.end_date ?? event.start_date,

    status: event.status,
    approval_status: event.approval_status,
    publication_status: event.publication_status,

    sales_start_at: event.sales_start_at ?? null,
    sales_end_at: event.sales_end_at ?? null,
    sales_status: event.sales_status,
    lifecycle_status: event.lifecycle_status,

    total_quota: toNumber(event.total_quota),
    total_sold: toNumber(event.total_sold),
    remaining_tickets: toNumber(event.remaining_tickets),

    category_id: event.category_id,
    category_name: event.category_name,

    venue_id: event.venue_id,
    venue_name: event.venue_name,
    venue_address: event.venue_address,

    latitude: event.latitude,
    longitude: event.longitude,

    price: toNumber(event.starting_price ?? event.price),

    artist: event.artist ?? firstArtist?.name ?? undefined,
    artist_country:
      event.artist_country ?? firstArtist?.country ?? undefined,

    artists,

    organizer_id: event.organizer_id,
    organizer_name: event.organizer_name ?? undefined,
  };
}

export async function fetchCustomerHomeConcerts(): Promise<
  CustomerHomeConcert[]
> {
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload
        ? String((payload as { message: unknown }).message)
        : `Gagal mengambil konser (HTTP ${response.status})`;

    throw new Error(message);
  }

  return unwrapEvents(payload)
    .filter(
      (event) =>
        event &&
        event.id !== null &&
        event.id !== undefined &&
        typeof event.name === "string" &&
        event.name.trim().length > 0,
    )
    .map(normalizeEvent)
    .filter((event) => Number.isFinite(event.id));
}

export function matchesCustomerHomeQuery(
  concert: Concert,
  query: string,
): boolean {
  const keyword = query.trim().toLowerCase();

  if (!keyword) return true;

  return [
    concert.name,
    concert.artist,
    concert.category_name,
    concert.venue_name,
    concert.venue_address,
    concert.organizer_name,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
}