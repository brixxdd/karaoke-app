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
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Album Cover */}
        <div className="flex-shrink-0">
          <div className="w-48 h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/20 shadow-2xl">
            {coverUrl ? (
              <img 
                src={coverUrl} 
                alt={`${artist} - ${title}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-white/50 text-sm">Sin carátula</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Song Details */}
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-4 leading-tight">
            {title || 'Sin título'}
          </h1>
          <h2 className="text-2xl lg:text-3xl font-bold text-blue-200 mb-6">
            {artist || 'Artista desconocido'}
          </h2>
          
          <div className="space-y-3">
            {album && (
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-lg text-blue-200 font-medium">{album}</span>
              </div>
            )}
            
            {year && (
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-lg text-blue-200 font-medium">{year}</span>
              </div>
            )}
            
            {genre && (
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="inline-block px-4 py-2 bg-blue-500/20 text-blue-200 rounded-full text-sm font-medium border border-blue-400/30">
                  {genre}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongInfo; 