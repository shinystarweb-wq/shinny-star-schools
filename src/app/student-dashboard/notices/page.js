"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const URGENCY_STYLES = {
  normal: { label: "Normal", badge: "bg-slate-100 text-slate-600", border: "border-slate-200", accent: "bg-slate-400" },
  important: { label: "Important", badge: "bg-amber-100 text-amber-700", border: "border-amber-200", accent: "bg-amber-500" },
  urgent: { label: "Urgent", badge: "bg-red-100 text-red-700", border: "border-red-300", accent: "bg-red-500" },
};

export default function StudentNoticesPage() {
  const [student, setStudent] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printNotice, setPrintNotice] = useState(null);

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setStudent(user);

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("notices").select("*")
        .eq("location", user.location)
        .in("audience", ["all", "students"])
        .order("created_at", { ascending: false });

      const active = (data || []).filter((n) => !n.expires_at || n.expires_at >= today);
      setNotices(active);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Notices</h1>
      <p className="text-sm text-slate-500 mb-8">Announcements for {student?.branch} Section</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading notices...</p>
      ) : notices.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No notices right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {notices.map((n) => {
            const u = URGENCY_STYLES[n.urgency];
            return (
              <div key={n.id} className={"border rounded-2xl overflow-hidden flex " + u.border}>
                <div className={"w-1.5 " + u.accent}></div>
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800">{n.title}</h3>
                        <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + u.badge}>{u.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}{n.expires_at ? " • Expires " + n.expires_at : ""}</p>
                    </div>
                    <button onClick={() => setPrintNotice(n)} className="text-xs text-brand-blue-strong font-medium hover:underline flex-shrink-0">Print</button>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{n.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {printNotice && <PrintModal notice={printNotice} onClose={() => setPrintNotice(null)} />}
    </div>
  );
}

function PrintModal({ notice, onClose }) {
  const u = URGENCY_STYLES[notice.urgency];
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 px-6 print:hidden">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <div id="notice-print-area" className="p-8">
          <div className="text-center border-b-2 border-brand-blue-strong pb-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center text-2xl mx-auto mb-2">🏫</div>
            <h1 className="text-xl font-bold text-slate-800 tracking-wide">SHINNY STAR SCHOOLS</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Official Notice</p>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">{notice.title}</h2>
            <span className={"text-xs font-semibold px-3 py-1 rounded-full " + u.badge}>{u.label}</span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-6">{notice.message}</p>
          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-200 pt-3">
            <span>Date: {new Date(notice.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-3 p-4 border-t border-slate-100 print:hidden">
          <button onClick={() => window.print()} className="flex-1 bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90">🖨 Print</button>
          <button onClick={onClose} className="flex-1 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50">Close</button>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #notice-print-area, #notice-print-area * { visibility: visible; }
          #notice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}