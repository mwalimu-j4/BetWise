import { createRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { userRoute } from "./route";

const Contact = lazy(() => import("@/features/user/pages/contact"));

export const userContactRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/contact",
  component: Contact,
});
