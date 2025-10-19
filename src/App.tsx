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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6v6l4 2"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                LangFlow
              </h1>
            </div>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              {darkMode ? (
                <svg className="w-6 h-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex space-x-2 bg-white/5 backdrop-blur-sm rounded-2xl p-2 border border-white/10">
          <button
            onClick={() => setActiveTab('vocabulary')}
            className={`flex-1 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 ${
              activeTab === 'vocabulary'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Vocabulary Builder
            </div>
          </button>
          <button
            onClick={() => setActiveTab('karaoke')}
            className={`flex-1 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 ${
              activeTab === 'karaoke'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Karaoke Studio
            </div>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,119,198,0.1),transparent_50%)]"></div>
        
        <div className="relative z-10">
          {/* Vocabulary Tab */}
          {activeTab === 'vocabulary' && (
            <div className="container mx-auto px-6 py-12">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-6">
                    Vocabulary Builder
                  </h2>
                  <p className="text-xl text-blue-200 max-w-3xl mx-auto">
                    Aprende palabras en inglés con guías de pronunciación en español y ejemplos visuales
                  </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-12">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar vocabulario..."
                      className="w-full p-4 pl-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                    />
                    <svg
                      className="w-6 h-6 absolute left-4 top-4 text-white/50"
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
                </div>

                {/* Vocabulary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <div className="font-bold text-xl text-white mb-2">{item.word}</div>
                      <div className="text-blue-200 mb-3 font-medium">{item.phonetic}</div>
                      <div className="text-white/70 italic">{item.example}</div>
                    </div>
                  ))}
                </div>

                {/* Upload Section */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Importar Vocabulario Personalizado</h3>
                  <p className="text-blue-200 mb-6">
                    Arrastra y suelta archivos JSON o haz clic para explorar
                  </p>
                  <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white rounded-xl transition-all duration-200 shadow-lg transform hover:scale-105">
                    Seleccionar Archivo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Karaoke Tab */}
          {activeTab === 'karaoke' && <LrcKaraoke />}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6v6l4 2"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">LangFlow</span>
            </div>
            
            <div className="text-white/60 text-center md:text-right">
              <p className="text-sm">© 2025 Plataforma de Aprendizaje de Idiomas.</p>
              <p className="text-xs mt-1">Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl ?? undefined} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
