
import type { CSSProperties, ReactNode } from "react";

type AdminPageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
  className?: string;
  backgroundImage?: string;
};

const ADMIN_HERO_IMAGE = "/images/hero/ao.jpg";

export default function AdminPageHero({
  eyebrow = "LYNORA SUPER ADMIN",
  title,
  description,
  children,
  className = "",
  backgroundImage = ADMIN_HERO_IMAGE,
}: AdminPageHeroProps) {
  const backgroundStyle: CSSProperties = backgroundImage
    ? { backgroundImage: `url("${backgroundImage}")` }
    : {};

  return (
    <section
      className={`relative isolate mb-5 flex min-h-[145px] w-full min-w-0 items-center overflow-hidden rounded-xl border border-[#8B5CF6]/30 bg-[linear-gradient(120deg,#2A1B5C_0%,#6D28D9_50%,#DB2777_100%)] px-4 py-5 shadow-[0_8px_24px_rgba(0,0,0,0.20)] sm:min-h-[165px] sm:px-6 sm:py-6 lg:min-h-[180px] lg:px-7 lg:py-6 ${className}`}
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

      <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-56 w-56 rounded-full bg-[#8B5CF6]/20 blur-[75px]" />

      <div className="pointer-events-none absolute -bottom-24 right-[20%] -z-10 h-48 w-48 rounded-full bg-[#22D3EE]/12 blur-[75px]" />

      <div className="relative flex w-full min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && (
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22D3EE] shadow-[0_0_10px_#22D3EE]" />

              <span className="text-[9px] font-bold tracking-[2px] text-[#C4B5FD] sm:text-[10px]">
                {eyebrow}
              </span>
            </div>
          )}

          <h1 className="break-words text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-3xl lg:text-4xl">
            {title}
          </h1>

          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#E2E8F0] drop-shadow-[0_1px_8px_rgba(0,0,0,0.75)] sm:text-xs lg:text-sm">
            {description}
          </p>
        </div>

        {children && (
          <div className="relative flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {children}
          </div>
        )}
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#8B5CF6] via-[#5456DE] to-[#22D3EE]"
      />
    </section>
  );
}
