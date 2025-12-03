// client/src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import socketClient from "../lib/socketClient";
import { useDispatch, useSelector } from "react-redux";
import axios from "../api/axiosInstance";
import {
  receiveMessage,
  messageEdited,
  messageDeleted,
} from "../redux/slices/messagesSlice";
import { setPresence } from "../redux/slices/presenceSlice";
import {
  removeChannel,
  updateChannelMembers,
  setCurrentChannel,
  fetchChannelsThunk,
  addIncomingRequest,
  removeIncomingRequest,
  markRequestApproved,
} from "../redux/slices/channelsSlice";
import { typingStarted, typingStopped } from "../redux/slices/typingSlice";

/**
 * useSocket(token)
 *
 * - Initializes a shared socket client when token is present
 * - Attaches listeners once per socket lifecycle
 * - Auto-joins/leaves current channel
 * - Handles channel-level events (deleted, members updated, member left)
 * - Handles join-request flow (creator receives request, requester gets approved/rejected)
 */
export default function useSocket(token) {
  const dispatch = useDispatch();
  const currentChannelId = useSelector((s) => s.channels.currentChannelId);
  const currentUserId = useSelector(
    (s) => s.auth.user?.id || s.auth.user?._id || s.auth.user?.id
  );
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      socketClient.disconnect();
      socketRef.current = null;
      return;
    }

    const sock = socketClient.init(token);
    socketRef.current = sock;

    // inside the big useEffect attaching listeners

    function onTypingStarted({ channelId, userId, userName }) {
      // payload should include channelId and requester info
      if (!channelId || !userId) return;
      dispatch(
        typingStarted({
          channelId,
          user: { _id: userId, name: userName || "" },
        })
      );
    }

    function onTypingStopped({ channelId, userId }) {
      if (!channelId || !userId) return;
      dispatch(typingStopped({ channelId, userId }));
    }

    // attach
    sock.on("typing:started", onTypingStarted);
    sock.on("typing:stopped", onTypingStopped);

    // detach in cleanup
    sock.off("typing:started", onTypingStarted);
    sock.off("typing:stopped", onTypingStopped);

    // --- Message handlers ---
    function onMessage(msg) {
      if (!msg) return;
      if (msg.channelId && typeof msg.channelId === "object") {
        msg.channelId = msg.channelId._id || String(msg.channelId);
      }
      dispatch(receiveMessage(msg));
    }

    function onEdited(msg) {
      if (!msg) return;
      if (msg.channelId && typeof msg.channelId === "object") {
        msg.channelId = msg.channelId._id || String(msg.channelId);
      }
      dispatch(messageEdited(msg));
    }

    function onDeleted(payload) {
      dispatch(messageDeleted(payload));
    }

    function onPresence(p) {
      dispatch(setPresence(p));
    }

    // --- Channel handlers ---
    function onChannelDeleted({ channelId }) {
      if (!channelId) return;
      console.log("[useSocket] channel deleted:", channelId);
      dispatch(removeChannel(channelId));
      dispatch(setCurrentChannel(null));
    }

    async function onMembersUpdated({ channelId }) {
      if (!channelId) return;
      try {
        console.log("[useSocket] members updated for channel:", channelId);
        const res = await axios.get(`/channels/${channelId}/members`);
        const members = res?.data?.members || [];
        dispatch(updateChannelMembers({ channelId, members }));

        // If the current user is viewing this channel but is no longer a member, force leave
        if (String(currentChannelId) === String(channelId)) {
          const present = members.some(
            (m) => String(m._id || m) === String(currentUserId)
          );
          if (!present) {
            console.log(
              "[useSocket] current user is no longer a member — leaving channel:",
              channelId
            );
            dispatch(setCurrentChannel(null));
            const s = socketClient.get();
            if (s && s.connected) s.emit("channel:leave", { channelId });
            dispatch(fetchChannelsThunk());
          }
        }
      } catch (err) {
        console.warn(
          "[useSocket] failed to fetch channel members for update",
          err
        );
      }
    }

    function onMemberLeft({ channelId, userId }) {
      if (!channelId) return;
      console.log("[useSocket] member left", userId, "from", channelId);
      onMembersUpdated({ channelId });
    }

    // --- Join-request handlers (creator & requester) ---
    function onJoinRequest(payload) {
      // payload: { channelId, channelName, requester: { _id, name } }
      if (!payload) return;
      console.log("[useSocket] incoming join request", payload);
      // If current user is the creator, add to incomingRequests list
      dispatch(
        addIncomingRequest({
          channelId: payload.channelId,
          channelName: payload.channelName,
          requester: payload.requester,
        })
      );
    }

    function onRequestApproved(payload) {
      // payload: { channelId, userId }
      if (!payload) return;
      console.log("[useSocket] request approved:", payload);

      const { channelId, userId } = payload;

      // If current user was the requester, refresh channels (so approved channel appears)
      if (String(currentUserId) === String(userId)) {
        dispatch(fetchChannelsThunk());
        // Optionally notify the user
        try {
          // small UI feedback
          // eslint-disable-next-line no-alert
          alert(
            "Your join request was approved — channel added to your sidebar."
          );
          window.location.reload();
        } catch (e) {}
      }

      // remove from creator's incomingRequests if present
      dispatch(markRequestApproved({ channelId, userId }));
      // also refresh members for that channel so creator sees update
      dispatch(fetchChannelsThunk());
    }

    function onRequestRejected(payload) {
      // payload: { channelId, userId }
      if (!payload) return;
      console.log("[useSocket] request rejected:", payload);
      const { channelId, userId } = payload;

      // If current user was the requester, optionally notify
      if (String(currentUserId) !== String(userId)) {
        try {
          // eslint-disable-next-line no-alert
          alert("join request was rejected.");
        } catch (e) {}
      }

      // remove pending from creator's list if present
      dispatch(removeIncomingRequest({ channelId, userId }));
      // refresh search results or channels as needed
      dispatch(fetchChannelsThunk());
    }

    // --- Attach listeners ---
    if (sock) {
      console.log("[useSocket] attaching listeners to socket", sock.id);
      sock.on("message:received", onMessage);
      sock.on("message:edited", onEdited);
      sock.on("message:deleted", onDeleted);
      sock.on("presence:update", onPresence);

      sock.on("channel:deleted", onChannelDeleted);
      sock.on("channel:members:updated", onMembersUpdated);
      sock.on("channel:member:left", onMemberLeft);

      // join-request events
      sock.on("channel:joinRequest", onJoinRequest);
      sock.on("channel:request:approved", onRequestApproved);
      sock.on("channel:request:rejected", onRequestRejected);
    }

    return () => {
      if (sock) {
        console.log("[useSocket] removing listeners from socket", sock.id);
        sock.off("message:received", onMessage);
        sock.off("message:edited", onEdited);
        sock.off("message:deleted", onDeleted);
        sock.off("presence:update", onPresence);

        sock.off("channel:deleted", onChannelDeleted);
        sock.off("channel:members:updated", onMembersUpdated);
        sock.off("channel:member:left", onMemberLeft);

        sock.off("channel:joinRequest", onJoinRequest);
        sock.off("channel:request:approved", onRequestApproved);
        sock.off("channel:request:rejected", onRequestRejected);
      }
    };
  }, [token, dispatch, currentChannelId, currentUserId]);

  // join the currently selected channel when socket connects or when channel changes
  useEffect(() => {
    if (!currentChannelId) return;

    socketClient.onReady((sock) => {
      if (!sock) return;
      console.log(
        "[useSocket] joining channel:",
        currentChannelId,
        "socket id:",
        sock.id
      );
      sock.emit("channel:join", { channelId: currentChannelId });
    });

    return () => {
      const sock = socketClient.get();
      if (sock && sock.connected) {
        console.log("[useSocket] leaving channel:", currentChannelId);
        sock.emit("channel:leave", { channelId: currentChannelId });
      }
    };
  }, [currentChannelId]);

  return socketRef;
}
