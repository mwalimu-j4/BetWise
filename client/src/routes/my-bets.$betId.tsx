import { Navigate, createRoute, useParams, useSearch } from "@tanstack/react-router";
import { myBetsRoute } from "./my-bets";

function MyBetDetailAliasRoute() {
  const { betId } = useParams({ from: "/my-bets/$betId" });
  const search = useSearch({ strict: false }) as {
    tab?: string;
    filter?: string;
    page?: string;
  };

  return (
    <Navigate
      to="/user/bets/$betId"
      params={{ betId }}
      search={{
        tab: search.tab ?? "normal",
        filter: search.filter ?? "all",
        page: search.page ?? "1",
      }}
    />
  );
}

export const myBetDetailRoute = createRoute({
  getParentRoute: () => myBetsRoute,
  path: "/$betId",
  component: MyBetDetailAliasRoute,
});
