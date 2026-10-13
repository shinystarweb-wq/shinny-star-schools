const API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function POST(request) {
  try {
    const {
      phoneNumber,
      studentName,
      status,
      date,
      className,
    } = await request.json();

    if (!phoneNumber) {
      return Response.json({
        skipped: true,
        reason: "No parent phone number on file.",
      });
    }

    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      return Response.json(
        {
          error: "WhatsApp environment variables are not configured.",
        },
        { status: 500 }
      );
    }

    const statusText =
      status === "present"
        ? "present"
        : status === "late"
        ? "late"
        : "absent";

    const url =
      `https://graph.facebook.com/${API_VERSION}/` +
      `${PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: "hello_world",
          language: {
            code: "en_US",
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);

      return Response.json(
        {
          error: "WhatsApp message failed.",
          details: data,
        },
        { status: response.status }
      );
    }

    return Response.json({
      sent: true,
      data,
    });
  } catch (error) {
    console.error("WhatsApp route error:", error);

    return Response.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}