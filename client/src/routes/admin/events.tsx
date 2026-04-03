import { createFileRoute } from "@tanstack/react-router";
import { EventsSection } from "@/features/admin/admin-dashboard-sections";

export const Route = createFileRoute("/admin/events")({
  component: EventsSection,
});
