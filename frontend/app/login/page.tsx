"use client";

import Image from "next/image";
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

export default function LoginPage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    const data = new FormData(form);

    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "").trim();

    try {
      setIsLoading(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Email or password does not match."
        );
      }

      // Ensure backend sends token
      if (!result.token) {
        throw new Error("Token not found in server response.");
      }

      // Save authentication token
      localStorage.setItem("token", result.token);

      // Save user data if available
      if (result.user) {
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      setIsError(false);
      setMessage("Login successful! Redirecting...");

      // Redirect to main page
      setTimeout(() => {
        router.push("/customer/home");
      }, 800);
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Error contacting server."
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
          <Image src="/icons/back.png" alt="Back" width={32} height={32} />
        </Link>

        <div className="auth-left-content">
          <h1 className="auth-join-title auth-login-title">
            <span className="auth-login-white">WELCOME</span>
            <span className="auth-login-white">BACK</span>
            <span className="auth-login-logo">LYNORA</span>
          </h1>

          <p className="auth-description">
            Welcome back to the front row. Log in to discover
            your favorite concerts, manage your tickets, and
            experience every moment with LYNORA.
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
        <div className="auth-form-wrapper">
          <header className="auth-heading">
            <h2>Welcome Back</h2>
            <p>Log in to keep chasing the front row.</p>
          </header>

          <form className="auth-form" onSubmit={handleLogin}>
            {/* EMAIL */}
            <label className="auth-field">
              <span>EMAIL</span>
              <input
                type="email"
                name="email"
                placeholder="Your email"
                autoComplete="email"
                required
                style={inputStyle}
              />
            </label>

            {/* PASSWORD */}
            <label className="auth-field">
              <span>PASSWORD</span>
              <input
                type="password"
                name="password"
                placeholder="••••••••••••••"
                autoComplete="current-password"
                required
                style={inputStyle}
              />
            </label>

            {/* LOGIN OPTIONS */}
            <div className="auth-options">
              <label className="auth-remember">
                <input type="checkbox" name="remember" />
                <span>Remember Me</span>
              </label>

              <Link
                href="/forgot-password"
                className="auth-small-link"
              >
                Forgot Password?
              </Link>
            </div>

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

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="auth-submit"
              disabled={isLoading}
            >
              {isLoading ? "PLEASE WAIT..." : "LOGIN"}
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
                aria-label={`${social.name} login`}
              >
                <Image src={social.image} alt={social.name} width={32} height={32} />
              </button>
            ))}
          </div>

          {/* REGISTER LINK */}
          <p className="auth-switch">
            No account yet?{" "}
            <Link href="/register">Sign Up</Link>
          </p>
        </div>
      </section>
    </main>
  );
}