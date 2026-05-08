"use client";

import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Plane, Globe, Zap, Chrome } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleAuth = (res: { access_token: string; user: any }) => {
    setAuth(res.user, res.access_token);
  };

  // Google One-Tap / OAuth flow
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        // Exchange access_token for user info, then get our JWT
        const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then((r) => r.json());

        // We send the access token as the id_token for server verification
        const res = await api.auth.googleSignIn(tokenResponse.access_token) as any;
        handleAuth(res);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google sign-in failed"),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload =
        mode === "register"
          ? { email, password, full_name: name }
          : { email, password };
      const res = await api.auth[mode](payload) as any;
      handleAuth(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left hero panel */}
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
            Dynamic itineraries that adapt to your preferences, real-time weather, and live Google Maps data.
          </p>

          <div className="space-y-4">
            {[
              { icon: <Zap className="w-5 h-5" />, text: "AI-generated itineraries powered by Claude" },
              { icon: <Globe className="w-5 h-5" />, text: "Live Google Maps routes & real place data" },
              { icon: <Plane className="w-5 h-5" />, text: "Real-time weather alerts & disruption handling" },
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

      {/* Right auth panel */}
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
            {mode === "login" ? "Sign in to your trips" : "Start planning smarter trips"}
          </p>

          {/* Google Sign-In */}
          <button
            onClick={() => googleLogin()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-5 py-3 rounded-xl transition-colors border border-gray-200 mb-6 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-950 px-3 text-slate-500">or continue with email</span>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                <input className="input" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input type="password" className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-slate-400 mt-6 text-sm">
            {mode === "login" ? "No account? " : "Already have an account? "}
            <button className="text-brand-400 hover:text-brand-300 font-medium" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Register" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
