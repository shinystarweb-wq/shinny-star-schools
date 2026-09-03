"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function BranchLessonNotesPage() {
  const params = useParams();
  const branch = params.branch.charAt(0).toUpperCase() + params.branch.slice(1);
  const [classes, setClasses] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;
      const { data: classData } = await supabase.from("classes").select("*").eq("branch", branch).eq("location", location).order("name");
      const { data: noteData } = await supabase.from("lesson_notes").select("class").eq("branch", branch).eq("location", location);
      const c = {};
      (noteData || []).forEach((n) => { c[n.class] = (c[n.class] || 0) + 1; });
      setClasses(classData || []);
      setCounts(c);
      setLoading(false);
    }
    load();
  }, [branch]);

  return (
    <div>
      <Link href="/admin-dashboard/lesson-notes" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← All Sections</Link>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">{branch} — Lesson Notes</h1>
      <p className="text-sm text-slate-500 mb-6">Select a class to view or add notes.</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading classes...</p>
      ) : classes.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No classes found for {branch}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Link key={c.id} href={"/admin-dashboard/lesson-notes/" + branch.toLowerCase() + "/" + encodeURIComponent(c.name)} className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
              <h3 className="font-semibold text-slate-800">{c.name}</h3>
              <p className="text-2xl font-bold text-slate-800 mt-2">{counts[c.name] || 0}</p>
              <p className="text-xs text-slate-500">notes</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}