import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "./root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async ({ context }) => {
    // Get user from localStorage to check role without making API call
    const persistedUserJson =
      typeof window !== "undefined"
        ? window.localStorage.getItem("betixpro-auth-user")
        : null;

    if (persistedUserJson) {
      try {
        const user = JSON.parse(persistedUserJson);
        if (user.role === "ADMIN") {
          throw redirect({ to: "/admin" });
        }
        if (user.role === "USER") {
          throw redirect({ to: "/user" });
        }
      } catch (error) {
        // Invalid stored data, proceed to home
      }
    }
    // If not authenticated or can't determine role, stay on home
  },
});