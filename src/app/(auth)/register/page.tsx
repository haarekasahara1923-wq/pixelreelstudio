"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Sparkles, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
      } else {
        setSuccess("OTP sent to your email! Enter it below to verify.");
        setStep("verify");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid OTP. Please try again.");
      } else {
        setSuccess("Email verified! Redirecting to login...");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent font-display">
              PixelReel Studio
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white font-display">
            {step === "register" ? "Create your account" : "Verify your email"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {step === "register"
              ? "Start generating AI visuals for free"
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {success}
            </div>
          )}

          {step === "register" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-white/70">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm placeholder:text-white/25"
                    placeholder="Alex Johnson"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-white/70">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm placeholder:text-white/25"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-white/70">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="glass-input w-full rounded-xl py-3 pl-10 pr-12 text-sm placeholder:text-white/25"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-white/70">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm placeholder:text-white/25"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Free credits badge */}
              <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-2.5">
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-xs text-purple-300">
                  You&apos;ll receive <strong>20 free credits</strong> on signup!
                </span>
              </div>

              <button
                id="register-submit"
                type="submit"
                disabled={isLoading}
                className="btn-primary-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isLoading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-3">
                  <ShieldCheck size={26} className="text-purple-400" />
                </div>
                <p className="text-sm text-white/60">
                  Enter the 6-digit code sent to your email address.
                </p>
              </div>

              {/* OTP Input */}
              <div>
                <label htmlFor="otp-code" className="mb-1.5 block text-sm font-medium text-white/70 text-center">
                  Verification Code
                </label>
                <input
                  id="otp-code"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  className="glass-input w-full rounded-xl py-4 px-4 text-center text-2xl font-bold tracking-[0.5em] placeholder:text-white/20 placeholder:text-base placeholder:tracking-normal"
                  placeholder="000000"
                />
              </div>

              <button
                id="otp-verify"
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="btn-primary-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {isLoading ? "Verifying..." : "Verify Email"}
              </button>

              <button
                type="button"
                onClick={() => setStep("register")}
                className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                ← Back to registration
              </button>
            </form>
          )}

          {step === "register" && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-white/30">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <p className="text-center text-sm text-white/50">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
