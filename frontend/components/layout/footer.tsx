
import Link from "next/link";
import type { CSSProperties } from "react";

const C = {
  bg: "#0B1020",
  gray: "#858BA4",
  white: "#FFFFFF",
  line: "#343B50",
};

const headingStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  letterSpacing: 1,
  margin: "8px 0 25px",
};

const linkListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 17,
};

const footerLinkStyle: CSSProperties = {
  color: C.gray,
  fontSize: 14,
  textDecoration: "none",
  transition: "color .2s ease",
};

export default function Footer() {
  return (
    <footer
      style={{
        background: C.bg,
        color: C.white,
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: 1250,
          margin: "0 auto",
          padding: "55px 6% 65px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 40,
        }}
      >
        <div>
          <Link
            href="/#home"
            style={{
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: 1,
              textDecoration: "none",
              background: "linear-gradient(90deg, #8B5CF6, #22D3EE)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            LYNORA
          </Link>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.8,
              marginTop: 22,
              maxWidth: 270,
              color: C.white,
            }}
          >
            The pulse of live music. Discover, book, and experience
            unforgettable concerts, all from one platform.
          </p>
        </div>

        <div>
          <h3 style={headingStyle}>EXPLORE</h3>
          <div style={linkListStyle}>
            <Link href="/#home" style={footerLinkStyle}>Home</Link>
            <Link href="/#events" style={footerLinkStyle}>Events</Link>
            <Link href="/#features" style={footerLinkStyle}>Features</Link>
            <Link href="/#how-it-works" style={footerLinkStyle}>How It Works</Link>
          </div>
        </div>

        <div>
          <h3 style={headingStyle}>SUPPORT</h3>
          <div style={linkListStyle}>
            <Link href="/#faq" style={footerLinkStyle}>FAQ</Link>
            <Link href="/#contact" style={footerLinkStyle}>Contact</Link>
            <Link href="/refund-policy" style={footerLinkStyle}>Refund Policy</Link>
            <Link href="/terms" style={footerLinkStyle}>Terms of Service</Link>
          </div>
        </div>

        <div>
          <h3 style={headingStyle}>STAY IN THE LOOP</h3>
          <div style={linkListStyle}>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" style={footerLinkStyle}>
              Instagram
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" style={footerLinkStyle}>
              Twitter
            </a>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${C.line}`,
          padding: "22px 6%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 15,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#C1C4D0", fontSize: 13 }}>
          © 2026 Lynora. All rights reserved.
        </span>

        <span style={{ color: "#C1C4D0", fontSize: 13 }}>
          Made for people who live for the encore.
        </span>
      </div>
    </footer>
  );
}
