// client/src/components/layout/Topbar.jsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  leaveChannelThunk,
  deleteChannelThunk,
  removeChannel,
  setCurrentChannel,
} from "../../redux/slices/channelsSlice";
import socketClient from "../../lib/socketClient";
import { fetchChannelsThunk } from "../../redux/slices/channelsSlice";
import ChannelSearch from "./ChannelSearch";

export default function Topbar() {
  const navigate = useNavigate();
  const currentId = useSelector((s) => s.channels.currentChannelId);
  const channel = useSelector((s) =>
    (s.channels.list || []).find((c) => String(c._id) === String(currentId))
  );
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  if (!channel) return <div className="h-16 bg-white border-b pl-4 flex justify-start items-center">
    <ChannelSearch />
  </div>;

  const isCreator = String(channel.createdBy) === String(user?.id || user?._id);

  // inside Topbar.jsx — replace onLeave with this
  async function onLeave() {
    if (!currentId) return;
    if (!confirm("Leave this channel?")) return;

    try {
      // optimistic UI: remove locally immediately so sidebar updates without delay
      dispatch(removeChannel(currentId));
      dispatch(setCurrentChannel(null));

      // ensure socket leaves the room immediately
      const s = socketClient.get();
      if (s && s.connected) {
        s.emit("channel:leave", { channelId: currentId });
      }

      // call API to persist the leave
      await dispatch(leaveChannelThunk(currentId)).unwrap();

      // refresh channel list from server for full consistency (optional)
      dispatch(fetchChannelsThunk());
      // navigate away to a safe route
      navigate("/app");
    } catch (err) {
      console.error("leave failed", err);
      // If API failed, we should re-load channels to return to correct state
      dispatch(fetchChannelsThunk());
      const msg =
        err?.message ||
        (err?.payload && err.payload.error) ||
        "Failed to leave channel";
      alert(`Leave failed: ${msg}`);
    }
  }

  async function onDelete() {
    if (!currentId) return;
    if (!confirm("Delete this channel? This cannot be undone.")) return;
    try {
      const result = await dispatch(deleteChannelThunk(currentId)).unwrap();
      // server will broadcast channel:deleted; remove from local store just in case
      dispatch(removeChannel(currentId));
    } catch (err) {
      console.error("delete failed", err);
      alert("Failed to delete channel");
    }
  }

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between">
      <div>
        <div className="text-lg font-semibold"># {channel.name}</div>
        <div className="text-xs text-slate-500">
          {channel.members?.length || 0} members
        </div>
      </div>
      <div className="flex items-center gap-3">
         <ChannelSearch />
        {!isCreator && <button
          onClick={onLeave}
          className="px-3 py-1 rounded hover:bg-slate-100 cursor-pointer"
        >
          Leave
        </button>}
        {isCreator && (
          <button
            onClick={onDelete}
            className="px-3 py-1 rounded bg-rose-500 cursor-pointer text-white hover:bg-rose-600"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
