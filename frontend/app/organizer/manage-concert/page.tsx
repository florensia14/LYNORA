// @ts-nocheck
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import AddConcertModal from "@/components/organizer/AddConcertModal";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

const VenueMap = dynamic(() => import("@/components/organizer/VenueMap"), { ssr: false });

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api")
  .replace(/\/api\/?$/, "").replace(/\/$/, "");

const toLocalInput = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace(" ", "T").slice(0, 16);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const toSqlDateTime = (value: string) => value ? `${value.replace("T", " ")}:00` : "";

type Option = { id: number; name: string };
type Concert = {
  id: number; title: string; description: string; poster: string;
  categoryId: number | string; venueId: number | string; venueName?: string; venueAddress?: string; latitude?: number | null; longitude?: number | null;
  startDate: string; endDate: string; salesStartAt: string; salesEndAt: string;
  status: string;
};

function EditConcertModal({
  concert, onClose, onSaved,
}: {
  concert: Concert; onClose: () => void;
  onSaved: (updated: Record<string, any>) => void;
}) {
  const [form, setForm] = useState({
    name: concert.title || "",
    description: concert.description || "",
    category_id: String(concert.categoryId || ""),
    venue_id: String(concert.venueId || ""),
    venue_name: concert.venueName || "",
    venue_address: concert.venueAddress || "",
    latitude: concert.latitude == null ? "" : String(concert.latitude),
    longitude: concert.longitude == null ? "" : String(concert.longitude),
    start_date: toLocalInput(concert.startDate),
    end_date: toLocalInput(concert.endDate),
    sales_start_at: toLocalInput(concert.salesStartAt),
    sales_end_at: toLocalInput(concert.salesEndAt),
  });
  const [categories, setCategories] = useState<Option[]>([]);
  const [venues, setVenues] = useState<Option[]>([]);
  const [poster, setPoster] = useState<File | null>(null);
  const [preview, setPreview] = useState(concert.poster || "");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [venueSearchResults, setVenueSearchResults] = useState<any[]>([]);
  const [venueSearching, setVenueSearching] = useState(false);
  const [showVenueResults, setShowVenueResults] = useState(false);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
    fetch(`${API_ORIGIN}/api/events/organizer/create-options`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load categories and venues.");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setCategories(data.categories || []);
        setVenues(data.venues || []);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoadingOptions(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const query = form.venue_name.trim();
    if (query.length < 2) {
      setVenueSearchResults([]);
      setVenueSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setVenueSearching(true);
      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          addressdetails: "1",
          namedetails: "1",
          countrycodes: "id",
          limit: "7",
          q: query,
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Venue search failed");
        const results = await response.json();
        setVenueSearchResults(Array.isArray(results) ? results : []);
      } catch (searchError) {
        if (!(searchError instanceof Error) || searchError.name !== "AbortError") {
          setVenueSearchResults([]);
        }
      } finally {
        setVenueSearching(false);
      }
    }, 650);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [form.venue_name]);

  function selectVenueLocation(place: any) {
    const name = place.name || place.namedetails?.name || String(place.display_name || "").split(",")[0];
    setForm((current) => ({
      ...current,
      venue_id: "",
      venue_name: name || current.venue_name,
      venue_address: place.display_name || name || current.venue_address,
      latitude: String(Number(place.lat)),
      longitude: String(Number(place.lon)),
    }));
    setVenueSearchResults([]);
    setShowVenueResults(false);
    setError("");
  }

  useEffect(() => {
    if (!poster) return;
    const url = URL.createObjectURL(poster);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [poster]);

  function change(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    setError("");
    if (!form.name.trim() || !form.description.trim() || !form.category_id ||
        !form.venue_name.trim() || !form.venue_address.trim() || !form.start_date || !form.end_date) {
      setError("Please complete all required fields.");
      return;
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setError("The end date must be later than the start date.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        const normalized = key.endsWith("_at") || key.endsWith("_date")
          ? toSqlDateTime(value) : value;
        body.append(key, normalized);
      });
      if (poster) body.append("poster", poster);

      const res = await fetch(`${API_ORIGIN}/api/events/${concert.id}`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || "Failed to update concert.");

      onSaved({
        id: concert.id,
        name: form.name,
        description: form.description,
        category_id: Number(form.category_id),
        category_name: categories.find((item) => String(item.id) === form.category_id)?.name || "Other",
        venue_id: result.event?.venue_id || Number(form.venue_id) || null,
        venue_name: form.venue_name,
        venue_address: form.venue_address,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        start_date: form.start_date,
        end_date: form.end_date,
        sales_start_at: form.sales_start_at,
        sales_end_at: form.sales_end_at,
        poster_url: result.poster_url || concert.poster,
        display_status: result.display_status || result.status || "pending",
        status: result.display_status || result.status || "pending",
        approval_status: result.approval_status || "pending",
        publication_status: result.publication_status || "draft",
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1.5 w-full rounded-xl border border-white/10 bg-[#10182F] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#7775F0]";
  const labelClass = "text-[13px] font-semibold text-slate-300";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 px-3 py-4 backdrop-blur-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-concert-title"
        className="my-auto flex max-h-[82vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#19213D] p-4 text-white shadow-2xl sm:p-5">
        <div className="mb-3 flex shrink-0 items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#A99AFF]">CONCERT CONFIGURATION</p>
            <h2 id="edit-concert-title" className="mt-2 text-2xl font-bold">Edit concert</h2>
            <p className="mt-1 text-sm text-slate-400">Update {concert.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="text-3xl leading-none text-slate-400 hover:text-white">×</button>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <label className={labelClass}>Concert poster</label>
            <div className="mt-1 flex items-center gap-3 rounded-xl border border-white/10 bg-[#10182F] p-2">
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-[#273456]">
                {preview ? <img src={preview || undefined} alt="Concert poster preview" className="h-full w-full object-cover" /> :
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">No poster</div>}
              </div>
              <div>
                <p className="text-sm font-semibold">Change poster</p>
                <p className="mt-1 text-xs text-slate-400">JPG, PNG or WEBP · Maximum 2 MB</p>
                <label className="mt-2 inline-flex cursor-pointer rounded-lg border border-[#7775F0] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/5">
                  Choose image
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { setError("Poster size must not exceed 2 MB."); return; }
                      setPoster(file); setError("");
                    }} />
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Concert name <span className="text-rose-400">*</span></label>
            <input className={inputClass} value={form.name} onChange={(e) => change("name", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Description <span className="text-rose-400">*</span></label>
            <textarea rows={3} className={inputClass} value={form.description}
              onChange={(e) => change("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Category <span className="text-rose-400">*</span></label>
              <select className={inputClass} value={form.category_id} disabled={loadingOptions}
                onChange={(e) => change("category_id", e.target.value)}>
                <option value="">Select category</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Venue name <span className="text-rose-400">*</span></label>
              <div className="relative">
                <input className={inputClass} value={form.venue_name} placeholder="Type venue name, e.g. GBK, JIS, ICE BSD..."
                  onFocus={() => setShowVenueResults(true)}
                  onChange={(e) => {
                    setForm((current) => ({ ...current, venue_name: e.target.value, venue_id: "", venue_address: "", latitude: "", longitude: "" }));
                    setShowVenueResults(true);
                  }} />
                {showVenueResults && (venueSearching || venueSearchResults.length > 0) && (
                  <div className="absolute left-0 right-0 top-full z-[600] mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#11132D] shadow-2xl">
                    {venueSearching && <p className="px-3 py-2 text-xs text-slate-400">Searching venues in Indonesia...</p>}
                    {venueSearchResults.map((place: any) => (
                      <button key={place.place_id} type="button" onClick={() => selectVenueLocation(place)}
                        className="block w-full border-b border-white/5 px-3 py-2.5 text-left hover:bg-[#29204D]">
                        <span className="block text-xs font-semibold text-white">{place.name || place.namedetails?.name || String(place.display_name).split(",")[0]}</span>
                        <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{place.display_name}</span>
                      </button>
                    ))}
                    {!venueSearching && venueSearchResults.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No locations found in Indonesia.</p>}
                  </div>
                )}
              </div>
              <label className={`${labelClass} mt-3 block`}>Venue address <span className="text-rose-400">*</span></label>
              <textarea rows={2} className={inputClass} value={form.venue_address} placeholder="Automatically filled after selecting a venue result" onChange={(e) => change("venue_address", e.target.value)} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Latitude</label><input className={inputClass} value={form.latitude} placeholder="Auto-filled from venue" onChange={(e) => change("latitude", e.target.value)} /></div>
                <div><label className={labelClass}>Longitude</label><input className={inputClass} value={form.longitude} placeholder="Auto-filled from venue" onChange={(e) => change("longitude", e.target.value)} /></div>
              </div>
              <div className="mt-4">
                <label className={labelClass}>Select venue point on map</label>
                <div className="mt-2">
                  <VenueMap
                    position={form.latitude !== "" && form.longitude !== "" ? { lat: Number(form.latitude), lon: Number(form.longitude) } : null}
                    onPick={(point) => setForm((current) => ({ ...current, latitude: String(point.lat), longitude: String(point.lon) }))}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">Click the map to update the venue coordinates. The saved point is shown to customers.</p>
            </div>
            <div>
              <label className={labelClass}>Start date & time <span className="text-rose-400">*</span></label>
              <input type="datetime-local" className={inputClass} value={form.start_date}
                onChange={(e) => change("start_date", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>End date & time <span className="text-rose-400">*</span></label>
              <input type="datetime-local" className={inputClass} value={form.end_date}
                onChange={(e) => change("end_date", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Ticket sales start</label>
              <input type="datetime-local" className={inputClass} value={form.sales_start_at}
                onChange={(e) => change("sales_start_at", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Ticket sales end</label>
              <input type="datetime-local" className={inputClass} value={form.sales_end_at}
                onChange={(e) => change("sales_end_at", e.target.value)} />
            </div>
          </div>
        </div>

        {error && <p role="alert" className="mt-3 shrink-0 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
        <div className="mt-3 flex shrink-0 flex-col-reverse justify-end gap-2 sm:flex-row">
          <button type="button" onClick={onClose} disabled={saving}
            className="rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">Cancel</button>
          <button type="button" onClick={save} disabled={saving || loadingOptions}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5456DE] px-7 py-3 text-sm font-bold text-white hover:bg-[#6264EC] disabled:cursor-not-allowed disabled:opacity-60">
            <img src="/icons/check (3).png" alt="" className="h-4 w-4 object-contain" />
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
        <p className="mt-2 shrink-0 text-[10px] leading-relaxed text-slate-500">Approved concert changes appear across Organizer, Super Admin, and Customer. Pending or rejected edits are resubmitted for approval.</p>
      </section>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* DATA (dummy, replace with your organizer API fetch)                 */
/* ------------------------------------------------------------------ */

const STATUS_STYLE = {
  Published: "bg-[#0A3B35] text-[#2EE6A6]",
  Ongoing: "bg-[#17365B] text-[#38BDF8]",
  Draft: "bg-[#4A3A17] text-[#FBBF24]",
  Pending: "bg-[#4A3A17] text-[#FBBF24]",
  Rejected: "bg-[#4B1D2B] text-[#FB7185]",
  Completed: "bg-[#27304F] text-slate-300",
};

const STATUSES = ["Published", "Ongoing", "Draft", "Pending", "Rejected", "Completed"];

/* ------------------------------------------------------------------ */
/* API CONFIG  (adjust endpoints & fields to match your backend)       */
/* ------------------------------------------------------------------ */

const ENDPOINTS = {
  list: `${API_ORIGIN}/api/events/organizer/concerts`, // GET
  remove: (id) => `${API_ORIGIN}/api/events/${id}`, // DELETE (pending/rejected only),
  update: (id) => `${API_ORIGIN}/api/events/${id}`,
  options: `${API_ORIGIN}/api/events/organizer/create-options`,
};

function authHeaders() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toAbsoluteUrl(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeStatus(value) {
  const v = String(value || "").toLowerCase();
  if (v === "published" || v === "active") return "Published";
  if (v === "ongoing") return "Ongoing";
  if (v === "pending") return "Pending";
  if (v === "rejected") return "Rejected";
  if (v === "completed") return "Completed";
  return "Draft";
}

// 1,250,000,000 -> "Rp 1.25B" · 12,400,000 -> "Rp 12.4M"
function formatRupiah(value) {
  const n = Number(value || 0);
  const fmt = (x, d) => x.toLocaleString("en-US", { maximumFractionDigits: d });
  if (n >= 1_000_000_000) return `Rp ${fmt(n / 1_000_000_000, 2)}B`;
  if (n >= 1_000_000) return `Rp ${fmt(n / 1_000_000, 1)}M`;
  return `Rp ${fmt(n, 0)}`;
}

// Response from GET /api/organizer/concerts
function normalizeConcert(raw) {
  return {
    id: raw.id,
    code: `CNS-${raw.id}`,
    title: raw.name,
    description: raw.description || "",
    categoryId: raw.category_id || "",
    venueId: raw.venue_id || "",
    venueName: raw.venue_name || "",
    venueAddress: raw.venue_address || "",
    latitude: raw.latitude == null ? null : Number(raw.latitude),
    longitude: raw.longitude == null ? null : Number(raw.longitude),
    startDate: raw.start_date || "",
    endDate: raw.end_date || "",
    salesStartAt: raw.sales_start_at || "",
    salesEndAt: raw.sales_end_at || "",
    poster: toAbsoluteUrl(raw.poster_url) || null,
    date: formatDate(raw.start_date),
    venue: raw.venue_name || "-",
    category: raw.category_name || "Other",
    sold: Number(raw.sold || 0),
    capacity: Number(raw.quota || 0),
    revenue: Number(raw.revenue || 0), // full rupiah amount
    status: normalizeStatus(raw.display_status || raw.status),
    approvalStatus: raw.approval_status || "",
    publicationStatus: raw.publication_status || "",
  };
}

const PAGE_SIZE = 7;

/* ------------------------------------------------------------------ */
/* ICONS (PNGs from public/icons, rename files to match yours)         */
/* ------------------------------------------------------------------ */

const ICON = {
  totalConcerts: "/icons/clipboard (1).png",
  ongoing: "/icons/clock.png",
  published: "/icons/check (1).png",
  draft: "/icons/draft.png",
  revenue: "/icons/dollar.png",
  calendar: "/icons/calendar.png",
  pin: "/icons/location.png",
  edit: "/icons/edit.png",
  view: "/icons/eye (1).png",
  chevron: "/icons/down-arrow.png",
  category: "/icons/category.png",
  more: "/icons/titik3.png",
};

function Icon({ src, className = "h-5 w-5" }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`${className} shrink-0 object-contain`}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

const ClipboardIcon = (p) => <Icon src={ICON.totalConcerts} {...p} />;
const DraftIcon = (p) => <Icon src={ICON.draft} {...p} />;
const ClockIcon = (p) => <Icon src={ICON.ongoing} {...p} />;
const CheckIcon = (p) => <Icon src={ICON.published} {...p} />;
const ChartIcon = (p) => <Icon src={ICON.revenue} {...p} />;
const CalendarIcon = (p) => <Icon src={ICON.calendar} {...p} />;
const PinIcon = (p) => <Icon src={ICON.pin} {...p} />;
const EditIcon = (p) => <Icon src={ICON.edit} {...p} />;
const EyeIcon = (p) => <Icon src={ICON.view} {...p} />;
const ChevronIcon = (p) => <Icon src={ICON.chevron} {...p} />;
const GridIcon = (p) => <Icon src={ICON.category} {...p} />;

/* ------------------------------------------------------------------ */
/* SMALL COMPONENTS                                                    */
/* ------------------------------------------------------------------ */

function StatCard({ icon, label, value, tone }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-[#161C38] px-3 py-3 sm:px-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-slate-400">{label}</p>
        <p className="truncate text-xl font-bold leading-tight text-white sm:text-2xl">
          {value}
        </p>
      </div>
    </div>
  );
}

function FilterSelect({ icon, value, onChange, children, label }) {
  return (
    <label className="relative flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#161C38] pl-3 pr-8 text-sm text-slate-200 transition focus-within:border-[#8B5CF6]">
      {icon && <span className="text-slate-300">{icon}</span>}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full w-full cursor-pointer appearance-none bg-transparent pr-2 text-sm font-medium outline-none [&>option]:bg-[#161C38]"
      >
        {children}
      </select>
      <ChevronIcon className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" />
    </label>
  );
}

function RowMenu({ concert, onDelete, onToggleDraft, busy }) {
  const [open, setOpen] = useState(false);
  const canTogglePublication = concert.approvalStatus === "approved";
  const isDraft = concert.publicationStatus !== "published";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-6 items-center justify-center rounded-md text-white transition hover:bg-white/[0.08]"
      >
        <Icon src={ICON.more} className="h-5 w-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-9 z-50 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#17213C] p-1.5 shadow-2xl">
            <Link
              href={`/organizer/manage-tickets?concert=${concert.id}`}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Manage Tickets
            </Link>
            <Link
              href={`/organizer/orders?concert=${concert.id}`}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              View Orders
            </Link>
            {canTogglePublication && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  onToggleDraft(concert);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-xs text-amber-300 transition hover:bg-amber-500/10 disabled:opacity-50"
              >
                {busy ? "Please wait..." : isDraft ? "Out Draft" : "Draft"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete(concert);
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-rose-400 transition hover:bg-rose-500/10"
            >
              Delete Concert
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ConcertRow({ concert, onDelete, onEdit, onToggleDraft, busy }) {
  const percent = concert.capacity
    ? Math.min(100, Math.round((concert.sold / concert.capacity) * 1000) / 10)
    : 0;

  return (
    <tr className="border-t border-white/[0.06] transition hover:bg-white/[0.025]">
      {/* DETAILS */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-[60px] w-[50px] shrink-0 overflow-hidden rounded-md bg-[linear-gradient(160deg,#F59E0B_0%,#7C3AED_100%)]">
            <img
              src={concert.poster || undefined}
              alt={concert.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="max-w-[150px] text-[11px] font-bold leading-snug text-white">
              {concert.title}
            </p>
            <p className="mt-1 text-[9px] text-slate-400">ID: {concert.code}</p>
          </div>
        </div>
      </td>

      {/* DATE & VENUE */}
      <td className="px-4 py-3.5">
        <div className="space-y-1.5 text-[10px] text-slate-300">
          <p className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-white" />
            {concert.date}
          </p>
          <p className="flex items-center gap-1.5">
            <PinIcon className="h-3.5 w-3.5 shrink-0 text-white" />
            {concert.venue}
          </p>
        </div>
      </td>

      {/* TICKETS SOLD */}
      <td className="px-4 py-3.5">
        <div className="w-[130px]">
          <p className="text-[11px] text-slate-400">
            <span className="font-bold text-white">
              {concert.sold.toLocaleString("en-US")}
            </span>{" "}
            / {concert.capacity.toLocaleString("en-US")}
          </p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[#2EE672]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-[9px] font-medium text-[#A78BFA]">
            {percent}%
          </p>
        </div>
      </td>

      {/* REVENUE */}
      <td className="whitespace-nowrap px-4 py-3.5 text-xs font-bold text-white">
        {formatRupiah(concert.revenue)}
      </td>

      {/* STATUS */}
      <td className="px-4 py-3.5">
        <span
          className={`inline-flex rounded-md px-3 py-1.5 text-[10px] font-semibold ${
            STATUS_STYLE[concert.status]
          }`}
        >
          {concert.status}
        </span>
      </td>

      {/* ACTIONS */}
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-center gap-3 text-white">
          <button
            type="button"
            onClick={() => onEdit(concert)}
            aria-label={`Edit ${concert.title}`}
            className="transition hover:opacity-80"
          >
            <EditIcon className="h-[18px] w-[18px]" />
          </button>
          <Link
            href={`/organizer/manage-concert/${concert.id}`}
            aria-label={`View ${concert.title}`}
            className="transition hover:text-[#C4B5FD]"
          >
            <EyeIcon className="h-[18px] w-[18px]" />
          </Link>
          <RowMenu concert={concert} onDelete={onDelete} onToggleDraft={onToggleDraft} busy={busy} />
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE CONTENT                                                        */
/* ------------------------------------------------------------------ */

function ManageConcertContent() {
  const searchParams = useSearchParams();
  const keyword = (searchParams.get("search") || "").trim().toLowerCase();

  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [showAddConcert, setShowAddConcert] = useState(false);
  const [editingConcert, setEditingConcert] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [publicationBusyId, setPublicationBusyId] = useState<number | null>(null);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(ENDPOINTS.list, {
          headers: { "Content-Type": "application/json", ...authHeaders() },
          signal: controller.signal,
        });
        if (res.status === 401)
          throw new Error("Your session has expired. Please log in again.");
        if (!res.ok) throw new Error("Failed to load concert data.");
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.concerts ?? data.data ?? [];
        setConcerts(list.map(normalizeConcert));
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Something went wrong.");
          setConcerts([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [reloadKey]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(ENDPOINTS.remove(toDelete.id), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to delete concert.");
      }
      setConcerts((list) => list.filter((c) => c.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setDeleteError(err.message || "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleDraft(concert) {
    setPublicationBusyId(concert.id);
    try {
      const isDraft = concert.publicationStatus !== "published";
      const endpoint = `${API_ORIGIN}/api/events/${concert.id}/${isDraft ? "publish" : "draft"}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to update publication status.");
      setReloadKey((key) => key + 1);
    } catch (err) {
      window.alert(err.message || "Something went wrong.");
    } finally {
      setPublicationBusyId(null);
    }
  }

  const categories = useMemo(
    () => [...new Set(concerts.map((c) => c.category))].sort(),
    [concerts]
  );

  // go back to page 1 whenever a filter / search changes
  useEffect(() => {
    setPage(1);
  }, [keyword, status, category, sort]);

  const stats = useMemo(() => {
    const revenue = concerts.reduce((sum, c) => sum + c.revenue, 0);
    return {
      total: concerts.length,
      ongoing: concerts.filter((c) => c.status === "Ongoing").length,
      published: concerts.filter((c) => c.status === "Published").length,
      draft: concerts.filter((c) => c.status === "Draft").length,
      revenue,
    };
  }, [concerts]);

  const filtered = useMemo(() => {
    const list = concerts.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (category !== "all" && c.category !== category) return false;
      if (
        keyword &&
        !`${c.title} ${c.venue} ${c.id}`.toLowerCase().includes(keyword)
      )
        return false;
      return true;
    });

    if (sort === "revenue") list.sort((a, b) => b.revenue - a.revenue);
    if (sort === "sold") list.sort((a, b) => b.sold - a.sold);
    return list;
  }, [concerts, status, category, keyword, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      {/* SHARED ORGANIZER HERO */}
      <OrganizerPageHero
        eyebrow="ORGANIZER MANAGEMENT"
        title={
          <>
            Manage{" "}
            <span className="bg-[linear-gradient(90deg,#A78BFA,#22D3EE)] bg-clip-text text-transparent">
              Concerts
            </span>
          </>
        }
        description="View, edit, and manage all your concerts in one place."
        className="mb-0"
      >
        <button
          type="button"
          onClick={() => setShowAddConcert(true)}
          className="inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-[linear-gradient(100deg,#8B5CF6_0%,#6539D5_100%)] px-5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(139,92,246,0.4)] transition hover:brightness-110"
        >
          <span className="text-lg leading-none">+</span>
          Add New Concerts
        </button>
      </OrganizerPageHero>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Concerts"
          value={stats.total}
          tone="bg-[#7C3AED]/30 text-[#C4B5FD]"
          icon={<ClipboardIcon />}
        />
        <StatCard
          label="Ongoing"
          value={stats.ongoing}
          tone="bg-[#7C3AED]/30 text-[#C4B5FD]"
          icon={<ClockIcon />}
        />
        <StatCard
          label="Published"
          value={stats.published}
          tone="bg-[#10B981]/25 text-[#34D399]"
          icon={<CheckIcon />}
        />
        <StatCard
          label="Draft"
          value={stats.draft}
          tone="bg-[#7C3AED]/30 text-[#C4B5FD]"
          icon={<DraftIcon />}
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label="Total Revenue"
            value={formatRupiah(stats.revenue)}
            tone="bg-[#7C3AED]/30 text-[#C4B5FD]"
            icon={<ChartIcon />}
          />
        </div>
      </section>

      {/* FILTERS */}
      <section className="flex flex-wrap items-center gap-2.5">
        <FilterSelect label="Filter status" value={status} onChange={setStatus}>
          <option value="all">All Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Filter category"
          value={category}
          onChange={setCategory}
          icon={<GridIcon className="h-5 w-5" />}
        >
          <option value="all">Category</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Sort by"
          value={sort}
          onChange={setSort}
          icon={<CalendarIcon className="h-5 w-5" />}
        >
          <option value="newest">Date</option>
          <option value="revenue">Top revenue</option>
          <option value="sold">Most tickets sold</option>
        </FilterSelect>

        {keyword && (
          <span className="ml-1 text-xs text-slate-400">
            Results for “<span className="text-white">{keyword}</span>”
          </span>
        )}
      </section>

      {/* TABLE */}
      <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111833]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="bg-[#3B2BB0] text-[11px] font-bold text-white">
                <th className="px-4 py-3.5">Concert Details</th>
                <th className="px-4 py-3.5">Date &amp; Venue</th>
                <th className="px-4 py-3.5">Tickets Sold</th>
                <th className="px-4 py-3.5">Gross Revenue</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-xs text-slate-400">
                    Loading concerts...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <p className="text-sm font-semibold text-rose-400">{error}</p>
                    <button
                      type="button"
                      onClick={() => setReloadKey((k) => k + 1)}
                      className="mt-3 rounded-lg bg-[#7C3AED] px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : visible.length > 0 ? (
                visible.map((c) => (
                  <ConcertRow
                    key={c.id}
                    concert={c}
                    onDelete={setToDelete}
                    onEdit={setEditingConcert}
                    onToggleDraft={toggleDraft}
                    busy={publicationBusyId === c.id}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <p className="text-sm font-semibold text-slate-300">
                      No concerts found
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try changing the filters or search keyword.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER / PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-300">
            Showing {visible.length} of {filtered.length} concerts
          </p>

          <nav aria-label="Pagination" className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={n === page ? "page" : undefined}
                className={`h-7 min-w-7 rounded-md px-2 text-[11px] font-semibold transition ${
                  n === page
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#1D2548] text-slate-200 hover:bg-[#28326A]"
                }`}
              >
                {n}
              </button>
            ))}
          </nav>
        </div>
      </section>

      {editingConcert && (
        <EditConcertModal
          concert={editingConcert}
          onClose={() => setEditingConcert(null)}
          onSaved={(updated) => {
            setConcerts((items) => items.map((item) =>
              item.id === updated.id ? normalizeConcert({ ...item, ...updated }) : item
            ));
            setEditingConcert(null);
          }}
        />
      )}

      {/* ADD CONCERT MODAL */}
      {showAddConcert && (
        <AddConcertModal
          onClose={() => setShowAddConcert(false)}
          onCreated={() => {
            setShowAddConcert(false);
            setReloadKey((key) => key + 1);
          }}
        />
      )}

      {/* DELETE CONFIRMATION */}
      {toDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete concert"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#17213C] p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white">Delete concert?</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              “{toDelete.title}” and its data will be permanently deleted. This
              action cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-2 text-xs text-rose-400">{deleteError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setToDelete(null);
                  setDeleteError("");
                }}
                className="rounded-lg bg-[#1D2548] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-[#28326A] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* useSearchParams must be wrapped in Suspense in the Next.js App Router */
export default function ManageConcertPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-slate-400">
          Loading concerts...
        </div>
      }
    >
      <ManageConcertContent />
    </Suspense>
  );
}