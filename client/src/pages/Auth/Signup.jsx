import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { signupThunk } from "../../redux/slices/authSlice";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const action = await dispatch(signupThunk({ name, email, password }));
      if (action.payload && action.payload.token) {
        nav("/app");
      }
    } catch (err) {
      console.error(err);
      alert("Signup failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm p-6 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Sign up</h2>
        <label className="block mb-2 text-sm">Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded mb-3" />
        <label className="block mb-2 text-sm">Email</label>
        <input required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded mb-3" />
        <label className="block mb-2 text-sm">Password</label>
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded mb-4" />
        <button className="w-full bg-indigo-600 text-white py-2 rounded">Sign up</button>
        <p className="text-sm text-center mt-3">
          Already have an account? <Link to="/login" className="text-indigo-600">Log in</Link>
        </p>
      </form>
    </div>
  );
}
