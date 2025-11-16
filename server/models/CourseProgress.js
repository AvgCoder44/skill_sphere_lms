import mongoose from "mongoose";

const lectureProgressSchema = new mongoose.Schema({
  lectureId: { type: String, required: true },
  watchTime: { type: Number, default: 0 }, // in seconds
  totalDuration: { type: Number, default: 0 }, // in seconds
  completed: { type: Boolean, default: false },
});

const courseProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    courseId: { type: String, required: true },
    completed: { type: Boolean, default: false },
    lectureCompleted: [],
    lectureProgress: [lectureProgressSchema], // Track watch time per lecture
  },
  { minimize: false }
);

export const CourseProgress = mongoose.model(
  "CourseProgress",
  courseProgressSchema
);
