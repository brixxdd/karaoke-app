// src/services/lyricsCorrection.ts

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

interface CorrectionResult {
  correctedSrt: string;
  changes: Array<{
    line: number;
    original: string;
    corrected: string;
    reason: string;
  }>;
}

export async function correctLyricsWithAI(
  whisperSrt: string,
  referenceLyrics: string
): Promise<CorrectionResult> {
  
  const prompt = `You are a lyrics correction assistant. Compare the Whisper SRT with reference lyrics and fix transcription errors.

Keep exact timestamps, only fix TEXT.

Output format:
1. Corrected SRT (complete)
2. "---CHANGES---"
3. List changes: Line X: "wrong" → "correct" (reason)

WHISPER SRT:
${whisperSrt}

REFERENCE LYRICS:
${referenceLyrics}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error('Error en corrección de letras');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';

  const parts = content.split('---CHANGES---');
  const correctedSrt = parts[0].trim();
  const changesText = parts[1]?.trim() || '';

  const changes: CorrectionResult['changes'] = [];
  const lines = changesText.split('\n');

  for (const line of lines) {
    const match = line.match(/Line (\d+):\s*"([^"]+)"\s*→\s*"([^"]+)"\s*\(([^)]+)\)/);
    if (match) {
      changes.push({
        line: parseInt(match[1]),
        original: match[2],
        corrected: match[3],
        reason: match[4]
      });
    }
  }

  return { correctedSrt, changes };
}

export function formatChangeSummary(changes: CorrectionResult['changes']): string {
  if (changes.length === 0) {
    return '✅ No se encontraron errores. Las letras están correctas.';
  }

  let summary = `Se corrigieron ${changes.length} error(es):\n\n`;
  
  changes.forEach((change, index) => {
    summary += `${index + 1}. Línea ${change.line}:\n`;
    summary += `   ❌ "${change.original}"\n`;
    summary += `   ✅ "${change.corrected}"\n`;
    summary += `   💡 ${change.reason}\n\n`;
  });

  return summary;
}