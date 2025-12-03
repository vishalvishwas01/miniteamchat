import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import Workspace from "./pages/Chat/Workspace";
import { loadFromLocal } from "./redux/slices/authSlice";
import useSocket from "./hooks/useSocket";

export default function App() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((s) => s.auth);
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    dispatch(loadFromLocal());
    setIsInitialized(true);
  }, [dispatch]);

  useSocket(token);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/app/*"
        element={user ? <Workspace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? "/app" : "/login"} replace />}
      />
    </Routes>
  );
}
