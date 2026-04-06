import { createRoute } from "@tanstack/react-router";
import Contacts from "@/features/admin/modules/contacts";
import { adminRoute } from "./route";

export const adminContactsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/contacts",
  component: Contacts,
});
