import React, { useContext, useEffect, useState, useRef } from "react";
import { AppContext } from "../../context/AppContext";
import { useParams } from "react-router-dom";
import { assets } from "../../assets/assets";
import humanizeDuration from "humanize-duration";
import YouTube from "react-youtube";
import Footer from "../../components/student/Footer";
import Rating from "../../components/student/Rating";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";

const Player = () => {
  const {
    enrolledCourses,
    calculateChapterTime,
    backendUrl,
    getToken,
    userData,
    fetchUserEnrolledCourses,
  } = useContext(AppContext);
  const { courseId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [playerData, setPlayerData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [initialRating, setInitialRating] = useState(0);
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const [videoStreamUrl, setVideoStreamUrl] = useState(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const videoPlayerRef = useRef(null);
  const progressUpdateInterval = useRef(null);

  const getCourseData = () => {
    enrolledCourses.map((course) => {
      if (course._id === courseId) {
        setCourseData(course);
        course.courseRatings.map((item) => {
          if (item.userId === userData._id) {
            setInitialRating(item.rating);
          }
        });
      }
    });
  };

  const toggleSection = (index) => {
    setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));
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

  // Helper function to check if URL is S3 fileKey
  const isS3Video = (url) => {
    if (!url) return false;
    return url.startsWith("courses/") && !url.includes("http");
  };

  const extractYouTubeId = (url = "") => {
    try {
      if (!url) return "";

      if (!url.includes("http")) {
        return url.split("?")[0];
      }

      const parsed = new URL(url);

      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.replace("/", "").split("?")[0];
      }

      if (parsed.searchParams.has("v")) {
        return parsed.searchParams.get("v") || "";
      }

      const lastSegment = parsed.pathname.split("/").pop() || "";
      return lastSegment.split("?")[0];
    } catch {
      return url.split("?")[0];
    }
  };

  // Get S3 video stream URL
  const getS3VideoUrl = async (fileKey, courseId, lectureId) => {
    try {
      setIsLoadingVideo(true);
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/video/stream-url`,
        { fileKey, courseId, lectureId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        return data.streamUrl;
      } else {
        throw new Error(data.message || "Failed to get video URL");
      }
    } catch (error) {
      console.error("Error getting S3 video URL:", error);
      toast.error(error.message || "Failed to load video");
      throw error;
    } finally {
      setIsLoadingVideo(false);
    }
  };

  useEffect(() => {
    if (enrolledCourses.length > 0) {
      getCourseData();
    }
  }, [enrolledCourses]);

  const markLectureAsCompleted = async (lectureId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/update-course-progress",
        { courseId, lectureId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        getCourseProgress();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getCourseProgress = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/get-course-progress",
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setProgressData(data.progressData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRate = async (rating) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/add-rating",
        { courseId, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message);
        fetchUserEnrolledCourses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    getCourseProgress();
  }, []);

  // Track video progress in real-time
  const updateWatchProgress = async (currentTime, totalDuration) => {
    if (!playerData || !playerData.lectureId) return;

    try {
      const token = await getToken();
      await axios.post(
        `${backendUrl}/api/user/update-watch-progress`,
        {
          courseId,
          lectureId: playerData.lectureId,
          watchTime: Math.floor(currentTime), // Convert to seconds
          totalDuration: Math.floor(totalDuration), // Convert to seconds
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh progress data to update UI
      getCourseProgress();
    } catch (error) {
      console.error("Failed to update watch progress:", error);
    }
  };

  // Handle HTML5 video events
  const handleVideoLoadedMetadata = (e) => {
    const video = e.target;
    if (video && progressData && playerData) {
      const lectureProgress = progressData.lectureProgress?.find(
        (lp) => lp.lectureId === playerData.lectureId
      );
      
      if (lectureProgress && lectureProgress.watchTime > 0 && lectureProgress.watchTime < lectureProgress.totalDuration) {
        // Resume from last watched position
        video.currentTime = lectureProgress.watchTime;
      }
    }
  };

  const handleVideoTimeUpdate = (e) => {
    const video = e.target;
    if (video && video.readyState >= 2) {
      // Update progress every 5 seconds
      const currentTime = Math.floor(video.currentTime);
      const totalDuration = Math.floor(video.duration);
      
      // Only update if significant time has passed (avoid too many requests)
      // Use a ref to track last update time
      if (currentTime > 0 && currentTime % 5 === 0) {
        updateWatchProgress(currentTime, totalDuration);
      }
    }
  };

  const handleVideoEnded = (e) => {
    const video = e.target;
    if (video && playerData) {
      const currentTime = Math.floor(video.currentTime);
      const totalDuration = Math.floor(video.duration);
      updateWatchProgress(currentTime, totalDuration);
      // Auto-mark as completed
      markLectureAsCompleted(playerData.lectureId);
    }
  };

  // YouTube player event handlers
  const handlePlayerReady = (event) => {
    setYoutubePlayer(event.target);
    
    // Wait a bit for progressData to load, then check for saved progress
    setTimeout(() => {
      if (progressData && playerData) {
        const lectureProgress = progressData.lectureProgress?.find(
          (lp) => lp.lectureId === playerData.lectureId
        );
        
        if (lectureProgress && lectureProgress.watchTime > 0 && lectureProgress.watchTime < lectureProgress.totalDuration) {
          // Resume from last watched position (but not if already completed)
          event.target.seekTo(lectureProgress.watchTime);
        }
      }
    }, 500);

    // Start tracking progress every 5 seconds
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
    }

    progressUpdateInterval.current = setInterval(() => {
      if (event.target && event.target.getCurrentTime) {
        try {
          const currentTime = event.target.getCurrentTime();
          const totalDuration = event.target.getDuration();
          if (currentTime > 0 && totalDuration > 0) {
            updateWatchProgress(currentTime, totalDuration);
          }
        } catch (error) {
          console.error("Error getting player time:", error);
        }
      }
    }, 5000); // Update every 5 seconds
  };

  const handlePlayerStateChange = (event) => {
    // Update progress when video ends
    if (event.data === 0) { // 0 = ended
      if (youtubePlayer) {
        const currentTime = youtubePlayer.getCurrentTime();
        const totalDuration = youtubePlayer.getDuration();
        updateWatchProgress(currentTime, totalDuration);
      }
    }
  };

  // Refresh progress when playerData changes
  useEffect(() => {
    if (playerData) {
      getCourseProgress();
    }
  }, [playerData]);

  // Cleanup interval on unmount or when playerData changes
  useEffect(() => {
    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    };
  }, [playerData]);

  return courseData ? (
    <>
      <div className="p-4 sm:p-10 flex flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36">
        {/* left column */}
        <div className="text-gray-800">
          <h2 className="text-xl font-semibold">Course Structure</h2>

          <div className="pt-5">
            {courseData &&
              courseData.courseContent.map((chapter, index) => (
                <div
                  key={index}
                  className="border border-gray-300 bg-white mb-2 rounded"
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSection(index)}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        className={`transform transition-transform ${
                          openSections[index] ? "rotate-180" : ""
                        }`}
                        src={assets.down_arrow_icon}
                        alt="down_arrow_icon"
                      />
                      <p className="font-medium md:text-base text-sm">
                        {chapter.chapterTitle}
                      </p>
                    </div>
                    <p className="text-sm md:text-default">
                      {chapter.chapterContent.length} lectures -{" "}
                      {calculateChapterTime(chapter)}
                    </p>
                  </div>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openSections[index] ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                      {chapter.chapterContent.map((lecture, i) => {
                        const isCompleted =
                          progressData &&
                          progressData.lectureCompleted.includes(
                            lecture.lectureId
                          );

                        const playLecture = async () => {
                          if (!lecture.lectureUrl) {
                            toast.warn("Lecture link not available yet.");
                            return;
                          }

                          // Check if it's S3 video or YouTube
                          if (isS3Video(lecture.lectureUrl)) {
                            try {
                              setIsLoadingVideo(true);
                              const streamUrl = await getS3VideoUrl(
                                lecture.lectureUrl,
                                courseId,
                                lecture.lectureId
                              );
                              setVideoStreamUrl(streamUrl);
                              setPlayerData({
                                ...lecture,
                                videoType: "s3",
                                chapter: index + 1,
                                lecture: i + 1,
                              });
                            } catch (error) {
                              toast.error("Failed to load video");
                            } finally {
                              setIsLoadingVideo(false);
                            }
                          } else if (isYouTubeUrl(lecture.lectureUrl)) {
                            // YouTube video
                            setVideoStreamUrl(null);
                            setPlayerData({
                              ...lecture,
                              videoId: extractYouTubeId(lecture.lectureUrl),
                              videoType: "youtube",
                              chapter: index + 1,
                              lecture: i + 1,
                            });
                          } else {
                            // Fallback for other URLs
                            setVideoStreamUrl(lecture.lectureUrl);
                            setPlayerData({
                              ...lecture,
                              videoType: "url",
                              chapter: index + 1,
                              lecture: i + 1,
                            });
                          }
                        };

                        return (
                          <li key={i} className="flex items-start gap-2 py-1">
                            <img
                              src={isCompleted ? assets.blue_tick_icon : assets.play_icon}
                              alt={isCompleted ? "completed" : "play icon"}
                              className="w-4 h-4 mt-1 cursor-pointer"
                              onClick={playLecture}
                            />
                            <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-default">
                              <p>{lecture.lectureTitle}</p>
                              <div className="flex gap-2 items-center">
                                <span
                                  onClick={playLecture}
                                  className="text-blue-500 cursor-pointer"
                                >
                                  Watch
                                </span>
                                <p>
                                  {humanizeDuration(
                                    lecture.lectureDuration * 60 * 1000,
                                    { units: ["h", "m"] }
                                  )}
                                </p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex items-center gap-2 py-3 mt-10">
            <h1 className="text-xl font-bold">Rate this Course:</h1>
            <Rating initialRating={initialRating} onRate={handleRate} />
          </div>
        </div>

        {/* right column */}
        <div className="md:mt-10">
          {playerData ? (
            <div>
              {isLoadingVideo ? (
                <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
                  <p className="text-white">Loading video...</p>
                </div>
              ) : playerData.videoType === "s3" && videoStreamUrl ? (
                <video
                  ref={videoPlayerRef}
                  src={videoStreamUrl}
                  controls
                  className="w-full aspect-video"
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                />
              ) : playerData.videoType === "youtube" && playerData.videoId ? (
                <YouTube
                  videoId={playerData.videoId}
                  iframeClassName="w-full aspect-video"
                  onReady={handlePlayerReady}
                  onStateChange={handlePlayerStateChange}
                />
              ) : videoStreamUrl ? (
                <video
                  ref={videoPlayerRef}
                  src={videoStreamUrl}
                  controls
                  className="w-full aspect-video"
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                />
              ) : (
                <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
                  <p className="text-white">Video not available</p>
                </div>
              )}
              <div className="flex justify-between items-center mt-1">
                <p>
                  {playerData.chapter}.{playerData.lecture}{" "}
                  {playerData.lectureTitle}
                </p>
                <button
                  onClick={() => markLectureAsCompleted(playerData.lectureId)}
                  className="text-blue-600"
                >
                  {progressData &&
                  progressData.lectureCompleted.includes(playerData.lectureId)
                    ? "Completed"
                    : "Mark Complete"}
                </button>
              </div>
            </div>
          ) : (
            <img
              src={courseData ? courseData.courseThumbnail : ""}
              alt={courseData ? courseData.courseTitle : ""}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  ) : (
    <Loading />
  );
};

export default Player;
