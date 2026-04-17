import { Navigate, createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";

function ProfileAliasRoute() {
  return <Navigate to="/user/profile" />;
}

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfileAliasRoute,
});
