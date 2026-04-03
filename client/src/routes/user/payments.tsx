import { createRoute } from "@tanstack/react-router";
import Payments from "@/features/user/payments/page";
import { userRoute } from "./route";

export const userPaymentsRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/payments",
  component: Payments,
});
