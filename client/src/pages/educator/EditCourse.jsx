import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import uniqid from "uniqid";
import Quill from "quill";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";

const EditCourse = () => {
  const { getToken, backendUrl, fetchAllCourses } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams();

  const quillRef = useRef(null);
  const editorRef = useRef(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [coursePrice, setCoursePrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [image, setImage] = useState(null);
  const [existingThumbnail, setExistingThumbnail] = useState("");
  const [chapters, setChapters] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [courseDescription, setCourseDescription] = useState("");
  const [lectureVideoFile, setLectureVideoFile] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [lectureDetails, setLectureDetails] = useState({
    lectureTitle: "",
    lectureDuration: "",
    lectureUrl: "",
    isPreviewFree: false,
  });

  const initCourse = (course) => {
    if (!course) return;
    setCourseTitle(course.courseTitle || "");
    setCoursePrice(course.coursePrice || 0);
    setDiscount(course.discount || 0);
    setExistingThumbnail(course.courseThumbnail || "");
    setCourseDescription(course.courseDescription || "");

    const mappedChapters = (course.courseContent || []).map((chapter) => ({
      ...chapter,
      collapsed: false,
    }));
    setChapters(mappedChapters);
  };

  const loadCourse = useMemo(
    () => location.state?.course,
    [location.state?.course]
  );

  useEffect(() => {
    if (!quillRef.current && editorRef.current) {
      const quillInstance = new Quill(editorRef.current, { theme: "snow" });
      quillRef.current = quillInstance;
      quillInstance.on("text-change", () => {
        setCourseDescription(quillInstance.root.innerHTML);
      });
    }
  }, []);

  useEffect(() => {
    if (quillRef.current) {
      const currentHtml = quillRef.current.root.innerHTML;
      if ((courseDescription || "") !== currentHtml) {
        quillRef.current.root.innerHTML = courseDescription || "";
      }
    }
  }, [courseDescription]);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(
          `${backendUrl}/api/educator/courses`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.success) {
          const course = data.courses.find((item) => item._id === courseId);
          if (course) {
            initCourse(course);
          } else {
            toast.error("Course not found");
            navigate("/educator/my-courses");
          }
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoadingCourse(false);
      }
    };

    if (loadCourse) {
      initCourse(loadCourse);
      setIsLoadingCourse(false);
    } else {
      fetchCourse();
    }
  }, [loadCourse, courseId, backendUrl, getToken, navigate]);

  const handleChapter = (action, chapterId) => {
    if (action === "add") {
      const title = prompt("Enter Chapter Name:");
      if (title) {
        const newChapter = {
          chapterId: uniqid(),
          chapterTitle: title,
          chapterContent: [],
          collapsed: false,
          chapterOrder:
            chapters.length > 0 ? chapters.slice(-1)[0].chapterOrder + 1 : 1,
        };
        setChapters([...chapters, newChapter]);
      }
    } else if (action === "remove") {
      setChapters(
        chapters.filter((chapter) => chapter.chapterId !== chapterId)
      );
    } else if (action === "toggle") {
      setChapters(
        chapters.map((chapter) =>
          chapter.chapterId === chapterId
            ? { ...chapter, collapsed: !chapter.collapsed }
            : chapter
        )
      );
    }
  };

  const handleLecture = (action, chapterId, lectureIndex) => {
    if (action === "add") {
      setCurrentChapterId(chapterId);
      setShowPopup(true);
    } else if (action === "remove") {
      setChapters(
        chapters.map((chapter) => {
          if (chapter.chapterId === chapterId) {
            const updated = [...chapter.chapterContent];
            updated.splice(lectureIndex, 1);
            return { ...chapter, chapterContent: updated };
          }
          return chapter;
        })
      );
    }
  };

  // Helper function to check if URL is YouTube
  const isYouTubeUrl = (url) => {
    if (!url) return false;
    return (
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("youtube")
    );
  };

  // Helper function to check if URL is S3 fileKey (starts with "courses/")
  const isS3Video = (url) => {
    if (!url) return false;
    return url.startsWith("courses/") && !url.includes("http");
  };

  // Upload video to S3
  const uploadVideoToS3 = async (file, lectureId, chapterId) => {
    try {
      setUploadingVideo(true);
      setUploadProgress(0);

      // Get presigned URL from backend
      const token = await getToken();
      const { data: uploadData } = await axios.post(
        `${backendUrl}/api/video/upload-url`,
        {
          fileName: file.name,
          contentType: file.type,
          courseId: courseId,
          chapterId: chapterId,
          lectureId: lectureId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!uploadData.success) {
        throw new Error(uploadData.message || "Failed to get upload URL");
      }

      const { uploadUrl, fileKey } = uploadData;

      // Upload file directly to S3 using XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            setUploadProgress(100);
            resolve(fileKey);
          } else {
            reject(new Error("Upload failed"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const addLecture = async () => {
    if (!lectureDetails.lectureTitle || !lectureDetails.lectureDuration) {
      toast.error("Please fill in lecture title and duration");
      return;
    }

    const lectureId = uniqid();
    let finalLectureUrl = lectureDetails.lectureUrl;

    // If video file is selected, upload to S3
    if (lectureVideoFile) {
      try {
        // Validate file size (max 2GB)
        const maxSize = 2 * 1024 * 1024 * 1024;
        if (lectureVideoFile.size > maxSize) {
          toast.error("Video file size must be less than 2GB");
          return;
        }

        // Validate file type
        const allowedTypes = [
          "video/mp4",
          "video/webm",
          "video/quicktime",
          "video/x-msvideo",
          "video/x-matroska",
        ];
        if (!allowedTypes.includes(lectureVideoFile.type)) {
          toast.error(
            "Invalid video type. Allowed: MP4, WebM, MOV, AVI, MKV"
          );
          return;
        }

        toast.info("Uploading video...");
        const fileKey = await uploadVideoToS3(
          lectureVideoFile,
          lectureId,
          currentChapterId
        );
        finalLectureUrl = fileKey;
        toast.success("Video uploaded successfully!");
      } catch (error) {
        toast.error(error.message || "Failed to upload video");
        return;
      }
    } else if (!lectureDetails.lectureUrl || (!isYouTubeUrl(lectureDetails.lectureUrl) && !isS3Video(lectureDetails.lectureUrl))) {
      if (!window.confirm("No video file or YouTube URL provided. Continue anyway?")) {
        return;
      }
    }

    setChapters(
      chapters.map((chapter) => {
        if (chapter.chapterId === currentChapterId) {
          const lectureOrder =
            chapter.chapterContent.length > 0
              ? chapter.chapterContent.slice(-1)[0].lectureOrder + 1
              : 1;
          const newLecture = {
            ...lectureDetails,
            lectureUrl: finalLectureUrl,
            lectureOrder,
            lectureId,
          };
          return {
            ...chapter,
            chapterContent: [...chapter.chapterContent, newLecture],
          };
        }
        return chapter;
      })
    );
    setShowPopup(false);
    setLectureDetails({
      lectureTitle: "",
      lectureDuration: "",
      lectureUrl: "",
      isPreviewFree: false,
    });
    setLectureVideoFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const courseData = {
        courseTitle,
        courseDescription: courseDescription,
        coursePrice: Number(coursePrice),
        discount: Number(discount),
        courseContent: chapters,
      };

      const formData = new FormData();
      formData.append("courseData", JSON.stringify(courseData));
      if (image) {
        formData.append("image", image);
      }

      const token = await getToken();
      const { data } = await axios.put(
        `${backendUrl}/api/educator/course/${courseId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        fetchAllCourses();
        navigate("/educator/my-courses");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isLoadingCourse) {
    return (
      <div className="h-screen overflow-scroll flex items-center justify-center">
        <p className="text-gray-500">Loading course...</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-scroll flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 max-w-md w-full text-gray-500"
      >
        <div className="flex flex-col gap-1">
          <p>Course Title</p>
          <input
            onChange={(e) => setCourseTitle(e.target.value)}
            value={courseTitle}
            type="text"
            placeholder="Type here"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <p>Course Description</p>
          <div ref={editorRef}></div>
        </div>

        <div className="flex items-center justify-between flex-wrap">
          <div className="flex flex-col gap-1">
            <p>Course Price</p>
            <input
              onChange={(e) => setCoursePrice(e.target.value)}
              value={coursePrice}
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 w-28 px-3 rounded border border-gray-500"
            />
          </div>

          <div className="flex md:flex-row flex-col items-center gap-3">
            <p>Course Thumbnail</p>
            <label
              htmlFor="thumbnailImage"
              className="flex items-center gap-3 cursor-pointer"
            >
              <img
                src={assets.file_upload_icon}
                alt="file_upload_icon"
                className="p-3 bg-blue-500 rounded"
              />
              <input
                type="file"
                id="thumbnailImage"
                onChange={(e) => setImage(e.target.files[0])}
                accept="image/*"
                hidden
              />
              {image ? (
                <img
                  className="max-h-10"
                  src={URL.createObjectURL(image)}
                  alt="thumbnail preview"
                />
              ) : (
                existingThumbnail && (
                  <img
                    className="max-h-10"
                    src={existingThumbnail}
                    alt="current thumbnail"
                  />
                )
              )}
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p>Discount %</p>
          <input
            onChange={(e) => setDiscount(e.target.value)}
            value={discount}
            type="number"
            placeholder="0"
            min={0}
            max={100}
            className="outline-none md:py-2.5 py-2 w-28 px-3 rounded border border-gray-500"
            required
          />
        </div>

        {/* Adding Chapters & Lectures */}
        <div>
          {chapters.map((chapter, chapterIndex) => (
            <div key={chapter.chapterId} className="bg-white border rounded-lg mb-4">
              <div className="flex justify-between items-center p-4 border-b">
                <div className="flex items-center">
                  <img
                    onClick={() => handleChapter("toggle", chapter.chapterId)}
                    src={assets.dropdown_icon}
                    width={14}
                    alt="dropdown_icon"
                    className={`mr-2 cursor-pointer transition-all ${
                      chapter.collapsed && "-rotate-90"
                    }`}
                  />
                  <span className="font-semibold">
                    {chapterIndex + 1} {chapter.chapterTitle}
                  </span>
                </div>
                <span className="text-gray-500">
                  {chapter.chapterContent.length} Lectures
                </span>
                <img
                  onClick={() => handleChapter("remove", chapter.chapterId)}
                  src={assets.cross_icon}
                  alt="cross_icon"
                  className="cursor-pointer"
                />
              </div>
              {!chapter.collapsed && (
                <div className="p-4">
                  {chapter.chapterContent.map((lecture, lectureIndex) => (
                    <div
                      key={lecture.lectureId || lectureIndex}
                      className="flex justify-between items-center mb-2"
                    >
                      <span className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                        <span>
                          {lectureIndex + 1} {lecture.lectureTitle} -{" "}
                          {lecture.lectureDuration} mins
                        </span>
                        <a
                          href={lecture.lectureUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500"
                        >
                          Link
                        </a>
                        <span>
                          {lecture.isPreviewFree ? "Free Preview" : "Paid"}
                        </span>
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lecture.isPreviewFree}
                            onChange={(e) =>
                              setChapters(
                                chapters.map((chapterItem) => {
                                  if (chapterItem.chapterId === chapter.chapterId) {
                                    const updatedContent = [...chapterItem.chapterContent];
                                    updatedContent[lectureIndex] = {
                                      ...updatedContent[lectureIndex],
                                      isPreviewFree: e.target.checked,
                                    };
                                    return {
                                      ...chapterItem,
                                      chapterContent: updatedContent,
                                    };
                                  }
                                  return chapterItem;
                                })
                              )
                            }
                          />
                          <span>Preview</span>
                        </label>
                        <img
                          src={assets.cross_icon}
                          alt="cross_icon"
                          onClick={() =>
                            handleLecture(
                              "remove",
                              chapter.chapterId,
                              lectureIndex
                            )
                          }
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                  <div
                    className="inline-flex bg-gray-100 p-2 rounded cursor-pointer mt-2"
                    onClick={() => handleLecture("add", chapter.chapterId)}
                  >
                    + Add Lecture
                  </div>
                </div>
              )}
            </div>
          ))}
          <div
            className="flex justify-center items-center bg-blue-100 p-2 rounded-lg cursor-pointer"
            onClick={() => handleChapter("add")}
          >
            + Add Chapter
          </div>

          {showPopup && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
              <div className="bg-white text-gray-700 p-4 rounded relative w-full max-w-80">
                <h2 className="text-lg font-semibold mb-4">Add Lecture</h2>

                <div className="mb-2">
                  <p>Lecture Title</p>
                  <input
                    type="text"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureTitle}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        lectureTitle: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <p>Duration (minutes)</p>
                  <input
                    type="number"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureDuration}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        lectureDuration: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <p>Video Upload (or YouTube URL)</p>
                  <input
                    type="file"
                    accept="video/*"
                    className="mt-1 block w-full border rounded py-1 px-2 text-sm"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const maxSize = 2 * 1024 * 1024 * 1024;
                        if (file.size > maxSize) {
                          toast.error("Video file size must be less than 2GB");
                          e.target.value = "";
                          return;
                        }
                        setLectureVideoFile(file);
                        setLectureDetails({
                          ...lectureDetails,
                          lectureUrl: "",
                        });
                      }
                    }}
                  />
                  {lectureVideoFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {lectureVideoFile.name} (
                      {(lectureVideoFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                  {uploadingVideo && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploading... {uploadProgress.toFixed(0)}%
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1 mb-2">OR</p>
                  <input
                    type="text"
                    placeholder="YouTube URL or existing S3 fileKey"
                    className="mt-1 block w-full border rounded py-1 px-2 text-sm"
                    value={lectureDetails.lectureUrl}
                    onChange={(e) => {
                      setLectureDetails({
                        ...lectureDetails,
                        lectureUrl: e.target.value,
                      });
                      if (e.target.value) {
                        setLectureVideoFile(null);
                      }
                    }}
                    disabled={!!lectureVideoFile}
                  />
                  {lectureDetails.lectureUrl && !lectureVideoFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      {isS3Video(lectureDetails.lectureUrl)
                        ? "S3 Video"
                        : isYouTubeUrl(lectureDetails.lectureUrl)
                        ? "YouTube Video"
                        : "Custom URL"}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 my-4">
                  <p>Is Preview Free?</p>
                  <input
                    type="checkbox"
                    className="mt-1 scale-125"
                    checked={lectureDetails.isPreviewFree}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        isPreviewFree: e.target.checked,
                      })
                    }
                  />
                </div>

                <button
                  type="button"
                  className="w-full bg-blue-400 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={addLecture}
                  disabled={uploadingVideo}
                >
                  {uploadingVideo ? "Uploading..." : "Add"}
                </button>

                <img
                  onClick={() => setShowPopup(false)}
                  src={assets.cross_icon}
                  className="absolute top-4 right-4 w-4 cursor-pointer"
                  alt="cross_icon"
                />
              </div>
            </div>
          )}
        </div>
        <button
          type="submit"
          className="bg-black text-white w-max py-2.5 px-8 rounded my-4"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditCourse;

