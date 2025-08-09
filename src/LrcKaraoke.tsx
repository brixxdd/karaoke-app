import React, { useRef, useState, useEffect } from 'react';
import SongInfo from './SongInfo';
import { parseBlob } from 'music-metadata-browser';
// @ts-ignore: No type definitions for 'jsmediatags'
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";

interface LrcLine {
  time: number;
  text: string;
}

export default function LrcKaraoke() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
  const rafId = useRef<number | null>(null);

  // Parseo eficiente de .lrc
  function parseLRC(lrcText: string): LrcLine[] {
    const lines = lrcText.split('\n');
    const result: LrcLine[] = [];
    for (const line of lines) {
      // Extrae todos los tiempos de la línea
      const timeTags = [...line.matchAll(/\[(\d{2}):(\d{2}(?:\.\d{1,2})?)\]/g)];
      const text = line.replace(/\[(\d{2}):(\d{2}(?:\.\d{1,2})?)\]/g, '').trim();
      for (const tag of timeTags) {
        const min = parseInt(tag[1], 10);
        const sec = parseFloat(tag[2]);
        const time = min * 60 + sec;
        if (
          text &&
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
          result.push({ time, text });
        }
      }
    }
    console.log('Líneas parseadas:', result.length);
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
      // Extraer metadatos
      jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          console.log(tag);
          let coverUrl;
          if (tag.tags.picture) {
            const { data, format } = tag.tags.picture;
            // Convierte el array de bytes a Uint8Array
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

  // Sincronización de la letra
  const animate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      updateCurrentLine(time);
    }
    rafId.current = requestAnimationFrame(animate);
  };

  const updateCurrentLine = (time: number) => {
    let index = 0;
    while (index < lyrics.length - 1 && time >= lyrics[index + 1].time) {
      index++;
    }
    setCurrentLineIndex(index);
  };

  useEffect(() => {
    if (isPlaying) {
      rafId.current = requestAnimationFrame(animate);
    } else if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isPlaying]);

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
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full flex flex-col justify-between animate-fade-in-up">
          <div className="mb-4">
            <h3 className="text-xl sm:text-2xl font-bold truncate text-blue-800 dark:text-blue-200 drop-shadow">{audioFile ? audioFile.name : 'Sin audio'}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Archivo .lrc: {lyrics.length > 0 ? 'Cargado' : 'No cargado'}</p>
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-xs sm:text-sm mb-1 font-mono text-blue-700 dark:text-blue-300">
              <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
              <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
            </div>
            <div
              className="w-full h-2 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 dark:from-blue-900 dark:via-blue-700 dark:to-blue-500 rounded-full overflow-hidden cursor-pointer shadow-inner"
              onClick={e => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                seekTo(percent);
              }}
            >
              <div
                className="h-full bg-blue-500 transition-all duration-200 ease-linear"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center space-x-4 mt-4">
            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className={`w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white transition-all duration-200 shadow-lg transform hover:scale-105 active:scale-95 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : isPlaying ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              )}
            </button>
            <select
              onChange={e => changePlaybackRate(parseFloat(e.target.value))}
              defaultValue="1.0"
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm sm:text-base shadow"
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
      {/* Lyrics Display */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-950 rounded-xl p-4 sm:p-6 shadow-inner min-h-[220px] sm:min-h-[300px] animate-fade-in-up">
        <div className="flex flex-col items-center space-y-2">
          {lyrics.length === 0 ? (
            <div className="text-gray-400">No hay letras cargadas</div>
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
                    className={`transition-all duration-200 ease-in-out ${
                      realIdx === currentLineIndex
                        ? 'text-2xl font-bold text-blue-700 dark:text-blue-300 drop-shadow animate-pulse'
                        : realIdx === currentLineIndex - 1 || realIdx === currentLineIndex + 1
                        ? 'text-lg text-gray-400'
                        : 'text-base text-gray-300 opacity-50'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })
          )}
        </div>
      </div>
      {/* Upload Section */}
      <div className="mt-10 p-6 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl text-center bg-white/70 dark:bg-blue-900/40 animate-fade-in-up">
        <svg className="w-12 h-12 mx-auto text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-blue-700 dark:text-blue-200">Sube tu canción y archivo .lrc</h3>
        <p className="mt-1 text-sm text-blue-500 dark:text-blue-300">
          Sube un archivo de audio y un archivo .lrc para ver la letra sincronizada
        </p>
        <input
          type="file"
          accept="audio/*"
          onChange={handleAudioUpload}
          className="hidden"
          id="audio-upload-lrc"
        />
        <label htmlFor="audio-upload-lrc" className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer text-base shadow">
          Elegir archivo de audio
        </label>
        <input
          type="file"
          accept=".lrc"
          onChange={handleLrcUpload}
          className="hidden"
          id="lrc-upload"
        />
        <label htmlFor="lrc-upload" className="mt-4 inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer text-base shadow">
          Elegir archivo .lrc
        </label>
      </div>
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl ?? undefined} onEnded={() => setIsPlaying(false)} />
    </div>
  );
} 