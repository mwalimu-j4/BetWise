/**
 * Global store for the router instance to break circular dependencies
 * between AuthContext and the routing tree.
 */
let routerInstance: any = null;

export function setRouter(router: any) {
  routerInstance = router;
}

export function getRouter(): any {
  return routerInstance;
}
