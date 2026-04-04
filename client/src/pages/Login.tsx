import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      setLoading(true);
      const { data } = await api.post("/api/admin/login", { email, password });
      login(data.token, data.admin);
      toast.success("Welcome back");
      navigate("/admin/dashboard");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1923] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-[#2a3f55] bg-[#1e2d3d] p-8 shadow-2xl"
      >
        <h1 className="text-3xl font-extrabold text-white">BettCenic</h1>
        <p className="mb-6 text-sm text-[#8fa3b1]">Admin Panel</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#8fa3b1]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#2a3f55] bg-[#0f1923] px-3 py-2 text-white outline-none focus:border-[#f5a623]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#8fa3b1]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#2a3f55] bg-[#0f1923] px-3 py-2 text-white outline-none focus:border-[#f5a623]"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-[#f5a623] py-2 font-semibold text-[#0f1923] transition hover:brightness-95 disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
}
