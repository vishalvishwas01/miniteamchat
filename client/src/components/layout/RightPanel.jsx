// client/src/components/layout/RightPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AvatarFromName } from "../../utils/avatar";
import axios from "../../api/axiosInstance";
import {
  approveRequestThunk,
  rejectRequestThunk,
  fetchChannelsThunk,
} from "../../redux/slices/channelsSlice";
import socketClient from "../../lib/socketClient";

export default function RightPanel() {
  const dispatch = useDispatch();
  const currentId = useSelector((s) => s.channels.currentChannelId);
  const channelsList = useSelector((s) => s.channels.list || []);
  const channel = channelsList.find((c) => String(c._id) === String(currentId)) || null;
  const currentUser = useSelector((s) => s.auth.user);
  const myId = currentUser?._id || currentUser?.id;
  // presence map expected shape: { [userId]: { online: true/false } }
  const presenceMap = useSelector((s) => s.presence?.byId || {});
  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async (channelId) => {
    if (!channelId) {
      setMembers([]);
      setPending([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/channels/${channelId}/members`);
      if (res?.data) {
        setMembers(res.data.members || []);
        setPending(res.data.pendingRequests || []);
      } else {
        setMembers([]);
        setPending([]);
      }
    } catch (err) {
      console.error("Failed to fetch channel members", err);
      setMembers([]);
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers(currentId);
  }, [currentId, fetchMembers]);

  async function onApprove(userId) {
    if (!currentId || !userId) return;
    try {
      await dispatch(approveRequestThunk({ channelId: currentId, userId })).unwrap();
      await fetchMembers(currentId);
      dispatch(fetchChannelsThunk());
    } catch (err) {
      console.error("approve failed", err);
      alert("Approve failed");
    }
  }

  async function onReject(userId) {
    if (!currentId || !userId) return;
    try {
      await dispatch(rejectRequestThunk({ channelId: currentId, userId })).unwrap();
      await fetchMembers(currentId);
    } catch (err) {
      console.error("reject failed", err);
      alert("Reject failed");
    }
  }

  async function onRemoveMember(userId) {
    if (!currentId || !userId) return;
    if (!confirm("Remove this user from the channel?")) return;
    try {
      const res = await axios.post(`/channels/${currentId}/remove-member`, { userId });
      if (res?.data?.ok) {
        await fetchMembers(currentId);
        dispatch(fetchChannelsThunk());
      } else {
        alert("Failed to remove member");
      }
    } catch (err) {
      console.error("remove member failed", err);
      alert("Remove member failed");
    }
  }

  const isCreator = channel && String(channel.createdBy) === String(myId);

  const renderPresenceDot = (userId) => {
    const online = !!(presenceMap && presenceMap[userId] && presenceMap[userId].online);
    return (
      <div
        className={`w-3 h-3 rounded-full ${online ? "bg-emerald-400" : "bg-slate-300"}`}
        title={online ? "online" : "offline"}
      />
    );
  };

  const renderStatusText = (userId) => {
    const online = !!(presenceMap && presenceMap[userId] && presenceMap[userId].online);
    return <div className="text-xs text-slate-400">{online ? "Active" : "Offline"}</div>;
  };

  return (
    <aside className="w-72 bg-white border-l border-slate-200 px-4 py-4">
      <div className="text-sm font-semibold mb-3">Members</div>

      {loading && <div className="text-sm text-slate-400 mb-2">Loading...</div>}

      <div className="space-y-3 mb-4">
        {members.length === 0 && <div className="text-sm text-slate-400">No members yet</div>}
        {members.map((m) => {
          const id = m._id || m;
          const name = m.name || String(m);
          const isMemberCreator = channel && String(channel.createdBy) === String(id);
          const showRemove = isCreator && !isMemberCreator;

          return (
            <div key={id} className="flex items-center gap-3 justify-between">
              <div className="flex items-center justify-center gap-3">
                <AvatarFromName name={name} size={26} />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {name}
                    <span>{renderPresenceDot(id)}</span>
                  </div>
                  {renderStatusText(id)}
                </div>
              </div>

              <div>
                {showRemove ? (
                  <button
                    onClick={() => onRemoveMember(id)}
                    className="px-2 py-1 text-xs rounded bg-rose-500 hover:bg-rose-600 cursor-pointer text-white"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {isCreator && (
        <>
          <div className="text-sm font-semibold mb-2">Pending Requests</div>
          <div className="space-y-3">
            {pending.length === 0 && <div className="text-sm text-slate-400">No pending requests</div>}
            {pending.map((p) => {
              const id = p._id || p;
              const name = p.name || String(p);
              const online = !!(presenceMap && presenceMap[id] && presenceMap[id].online);
              return (
                <div key={id} className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <AvatarFromName name={name} size={36} />
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        {name}
                        <span className={`w-3 h-3 rounded-full ${online ? "bg-emerald-400" : "bg-slate-300"}`} />
                      </div>
                      <div className="text-xs text-slate-400">{online ? "Active" : "Offline"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onApprove(id)} className="px-2 py-1 text-xs rounded bg-emerald-500 text-white">Approve</button>
                    <button onClick={() => onReject(id)} className="px-2 py-1 text-xs rounded bg-rose-500 text-white">Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
