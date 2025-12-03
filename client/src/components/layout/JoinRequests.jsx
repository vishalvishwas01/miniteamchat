// client/src/components/layout/JoinRequests.jsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { approveRequestThunk, rejectRequestThunk, markRequestApproved, removeIncomingRequest } from "../../redux/slices/channelsSlice";

export default function JoinRequests() {
  const requests = useSelector((s) => s.channels.incomingRequests || []);
  const dispatch = useDispatch();

  async function onApprove(chId, userId) {
    await dispatch(approveRequestThunk({ channelId: chId, userId }));
    dispatch(markRequestApproved({ channelId: chId, userId }));
  }

  async function onReject(chId, userId) {
    await dispatch(rejectRequestThunk({ channelId: chId, userId }));
    dispatch(removeIncomingRequest({ channelId: chId, userId }));
  }

  if (!requests.length) return null;

  return (
    <div className="absolute right-4 top-16 w-80 bg-white shadow rounded p-3 z-50">
      <div className="text-sm font-semibold mb-2">Join requests</div>
      <ul className="space-y-2">
        {requests.map((r, i) => (
          <li key={i} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">#{r.channelName}</div>
              <div className="text-xs text-slate-400">{r.requester?.name || r.requester?._id}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onApprove(r.channelId, r.requester._id)} className="px-2 py-1 bg-emerald-500 text-white rounded text-xs">Accept</button>
              <button onClick={() => onReject(r.channelId, r.requester._id)} className="px-2 py-1 bg-rose-500 text-white rounded text-xs">Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
