import { Router } from "express";
import { authenticate, requireAuth } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";
import { newsletterRateLimiter } from "../middleware/rateLimiter";
import {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getNewsletterSubscribers,
} from "../controllers/newsletter.controller";

const newsletterRouter = Router();

// Public routes - anyone can subscribe/unsubscribe
newsletterRouter.post(
  "/newsletter/subscribe",
  newsletterRateLimiter,
  subscribeToNewsletter,
);
newsletterRouter.post(
  "/newsletter/unsubscribe",
  newsletterRateLimiter,
  unsubscribeFromNewsletter,
);

// Admin routes - require admin authentication
newsletterRouter.get(
  "/admin/newsletter/subscribers",
  authenticate,
  requireAdmin,
  getNewsletterSubscribers,
);

export { newsletterRouter };
