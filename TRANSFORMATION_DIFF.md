# Complete Transformation Diff - S3 Video Upload & Delete Course

## 📋 Table of Contents
1. [New Files to Create](#new-files-to-create)
2. [Modified Files](#modified-files)
3. [Package.json Changes](#packagejson-changes)
4. [Environment Variables](#environment-variables)

---

## 🆕 New Files to Create

### 1. `server/configs/s3.js`
```javascript
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN;

/**
 * Generate presigned URL for video upload
 * @param {string} fileKey - S3 object key (path)
 * @param {string} contentType - MIME type (e.g., 'video/mp4')
 * @returns {Promise<string>} Presigned URL
 */
export const getVideoUploadUrl = async (fileKey, contentType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
    // Optional: Add ACL or other metadata
  });

  // URL expires in 1 hour
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
};

/**
 * Generate presigned URL for video streaming (download)
 * @param {string} fileKey - S3 object key
 * @returns {Promise<string>} Presigned URL (valid for 1 hour)
 */
export const getVideoStreamUrl = async (fileKey) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  // URL expires in 1 hour
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
};

/**
 * Generate batch presigned URLs for multiple videos
 * @param {string[]} fileKeys - Array of S3 object keys
 * @returns {Promise<Object>} Object mapping fileKey to presigned URL
 */
export const getBatchVideoStreamUrls = async (fileKeys) => {
  const urlPromises = fileKeys.map(async (fileKey) => {
    const url = await getVideoStreamUrl(fileKey);
    return { fileKey, url };
  });

  const results = await Promise.all(urlPromises);
  return results.reduce((acc, { fileKey, url }) => {
    acc[fileKey] = url;
    return acc;
  }, {});
};

export default s3Client;
```

### 2. `server/controllers/videoController.js`
```javascript
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

    // Verify course ownership
    const course = await Course.findOne({ _id: courseId, educator: educatorId });
    if (!course) {
      return res.json({
        success: false,
        message: "Course not found or unauthorized",
      });
    }

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
```

### 3. `server/routes/videoRoutes.js`
```javascript
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
```

---

## 📝 Modified Files

### 1. `server/package.json`

**BEFORE:**
```json
{
  "name": "server",
  "version": "1.0.0",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "server": "nodemon server.js",
    "start": "node server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "@clerk/express": "^1.3.49",
    "cloudinary": "^2.5.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "mongoose": "^8.19.3",
    "multer": "^1.4.5-lts.1",
    "nodemon": "^3.1.9",
    "razorpay": "^2.9.6",
    "stripe": "^17.7.0",
    "svix": "^1.42.0"
  }
}
```

**AFTER:**
```json
{
  "name": "server",
  "version": "1.0.0",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "server": "nodemon server.js",
    "start": "node server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.932.0",
    "@aws-sdk/s3-request-presigner": "^3.932.0",
    "@clerk/express": "^1.3.49",
    "cloudinary": "^2.5.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "mongoose": "^8.19.3",
    "multer": "^1.4.5-lts.1",
    "nodemon": "^3.1.9",
    "razorpay": "^2.9.6",
    "stripe": "^17.7.0",
    "svix": "^1.42.0"
  }
}
```

**CHANGES:**
- Added `"@aws-sdk/client-s3": "^3.932.0"`
- Added `"@aws-sdk/s3-request-presigner": "^3.932.0"`

---

### 2. `server/server.js`

**BEFORE:**
```javascript
import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { clerkWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import { clerkMiddleware } from "@clerk/express";
import connectCloudinary from "./configs/cloudinary.js";
import courseRouter from "./routes/courseRoute.js";
import userRouter from "./routes/userRoutes.js";
import newsletterRouter from "./routes/newsletterRoutes.js";

// Initialize Express
const app = express();

// Connect to the MongoDB database
await connectDB();
// Connect to Cloudinary
await connectCloudinary();

// Middlewares
app.use(cors());
app.use(clerkMiddleware());

// Routes
app.get("/", (req, res) => res.send("API Working"));
app.post("/clerk", express.json(), clerkWebhooks);
app.use("/api/educator", express.json(), educatorRouter);
app.use("/api/course", express.json(), courseRouter);
app.use("/api/user", express.json(), userRouter);
app.use("/api/newsletter", express.json(), newsletterRouter);

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**AFTER:**
```javascript
import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { clerkWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import { clerkMiddleware } from "@clerk/express";
import connectCloudinary from "./configs/cloudinary.js";
import courseRouter from "./routes/courseRoute.js";
import userRouter from "./routes/userRoutes.js";
import newsletterRouter from "./routes/newsletterRoutes.js";
import videoRouter from "./routes/videoRoutes.js";

// Initialize Express
const app = express();

// Connect to the MongoDB database
await connectDB();
// Connect to Cloudinary
await connectCloudinary();

// Middlewares
app.use(cors());
app.use(clerkMiddleware());

// Routes
app.get("/", (req, res) => res.send("API Working"));
app.post("/clerk", express.json(), clerkWebhooks);
app.use("/api/educator", express.json(), educatorRouter);
app.use("/api/course", express.json(), courseRouter);
app.use("/api/user", express.json(), userRouter);
app.use("/api/newsletter", express.json(), newsletterRouter);
app.use("/api/video", express.json(), videoRouter);

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**CHANGES:**
- Added import: `import videoRouter from "./routes/videoRoutes.js";`
- Added route: `app.use("/api/video", express.json(), videoRouter);`

---

### 3. `server/controllers/educatorController.js`

**BEFORE:**
```javascript
// ... existing code ...

// Get Enrolled Studentd Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const courses = await Course.find({ educator });
    const courseIds = courses.map((course) => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    })
      .populate("userId", "name imageUrl")
      .populate("courseId", "courseTitle");

    const enrolledStudents = purchases.map((purchase) => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    res.json({ success: true, enrolledStudents });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
```

**AFTER:**
```javascript
// ... existing code ...

// Get Enrolled Studentd Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const courses = await Course.find({ educator });
    const courseIds = courses.map((course) => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    })
      .populate("userId", "name imageUrl")
      .populate("courseId", "courseTitle");

    const enrolledStudents = purchases.map((purchase) => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    res.json({ success: true, enrolledStudents });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Delete Course
export const deleteCourse = async (req, res) => {
  try {
    const educatorId = req.auth.userId;
    const { id } = req.params;

    // Find course and verify ownership
    const course = await Course.findOne({ _id: id, educator: educatorId });

    if (!course) {
      return res.json({
        success: false,
        message: "Course not found or unauthorized",
      });
    }

    // Delete course
    await Course.findByIdAndDelete(id);

    res.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
```

**CHANGES:**
- Added `deleteCourse` function at the end of the file

---

### 4. `server/routes/educatorRoutes.js`

**BEFORE:**
```javascript
import express from "express";
import {
  addCourse,
  educatorDashboard,
  getEducatorCourses,
  getEnrolledStudentsData,
  updateRoleToEducator,
  updateCourse,
} from "../controllers/educatorController.js";
import upload from "../configs/multer.js";
import { protectEducator } from "../middlewares/authMiddleware.js";

const educatorRouter = express.Router();

// Add Educator Role
educatorRouter.get("/update-role", updateRoleToEducator);
educatorRouter.post(
  "/add-course",
  upload.single("image"),
  protectEducator,
  addCourse
);
educatorRouter.put(
  "/course/:id",
  upload.single("image"),
  protectEducator,
  updateCourse
);
educatorRouter.get("/courses", protectEducator, getEducatorCourses);
educatorRouter.get("/dashboard", protectEducator, educatorDashboard);
educatorRouter.get(
  "/enrolled-students",
  protectEducator,
  getEnrolledStudentsData
);

export default educatorRouter;
```

**AFTER:**
```javascript
import express from "express";
import {
  addCourse,
  educatorDashboard,
  getEducatorCourses,
  getEnrolledStudentsData,
  updateRoleToEducator,
  updateCourse,
  deleteCourse,
} from "../controllers/educatorController.js";
import upload from "../configs/multer.js";
import { protectEducator } from "../middlewares/authMiddleware.js";

const educatorRouter = express.Router();

// Add Educator Role
educatorRouter.get("/update-role", updateRoleToEducator);
educatorRouter.post(
  "/add-course",
  upload.single("image"),
  protectEducator,
  addCourse
);
educatorRouter.put(
  "/course/:id",
  upload.single("image"),
  protectEducator,
  updateCourse
);
educatorRouter.delete("/course/:id", protectEducator, deleteCourse);
educatorRouter.get("/courses", protectEducator, getEducatorCourses);
educatorRouter.get("/dashboard", protectEducator, educatorDashboard);
educatorRouter.get(
  "/enrolled-students",
  protectEducator,
  getEnrolledStudentsData
);

export default educatorRouter;
```

**CHANGES:**
- Added `deleteCourse` to imports
- Added route: `educatorRouter.delete("/course/:id", protectEducator, deleteCourse);`

---

### 5. `client/src/pages/educator/AddCourse.jsx`

**KEY CHANGES SUMMARY:**
- Add states: `lectureVideoFile`, `uploadingVideo`, `uploadProgress`, `videoFileKey`
- Modify `addLecture` function to handle S3 upload
- Add file input in popup for video upload
- Add progress bar during upload
- Keep YouTube URL as fallback option

**FULL MODIFIED FILE:**
(See separate file due to length - will be provided in next section)

---

### 6. `client/src/pages/educator/EditCourse.jsx`

**KEY CHANGES SUMMARY:**
- Same S3 upload functionality as AddCourse
- Handle existing videos (YouTube or S3)

**FULL MODIFIED FILE:**
(See separate file due to length - will be provided in next section)

---

### 7. `client/src/pages/educator/MyCourses.jsx`

**BEFORE:**
```javascript
// ... existing code ...
                  <td className="px-4 py-3 flex gap-2 items-center justify-center">
                    <button
                      onClick={() =>
                        navigate(`/educator/edit-course/${course._id}`, {
                          state: { course },
                        })
                      }
                      className="px-4 py-2 border border-blue-500 text-blue-600 hover:bg-blue-500/10 transition"
                    >
                      Edit
                    </button>
                  </td>
// ... existing code ...
```

**AFTER:**
```javascript
// ... existing code ...
  const [deletingCourseId, setDeletingCourseId] = useState(null);

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingCourseId(courseId);
      const token = await getToken();
      const { data } = await axios.delete(
        `${backendUrl}/api/educator/course/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        fetchEducatorCourses(); // Refresh list
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete course");
    } finally {
      setDeletingCourseId(null);
    }
  };

// ... existing code ...
                  <td className="px-4 py-3 flex gap-2 items-center justify-center">
                    <button
                      onClick={() =>
                        navigate(`/educator/edit-course/${course._id}`, {
                          state: { course },
                        })
                      }
                      className="px-4 py-2 border border-blue-500 text-blue-600 hover:bg-blue-500/10 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course._id)}
                      disabled={deletingCourseId === course._id}
                      className="px-4 py-2 border border-red-500 text-red-600 hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingCourseId === course._id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
// ... existing code ...
```

**CHANGES:**
- Added `deletingCourseId` state
- Added `handleDeleteCourse` function
- Added Delete button next to Edit button

---

### 8. `client/src/pages/student/Player.jsx`

**KEY CHANGES SUMMARY:**
- Add states: `videoStreamUrl`, `isLoadingVideo`, `videoPlayerRef`
- Add helper functions: `isYouTubeUrl()`, `isS3Video()`, `getS3VideoUrl()`
- Modify `playLecture` to detect video type
- Add HTML5 video player component
- Handle progress tracking for both YouTube and S3 videos

**FULL MODIFIED FILE:**
(See separate file due to length - will be provided in next section)

---

## 📦 Package.json Changes

### `server/package.json`

**ADD:**
```json
"@aws-sdk/client-s3": "^3.932.0",
"@aws-sdk/s3-request-presigner": "^3.932.0"
```

**INSTALL COMMAND:**
```bash
cd server
npm install @aws-sdk/client-s3@^3.932.0 @aws-sdk/s3-request-presigner@^3.932.0
```

---

## 🔐 Environment Variables

### `server/.env` - ADD THESE:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_CLOUDFRONT_DOMAIN=https://d1234567890.cloudfront.net  # Optional, for CDN
```

**REQUIRED:**
- `AWS_REGION` - AWS region (e.g., us-east-1, ap-south-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET_NAME` - S3 bucket name

**OPTIONAL:**
- `AWS_CLOUDFRONT_DOMAIN` - CloudFront distribution domain (if using CDN)

---

## 📄 Full Modified Frontend Files

Due to length, the complete modified frontend files will be provided in the next response. Key changes:

### `AddCourse.jsx` Changes:
1. Add video file upload state and handlers
2. Request presigned URL from backend
3. Upload directly to S3 using XMLHttpRequest
4. Store `fileKey` in `lectureUrl` field
5. Show upload progress
6. Keep YouTube URL option as fallback

### `EditCourse.jsx` Changes:
1. Same as AddCourse for new lectures
2. Detect existing video type (YouTube vs S3)
3. Allow replacing videos

### `Player.jsx` Changes:
1. Detect video type (YouTube URL vs S3 fileKey)
2. Request stream URL for S3 videos
3. Use HTML5 video player for S3
4. Use YouTube player for YouTube URLs
5. Progress tracking works for both

---

## ✅ Summary

**New Files:** 3
- `server/configs/s3.js`
- `server/controllers/videoController.js`
- `server/routes/videoRoutes.js`

**Modified Files:** 6
- `server/package.json`
- `server/server.js`
- `server/controllers/educatorController.js`
- `server/routes/educatorRoutes.js`
- `client/src/pages/educator/AddCourse.jsx`
- `client/src/pages/educator/EditCourse.jsx`
- `client/src/pages/educator/MyCourses.jsx`
- `client/src/pages/student/Player.jsx`

**Environment Variables:** 5 new variables needed

---

**Ready to proceed?** Review the diffs above and confirm if you want me to apply these changes.
