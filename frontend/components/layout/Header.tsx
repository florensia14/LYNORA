
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "HOME", href: "#home" },
  { label: "EVENT", href: "#events" },
  { label: "FEATURES", href: "#features" },
  { label: "HOW IT WORKS", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "CONTACT", href: "#contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("#home");

  useEffect(() => {
    const sections = navLinks
      .map((link) => document.querySelector(link.href))
      .filter((section): section is Element => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          );

        if (visibleSections.length > 0) {
          setActive(`#${visibleSections[0].target.id}`);
        }
      },
      {
        rootMargin: "-100px 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const handleNavClick = (href: string) => {
    setActive(href);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B1020]/95 shadow-lg shadow-black/10 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-10">

        {/* LOGO */}
        <Link
          href="/#home"
          onClick={() => handleNavClick("#home")}
          className="shrink-0 bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-[26px] font-extrabold tracking-wide text-transparent"
        >
          LYNORA
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="hidden items-center gap-4 lg:flex xl:gap-5">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => handleNavClick(link.href)}
              className={`whitespace-nowrap border-b-2 pb-1 text-[13px] font-bold tracking-wide transition-colors duration-200 xl:text-[14px] ${
                active === link.href
                  ? "border-[#8B5CF6] text-[#8B5CF6]"
                  : "border-transparent text-[#A9AAB4] hover:text-[#8B5CF6]"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* DESKTOP AUTH BUTTONS */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-lg border border-[#C30437] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#C30437]"
          >
            LOG IN
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#7543e8]"
          >
            SIGN UP
          </Link>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center text-2xl text-white transition hover:text-[#8B5CF6] lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

      {/* MOBILE NAVIGATION */}
      {menuOpen && (
        <div className="border-t border-white/10 bg-[#0B1020] px-5 py-5 shadow-xl lg:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`text-sm font-bold tracking-wide transition-colors ${
                  active === link.href
                    ? "text-[#8B5CF6]"
                    : "text-[#A9AAB4] hover:text-[#8B5CF6]"
                }`}
              >
                {link.label}
              </a>
            ))}

            <div className="flex gap-3 border-t border-white/10 pt-4">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg border border-[#C30437] py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#C30437]"
              >
                LOG IN
              </Link>

              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg bg-[#8B5CF6] py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#7543e8]"
              >
                SIGN UP
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
