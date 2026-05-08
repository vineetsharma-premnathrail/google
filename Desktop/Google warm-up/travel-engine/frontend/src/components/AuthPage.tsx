"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Plane, Globe, Zap } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload =
        mode === "register"
          ? { email, password, full_name: name }
          : { email, password };

      const res = await api.auth[mode](payload) as { access_token: string; user: any };
      setAuth(res.user, res.access_token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-brand-900 via-brand-700 to-slate-900 p-12">
        <div className="flex items-center gap-3">
          <Plane className="w-8 h-8 text-brand-200" />
          <span className="text-xl font-bold text-white">Travel Engine</span>
        </div>

        <div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Plan your perfect trip with AI
          </h1>
          <p className="text-brand-200 text-lg mb-10">
            Dynamic itineraries that adapt to weather, your budget, and real-time events.
          </p>

          <div className="space-y-4">
            {[
              { icon: <Zap className="w-5 h-5" />, text: "AI-generated day-by-day itineraries in seconds" },
              { icon: <Globe className="w-5 h-5" />, text: "Real-time weather & flight price monitoring" },
              { icon: <Plane className="w-5 h-5" />, text: "Route-optimized to minimize travel time" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-brand-100">
                <div className="p-2 bg-white/10 rounded-lg">{f.icon}</div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-brand-300 text-sm">© 2026 Travel Engine</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Plane className="w-6 h-6 text-brand-500" />
            <span className="font-bold text-lg">Travel Engine</span>
          </div>

          <h2 className="text-3xl font-bold mb-2">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-slate-400 mb-8">
            {mode === "login"
              ? "Sign in to access your trips"
              : "Start planning smarter trips today"}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                <input
                  className="input"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-slate-400 mt-6 text-sm">
            {mode === "login" ? "No account? " : "Already have an account? "}
            <button
              className="text-brand-400 hover:text-brand-300 font-medium"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Register" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
