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
    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
      <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
        {coverUrl ? (
          <img src={coverUrl} alt="Carátula" className="object-cover w-full h-full" />
        ) : (
          <span className="text-gray-400">Sin carátula</span>
        )}
      </div>
      <div className="flex-1 space-y-1 text-center sm:text-left">
        <div className="text-xl font-bold text-blue-700 dark:text-blue-300 truncate">{title || 'Sin título'}</div>
        <div className="text-base text-gray-700 dark:text-gray-300">{artist || 'Artista desconocido'}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{album && <span>Álbum: {album} </span>}{year && <span>| {year}</span>}</div>
        {genre && <div className="text-xs text-gray-400">Género: {genre}</div>}
      </div>
    </div>
  );
};

export default SongInfo; 