import { useEffect, useRef, useCallback } from "react";
import socketClient from "../lib/socketClient";
import { useSelector } from "react-redux";

export default function useTyping(channelId, opts = {}) {
  const idleTimeout = opts.idleTimeout ?? 2000;
  const socketRef = socketClient;
  const typingRef = useRef({ started: false, timer: null });
  const me = useSelector((s) => s.auth.user) || {};
  const myId = me?._id || me?.id;

  const emitStart = useCallback(() => {
    const s = socketRef.get();
    if (!s || !s.connected || !channelId) return;
    if (!typingRef.current.started) {
      s.emit("typing:start", { channelId });
      typingRef.current.started = true;
    }
  }, [channelId]);

  const emitStop = useCallback(() => {
    const s = socketRef.get();
    if (!s || !s.connected || !channelId) return;
    if (typingRef.current.started) {
      s.emit("typing:stop", { channelId });
      typingRef.current.started = false;
    }
    if (typingRef.current.timer) {
      clearTimeout(typingRef.current.timer);
      typingRef.current.timer = null;
    }
  }, [channelId]);

  const onInput = useCallback(() => {
    if (!channelId) return;
    emitStart();
    if (typingRef.current.timer) clearTimeout(typingRef.current.timer);
    typingRef.current.timer = setTimeout(() => {
      emitStop();
    }, idleTimeout);
  }, [emitStart, emitStop, idleTimeout, channelId]);

  useEffect(() => {
    return () => {
      try {
        emitStop();
      } catch (e) {}
    };
  }, [emitStop]);

  return { onInput };
}
