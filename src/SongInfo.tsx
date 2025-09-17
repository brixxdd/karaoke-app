import React from 'react';

interface SongInfoProps {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  coverUrl?: string;
}

const SongInfo: React.FC<SongInfoProps> = ({ title, artist, album, year, genre, coverUrl }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200">
      <div className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center shadow-md">
        {coverUrl ? (
          <img src={coverUrl} alt="Carátula" className="object-cover w-full h-full" />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-xs">Sin carátula</span>
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2 text-center sm:text-left">
        <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300 truncate">{title || 'Sin título'}</div>
        <div className="text-base sm:text-lg text-gray-700 dark:text-gray-300">{artist || 'Artista desconocido'}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {album && <span>Álbum: {album}</span>}
          {album && year && <span> • </span>}
          {year && <span>{year}</span>}
        </div>
        {genre && <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full inline-block">Género: {genre}</div>}
      </div>
    </div>
  );
};

export default SongInfo; 