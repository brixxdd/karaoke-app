import React, { useState, useEffect } from 'react';

interface FullscreenKaraokeProps {
  isFullscreen: boolean;
  onExitFullscreen: () => void;
  songMeta: {
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
    coverUrl?: string;
  };
  lyrics: Array<{
    time: number;
    text: string;
    pronunciation?: string;
  }>;
  currentLineIndex: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  onSeekTo: (percent: number) => void;
  onPlaybackRateChange: (rate: number) => void;
}

const FullscreenKaraoke: React.FC<FullscreenKaraokeProps> = ({
  isFullscreen,
  onExitFullscreen,
  songMeta,
  lyrics,
  currentLineIndex,
  currentTime,
  duration,
  isPlaying,
  onTogglePlayPause,
  onSeekTo,
  onPlaybackRateChange,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<number | null>(null);

  // Auto-hide controls after 3 seconds and handle fullscreen
  useEffect(() => {
    if (isFullscreen) {
      // Solicitar pantalla completa real
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => {
          console.error("Error entering fullscreen:", e);
        });
      }
      
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    } else {
      // Salir de pantalla completa
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => {
          console.error("Error exiting fullscreen:", e);
        });
      }
    }

    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [isFullscreen, isPlaying]);

  // Detectar cuando se sale de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        onExitFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, onExitFullscreen]);

  // Show controls on mouse move
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  };

  if (!isFullscreen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-50 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.05),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(255,255,255,0.05),transparent_50%)]"></div>
      </div>

      {/* Main Content */}
      <div className="relative h-full flex">
        {/* Left Side - Song Info */}
        <div className="w-1/3 flex flex-col justify-center items-center p-8">
          {/* Album Cover */}
          <div className="mb-8">
            {songMeta.coverUrl ? (
              <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <img 
                  src={songMeta.coverUrl} 
                  alt={`${songMeta.artist} - ${songMeta.title}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-64 h-64 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl">
                <svg className="w-24 h-24 text-white opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              {songMeta.title || 'Título Desconocido'}
            </h1>
            <h2 className="text-2xl font-semibold mb-2 text-blue-200">
              {songMeta.artist || 'Artista Desconocido'}
            </h2>
            {songMeta.album && (
              <p className="text-lg text-blue-300 mb-1">{songMeta.album}</p>
            )}
            {songMeta.year && (
              <p className="text-sm text-blue-400">{songMeta.year}</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full mt-8">
            <div className="flex justify-between text-sm text-blue-200 mb-2">
              <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
              <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
            </div>
            <div 
              className="w-full h-2 bg-blue-800 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                onSeekTo(percent);
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-200"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Right Side - Lyrics */}
        <div className="flex-1 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-4xl">
            {lyrics.length === 0 ? (
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-2xl text-blue-200">No hay letras cargadas</p>
              </div>
            ) : (
              <div className="space-y-6">
                {lyrics
                  .slice(
                    Math.max(0, currentLineIndex - 2),
                    Math.min(lyrics.length, currentLineIndex + 3)
                  )
                  .map((line, idx) => {
                    const realIdx = Math.max(0, currentLineIndex - 2) + idx;
                    const isActive = realIdx === currentLineIndex;
                    
                    return (
                      <div
                        key={realIdx}
                        className={`text-center transition-all duration-500 ease-in-out ${
                          isActive
                            ? 'text-4xl font-bold text-white transform scale-110 drop-shadow-2xl'
                            : realIdx === currentLineIndex - 1 || realIdx === currentLineIndex + 1
                            ? 'text-2xl text-blue-200 opacity-80'
                            : 'text-xl text-blue-300 opacity-60'
                        }`}
                      >
                        <div className={`${isActive ? 'animate-pulse' : ''}`}>
                          {line.text}
                        </div>
                        {line.pronunciation && (
                          <div className={`mt-2 ${
                            isActive 
                              ? 'text-2xl text-blue-200 font-medium' 
                              : 'text-lg text-blue-400'
                          }`}>
                            {line.pronunciation}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="flex items-center space-x-6 bg-black/30 backdrop-blur-md rounded-2xl px-8 py-4">
          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlayPause}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white transition-all duration-200 shadow-lg transform hover:scale-105"
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            )}
          </button>

          {/* Speed Control */}
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm">Velocidad:</span>
            <select
              onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
              defaultValue="1.0"
              className="bg-black/50 text-white border border-blue-400 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1.0">Normal</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>

          {/* Exit Fullscreen */}
          <button
            onClick={onExitFullscreen}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100 rounded-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Exit hint */}
      <div className={`absolute top-8 right-8 transition-all duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="bg-black/30 backdrop-blur-md rounded-lg px-4 py-2 text-white text-sm">
          <span className="text-blue-200">ESC</span> para salir
        </div>
      </div>
    </div>
  );
};

export default FullscreenKaraoke;
