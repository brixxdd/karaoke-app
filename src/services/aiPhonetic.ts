const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export async function generateSrtToLrcAndPhonetic(srtContent: string): Promise<string> {
  const prompt = `You will receive the full text of a SubRip (.srt) file.

Task:
1. Convert it to standard LRC format:
   - Replace commas with dots in timecodes.
   - Output only lines in the form [mm:ss.xx] text.
   - Skip sequence numbers, empty lines, and arrows.

2. Immediately after, generate a second LRC block with the SAME timestamps but every lyric replaced by its sung-style phonetic pronunciation (readable, not IPA).

Return ONLY the two blocks, no explanations, no metadata.

Start now:

${srtContent}`;

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
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}