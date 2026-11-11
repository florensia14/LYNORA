
"use client";

import { useState, type FormEvent, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AuthPageProps = {
  mode: "login" | "register";
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === "register";
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);

    setMessage("");
    setIsError(false);

    if (!isRegister) {
      setIsError(true);
      setMessage("Form Login belum dihubungkan ke backend.");
      return;
    }

    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Password dan konfirmasi password belum sama.");
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage("Password minimal 8 karakter.");
      return;
    }

    try {
      setIsLoading(true);

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

      setIsError(false);
      setMessage("Registrasi berhasil! Mengalihkan ke halaman Login...");

      form.reset();

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

  const inputStyle: CSSProperties = {
    width: "100%",
    height: 43,
    background: "#080D1B",
    border: "1px solid #3A4562",
    borderRadius: 3,
    padding: "0 13px",
    color: "#FFFFFF",
    outline: "none",
    fontSize: 12,
  };

  const labelStyle: CSSProperties = {
    display: "block",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.4px",
    marginBottom: 5,
  };

  return (
    <main className="auth-page">
      <section className="auth-left">
        <Link href="/" className="auth-back" aria-label="Kembali">
          <span>←</span>
        </Link>

        <div className="auth-brand">
          <h1>
            JOIN
            <span>LYNORA</span>
          </h1>

          <p>
            Experience every moment. Create
            your account to access exclusive
            live events, front-row drops, and
            global stages.
          </p>

          <div className="auth-hero">
            <img
              src="/images/masuk.jpg"
              alt="Suasana konser LYNORA"
              className="auth-hero-image"
            />
            <img
              src="/images/musik.png"
              alt=""
              className="auth-music-icon"
            />
          </div>
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-form-wrapper">
          <header className="auth-heading">
            <h2>
              {isRegister ? "Start Your Journey" : "Welcome Back"}
            </h2>
            <p>
              {isRegister
                ? "Tell us who you are in the ecosystem."
                : "Log in to keep chasing the front row."}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <div className="auth-field">
                <label style={labelStyle}>NAME</label>
                <input
                  name="name"
                  placeholder="Your name"
                  autoComplete="name"
                  required
                  style={inputStyle}
                />
              </div>
            )}

            <div className="auth-field">
              <label style={labelStyle}>EMAIL</label>
              <input
                name="email"
                type="email"
                placeholder="Your email"
                autoComplete="email"
                required
                style={inputStyle}
              />
            </div>

            <div className="auth-field">
              <label style={labelStyle}>PASSWORD</label>
              <input
                name="password"
                type="password"
                placeholder="••••••••••••"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={isRegister ? 8 : 1}
                style={inputStyle}
              />
            </div>

            {isRegister && (
              <div className="auth-field">
                <label style={labelStyle}>CONFIRM PASSWORD</label>
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  style={inputStyle}
                />
              </div>
            )}

            {isRegister ? (
              <div className="auth-field auth-phone">
                <label style={labelStyle}>PHONE NUMBER</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="+62 6xx xxx xxx"
                  autoComplete="tel"
                  required
                  style={inputStyle}
                />
              </div>
            ) : (
              <div className="auth-options">
                <label>
                  <input type="checkbox" />
                  <span>Remember Me</span>
                </label>
                <Link href="/forgot-password">Forgot Password?</Link>
              </div>
            )}

            {isRegister && (
              <label className="auth-terms">
                <input type="checkbox" required />
                <span>
                  I agree to the <a href="/terms">Terms of Service</a> and{" "}
                  <a href="/privacy">Privacy Policy</a>.
                </span>
              </label>
            )}

            {message && (
              <p
                className="auth-message"
                style={{ color: isError ? "#FF7777" : "#7ED9A5" }}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={isLoading}
            >
              {isLoading
                ? "PLEASE WAIT..."
                : isRegister
                  ? "CREATE ACCOUNT"
                  : "LOGIN"}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <p>OR CONTINUE</p>
            <span />
          </div>

          <div className="auth-socials">
            <button type="button" aria-label="Google">
              <img src="/images/google.png" alt="Google" />
            </button>
            <button type="button" aria-label="Facebook">
              <img src="/images/fb.png" alt="Facebook" />
            </button>
            <button type="button" aria-label="Apple">
              <img src="/images/apple.png" alt="Apple" />
            </button>
          </div>

          <p className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <Link href={isRegister ? "/login" : "/register"}>
              {isRegister ? "Login" : "Sign Up"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
