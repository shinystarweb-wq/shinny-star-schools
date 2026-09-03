"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const SESSION = "2025/2026";

export default function BranchFeesPage() {
  const params = useParams();
  const branch = params.branch.charAt(0).toUpperCase() + params.branch.slice(1);
  const [term, setTerm] = useState("1st Term");
  const [classCards, setClassCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;
      const { data: classes } = await supabase.from("classes").select("*").eq("branch", branch).eq("location", location).order("name");
      const cards = [];
      for (const c of classes || []) {
        const [{ data: students }, { data: billItems }] = await Promise.all([
          supabase.from("students").select("id").eq("branch", branch).eq("class", c.name).eq("location", location),
          supabase.from("fee_bill_items").select("amount").eq("branch", branch).eq("class", c.name).eq("term", term).eq("session", SESSION).eq("location", location),
        ]);
        const ids = (students || []).map((s) => s.id);
        const billTotal = (billItems || []).reduce((sum, item) => sum + Number(item.amount), 0);
        let paidCount = 0, partialCount = 0, unpaidCount = 0, collected = 0;
        if (ids.length > 0) {
          const { data: payments } = await supabase.from("student_payments").select("student_id, amount").eq("term", term).eq("session", SESSION).in("student_id", ids);
          ids.forEach((id) => {
            const total = (payments || []).filter((p) => p.student_id === id).reduce((s, p) => s + Number(p.amount), 0);
            collected += total;
            if (billTotal === 0) return;
            if (total >= billTotal) paidCount++;
            else if (total > 0) partialCount++;
            else unpaidCount++;
          });
        }
        cards.push({ name: c.name, total: ids.length, bill: billTotal, paidCount, partialCount, unpaidCount, collected });
      }
      setClassCards(cards);
      setLoading(false);
    }
    load();
  }, [branch, term]);

  return (
    <div>
      <Link href="/admin-dashboard/fees" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← All Sections</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{branch} Fees</h1>
        <select value={term} onChange={(e) => setTerm(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong">
          {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading classes...</p>
      ) : classCards.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No classes found for {branch}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {classCards.map((c) => (
            <Link key={c.name} href={"/admin-dashboard/fees/" + branch.toLowerCase() + "/" + encodeURIComponent(c.name) + "?term=" + encodeURIComponent(term)} className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
              <h3 className="font-semibold text-slate-800 mb-1">{c.name}</h3>
              <p className="text-xs text-slate-500 mb-3">{c.bill > 0 ? "₦" + c.bill.toLocaleString() + " per student" : "No bill set"}</p>
              <div className="flex gap-2 text-xs mb-2">
                <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">{c.paidCount} Full</span>
                <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">{c.partialCount} Partial</span>
                <span className="bg-red-50 text-red-700 px-2 py-1 rounded-full font-medium">{c.unpaidCount} Unpaid</span>
              </div>
              <p className="text-xs text-slate-400">₦{c.collected.toLocaleString()} collected of {c.total} students</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}