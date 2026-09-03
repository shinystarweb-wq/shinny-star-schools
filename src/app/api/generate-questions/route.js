export async function POST(request) {
  const { topicList } = await request.json();

  const keys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
  ].filter(Boolean);

  if (keys.length === 0) {
    return Response.json({ error: "No AI API keys configured on the server." }, { status: 500 });
  }

  const validTopics = (topicList || []).filter((t) => t.name && t.name.trim());
  if (validTopics.length === 0) {
    return Response.json({ error: "No valid topics provided." }, { status: 400 });
  }

  const topicBreakdown = validTopics.map((t) => t.count + " " + t.difficulty + " questions on \"" + t.name.trim() + "\"").join("; ");
  const totalCount = validTopics.reduce((sum, t) => sum + (parseInt(t.count) || 0), 0);

  const prompt = "Generate exactly the following multiple choice exam questions: " + topicBreakdown +
    ". Total questions: " + totalCount +
    ". Respond ONLY with a valid JSON array, no other text, no markdown formatting. Each item must have this exact shape: " +
    '{"question": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "a"}' +
    ' where correct_answer is one of "a", "b", "c", "d".';

  let lastError = "";

  for (const key of keys) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (response.status === 429) {
        lastError = "Rate limited on this key, trying next...";
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        lastError = "API error: " + errText;
        continue;
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const questions = JSON.parse(cleaned);

      return Response.json({ questions });
    } catch (err) {
      lastError = err.message;
      continue;
    }
  }

  return Response.json({ error: "All AI keys failed or are rate limited. Last error: " + lastError }, { status: 500 });
}