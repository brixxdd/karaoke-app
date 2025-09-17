const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export async function generatePhoneticLyrics(englishLyrics: string): Promise<string> {
  const prompt = `Convert the following English lyrics into phonetic pronunciation (not IPA), as if singing. Use simple, readable spelling. Keep line breaks and punctuation.

${englishLyrics}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Karaoke App',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat-v3.1:free',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}