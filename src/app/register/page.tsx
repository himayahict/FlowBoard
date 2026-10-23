"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setError(result.error.message ?? "Registration failed.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = (() => {
    if (!password) return { label: "", tone: "", bar: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { label: "Weak", tone: "text-rose-600", bar: "bg-rose-500" };
    if (score === 2) return { label: "Fair", tone: "text-amber-600", bar: "bg-amber-500" };
    if (score === 3) return { label: "Good", tone: "text-slate-700", bar: "bg-slate-700" };
    return { label: "Strong", tone: "text-emerald-600", bar: "bg-emerald-500" };
  })();

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-800 antialiased">
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.4s ease-out both; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT: Branding panel — neutral, editorial */}
        <div className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between">
          {/* Subtle grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          {/* Soft radial glow — monochrome */}
          <div className="pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full bg-white/[0.04] blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 right-0 size-[400px] rounded-full bg-white/[0.03] blur-[120px]" />

          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3 p-10">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">FlowBoard</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">Workspace</p>
            </div>
          </div>

          {/* Value proposition */}
          <div className="relative z-10 px-10">
            <div className="animate-fade-in inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              Trusted by 10,000+ teams
            </div>

            <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white">
              Plan, track, and ship
              <br />
              with your team.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              A beautiful workspace where modern teams plan projects, track progress, and deliver work faster together.
            </p>

            {/* Feature list */}
            <ul className="mt-8 space-y-3">
              {[
                "Kanban boards with real-time updates",
                "Team roles & permissions built-in",
                "Due dates with smart reminders",
                "Workspaces for every project",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-white/70">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-2.5 text-white/80"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Testimonial card */}
          <div className="relative z-10 p-10">
            <div className="animate-float rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-inset ring-white/15">
                  AL
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-white/80">
                    &ldquo;FlowBoard replaced three tools for our team. We ship twice as fast now.&rdquo;
                  </p>
                  <p className="mt-2 text-xs font-medium text-white/50">Alex Lee · Product Lead, Acme</p>
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
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <rect x="3" y="3" width="7" height="9" rx="1.5" />
                  <rect x="14" y="3" width="7" height="5" rx="1.5" />
                  <rect x="14" y="12" width="7" height="9" rx="1.5" />
                  <rect x="3" y="16" width="7" height="5" rx="1.5" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-900">FlowBoard</span>
            </div>

            {/* Heading */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Create your account
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Start managing your projects in under a minute.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="mt-8 space-y-4">
              {/* Full name */}
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-slate-700">
                  Full name
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
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="name"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-700">
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
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-700">
                  Password
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
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
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

                {/* Password strength indicator */}
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2, 3].map((i) => {
                        const filled =
                          (passwordStrength.label === "Weak" && i === 0) ||
                          (passwordStrength.label === "Fair" && i < 2) ||
                          (passwordStrength.label === "Good" && i < 3) ||
                          (passwordStrength.label === "Strong" && i < 4);
                        return (
                          <span
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              filled ? passwordStrength.bar : "bg-slate-200"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className={`text-[11px] font-medium ${passwordStrength.tone}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-slate-500">
                By creating an account, you agree to our{" "}
                <a href="#" className="font-medium text-slate-700 underline-offset-2 hover:underline">
                  Terms
                </a>{" "}
                and{" "}
                <a href="#" className="font-medium text-slate-700 underline-offset-2 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}