import { createRoute } from "@tanstack/react-router";
import Login from "@/features/auth/pages/login";
import { userRoute } from "./route";

export const userLoginRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/login",
  component: Login,
});
