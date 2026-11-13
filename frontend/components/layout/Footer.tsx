
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0B1020] text-white">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-8 py-12 md:grid-cols-2 lg:grid-cols-4 lg:px-14">
        {/* Brand */}
        <div>
          <Link
            href="#home"
            className="inline-block bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-[28px] font-extrabold tracking-wide text-transparent"
          >
            LYNORA
          </Link>

          <p className="mt-7 max-w-[250px] text-[18px] leading-[1.3] text-white">
            The pulse of live music discover, book, and experience
            unforgettable concerts, all from one platform.
          </p>
        </div>

        {/* Explore */}
        <div>
          <h3 className="mb-7 text-[18px] font-bold text-white">
            EXPLORE
          </h3>

          <ul className="space-y-3 text-[18px] text-[#85899B]">
            <li>
              <a href="#home" className="transition hover:text-[#8B5CF6]">
                Home
              </a>
            </li>
            <li>
              <a href="#events" className="transition hover:text-[#8B5CF6]">
                Events
              </a>
            </li>
            <li>
              <a href="#features" className="transition hover:text-[#8B5CF6]">
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="transition hover:text-[#8B5CF6]">
                How It Works
              </a>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="mb-7 text-[18px] font-bold text-white">
            SUPPORT
          </h3>

          <ul className="space-y-3 text-[18px] text-[#85899B]">
            <li>
              <a href="#faq" className="transition hover:text-[#8B5CF6]">
                FAQ
              </a>
            </li>
            <li>
              <a href="#contact" className="transition hover:text-[#8B5CF6]">
                Contact
              </a>
            </li>
            <li>
              <Link href="/refund-policy" className="transition hover:text-[#8B5CF6]">
                Refund Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className="transition hover:text-[#8B5CF6]">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="mb-7 text-[18px] font-bold text-white">
            STAY IN THE LOOP
          </h3>

          <ul className="space-y-3 text-[18px] text-[#85899B]">
            <li>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-[#8B5CF6]"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-[#8B5CF6]"
              >
                Twitter
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-[#414354]">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 px-8 py-5 text-sm text-[#C5C6CE] md:flex-row md:items-center lg:px-14">
          <p>2026 Lynora. All rights reserved.</p>
          <p>Made for people who live for the encore.</p>
        </div>
      </div>
    </footer>
  );
}
