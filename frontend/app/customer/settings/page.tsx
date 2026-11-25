import CustomerShell from "@/components/layout/CustomerShell";
import SettingsContent from "@/components/settings/SettingsContent";

export default function CustomerSettingsPage() {
  return (
    <CustomerShell
      title="Settings"
      subtitle="Manage your account, preferences and security"
    >
      <SettingsContent />
    </CustomerShell>
  );
}