import Razorpay from "razorpay";
import Course from "../models/Course.js";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import { CourseProgress } from "../models/CourseProgress.js";
import crypto from "crypto";

// Prefer req.auth() when available (Clerk deprecates req.auth object)
const getAuthUserId = (req) => {
  try {
    if (typeof req.auth === "function") {
      const data = req.auth();
      return data?.userId || null;
    }
    return req.auth?.userId || null;
  } catch {
    return null;
  }
};

let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Get User Data
export const getUserData = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User Not Found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("purchaseCourse error", error);
    res.json({ success: false, message: error.message });
  }
};

// Users Enrolled Courses With Lecture Links
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const userData = await User.findById(userId).populate("enrolledCourses");

    res.json({ success: true, enrolledCourses: userData.enrolledCourses });
  } catch (error) {
    console.error("purchaseCourse error", error);
    res.json({ success: false, message: error.message });
  }
};

// Purchase Course
export const purchaseCourse = async (req, res) => {
  console.log("purchaseCourse called", {
    courseId: req.body?.courseId,
    userId: getAuthUserId(req),
    hasRazorpay: !!razorpayInstance,
  });
  try {
    const { courseId } = req.body;
    const { origin } = req.headers;
    const userId = getAuthUserId(req);
    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);

    if (!userData || !courseData) {
      console.warn("purchaseCourse missing data", {
        userFound: !!userData,
        courseFound: !!courseData,
      });
      return res.json({ success: false, message: "Data Not Found" });
    }

    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount: (
        courseData.coursePrice -
        (courseData.discount * courseData.coursePrice) / 100
      ).toFixed(2),
    };

    const newPurchase = await Purchase.create(purchaseData);

    if (!razorpayInstance) {
      console.warn("purchaseCourse Razorpay not configured");
      return res.json({
        success: false,
        message: "Payment gateway is not configured.",
      });
    }

    const currency = (process.env.CURRENCY || "INR").toUpperCase();
    const order = await razorpayInstance.orders.create({
      amount: Math.round(Number(newPurchase.amount) * 100),
      currency,
      receipt: newPurchase._id.toString(),
      notes: {
        courseTitle: courseData.courseTitle,
        userEmail: userData.email,
      },
    });

    newPurchase.orderId = order.id;
    await newPurchase.save();

    res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
      course: {
        title: courseData.courseTitle,
        thumbnail: courseData.courseThumbnail,
      },
      user: {
        name: userData.name,
        email: userData.email,
      },
      redirectUrl: `${origin}/loading/my-enrollments`,
    });
  } catch (error) {
    console.error("purchaseCourse error", error);
    res.json({ success: false, message: error.message });
  }
};

// Update User Course Progress (for manual completion)
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { courseId, lectureId } = req.body;
    const progressData = await CourseProgress.findOne({ userId, courseId });

    if (progressData) {
      if (progressData.lectureCompleted.includes(lectureId)) {
        return res.json({ success: true, message: "Lecture Already Completed" });
      }

      progressData.lectureCompleted.push(lectureId);
      
      // Also mark in lectureProgress if exists
      const lectureProgress = progressData.lectureProgress.find(
        (lp) => lp.lectureId === lectureId
      );
      if (lectureProgress) {
        lectureProgress.completed = true;
      }
      
      await progressData.save();
    } else {
      await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    }

    res.json({ success: true, message: "Progress Updated" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update Watch Progress (real-time)
export const updateWatchProgress = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { courseId, lectureId, watchTime, totalDuration } = req.body;

    if (!courseId || !lectureId || watchTime === undefined) {
      return res.json({ success: false, message: "Invalid data" });
    }

    let progressData = await CourseProgress.findOne({ userId, courseId });

    if (!progressData) {
      progressData = await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [],
        lectureProgress: [],
      });
    }

    // Find or create lecture progress entry
    let lectureProgress = progressData.lectureProgress.find(
      (lp) => lp.lectureId === lectureId
    );

    if (!lectureProgress) {
      lectureProgress = {
        lectureId,
        watchTime: 0,
        totalDuration: totalDuration || 0,
        completed: false,
      };
      progressData.lectureProgress.push(lectureProgress);
    }

    // Update watch time
    lectureProgress.watchTime = Math.max(lectureProgress.watchTime, watchTime);
    if (totalDuration) {
      lectureProgress.totalDuration = totalDuration;
    }

    // Auto-complete if watched 90% or more
    const completionThreshold = 0.9;
    if (
      lectureProgress.totalDuration > 0 &&
      lectureProgress.watchTime / lectureProgress.totalDuration >= completionThreshold
    ) {
      lectureProgress.completed = true;
      
      // Add to lectureCompleted if not already there
      if (!progressData.lectureCompleted.includes(lectureId)) {
        progressData.lectureCompleted.push(lectureId);
      }
    }

    await progressData.save();
    res.json({ success: true, message: "Watch progress updated" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get User Course Progress
export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { courseId } = req.body;
    const progressData = await CourseProgress.findOne({ userId, courseId });

    res.json({ success: true, progressData });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Add User Ratings to Course
export const addUserRating = async (req, res) => {
  const userId = getAuthUserId(req);
  const { courseId, rating } = req.body;

  if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
    return res.json({ success: false, message: "Invalid Details" });
  }

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.json({ success: false, message: "Course not found" });
    }

    const user = await User.findById(userId);

    if (!user || !user.enrolledCourses.includes(courseId)) {
      return res.json({
        success: false,
        message: "User has not purchased this course.",
      });
    }

    const existingRatingIndex = course.courseRatings.findIndex(
      (r) => r.userId === userId
    );

    if (existingRatingIndex > -1) {
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      course.courseRatings.push({ userId, rating });
    }

    await course.save();

    return res.json({ success: true, message: "Rating added" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.json({
        success: false,
        message: "Payment gateway is not configured.",
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.json({ success: false, message: "Invalid payment data." });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.json({ success: false, message: "Payment verification failed" });
    }

    const purchaseData = await Purchase.findOne({ orderId: razorpay_order_id });

    if (!purchaseData) {
      return res.json({ success: false, message: "Purchase not found" });
    }

    if (purchaseData.status === "completed") {
      return res.json({ success: true, message: "Payment already processed" });
    }

    purchaseData.status = "completed";
    purchaseData.paymentId = razorpay_payment_id;
    await purchaseData.save();

    const userData = await User.findById(purchaseData.userId);
    const courseData = await Course.findById(purchaseData.courseId);

    if (!userData || !courseData) {
      return res.json({ success: false, message: "Data not found" });
    }

    if (!courseData.enrolledStudents.includes(userData._id)) {
      courseData.enrolledStudents.push(userData._id);
      await courseData.save();
    }

    if (!userData.enrolledCourses.includes(courseData._id)) {
      userData.enrolledCourses.push(courseData._id);
      await userData.save();
    }

    res.json({ success: true, message: "Payment verified" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
