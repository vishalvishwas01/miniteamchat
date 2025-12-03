
import React from "react";

export function AvatarFromName({ name = "U", size = 40 }) {
  const initials = (name || "U").split(" ").map((s) => s[0]).join("").slice(0,2).toUpperCase();
  const colors = ["bg-indigo-500","bg-emerald-500","bg-rose-500","bg-amber-500","bg-sky-500","bg-violet-500"];
  const color = colors[(initials.charCodeAt(0) || 65) % colors.length];
  const px = size >= 40 ? "text-base" : "text-sm";
  return (
    <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white p-1 ${px}`}>
      {initials}
    </div>
  );
}
