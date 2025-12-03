// client/src/components/chat/TypingIndicator.jsx
import React from "react";
import { useSelector } from "react-redux";

/* simple CSS for three-dot animation (add to global CSS or tailwind utilities)
.typing-dots span {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin: 0 2px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.3;
  animation: typing-bounce 1s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes typing-bounce {
  0% { transform: translateY(0); opacity: 0.3; }
  50% { transform: translateY(-4px); opacity: 1; }
  100% { transform: translateY(0); opacity: 0.3; }
}
*/

export default function TypingIndicator({ channelId }) {
  const typingMap = useSelector((s) => (s.typing && s.typing.byChannel && s.typing.byChannel[String(channelId)]) || {});
  const me = useSelector((s) => s.auth.user) || {};
  const myId = String(me?._id || me?.id || "");
  // filter out current user
  const users = Object.keys(typingMap || {}).filter((id) => String(id) !== myId).map((id) => ({ _id: id, name: typingMap[id].name || id }));

  if (!users || users.length === 0) return null;

  // create a friendly label
  let label = "";
  if (users.length === 1) label = `${users[0].name || "Someone"} is typing`;
  else if (users.length === 2) label = `${users[0].name} and ${users[1].name} are typing`;
  else label = `${users[0].name} and ${users.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 px-4 py-2">
      <div className="typing-dots text-slate-600">
        <span className="inline-block w-2 h-2 rounded-full bg-slate-600 animate-bounce" />
        <span className="inline-block w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: "0.12s" }} />
        <span className="inline-block w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: "0.24s" }} />
      </div>
      <div>{label}…</div>
    </div>
  );
}
