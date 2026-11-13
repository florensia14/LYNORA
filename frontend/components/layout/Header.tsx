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
  const [active, setActive] = useState("#home");  // Set active link based on initial URL hash; IntersectionObserver removed  // to prevent hydration mismatch between server and client  useEffect(() => {    const hash = location.hash || "#home";    // eslint-disable-next-line react-hooks/set-state-in-effect    setActive(hash);    return () => {};  }, []);


  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B1020]">
      <div className="mx-auto flex min-h-[92px] max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
        <Link
          href="/#home"
          className="shrink-0 bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-[32px] font-extrabold tracking-wide text-transparent"
        >
          LYNORA
        </Link>

        <nav className="hidden items-center gap-5 lg:flex xl:gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setActive(link.href)}
              className={`border-b-2 pb-1 text-[18px] font-bold transition-colors hover:text-[#8B5CF6] ${
                active === link.href
                  ? "border-[#8B5CF6] text-[#8B5CF6]"
                  : "border-transparent text-[#A9AAB4]"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <Link
            href="/login"
            className="rounded-lg border-2 border-[#C30437] px-5 py-1.5 text-[18px] font-bold text-white transition hover:bg-[#C30437]"
          >
            LOG IN
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-[#8B5CF6] px-5 py-1.5 text-[18px] font-bold text-white transition hover:bg-[#7543e8]"
          >
            SIGN UP
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="text-3xl text-white lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-[#0B1020] px-6 py-5 lg:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => {
                  setActive(link.href);
                  setMenuOpen(false);
                }}
                className={`text-sm font-bold transition hover:text-[#8B5CF6] ${
                  active === link.href ? "text-[#8B5CF6]" : "text-[#A9AAB4]"
                }`}
              >
                {link.label}
              </a>
            ))}

            <div className="flex gap-3 pt-2">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg border border-[#C30437] py-2 text-center font-bold text-white"
              >
                LOG IN
              </Link>

              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg bg-[#8B5CF6] py-2 text-center font-bold text-white"
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