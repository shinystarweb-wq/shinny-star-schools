"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const SESSION = "2025/2026";
const inputClass = "border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function ClassFeesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branch = params.branch.charAt(0).toUpperCase() + params.branch.slice(1);
  const className = decodeURIComponent(params.className);
  const [term, setTerm] = useState(searchParams.get("term") || "1st Term");

  const [schoolSettings, setSchoolSettings] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [optIns, setOptIns] = useState([]);
  const [newItem, setNewItem] = useState({ description: "", amount: "", is_optional: false });
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState("");

  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState({});
  const [adjustmentsByStudent, setAdjustmentsByStudent] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeStudent, setActiveStudent] = useState(null);

  const mandatoryItems = billItems.filter((item) => !item.is_optional);
  const optionalItems = billItems.filter((item) => item.is_optional);
  const totalBill = mandatoryItems.reduce((sum, item) => sum + Number(item.amount), 0);

  async function loadData(silent) {
    if (!silent) setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;

    const { data: settingsData } = await supabase.from("school_settings").select("*").eq("location", location).single();
    setSchoolSettings(settingsData);

    const [itemsRes, studentsRes] = await Promise.all([
      supabase.from("fee_bill_items").select("*").eq("branch", branch).eq("class", className).eq("term", term).eq("session", SESSION).eq("location", location).order("created_at"),
      supabase.from("students").select("id, full_name, photo_url, reg_number, class").eq("branch", branch).eq("class", className).eq("location", location).order("full_name"),
    ]);

    const studentList = studentsRes.data || [];
    const ids = studentList.map((s) => s.id);

    let paymentsData = [];
    let optInsData = [];
    let adjustmentsData = [];
    if (ids.length > 0) {
      const [payRes, optRes, adjRes] = await Promise.all([
        supabase.from("student_payments").select("*").eq("term", term).eq("session", SESSION).in("student_id", ids).order("payment_date", { ascending: false }),
        supabase.from("student_optional_fees").select("*").in("student_id", ids),
        supabase.from("student_fee_adjustments").select("*").eq("term", term).eq("session", SESSION).in("student_id", ids).order("created_at"),
      ]);
      paymentsData = payRes.data || [];
      optInsData = optRes.data || [];
      adjustmentsData = adjRes.data || [];
    }

    const payByStudent = {};
    const adjByStudent = {};
    studentList.forEach((s) => {
      payByStudent[s.id] = paymentsData.filter((p) => p.student_id === s.id);
      adjByStudent[s.id] = adjustmentsData.filter((a) => a.student_id === s.id);
    });

    setBillItems(itemsRes.data || []);
    setStudents(studentList);
    setPayments(payByStudent);
    setOptIns(optInsData);
    setAdjustmentsByStudent(adjByStudent);
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
      is_optional: newItem.is_optional,
    }]);
    setSavingItem(false);
    if (error) {
      setItemError(error.message);
      return;
    }
    setNewItem({ description: "", amount: "", is_optional: false });
    loadData(true);
  }

  async function removeBillItem(id) {
    if (!confirm("Remove this fee item?")) return;
    await supabase.from("fee_bill_items").delete().eq("id", id);
    loadData(true);
  }

  async function toggleOptIn(studentId, feeItemId) {
    const existing = optIns.find((o) => o.student_id === studentId && o.fee_item_id === feeItemId);
    if (existing) {
      await supabase.from("student_optional_fees").update({ opted_in: !existing.opted_in }).eq("id", existing.id);
    } else {
      await supabase.from("student_optional_fees").insert([{ student_id: studentId, fee_item_id: feeItemId, opted_in: true }]);
    }
    loadData(true);
  }

  function optedInIdsFor(studentId) {
    return optIns.filter((o) => o.student_id === studentId && o.opted_in).map((o) => o.fee_item_id);
  }

  function optionalDueFor(studentId) {
    const ids = optedInIdsFor(studentId);
    return optionalItems.filter((item) => ids.includes(item.id)).reduce((sum, item) => sum + Number(item.amount), 0);
  }

  function adjustTotalFor(studentId) {
    return (adjustmentsByStudent[studentId] || []).reduce((sum, a) => sum + Number(a.amount), 0);
  }

  function statusFor(studentId) {
    const paid = (payments[studentId] || []).reduce((s, p) => s + Number(p.amount), 0);
    const due = totalBill + optionalDueFor(studentId) + adjustTotalFor(studentId);
    if (due <= 0) return { label: "No bill set", paid, due, balance: 0, color: "bg-slate-100 text-slate-500" };
    if (paid >= due) return { label: "Full", paid, due, balance: 0, color: "bg-green-50 text-green-700" };
    if (paid > 0) return { label: "Partial", paid, due, balance: due - paid, color: "bg-amber-50 text-amber-700" };
    return { label: "Unpaid", paid, due, balance: due, color: "bg-red-50 text-red-700" };
  }

  const totalCollected = students.reduce((sum, s) => sum + statusFor(s.id).paid, 0);
  const totalExpected = students.reduce((sum, s) => sum + statusFor(s.id).due, 0);

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
                <span className="text-sm text-slate-700 flex items-center gap-2">
                  {item.description}
                  {item.is_optional ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Optional</span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Mandatory</span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800">₦{Number(item.amount).toLocaleString()}</span>
                  <button onClick={() => removeBillItem(item.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5 border-t-2 border-slate-300 mt-1">
              <span className="text-sm font-bold text-slate-800">Mandatory Bill per Student</span>
              <span className="text-lg font-bold text-brand-blue-strong">₦{totalBill.toLocaleString()}</span>
            </div>
          </div>
        )}

        <form onSubmit={addBillItem} className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Fee Item Description</label>
            <input type="text" value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Tuition Fee, PTA Levy, Sports Fee, Excursion" className={inputClass + " w-full"} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₦)</label>
            <input type="number" min="0" value={newItem.amount} onChange={(e) => setNewItem((p) => ({ ...p, amount: e.target.value }))} className={inputClass + " w-40"} />
          </div>
          <div className="flex items-center gap-2 pb-2.5">
            <input type="checkbox" id="optionalCheck" checked={newItem.is_optional} onChange={(e) => setNewItem((p) => ({ ...p, is_optional: e.target.checked }))} className="rounded" />
            <label htmlFor="optionalCheck" className="text-sm text-slate-700">Optional</label>
          </div>
          <button type="submit" disabled={savingItem} className="bg-brand-blue-strong text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{savingItem ? "Adding..." : "Add Item"}</button>
        </form>
        {itemError && <p className="text-sm text-red-600 mt-2">{itemError}</p>}
      </div>

      {optionalItems.length > 0 && (
        <div className="border border-slate-200 rounded-2xl p-6 mb-6 print:hidden">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-1">Optional Fees — Select Who's Paying</h2>
          <p className="text-xs text-slate-500 mb-4">Mandatory fees apply to everyone. Click a student's name to add or remove them from an optional fee.</p>
          <div className="flex flex-col gap-4">
            {optionalItems.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-semibold text-slate-700 mb-2">{item.description} — ₦{Number(item.amount).toLocaleString()}</p>
                <div className="flex flex-wrap gap-2">
                  {students.map((s) => {
                    const optedIn = optedInIdsFor(s.id).includes(item.id);
                    return (
                      <button key={s.id} onClick={() => toggleOptIn(s.id, item.id)} className={"text-xs font-medium px-3 py-1.5 rounded-full border " + (optedIn ? "bg-brand-blue-strong text-white border-brand-blue-strong" : "border-slate-300 text-slate-600 hover:bg-slate-50")}>{optedIn ? "✓ " : ""}{s.full_name}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="print-area">
        <div className="hidden print:block text-center mb-6">
          {schoolSettings?.logo_url ? (
            <img src={schoolSettings.logo_url} alt="Logo" className="w-14 h-14 rounded-full object-cover mx-auto mb-2" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center text-2xl mx-auto mb-2">🏫</div>
          )}
          <h1 className="text-xl font-bold text-slate-800">{schoolSettings?.school_name || "SHINY STAR SCHOOLS"}</h1>
          <p className="text-sm text-slate-500">{branch} Section — {className} Fee Statement, {term} {schoolSettings?.current_session || SESSION}</p>
          {schoolSettings?.address && <p className="text-xs text-slate-400 mt-1">{schoolSettings.address}</p>}
          <p className="text-xs text-slate-400">{[schoolSettings?.phone, schoolSettings?.email].filter(Boolean).join(" • ")}</p>
        </div>

        <div className="hidden print:block mb-6">
          <h2 className="text-sm font-bold text-slate-800 mb-2">Fee Breakdown</h2>
          <table className="w-full text-sm border border-slate-200">
            <tbody>
              {billItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-700">{item.description}{item.is_optional ? " (Optional)" : ""}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-800">₦{Number(item.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-brand-blue">
                <td className="px-4 py-2 font-bold text-slate-800">Mandatory Total per Student</td>
                <td className="px-4 py-2 text-right font-bold text-slate-800">₦{totalBill.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Mandatory Bill per Student</p>
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
                  <th className="text-left px-5 py-3 font-semibold">Bill</th>
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
                      <td className="px-5 py-3 text-slate-600">₦{st.due.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-800 font-medium">₦{st.paid.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-600">₦{st.balance.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + st.color}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3 print:hidden">
                        <button onClick={() => setActiveStudent(s)} className="text-xs text-brand-blue-strong font-medium hover:underline">Payments & Receipts</button>
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
          mandatoryTotal={totalBill}
          optionalItems={optionalItems}
          optedInIds={optedInIdsFor(activeStudent.id)}
          adjustments={adjustmentsByStudent[activeStudent.id] || []}
          schoolSettings={schoolSettings}
          onClose={() => setActiveStudent(null)}
          onSaved={() => { setActiveStudent(null); loadData(true); }}
          onChanged={() => loadData(true)}
          onToggleOptIn={(feeItemId) => toggleOptIn(activeStudent.id, feeItemId)}
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

function PaymentModal({ student, branch, className, term, history, mandatoryTotal, optionalItems, optedInIds, adjustments, schoolSettings, onClose, onSaved, onChanged, onToggleOptIn }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustDesc, setAdjustDesc] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);

  const optionalDue = optionalItems.filter((item) => optedInIds.includes(item.id)).reduce((sum, item) => sum + Number(item.amount), 0);
  const adjustTotal = adjustments.reduce((sum, a) => sum + Number(a.amount), 0);
  const totalDue = mandatoryTotal + optionalDue + adjustTotal;
  const totalPaid = history.reduce((sum, h) => sum + Number(h.amount), 0);
  const balance = Math.max(0, totalDue - totalPaid);

  async function addAdjustment() {
    if (!adjustDesc.trim() || !adjustAmount) return;
    setSavingAdjust(true);
    await supabase.from("student_fee_adjustments").insert([{
      student_id: student.id, branch, class: className, term, session: SESSION,
      description: adjustDesc.trim(), amount: parseFloat(adjustAmount),
    }]);
    setSavingAdjust(false);
    setAdjustDesc("");
    setAdjustAmount("");
    setShowAdjustForm(false);
    onChanged();
  }

  async function removeAdjustment(id) {
    if (!confirm("Remove this adjustment?")) return;
    await supabase.from("student_fee_adjustments").delete().eq("id", id);
    onChanged();
  }

  async function handleSave() {
    setError("");
    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    const { data: inserted, error: insertError } = await supabase.from("student_payments").insert([{
      student_id: student.id, branch, class: className, term, session: SESSION,
      amount: parseFloat(amount), payment_date: date, method, note,
    }]).select().single();
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    const paidToDate = totalPaid + parseFloat(amount);
    setPrintReceipt({ ...inserted, totalDue, paidToDate, balanceAfter: Math.max(0, totalDue - paidToDate), isNew: true });
  }

  function receiptFor(payment) {
    const sorted = [...history].sort((a, b) => (a.payment_date + (a.created_at || "")).localeCompare(b.payment_date + (b.created_at || "")));
    let running = 0;
    let paidToDate = 0;
    for (const p of sorted) {
      running += Number(p.amount);
      if (p.id === payment.id) {
        paidToDate = running;
        break;
      }
    }
    return { ...payment, totalDue, paidToDate, balanceAfter: Math.max(0, totalDue - paidToDate), isNew: false };
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 px-6 py-6">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="font-semibold text-slate-800 mb-1">Payments & Receipts</h2>
        <p className="text-sm text-slate-500 mb-4">{student.full_name} — {term}</p>

        <div className="bg-brand-blue rounded-xl p-4 mb-4 text-sm">
          <div className="flex justify-between mb-1"><span className="text-slate-600">Total Due</span><span className="font-semibold text-slate-800">₦{totalDue.toLocaleString()}</span></div>
          <div className="flex justify-between mb-1"><span className="text-slate-600">Total Paid</span><span className="font-semibold text-green-700">₦{totalPaid.toLocaleString()}</span></div>
          <div className="flex justify-between border-t border-white/60 pt-1"><span className="text-slate-600">Balance</span><span className={"font-bold " + (balance > 0 ? "text-red-600" : "text-green-700")}>₦{balance.toLocaleString()}</span></div>
        </div>

        {optionalItems.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Optional Fees</p>
            <div className="flex flex-col gap-1.5">
              {optionalItems.map((item) => (
                <label key={item.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={optedInIds.includes(item.id)} onChange={() => onToggleOptIn(item.id)} className="rounded" />
                    {item.description}
                  </span>
                  <span className="font-medium text-slate-800">₦{Number(item.amount).toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Bill Adjustments</p>
            <button onClick={() => setShowAdjustForm((p) => !p)} className="text-xs text-brand-blue-strong font-medium hover:underline">{showAdjustForm ? "Cancel" : "+ Add Adjustment"}</button>
          </div>
          {adjustments.length > 0 && (
            <div className="flex flex-col gap-1 mb-2">
              {adjustments.map((a) => (
                <div key={a.id} className="flex justify-between items-center text-xs text-slate-600">
                  <span>{a.description}</span>
                  <span className="flex items-center gap-2">
                    <span className={Number(a.amount) < 0 ? "text-green-600" : "text-slate-800"}>{Number(a.amount) < 0 ? "-" : "+"}₦{Math.abs(Number(a.amount)).toLocaleString()}</span>
                    <button onClick={() => removeAdjustment(a.id)} className="text-red-500 hover:text-red-700">✕</button>
                  </span>
                </div>
              ))}
            </div>
          )}
          {showAdjustForm && (
            <div className="flex gap-2 mb-2">
              <input type="text" value={adjustDesc} onChange={(e) => setAdjustDesc(e.target.value)} placeholder="e.g. Sibling discount" className={inputClass + " flex-1 text-xs"} />
              <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="- for discount" className={inputClass + " w-32 text-xs"} />
              <button onClick={addAdjustment} disabled={savingAdjust} className="bg-brand-blue-strong text-white px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90">{savingAdjust ? "..." : "Add"}</button>
            </div>
          )}
          <p className="text-[11px] text-slate-400">Use a negative amount for a discount, positive for an extra charge.</p>
        </div>

        <div className="border-t border-slate-200 pt-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-slate-500 uppercase">Record New Payment</p>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Paid For (note)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Tuition part payment" className={inputClass + " w-full"} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={handleSave} disabled={saving} className="bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : "Save Payment & Generate Receipt"}</button>
        </div>

        {history.length > 0 && (
          <div className="mt-5 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Payment History</p>
            <div className="flex flex-col gap-1.5">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs text-slate-600 border border-slate-100 rounded-lg px-3 py-2">
                  <span>{h.payment_date} • <span className="capitalize">{h.method}</span>{h.note ? " • " + h.note : ""}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-slate-800">₦{Number(h.amount).toLocaleString()}</span>
                    <button onClick={() => setPrintReceipt(receiptFor(h))} className="text-brand-blue-strong font-medium hover:underline">Receipt</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50 mt-5">Close</button>
      </div>

      {printReceipt && (
        <ReceiptModal
          student={student}
          term={term}
          payment={printReceipt}
          schoolSettings={schoolSettings}
          onClose={() => {
            const wasNew = printReceipt.isNew;
            setPrintReceipt(null);
            if (wasNew) onSaved();
          }}
        />
      )}
    </div>
  );
}

function ReceiptModal({ student, term, payment, schoolSettings, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[60] px-6">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl">
        <div id="receipt-print-area" className="p-6 bg-white">
          <div className="text-center border-b-2 border-brand-blue-strong pb-4 mb-4">
            {schoolSettings?.logo_url ? (
              <img src={schoolSettings.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover mx-auto mb-2" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-blue flex items-center justify-center text-xl mx-auto mb-2">🏫</div>
            )}
            <h1 className="text-lg font-bold text-slate-800">{schoolSettings?.school_name || "SHINY STAR SCHOOLS"}</h1>
            {schoolSettings?.address && <p className="text-xs text-slate-500">{schoolSettings.address}</p>}
            <p className="text-xs text-slate-400">{[schoolSettings?.phone, schoolSettings?.email].filter(Boolean).join(" • ")}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wide mt-2 font-semibold">Payment Receipt</p>
            <p className="text-[10px] text-slate-400">No. {String(payment.id).slice(0, 8).toUpperCase()}</p>
          </div>

          <div className="text-sm mb-3">
            <div className="flex justify-between mb-1"><span className="text-slate-500">Student:</span><span className="font-medium text-slate-800">{student.full_name}</span></div>
            <div className="flex justify-between mb-1"><span className="text-slate-500">Class:</span><span className="font-medium text-slate-800">{student.class}</span></div>
            <div className="flex justify-between mb-1"><span className="text-slate-500">Reg. No:</span><span className="font-medium text-slate-800">{student.reg_number || "-"}</span></div>
            <div className="flex justify-between mb-1"><span className="text-slate-500">Term:</span><span className="font-medium text-slate-800">{term} {schoolSettings?.current_session || SESSION}</span></div>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-3 mb-3 text-sm">
            <div className="flex justify-between mb-1"><span className="text-slate-500">Date:</span><span className="font-medium text-slate-800">{payment.payment_date}</span></div>
            <div className="flex justify-between mb-1"><span className="text-slate-500">Method:</span><span className="font-medium text-slate-800 capitalize">{payment.method}</span></div>
            <div className="flex justify-between mb-1"><span className="text-slate-500">Paid for:</span><span className="font-medium text-slate-800">{payment.note || "School fees"}</span></div>
          </div>

          <div className="border-t-2 border-slate-800 pt-3 text-sm">
            <div className="flex justify-between text-base font-bold text-slate-800 mb-2">
              <span>Amount Paid</span>
              <span>₦{Number(payment.amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-1"><span className="text-slate-500">Total Bill</span><span className="text-slate-800">₦{Number(payment.totalDue).toLocaleString()}</span></div>
            <div className="flex justify-between mb-1"><span className="text-slate-500">Total Paid to Date</span><span className="text-slate-800">₦{Number(payment.paidToDate).toLocaleString()}</span></div>
            <div className="flex justify-between font-semibold"><span className="text-slate-600">Balance Remaining</span><span className={payment.balanceAfter > 0 ? "text-red-600" : "text-green-600"}>₦{Number(payment.balanceAfter).toLocaleString()}</span></div>
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-5">{schoolSettings?.website || "shinystarschools.com.ng"}</p>
        </div>

        <div className="flex gap-3 p-4 border-t border-slate-100">
          <button onClick={() => window.print()} className="flex-1 bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90">🖨 Print Receipt</button>
          <button onClick={onClose} className="flex-1 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50">Done</button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          #print-area { display: none !important; }
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}