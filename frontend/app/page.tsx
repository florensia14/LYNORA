"use client";

import { useState } from "react";

const categories = [
  {
    name: "POP",
    sub: "Popular",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "ROCK",
    sub: "Rock",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "EDM",
    sub: "Electronic",
    image:
      "https://images.unsplash.com/photo-1571266028243-d220c19c9f6b?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "HIP-HOP",
    sub: "Hip Hop",
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "JAZZ",
    sub: "Jazz",
    image:
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "INDIE",
    sub: "Indie",
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "CLASSICAL",
    sub: "Classical",
    image:
      "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "ACOUSTIC",
    sub: "Acoustic",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "K-POP",
    sub: "Korean Pop",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "R&B",
    sub: "Rhythm & Blues",
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "METAL",
    sub: "Metal",
    image:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "FESTIVAL",
    sub: "Festival",
    image:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80",
  },
];

const featuredConcerts = [
  {
    title: "LANY - Soft World Tour",
    location: "Jakarta",
    date: "24 AUG 2026",
    price: "Rp 850.000",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Avenged Sevenfold",
    location: "Gelora Bung Karno",
    date: "10 SEP 2026",
    price: "Rp 1.250.000",
    image:
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Synchronize Fest 2026",
    location: "Jakarta",
    date: "30 NOV 2026",
    price: "Rp 650.000",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1000&q=85",
  },
];

const trendingConcerts = [
  {
    title: "Coldplay - Music of the Spheres",
    location: "Gelora Bung Karno",
    price: "Rp 1.950.000",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Taylor Swift - RED Tour",
    location: "Singapore National Stadium",
    price: "Rp 4.500.000",
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "BTS - WINOS Tour",
    location: "KSPO Dome - Seoul",
    price: "Rp 1.050.000",
    image:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=85",
  },
];

const faqs = [
  {
    question: "How do I buy a ticket on Lynora?",
    answer:
      "Choose your favorite concert, select your ticket category, and continue to secure checkout. Your e-ticket will be delivered to your Lynora account after successful payment.",
  },
  {
    question: "Is my payment information secure?",
    answer:
      "Yes. Lynora is designed with secure payment processing and protects your transaction information throughout the checkout process.",
  },
  {
    question: "Can I get a refund if I can't attend?",
    answer:
      "Refund availability depends on the event organizer's refund policy. You can check the policy on the concert details page before purchasing.",
  },
  {
    question: "How will I receive my ticket?",
    answer:
      "Your digital ticket will be available through your Lynora account after your payment has been successfully confirmed.",
  },
  {
    question: "Can I transfer my ticket to someone else?",
    answer:
      "Some events allow ticket transfers. The availability of this feature depends on the event organizer.",
  },
  {
    question: "What if the concert is cancelled or rescheduled?",
    answer:
      "If an event is cancelled or rescheduled, Lynora will provide information and instructions based on the organizer's official policy.",
  },
  {
    question: "Do you charge additional booking fees?",
    answer:
      "Any applicable fees will be shown clearly during checkout before you confirm your purchase.",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0B1020] text-white">

      {/* =========================================================
          NAVBAR
      ========================================================= */}
      <header className="fixed left-0 top-0 z-50 w-full border-b border-white/5 bg-[#0B1020]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1400px] items-center px-6 lg:px-10">

          {/* Logo */}
          <a
            href="#home"
            className="bg-gradient-to-r from-[#8B5CF6] via-[#764ED1] to-[#22D3EE] bg-clip-text text-2xl font-black tracking-wider text-transparent"
          >
            LYNORA
          </a>

          {/* Desktop Navigation */}
          <nav className="ml-auto hidden items-center gap-8 lg:flex">
            {[
              ["HOME", "#home"],
              ["EVENT", "#concerts"],
              ["FEATURES", "#features"],
              ["HOW IT WORKS", "#how-it-works"],
              ["FAQ", "#faq"],
              ["CONTACT", "#contact"],
            ].map(([label, href], index) => (
              <a
                key={label}
                href={href}
                className={`relative text-[11px] font-bold tracking-wide transition hover:text-[#8B5CF6] ${
                  index === 0 ? "text-[#8B5CF6]" : "text-slate-300"
                }`}
              >
                {label}

                {index === 0 && (
                  <span className="absolute -bottom-3 left-0 h-[2px] w-full bg-[#8B5CF6]" />
                )}
              </a>
            ))}
          </nav>

          {/* Desktop Buttons */}
          <div className="ml-8 hidden items-center gap-2 sm:flex">
            <button className="rounded-md border border-[#C30437] px-5 py-2 text-[10px] font-extrabold transition hover:bg-[#C30437]/10">
              LOG IN
            </button>

            <button className="rounded-md bg-gradient-to-r from-[#8B5CF6] to-[#764ED1] px-5 py-2 text-[10px] font-extrabold shadow-lg shadow-[#8B5CF6]/20 transition hover:-translate-y-0.5">
              SIGN UP
            </button>
          </div>

          {/* Mobile Menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ml-auto text-2xl text-white lg:hidden"
          >
            {menuOpen ? "×" : "☰"}
          </button>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="border-t border-white/5 bg-[#0B1020]/98 px-6 py-6 lg:hidden">
            <nav className="flex flex-col gap-5">
              {[
                ["HOME", "#home"],
                ["EVENT", "#concerts"],
                ["FEATURES", "#features"],
                ["HOW IT WORKS", "#how-it-works"],
                ["FAQ", "#faq"],
                ["CONTACT", "#contact"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-bold text-slate-300 transition hover:text-[#8B5CF6]"
                >
                  {label}
                </a>
              ))}

              <div className="mt-3 flex gap-3">
                <button className="flex-1 rounded-md border border-[#C30437] py-3 text-xs font-bold">
                  LOG IN
                </button>

                <button className="flex-1 rounded-md bg-[#8B5CF6] py-3 text-xs font-bold">
                  SIGN UP
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* =========================================================
          HERO
      ========================================================= */}
      <section
        id="home"
        className="relative flex min-h-[850px] items-center overflow-hidden px-6 pt-24 lg:min-h-screen lg:px-10"
      >
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(5,8,20,.98) 0%, rgba(5,8,20,.88) 35%, rgba(5,8,20,.42) 65%, rgba(5,8,20,.75) 100%), url('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=2200&q=90')",
          }}
        />

        {/* Purple / blue glow */}
        <div className="absolute left-[-10%] top-[20%] h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/10 blur-[130px]" />
        <div className="absolute right-[5%] top-[35%] h-[450px] w-[450px] rounded-full bg-[#22D3EE]/10 blur-[140px]" />

        {/* Content */}
        <div className="relative z-10 mx-auto w-full max-w-[1400px]">

          <div className="max-w-4xl">
            <p className="mb-5 flex items-center gap-3 text-xs font-bold tracking-[2px] text-slate-200 sm:text-sm">
              <span className="h-[2px] w-7 bg-[#8B5CF6]" />
              THE PULSE OF LIVE MUSIC
            </p>

            <h1 className="text-[52px] font-black leading-[0.94] tracking-tight sm:text-[70px] md:text-[82px] lg:text-[100px]">
              Experience
              <br />
              <span className="bg-gradient-to-r from-[#8B5CF6] via-[#764ED1] to-[#22D3EE] bg-clip-text text-transparent">
                Every Moment
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base lg:text-lg">
              Step into the front row of the digital music revolution.
              Discover exclusive concerts, legendary venues, and the pure
              energy of the crowd.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#concerts"
                className="inline-flex items-center justify-center gap-3 rounded-md bg-gradient-to-r from-[#8B5CF6] via-[#764ED1] to-[#22D3EE] px-7 py-4 text-xs font-extrabold shadow-xl shadow-[#8B5CF6]/20 transition hover:-translate-y-1"
              >
                EXPLORE CONCERTS
                <span>→</span>
              </a>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-md border border-[#C30437] bg-[#0B1020]/50 px-7 py-4 text-xs font-extrabold backdrop-blur-sm transition hover:bg-[#C30437]/10"
              >
                HOW IT WORKS
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="absolute bottom-8 left-1/2 z-20 grid w-[calc(100%-32px)] max-w-[1320px] -translate-x-1/2 grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {[
            ["1.200+", "Concerts Available"],
            ["850K+", "Tickets Sold"],
            ["320K+", "Verified Organisers"],
            ["45+", "Cities Covered"],
          ].map(([number, text]) => (
            <div
              key={number}
              className="rounded-md border border-[#8B5CF6]/30 bg-[#141C3D]/90 px-4 py-5 text-center shadow-xl backdrop-blur-md lg:px-6 lg:py-7"
            >
              <strong className="block text-xl font-black sm:text-2xl lg:text-3xl">
                {number}
              </strong>
              <span className="mt-1 block text-[9px] text-slate-400 sm:text-[10px] lg:text-xs">
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          FLASH SALE
      ========================================================= */}
      <section className="mx-auto mt-8 w-[calc(100%-32px)] max-w-[1400px]">
        <div className="flex flex-col gap-5 rounded-lg bg-gradient-to-r from-[#8B5CF6] via-[#764ED1] to-[#22D3EE] p-5 sm:flex-row sm:items-center sm:px-8">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-black">
            ϟ
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-black tracking-wide">
              FLASH SALE COMING SOON
            </h3>

            <p className="mt-1 text-xs text-white/90 sm:text-sm">
              Up to 40% OFF on selected concert tickets.
            </p>
          </div>

          <div className="flex gap-2">
            {[
              ["17", "DAYS"],
              ["23", "HRS"],
              ["55", "MINS"],
            ].map(([number, label]) => (
              <div
                key={label}
                className="min-w-[50px] rounded-md bg-[#0B1020]/20 px-2 py-2 text-center"
              >
                <strong className="block text-sm">{number}</strong>
                <span className="text-[7px]">{label}</span>
              </div>
            ))}
          </div>

          <button className="rounded-md bg-white px-5 py-3 text-xs font-bold text-[#0B1020] transition hover:-translate-y-0.5">
            View Details
          </button>
        </div>
      </section>

      {/* =========================================================
          WHY CHOOSE LYNORA
      ========================================================= */}
      <section
        id="features"
        className="mx-auto max-w-[1400px] px-6 py-28 lg:px-10"
      >
        <SectionHeading
          eyebrow="WHY CHOOSE"
          title="LYNORA"
          description="Experience a faster, safer, and more seamless way to discover, book, and enjoy live concerts all in one platform."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "▣",
              "Secure Tickets",
              "Every ticket is encrypted and verified. 100% safe QR code validation at the entrance.",
            ],
            [
              "ϟ",
              "Fast Booking",
              "Complete your purchase in seconds with our easy-to-use interface. No delays, no hassle.",
            ],
            [
              "▤",
              "Transparent",
              "See the full price upfront. No hidden fees, no tricks. Just the best value.",
            ],
            [
              "◉",
              "Always Efficient",
              "From discovering events to booking and support, every step just works.",
            ],
          ].map(([icon, title, text]) => (
            <div
              key={title}
              className="group rounded-lg border border-[#C30437]/30 bg-gradient-to-br from-[#141C3D] to-[#0B1020] p-6 transition duration-300 hover:-translate-y-2 hover:border-[#8B5CF6]/60 hover:shadow-2xl hover:shadow-[#8B5CF6]/10"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-lg font-bold">
                {icon}
              </div>

              <h3 className="text-base font-bold">{title}</h3>

              <p className="mt-3 text-xs leading-6 text-slate-400">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          CATEGORIES
      ========================================================= */}
      <section className="border-y border-white/5 bg-[#10162B]">
        <div className="mx-auto max-w-[1400px] px-6 py-28 lg:px-10">
          <SectionHeading
            eyebrow="Browse by Category"
            title="Find Your Sound"
            description="From arena pop to underground beats, every genre has a home here."
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((category) => (
              <div
                key={category.name}
                className="group relative aspect-[1.35] overflow-hidden rounded-md border border-[#8B5CF6]/20"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-[#0B1020]/10 to-transparent" />

                <div className="absolute bottom-3 left-3">
                  <strong className="block text-xs font-black">
                    {category.name}
                  </strong>

                  <span className="text-[9px] text-slate-300">
                    {category.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button className="rounded-md border border-[#8B5CF6]/40 bg-[#172044] px-6 py-3 text-xs font-bold transition hover:bg-[#764ED1]">
              View All Categories →
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================
          FEATURED CONCERTS
      ========================================================= */}
      <section
        id="concerts"
        className="mx-auto max-w-[1400px] px-6 py-28 lg:px-10"
      >
        <SectionHeading
          eyebrow="Featured Concerts"
          title="Your Next Front Row Awaits"
          description="Hand picked shows selling fastest right now. Grab your stub before the house fills up."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {featuredConcerts.map((concert) => (
            <div
              key={concert.title}
              className="group overflow-hidden rounded-lg border border-white/5 bg-[#172044] transition duration-300 hover:-translate-y-2 hover:border-[#8B5CF6]/50 hover:shadow-2xl hover:shadow-[#8B5CF6]/10"
            >
              <div className="relative h-[230px] overflow-hidden">
                <img
                  src={concert.image}
                  alt={concert.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] to-transparent" />

                <span className="absolute bottom-4 right-4 rounded-md bg-[#0B1020]/80 px-3 py-2 text-[9px] font-black backdrop-blur">
                  {concert.date}
                </span>
              </div>

              <div className="p-6">
                <h3 className="border-b border-white/10 pb-4 text-lg font-bold">
                  {concert.title}
                </h3>

                <div className="mt-5 space-y-4">
                  <ConcertInfo
                    icon="◉"
                    label="LOCATION"
                    value={concert.location}
                  />

                  <ConcertInfo
                    icon="◷"
                    label="START FROM"
                    value={concert.price}
                  />

                  <ConcertInfo
                    icon="⌖"
                    label="VENUE"
                    value="Jakarta, Indonesia"
                  />
                </div>

                <button className="mt-6 w-full rounded-md bg-gradient-to-r from-[#8B5CF6] to-[#764ED1] py-3 text-xs font-bold transition hover:shadow-lg hover:shadow-[#8B5CF6]/20">
                  VIEW CONCERT
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-9 flex justify-center">
          <button className="rounded-md border border-[#8B5CF6]/40 bg-[#172044] px-7 py-3 text-xs font-bold transition hover:bg-[#764ED1]">
            View All Concerts →
          </button>
        </div>
      </section>

      {/* =========================================================
          TRENDING
      ========================================================= */}
      <section className="border-y border-white/5 bg-[#10162B]">
        <div className="mx-auto max-w-[1400px] px-6 py-28 lg:px-10">
          <SectionHeading
            eyebrow="TRENDING NOW !!"
            title={
              <>
                TOP 5 & Everyone&apos;s{" "}
                <span className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">
                  Losing It
                </span>
              </>
            }
            description="The lineup your whole feed can't shut up about. Seats are going fast, don't be the one who missed out."
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {trendingConcerts.map((concert, index) => (
              <div
                key={concert.title}
                className="overflow-hidden rounded-lg border border-white/5 bg-[#172044] transition hover:-translate-y-2 hover:border-[#8B5CF6]/40"
              >
                <div className="relative h-[230px]">
                  <img
                    src={concert.image}
                    alt={concert.title}
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#8B5CF6] text-xs font-black">
                    0{index + 1}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] to-transparent" />

                  <span className="absolute bottom-4 right-4 text-xs font-bold">
                    {concert.price}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="text-base font-bold">{concert.title}</h3>

                  <p className="mt-2 text-xs text-slate-400">
                    Music Festival • 2026
                  </p>

                  <p className="mt-4 text-xs text-slate-400">
                    ● {concert.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}
      <section
        id="how-it-works"
        className="mx-auto max-w-[1400px] px-6 py-28 lg:px-10"
      >
        <SectionHeading
          eyebrow="SIMPLE & SEAMLESS"
          title="HOW IT WORKS"
          description="From discovering your favorite concert to stepping into the venue."
        />

        <div className="grid gap-12 md:grid-cols-4 md:gap-6">
          {[
            [
              "01",
              "Discover",
              "Browse concerts by genre, city, or date and find the show you're craving.",
            ],
            [
              "02",
              "Select Your Ticket",
              "Pick your spot and ticket type. See the full price upfront, no surprises.",
            ],
            [
              "03",
              "Secure Checkout",
              "Pay safely in seconds and get your verified e-ticket delivered instantly.",
            ],
            [
              "04",
              "Enjoy The Show",
              "Scan your e-ticket at the gate and step straight into the raw energy.",
            ],
          ].map(([number, title, text], index) => (
            <div
              key={number}
              className="relative text-center"
            >
              {index !== 3 && (
                <div className="absolute left-[60%] top-8 hidden h-px w-[80%] bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] opacity-40 md:block" />
              )}

              <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#8B5CF6] bg-[#0B1020] text-sm font-bold text-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/10">
                {number}
              </div>

              <h3 className="mt-5 text-base font-bold">{title}</h3>

              <p className="mx-auto mt-3 max-w-xs text-xs leading-6 text-slate-400">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          FAQ
      ========================================================= */}
      <section
        id="faq"
        className="border-y border-white/5 bg-[#10162B]"
      >
        <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-28 lg:grid-cols-[0.75fr_1.5fr] lg:gap-20 lg:px-10">

          <div className="lg:pt-5">
            <p className="flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[2px] text-[#8B5CF6] lg:justify-start">
              <span className="h-[2px] w-6 bg-[#8B5CF6]" />
              Need To Know
            </p>

            <h2 className="mt-5 text-center text-4xl font-black tracking-tight lg:text-left lg:text-5xl">
              GOT{" "}
              <span className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">
                QUESTIONS??
              </span>
            </h2>

            <p className="mt-5 text-center text-sm leading-7 text-slate-400 lg:text-left">
              Everything you need to know before you rock your next ticket.
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div
                key={faq.question}
                className={`overflow-hidden rounded-md border transition ${
                  openFaq === index
                    ? "border-[#8B5CF6]/50 bg-[#1E2B57]"
                    : "border-white/5 bg-[#1A254B]"
                }`}
              >
                <button
                  onClick={() =>
                    setOpenFaq(openFaq === index ? null : index)
                  }
                  className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left text-sm font-semibold"
                >
                  <span>{faq.question}</span>

                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6]">
                    {openFaq === index ? "−" : "+"}
                  </span>
                </button>

                {openFaq === index && (
                  <div className="border-t border-white/5 px-5 pb-5 pt-4 text-xs leading-6 text-slate-400">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          CONTACT
      ========================================================= */}
      <section
        id="contact"
        className="mx-auto grid max-w-[1400px] gap-14 px-6 py-28 lg:grid-cols-[0.75fr_1.25fr] lg:px-10"
      >
        <div>
          <p className="flex items-center gap-3 text-xs font-bold tracking-[2px] text-[#8B5CF6]">
            <span className="h-[2px] w-6 bg-[#8B5CF6]" />
            GET IN TOUCH
          </p>

          <h2 className="mt-5 text-4xl font-black">
            LET&apos;S{" "}
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">
              CONNECT
            </span>
          </h2>

          <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
            Have a question or need help with your ticket? We&apos;re here to
            help you.
          </p>

          <div className="mt-8 space-y-5">
            {[
              ["✉", "EMAIL", "hello@lynora.com"],
              ["◉", "PHONE", "+62 812 3456 6789"],
              ["⌖", "OFFICE", "Jakarta, Indonesia"],
              ["◎", "SOCIAL", "@lynora.music"],
            ].map(([icon, label, value]) => (
              <div key={label} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-sm font-bold">
                  {icon}
                </div>

                <div>
                  <span className="block text-[9px] font-bold text-slate-500">
                    {label}
                  </span>

                  <span className="mt-1 block text-sm text-white">
                    {value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="NAME" placeholder="Your name" />
            <Input label="EMAIL" placeholder="Your email" type="email" />
          </div>

          <Input
            label="SUBJECT"
            placeholder="What can we help you with?"
          />

          <label className="block">
            <span className="mb-2 block text-[10px] font-bold tracking-wide text-slate-300">
              MESSAGE
            </span>

            <textarea
              rows={7}
              placeholder="Write your message..."
              className="w-full resize-y rounded-md border border-[#C30437]/30 bg-[#0D1428] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#8B5CF6]"
            />
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-md bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] px-7 py-3 text-xs font-black transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#8B5CF6]/20"
            >
              SEND MESSAGE
            </button>
          </div>
        </form>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="border-t border-white/5 bg-[#080C18]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-5 px-6 py-7 sm:flex-row lg:px-10">
          <div className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-xl font-black tracking-wider text-transparent">
            LYNORA
          </div>

          <p className="text-xs text-slate-500">
            © 2026 Lynora. All rights reserved.
          </p>

          <div className="flex gap-5 text-sm text-slate-400">
            <span>◎</span>
            <span>𝕏</span>
            <span>f</span>
            <span>▶</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <div className="mx-auto mb-14 max-w-3xl text-center">
      <p className="mb-3 text-sm font-bold tracking-[2px] text-[#8B5CF6]">
        {eyebrow}
      </p>

      <h2 className="text-3xl font-black tracking-wide sm:text-4xl lg:text-5xl">
        {title}
      </h2>

      <p className="mt-5 text-sm leading-7 text-slate-400 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function ConcertInfo({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 text-[#8B5CF6]">{icon}</span>

      <div>
        <span className="block text-[9px] font-bold text-slate-500">
          {label}
        </span>

        <span className="mt-1 block text-xs text-slate-200">
          {value}
        </span>
      </div>
    </div>
  );
}

function Input({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold tracking-wide text-slate-300">
        {label}
      </span>

      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-md border border-[#C30437]/30 bg-[#0D1428] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#8B5CF6]"
      />
    </label>
  );
}