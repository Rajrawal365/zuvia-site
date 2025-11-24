// api/chat.js
// Simple serverless endpoint for Vercel that proxies chat requests to OpenAI.
// (Uses the REST API via fetch; keep your OPENAI_API_KEY in env vars)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Only POST allowed' });
    return;
  }

  const body = req.body;
  if (!body || !Array.isArray(body.messages)) {
    res.status(400).json({ error: 'Invalid request, expected { messages: [...] }' });
    return;
  }

  try {
    // Prepare OpenAI request
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      res.status(500).json({ error: 'OpenAI key not configured on server.' });
      return;
    }

    const payload = {
      model: "gpt-3.5-turbo",
      messages: body.messages,
      max_tokens: 800,
      temperature: 0.2
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('OpenAI non-ok:', resp.status, txt);
      return res.status(502).json({ error: 'OpenAI error', detail: txt });
    }

    const data = await resp.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      ? data.choices[0].message.content
      : '';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Server error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
