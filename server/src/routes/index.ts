import { Router } from "express";
import { betsAdminRouter } from "./admin/bets";
import { eventsAdminRouter } from "./admin/events";
import { oddsAdminRouter } from "./admin/odds";
import { authRouter } from "./auth.routes";
import { adminRouter } from "./admin";
import { healthRouter } from "./health";
import { myBetsRouter } from "./my-bets";
import { notificationRouter } from "./notifications";
import { paymentRouter } from "./payments";
import { profileRouter } from "./profile";
import { liveRouter } from "./live";
import { userBetsRouter } from "./user/bets";
import { userEventsRouter } from "./user/events";
import { contactRouter } from "./contact";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(adminRouter);
apiRouter.use(paymentRouter);
apiRouter.use(profileRouter);
apiRouter.use(notificationRouter);
apiRouter.use(myBetsRouter);
apiRouter.use(liveRouter);
apiRouter.use(eventsAdminRouter);
apiRouter.use(betsAdminRouter);
apiRouter.use(oddsAdminRouter);
apiRouter.use(userEventsRouter);
apiRouter.use(userBetsRouter);
apiRouter.use(contactRouter);

export { apiRouter };
