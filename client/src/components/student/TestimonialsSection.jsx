import React from "react";
import { assets, dummyTestimonial } from "../../assets/assets";

const TestimonialsSection = () => {
  // Duplicate testimonials for seamless infinite scroll
  const duplicatedTestimonials = [...dummyTestimonial, ...dummyTestimonial];

  return (
    <div className="pb-14 px-8 md:px-40">
      <h2 className="text-3xl font-medium text-gray-800">Testimonials</h2>
      <p className="md:text-base text-gray-500 mt-3">
        Hear from our learners as they share their journeys of transformation,
        success, and how our <br /> platform has made a difference in their
        lives.
      </p>
      
      {/* Sliding Container - Constrained to center area */}
      <div className="mt-14 overflow-hidden">
        <div className="mx-auto max-w-6xl relative overflow-hidden">
          <div className="flex gap-8 animate-slide-left">
          {duplicatedTestimonials.map((testimonial, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[350px] md:w-[400px] text-sm text-left border border-gray-500/30 pb-6 rounded-lg bg-white shadow-[0px_4px_15px_0px] shadow-black/5 overflow-hidden"
            >
              <div className="flex items-center gap-4 px-5 py-4 bg-gray-500/10">
                <img
                  className="h-12 w-12 rounded-full"
                  src={testimonial.image}
                  alt="profile-image"
                />
                <div>
                  <h1 className="text-lg font-medium text-gray-800">
                    {testimonial.name}
                  </h1>
                  <p className="text-gray-800/80">{testimonial.role}</p>
                </div>
              </div>
              <div className="p-5 pb-7">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <img
                      className="h-5"
                      key={i}
                      src={
                        i < Math.floor(testimonial.rating)
                          ? assets.star
                          : assets.star_blank
                      }
                      alt="star"
                    />
                  ))}
                </div>
                <p className="text-gray-500 mt-5">{testimonial.feedback}</p>
              </div>
              <a href="#" className="text-blue-500 underline px-5">
                Read more
              </a>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Hover pause effect */}
      <style>{`
        .animate-slide-left:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default TestimonialsSection;
