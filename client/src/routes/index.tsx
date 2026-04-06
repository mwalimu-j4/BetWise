import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "./root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    // Get user from localStorage to check role without making API call
    const persistedUserJson =
      typeof window !== "undefined"
        ? window.localStorage.getItem("betixpro-auth-user")
        : null;

    if (persistedUserJson) {
      try {
        const user = JSON.parse(persistedUserJson);
        if (user && typeof user === "object" && "role" in user) {
          if (user.role === "ADMIN") {
            console.log("Redirecting admin to /admin");
            throw redirect({ to: "/admin" });
          } else if (user.role === "USER") {
            console.log("Redirecting user to /user");
            throw redirect({ to: "/user" });
          }
        }
      } catch (error: any) {
        // Check if this is a redirect error by looking for common properties
        if (error?.isRedirect || error?.status === 302) {
          throw error;
        }
        // If it's a JSON parse error or other issue, just continue
        console.warn("Error parsing user from storage:", error);
      }
    }
    // If not authenticated, stay on home
  },
});
