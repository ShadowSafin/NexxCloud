"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters");
      return;
    }

    try {
      await register(username, email, password);
      router.push("/");
    } catch {}
  };

  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "#f87171", "#fb923c", "#34d399"][passwordStrength];

  return (
    <div className="min-h-screen w-screen flex bg-[#04020a] overflow-hidden">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] relative overflow-hidden p-12">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-0 w-[500px] h-[500px] rounded-full bg-purple-700/20 blur-[120px]" />
          <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] rounded-full bg-cyan-900/20 blur-[100px]" />
          <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-900/10 blur-[80px]" />
          <div className="absolute inset-0 bg-grid opacity-15" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandMark className="h-10 w-10 rounded-xl" priority />
          <span className="text-white font-semibold text-lg tracking-tight">NexxCloud</span>
        </div>

        {/* Center features */}
        <div className="relative z-10 space-y-5 max-w-sm">
          <h2 className="text-3xl font-semibold text-white leading-tight tracking-tight mb-6">
            Everything you need<br />
            <span
              style={{
                background: "linear-gradient(135deg, #22d3ee, #818cf8, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              in one place.
            </span>
          </h2>

          {[
            { icon: "☁️", title: "Unlimited uploads", desc: "Upload any file type up to 1TB per file" },
            { icon: "🔒", title: "Private & secure", desc: "Your files are only accessible by you" },
            { icon: "⚡", title: "Resumable transfers", desc: "Chunked parallel uploads that never fail" },
            { icon: "📂", title: "Version history", desc: "Restore previous versions of any file" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{f.icon}</span>
              <div>
                <p className="text-sm font-medium text-white/80">{f.title}</p>
                <p className="text-xs text-white/35">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-[11px] text-white/20 font-mono tracking-wider uppercase">
          nexxcloud.local · private cloud storage
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-y-auto">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-900/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-cyan-900/10 blur-[80px]" />
        </div>

        <div className="hidden lg:block absolute left-0 top-12 bottom-12 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        <div className="w-full max-w-sm relative z-10 py-4">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <BrandMark className="h-9 w-9 rounded-xl" priority />
            <span className="text-white font-semibold tracking-tight">NexxCloud</span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Create account</h1>
            <p className="text-sm text-white/40">Start using your personal cloud for free</p>
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
              {(error || validationError) && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {error || validationError}
                </div>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    id="username"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); clearError(); }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all border"
                    style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(34,211,238,0.4)"; e.target.style.background = "rgba(0,0,0,0.3)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                    required
                    minLength={3}
                    maxLength={30}
                    autoComplete="username"
                  />
                </div>
              </div>

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
                    style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
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
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); setValidationError(""); }}
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all border"
                    style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(34,211,238,0.4)"; e.target.style.background = "rgba(0,0,0,0.3)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-0.5 flex-1 rounded-full transition-all duration-300"
                          style={{ background: passwordStrength >= i ? strengthColor : "rgba(255,255,255,0.08)" }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setValidationError(""); }}
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all border"
                    style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(34,211,238,0.4)"; e.target.style.background = "rgba(0,0,0,0.3)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {/* Match indicator */}
                  {confirmPassword.length > 0 && password === confirmPassword && (
                    <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400 pointer-events-none" />
                  )}
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
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer link */}
          <p className="text-center text-sm text-white/30 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
