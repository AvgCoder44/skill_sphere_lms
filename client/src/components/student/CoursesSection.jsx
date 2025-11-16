import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import CourseCard from "./CourseCard";

const CoursesSection = () => {
  const { allCourses } = useContext(AppContext);

  return (
    <div className="py-16 md:px-40 px-8">
      <h2 className="text-3xl font-medium text-gray-800">
        Learn from the best
      </h2>
      <p className="text-sm md:text-base text-gray-500 mt-3">
        Discover our top-rated courses across various categories. From coding
        and design to <br /> business and wellness, our courses are crafted to
        deliver results.
      </p>

      <div className="mt-10 md:mt-16 px-2 md:px-0">
        {allCourses.length ? (
          <div
            className="mx-auto grid w-full max-w-6xl gap-6 justify-items-center"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
          >
            {allCourses.map((course, index) => (
              <CourseCard key={index} course={course} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 py-10 text-center">
            Courses are on the way. Check back soon!
          </p>
        )}
      </div>

      <div className="flex justify-center mt-10">
        <Link
          to={"/course-list"}
          onClick={() => scrollTo(0, 0)}
          className="text-gray-500 border border-gray-500/30 px-10 py-3 rounded inline-flex justify-center"
        >
          Show all courses
        </Link>
      </div>
    </div>
  );
};

export default CoursesSection;
