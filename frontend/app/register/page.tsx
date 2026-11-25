"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const DRAFT_KEY = "lynora_register_draft";
const PENDING_KEY = "lynora_registration_pending";
const CHECK_INTERVAL_SECONDS = 10;

const inputStyle: CSSProperties = {
  width: "100%",
  height: 46,
  padding: "0 14px",
  background: "#080D1B",
  border: "1px solid #46516F",
  borderRadius: 6,
  outline: "none",
  color: "#FFFFFF",
  fontSize: 12,
  fontFamily: "Inter, sans-serif",
};

const socials = [
  { name: "Google", image: "/icons/google.png" },
  { name: "Facebook", image: "/icons/fb.png" },
  { name: "Apple", image: "/icons/apple.png" },
];

type RegisterDraft = {
  name: string;
  email: string;
  phone: string;
  terms: boolean;
};

type PendingRegistration = {
  email: string;
  phone: string;
  nextCheckAt: number;
};

export default function RegisterPage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [draft, setDraft] = useState<RegisterDraft>({
    name: "",
    email: "",
    phone: "",
    terms: false,
  });
  const [pending, setPending] = useState<PendingRegistration | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(DRAFT_KEY);
      if (savedDraft) setDraft((current) => ({ ...current, ...JSON.parse(savedDraft) }));

      const savedPending = sessionStorage.getItem(PENDING_KEY);
      if (savedPending) {
        const parsed = JSON.parse(savedPending) as PendingRegistration;
        setPending(parsed);
        setSecondsLeft(Math.max(0, Math.ceil((parsed.nextCheckAt - Date.now()) / 1000)));
        setMessage("Your account is awaiting Super Admin approval.");
        setIsError(false);
      }
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(PENDING_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  useEffect(() => {
    if (!pending) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((pending.nextCheckAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  function updateDraft(field: keyof RegisterDraft, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function beginPending(email: string, phone: string) {
    const next = {
      email,
      phone,
      nextCheckAt: Date.now() + CHECK_INTERVAL_SECONDS * 1000,
    };
    setPending(next);
    setSecondsLeft(CHECK_INTERVAL_SECONDS);
    setIsError(false);
    setMessage("Your account is awaiting Super Admin approval.");
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
  }

  async function handleCheckStatus() {
    if (!pending || secondsLeft > 0 || isCheckingStatus) return;

    try {
      setIsCheckingStatus(true);
      const params = new URLSearchParams({
        email: pending.email,
        phone: pending.phone,
      });
      const response = await fetch(`${API_URL}/auth/registration-status?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));

      if (result.status === "approved") {
        sessionStorage.removeItem(PENDING_KEY);
        sessionStorage.setItem("lynora_login_email", pending.email);
        setPending(null);
        setIsError(false);
        setMessage("Your account has been approved. Redirecting you to login...");
        window.setTimeout(() => router.push("/login"), 1000);
        return;
      }

      if (result.status === "rejected") {
        sessionStorage.removeItem(PENDING_KEY);
        setPending(null);
        setIsError(true);
        setMessage("Sorry, your registration has been rejected by the LYNORA Super Admin.");
        return;
      }

      if (!response.ok && result.status !== "not_found") {
        throw new Error(result.message || "Unable to check registration status.");
      }

      if (result.status === "not_found") {
        setIsError(true);
        setMessage(result.message || "Registration could not be found.");
        return;
      }

      beginPending(pending.email, pending.phone);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to check registration status.");
      // Keep the cooldown so repeated requests are not sent rapidly.
      beginPending(pending.email, pending.phone);
    } finally {
      setIsCheckingStatus(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Password and Confirm Password do not match.");
      return;
    }
    if (password.length < 8) {
      setIsError(true);
      setMessage("Password must be at least 8 characters.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const result = await response.json().catch(() => ({}));

      if (result.code === "REGISTRATION_PENDING") {
        beginPending(email, phone);
        return;
      }
      if (result.code === "REGISTRATION_REJECTED") {
        setIsError(true);
        setMessage("Sorry, your registration has been rejected by the LYNORA Super Admin.");
        return;
      }
      if (!response.ok) {
        throw new Error(result.message || "Registration failed. Please try again.");
      }

      setDraft({ name, email, phone, terms: true });
      beginPending(email, phone);
      setMessage("Your account is awaiting Super Admin approval.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Error contacting server.");
    } finally {
      setIsLoading(false);
    }
  }

  const passwordInputStyle = { ...inputStyle, paddingRight: 46 };
  const eyeButtonStyle: CSSProperties = {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    width: 24,
    height: 24,
    padding: 0,
    border: 0,
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  return (
    <main className="auth-page">
      <section className="auth-left">
        <Link href="/" className="auth-back"aria-label="Back to home"
        onClick={() => { sessionStorage.removeItem("lynora_register_draft"); sessionStorage.removeItem("lynora_registration_pending");}}>
          <Image src="/icons/back.png" alt="Back" width={32} height={32} />
        </Link>
        <div className="auth-left-content">
          <h1 className="auth-join-title">JOIN<span>LYNORA</span></h1>
          <p className="auth-description">
            Experience every moment. Create your account to access
            exclusive live events, front-row drops, and global stages.
          </p>
          <div className="auth-hero-image">
            <img src="/images/hero/masuk.jpg" alt="Live music concert" />
            <img className="auth-music-icon" src="/icons/musik.png" alt="Music" />
          </div>
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-form-wrapper auth-register-wrapper">
          <header className="auth-heading">
            <h2>Start Your Journey</h2>
            <p>Tell us who you are in the ecosystem.</p>
          </header>

          <form className="auth-form auth-register-form" onSubmit={handleRegister}>
            <label className="auth-field">
              <span>NAME</span>
              <input
                type="text" name="name" placeholder="Your name"
                autoComplete="name" required maxLength={100}
                style={inputStyle} value={draft.name}
                onChange={(e) => updateDraft("name", e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>EMAIL</span>
              <input
                type="email" name="email" placeholder="Your email"
                autoComplete="email" required maxLength={150}
                style={inputStyle} value={draft.email}
                onChange={(e) => updateDraft("email", e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>PASSWORD</span>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type={showPassword ? "text" : "password"} name="password"
                  placeholder="••••••••••" autoComplete="new-password"
                  minLength={8} required style={passwordInputStyle}
                />
                <button type="button" style={eyeButtonStyle}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  <Image src="/icons/eye%20(1).png" alt="" width={20} height={20} />
                </button>
              </div>
            </label>

            <label className="auth-field">
              <span>CONFIRM PASSWORD</span>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"} name="confirmPassword"
                  placeholder="••••••••••" autoComplete="new-password"
                  minLength={8} required style={passwordInputStyle}
                />
                <button type="button" style={eyeButtonStyle}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                  <Image src="/icons/eye%20(1).png" alt="" width={20} height={20} />
                </button>
              </div>
            </label>

            <label className="auth-field auth-phone-field">
              <span>PHONE NUMBER</span>
              <input
                type="tel" name="phone" placeholder="+62 6xx xxx xxx"
                autoComplete="tel" required maxLength={20}
                style={inputStyle} value={draft.phone}
                onChange={(e) => updateDraft("phone", e.target.value)}
              />
            </label>

            <label className="auth-terms">
              <input type="checkbox" name="terms" required checked={draft.terms}
                onChange={(e) => updateDraft("terms", e.target.checked)} />
              <span>
                I agree to the <Link href="/terms">Terms of Service</Link>
                {" "}and <Link href="/privacy-policy">Privacy Policy</Link>.
              </span>
            </label>

            {message && (
              <p className="auth-message" role="status" aria-live="polite"
                style={{ color: isError ? "#FF7777" : "#7ED9A5", fontSize: 12, marginTop: 10 }}>
                {message}
              </p>
            )}

            {pending && (
              <div style={{ marginTop: 8, padding: "10px 12px", border: "1px solid #46516F", borderRadius: 8, background: "#111A30" }}>
                <p style={{ color: "#B9C4DA", fontSize: 11, margin: "0 0 8px" }}>
                  Check your approval status. You can check again in {secondsLeft}s.
                </p>
                <button type="button" onClick={handleCheckStatus}
                  disabled={secondsLeft > 0 || isCheckingStatus}
                  style={{
                    width: "100%", minHeight: 36, border: 0, borderRadius: 6,
                    color: "#FFFFFF", fontWeight: 700, fontSize: 11,
                    background: secondsLeft > 0 || isCheckingStatus ? "#46516F" : "linear-gradient(90deg,#8B5CF6,#5456DE)",
                    cursor: secondsLeft > 0 || isCheckingStatus ? "not-allowed" : "pointer",
                  }}>
                  {isCheckingStatus ? "CHECKING..." : secondsLeft > 0 ? `CHECK STATUS (${secondsLeft}s)` : "CHECK STATUS"}
                </button>
              </div>
            )}

            <button type="submit" className="auth-submit auth-register-submit"
              disabled={isLoading || Boolean(pending)}>
              {isLoading ? "PLEASE WAIT..." : pending ? "AWAITING APPROVAL" : "CREATE ACCOUNT"}
            </button>
          </form>

          <div className="auth-divider"><span />OR CONTINUE<span /></div>
          <div className="auth-socials">
            {socials.map((social) => (
              <button key={social.name} type="button" className="auth-social-button"
                aria-label={`${social.name} registration`}>
                <Image src={social.image} alt={social.name} width={32} height={32} />
              </button>
            ))}
          </div>
          <p className="auth-switch">
            Already have an account? <Link href="/login" onClick={() => { sessionStorage.removeItem(DRAFT_KEY); }}>Login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
