"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function NewsletterIssuePage() {
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [title, setTitle] = useState("Shinny Star Times");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [intro, setIntro] = useState("");
  const [events, setEvents] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;

      const { data: settingsData } = await supabase.from("school_settings").select("*").eq("location", location).single();
      setSchoolSettings(settingsData);

      const [eventsRes, articlesRes] = await Promise.all([
        supabase.from("newsletter_events").select("*").eq("location", location).order("event_date"),
        supabase.from("newsletter_articles").select("*").eq("location", location).order("created_at", { ascending: false }),
      ]);
      setEvents(eventsRes.data || []);
      setArticles(articlesRes.data || []);
      setSelectedEvents((eventsRes.data || []).map((e) => e.id));
      setSelectedArticles((articlesRes.data || []).map((a) => a.id));
      setLoading(false);
    }
    load();
  }, []);

  function toggleEvent(id) {
    setSelectedEvents((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleArticle(id) {
    setSelectedArticles((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const chosenEvents = events.filter((e) => selectedEvents.includes(e.id));
  const chosenArticles = articles.filter((a) => selectedArticles.includes(a.id));
  const featured = chosenArticles.find((a) => a.featured) || chosenArticles[0];
  const rest = chosenArticles.filter((a) => a.id !== featured?.id);

  return (
    <div>
      <Link href="/admin-dashboard/newsletter" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline print:hidden">← Newsletter</Link>

      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-slate-800">Print Newsletter Issue</h1>
        <button onClick={() => window.print()} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90">🖨 Print Issue</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden mb-8">
        <div className="lg:col-span-1 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 h-fit">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Issue Details</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Newsletter Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Intro Note (optional)</label>
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} placeholder="A short welcome message for this issue..." className={inputClass}></textarea>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Include Events ({selectedEvents.length}/{events.length})</h2>
            {loading ? <p className="text-xs text-slate-400">Loading...</p> : events.length === 0 ? <p className="text-xs text-slate-400">No events added yet.</p> : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {events.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={selectedEvents.includes(e.id)} onChange={() => toggleEvent(e.id)} className="rounded" />
                    {e.title} — {e.event_date}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Include Articles ({selectedArticles.length}/{articles.length})</h2>
            {loading ? <p className="text-xs text-slate-400">Loading...</p> : articles.length === 0 ? <p className="text-xs text-slate-400">No articles written yet.</p> : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {articles.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={selectedArticles.includes(a.id)} onChange={() => toggleArticle(a.id)} className="rounded" />
                    {a.title}{a.featured && <span className="text-[10px] bg-brand-blue text-brand-blue-strong px-1.5 py-0.5 rounded-full ml-1">Featured</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="newsletter-print-area" className="max-w-3xl mx-auto">
        <div className="newsletter-page border border-slate-200 print:border-0 rounded-2xl print:rounded-none p-10 bg-white mb-8 print:mb-0">
          <div className="text-center border-b-4 border-brand-blue-strong pb-5 mb-6">
            {schoolSettings?.logo_url ? (
              <img src={schoolSettings.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover mx-auto mb-2" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-blue flex items-center justify-center text-3xl mx-auto mb-2">🏫</div>
            )}
            <h1 className="text-3xl font-bold text-slate-800 tracking-wide">{title}</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">{schoolSettings?.school_name || "Shinny Star Schools"} Newsletter</p>
            <p className="text-xs text-slate-400 mt-1">{new Date(issueDate + "T00:00:00").toLocaleDateString("default", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>

          {intro && <p className="text-sm text-slate-600 italic text-center mb-8 max-w-lg mx-auto">{intro}</p>}

          {chosenEvents.length > 0 && (
            <div className="bg-brand-blue rounded-xl p-6 mb-8">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">📅 Upcoming Events</h2>
              <div className="flex flex-col gap-3">
                {chosenEvents.map((e) => (
                  <div key={e.id} className="flex gap-4 items-start">
                    <div className="bg-brand-blue-strong text-white rounded-lg px-3 py-1.5 text-center flex-shrink-0">
                      <p className="text-lg font-bold leading-none">{new Date(e.event_date + "T00:00:00").getDate()}</p>
                      <p className="text-[9px] uppercase tracking-wide">{new Date(e.event_date + "T00:00:00").toLocaleString("default", { month: "short" })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{e.title}</p>
                      <p className="text-xs text-slate-500">{e.event_time ? e.event_time + " • " : ""}{e.location}</p>
                      {e.description && <p className="text-xs text-slate-600 mt-1">{e.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {featured && (
            <div className="mb-2">
              {featured.image_url && <img src={featured.image_url} alt={featured.title} className="w-full h-56 object-cover rounded-xl mb-4" />}
              <h2 className="text-xl font-bold text-slate-800 mb-1">{featured.title}</h2>
              {featured.author && <p className="text-xs text-slate-400 mb-3">By {featured.author}</p>}
              <div className="text-sm text-slate-700 leading-relaxed article-content" dangerouslySetInnerHTML={{ __html: featured.content }}></div>
            </div>
          )}
        </div>

        {rest.map((a) => (
          <div key={a.id} className="newsletter-page border border-slate-200 print:border-0 print:break-before-page rounded-2xl print:rounded-none p-10 bg-white mb-8 print:mb-0">
            {a.image_url && <img src={a.image_url} alt={a.title} className="w-full h-48 object-cover rounded-xl mb-4" />}
            <h2 className="text-xl font-bold text-slate-800 mb-1">{a.title}</h2>
            {a.author && <p className="text-xs text-slate-400 mb-3">By {a.author}</p>}
            <div className="text-sm text-slate-700 leading-relaxed article-content" dangerouslySetInnerHTML={{ __html: a.content }}></div>
          </div>
        ))}

        <div className="text-center text-xs text-slate-400 py-4 print:break-before-page">
          {schoolSettings?.school_name || "Shiny Star Schools"} • {schoolSettings?.website || "shinystarschools.com.ng"}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #newsletter-print-area, #newsletter-print-area * { visibility: visible; }
          #newsletter-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .newsletter-page { page-break-after: always; }
        }
      `}</style>
    </div>
  );
}