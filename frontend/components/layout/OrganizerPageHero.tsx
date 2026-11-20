
import type { ReactNode } from "react";

type OrganizerPageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

export default function OrganizerPageHero({
  eyebrow = "ORGANIZER WORKSPACE",
  title,
  description,
  children,
  className = "",
}: OrganizerPageHeroProps) {
  return (
    <section
      className={`relative isolate mb-7 overflow-hidden rounded-2xl border border-[#8B5CF6]/20 bg-gradient-to-r from-[#202A4F] via-[#25234D] to-[#172B46] px-5 py-6 sm:px-7 sm:py-7 lg:px-9 lg:py-8 ${className}`}
    >
      {/* BACKGROUND DECORATION */}
      <div className="pointer-events-none absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full bg-[#8B5CF6]/20 blur-[80px]" />

      <div className="pointer-events-none absolute -bottom-28 right-[20%] -z-10 h-56 w-56 rounded-full bg-[#22D3EE]/10 blur-[75px]" />

      <div className="pointer-events-none absolute right-0 top-0 -z-10 h-full w-[45%] opacity-[0.08]">
        <div className="absolute right-10 top-0 h-full w-px bg-white" />
        <div className="absolute right-24 top-0 h-full w-px bg-white" />
        <div className="absolute right-0 top-10 h-px w-full bg-white" />
        <div className="absolute bottom-10 right-0 h-px w-full bg-white" />
      </div>

      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE] shadow-[0_0_10px_#22D3EE]" />
            <span className="text-[10px] font-bold tracking-[2.5px] text-[#A5A0FF] sm:text-[11px]">
              {eyebrow}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-[34px]">
            {title}
          </h1>

          <p className="mt-2 max-w-xl text-[12px] leading-6 text-[#B7C1DC] sm:text-[13px]">
            {description}
          </p>
        </div>

        {children && (
          <div className="relative flex shrink-0 flex-wrap items-center gap-3">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
