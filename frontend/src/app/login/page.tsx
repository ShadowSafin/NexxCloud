"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      router.push("/");
    } catch {}
  };

  return (
    <div className="min-h-screen w-screen flex bg-[#04020a] overflow-hidden">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-purple-700/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-cyan-900/20 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-900/10 blur-[80px]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-grid opacity-15" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandMark className="h-10 w-10 rounded-xl" priority />
          <span className="text-white font-semibold text-lg tracking-tight">NexxCloud</span>
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-6 max-w-md">
          {/* Floating glass feature card */}
          <div
            className="p-6 rounded-2xl border border-white/[0.08] mb-8"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Secure Personal Cloud</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  Upload, organise, and access your files from anywhere. End-to-end encrypted and blazing fast.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-4xl font-semibold text-white leading-tight tracking-tight">
            Your files,<br />
            <span
              style={{
                background: "linear-gradient(135deg, #22d3ee, #818cf8, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              always within reach.
            </span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Sign in to access your personal cloud storage with real-time sync, resumable uploads, and version history.
          </p>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-[11px] text-white/20 font-mono tracking-wider uppercase">
          nexxcloud.local · private cloud storage
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* Subtle right-panel ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-900/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-cyan-900/10 blur-[80px]" />
        </div>

        {/* Vertical separator */}
        <div className="hidden lg:block absolute left-0 top-12 bottom-12 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <BrandMark className="h-9 w-9 rounded-xl" priority />
            <span className="text-white font-semibold tracking-tight">NexxCloud</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Welcome back</h1>
            <p className="text-sm text-white/40">Sign in to continue to your cloud</p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl border border-white/[0.07] p-6"
            style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(24px)",
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error */}
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all border"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderColor: "rgba(255,255,255,0.07)",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(34,211,238,0.4)"; e.target.style.background = "rgba(0,0,0,0.3)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all border"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderColor: "rgba(255,255,255,0.07)",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(34,211,238,0.4)"; e.target.style.background = "rgba(0,0,0,0.3)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-300 mt-2"
                style={{
                  background: "linear-gradient(135deg, oklch(0.82 0.16 200), oklch(0.68 0.22 295) 60%, oklch(0.65 0.2 320))",
                  boxShadow: "0 0 30px -5px oklch(0.78 0.17 200 / 0.4)",
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer link */}
          <p className="text-center text-sm text-white/30 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
