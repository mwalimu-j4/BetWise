import { createRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminRoute } from "./route";

const Contacts = lazy(() => import("@/features/admin/modules/contacts"));

export const adminContactsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/contacts",
  component: Contacts,
});
