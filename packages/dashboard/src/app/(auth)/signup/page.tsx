"use client";

import { createClient } from "@/lib/supabase/client";
import { Brain } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-4 px-4 text-center">
        <Brain className="w-10 h-10 text-accent mx-auto" />
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-accent hover:underline"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6 px-4">
      <div className="flex flex-col items-center gap-2">
        <Brain className="w-10 h-10 text-accent" />
        <h1 className="text-xl font-semibold">Create Account</h1>
        <p className="text-sm text-muted">
          Deploy your own Golems dashboard
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs text-muted mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs text-muted mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent"
            placeholder="Min 6 characters"
          />
        </div>

        {error && <p className="text-xs text-rose">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 text-sm font-medium bg-accent hover:bg-accent-dim rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
