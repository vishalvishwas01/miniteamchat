// src/components/chat/MessageList.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import MessageItem from "./MessageItem";
import { useDispatch, useSelector } from "react-redux";
import { fetchMessagesThunk, clearChannel } from "../../redux/slices/messagesSlice";

function DayDivider({ label }) {
  return (
    <div className="flex items-center my-4">
      <div className="flex-1 h-px bg-slate-200" />
      <div className="px-3 text-xs text-slate-500">{label}</div>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

export default function MessageList({ channelId }) {
  const dispatch = useDispatch();
  const listRef = useRef();
  const [loadingMore, setLoadingMore] = useState(false);

  // messages from redux (items are ordered oldest -> newest)
  const messages = useSelector(
    (s) => (s.messages.byChannel && s.messages.byChannel[String(channelId)]?.items) || []
  );

  // Track a pending prepend operation so we can maintain scroll position
  const pendingPrependRef = useRef({ active: false, prevScrollHeight: 0, prevScrollTop: 0 });

  // Fetch initial messages (most recent page)
  const fetchInitial = useCallback(
    (limit = 40) => {
      if (!channelId) return;
      // clear previous messages for this channel to avoid merge issues
      dispatch(clearChannel(channelId));
      // dispatch initial load (no before -> server returns the latest page)
      dispatch(fetchMessagesThunk({ channelId, limit })).then(() => {
        // after initial load, scroll to bottom
        setTimeout(() => {
          const el = listRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        }, 50);
      });
    },
    [channelId, dispatch]
  );

  // load older messages using the first message as cursor
  const loadMore = useCallback(
    (beforeMessageId, limit = 30) => {
      if (!channelId || !beforeMessageId) return Promise.resolve();
      const el = listRef.current;
      const prevScrollHeight = el ? el.scrollHeight : 0;
      const prevScrollTop = el ? el.scrollTop : 0;

      // mark pending prepend so next messages update will adjust scroll
      pendingPrependRef.current = { active: true, prevScrollHeight, prevScrollTop };

      setLoadingMore(true);
      return dispatch(fetchMessagesThunk({ channelId, before: beforeMessageId, limit }))
        .finally(() => {
          setLoadingMore(false);
        });
    },
    [channelId, dispatch]
  );

  // on mount / channel change -> initial fetch
  useEffect(() => {
    if (!channelId) return;
    fetchInitial(40);
    // cleanup: optional clear on unmount
    return () => {
      // keep messages if you want, otherwise clear
      // dispatch(clearChannel(channelId));
    };
  }, [channelId, fetchInitial]);

  // scroll handler to trigger loading older messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          if (el.scrollTop < 120 && !loadingMore) {
            // trigger load more
            const first = messages?.[0];
            const before = first?._id;
            if (before) {
              setLoadingMore(true);
              loadMore(before, 30).finally(() => setLoadingMore(false));
            }
          }
        } finally {
          ticking = false;
        }
      });
    }

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages, loadMore, loadingMore]);

  // preserve scroll position when older messages are prepended
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const pending = pendingPrependRef.current;
    if (pending.active) {
      // Calculate difference and restore scrollTop so the view stays stable
      const newScrollHeight = el.scrollHeight;
      const delta = newScrollHeight - pending.prevScrollHeight;
      // keep the same top position relative to the previous content
      el.scrollTop = pending.prevScrollTop + delta;
      // reset pending flag
      pendingPrependRef.current = { active: false, prevScrollHeight: 0, prevScrollTop: 0 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // auto-scroll to bottom on incoming new messages, only if user is near bottom
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (atBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // Group messages by day and sender (same logic as your original)
  const grouped = [];
  let lastDay = null;
  let lastSender = null;
  let currentGroup = [];

  for (const m of messages || []) {
    const day = new Date(m.createdAt).toDateString();
    if (day !== lastDay || m.senderId !== lastSender) {
      if (currentGroup.length) grouped.push({ day: lastDay, sender: lastSender, messages: currentGroup });
      currentGroup = [m];
      lastDay = day;
      lastSender = m.senderId;
    } else {
      currentGroup.push(m);
    }
  }
  if (currentGroup.length) grouped.push({ day: lastDay, sender: lastSender, messages: currentGroup });

  return (
    <div
      ref={listRef}
      className="h-full overflow-auto p-6 bg-[url('/dots.svg')] bg-repeat"
      style={{ backgroundColor: "#f6f8fa" }}
    >
      {loadingMore && <div className="text-center text-xs text-slate-500 mb-2">Loading older messages…</div>}

      {grouped.length === 0 && <div className="text-center text-slate-400 mt-12">No messages yet. Say hello 👋</div>}

      {grouped.map((group, i) => (
        <div key={i} className="mb-4">
          <DayDivider label={group.day} />
          <div className="space-y-3">
            {group.messages.map((m, idx) => (
              <MessageItem key={m._id} message={m} compact={idx !== 0} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
