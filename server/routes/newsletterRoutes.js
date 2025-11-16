import express from "express";
import { subscribeNewsletter } from "../controllers/newsletterController.js";

const newsletterRouter = express.Router();

// Public route - no authentication required
newsletterRouter.post("/subscribe", subscribeNewsletter);

export default newsletterRouter;

