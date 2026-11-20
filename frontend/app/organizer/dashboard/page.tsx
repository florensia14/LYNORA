import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

export default function OrganizerDashboardPage() {
  return (
    <div>
      <OrganizerPageHero
        eyebrow="ORGANIZER DASHBOARD"
        title="Welcome Back, Organizer!"
        description="Manage your concerts, monitor ticket sales, and track your event performance all in one place."
      >
        <button
          type="button"
          className="rounded-xl bg-[#5456DE] px-5 py-3 text-[12px] font-bold text-white shadow-lg shadow-[#5456DE]/20 transition hover:bg-[#6668F0]"
        >
          Export Data
        </button>
      </OrganizerPageHero>

      {/* Dashboard content goes here */}
    </div>
  );
}