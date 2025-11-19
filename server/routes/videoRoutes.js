import express from "express";
import {
  getVideoUploadUrlController,
  getVideoStreamUrlController,
  getBatchVideoStreamUrlsController,
} from "../controllers/videoController.js";
import { clerkMiddleware } from "@clerk/express";

const videoRouter = express.Router();

// All routes require authentication (via clerkMiddleware in server.js)
videoRouter.post("/upload-url", getVideoUploadUrlController);
videoRouter.post("/stream-url", getVideoStreamUrlController);
videoRouter.post("/batch-stream-urls", getBatchVideoStreamUrlsController);

export default videoRouter;

