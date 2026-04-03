import { createFileRoute } from "@tanstack/react-router";
import PaymentsPage from "@/features/payments/payments-page";

export const Route = createFileRoute("/_user/payments")({
  component: PaymentsPage,
});
