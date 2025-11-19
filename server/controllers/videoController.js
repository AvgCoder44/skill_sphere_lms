import {
  getVideoUploadUrl,
  getVideoStreamUrl,
  getBatchVideoStreamUrls,
} from "../configs/s3.js";
import Course from "../models/Course.js";
import User from "../models/User.js";

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

/**
 * Get presigned URL for video upload
 * POST /api/video/upload-url
 * Body: { fileName, contentType, courseId, chapterId, lectureId }
 */
export const getVideoUploadUrlController = async (req, res) => {
  try {
    const { fileName, contentType, courseId, chapterId, lectureId } = req.body;
    const educatorId = getAuthUserId(req);

    if (!fileName || !contentType || !courseId) {
      return res.json({
        success: false,
        message: "fileName, contentType, and courseId are required",
      });
    }

    // Validate file type
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
    ];
    if (!allowedTypes.includes(contentType)) {
      return res.json({
        success: false,
        message: "Invalid video type. Allowed: MP4, WebM, MOV, AVI, MKV",
      });
    }

    // Verify course ownership (if courseId is not "temp")
    if (courseId !== "temp") {
      const course = await Course.findOne({ _id: courseId, educator: educatorId });
      if (!course) {
        return res.json({
          success: false,
          message: "Course not found or unauthorized",
        });
      }
    }
    // For "temp" courseId (during course creation), we trust the educator authentication

    // Generate unique file key
    const fileExtension = fileName.split(".").pop();
    const timestamp = Date.now();
    const fileKey = `courses/${courseId}/chapters/${chapterId || "default"}/lectures/${lectureId || timestamp}.${fileExtension}`;

    const uploadUrl = await getVideoUploadUrl(fileKey, contentType);

    res.json({
      success: true,
      uploadUrl,
      fileKey, // Return fileKey to store in lecture.lectureUrl
    });
  } catch (error) {
    console.error("getVideoUploadUrlController error:", error);
    res.json({ success: false, message: error.message });
  }
};

/**
 * Get presigned URL for video streaming
 * POST /api/video/stream-url
 * Body: { fileKey, courseId }
 * Requires: User must be enrolled in the course (unless preview)
 */
export const getVideoStreamUrlController = async (req, res) => {
  try {
    const { fileKey, courseId, lectureId } = req.body;
    const userId = getAuthUserId(req);

    if (!fileKey || !courseId) {
      return res.json({
        success: false,
        message: "fileKey and courseId are required",
      });
    }

    // Find course and lecture
    const course = await Course.findById(courseId);
    if (!course) {
      return res.json({ success: false, message: "Course not found" });
    }

    // Find lecture to check if it's preview
    let isPreview = false;
    if (lectureId) {
      for (const chapter of course.courseContent || []) {
        const lecture = chapter.chapterContent?.find(
          (l) => l.lectureId === lectureId
        );
        if (lecture) {
          isPreview = lecture.isPreviewFree || false;
          break;
        }
      }
    }

    // If not preview, check enrollment
    if (!isPreview) {
      if (!userId) {
        return res.json({
          success: false,
          message: "Authentication required",
        });
      }

      const user = await User.findById(userId);
      if (!user || !user.enrolledCourses.includes(courseId)) {
        return res.json({
          success: false,
          message: "You must be enrolled to watch this video",
        });
      }
    }

    const streamUrl = await getVideoStreamUrl(fileKey);

    res.json({
      success: true,
      streamUrl,
    });
  } catch (error) {
    console.error("getVideoStreamUrlController error:", error);
    res.json({ success: false, message: error.message });
  }
};

/**
 * Get batch presigned URLs for multiple videos
 * POST /api/video/batch-stream-urls
 * Body: { fileKeys: string[], courseId }
 */
export const getBatchVideoStreamUrlsController = async (req, res) => {
  try {
    const { fileKeys, courseId } = req.body;
    const userId = getAuthUserId(req);

    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
      return res.json({
        success: false,
        message: "fileKeys array is required",
      });
    }

    if (!courseId) {
      return res.json({
        success: false,
        message: "courseId is required",
      });
    }

    // Check enrollment
    if (userId) {
      const user = await User.findById(userId);
      if (!user || !user.enrolledCourses.includes(courseId)) {
        return res.json({
          success: false,
          message: "You must be enrolled to access these videos",
        });
      }
    }

    const urls = await getBatchVideoStreamUrls(fileKeys);

    res.json({
      success: true,
      urls,
    });
  } catch (error) {
    console.error("getBatchVideoStreamUrlsController error:", error);
    res.json({ success: false, message: error.message });
  }
};

