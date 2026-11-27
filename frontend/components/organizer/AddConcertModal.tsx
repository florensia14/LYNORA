
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import dynamic from "next/dynamic";

import {
  CalendarDays,
  MapPin,
  Ticket,
  Star,
  ClipboardCheck,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  ImagePlus,
  CheckCircle2,
  Info,
  Search,
  Loader2,
  MapPinned,
} from "lucide-react";

import type {
  Position,
  MapVenue,
} from "./VenueMap";

const VenueMap = dynamic(
  () => import("./VenueMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-white/10 bg-[#151630] text-xs text-slate-400">
        Loading map...
      </div>
    ),
  }
);

type ConcertCategory = {
  id: number;
  name: string;
};

type TicketCategory = {
  name: string;
  price: string;
  quota: string;
  benefit: string;
  color: string;
};

type FormState = {
  name: string;
  artist_name: string;
  artist_country: string;
  description: string;
  category_id: string;
  venue_id: string;
  start_date: string;
  end_date: string;
  sales_start_at: string;
  sales_end_at: string;
  start_time: string;
  end_time: string;
};

type Props = {
  onClose: () => void;
  onCreated?: () => void;
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const STEPS = [
  "Concert Information",
  "Venue & Schedule",
  "Tickets & Pricing",
  "Benefits & Facilities",
  "Review & Submit",
];

const COLORS = [
  "#F5B942",
  "#C30437",
  "#8B5CF6",
  "#26ADA0",
  "#22D3EE",
];

const BENEFITS = [
  "Priority Entry",
  "Exclusive Merchandise",
  "Photo Session",
  "Meet & Greet",
  "VIP Lounge Access",
  "Better Seat View",
  "Special Gift",
  "Early Entry",
];

const EMPTY_FORM: FormState = {
  name: "",
  artist_name: "",
  artist_country: "",
  description: "",
  category_id: "",
  venue_id: "",
  start_date: "",
  end_date: "",
  sales_start_at: "",
  sales_end_at: "",
  start_time: "",
  end_time: "",
};

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

function formatPriceInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

function parsePriceInput(value: string) {
  return value.replace(/\D/g, "");
}

function money(value: string | number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function toSqlDateTime(value: string) {
  if (!value) return "";

  return value.replace("T", " ") +
    (value.length === 16 ? ":00" : "");
}

function combineDateTime(date: string, time: string) {
  return `${date} ${time}:00`;
}

export default function AddConcertModal({
  onClose,
  onCreated,
}: Props) {
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [poster, setPoster] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState("");

  const [categories, setCategories] = useState<ConcertCategory[]>([]);
  const [venues, setVenues] = useState<MapVenue[]>([]);

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);

  const [ticketPopup, setTicketPopup] = useState(false);

  const [ticketForm, setTicketForm] = useState<TicketCategory>({
    name: "",
    price: "",
    quota: "",
    benefit: "",
    color: COLORS[0],
  });

  const [benefits, setBenefits] = useState<string[]>([]);

  const [facilities, setFacilities] = useState<string[]>([
    "Parking Area",
    "Food Court",
    "Restroom",
  ]);

  const [facilityInput, setFacilityInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createdEventId, setCreatedEventId] = useState<number | null>(null);

  // Venue search
  const [venueQuery, setVenueQuery] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [geoResults, setGeoResults] = useState<any[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const [mapPoint, setMapPoint] = useState<Position | null>(null);

  const [externalLocation, setExternalLocation] = useState(false);

  const [selectedVenue, setSelectedVenue] = useState<MapVenue | null>(null);

  const totalQuota = useMemo(
    () =>
      ticketCategories.reduce(
        (sum, item) => sum + Number(item.quota || 0),
        0
      ),
    [ticketCategories]
  );

  const estimatedRevenue = useMemo(
    () =>
      ticketCategories.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) *
          Number(item.quota || 0),
        0
      ),
    [ticketCategories]
  );

  const filteredVenues = useMemo(() => {
    const query = venueQuery.toLowerCase().trim();

    if (!query) return venues.slice(0, 5);

    return venues
      .filter((venue) =>
        `${venue.name} ${venue.address}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 6);
  }, [venues, venueQuery]);

  const update = (
    key: keyof FormState,
    value: string
  ) => {
    setForm((old) => ({
      ...old,
      [key]: value,
    }));
  };

  // Load categories and registered venues
  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setCategoriesLoading(true);
      setOptionsError("");

      try {
        const token = getToken();

        const response = await fetch(
          `${API_BASE}/events/organizer/create-options`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Gagal mengambil data kategori dan venue."
          );
        }

        if (!active) return;

        setCategories(result.categories || []);
        setVenues(result.venues || []);
      } catch (err) {
        if (!active) return;

        setOptionsError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil pilihan konser."
        );
      } finally {
        if (active) setCategoriesLoading(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  // Search OpenStreetMap automatically while typing.
  // Nominatim requests are debounced to avoid excessive requests.
  useEffect(() => {
    const query = venueQuery.trim();

    if (query.length < 3) {
      setGeoResults([]);
      setGeoLoading(false);
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      setGeoLoading(true);

      try {
        const url =
          "https://nominatim.openstreetmap.org/search?" +
          new URLSearchParams({
            format: "jsonv2",
            addressdetails: "1",
            namedetails: "1",
            limit: "7",
            countrycodes: "id",
            q: query,
          });

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Location search failed");
        }

        const result = await response.json();

        setGeoResults(result);
      } catch (err) {
        if (
          err instanceof Error &&
          err.name !== "AbortError"
        ) {
          setGeoResults([]);
        }
      } finally {
        setGeoLoading(false);
      }
    }, 900);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [venueQuery]);

  function selectVenue(venue: MapVenue) {
    setSelectedVenue(venue);

    update("venue_id", String(venue.id));

    setVenueQuery(venue.name);
    setVenueAddress(venue.address || venue.name);
    setShowSuggestions(false);

    setExternalLocation(false);
    setGeoResults([]);

    if (
      venue.latitude != null &&
      venue.longitude != null
    ) {
      setMapPoint({
        lat: Number(venue.latitude),
        lon: Number(venue.longitude),
      });
    } else {
      setMapPoint(null);
    }

    setError("");
  }

  function selectExternalLocation(place: any) {
    const point = {
      lat: Number(place.lat),
      lon: Number(place.lon),
    };

    const resolvedName =
      place.name ||
      place.namedetails?.name ||
      String(place.display_name || "").split(",")[0] ||
      venueQuery.trim();

    setMapPoint(point);
    setSelectedVenue(null);

    update("venue_id", "");

    setVenueQuery(resolvedName);
    setVenueAddress(place.display_name || resolvedName);

    setShowSuggestions(false);
    setExternalLocation(true);

    setError("");
  }

  // Match a manually selected map point to a registered venue.
  async function handleMapPick(position: Position) {
    setMapPoint(position);
    setExternalLocation(true);
    setSelectedVenue(null);
    update("venue_id", "");

    try {
      const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
      reverseUrl.search = new URLSearchParams({
        format: "jsonv2",
        lat: String(position.lat),
        lon: String(position.lon),
        addressdetails: "1",
        zoom: "18",
      }).toString();
      const reverseResponse = await fetch(reverseUrl.toString(), { headers: { Accept: "application/json" } });
      if (reverseResponse.ok) {
        const reverseResult = await reverseResponse.json();
        if (reverseResult.display_name) setVenueAddress(reverseResult.display_name);
      }
    } catch (error) {
      console.warn("Reverse geocoding failed:", error);
    }

    setError("");
  }

  function addTicketCategory() {
    if (
      !ticketForm.name.trim() ||
      ticketForm.price === "" ||
      ticketForm.quota === ""
    ) {
      setError("Lengkapi nama, harga, dan kuota tiket.");
      return;
    }

    if (
      Number(ticketForm.price) < 0 ||
      !Number.isFinite(Number(ticketForm.price)) ||
      !Number.isInteger(Number(ticketForm.quota)) ||
      Number(ticketForm.quota) <= 0
    ) {
      setError("Harga atau kuota tiket tidak valid.");
      return;
    }

    setTicketCategories((old) => [
      ...old,
      { ...ticketForm },
    ]);

    setTicketForm({
      name: "",
      price: "",
      quota: "",
      benefit: "",
      color: COLORS[0],
    });

    setTicketPopup(false);
    setError("");
  }

  function removeTicketCategory(index: number) {
    setTicketCategories((old) =>
      old.filter((_, i) => i !== index)
    );
  }

  function validateStep() {
    if (step === 0) {
      if (
        !form.name.trim() ||
        !form.artist_name.trim() ||
        !form.description.trim() ||
        !form.category_id
      ) {
        return "Lengkapi judul konser, artist, deskripsi, dan kategori.";
      }

      if (!poster) {
        return "Poster konser wajib diunggah.";
      }
    }

    if (step === 1) {
      if (!venueQuery.trim()) {
        return "Masukkan nama venue atau lokasi konser.";
      }
      if (!mapPoint) {
        return "Pilih lokasi venue dari hasil pencarian atau klik titik pada peta.";
      }

      if (
        !form.start_date ||
        !form.end_date ||
        !form.start_time ||
        !form.end_time
      ) {
        return "Lengkapi tanggal dan waktu konser.";
      }

      const start = new Date(
        `${form.start_date}T${form.start_time}`
      );

      const end = new Date(
        `${form.end_date}T${form.end_time}`
      );

      if (end <= start) {
        return "Waktu selesai harus setelah waktu mulai.";
      }

      if (!form.sales_start_at || !form.sales_end_at) {
        return "Lengkapi periode penjualan tiket.";
      }

      if (
        new Date(form.sales_end_at) <=
        new Date(form.sales_start_at)
      ) {
        return "Akhir penjualan tiket harus setelah awal penjualan.";
      }
    }

    if (step === 2) {
      if (!ticketCategories.length) {
        return "Tambahkan minimal satu kategori tiket.";
      }
    }

    return "";
  }

  function next() {
    const message = validateStep();

    if (message) {
      setError(message);
      return;
    }

    setError("");
    setStep((old) => Math.min(old + 1, 4));
  }

  function addFacility() {
    const value = facilityInput.trim();

    if (!value) return;

    if (
      facilities.some(
        (item) => item.toLowerCase() === value.toLowerCase()
      )
    ) {
      setFacilityInput("");
      return;
    }

    setFacilities((old) => [...old, value]);
    setFacilityInput("");
  }

  async function submitConcert() {
    if (createdEventId) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
      }

      const body = new FormData();

      body.append("name", form.name.trim());
      body.append("description", form.description.trim());
      body.append("category_id", form.category_id);
      body.append("venue_id", form.venue_id || "");
      body.append("venue_name", venueQuery.trim());
      body.append("venue_address", venueAddress.trim() || venueQuery.trim());
      body.append("latitude", String(mapPoint?.lat ?? ""));
      body.append("longitude", String(mapPoint?.lon ?? ""));
      body.append("artist_name", form.artist_name.trim());
      body.append("artist_country", form.artist_country.trim());

      body.append(
        "start_date",
        combineDateTime(form.start_date, form.start_time)
      );

      body.append(
        "end_date",
        combineDateTime(form.end_date, form.end_time)
      );

      body.append(
        "sales_start_at",
        toSqlDateTime(form.sales_start_at)
      );

      body.append(
        "sales_end_at",
        toSqlDateTime(form.sales_end_at)
      );

      if (poster) {
        body.append("poster", poster);
      }

      const response = await fetch(
        `${API_BASE}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body,
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal membuat konser."
        );
      }

      const eventId = result.event?.id;

      if (!eventId) {
        throw new Error(
          "Konser berhasil dibuat, tetapi ID event tidak ditemukan."
        );
      }

      // Prevent duplicate event creation if ticket saving partially fails.
      setCreatedEventId(Number(eventId));

      const failedTickets: string[] = [];

      for (const category of ticketCategories) {
        try {
          const ticketResponse = await fetch(
            `${API_BASE}/events/${eventId}/tickets`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                name: category.name.trim(),
                price: Number(category.price),
                quota: Number(category.quota),
                benefit: category.benefit.trim(),
              }),
            }
          );

          const ticketResult = await ticketResponse
            .json()
            .catch(() => ({}));

          if (!ticketResponse.ok) {
            failedTickets.push(
              `${category.name}: ${
                ticketResult.message || "Gagal disimpan"
              }`
            );
          }
        } catch {
          failedTickets.push(
            `${category.name}: Gagal terhubung ke server`
          );
        }
      }

      onCreated?.();

      if (failedTickets.length) {
        setSuccess(
          `Konser #${eventId} berhasil dibuat. Beberapa kategori tiket gagal disimpan: ${failedTickets.join("; ")}. Silakan tambahkan melalui Manage Tickets.`
        );
        return;
      }

      setSuccess(
        "Konser dan seluruh kategori tiket berhasil disimpan. Menunggu persetujuan Super Admin."
      );

      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat membuat konser."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full min-w-0 rounded-lg border border-[#34345B] bg-[#0D1028] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20";

  const labelClass =
    "mb-1.5 block text-xs font-semibold text-slate-300";

  const panelClass =
    "rounded-xl border border-white/10 bg-[#151630] p-3";

  const descriptions = [
    "Enter the basic information about the concert.",
    "Choose a registered venue and set the concert schedule.",
    "Create ticket categories, prices, and quotas.",
    "Select benefits and facilities for attendees.",
    "Review your concert information before submitting.",
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 text-white backdrop-blur-sm sm:p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-concert-title"
          className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#6D4CCB]/60 bg-[#0B0B24] shadow-2xl"
        >
          {/* HEADER */}
          <header className="relative flex shrink-0 items-center gap-3 bg-gradient-to-r from-[#24104E] via-[#6B28B8] to-[#17113F] px-4 py-3 sm:px-6">
            <div className="rounded-xl bg-[#A78BFA] p-2.5">
              <CalendarDays size={22} />
            </div>

            <div className="min-w-0">
              <h1
                id="add-concert-title"
                className="text-lg font-bold sm:text-xl"
              >
                Add New Concert
              </h1>
              <p className="text-[11px] text-purple-100/80">
                Create a new concert event and manage the details.
              </p>
            </div>

            <button
              onClick={onClose}
              className="ml-auto rounded-lg p-2 hover:bg-white/10"
              aria-label="Close modal"
            >
              <X size={23} />
            </button>
          </header>

          {/* MAIN */}
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[180px_minmax(0,1fr)]">

            {/* SIDEBAR */}
            <aside className="hidden min-h-0 flex-col border-r border-white/10 bg-[#0D1028] p-3 lg:flex">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#5456DE] p-2">
                  <CalendarDays size={18} />
                </span>

                <div>
                  <p className="text-xs font-bold">New Concert</p>
                  <p className="text-[10px] text-slate-500">
                    5-step creation
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                {STEPS.map((title, index) => (
                  <button
                    key={title}
                    onClick={() => {
                      if (index < step) {
                        setStep(index);
                        setError("");
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left ${
                      step === index
                        ? "bg-[#29214F]"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        index < step
                          ? "border-[#22D3EE] bg-[#22D3EE] text-[#0B1122]"
                          : step === index
                            ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
                            : "border-slate-600 text-slate-400"
                      }`}
                    >
                      {index < step ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <span className="text-[10px] font-medium text-slate-300">
                      {title}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-auto rounded-lg border border-[#8B5CF6]/20 bg-[#171333] p-2.5 text-[10px] leading-relaxed text-slate-400">
                <Info
                  size={14}
                  className="mb-1 text-[#A78BFA]"
                />
                Concerts are submitted as pending and require Super Admin approval.
              </div>
            </aside>

            {/* CONTENT */}
            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0D0D27]">

              {/* STEP HEADER */}
              <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5">
                <div>
                  <h2 className="text-base font-bold sm:text-lg">
                    {STEPS[step]}
                  </h2>
                  <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">
                    {descriptions[step]}
                  </p>
                </div>

                <span className="text-xs tabular-nums text-slate-500">
                  {step + 1} / 5
                </span>
              </div>

              {/* SCROLLABLE CONTENT */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">

                {/* STEP 1 */}
                {step === 0 && (
                  <div className="grid gap-4 md:grid-cols-[1fr_190px]">
                    <div className="space-y-3.5">
                      <div>
                        <label className={labelClass}>
                          Concert Title *
                        </label>
                        <input
                          className={inputClass}
                          placeholder="e.g. POP HARMONY 2027"
                          value={form.name}
                          onChange={(e) => update("name", e.target.value)}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>
                            Artist / Performance *
                          </label>
                          <input
                            className={inputClass}
                            placeholder="e.g. Sheila On 7"
                            value={form.artist_name}
                            onChange={(e) =>
                              update("artist_name", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Artist Country
                          </label>
                          <input
                            className={inputClass}
                            placeholder="e.g. Indonesia"
                            value={form.artist_country}
                            onChange={(e) =>
                              update("artist_country", e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>
                          Concert Category *
                        </label>

                        <select
                          className={`${inputClass} [color-scheme:dark]`}
                          value={form.category_id}
                          disabled={categoriesLoading}
                          onChange={(e) =>
                            update("category_id", e.target.value)
                          }
                        >
                          <option value="">
                            {categoriesLoading
                              ? "Loading categories..."
                              : "Select concert category"}
                          </option>

                          {categories.map((category) => (
                            <option
                              key={category.id}
                              value={category.id}
                            >
                              {category.name}
                            </option>
                          ))}
                        </select>

                        {optionsError && (
                          <p className="mt-1 text-[10px] text-rose-400">
                            {optionsError}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>
                          Concert Description *
                        </label>
                        <textarea
                          className={`${inputClass} min-h-[90px] resize-y`}
                          placeholder="Tell us about the concert and its highlights..."
                          value={form.description}
                          onChange={(e) =>
                            update("description", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {/* POSTER */}
                    <div>
                      <label className={labelClass}>
                        Concert Poster *
                      </label>

                      <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#555080] bg-[#15132F] p-3 text-center hover:border-[#A78BFA]">
                        {posterPreview ? (
                          <img
                            src={posterPreview}
                            alt="Concert poster preview"
                            className="h-[220px] w-full rounded-lg object-cover"
                          />
                        ) : (
                          <>
                            <ImagePlus
                              size={30}
                              className="mb-3 text-[#A78BFA]"
                            />
                            <span className="text-xs font-semibold">
                              Click to upload
                            </span>
                            <span className="mt-1 text-[10px] text-slate-500">
                              PNG, JPG, WEBP · Max 5 MB
                            </span>
                          </>
                        )}

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];

                            if (!file) return;

                            if (file.size > 5 * 1024 * 1024) {
                              setError("Ukuran poster maksimal 5 MB.");
                              return;
                            }

                            setPoster(file);
                            setPosterPreview(
                              URL.createObjectURL(file)
                            );
                            setError("");
                          }}
                        />
                      </label>

                      {poster && (
                        <p className="mt-2 truncate text-[10px] text-emerald-300">
                          {poster.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 1 && (
                  <div className="grid gap-5 md:grid-cols-2">

                    {/* VENUE INPUT */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <MapPin size={17} className="text-[#A78BFA]" />
                        Venue Information
                      </div>

                      <div className="relative">
                        <label className={labelClass}>
                          Venue Name *
                        </label>

                        <div className="relative">
                          <input
                            className={`${inputClass} pr-10`}
                            placeholder="Type venue name, e.g. GBK, JIS, ICE BSD..."
                            value={venueQuery}
                            onFocus={() => setShowSuggestions(true)}
                            onChange={(e) => {
                              setVenueQuery(e.target.value);
                              setShowSuggestions(true);
                              setSelectedVenue(null);
                              update("venue_id", "");
                              setExternalLocation(false);
                              setMapPoint(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setShowSuggestions(false);
                              }
                            }}
                          />

                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {geoLoading ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Search size={16} />
                            )}
                          </span>
                        </div>

                        {showSuggestions && (
                          <div className="absolute left-0 right-0 top-full z-[500] mt-1 max-h-56 overflow-y-auto rounded-lg border border-[#34345B] bg-[#11132D] shadow-2xl">

                            {filteredVenues.length > 0 && (
                              <>
                                <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                                  Registered Venues
                                </p>

                                {filteredVenues.map((venue) => (
                                  <button
                                    type="button"
                                    key={venue.id}
                                    onClick={() => selectVenue(venue)}
                                    className="flex w-full items-start gap-2 border-b border-white/5 px-3 py-2.5 text-left hover:bg-[#29204D]"
                                  >
                                    <MapPin
                                      size={15}
                                      className="mt-0.5 shrink-0 text-emerald-400"
                                    />

                                    <span className="min-w-0">
                                      <span className="block text-xs font-semibold">
                                        {venue.name}
                                      </span>
                                      <span className="mt-0.5 block text-[10px] text-slate-400">
                                        {venue.address}
                                      </span>
                                      <span className="text-[9px] text-emerald-400">
                                        Registered · ID {venue.id}
                                      </span>
                                    </span>
                                  </button>
                                ))}
                              </>
                            )}

                            {geoResults.length > 0 && (
                              <>
                                <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                                  Venue Search Results
                                </p>

                                {geoResults.map((place) => (
                                  <button
                                    type="button"
                                    key={place.place_id}
                                    onClick={() =>
                                      selectExternalLocation(place)
                                    }
                                    className="flex w-full items-start gap-2 border-b border-white/5 px-3 py-2.5 text-left hover:bg-[#29204D]"
                                  >
                                    <MapPinned
                                      size={15}
                                      className="mt-0.5 shrink-0 text-cyan-400"
                                    />

                                    <span className="text-[10px] leading-relaxed text-slate-300">
                                      {place.display_name}
                                    </span>
                                  </button>
                                ))}
                              </>
                            )}

                            {!geoLoading &&
                              filteredVenues.length === 0 &&
                              geoResults.length === 0 && (
                                <p className="p-3 text-xs text-slate-500">
                                  No locations found.
                                </p>
                              )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className={labelClass}>Venue Address *</label>
                          <textarea
                            rows={2}
                            className={inputClass}
                            placeholder="Address will be filled automatically after selecting a search result."
                            value={venueAddress}
                            onChange={(event) => setVenueAddress(event.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Latitude</label>
                            <input
                              className={inputClass}
                              value={mapPoint ? mapPoint.lat.toFixed(7) : ""}
                              placeholder="Auto-filled"
                              onChange={(event) => {
                                const lat = Number(event.target.value);
                                if (event.target.value === "" || !Number.isFinite(lat)) return;
                                setMapPoint((current) => ({ lat, lon: current?.lon ?? 0 }));
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Longitude</label>
                            <input
                              className={inputClass}
                              value={mapPoint ? mapPoint.lon.toFixed(7) : ""}
                              placeholder="Auto-filled"
                              onChange={(event) => {
                                const lon = Number(event.target.value);
                                if (event.target.value === "" || !Number.isFinite(lon)) return;
                                setMapPoint((current) => ({ lat: current?.lat ?? 0, lon }));
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {selectedVenue ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-[#102A27] p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2
                              size={16}
                              className="text-emerald-400"
                            />
                            <p className="text-xs font-bold text-emerald-300">
                              Registered Venue Selected
                            </p>
                          </div>

                          <p className="mt-2 text-sm font-bold">
                            {selectedVenue.name}
                          </p>

                          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                            {selectedVenue.address}
                          </p>

                          <p className="mt-2 text-[10px] text-emerald-400">
                            Venue ID: {selectedVenue.id}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                          <p className="text-[10px] leading-relaxed text-amber-200">
                            {externalLocation
                              ? "Venue location selected. This location will be saved automatically when you submit the concert."
                              : "Search for a venue or type its name, then select a location on the map."}
                          </p>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-500">
                        You don't need to type a Venue ID manually.
                      </p>
                    </div>

                    {/* MAP */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <MapPin
                            size={17}
                            className="text-[#A78BFA]"
                          />
                          Location Map
                        </div>
                      </div>

                      <VenueMap
                        position={mapPoint}
                        venues={venues}
                        onPick={handleMapPick}
                      />

                      <p className="text-[10px] text-slate-500">
                        Click the map to set the exact venue location. Registered venues are optional.
                      </p>

                      {mapPoint && (
                        <p className="text-[10px] text-cyan-300">
                          Coordinates: {mapPoint.lat.toFixed(6)},{" "}
                          {mapPoint.lon.toFixed(6)}
                        </p>
                      )}
                    </div>

                    {/* SCHEDULE */}
                    <div className="space-y-3 md:col-span-2">
                      <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-sm font-bold">
                        <CalendarDays
                          size={17}
                          className="text-[#A78BFA]"
                        />
                        Concert Schedule
                      </div>

                      <div>
                        <label className={labelClass}>
                          Concert Date *
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <span className="mb-1 block text-[10px] text-slate-500">
                              Start Date
                            </span>
                            <input
                              type="date"
                              className={`${inputClass} [color-scheme:dark]`}
                              value={form.start_date}
                              onChange={(e) =>
                                update("start_date", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <span className="mb-1 block text-[10px] text-slate-500">
                              End Date
                            </span>
                            <input
                              type="date"
                              className={`${inputClass} [color-scheme:dark]`}
                              value={form.end_date}
                              min={form.start_date || undefined}
                              onChange={(e) =>
                                update("end_date", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>
                          Concert Time *
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <span className="mb-1 block text-[10px] text-slate-500">
                              Start Time
                            </span>
                            <input
                              type="time"
                              className={`${inputClass} [color-scheme:dark]`}
                              value={form.start_time}
                              onChange={(e) =>
                                update("start_time", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <span className="mb-1 block text-[10px] text-slate-500">
                              End Time
                            </span>
                            <input
                              type="time"
                              className={`${inputClass} [color-scheme:dark]`}
                              value={form.end_time}
                              onChange={(e) =>
                                update("end_time", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>
                          Ticket Sales Period *
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <span className="mb-1 block text-[10px] text-slate-500">
                              Sales Start
                            </span>
                            <input
                              type="datetime-local"
                              className={`${inputClass} [color-scheme:dark]`}
                              value={form.sales_start_at}
                              onChange={(e) =>
                                update("sales_start_at", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <span className="mb-1 block text-[10px] text-slate-500">
                              Sales End
                            </span>
                            <input
                              type="datetime-local"
                              className={`${inputClass} [color-scheme:dark]`}
                              value={form.sales_end_at}
                              min={form.sales_start_at || undefined}
                              onChange={(e) =>
                                update("sales_end_at", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <Ticket
                          size={17}
                          className="text-[#A78BFA]"
                        />
                        Ticket Categories
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setTicketPopup(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-3 py-2 text-xs font-semibold"
                      >
                        <Plus size={14} />
                        Add Ticket Category
                      </button>
                    </div>

                    {ticketCategories.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#45416D] py-10 text-center">
                        <Ticket
                          size={28}
                          className="mx-auto mb-2 text-slate-500"
                        />
                        <p className="text-sm font-semibold">
                          No ticket categories yet
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Add at least one ticket category.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {ticketCategories.map((category, index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-white/10 bg-[#151630] p-3"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-sm"
                                  style={{
                                    background: category.color,
                                  }}
                                />
                                <span className="text-sm font-bold">
                                  {category.name}
                                </span>
                              </div>

                              <button
                                onClick={() =>
                                  removeTicketCategory(index)
                                }
                                className="rounded-md p-1.5 text-rose-400 hover:bg-rose-400/10"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            <p className="text-sm font-bold text-[#22D3EE]">
                              {money(category.price)}
                            </p>

                            <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                              <span>
                                Quota: {category.quota}
                              </span>
                              <span>
                                {category.benefit || "Standard"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-3 rounded-xl border border-[#8B5CF6]/20 bg-[#191438] p-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] text-slate-400">
                          Total Quota
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {totalQuota.toLocaleString("id-ID")}
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            Tickets
                          </span>
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400">
                          Estimated Gross Revenue
                        </p>
                        <p className="mt-1 text-xl font-bold text-[#22D3EE]">
                          {money(estimatedRevenue)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4 */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                        <Star
                          size={17}
                          className="text-amber-400"
                        />
                        Ticket Benefits
                      </div>

                      <p className="mb-3 text-[10px] text-slate-400">
                        Select the benefits available to attendees.
                      </p>

                      <div className="grid gap-2 sm:grid-cols-3">
                        {BENEFITS.map((item) => (
                          <button
                            key={item}
                            onClick={() =>
                              setBenefits((old) =>
                                old.includes(item)
                                  ? old.filter((x) => x !== item)
                                  : [...old, item]
                              )
                            }
                            className={`rounded-lg border px-3 py-2 text-xs ${
                              benefits.includes(item)
                                ? "border-[#8B5CF6] bg-[#33245C] text-white"
                                : "border-[#34345B] bg-[#151630] text-slate-300"
                            }`}
                          >
                            {benefits.includes(item) ? "✓ " : "+ "}
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                        <MapPin
                          size={17}
                          className="text-[#22D3EE]"
                        />
                        Venue Facilities
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2">
                        {facilities.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#211A43] px-3 py-1.5 text-xs"
                          >
                            {item}

                            <button
                              onClick={() =>
                                setFacilities((old) =>
                                  old.filter((x) => x !== item)
                                )
                              }
                              aria-label={`Remove ${item}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          className={inputClass}
                          placeholder="Add facility..."
                          value={facilityInput}
                          onChange={(e) =>
                            setFacilityInput(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addFacility();
                            }
                          }}
                        />

                        <button
                          onClick={addFacility}
                          className="rounded-lg border border-[#8B5CF6] px-4 text-xs font-semibold text-[#C4B5FD]"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-200">
                      Benefits and facilities are currently frontend selections only. Your current backend does not have fields or endpoints to persist them.
                    </div>
                  </div>
                )}

                {/* STEP 5 */}
                {step === 4 && (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#151630]">
                      {posterPreview && (
                        <img
                          src={posterPreview}
                          alt="Concert poster"
                          className="h-36 w-full object-cover"
                        />
                      )}

                      <div className="p-4">
                        <span className="inline-flex rounded-full bg-[#183B35] px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                          Pending approval after submission
                        </span>

                        <h3 className="mt-2 text-lg font-bold">
                          {form.name}
                        </h3>

                        <p className="text-xs text-slate-400">
                          {form.artist_name}
                          {form.artist_country
                            ? ` · ${form.artist_country}`
                            : ""}
                        </p>

                        <p className="mt-3 text-xs leading-relaxed text-slate-300">
                          {form.description}
                        </p>

                        <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                          <p className="flex items-center gap-2">
                            <MapPin
                              size={14}
                              className="text-[#A78BFA]"
                            />
                            {selectedVenue?.name}
                          </p>

                          <p className="flex items-center gap-2">
                            <CalendarDays
                              size={14}
                              className="text-[#A78BFA]"
                            />
                            {form.start_date} {form.start_time}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className={panelClass}>
                        <p className="mb-2 text-xs font-bold">
                          Concert Information
                        </p>

                        <p className="text-[10px] text-slate-400">
                          Category:{" "}
                          {categories.find(
                            (c) =>
                              String(c.id) === form.category_id
                          )?.name}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          Venue ID: {form.venue_id}
                        </p>
                      </div>

                      <div className={panelClass}>
                        <p className="mb-2 text-xs font-bold">
                          Tickets & Pricing
                        </p>

                        <p className="text-[10px] text-slate-400">
                          {ticketCategories.length} categories ·{" "}
                          {totalQuota.toLocaleString("id-ID")} tickets
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          Estimated revenue:{" "}
                          {money(estimatedRevenue)}
                        </p>
                      </div>
                    </div>

                    <div className={panelClass}>
                      <p className="mb-2 text-xs font-bold">
                        Ticket Categories
                      </p>

                      {ticketCategories.map((category, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between border-b border-white/5 py-2 last:border-0"
                        >
                          <span className="flex items-center gap-2 text-xs">
                            <span
                              className="h-2.5 w-2.5 rounded-sm"
                              style={{
                                background: category.color,
                              }}
                            />
                            {category.name}
                          </span>

                          <span className="text-[10px] text-slate-300">
                            {money(category.price)} · {category.quota} quota
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-[#22D3EE]/20 bg-[#102A37]/40 p-3 text-[10px] text-cyan-100">
                      Your concert will be submitted as pending and requires Super Admin approval before publication.
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200"
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-200"
                  >
                    {success}
                  </div>
                )}
              </div>

              {/* STICKY FOOTER */}
              <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-[#0D1028] px-4 py-3 sm:px-5">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>

                <div className="flex gap-2">
                  {step > 0 && (
                    <button
                      onClick={() => {
                        setError("");
                        setStep((old) => old - 1);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
                    >
                      <ChevronLeft size={14} />
                      Previous
                    </button>
                  )}

                  {step < 4 ? (
                    <button
                      onClick={next}
                      className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-4 py-2 text-xs font-semibold text-white"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      disabled={loading || !!createdEventId}
                      onClick={submitConcert}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#22D3EE] to-[#5456DE] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                          Submitting...
                        </>
                      ) : createdEventId ? (
                        "Event Created"
                      ) : (
                        <>
                          <ClipboardCheck size={14} />
                          Submit for Review
                        </>
                      )}
                    </button>
                  )}
                </div>
              </footer>
            </section>
          </div>
        </div>
      </div>

      {/* ADD TICKET CATEGORY POPUP */}
      {ticketPopup && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setTicketPopup(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[500px] overflow-hidden rounded-xl border border-[#8B5CF6]/60 bg-[#0D0B25] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[#8B5CF6]/40 bg-gradient-to-r from-[#24104E] via-[#6B28B8] to-[#17113F] px-4 py-3">
              <span className="rounded-lg bg-[#A78BFA] p-2">
                <Ticket size={20} />
              </span>

              <div>
                <h3 className="text-base font-bold">
                  Add Ticket Category
                </h3>
                <p className="text-[10px] text-purple-100/70">
                  Create a new ticket category for your concert.
                </p>
              </div>

              <button
                onClick={() => setTicketPopup(false)}
                className="ml-auto rounded-md p-1.5 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div>
                <label className={labelClass}>
                  Category Name *
                </label>

                <input
                  className={inputClass}
                  placeholder="e.g. VIP, CAT 1, CAT 2"
                  value={ticketForm.name}
                  onChange={(e) =>
                    setTicketForm((old) => ({
                      ...old,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    Category Color
                  </label>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COLORS.map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() =>
                          setTicketForm((old) => ({
                            ...old,
                            color,
                          }))
                        }
                        className={`h-7 w-7 rounded-md transition ${
                          ticketForm.color === color
                            ? "ring-2 ring-white ring-offset-2 ring-offset-[#0D0B25]"
                            : ""
                        }`}
                        style={{ background: color }}
                        aria-label={`Select ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Price (Rp) *
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className={inputClass}
                    placeholder="350.000"
                    value={formatPriceInput(ticketForm.price)}
                    onChange={(e) =>
                      setTicketForm((old) => ({
                        ...old,
                        price: parsePriceInput(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Ticket Quota *
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  className={inputClass}
                  placeholder="500"
                  value={ticketForm.quota}
                  onChange={(e) =>
                    setTicketForm((old) => ({
                      ...old,
                      quota: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className={labelClass}>
                  Description / Benefit (optional)
                </label>

                <textarea
                  className={`${inputClass} min-h-[65px] resize-y`}
                  placeholder="e.g. Priority entry, exclusive merchandise..."
                  value={ticketForm.benefit}
                  onChange={(e) =>
                    setTicketForm((old) => ({
                      ...old,
                      benefit: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="rounded-lg border border-[#8B5CF6]/20 bg-[#171333] p-2.5 text-[10px] leading-relaxed text-slate-400">
                <Info
                  size={13}
                  className="mb-1 inline text-[#A78BFA]"
                />
                {" "}
                Choose clear category names such as VIP, CAT 1, or CAT 2. The selected color is for frontend display.
              </div>

              {error && (
                <p className="text-[11px] text-rose-400">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                onClick={() => setTicketPopup(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                onClick={addTicketCategory}
                className="rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-5 py-2 text-xs font-bold text-white"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
