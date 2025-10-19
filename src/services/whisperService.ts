// src/services/whisperService.ts

const WHISPER_SERVER_URL = import.meta.env.VITE_WHISPER_SERVER_URL || 'http://localhost:3001';

export interface TranscriptionResult {
  success: boolean;
  srt: string;
  message?: string;
  error?: string;
}

/**
 * Transcribe un archivo de audio MP3 a formato SRT usando Whisper
 */
export async function transcribeAudioToSrt(
  audioFile: File,
  songMetadata?: { title?: string; artist?: string },
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    // Agregar metadatos de la canción si están disponibles
    if (songMetadata?.title) {
      formData.append('title', songMetadata.title);
    }
    if (songMetadata?.artist) {
      formData.append('artist', songMetadata.artist);
    }

    // Simular progreso si se proporciona callback
    if (onProgress) onProgress(10);

    const response = await fetch(`${WHISPER_SERVER_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (onProgress) onProgress(90);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error en la transcripción');
    }

    const result: TranscriptionResult = await response.json();

    if (onProgress) onProgress(100);

    if (!result.success) {
      throw new Error(result.error || 'La transcripción falló');
    }

    return result.srt;
  } catch (error) {
    console.error('Error en transcripción:', error);
    throw error;
  }
}

/**
 * Verifica si el servidor Whisper está disponible
 */
export async function checkWhisperServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${WHISPER_SERVER_URL}/api/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Servidor Whisper no disponible:', error);
    return false;
  }
}

/**
 * Convierte SRT a formato LRC
 */
export function convertSrtToLrc(srtContent: string): string {
  const lines = srtContent.split('\n');
  const lrcLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Buscar líneas con timestamps (formato: 00:00:01,000 --> 00:00:04,000)
    const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    
    if (timeMatch) {
      const startMin = parseInt(timeMatch[2], 10);
      const startSec = parseInt(timeMatch[3], 10);
      const startMs = parseInt(timeMatch[4], 10);

      // Convertir a formato LRC [mm:ss.xx]
      const totalSeconds = startMin * 60 + startSec;
      const centiseconds = Math.floor(startMs / 10);
      const lrcTime = `[${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]`;

      // La siguiente línea no vacía es el texto
      let textLine = '';
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine && !/^\d+$/.test(nextLine) && !nextLine.includes('-->')) {
          textLine = nextLine;
          break;
        }
      }

      if (textLine) {
        lrcLines.push(`${lrcTime} ${textLine}`);
      }
    }
  }

  return lrcLines.join('\n');
}