
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ======================================================
// TYPES
// ======================================================

type User = {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  profile_photo?: string | null;
  cover_photo?: string | null;
  status?: string;
};

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  profile_photo: string | null;
  cover_photo: string | null;
};

type Statistics = {
  totalUsers: number;
  totalOrganizers: number;
  totalConcerts: number;
  ticketsSold: number;
  totalRevenue: number;
  pendingConcerts: number;
};

type Tab = "personal" | "platform" | "security";

// ======================================================
// CONSTANTS
// ======================================================

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const EMPTY_FORM: ProfileForm = {
  name: "",
  email: "",
  phone: "",
  profile_photo: null,
  cover_photo: null,
};

const EMPTY_STATS: Statistics = {
  totalUsers: 0,
  totalOrganizers: 0,
  totalConcerts: 0,
  ticketsSold: 0,
  totalRevenue: 0,
  pendingConcerts: 0,
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

// ======================================================
// API HELPERS
// ======================================================

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
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

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result;
}

// ======================================================
// UTILITY FUNCTIONS
// ======================================================

function getImageUrl(src?: string | null) {
  if (!src) return null;

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  return `${API_URL.replace(/\/api\/?$/, "")}/${src.replace(/^\/+/, "")}`;
}

function getInitials(name?: string) {
  if (!name?.trim()) return "SA";

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

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-bold text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-relaxed text-[#AAB0C5]">
        {description}
      </p>
    </div>
  );
}

// ======================================================
// MAIN PAGE
// ======================================================

export default function AdminProfilePage() {
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

  // ====================================================
  // LOAD PROFILE
  // ====================================================

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

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

  // ====================================================
  // LOAD PLATFORM STATISTICS
  // ====================================================

  const loadStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true);

      const result = await apiRequest(
        "/events/admin/dashboard?range=month"
      );

      const stats = result.stats || {};

      setStatistics({
        totalUsers: Number(stats.total_users || 0),
        totalOrganizers: Number(stats.total_organizers || 0),
        totalConcerts: Number(stats.total_concerts || 0),
        ticketsSold: Number(stats.tickets_sold || 0),
        totalRevenue: Number(stats.gross_revenue || 0),
        pendingConcerts: Number(stats.pending_concerts || 0),
      });
    } catch (err) {
      console.error("Admin statistics error:", err);
      setStatistics(EMPTY_STATS);
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadStatistics();
  }, [loadProfile, loadStatistics]);

  // ====================================================
  // FORM HANDLERS
  // ====================================================

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

  // ====================================================
  // SAVE PROFILE
  // ====================================================

  async function handleSave(
    e: React.FormEvent<HTMLFormElement>
  ) {
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

      // UPDATE LOCAL USER DATA

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

          window.dispatchEvent(
            new Event("lynora:user-updated")
          );
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

  // ====================================================
  // IMAGE UPLOAD
  // ====================================================

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

      // UPDATE LOCAL USER DATA

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

          window.dispatchEvent(
            new Event("lynora:user-updated")
          );
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

  // ====================================================
  // DERIVED DATA
  // ====================================================

  const avatar = getImageUrl(saved.profile_photo);
  const cover = getImageUrl(saved.cover_photo);

  const displayedForm = editing ? form : saved;

  const tabs: { id: Tab; label: string }[] = [
    { id: "personal", label: "Personal Info" },
    { id: "platform", label: "Platform Overview" },
    { id: "security", label: "Account Security" },
  ];

  const statCards = [
    {
      title: "Total Users",
      value: statistics.totalUsers.toLocaleString("en-US"),
    },
    {
      title: "Total Organizers",
      value: statistics.totalOrganizers.toLocaleString("en-US"),
    },
    {
      title: "Total Concerts",
      value: statistics.totalConcerts.toLocaleString("en-US"),
    },
    {
      title: "Total Revenue",
      value: formatCurrency(statistics.totalRevenue),
    },
  ];

  const accountStatus = user?.status || "Active";

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="w-full min-w-0 pb-6 text-white">

      {/* ==============================================
          STATUS MESSAGES
      ============================================== */}

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

      {/* ==============================================
          OUTER PROFILE CONTAINER
      ============================================== */}

      <div className="rounded-2xl border border-[#252C40] bg-[#161A25] p-3.5 sm:p-5 lg:p-6">

        {/* ============================================
            PROFILE COVER
        ============================================ */}

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
              className="absolute right-3 top-3 z-10 rounded-lg border border-white/20 bg-[#0C1122]/80 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur transition hover:bg-[#0C1122] disabled:opacity-50"
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
                  alt="Admin profile"
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
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-[3px] border-[#161A25] bg-[#8B5CF6] text-base font-bold text-white transition hover:bg-[#764ED1] disabled:opacity-50 sm:size-8"
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
                {saved.name || "LYNORA Administrator"}
              </h2>

              <p className="mt-1 truncate text-[11px] text-[#AAB0C5] sm:text-xs">
                {saved.email || "No email available"}
              </p>

              <span className="mt-2 inline-flex rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/15 px-2.5 py-1 text-[9px] font-bold tracking-wide text-[#C4B5FD]">
                SUPER ADMIN
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

        {/* ============================================
            PLATFORM STATISTICS
        ============================================ */}

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

        {/* ============================================
            PROFILE TABS
        ============================================ */}

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

        {/* ============================================
            TAB CONTENT
        ============================================ */}

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
                    <label htmlFor="admin-name" className={labelClass}>
                      Full Name
                    </label>

                    <input
                      id="admin-name"
                      className={inputClass}
                      value={displayedForm.name}
                      readOnly={!editing}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-email" className={labelClass}>
                      Email Address
                    </label>

                    <input
                      id="admin-email"
                      type="email"
                      className={inputClass}
                      value={displayedForm.email}
                      readOnly={!editing}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-phone" className={labelClass}>
                      Phone Number
                    </label>

                    <input
                      id="admin-phone"
                      type="tel"
                      className={inputClass}
                      value={displayedForm.phone}
                      readOnly={!editing}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-role" className={labelClass}>
                      Account Role
                    </label>

                    <input
                      id="admin-role"
                      className={inputClass}
                      value="Super Admin"
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

            {/* PLATFORM OVERVIEW */}

            {activeTab === "platform" && (
              <div className="rounded-xl border border-[#383D4E] bg-[#0C1122] p-4 sm:p-5">
                <SectionHeading
                  title="Platform Information"
                  description="Overview of your administrative access and LYNORA platform management."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Platform Name
                    </label>

                    <input
                      className={inputClass}
                      value="LYNORA"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Administrator
                    </label>

                    <input
                      className={inputClass}
                      value={saved.name || "—"}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Administrator Email
                    </label>

                    <input
                      className={inputClass}
                      value={saved.email || "—"}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Access Level
                    </label>

                    <input
                      className={inputClass}
                      value="Super Administrator"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Account Status
                    </label>

                    <input
                      className={inputClass}
                      value={user?.status || "Active"}
                      readOnly
                    />
                  </div>
                </div>

                <div className="mt-5 border-t border-[#383D4E] pt-4">
                  <h4 className="text-xs font-bold text-white">
                    Platform Responsibilities
                  </h4>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      "Manage Customer Accounts",
                      "Manage Event Organizers",
                      "Review Concert Submissions",
                      "Monitor Transactions",
                      "Manage Platform Categories",
                      "View Reports & Analytics",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 rounded-lg border border-[#383D4E] bg-[#161A25] px-3 py-2.5"
                      >
                        <span className="text-xs font-bold text-[#22D3EE]">
                          ✓
                        </span>

                        <span className="text-[10px] text-[#AAB0C5]">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ACCOUNT SECURITY */}

            {activeTab === "security" && (
              <div className="rounded-xl border border-[#383D4E] bg-[#0C1122] p-4 sm:p-5">
                <SectionHeading
                  title="Account Security"
                  description="Manage your account credentials and keep your administrator account secure."
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
                  <label className={labelClass}>
                    Password
                  </label>

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
                    Keep your administrator credentials secure. Use
                    the account recovery or password update process
                    to change your password.
                  </p>
                </div>

                <div className="mt-4 rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/[0.07] p-3">
                  <p className="text-[10px] font-semibold text-[#C4B5FD]">
                    Administrator Security
                  </p>

                  <p className="mt-1 text-[10px] leading-relaxed text-[#AAB0C5]">
                    Your Super Admin account has access to important
                    platform management features. Keep your login
                    credentials private.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}

          <aside className="grid min-w-0 gap-4">

            {/* ADMIN ACCOUNT CARD */}

            <div className="rounded-xl border border-[#383D4E] bg-[#0C1122] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">
                  Administrator
                </h3>

                <span className="rounded-full bg-[#35266A] px-2.5 py-1 text-[9px] font-bold text-[#C4B5FD]">
                  SUPER ADMIN
                </span>
              </div>

              <div className="rounded-lg border border-[#383D4E] bg-[#161A25] p-3">
                <div className="mb-3 grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#5847E8] to-[#22D3EE]">
                  <img
                    src="/icons/user (1).png"
                    alt=""
                    className="size-6 object-contain"
                  />
                </div>

                <h4 className="break-words text-sm font-bold text-white">
                  {saved.name || "LYNORA Administrator"}
                </h4>

                <p className="mt-1 break-all text-[10px] text-[#AAB0C5]">
                  {saved.email || "No email available"}
                </p>

                <div className="mt-3 space-y-2.5 border-t border-[#383D4E] pt-3">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-[#AAB0C5]">
                      Account Role
                    </span>

                    <span className="font-semibold text-white">
                      Super Admin
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-[#AAB0C5]">
                      Phone Number
                    </span>

                    <span className="font-semibold text-white">
                      {saved.phone || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-[#AAB0C5]">
                      Account Status
                    </span>

                    <span className="font-semibold text-[#42D99A]">
                      {accountStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PLATFORM ACCESS CARD */}

            <div className="rounded-xl border border-[#383D4E] bg-[#0C1122] p-4">
              <h3 className="mb-3 text-sm font-bold text-white">
                Platform Access
              </h3>

              <div className="space-y-3">
                {[
                  {
                    label: "Customer Management",
                    icon: "/icons/user (1).png",
                  },
                  {
                    label: "Organizer Management",
                    icon: "/icons/Attendees.png",
                  },
                  {
                    label: "Concert Management",
                    icon: "/icons/spotlight.png",
                  },
                  {
                    label: "Orders & Transactions",
                    icon: "/icons/ticket.png",
                  },
                  {
                    label: "Reports & Analytics",
                    icon: "/icons/sales (1).png",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#29204D]">
                      <img
                        src={item.icon}
                        alt=""
                        className="size-4 object-contain"
                      />
                    </div>

                    <span className="text-[10px] font-medium text-[#AAB0C5]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ADMIN BANNER */}

            <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#2A1550] via-[#4B2FD9] to-[#7C2FA0] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-md bg-white/15 px-2 py-1 text-[9px] font-bold text-white">
                  LYNORA ADMIN
                </span>

                <span className="text-[9px] text-[#E0D7FF]">
                  Platform Management
                </span>
              </div>

              <h3 className="text-sm font-bold text-white">
                Manage Your Platform. Shape the Experience.
              </h3>

              <p className="mt-2 text-[10px] leading-relaxed text-[#E0D7FF]">
                Oversee the LYNORA ecosystem, manage accounts,
                monitor concert activities, and maintain a seamless
                ticketing experience.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
