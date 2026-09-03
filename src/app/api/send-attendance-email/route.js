import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { guardianEmail, studentName, status, date, className } = await request.json();

  if (!guardianEmail) {
    return Response.json({ skipped: true, reason: "No guardian email on file." });
  }

  const statusText = status === "present" ? "present" : status === "late" ? "late" : "absent";
  const statusColor = status === "present" ? "#16a34a" : status === "late" ? "#d97706" : "#dc2626";
  const subject = studentName + " marked " + statusText + " today — Shinny Star Schools";

  try {
    await resend.emails.send({
      from: "Shinny Star Schools <onboarding@resend.dev>",
      to: guardianEmail,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e293b; margin-bottom: 4px;">Shinny Star Schools</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 0;">Attendance Notification</p>
          <div style="background: #eaf4fd; border-radius: 10px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #1e293b;">
              <strong>${studentName}</strong> (${className}) was marked
              <strong style="color: ${statusColor};">${statusText}</strong>
              on ${date}.
            </p>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This is an automated message from Shinny Star Schools. Please do not reply to this email.</p>
        </div>
      `,
    });
    return Response.json({ sent: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}