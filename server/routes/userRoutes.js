import express from "express";
import {
  addUserRating,
  getUserCourseProgress,
  getUserData,
  purchaseCourse,
  updateUserCourseProgress,
  updateWatchProgress,
  userEnrolledCourses,
  verifyRazorpayPayment,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/data", getUserData);
userRouter.get("/enrolled-courses", userEnrolledCourses);
userRouter.post("/purchase", purchaseCourse);
userRouter.post("/verify-payment", verifyRazorpayPayment);

userRouter.post("/update-course-progress", updateUserCourseProgress);
userRouter.post("/update-watch-progress", updateWatchProgress);
userRouter.post("/get-course-progress", getUserCourseProgress);
userRouter.post("/add-rating", addUserRating);

export default userRouter;
