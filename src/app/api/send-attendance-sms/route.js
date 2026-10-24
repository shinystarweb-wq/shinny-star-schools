export async function POST(request) {
  const { phoneNumber, studentName, status, date, className, time } = await request.json();

  if (!phoneNumber) {
    return Response.json({ skipped: true, reason: "no_phone" });
  }

  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "TERMII_API_KEY is not set on the server." }, { status: 500 });
  }

  const senderId = process.env.TERMII_SENDER_ID || "N-Alert";
  const channel = process.env.TERMII_CHANNEL || "generic";

  let to = String(phoneNumber).replace(/[\s\-()]/g, "");
  if (to.startsWith("+")) to = to.slice(1);
  if (to.startsWith("0")) to = "234" + to.slice(1);

  if (!/^234\d{10}$/.test(to)) {
    return Response.json({ error: "Invalid Nigerian phone number: " + phoneNumber }, { status: 400 });
  }

  const who = studentName + " (" + className + ")";
  let message;
  if (status === "signed_out") {
    message = "Shiny Star Schools: " + who + " has signed out and left school at " + time + " on " + date + ".";
  } else if (status === "absent") {
    message = "Shiny Star Schools: " + who + " was marked ABSENT on " + date + ". Please contact the school if this is unexpected.";
  } else if (status === "late") {
    message = "Shiny Star Schools: " + who + " arrived LATE and was marked on " + date + ".";
  } else {
    message = "Shiny Star Schools: " + who + " has arrived and was marked PRESENT on " + date + ".";
  }

  try {
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        from: senderId,
        sms: message,
        type: "plain",
        channel,
        api_key: apiKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.message || JSON.stringify(data) }, { status: 500 });
    }

    return Response.json({ sent: true, data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}