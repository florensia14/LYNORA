
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const inputStyle: CSSProperties = {
  width: "100%",
  height: 46,
  padding: "0 14px",
  background: "#080D1B",
  border: "1px solid #46516F",
  borderRadius: 3,
  outline: "none",
  color: "#FFFFFF",
  fontSize: 11,
  fontFamily: "Inter, sans-serif",
};

const socials = [
  { name: "Google", image: "/icons/google.png" },
  { name: "Facebook", image: "/icons/fb.png" },
  { name: "Apple", image: "/icons/apple.png" },
];

export default function RegisterPage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

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

    // Validasi password
    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Password dan Confirm Password tidak sama.");
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage("Password minimal 8 karakter.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Registrasi gagal. Silakan coba lagi."
        );
      }

      // Registrasi berhasil
      setIsError(false);
      setMessage("Registrasi berhasil! Mengalihkan ke halaman Login...");

      form.reset();

      // Arahkan ke halaman Login
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghubungi server."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      {/* LEFT SECTION */}
      <section className="auth-left">
        <Link href="/" className="auth-back" aria-label="Back to home">
          <img src="/icons/back.png" alt="Back" />
        </Link>

        <div className="auth-left-content">
          <h1 className="auth-join-title">
            JOIN
            <span>LYNORA</span>
          </h1>

          <p className="auth-description">
            Experience every moment. Create your account to access
            exclusive live events, front-row drops, and global stages.
          </p>

          <div className="auth-hero-image">
            <img
              src="/images/hero/masuk.jpg"
              alt="Live music concert"
            />

            <img
              className="auth-music-icon"
              src="/icons/musik.png"
              alt="Music"
            />
          </div>
        </div>
      </section>

      {/* RIGHT SECTION */}
      <section className="auth-right">
        <div className="auth-form-wrapper auth-register-wrapper">
          <header className="auth-heading">
            <h2>Start Your Journey</h2>
            <p>Tell us who you are in the ecosystem.</p>
          </header>

          <form
            className="auth-form auth-register-form"
            onSubmit={handleRegister}
          >
            {/* NAME */}
            <label className="auth-field">
              <span>NAME</span>
              <input
                type="text"
                name="name"
                placeholder="Your name"
                autoComplete="name"
                required
                maxLength={100}
                style={inputStyle}
              />
            </label>

            {/* EMAIL */}
            <label className="auth-field">
              <span>EMAIL</span>
              <input
                type="email"
                name="email"
                placeholder="Your email"
                autoComplete="email"
                required
                maxLength={150}
                style={inputStyle}
              />
            </label>

            {/* PASSWORD */}
            <label className="auth-field">
              <span>PASSWORD</span>
              <input
                type="password"
                name="password"
                placeholder="••••••••••"
                autoComplete="new-password"
                minLength={8}
                required
                style={inputStyle}
              />
            </label>

            {/* CONFIRM PASSWORD */}
            <label className="auth-field">
              <span>CONFIRM PASSWORD</span>
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••••••"
                autoComplete="new-password"
                minLength={8}
                required
                style={inputStyle}
              />
            </label>

            {/* PHONE NUMBER */}
            <label className="auth-field auth-phone-field">
              <span>PHONE NUMBER</span>
              <input
                type="tel"
                name="phone"
                placeholder="+62 6xx xxx xxx"
                autoComplete="tel"
                required
                maxLength={20}
                style={inputStyle}
              />
            </label>

            {/* TERMS */}
            <label className="auth-terms">
              <input type="checkbox" name="terms" required />
              <span>
                I agree to the{" "}
                <Link href="/terms">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy-policy">Privacy Policy</Link>.
              </span>
            </label>

            {/* RESPONSE MESSAGE */}
            {message && (
              <p
                className="auth-message"
                role="status"
                aria-live="polite"
                style={{
                  color: isError ? "#FF7777" : "#7ED9A5",
                  fontSize: 12,
                  marginTop: 10,
                }}
              >
                {message}
              </p>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="auth-submit auth-register-submit"
              disabled={isLoading}
            >
              {isLoading ? "PLEASE WAIT..." : "CREATE ACCOUNT"}
            </button>
          </form>

          {/* SOCIAL LOGIN */}
          <div className="auth-divider">
            <span />
            OR CONTINUE
            <span />
          </div>

          <div className="auth-socials">
            {socials.map((social) => (
              <button
                key={social.name}
                type="button"
                className="auth-social-button"
                aria-label={`${social.name} registration`}
              >
                <img src={social.image} alt={social.name} />
              </button>
            ))}
          </div>

          {/* LOGIN LINK */}
          <p className="auth-switch">
            Already have an account?{" "}
            <Link href="/login">Login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
