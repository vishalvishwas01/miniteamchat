import React from "react";
import { useSelector } from "react-redux";
import { AvatarFromName } from "../../utils/avatar";

export default function MessageItem({ message, compact = false }) {
  const currentUser = useSelector((s) => s.auth.user);
  const currentUserId = currentUser?.id || currentUser?._id || currentUser?.id;
  const senderId = message.senderId;
  const isCurrent = String(senderId) === String(currentUserId);

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const senderName = message.senderName || message.senderId || "User";

  return (
    <div
      className={`flex items-start gap-3 ${compact ? "mt-1" : "my-2"} ${
        isCurrent ? "justify-start" : "justify-end"
      }`}
    >
      {isCurrent ? (
        <>
          <div className="flex-none">
            <AvatarFromName name={senderName} size={40} />
          </div>
          <div className="flex-1 max-w-xl">
            {!compact && (
              <div className="text-sm font-semibold">
                {senderName}{" "}
                <span className="text-xs text-slate-400">· {time}</span>
              </div>
            )}
            <div className="mt-1">
              <div className="inline-block bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">
                {message.text}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 max-w-xl text-right">
            {!compact && (
              <div className="text-sm font-semibold">
                {senderName}{" "}
                <span className="text-xs text-slate-400">· {time}</span>
              </div>
            )}
            <div className="mt-1 flex justify-end">
              <div className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-sm">
                {message.text}
              </div>
            </div>
          </div>
          <div className="flex-none">
            <AvatarFromName name={senderName} size={40} />
          </div>
        </>
      )}
    </div>
  );
}
