const SKIP_NO_PHONE = { skipped: true, reason: "no_phone" };
const SKIP_NOT_NEEDED = { skipped: true, reason: "not_needed" };

async function post(url, payload) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

export async function notifyGuardian({ student, status, date, className }) {
  const base = { studentName: student.full_name, status, date, className };
  const wantsSms = status === "present" || status === "absent";

  const emailPromise = student.guardian_email
    ? post("/api/send-attendance-email", { ...base, guardianEmail: student.guardian_email })
    : Promise.resolve(SKIP_NOT_NEEDED);

  let smsPromise;
  if (!wantsSms) smsPromise = Promise.resolve(SKIP_NOT_NEEDED);
  else if (!student.parent_phone) smsPromise = Promise.resolve(SKIP_NO_PHONE);
  else smsPromise = post("/api/send-attendance-sms", { ...base, phoneNumber: student.parent_phone });

  const [email, sms] = await Promise.all([emailPromise, smsPromise]);
  return { email, sms };
}

export async function notifyMany(items, batchSize = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const out = await Promise.all(batch.map((item) => notifyGuardian(item)));
    results.push(...out);
  }
  return results;
}

export async function notifySignOut({ student, date, className, time }) {
  if (!student.parent_phone) return { email: SKIP_NOT_NEEDED, sms: SKIP_NO_PHONE };
  const sms = await post("/api/send-attendance-sms", {
    studentName: student.full_name,
    status: "signed_out",
    date,
    className,
    time,
    phoneNumber: student.parent_phone,
  });
  return { email: SKIP_NOT_NEEDED, sms };
}

export function notifyAbsent(args) {
  return notifyGuardian({ ...args, status: "absent" });
}

export function summarizeNotifications(results) {
  const n = results.length;
  const smsSent = results.filter((r) => r.sms && r.sms.sent).length;
  const smsFailed = results.filter((r) => r.sms && r.sms.error);
  const noPhone = results.filter((r) => r.sms && r.sms.skipped && r.sms.reason === "no_phone").length;
  const emailSent = results.filter((r) => r.email && r.email.sent).length;

  const parts = [];
  if (smsSent) parts.push(n === 1 ? "SMS sent to guardian" : "SMS sent for " + smsSent + " students");
  if (emailSent) parts.push(n === 1 ? "email sent to guardian" : "email sent for " + emailSent + " students");
  if (noPhone) parts.push(n === 1 ? "no guardian phone number on file" : noPhone + " students have no guardian phone number on file");
  if (smsFailed.length) parts.push("SMS failed: " + smsFailed[0].sms.error);

  return parts.length ? " " + parts.join(". ") + "." : "";
}