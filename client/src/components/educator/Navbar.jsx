import React from "react";
import { assets, dummyEducatorData } from "../../assets/assets";
import { UserButton, useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const educatorData = dummyEducatorData;
  const { user } = useUser();

  return (
    <div className="flex items-center justify-between px-4 md:px-8 border-b border-gray-500 py-3">
      <Link to="/" className="flex items-center gap-2">
        <img
          src={assets.logo}
          alt="SkillSphere Logo"
          className="w-12 h-12 md:w-14 md:h-14 object-contain"
        />
        <span className="text-xl md:text-2xl font-bold text-gray-800">
          SkillSphere
        </span>
      </Link>
      <div className="flex items-center gap-5 text-gray-500 relative">
        <p>Hi! {user ? user.fullName : "Developers"}</p>
        {user ? (
          <UserButton />
        ) : (
          <img src={assets.profile_img} alt="profile_img" className="max-w-8" />
        )}
      </div>
    </div>
  );
};

export default Navbar;
