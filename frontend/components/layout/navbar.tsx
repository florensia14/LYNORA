
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const C = {
  purple: "#7E54DF",
  gray: "#A9AAB4",
  red: "#C30437",
  white: "#FFFFFF",
};

const menus = [
  { label: "HOME", id: "home" },
  { label: "EVENT", id: "events" },
  { label: "FEATURES", id: "features" },
  { label: "HOW IT WORKS", id: "how-it-works" },
  { label: "FAQ", id: "faq" },
  { label: "CONTACT", id: "contact" },
];

export default function Navbar() {
  const [active, setActive] = useState("home");
  const [hovered, setHovered] = useState("");

  useEffect(() => {
    const sections = menus
      .map((menu) => document.getElementById(menu.id))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => b.intersectionRatio - a.intersectionRatio
          );

        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <header
      style={{
        width: "100%",
        height: 76,
        padding: "0 6%",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        background: "rgba(11,16,32,.96)",
        borderBottom: "1px solid rgba(126,84,223,.5)",
        backdropFilter: "blur(16px)",
      }}
    >
      <Link
        href="/#home"
        style={{
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: 2,
          textDecoration: "none",
          background: "linear-gradient(90deg, #8B5CF6, #22D3EE)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          flexShrink: 0,
        }}
      >
        LYNORA
      </Link>

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 23,
          flexWrap: "wrap",
        }}
      >
        {menus.map((menu) => {
          const isActive = active === menu.id;
          const isHovered = hovered === menu.id;

          return (
            <Link
              key={menu.id}
              href={`/#${menu.id}`}
              onMouseEnter={() => setHovered(menu.id)}
              onMouseLeave={() => setHovered("")}
              style={{
                position: "relative",
                color:
                  isActive || isHovered ? C.purple : C.gray,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1,
                padding: "10px 0",
                textDecoration: "none",
                transition: "all .25s ease",
                whiteSpace: "nowrap",
              }}
            >
              {menu.label}

              <span
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 2,
                  width: isActive ? "100%" : "0%",
                  height: 2,
                  background: C.purple,
                  borderRadius: 5,
                  transition: "width .25s ease",
                }}
              />
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <Link
          href="/login"
          style={{
            color: C.gray,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            textDecoration: "none",
            padding: "9px 15px",
            border: `1px solid ${C.red}`,
            borderRadius: 8,
          }}
        >
          LOGIN
        </Link>

        <Link
          href="/register"
          style={{
            background: C.purple,
            color: C.white,
            padding: "10px 18px",
            border: "none",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1,
            textDecoration: "none",
          }}
        >
          SIGN UP
        </Link>
      </div>
    </header>
  );
}
