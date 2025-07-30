export default async function handler(req, res) {
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
You are an expert pediatrician. Given the following patient details, vitals, development milestones, chief complaint, and physical exam, assess the case and return:
- A likely diagnosis (or differential diagnoses)
- A suggested treatment plan
- Any follow-up questions the doctor should consider
- Advice or counselling for the case

Patient details (no identifiers):\n${JSON.stringify(clinical_context, null, 2)}\n\nRespond ONLY with valid JSON and nothing else. Do not include any explanation or extra text. Format your response as:\n{\n  "diagnosis": "...",\n  "treatment_plan": "...",\n  "follow_up_questions": ["...", "..."],\n  "advice_counselling": "..."\n}\n`;

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
      aiResult = { diagnosis: data.choices[0].message.content, treatment_plan: '', follow_up_questions: [], advice_counselling: '' };
    }
    res.status(200).json(aiResult);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get AI feedback', details: err.message });
  }
} 