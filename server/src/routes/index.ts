import { Router } from "express";
import { healthRouter } from "./health";
import { paymentRouter } from "./payments";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(paymentRouter);

export { apiRouter };
