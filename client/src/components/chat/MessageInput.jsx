// src/components/chat/MessageInput.jsx
import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import socketClient from "../../lib/socketClient";
import { addOptimisticMessage } from "../../redux/slices/messagesSlice";
import useTyping from "../../hooks/useTyping";
import TypingIndicator from "./TypingIndicator";

function genClientId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function MessageInput({ channelId, onSend }) {
  const [text, setText] = useState("");
  const dispatch = useDispatch();
  const inputRef = useRef();
  const user = useSelector((s) => s.auth.user);
  const { onInput } = useTyping(channelId);

  async function sendMessage() {
    if (!text.trim() || !channelId) return;
    const clientId = genClientId();
    const now = new Date().toISOString();

    // optimistic message payload (use clientId as temp _id)
    const optimistic = {
      _id: clientId,
      channelId,
      senderId: user?.id || user?._id || user?.id,
      senderName: user?.name || "You",
      text,
      clientId,
      createdAt: now,
      temp: true,
    };

    // add optimistic message to store
    dispatch(addOptimisticMessage(optimistic));

    // emit via socket with clientId (server will persist and broadcast back with clientId)
    socketClient.onReady((sock) => {
      try {
        sock.emit(
          "message:new",
          { channelId, text, clientId },
          (ack) => {
            if (ack && ack.ok) {
              // server will broadcast message:received which our reducer handles.
            } else if (ack && ack.error) {
              console.warn("socket send error", ack.error);
            }
          }
        );

        // immediately tell server we stopped typing (clear indicator)
        try {
          sock.emit("typing:stop", { channelId, userId: user?._id || user?.id });
        } catch (e) {
          // ignore
        }
      } catch (e) {
        console.warn("emit error", e);
      }
    });

    // optional callback for parent
    if (typeof onSend === "function") onSend(optimistic);

    setText("");
    inputRef.current?.focus();
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleChange(e) {
    setText(e.target.value);
    try {
      onInput(); // notify typing hook
    } catch (err) {
      // safe noop if hook not ready
    }
  }

  return (
    <div className="bg-white p-3 rounded border border-slate-200">
      <div className="flex gap-3 items-start">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder="Enter text message..."
          className="w-full resize-none border border-slate-200 rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <TypingIndicator channelId={channelId} />
        <button
          onClick={sendMessage}
          className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer text-white px-3 py-1 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
