"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = ["School", "College", "Tutorial"];
const SESSION = "2025/2026";

export default function ClassSettingsPage() {
  const [branch, setBranch] = useState("School");
  const [classes, setClasses] = useState([]);
  const [settingsMap, setSettingsMap] = useState({});
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data: classData } = await supabase.from("classes").select("*").eq("branch", branch).eq("location", location).order("name");
    const { data: settingsData } = await supabase.from("class_settings").select("*").eq("branch", branch).eq("session", SESSION);

    const map = {};
    (settingsData || []).forEach((s) => { map[s.class] = s; });
    setClasses(classData || []);
    setSettingsMap(map);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [branch]);

  async function togglePosition(className) {
    const current = settingsMap[className];
    const newValue = current ? !current.show_position : true;

    const { data, error } = await supabase.from("class_settings")
      .upsert([{ branch, class: className, session: SESSION, show_position: newValue }], { onConflict: "branch,class,session" })
      .select().single();

    if (!error) {
      setSettingsMap((prev) => ({ ...prev, [className]: data }));
    }
  }

  return (
    <div>
      <Link href="/admin-dashboard/results" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← Results</Link>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Class Settings</h1>
      <p className="text-sm text-slate-500 mb-6">Control whether class position appears on report cards, per class, for {SESSION}.</p>

      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl w-fit">
        {BRANCHES.map((b) => (
          <button key={b} onClick={() => setBranch(b)} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (branch === b ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>{b}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading classes...</p>
      ) : classes.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
          <p className="text-slate-500 text-sm">No classes found for {branch}.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {classes.map((c, i) => {
            const isOn = settingsMap[c.name]?.show_position || false;
            return (
              <div key={c.id} className={"flex items-center justify-between px-5 py-4 " + (i !== 0 ? "border-t border-slate-200" : "")}>
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500">Show position (1st, 2nd, 3rd...) on report cards</p>
                </div>
                <button onClick={() => togglePosition(c.name)} className={"w-12 h-7 rounded-full transition-colors relative " + (isOn ? "bg-brand-blue-strong" : "bg-slate-200")}>
                  <span className={"absolute top-1 w-5 h-5 rounded-full bg-white transition-all " + (isOn ? "left-6" : "left-1")}></span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}