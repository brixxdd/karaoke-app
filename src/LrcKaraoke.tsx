import React, { useRef, useState, useEffect } from 'react';
import SongInfo from './SongInfo';
// @ts-ignore: No type definitions for 'jsmediatags'
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";
import { generateSrtToLrcAndPhonetic, polishLyricsWithOriginal } from './services/aiPhonetic';
import { transcribeAudioToSrt, convertSrtToLrc, checkWhisperServerHealth } from './services/whisperService';
import { correctLyricsWithAI, formatChangeSummary } from './services/lyricsCorrection';
import AiResultDisplay from './AiResultDisplay';

interface LrcLine {
  time: number;
  text: string;
  pronunciation?: string;
}

const LrcKaraoke: React.FC = () => {
  // Estados de audio y metadatos
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Estado de letras
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);

  // Estados para la generación fonética con IA
  const [isGeneratingPhonetic, setIsGeneratingPhonetic] = useState<boolean>(false);
  const [phoneticTextResult, setPhoneticTextResult] = useState<string>('');

  // Estados para Whisper
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);
  const [whisperServerAvailable, setWhisperServerAvailable] = useState<boolean>(false);
  
  // Estados para corrección de letras
  const [isCorrectingLyrics, setIsCorrectingLyrics] = useState<boolean>(false);
  const [originalSrt, setOriginalSrt] = useState<string>(''); // Guardar SRT original
  
  // Estados para pulido de letras
  const [isPolishingLyrics, setIsPolishingLyrics] = useState<boolean>(false);

  // Metadatos de la canción
  const [songMeta, setSongMeta] = useState<{
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
    coverUrl?: string;
  }>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const srtFileInputRef = useRef<HTMLInputElement>(null);

  // Verificar disponibilidad del servidor Whisper al montar
  useEffect(() => {
    checkWhisperServerHealth().then(setWhisperServerAvailable);
  }, []);

  // Parseo eficiente de .lrc
  function parseLRC(lrcText: string): LrcLine[] {
    const lines = lrcText.split('\n');
    const tempLines: { time: number; text: string; rawLine: string }[] = [];

    for (const line of lines) {
      const timeTags = [...line.matchAll(/\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g)];
      const text = line.replace(/\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g, '').trim();

      if (text &&
          !text.startsWith('RCLyricsBand') &&
          !text.startsWith('by:') &&
          !text.startsWith('ti:') &&
          !text.startsWith('ar:') &&
          !text.startsWith('al:') &&
          !text.startsWith('lang:') &&
          !text.startsWith('length:') &&
          !text.startsWith('re:') &&
          !text.startsWith('ve:')
      ) {
        for (const tag of timeTags) {
          const min = parseInt(tag[1], 10);
          const sec = parseFloat(tag[2]);
          const time = min * 60 + sec;
          tempLines.push({ time, text, rawLine: line });
        }
      }
    }

    tempLines.sort((a, b) => a.time - b.time);

    const result: LrcLine[] = [];
    for (let i = 0; i < tempLines.length; i++) {
      const current = tempLines[i];
      const next = tempLines[i + 1];

      if (next && current.time === next.time) {
        result.push({ time: current.time, text: current.text, pronunciation: next.text });
        i++;
      } else {
        result.push({ time: current.time, text: current.text });
      }
    }
    console.log('Líneas parseadas:', result.length);
    return result;
  }

  // Parseo de .srt a LrcLine[]
  function parseSRT(srtText: string): LrcLine[] {
    const lines = srtText.split('\n');
    const result: LrcLine[] = [];
    let currentTimestamp = 0;
    let currentTextLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        if (currentTextLines.length > 0 && currentTimestamp > 0) {
          result.push({ time: currentTimestamp, text: currentTextLines.join(' ') });
        }
        currentTextLines = [];
        currentTimestamp = 0;
        continue;
      }

      if (/^\d+$/.test(line)) {
        if (currentTextLines.length > 0 && currentTimestamp > 0) {
          result.push({ time: currentTimestamp, text: currentTextLines.join(' ') });
        }
        currentTextLines = [];
        currentTimestamp = 0;
        continue;
      }

      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      if (timeMatch) {
        if (currentTextLines.length > 0 && currentTimestamp > 0) {
          result.push({ time: currentTimestamp, text: currentTextLines.join(' ') });
        }
        const startMin = parseInt(timeMatch[2], 10);
        const startSec = parseInt(timeMatch[3], 10);
        const startMs = parseInt(timeMatch[4], 10);
        currentTimestamp = startMin * 60 + startSec + startMs / 1000;
        currentTextLines = [];
      } else {
        currentTextLines.push(line);
      }
    }

    if (currentTextLines.length > 0 && currentTimestamp > 0) {
      result.push({ time: currentTimestamp, text: currentTextLines.join(' ') });
    }

    return result;
  }

  // Cargar archivo de audio y extraer metadatos
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleAudioUpload ejecutado');
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setIsLoading(true);
      setIsPlaying(false);
      setCurrentTime(0);
      
      jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          console.log(tag);
          let coverUrl;
          if (tag.tags.picture) {
            const { data, format } = tag.tags.picture;
            const byteArray = new Uint8Array(data);
            const blob = new Blob([byteArray], { type: format });
            coverUrl = URL.createObjectURL(blob);
          }
          setSongMeta({
            title: tag.tags.title,
            artist: tag.tags.artist,
            album: tag.tags.album,
            year: tag.tags.year ? String(tag.tags.year) : undefined,
            genre: tag.tags.genre ? tag.tags.genre[0] : undefined,
            coverUrl,
          });
          setIsLoading(false);
        },
        onError: (error: any) => {
          console.error('Error extrayendo metadatos:', error);
          setSongMeta({});
          setIsLoading(false);
        }
      });
    }
  };

  // Cargar archivo .lrc
  const handleLrcUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const lrcText = event.target?.result as string;
        const parsed = parseLRC(lrcText);
        setLyrics(parsed);
        setCurrentLineIndex(0);
      };
      reader.readAsText(file);
    }
  };

  // Subir archivo SRT y generar fonética
  const handleSrtFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGeneratingPhonetic(true);
    setPhoneticTextResult('');
    setLyrics([]);

    try {
      const srtText = await file.text();
      const aiResponse = await generateSrtToLrcAndPhonetic(srtText);

      if (!aiResponse) {
        alert("La IA no pudo generar la fonética.");
        setIsGeneratingPhonetic(false);
        return;
      }

      const parsedLyrics = parseLRC(aiResponse);
      if (parsedLyrics.length === 0) {
        alert("No se pudieron extraer letras del resultado de la IA.");
        setIsGeneratingPhonetic(false);
        return;
      }
      setLyrics(parsedLyrics);
      setPhoneticTextResult(aiResponse);

    } catch (error) {
      console.error("Error processing SRT or generating phonetic lyrics:", error);
      alert("Hubo un error al procesar el archivo SRT o generar la fonética.");
    } finally {
      setIsGeneratingPhonetic(false);
    }
  };

  // Generar SRT desde MP3 usando Whisper
  const handleGenerateSrtFromAudio = async () => {
    if (!audioFile) {
      alert('Primero debes cargar un archivo de audio');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionProgress(0);

    try {
      console.log('Iniciando transcripción con Whisper...');
      
      // Pasar metadatos de la canción al servicio
      const metadata = {
        title: songMeta.title || audioFile.name.replace(/\.[^/.]+$/, ''),
        artist: songMeta.artist
      };

      const srtContent = await transcribeAudioToSrt(
        audioFile,
        metadata,
        (progress) => setTranscriptionProgress(progress)
      );

      console.log('Transcripción completada:', srtContent.substring(0, 200));

      const lrcContent = convertSrtToLrc(srtContent);
      const parsedLyrics = parseLRC(lrcContent);

      if (parsedLyrics.length === 0) {
        alert('No se pudieron extraer letras del audio. Intenta con otro archivo.');
        return;
      }

      setLyrics(parsedLyrics);
      setOriginalSrt(srtContent); // Guardar SRT original para corrección
      
      alert(`¡Transcripción completada! Se generaron ${parsedLyrics.length} líneas de letra.\n\nArchivo guardado como: ${metadata.artist || 'Artista_Desconocido'}-${metadata.title}.srt`);

      const shouldGeneratePhonetic = window.confirm(
        '¿Deseas generar también la versión fonética de las letras?'
      );

      if (shouldGeneratePhonetic) {
        setIsGeneratingPhonetic(true);
        try {
          const phoneticResult = await generateSrtToLrcAndPhonetic(srtContent);
          setPhoneticTextResult(phoneticResult);
        } catch (error) {
          console.error('Error generando fonética:', error);
          alert('No se pudo generar la versión fonética, pero las letras normales están listas.');
        } finally {
          setIsGeneratingPhonetic(false);
        }
      }

    } catch (error) {
      console.error('Error en transcripción:', error);
      alert(`Error al transcribir el audio: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress(0);
    }
  };

  const handleGeneratePhonetic = async () => {
    srtFileInputRef.current?.click();
  };

  const handleDownloadPhonetic = () => {
    if (!phoneticTextResult) {
      alert("No hay fonética generada para descargar.");
      return;
    }

    const blob = new Blob([phoneticTextResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${songMeta.title || 'cancion'}_fonetico.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReplaceWithPhonetic = () => {
    if (!phoneticTextResult) {
      alert("No hay fonética generada para reemplazar.");
      return;
    }

    const parsedAiResult = parseLRC(phoneticTextResult);
    const updatedLyrics: LrcLine[] = parsedAiResult.map(line => ({
      time: line.time,
      text: line.pronunciation || line.text,
      pronunciation: line.pronunciation ? line.text : undefined,
    }));
    setLyrics(updatedLyrics);
  };

  // Corregir letras usando IA
  const handleCorrectLyrics = async () => {
    if (!originalSrt) {
      alert('No hay letras generadas para corregir. Primero transcribe un audio con Whisper.');
      return;
    }

    const referenceLyrics = prompt(
      'Pega aquí las letras correctas de la canción (puedes copiarlas de Genius, AZLyrics, etc.):'
    );

    if (!referenceLyrics || referenceLyrics.trim().length === 0) {
      return;
    }

    setIsCorrectingLyrics(true);

    try {
      console.log('🔍 Corrigiendo letras con IA...');
      
      const result = await correctLyricsWithAI(originalSrt, referenceLyrics);
      
      console.log('✅ Corrección completada');
      console.log('📝 Cambios detectados:', result.changes.length);

      // Mostrar resumen de cambios
      const summary = formatChangeSummary(result.changes);
      alert(summary);

      // Actualizar las letras con la versión corregida
      const correctedLrcContent = convertSrtToLrc(result.correctedSrt);
      const parsedCorrected = parseLRC(correctedLrcContent);
      
      setLyrics(parsedCorrected);
      setOriginalSrt(result.correctedSrt); // Actualizar el SRT original

      console.log('✅ Letras actualizadas con la versión corregida');

    } catch (error) {
      console.error('Error corrigiendo letras:', error);
      alert(`Error al corregir las letras: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsCorrectingLyrics(false);
    }
  };

  // Pulir letras comparando con letras originales
  const handlePolishLyrics = async () => {
    if (!originalSrt) {
      alert('No hay letras generadas para pulir. Primero transcribe un audio con Whisper.');
      return;
    }

    const originalLyrics = prompt(
      'Pega aquí las letras originales del cantante (desde Genius, AZLyrics, etc.):'
    );

    if (!originalLyrics || originalLyrics.trim().length === 0) {
      return;
    }

    setIsPolishingLyrics(true);

    try {
      console.log('✨ Pulindo letras con IA...');
      
      const polishedSrt = await polishLyricsWithOriginal(originalSrt, originalLyrics);
      
      console.log('✅ Pulido completado');

      // Convertir SRT pulido a LRC y actualizar
      const polishedLrcContent = convertSrtToLrc(polishedSrt);
      const parsedPolished = parseLRC(polishedLrcContent);
      
      setLyrics(parsedPolished);
      setOriginalSrt(polishedSrt); // Actualizar el SRT original

      alert(`✅ Letras pulidas exitosamente! Se corrigieron ${parsedPolished.length} líneas manteniendo los tiempos originales.`);

      console.log('✅ Letras actualizadas con la versión pulida');

    } catch (error) {
      console.error('Error puliendo letras:', error);
      alert(`Error al pulir las letras: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsPolishingLyrics(false);
    }
  };

  

  const updateCurrentLine = (time: number) => {
    let index = 0;
    while (index < lyrics.length - 1 && time >= lyrics[index + 1].time) {
      index++;
    }
    setCurrentLineIndex(index);
  };

  useEffect(() => {
    let intervalId: number | null = null;
    
    if (isPlaying && audioRef.current) {
      // Actualizar cada 100ms en lugar de cada frame
      intervalId = setInterval(() => {
        if (audioRef.current) {
          const time = audioRef.current.currentTime;
          setCurrentTime(time);
          updateCurrentLine(time);
        }
      }, 100);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, lyrics]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const onCanPlay = () => {
      setIsLoading(false);
    };
    const onError = () => {
      alert('Hubo un error al cargar el audio.');
      setIsLoading(false);
    };
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, [audioUrl]);

  // Controles
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error('Error playing audio', e));
    }
    setIsPlaying(!isPlaying);
  };

  const changePlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const seekTo = (percent: number) => {
    if (audioRef.current && duration) {
      const newTime = percent * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="space-y-6">
      {/* Song Info */}
      <SongInfo {...songMeta} />
      
      {/* Advertencia si no hay metadatos */}
      {(!songMeta.title && !songMeta.artist) && (
        <div className="flex items-center gap-2 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-md animate-pulse shadow">
          <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <span>No se encontraron metadatos en el archivo de audio. Se mostrará información genérica.</span>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div className="w-full flex flex-col justify-between animate-fade-in-up">
          <div className="mb-6 space-y-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg sm:text-xl font-bold text-blue-800 dark:text-blue-200 break-all leading-tight">
                {audioFile ? audioFile.name : 'Sin audio'}
              </h3>
              <div className="flex items-center justify-between mt-2">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Archivo .lrc: {lyrics.length > 0 ? 'Cargado' : 'No cargado'}
                </p>
                {lyrics.length > 0 && (
                  <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Listo
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm mb-3 font-mono text-blue-700 dark:text-blue-300">
                <span className="font-semibold">{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                <span className="font-semibold">{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
              </div>
              <div
                className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden cursor-pointer shadow-inner hover:h-4 transition-all duration-200 progress-bar"
                onClick={e => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  seekTo(percent);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 transition-all duration-200 ease-linear shadow-sm"
                  style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center space-x-8">
              <button
                onClick={togglePlayPause}
                disabled={isLoading || !audioFile}
                className={`w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white transition-all duration-200 shadow-lg transform hover:scale-105 active:scale-95 ${isLoading || !audioFile ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isPlaying ? (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                )}
              </button>
              <div className="flex flex-col items-center space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Velocidad</label>
                <select
                  onChange={e => changePlaybackRate(parseFloat(e.target.value))}
                  defaultValue="1.0"
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1.0">Normal</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lyrics Display */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 sm:p-6 shadow-inner min-h-[220px] sm:min-h-[300px] animate-fade-in-up border border-blue-200 dark:border-gray-700">
        <div className="flex flex-col items-center space-y-3">
          {lyrics.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No hay letras cargadas</p>
              <p className="text-sm mt-1">Sube un archivo .lrc o genera letras automáticamente con Whisper</p>
            </div>
          ) : (
            lyrics
              .slice(
                Math.max(0, currentLineIndex - 3),
                Math.min(lyrics.length, currentLineIndex + 4)
              )
              .map((line, idx) => {
                const realIdx = Math.max(0, currentLineIndex - 3) + idx;
                return (
                  <div
                    key={realIdx}
                    className={`transition-all duration-300 ease-in-out text-center px-4 py-2 rounded-lg ${realIdx === currentLineIndex
                        ? 'text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 shadow-md transform scale-105 animate-pulse-glow lyric-active'
                        : realIdx === currentLineIndex - 1 || realIdx === currentLineIndex + 1
                            ? 'text-lg sm:text-xl text-gray-600 dark:text-gray-300 opacity-80 animate-slide-in'
                            : 'text-base sm:text-lg text-gray-500 dark:text-gray-400 opacity-60'}`}
                  >
                    <p>{line.text}</p>
                    {line.pronunciation && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{line.pronunciation}</p>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="mt-10 p-6 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl text-center bg-white/70 dark:bg-blue-900/40 animate-fade-in-up hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
        <svg className="w-12 h-12 mx-auto text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <h3 className="text-lg font-medium text-blue-700 dark:text-blue-200 mb-2">Sube tu canción y archivo .lrc</h3>
        <p className="text-sm text-blue-500 dark:text-blue-300 mb-6">
          Sube un archivo de audio y genera las letras automáticamente o carga un archivo .lrc
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
          {/* Subir Audio */}
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="hidden"
            id="audio-upload-lrc"
          />
          <label htmlFor="audio-upload-lrc" className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 cursor-pointer text-base shadow hover:shadow-lg transform hover:scale-105 interactive-element animate-bounce-in">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Elegir archivo de audio
          </label>

          {/* Subir LRC */}
          <input
            type="file"
            accept=".lrc"
            onChange={handleLrcUpload}
            className="hidden"
            id="lrc-upload"
          />
          <label htmlFor="lrc-upload" className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 cursor-pointer text-base shadow hover:shadow-lg transform hover:scale-105 interactive-element animate-bounce-in">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Elegir archivo .lrc
          </label>

          {/* Subir SRT y Generar Fonética */}
          <input
            type="file"
            accept=".srt"
            onChange={handleSrtFileUpload}
            className="hidden"
            id="srt-upload"
            ref={srtFileInputRef}
          />
          <button
            onClick={handleGeneratePhonetic}
            disabled={isGeneratingPhonetic}
            className={`inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 cursor-pointer text-base shadow hover:shadow-lg transform hover:scale-105 interactive-element animate-bounce-in ${isGeneratingPhonetic ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Generar Fonética (SRT)
          </button>

          {/* Botón Whisper - Generar Letras desde MP3 */}
          {whisperServerAvailable && (
            <button
              onClick={handleGenerateSrtFromAudio}
              disabled={isTranscribing || !audioFile}
              className={`inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 cursor-pointer text-base shadow hover:shadow-lg transform hover:scale-105 interactive-element animate-bounce-in ${
                isTranscribing || !audioFile ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isTranscribing ? (
                <>
                  <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Transcribiendo... {transcriptionProgress}%
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Generar Letras (Whisper)
                </>
              )}
            </button>
          )}

          {/* Botón de corrección de letras */}
          {originalSrt && (
            <button
              onClick={handleCorrectLyrics}
              disabled={isCorrectingLyrics}
              className={`inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg transition-all duration-200 cursor-pointer text-base shadow hover:shadow-lg transform hover:scale-105 interactive-element animate-bounce-in ${
                isCorrectingLyrics ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isCorrectingLyrics ? (
                <>
                  <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Corrigiendo...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Corregir Letras con IA
                </>
              )}
            </button>
          )}

          {/* Botón de pulir letras */}
          {originalSrt && (
            <button
              onClick={handlePolishLyrics}
              disabled={isPolishingLyrics}
              className={`inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg transition-all duration-200 cursor-pointer text-base shadow hover:shadow-lg transform hover:scale-105 interactive-element animate-bounce-in ${
                isPolishingLyrics ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isPolishingLyrics ? (
                <>
                  <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Pulindo...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                  </svg>
                  Pulir Letras con IA
                </>
              )}
            </button>
          )}
        </div>

        {/* Mensaje si el servidor Whisper no está disponible */}
        {!whisperServerAvailable && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-orange-100 border-l-4 border-orange-500 text-orange-800 rounded-md">
            <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm">
              Servidor Whisper no disponible. Inicia el servidor para usar transcripción automática.
              <a href="#" className="ml-1 underline font-medium" onClick={(e) => {
                e.preventDefault();
                checkWhisperServerHealth().then(setWhisperServerAvailable);
              }}>
                Reintentar
              </a>
            </span>
          </div>
        )}

        {/* Barra de progreso durante transcripción */}
        {isTranscribing && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Transcribiendo audio con Whisper...</span>
              <span>{transcriptionProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                style={{ width: `${transcriptionProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Componente de resultados fonéticos */}
        <AiResultDisplay
          isLoading={isGeneratingPhonetic}
          phoneticText={phoneticTextResult}
          onDownload={handleDownloadPhonetic}
          onReplace={handleReplaceWithPhonetic}
        />
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl ?? undefined} onEnded={() => setIsPlaying(false)} />
    </div>
  );
};

export default LrcKaraoke;