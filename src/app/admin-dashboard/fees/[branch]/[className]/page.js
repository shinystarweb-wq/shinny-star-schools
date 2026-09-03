"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const SESSION = "2025/2026";
const inputClass = "border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function ClassFeesPage() {
  const [schoolSettings, setSchoolSettings] = useState(null);
  const params = useParams();
  const searchParams = useSearchParams();
  const branch = params.branch.charAt(0).toUpperCase() + params.branch.slice(1);
  const className = decodeURIComponent(params.className);
  const [term, setTerm] = useState(searchParams.get("term") || "1st Term");

  const [billItems, setBillItems] = useState([]);
  const [newItem, setNewItem] = useState({ description: "", amount: "" });
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState("");

  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeStudent, setActiveStudent] = useState(null);

  const totalBill = billItems.reduce((sum, item) => sum + Number(item.amount), 0);

  async function loadData() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;

    const { data: settingsData } = await supabase.from("school_settings").select("*").eq("location", location).single();
    setSchoolSettings(settingsData);

    const [itemsRes, studentsRes] = await Promise.all([
      supabase.from("fee_bill_items").select("*").eq("branch", branch).eq("class", className).eq("term", term).eq("session", SESSION).eq("location", location).order("created_at"),
      supabase.from("students").select("id, full_name, photo_url, reg_number").eq("branch", branch).eq("class", className).eq("location", location).order("full_name"),
    ]);

    setBillItems(itemsRes.data || []);

    const ids = (studentsRes.data || []).map((s) => s.id);
    let paymentsData = [];
    if (ids.length > 0) {
      const { data } = await supabase.from("student_payments").select("*").eq("term", term).eq("session", SESSION).in("student_id", ids).order("payment_date", { ascending: false });
      paymentsData = data || [];
    }
    const byStudent = {};
    (studentsRes.data || []).forEach((s) => {
      byStudent[s.id] = paymentsData.filter((p) => p.student_id === s.id);
    });

    setStudents(studentsRes.data || []);
    setPayments(byStudent);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [branch, className, term]);

  async function addBillItem(e) {
    e.preventDefault();
    setItemError("");
    if (!newItem.description.trim() || !newItem.amount || parseFloat(newItem.amount) <= 0) {
      setItemError("Enter a description and a valid amount.");
      return;
    }
    setSavingItem(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { error } = await supabase.from("fee_bill_items").insert([{
      branch, class: className, term, session: SESSION, location,
      description: newItem.description.trim(), amount: parseFloat(newItem.amount),
    }]);
    setSavingItem(false);
    if (error) {
      setItemError(error.message);
      return;
    }
    setNewItem({ description: "", amount: "" });
    loadData();
  }

  async function removeBillItem(id) {
    if (!confirm("Remove this fee item?")) return;
    await supabase.from("fee_bill_items").delete().eq("id", id);
    loadData();
  }

  function statusFor(studentId) {
    const paid = (payments[studentId] || []).reduce((s, p) => s + Number(p.amount), 0);
    const due = totalBill;
    if (due === 0) return { label: "No bill set", paid, due, balance: 0, color: "bg-slate-100 text-slate-500" };
    if (paid >= due) return { label: "Full", paid, due, balance: 0, color: "bg-green-50 text-green-700" };
    if (paid > 0) return { label: "Partial", paid, due, balance: due - paid, color: "bg-amber-50 text-amber-700" };
    return { label: "Unpaid", paid, due, balance: due, color: "bg-red-50 text-red-700" };
  }

  const totalCollected = students.reduce((sum, s) => sum + statusFor(s.id).paid, 0);
  const totalExpected = totalBill * students.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link href={"/admin-dashboard/fees/" + branch.toLowerCase()} className="text-sm text-brand-blue-strong font-medium hover:underline">← {branch} Fees</Link>
        <button onClick={() => window.print()} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90">🖨 Print Class Bill Sheet</button>
      </div>

      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-slate-800">{className} — {branch} Fees</h1>
        <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputClass}>
          {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="border border-slate-200 rounded-2xl p-6 mb-6 print:hidden">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Fee Breakdown for {term}</h2>

        {billItems.length === 0 ? (
          <p className="text-sm text-slate-400 mb-4">No fee items added yet for this class and term.</p>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {billItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-2.5">
                <span className="text-sm text-slate-700">{item.description}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800">₦{Number(item.amount).toLocaleString()}</span>
                  <button onClick={() => removeBillItem(item.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5 border-t-2 border-slate-300 mt-1">
              <span className="text-sm font-bold text-slate-800">Total Bill per Student</span>
              <span className="text-lg font-bold text-brand-blue-strong">₦{totalBill.toLocaleString()}</span>
            </div>
          </div>
        )}

        <form onSubmit={addBillItem} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Fee Item Description</label>
            <input type="text" value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Tuition Fee, PTA Levy, Sports Fee, Exam Fee" className={inputClass + " w-full"} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₦)</label>
            <input type="number" min="0" value={newItem.amount} onChange={(e) => setNewItem((p) => ({ ...p, amount: e.target.value }))} className={inputClass + " w-40"} />
          </div>
          <button type="submit" disabled={savingItem} className="bg-brand-blue-strong text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{savingItem ? "Adding..." : "Add Item"}</button>
        </form>
        {itemError && <p className="text-sm text-red-600 mt-2">{itemError}</p>}
      </div>

      <div id="print-area">
        <div className="hidden print:block text-center mb-6">
          {schoolSettings?.logo_url ? (
            <img src={schoolSettings.logo_url} alt="Logo" className="w-14 h-14 rounded-full object-cover mx-auto mb-2" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center text-2xl mx-auto mb-2">🏫</div>
          )}
          <h1 className="text-xl font-bold text-slate-800">{schoolSettings?.school_name || "SHINNY STAR SCHOOLS"}</h1>
          <p className="text-sm text-slate-500">{branch} Section — {className} Fee Statement, {term} {schoolSettings?.current_session || SESSION}</p>
          {schoolSettings?.address && <p className="text-xs text-slate-400 mt-1">{schoolSettings.address}</p>}
          <p className="text-xs text-slate-400">{[schoolSettings?.phone, schoolSettings?.email].filter(Boolean).join(" • ")}</p>
        </div>

        <div className="hidden print:block mb-6">
          <h2 className="text-sm font-bold text-slate-800 mb-2">Fee Breakdown</h2>
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <tbody>
              {billItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-700">{item.description}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-800">₦{Number(item.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-brand-blue">
                <td className="px-4 py-2 font-bold text-slate-800">Total per Student</td>
                <td className="px-4 py-2 text-right font-bold text-slate-800">₦{totalBill.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Bill per Student</p>
            <p className="text-xl font-bold text-slate-800">₦{totalBill.toLocaleString()}</p>
          </div>
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Expected Total</p>
            <p className="text-xl font-bold text-slate-800">₦{totalExpected.toLocaleString()}</p>
          </div>
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Collected</p>
            <p className="text-xl font-bold text-green-700">₦{totalCollected.toLocaleString()}</p>
          </div>
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Outstanding</p>
            <p className="text-xl font-bold text-red-600">₦{Math.max(0, totalExpected - totalCollected).toLocaleString()}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading students...</p>
        ) : students.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
            <p className="text-slate-500 text-sm">No students in this class.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-blue text-slate-700">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Student</th>
                  <th className="text-left px-5 py-3 font-semibold">Reg. No.</th>
                  <th className="text-left px-5 py-3 font-semibold">Paid</th>
                  <th className="text-left px-5 py-3 font-semibold">Balance</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const st = statusFor(s.id);
                  return (
                    <tr key={s.id} className="border-t border-slate-200">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-blue print:hidden" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong print:hidden">{s.full_name.charAt(0)}</div>
                          )}
                          <span className="font-medium text-slate-800">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{s.reg_number}</td>
                      <td className="px-5 py-3 text-slate-800 font-medium">₦{st.paid.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-600">₦{st.balance.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + st.color}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3 print:hidden">
                        <button onClick={() => setActiveStudent(s)} className="text-xs text-brand-blue-strong font-medium hover:underline">Record Payment</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeStudent && (
        <PaymentModal
          student={activeStudent}
          branch={branch}
          className={className}
          term={term}
          history={payments[activeStudent.id] || []}
          onClose={() => setActiveStudent(null)}
          onSaved={() => { setActiveStudent(null); loadData(); }}
        />
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

function PaymentModal({ student, branch, className, term, history, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("student_payments").insert([{
      student_id: student.id, branch, class: className, term, session: "2025/2026",
      amount: parseFloat(amount), payment_date: date, method, note,
    }]);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 px-6">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="font-semibold text-slate-800 mb-1">Record Payment</h2>
        <p className="text-sm text-slate-500 mb-4">{student.full_name} — {term}</p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₦)</label>
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass + " w-full"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass + " w-full"} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass + " w-full"}>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Part payment for books" className={inputClass + " w-full"} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        {history.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Payment History</p>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="flex justify-between text-xs text-slate-600">
                  <span>{h.payment_date} • {h.method}</span>
                  <span className="font-medium">₦{Number(h.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : "Save Payment"}</button>
          <button onClick={onClose} className="flex-1 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}