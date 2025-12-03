import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  setCurrentChannel,
  createChannelThunk,
} from "../../redux/slices/channelsSlice";
import { logout } from "../../redux/slices/authSlice";
import socketClient from "../../lib/socketClient";
import { AvatarFromName } from "../../utils/avatar";

export default function Sidebar() {
  const channels = useSelector((s) => s.channels.list || []);
  const currentChannel = useSelector((s) => s.channels.currentChannelId);
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [newName, setNewName] = useState("");

  async function createChannel(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const action = await dispatch(createChannelThunk({ name: newName.trim() }));
    if (action.payload) {
      setNewName("");
      dispatch(setCurrentChannel(action.payload._id));
      navigate(`/app/channel/${action.payload._id}`);
    }
  }

  function onLogout() {
    try {
      socketClient.disconnect();
    } catch (e) {
      console.warn("socket disconnect error", e);
    }
    dispatch(logout());
    navigate("/login");
  }

  return (
    <aside className="w-80 bg-[#0F1724] text-slate-100 flex flex-col">
      <div className="px-4 py-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-extrabold tracking-tight">
            Mini<span className="text-indigo-400">Chat</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="text-sm px-3 py-1 rounded hover:bg-slate-700/50"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-800">
        <div className="text-xs text-slate-400 mb-2">Your workspace</div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="font-semibold">
              {user?.name?.slice?.(0, 1) || "U"}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium">{user?.name || "You"}</div>
            <div className="text-xs text-slate-400">{user?.email}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2 py-3">
        <div className="mb-3 text-xs text-slate-400 px-2">Channels</div>

        <ul className="space-y-1">
          {channels.map((ch) => {
            const active = String(ch._id) === String(currentChannel);
            return (
              <li key={ch._id}>
                <Link to={`/app/channel/${ch._id}`}>
                  <div
                    onClick={() => dispatch(setCurrentChannel(ch._id))}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      active ? "bg-slate-700" : "hover:bg-slate-700/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-600 flex items-center justify-center text-sm">
                        #{ch.name?.slice(0, 2)}
                      </div>
                      <div className="text-sm font-medium text-slate-100">
                        #{ch.name}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {ch.members?.length || 0}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <form onSubmit={createChannel} className="p-3 border-t border-slate-800">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Create channel"
          className="w-full p-2 rounded bg-slate-900 text-slate-100 border border-slate-800 placeholder:text-slate-500"
        />
        <button className="mt-2 w-full py-2 bg-indigo-500 hover:bg-indigo-400 cursor-pointer rounded text-white text-sm">
          Create channel
        </button>
      </form>
    </aside>
  );
}
