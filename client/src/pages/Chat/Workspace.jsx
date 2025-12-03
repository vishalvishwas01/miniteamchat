// src/pages/Chat/Workspace.jsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import ChannelView from "./ChannelView";
import Topbar from "../../components/layout/Topbar";
import RightPanel from "../../components/layout/RightPanel";
import { useDispatch } from "react-redux";
import { fetchChannelsThunk } from "../../redux/slices/channelsSlice";

export default function Workspace() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchChannelsThunk());
  }, [dispatch]);

  return (
    <div className="h-screen flex bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<div className="p-8 text-slate-500">Select a channel or create a new one from the left.</div>} />
              <Route path="channel/:id" element={<ChannelView />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </div>
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
