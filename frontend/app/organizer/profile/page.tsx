
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type User = {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  profile_photo?: string | null;
  cover_photo?: string | null;
  organization_name?: string | null;
  organization?: string | null;
  company_name?: string | null;
  status?: string;
};

type EventItem = {
  id: number;
  name: string;
  status?: string;
  publication_status?: string;
};

type SalesSummary = {
  tickets_sold?: number;
  gross_revenue?: number;
};

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  profile_photo: string | null;
  cover_photo: string | null;
};

type Statistics = {
  totalEvents: number;
  publishedEvents: number;
  ticketsSold: number;
  totalRevenue: number;
};

type Tab = "personal" | "organization" | "security";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const EMPTY_FORM: ProfileForm = {
  name: "",
  email: "",
  phone: "",
  profile_photo: null,
  cover_photo: null,
};

const EMPTY_STATS: Statistics = {
  totalEvents: 0,
  publishedEvents: 0,
  ticketsSold: 0,
  totalRevenue: 0,
};

const inputClass =
  "w-full rounded-lg border border-[#383D4E] bg-[#161A25] px-3 py-3 text-[13px] text-white outline-none transition focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 read-only:border-transparent read-only:bg-white/[0.03]";

const labelClass =
  "mb-1.5 block text-[11px] font-medium text-[#AAB0C5]";

const buttonClass =
  "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton =
  `${buttonClass} bg-[#8B5CF6] text-white hover:bg-[#764ED1]`;

const secondaryButton =
  `${buttonClass} border border-[#383D4E] bg-[#161A25] text-[#AAB0C5] hover:border-[#8B5CF6] hover:text-white`;

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

function getImageUrl(src?: string | null) {
  if (!src) return null;

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  const origin = API_URL.replace(/\/api\/?$/, "");

  return `${origin}/${src.replace(/^\/+/, "")}`;
}

function getInitials(name?: string) {
  if (!name?.trim()) return "EO";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function mapUser(user: User): ProfileForm {
  return {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    profile_photo: user.profile_photo || null,
    cover_photo: user.cover_photo || null,
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getToken();

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result;
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#AAB0C5]">
        {description}
      </p>
    </div>
  );
}

export default function OrganizerProfilePage() {
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [saved, setSaved] = useState<ProfileForm>(EMPTY_FORM);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);

  const [statistics, setStatistics] =
    useState<Statistics>(EMPTY_STATS);

  const [activeTab, setActiveTab] = useState<Tab>("personal");

  const [loading, setLoading] = useState(true);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================
     LOAD PROFILE
  ========================= */

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const result = await apiRequest("/profile/me");
      const profileUser = result.user as User;
      const mapped = mapUser(profileUser);

      setUser(profileUser);
      setSaved(mapped);
      setForm(mapped);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* =========================
     LOAD EVENT STATISTICS
  ========================= */

  const loadStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true);

      const result = await apiRequest("/events/my-events");

      const events: EventItem[] = Array.isArray(result.events)
        ? result.events
        : [];

      const publishedEvents = events.filter(
        (event) =>
          event.status === "published" ||
          event.publication_status === "published"
      ).length;

      const salesResults = await Promise.all(
        events.map(async (event) => {
          try {
            const sales = await apiRequest(
              `/orders/organizer-sales/${encodeURIComponent(event.id)}`
            );

            return sales.data?.summary as SalesSummary | undefined;
          } catch {
            return undefined;
          }
        })
      );

      const totals = salesResults.reduce(
        (accumulator, summary) => {
          if (!summary) return accumulator;

          accumulator.ticketsSold += Number(
            summary.tickets_sold || 0
          );

          accumulator.totalRevenue += Number(
            summary.gross_revenue || 0
          );

          return accumulator;
        },
        {
          ticketsSold: 0,
          totalRevenue: 0,
        }
      );

      setStatistics({
        totalEvents: events.length,
        publishedEvents,
        ticketsSold: totals.ticketsSold,
        totalRevenue: totals.totalRevenue,
      });
    } catch (err) {
      console.error("Organizer statistics error:", err);
      setStatistics(EMPTY_STATS);
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadStatistics();
  }, [loadProfile, loadStatistics]);

  /* =========================
     FORM HANDLERS
  ========================= */

  function update<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setError("");
    setSuccess("");
  }

  function startEditing() {
    setForm(saved);
    setEditing(true);
    setActiveTab("personal");
    setError("");
    setSuccess("");
  }

  function cancelEditing() {
    setForm(saved);
    setEditing(false);
    setError("");
  }

  /* =========================
     SAVE PROFILE
  ========================= */

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const result = await apiRequest("/profile/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        }),
      });

      const updatedUser = result.user as User;
      const mapped = mapUser(updatedUser);

      setUser(updatedUser);
      setSaved(mapped);
      setForm(mapped);
      setEditing(false);

      setSuccess("Your profile has been updated successfully.");

      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);

          localStorage.setItem(
            "user",
            JSON.stringify({
              ...parsed,
              ...updatedUser,
            })
          );

          window.dispatchEvent(new Event("lynora:user-updated"));
        } catch {
          // Ignore invalid local storage data.
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     IMAGE UPLOAD
  ========================= */

  async function uploadImage(
    key: "profile_photo" | "cover_photo",
    file: File
  ) {
    const isAvatar = key === "profile_photo";

    try {
      setError("");
      setSuccess("");

      if (isAvatar) {
        setUploadingAvatar(true);
      } else {
        setUploadingCover(true);
      }

      const formData = new FormData();

      formData.append(isAvatar ? "avatar" : "banner", file);

      const result = await apiRequest(
        `/profile/${isAvatar ? "avatar" : "banner"}`,
        {
          method: "PATCH",
          body: formData,
        }
      );

      const updatedUser = result.user as User;
      const mapped = mapUser(updatedUser);

      setUser(updatedUser);
      setSaved(mapped);

      setForm((previous) => ({
        ...previous,
        [key]: mapped[key],
      }));

      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);

          localStorage.setItem(
            "user",
            JSON.stringify({
              ...parsed,
              ...updatedUser,
            })
          );

          window.dispatchEvent(new Event("lynora:user-updated"));
        } catch {
          // Ignore invalid local storage data.
        }
      }

      setSuccess(
        isAvatar
          ? "Profile photo updated successfully."
          : "Cover photo updated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload the image."
      );
    } finally {
      setUploadingAvatar(false);
      setUploadingCover(false);
    }
  }

  async function handleImage(
    e: React.ChangeEvent<HTMLInputElement>,
    key: "profile_photo" | "cover_photo"
  ) {
    const file = e.target.files?.[0];

    e.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, and WebP images are supported.");
      return;
    }

    const maxSize =
      key === "profile_photo"
        ? 2 * 1024 * 1024
        : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        key === "profile_photo"
          ? "Profile photo size must not exceed 2 MB."
          : "Cover photo size must not exceed 5 MB."
      );
      return;
    }

    await uploadImage(key, file);
  }

  /* =========================
     DERIVED DATA
  ========================= */

  const organizationName =
    user?.organization_name ||
    user?.organization ||
    user?.company_name ||
    "";

  const avatar = getImageUrl(saved.profile_photo);
  const cover = getImageUrl(saved.cover_photo);

  const displayedForm = editing ? form : saved;

  const tabs: { id: Tab; label: string }[] = [
    { id: "personal", label: "Personal Info" },
    { id: "organization", label: "Organization" },
    { id: "security", label: "Account Security" },
  ];

  const statCards = [
    {
      title: "Total Events",
      value: statistics.totalEvents.toLocaleString("en-US"),
    },
    {
      title: "Published Events",
      value: statistics.publishedEvents.toLocaleString("en-US"),
    },
    {
      title: "Tickets Sold",
      value: statistics.ticketsSold.toLocaleString("en-US"),
    },
    {
      title: "Total Revenue",
      value: formatCurrency(statistics.totalRevenue),
    },
  ];

  /* =========================
     RENDER
  ========================= */

  return (
    <main className="w-full min-w-0 pb-6 text-white">

      {loading && (
        <div className="mb-3 rounded-lg border border-[#383D4E] bg-[#0C1122] p-3 text-xs text-[#AAB0C5]">
          Loading your profile...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-[#7A2A3A] bg-[#7A2A3A]/20 p-3 text-xs text-[#FFB3C0]"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-3 rounded-lg border border-[#167B5A] bg-[#167B5A]/15 p-3 text-xs text-[#7DFFE9]"
        >
          {success}
        </div>
      )}

      {/* OUTER PROFILE CONTAINER */}

      <div className="rounded-2xl border border-[#252C40] bg-[#161A25] p-3.5 sm:p-5 lg:p-6">

        {/* PROFILE COVER */}

        <section>
          <div
            className="relative h-[100px] overflow-hidden rounded-xl bg-gradient-to-br from-[#2A1550] via-[#4B2FD9] to-[#7C2FA0] bg-cover bg-center sm:h-[170px]"
            style={
              cover
                ? { backgroundImage: `url("${cover}")` }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={uploadingCover}
              className="absolute right-3 top-3 z-10 rounded-lg border border-white/20 bg-[#0C1122]/80 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur transition hover:bg-[#0C1122]"
            >
              {uploadingCover ? "Uploading..." : "Change Cover"}
            </button>

            <input
              ref={coverRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => handleImage(e, "cover_photo")}
            />
          </div>

          {/* PROFILE IDENTITY */}

          <div className="relative min-h-[88px] px-2 sm:min-h-[92px] sm:px-4">

            {/* AVATAR */}

            <div className="absolute -top-[55px] left-2 z-10 sm:-top-[55px] sm:left-4">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Organizer profile"
                  className="size-[76px] rounded-2xl border-[4px] border-[#161A25] bg-[#161A25] object-cover sm:size-[100px]"
                />
              ) : (
                <div className="grid size-[76px] place-items-center rounded-2xl border-[4px] border-[#161A25] bg-gradient-to-br from-[#5847E8] to-[#22D3EE] text-3xl font-extrabold text-white sm:size-[100px] sm:text-4xl">
                  {getInitials(saved.name)}
                </div>
              )}

              <button
                type="button"
                aria-label="Change profile photo"
                onClick={() => avatarRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-[3px] border-[#161A25] bg-[#8B5CF6] text-base font-bold text-white transition hover:bg-[#764ED1] sm:size-8"
              >
                {uploadingAvatar ? "…" : "+"}
              </button>

              <input
                ref={avatarRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => handleImage(e, "profile_photo")}
              />
            </div>

            {/* NAME AND EMAIL */}

            <div className="ml-[88px] min-w-0 pt-2 sm:ml-[120px] sm:pt-1">
              <h2 className="truncate text-base font-bold text-white sm:text-xl">
                {saved.name || "LYNORA Organizer"}
              </h2>

              <p className="mt-1 truncate text-[11px] text-[#AAB0C5] sm:text-xs">
                {saved.email || "No email available"}
              </p>

              <span className="mt-2 inline-flex rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/15 px-2.5 py-1 text-[9px] font-bold tracking-wide text-[#C4B5FD]">
                EVENT ORGANIZER
              </span>
            </div>

            {/* ACTION BUTTONS */}

            <div className="mt-3 flex justify-end gap-2 sm:absolute sm:bottom-4 sm:right-4 sm:mt-0">
              <button
                type="button"
                className={`${secondaryButton} px-3 py-2 text-[10px] sm:text-xs`}
                onClick={() =>
                  navigator.clipboard?.writeText(window.location.href)
                }
              >
                Share Profile
              </button>

              <button
                type="button"
                className={`${primaryButton} px-3 py-2 text-[10px] sm:text-xs`}
                onClick={startEditing}
                disabled={editing || loading}
              >
                Edit Profile
              </button>
            </div>
          </div>
        </section>

        {/* FOUR COMPACT STATISTIC CARDS */}

        <section className="mt-3 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {statCards.map((stat) => (
            <div
              key={stat.title}
              className="min-w-0 rounded-xl border border-[#383D4E] bg-[#0C1122] p-3 sm:p-4"
            >
              {statisticsLoading ? (
                <div className="h-7 w-16 animate-pulse rounded-md bg-white/10" />
              ) : (
                <p
                  className={`truncate font-bold text-white ${
                    stat.title === "Total Revenue"
                      ? "text-base sm:text-xl"
                      : "text-xl sm:text-2xl"
                  }`}
                  title={stat.value}
                >
                  {stat.value}
                </p>
              )}

              <p className="mt-1.5 text-[11px] text-[#AAB0C5] sm:text-xs">
                {stat.title}
              </p>
            </div>
          ))}
        </section>

        {/* PROFILE TABS */}

        <div
          role="tablist"
          aria-label="Profile sections"
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[11px] font-bold transition sm:px-4 sm:py-2.5 sm:text-xs ${
                activeTab === tab.id
                  ? "border-[#8B5CF6] bg-[#8B5CF6] text-white shadow-[0_4px_16px_rgba(139,92,246,0.25)]"
                  : "border-[#383D4E] bg-[#0C1122] text-[#AAB0C5] hover:border-[#8B5CF6]/60 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}

        <div className="mt-4 grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)]">

          {/* LEFT COLUMN */}

          <div className="min-w-0">

            {/* PERSONAL INFORMATION */}

            {activeTab === "personal" && (
              <form
                className="rounded-xl border border-[#383D4E] bg-[#0C1122] p-4 sm:p-5"
                onSubmit={handleSave}
              >
                <SectionHeading
                  title="Personal Information"
                  description="Manage your personal details and account contact information."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="eo-name" className={labelClass}>
                      Full Name
                    </label>

                    <input
                      id="eo-name"
                      className={inputClass}
                      value={displayedForm.name}
                      readOnly={!editing}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="eo-email" className={labelClass}>
                      Email Address
                    </label>

                    <input
                      id="eo-email"
                      type="email"
                      className={inputClass}
                      value={displayedForm.email}
                      readOnly={!editing}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label htmlFor="eo-phone" className={labelClass}>
                      Phone Number
                    </label>

                    <input
                      id="eo-phone"
                      type="tel"
                      className={inputClass}
                      value={displayedForm.phone}
                      readOnly={!editing}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="eo-role" className={labelClass}>
                      Account Role
                    </label>

                    <input
                      id="eo-role"
                      className={inputClass}
                      value="Event Organizer"
                      readOnly
                    />
                  </div>
                </div>

                {editing && (
                  <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#383D4E] pt-4">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                      className={secondaryButton}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className={primaryButton}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* ORGANIZATION */}

            {activeTab === "organization" && (
              <div className="rounded-xl border border-[#383D4E] bg-[#0C1122] p-4 sm:p-5">
                <SectionHeading
                  title="Organization Information"
                  description="View the organization details associated with your Event Organizer account."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Organization Name
                    </label>

                    <input
                      className={inputClass}
                      value={organizationName || "Not Set"}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Account Owner</label>

                    <input
                      className={inputClass}
                      value={saved.name || "—"}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Contact Email</label>

                    <input
                      className={inputClass}
                      value={saved.email || "—"}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Contact Number</label>

                    <input
                      className={inputClass}
                      value={saved.phone || "—"}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Account Status</label>

                    <input
                      className={inputClass}
                      value={user?.status || "Active"}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ACCOUNT SECURITY */}

            {activeTab === "security" && (
              <div className="rounded-xl border border-[#383D4E] bg-[#0C1122] p-4 sm:p-5">
                <SectionHeading
                  title="Account Security"
                  description="Manage your account credentials and keep your organizer account secure."
                />

                <div className="mb-4">
                  <label className={labelClass}>
                    Registered Email
                  </label>

                  <input
                    className={inputClass}
                    value={saved.email || "—"}
                    readOnly
                  />
                </div>

                <div>
                  <label className={labelClass}>Password</label>

                  <input
                    className={inputClass}
                    type="password"
                    value="••••••••••••"
                    readOnly
                    autoComplete="off"
                  />

                  <p className="mt-2 text-[10px] text-[#AAB0C5]">
                    Your password is securely stored and cannot be viewed.
                  </p>
                </div>

                <div className="mt-5 border-t border-[#383D4E] pt-4">
                  <h4 className="text-xs font-bold text-white">
                    Password Management
                  </h4>

                  <p className="mt-1 text-[11px] leading-relaxed text-[#AAB0C5]">
                    Keep your account credentials secure. Use the
                    account recovery or password update process
                    to change your password.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}

          <aside className="grid min-w-0 gap-4">

            {/* ORGANIZATION CARD */}

            <div className="rounded-xl border border-[#383D4E] bg-[#0C1122] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">
                  Organization
                </h3>

                <span className="rounded-full bg-[#152B32] px-2.5 py-1 text-[9px] font-bold text-[#42D99A]">
                  ORGANIZER
                </span>
              </div>

              <div className="rounded-lg border border-[#383D4E] bg-[#161A25] p-3">
                <div className="mb-3 grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#5847E8] to-[#22D3EE]">
                  <img
                    src="/icons/spotlight.png"
                    alt=""
                    className="size-6 object-contain"
                  />
                </div>

                <h4 className="break-words text-sm font-bold text-white">
                  {organizationName || "Organization Not Set"}
                </h4>

                <p className="mt-1 break-all text-[10px] text-[#AAB0C5]">
                  {saved.email || "No email available"}
                </p>

                <div className="mt-3 space-y-2.5 border-t border-[#383D4E] pt-3">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-[#AAB0C5]">Account Owner</span>
                    <span className="max-w-[60%] truncate font-semibold text-white">
                      {saved.name || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-[#AAB0C5]">Phone Number</span>
                    <span className="font-semibold text-white">
                      {saved.phone || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-[#AAB0C5]">Account Status</span>
                    <span className="font-semibold text-[#42D99A]">
                      {user?.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ORGANIZER BANNER */}

            <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#2A1550] via-[#4B2FD9] to-[#7C2FA0] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-md bg-white/15 px-2 py-1 text-[9px] font-bold text-white">
                  LYNORA ORGANIZER
                </span>

                <span className="text-[9px] text-[#E0D7FF]">
                  Event Management
                </span>
              </div>

              <h3 className="text-sm font-bold text-white">
                Your Events, Your Experience.
              </h3>

              <p className="mt-2 text-[10px] leading-relaxed text-[#E0D7FF]">
                Keep your account information up to date and manage
                your organizer identity in one place.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
