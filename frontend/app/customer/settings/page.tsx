
"use client";

import { useEffect, useState } from "react";
import CustomerShell from "@/components/layout/CustomerShell";

type ToggleKey =
  | "emailNotif"
  | "pushNotif"
  | "promoEmail"
  | "reminder"
  | "securityAlert"
  | "marketingNotif";

type SettingsData = {
  notifications: Record<ToggleKey, boolean>;
  language: string;
  currency: string;
  privacy: {
    activityTracking: boolean;
    personalizedOffers: boolean;
  };
};

const STORAGE_KEY = "lynora_account_settings";

const DEFAULT_SETTINGS: SettingsData = {
  notifications: {
    emailNotif: true,
    pushNotif: true,
    promoEmail: false,
    reminder: true,
    securityAlert: true,
    marketingNotif: false,
  },
  language: "en",
  currency: "idr",
  privacy: {
    activityTracking: true,
    personalizedOffers: false,
  },
};

const categories = [
  { id: "security", label: "Security & Login", icon: "🔐" },
  { id: "notifications", label: "Notification Preferences", icon: "🔔" },
  { id: "display", label: "Display & Language", icon: "🌐" },
  { id: "privacy", label: "Data Privacy", icon: "🛡️" },
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-all ${
        checked ? "bg-[#8B5CF6]" : "bg-[#34394A]"
      }`}
    >
      <span
        className={`absolute top-1 size-4 rounded-full bg-white transition-all ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#303548] py-4 last:border-0">
      <div className="min-w-0">
        <h4 className="text-[13px] font-semibold text-white">
          {title}
        </h4>
        <p className="mt-1 text-[11px] leading-relaxed text-[#AAB0C5]">
          {description}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

const card =
  "rounded-xl border border-[#303548] bg-[#171B26] p-5";

const input =
  "w-full rounded-lg border border-[#383D4E] bg-[#0C1122] px-3 py-2.5 text-xs text-white outline-none transition focus:border-[#8B5CF6]";

const primaryButton =
  "rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#7847E8] disabled:cursor-not-allowed disabled:opacity-50";

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<SettingsData>(DEFAULT_SETTINGS);

  const [activeCategory, setActiveCategory] = useState("security");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  const [password, setPassword] = useState({
    current: "",
    newPassword: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  // Load settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...parsed.notifications,
          },
          privacy: {
            ...DEFAULT_SETTINGS.privacy,
            ...parsed.privacy,
          },
        });
      }
    } catch {
      console.error("Failed to load settings");
    }

    setLoaded(true);
  }, []);

  // Save settings
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [settings, loaded]);

  function toggleNotification(key: ToggleKey) {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  }

  function togglePrivacy(key: keyof SettingsData["privacy"]) {
    setSettings((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: !prev.privacy[key],
      },
    }));
  }

  function resetSettings() {
    if (!window.confirm("Reset all settings to default?")) return;

    setSettings(DEFAULT_SETTINGS);
    setPasswordMessage("");
    setPassword({
      current: "",
      newPassword: "",
      confirm: "",
    });
  }

  function downloadSettings() {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "lynora-settings.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  function handlePasswordSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setPasswordMessage("");

    if (!password.current || !password.newPassword || !password.confirm) {
      setPasswordMessage("Please complete all password fields.");
      return;
    }

    if (password.newPassword.length < 8) {
      setPasswordMessage(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (password.newPassword !== password.confirm) {
      setPasswordMessage("New password confirmation does not match.");
      return;
    }

    if (password.current === password.newPassword) {
      setPasswordMessage(
        "Your new password must be different from your current password."
      );
      return;
    }

    // Password updates must be connected to a secure backend.
    setPasswordMessage(
      "Validation successful. Connect your password update API to complete this action."
    );
  }

  if (!loaded) return null;

  return (
    <CustomerShell
      title="Settings"
      subtitle="Manage your account, preferences and security"
    >
      <div className="mx-auto max-w-[1150px] space-y-5">

        {/* HEADER */}
        <div className="rounded-xl border border-[#30264C] bg-gradient-to-r from-[#211D3E] to-[#171B26] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#8B5CF6]">
                LYNORA ACCOUNT CONFIGURATION
              </span>
              <h2 className="mt-2 text-lg font-bold text-white">
                Account Settings
              </h2>
              <p className="mt-1 text-[11px] text-[#AAB0C5]">
                Manage your security preferences, payment methods,
                notification preferences and privacy settings.
              </p>
            </div>

            <div className="rounded-lg border border-[#167A68] bg-[#103C36] px-3 py-2">
              <span className="block text-[9px] text-[#AAB0C5]">
                SETTINGS STATUS
              </span>
              <span className="text-xs font-bold text-[#43D9A1]">
                ✓ {saved ? "Saved" : "Not Saved"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">

          {/* CATEGORY SIDEBAR */}
          <aside className={card}>
            <h3 className="mb-4 text-xs font-bold text-white">
              SETTINGS CATEGORIES
            </h3>

            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${
                    activeCategory === category.id
                      ? "border border-[#514080] bg-[#292044] text-white"
                      : "text-[#AAB0C5] hover:bg-[#202535]"
                  }`}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#303044] text-base">
                    {category.icon}
                  </span>

                  <span className="min-w-0 flex-1 text-[11px] font-semibold">
                    {category.label}
                  </span>

                  <span className="text-sm">›</span>
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-[#303548] pt-4">
              <p className="text-[10px] text-[#AAB0C5]">
                Need help with your account?
              </p>
              <button
                type="button"
                onClick={() => window.location.href = "mailto:support@lynora.com"}
                className="mt-2 text-[11px] font-semibold text-[#A78BFA]"
              >
                Contact Support →
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0 space-y-5">

            {/* SECURITY */}
            {activeCategory === "security" && (
              <>
                <section className={card}>
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-white">
                      Change Password
                    </h3>
                    <p className="mt-1 text-[11px] text-[#AAB0C5]">
                      Update your password to keep your account secure.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordSubmit}>
                    <div className="space-y-4">
                      {[
                        {
                          key: "current",
                          label: "Current Password",
                        },
                        {
                          key: "newPassword",
                          label: "New Password",
                        },
                        {
                          key: "confirm",
                          label: "Confirm New Password",
                        },
                      ].map((field) => (
                        <div key={field.key}>
                          <label className="mb-2 block text-[11px] font-semibold text-[#AAB0C5]">
                            {field.label}
                          </label>

                          <input
                            type={showPassword ? "text" : "password"}
                            value={
                              password[field.key as keyof typeof password]
                            }
                            onChange={(e) =>
                              setPassword((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            className={input}
                            placeholder="Enter password"
                            autoComplete={
                              field.key === "current"
                                ? "current-password"
                                : "new-password"
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-[10px] text-[#AAB0C5]">
                      <input
                        type="checkbox"
                        checked={showPassword}
                        onChange={() => setShowPassword(!showPassword)}
                      />
                      Show passwords
                    </label>

                    {passwordMessage && (
                      <p className="mt-3 rounded-lg border border-[#514080] bg-[#211D3E] p-3 text-[11px] text-[#C7BBFF]">
                        {passwordMessage}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPassword({
                            current: "",
                            newPassword: "",
                            confirm: "",
                          });
                          setPasswordMessage("");
                        }}
                        className="rounded-lg border border-[#383D4E] px-4 py-2 text-xs text-[#AAB0C5]"
                      >
                        Cancel
                      </button>

                      <button type="submit" className={primaryButton}>
                        Update Password
                      </button>
                    </div>
                  </form>
                </section>

                <section className={card}>
                  <h3 className="text-sm font-bold text-white">
                    Two-Factor Authentication (2FA)
                  </h3>
                  <p className="mt-1 text-[11px] text-[#AAB0C5]">
                    Add an extra layer of protection to your LYNORA account.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#303548] bg-[#0C1122] p-4">
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Two-Factor Authentication
                      </p>
                      <p className="mt-1 text-[10px] text-[#AAB0C5]">
                        Protect your account with an additional verification step.
                      </p>
                    </div>
                    <span className="rounded-full bg-[#33294E] px-3 py-1 text-[10px] font-bold text-[#C7BBFF]">
                      Not Configured
                    </span>
                  </div>
                  <p className="mt-3 text-[10px] text-[#AAB0C5]">
                    Actual 2FA activation requires backend authentication support.
                  </p>
                </section>
              </>
            )}

            {/* NOTIFICATIONS */}
            {activeCategory === "notifications" && (
              <section className={card}>
                <h3 className="text-sm font-bold text-white">
                  Notification Preferences
                </h3>
                <p className="mt-1 text-[11px] text-[#AAB0C5]">
                  Choose which updates you want to receive.
                </p>

                <div className="mt-4">
                  <SettingRow
                    title="Email Notifications"
                    description="Receive purchase confirmations and ticket updates."
                    checked={settings.notifications.emailNotif}
                    onChange={() => toggleNotification("emailNotif")}
                  />
                  <SettingRow
                    title="Push Notifications"
                    description="Receive real-time updates on your device."
                    checked={settings.notifications.pushNotif}
                    onChange={() => toggleNotification("pushNotif")}
                  />
                  <SettingRow
                    title="Concert Reminders"
                    description="Get reminders before your upcoming concerts."
                    checked={settings.notifications.reminder}
                    onChange={() => toggleNotification("reminder")}
                  />
                  <SettingRow
                    title="Promotional Emails"
                    description="Receive exclusive discounts and presale information."
                    checked={settings.notifications.promoEmail}
                    onChange={() => toggleNotification("promoEmail")}
                  />
                  <SettingRow
                    title="Security Alerts"
                    description="Get alerts about important account activity."
                    checked={settings.notifications.securityAlert}
                    onChange={() => toggleNotification("securityAlert")}
                  />
                  <SettingRow
                    title="Marketing Updates"
                    description="Receive news about new artists and events."
                    checked={settings.notifications.marketingNotif}
                    onChange={() => toggleNotification("marketingNotif")}
                  />
                </div>
              </section>
            )}

            {/* DISPLAY */}
            {activeCategory === "display" && (
              <section className={card}>
                <h3 className="text-sm font-bold text-white">
                  Display & Language
                </h3>
                <p className="mt-1 text-[11px] text-[#AAB0C5]">
                  Customize your LYNORA experience.
                </p>

                <div className="mt-5 space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-white">
                      Language
                    </label>
                    <select
                      className={input}
                      value={settings.language}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          language: e.target.value,
                        }))
                      }
                    >
                      <option value="en">English</option>
                      <option value="id">Bahasa Indonesia</option>
                    </select>
                    <p className="mt-1 text-[10px] text-[#AAB0C5]">
                      Selected language preference.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-white">
                      Currency
                    </label>
                    <select
                      className={input}
                      value={settings.currency}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          currency: e.target.value,
                        }))
                      }
                    >
                      <option value="idr">IDR — Indonesian Rupiah</option>
                      <option value="usd">USD — US Dollar</option>
                    </select>
                    <p className="mt-1 text-[10px] text-[#AAB0C5]">
                      Selected currency preference for displaying prices.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#383D4E] bg-[#0C1122] p-4">
                    <p className="text-xs font-semibold text-white">
                      Current Preferences
                    </p>
                    <div className="mt-3 flex justify-between text-[11px]">
                      <span className="text-[#AAB0C5]">Language</span>
                      <span className="text-white">
                        {settings.language === "en" ? "English" : "Indonesia"}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between text-[11px]">
                      <span className="text-[#AAB0C5]">Currency</span>
                      <span className="text-white">
                        {settings.currency.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* PRIVACY */}
            {activeCategory === "privacy" && (
              <>
                <section className={card}>
                  <h3 className="text-sm font-bold text-white">
                    Data Privacy
                  </h3>
                  <p className="mt-1 text-[11px] text-[#AAB0C5]">
                    Control how your preferences and activity are used.
                  </p>

                  <div className="mt-4">
                    <SettingRow
                      title="Activity Tracking"
                      description="Allow LYNORA to use your activity to improve your experience."
                      checked={settings.privacy.activityTracking}
                      onChange={() => togglePrivacy("activityTracking")}
                    />
                    <SettingRow
                      title="Personalized Offers"
                      description="Receive offers based on your favorite concerts and interests."
                      checked={settings.privacy.personalizedOffers}
                      onChange={() => togglePrivacy("personalizedOffers")}
                    />
                  </div>
                </section>

                <section className={card}>
                  <h3 className="text-sm font-bold text-white">
                    Download Your Data
                  </h3>
                  <p className="mt-1 text-[11px] text-[#AAB0C5]">
                    Download a JSON copy of your current local preferences.
                  </p>

                  <button
                    type="button"
                    onClick={downloadSettings}
                    className={`${primaryButton} mt-4`}
                  >
                    ↓ Download Settings Data
                  </button>
                </section>
              </>
            )}

            {/* GENERAL ACTIONS */}
            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Reset Preferences
                  </h3>
                  <p className="mt-1 text-[10px] text-[#AAB0C5]">
                    Restore notification, language and privacy settings to default.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetSettings}
                  className="rounded-lg border border-[#7A3A4A] px-4 py-2 text-[11px] font-semibold text-[#FF9EAE] hover:bg-[#7A3A4A]/20"
                >
                  Reset Settings
                </button>
              </div>
            </section>

          </main>
        </div>
      </div>
    </CustomerShell>
  );
}
