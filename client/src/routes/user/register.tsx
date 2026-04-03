import { createRoute } from "@tanstack/react-router";
import Register from "@/features/auth/pages/register";
import { userRoute } from "./route";

export const userRegisterRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/register",
  component: Register,
});
