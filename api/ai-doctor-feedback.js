export default async function handler(req, res) {
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clinical_context } = req.body;
  if (!clinical_context) {
    return res.status(400).json({ error: 'Clinical context is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not set.' });
  }

  const prompt = `
Clinical Context (no identifiers):\n${JSON.stringify(clinical_context, null, 2)}\n\n1. Provide a brief AI-generated summary/assessment of the case.\n2. Suggest 3-5 follow-up questions the doctor can ask the patient.\n3. Based on the context, suggest possible solutions or next steps for the doctor.\nFormat your response as:\n{\n  "ai_notes": "...",\n  "questions": ["...", "..."],\n  "suggestions": ["...", "..."]\n}\n`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    const data = await response.json();
    console.log('OpenAI API response:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      return res.status(500).json({
        error: 'OpenAI API error',
        details: data.error ? data.error.message : 'No choices returned from OpenAI',
        openai_response: data
      });
    }

    let aiResult;
    try {
      aiResult = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      aiResult = { ai_notes: data.choices[0].message.content, questions: [], suggestions: [] };
    }
    res.status(200).json(aiResult);
  } catch (err) {
    console.error('AI feedback error:', err);
    res.status(500).json({ error: 'Failed to get AI feedback', details: err.message });
  }
} 