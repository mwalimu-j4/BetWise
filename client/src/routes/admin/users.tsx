import { createRoute } from "@tanstack/react-router";
import Users from "@/features/admin/modules/users";
import { adminRoute } from "./route";

export const adminUsersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/users",
  component: Users,
});
