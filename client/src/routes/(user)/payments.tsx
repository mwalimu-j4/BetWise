import { createFileRoute } from "@tanstack/react-router";
import PaymentsPage from "@/features/payments/payments-page";

export const Route = createFileRoute("/(user)/payments")({
  component: PaymentsPage,
});

function RouteComponent() {
  return <div>Hello "/user/payments"!</div>;
}
