import { createRoute } from "@tanstack/react-router";
import { userRoute } from "./route";
import Contact from "@/features/user/pages/contact";

export const userContactRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/contact",
  component: Contact,
});
