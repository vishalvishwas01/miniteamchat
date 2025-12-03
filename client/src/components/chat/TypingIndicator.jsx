import React from "react";
import { useSelector } from "react-redux";

export default function TypingIndicator({ channelId }) {
  const typingMap = useSelector(
    (s) =>
      (s.typing &&
        s.typing.byChannel &&
        s.typing.byChannel[String(channelId)]) ||
      {}
  );
  const me = useSelector((s) => s.auth.user) || {};
  const myId = String(me?._id || me?.id || "");

  const users = Object.keys(typingMap || {})
    .filter((id) => String(id) !== myId)
    .map((id) => ({ _id: id, name: typingMap[id].name || id }));

  if (!users || users.length === 0) return null;

  let label = "";
  if (users.length === 1) label = `${users[0].name || "Someone"} is typing`;
  else if (users.length === 2)
    label = `${users[0].name} and ${users[1].name} are typing`;
  else label = `${users[0].name} and ${users.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 px-4 py-2">
      <div className="typing-dots text-slate-600">
        <span className="inline-block w-2 h-2 rounded-full bg-slate-600 animate-bounce" />
        <span
          className="inline-block w-2 h-2 rounded-full bg-slate-600 animate-bounce"
          style={{ animationDelay: "0.12s" }}
        />
        <span
          className="inline-block w-2 h-2 rounded-full bg-slate-600 animate-bounce"
          style={{ animationDelay: "0.24s" }}
        />
      </div>
      <div>{label}…</div>
    </div>
  );
}
