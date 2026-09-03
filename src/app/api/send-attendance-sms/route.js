export async function POST(request) {
  const { phoneNumber, studentName, status, date, className } = await request.json();

  if (!phoneNumber) {
    return Response.json({ skipped: true, reason: "No guardian phone number on file." });
  }

  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "SMS service not configured on the server." }, { status: 500 });
  }

  let formattedNumber = phoneNumber.trim().replace(/\s+/g, "");
  if (formattedNumber.startsWith("0")) {
    formattedNumber = "234" + formattedNumber.slice(1);
  } else if (formattedNumber.startsWith("+")) {
    formattedNumber = formattedNumber.slice(1);
  }

  const message = studentName + " was marked ABSENT today (" + date + ") at Shinny Star Schools, " + className + ". Please contact the school if this is unexpected.";

  try {
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: formattedNumber,
        from: "N-Alert",
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: "Termii error: " + JSON.stringify(data) }, { status: 500 });
    }

    return Response.json({ sent: true, data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}