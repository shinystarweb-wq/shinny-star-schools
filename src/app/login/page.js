"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roles = [{ key: "admin", label: "Admin" }, { key: "teacher", label: "Teacher" }, { key: "student", label: "Student" }];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: queryError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username.trim().toLowerCase())
      .eq("pin", pin.trim())
      .eq("role", role)
      .single();

    setLoading(false);

    if (queryError || !data) {
      setError("Invalid username, PIN, or portal selected.");
      return;
    }

    router.push("/" + role + "-dashboard");
  }

  return (
    <main className="min-h-screen bg-brand-blue flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-1">SHINNY STAR SCHOOLS</h1>
        <p className="text-center text-slate-500 text-sm mb-6">Select your portal to sign in</p>

        <div className="flex bg-brand-blue rounded-lg p-1 mb-6">
          {roles.map((r) => (
            <button key={r.key} type="button" onClick={() => setRole(r.key)} className={role === r.key ? "flex-1 py-2 text-sm font-medium rounded-md transition bg-brand-blue-strong text-white" : "flex-1 py-2 text-sm font-medium rounded-md transition text-slate-600"}>{r.label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. adebayo" className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
            <p className="text-xs text-slate-400 mt-1">Your surname, lowercase</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PIN</label>
            <input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="******" className="w-full border border-slate-300 rounded-lg px-4 py-2 tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="bg-brand-blue-strong text-white rounded-lg py-2 font-medium hover:opacity-90 mt-2 disabled:opacity-60">{loading ? "Checking..." : "Sign in as " + roles.find((r) => r.key === role).label}</button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">Forgot your PIN? <a href="#" className="text-brand-blue-strong font-medium">Contact admin</a></p>
      </div>
    </main>
  );
}