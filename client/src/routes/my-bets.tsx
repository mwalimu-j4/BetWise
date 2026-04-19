import { Navigate, createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";

function MyBetsAliasRoute() {
  return (
    <Navigate
      to="/user/bets"
    />
  );
}

export const myBetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-bets",
  component: MyBetsAliasRoute,
});
