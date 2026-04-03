import { createRoute } from "@tanstack/react-router";
import UserShell from "@/features/user/shell";
import { rootRoute } from "../root";

export const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/user",
  component: UserShell,
});
