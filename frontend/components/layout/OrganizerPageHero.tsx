import type { CSSProperties, ReactNode } from "react";

type OrganizerPageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
  className?: string;
  backgroundImage?: string;
};

const ORGANIZER_HERO_IMAGE = "/images/hero/ao.jpg";

export default function OrganizerPageHero({
  eyebrow = "ORGANIZER WORKSPACE",
  title,
  description,
  children,
  className = "",
  backgroundImage = ORGANIZER_HERO_IMAGE,
}: OrganizerPageHeroProps) {
  const backgroundStyle: CSSProperties = backgroundImage
    ? { backgroundImage: `url("${backgroundImage}")` }
    : {};

  return (
    <section
      className={`relative isolate mb-7 flex min-h-[220px] w-full min-w-0 items-center overflow-hidden rounded-2xl border border-[#8B5CF6]/30 bg-[linear-gradient(120deg,#2A1B5C_0%,#6D28D9_50%,#DB2777_100%)] px-5 py-7 shadow-[0_10px_30px_rgba(0,0,0,0.24)] sm:min-h-[250px] sm:px-7 sm:py-8 lg:min-h-[280px] lg:px-9 lg:py-9 ${className}`}
    >
      {backgroundImage && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={backgroundStyle}
        />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,13,32,0.88)_0%,rgba(11,17,34,0.66)_43%,rgba(11,17,34,0.30)_78%,rgba(11,17,34,0.16)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(8,13,32,0.48)_0%,transparent_62%)]"
      />
      <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-[#8B5CF6]/20 blur-[85px]" />
      <div className="pointer-events-none absolute -bottom-32 right-[20%] -z-10 h-64 w-64 rounded-full bg-[#22D3EE]/12 blur-[85px]" />

      <div className="relative flex w-full min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && (
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22D3EE] shadow-[0_0_10px_#22D3EE]" />
              <span className="text-[10px] font-bold tracking-[2.5px] text-[#C4B5FD] sm:text-[11px]">
                {eyebrow}
              </span>
            </div>
          )}

          <h1 className="break-words text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-4xl lg:text-[42px]">
            {title}
          </h1>

          <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[#E2E8F0] drop-shadow-[0_1px_8px_rgba(0,0,0,0.75)] sm:text-sm lg:text-base">
            {description}
          </p>
        </div>

        {children && (
          <div className="relative flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
            {children}
          </div>
        )}
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[4px] w-full bg-gradient-to-r from-[#8B5CF6] via-[#5456DE] to-[#22D3EE]"
      />
    </section>
  );
}
