import React, { useState, useRef, useEffect } from 'react';
import LrcKaraoke from './LrcKaraoke';

interface Lyric {
  time: number;
  text: string;
  phonetic: string;
}

interface AudioFile extends File {
  name: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('vocabulary');
  const [darkMode, setDarkMode] = useState(false);

  // Audio state
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Lyrics state
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafId = useRef<number | null>(null);

  // Manejar carga de archivo de audio
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file as AudioFile);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setIsLoading(true);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Reproducir o pausar el audio
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Error playing audio", e));
    }
    setIsPlaying(!isPlaying);
  };

  // Actualizar tiempo del audio con requestAnimationFrame
  const animate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      updateCurrentLine(time);
    }
    rafId.current = requestAnimationFrame(animate);
  };

  // Actualiza la línea activa basada en el tiempo del audio
  const updateCurrentLine = (time: number) => {
    let index = 0;
    while (index < lyrics.length - 1 && time >= lyrics[index + 1].time) {
      index++;
    }
    setCurrentLineIndex(index);
  };

  // Iniciar o detener animación según play/pause
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

  // Cargar duración cuando esté disponible
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
      alert("Hubo un error al cargar el audio.");
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

  // Cambiar velocidad del audio
  const changePlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Saltar a tiempo específico
  const seekTo = (percent: number) => {
    if (audioRef.current && duration) {
      const newTime = percent * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleLyricsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setLyrics(json);
          setCurrentLineIndex(0);
        } catch (err) {
          alert('Archivo de letras inválido');
        }
      };
      reader.readAsText(file);
    }
  };

  function parseLRC(lrcText: string) {
    const lines = lrcText.split('\n');
    const result: { time: number; text: string }[] = [];
    const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,2})?)\]/g;

    for (const line of lines) {
      let match;
      let text = line;
      let lastTime = null;
      const regex = /\[(\d{2}):(\d{2}(?:\.\d{1,2})?)\]/g;
      while ((match = regex.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        const time = min * 60 + sec;
        lastTime = time;
        text = line.replace(regex, '').trim();
      }
      if (
        lastTime !== null &&
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
        result.push({ time: lastTime, text });
      }
    }
    return result;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-opacity-80 shadow-sm border-b border-opacity-20 flex justify-between items-center px-4 py-3 md:px-6 lg:px-8">
        <div className="flex items-center space-x-2">
          <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v6l4 2"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <h1 className="text-xl font-bold">LangFlow</h1>
        </div>

        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 bg-transparent px-2 py-2">
        <button
          onClick={() => setActiveTab('vocabulary')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
            activeTab === 'vocabulary'
              ? 'bg-white dark:bg-gray-900 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 shadow'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          Vocabulary Builder
        </button>
        <button
          onClick={() => setActiveTab('karaoke')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
            activeTab === 'karaoke'
              ? 'bg-white dark:bg-gray-900 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 shadow'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          Karaoke Mode
        </button>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 md:px-6 lg:px-8 max-w-4xl">
        {/* Vocabulary Tab */}
        {activeTab === 'vocabulary' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">English Vocabulary Builder</h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto text-base sm:text-lg">
                Learn English words with their Spanish pronunciation guide and visual examples.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search vocabulary..."
                className="w-full p-3 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-base sm:text-lg"
              />
              <svg
                className="w-5 h-5 absolute left-3 top-3 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Vocabulary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { word: "Good night", phonetic: "gud bait", example: "Have a good night!" },
                { word: "Thank you", phonetic: "thank yoo", example: "Thank you for your help" },
                { word: "How are you?", phonetic: "how ar yoo", example: "How are you doing?" },
                { word: "I love you", phonetic: "ai luv yoo", example: "I love my family" },
                { word: "Excuse me", phonetic: "ex-KYOOZ-mee", example: "Excuse me, where is the bathroom?" },
                { word: "See you later", phonetic: "see yoo LAY-ter", example: "See you later, alligator" }
              ].map((item, index) => (
                <div 
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100 dark:border-gray-700 flex flex-col gap-2 min-h-[120px]"
                >
                  <div className="font-bold text-lg sm:text-xl text-blue-600 dark:text-blue-400">{item.word}</div>
                  <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-1">{item.phonetic}</div>
                  <div className="text-gray-600 dark:text-gray-300 italic text-sm sm:text-base">{item.example}</div>
                </div>
              ))}
            </div>

            {/* Upload Section */}
            <div className="mt-10 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-center bg-white/70 dark:bg-gray-900/40">
              <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="mt-2 text-lg font-medium">Import Custom Vocabulary</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Drag and drop JSON files or click to browse
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-base">
                Select File
              </button>
            </div>
          </div>
        )}

        {/* Karaoke Tab */}
        {activeTab === 'karaoke' && <LrcKaraoke />}
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto max-w-4xl flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6v6l4 2"></path>
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
            <span className="font-bold">LangFlow</span>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            © 2025 Language Learning Platform. All rights reserved.
          </div>
        </div>
      </footer>
      
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl ?? undefined} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
