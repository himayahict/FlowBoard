"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message ?? "Login failed. Check your details.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-800 antialiased">
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out both;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT: Branding panel */}
        <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between">
          {/* Gradient mesh background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-indigo-500/30 blur-[120px]" />
            <div className="absolute top-1/3 -right-32 size-[400px] rounded-full bg-fuchsia-500/20 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 size-[400px] rounded-full bg-cyan-500/20 blur-[120px]" />
          </div>

          {/* Subtle grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3 p-10">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5 text-white"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                FlowBoard
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">
                Workspace
              </p>
            </div>
          </div>

          {/* Value proposition */}
          <div className="relative z-10 px-10">
            <div className="animate-fade-in inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              Welcome back
            </div>

            <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white">
              Pick up where
              <br />
              you left off.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              Sign in to access your boards, projects, and team — all in one
              beautiful workspace.
            </p>

            {/* Stats row */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { value: "10k+", label: "Teams" },
                { value: "99.9%", label: "Uptime" },
                { value: "4.9★", label: "Rating" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm"
                >
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="relative z-10 p-10">
            <div className="animate-float rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-semibold text-white">
                  MK
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-white/80">
                    &ldquo;The cleanest project tool I&apos;ve used. Our
                    standups take half the time now.&rdquo;
                  </p>
                  <p className="mt-2 text-xs font-medium text-white/50">
                    Maya Khan · Engineering Manager
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Form panel */}
        <div className="flex flex-col justify-center bg-white px-6 py-10 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-sm animate-fade-in">
            {/* Mobile brand */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 text-white"
                >
                  <rect x="3" y="3" width="7" height="9" rx="1.5" />
                  <rect x="14" y="3" width="7" height="5" rx="1.5" />
                  <rect x="14" y="12" width="7" height="9" rx="1.5" />
                  <rect x="3" y="16" width="7" height="5" rx="1.5" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                FlowBoard
              </span>
            </div>

            {/* Heading */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Welcome back
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Sign in to continue to your workspace.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  Email address
                </label>
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <path d="M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  className="size-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
                />
                <label
                  htmlFor="remember"
                  className="text-xs text-slate-600"
                >
                  Keep me signed in
                </label>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-700"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 size-3.5 shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg
                      className="size-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeOpacity="0.25"
                      />
                      <path
                        d="M22 12a10 10 0 01-10 10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                New here?
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}