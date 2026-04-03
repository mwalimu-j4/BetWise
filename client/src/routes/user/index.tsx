import { createRoute } from "@tanstack/react-router";
import Home from "@/features/user/home";
import { userRoute } from "./route";

export const userIndexRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/",
  component: Home,
});
