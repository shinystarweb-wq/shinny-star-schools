"use client";
import { useState } from "react";

export default function Login() {
  const [role, setRole] = useState("admin");
  const roles = [{ key: "admin", label: "Admin" }, { key: "teacher", label: "Teacher" }, { key: "student", label: "Student" }];

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

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input type="text" placeholder="e.g. adebayo" className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
            <p className="text-xs text-slate-400 mt-1">Your surname, lowercase</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PIN</label>
            <input type="password" inputMode="numeric" maxLength={6} placeholder="******" className="w-full border border-slate-300 rounded-lg px-4 py-2 tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
          </div>

          <button type="submit" className="bg-brand-blue-strong text-white rounded-lg py-2 font-medium hover:opacity-90 mt-2">Sign in as {roles.find((r) => r.key === role).label}</button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">Forgot your PIN? <a href="#" className="text-brand-blue-strong font-medium">Contact admin</a></p>
      </div>
    </main>
  );
}