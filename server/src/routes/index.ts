import { Router } from "express";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health";
import { paymentRouter } from "./payments";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(paymentRouter);

export { apiRouter };
