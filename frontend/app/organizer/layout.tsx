import type { ReactNode } from "react";
import OrganizerShell from "@/components/layout/OrganizerShell";

export default function OrganizerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <OrganizerShell>{children}</OrganizerShell>;
}