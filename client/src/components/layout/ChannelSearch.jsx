import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { searchChannelsThunk, requestJoinThunk } from "../../redux/slices/channelsSlice";

export default function ChannelSearch() {
  const [q, setQ] = useState("");
  const dispatch = useDispatch();
  const results = useSelector((s) => s.channels.searchResults || []);
  const userId = useSelector((s) => s.auth.user?._id || s.auth.user?.id);

  async function onSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    await dispatch(searchChannelsThunk(q.trim()));
  }

  async function onRequestJoin(channelId) {
    await dispatch(requestJoinThunk(channelId));
  }

  return (
    <div className="relative">
      <form onSubmit={onSearch}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search channels"
          className="px-3 py-1 border rounded w-60"
        />
      </form>

      {results && results.length > 0 && (
        <div className="absolute mt-2 w-80 bg-white shadow rounded z-50">
          <ul>
            {results.map((c) => {
              const status = c.joinStatus || (c.members && c.members.some((m) => String(m._id || m) === String(userId)) ? "member" : "join");
              return (
                <li key={c._id} className="p-2 flex items-center justify-between border-b">
                  <div>
                    <div className="font-medium"># {c.name}</div>
                    <div className="text-xs text-slate-400">{c.createdBy?.name || ""} • {c.isPrivate ? "Private" : "Public"}</div>
                  </div>
                  <div>
                    {status === "member" ? (
                      <span className="text-xs text-slate-500">Joined</span>
                    ) : status === "pending" ? (
                      <button className="px-3 py-1 bg-yellow-400 text-white rounded text-xs" disabled>Pending</button>
                    ) : (
                      <button onClick={() => onRequestJoin(c._id)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 cursor-pointer text-white rounded text-xs">Join</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
