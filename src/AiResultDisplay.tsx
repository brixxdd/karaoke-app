import React from 'react';

interface AiResultDisplayProps {
  isLoading: boolean;
  phoneticText: string;
  onDownload: () => void;
  onReplace: () => void;
}

const AiResultDisplay: React.FC<AiResultDisplayProps> = ({
  isLoading,
  phoneticText,
  onDownload,
  onReplace,
}) => {
  return (
    <div className="w-full">
      {isLoading && (
        <div className="h-1 bg-indigo-300 overflow-hidden">
          <div className="h-full bg-indigo-500 w-full animate-pulse"></div>
        </div>
      )}

      {!isLoading && phoneticText && ( // Only show buttons if not loading and phoneticText is available
        <div className="flex flex-col sm:flex-row gap-2 mt-4 justify-center">
          <button
            onClick={onDownload}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Descargar .lrc fonético
          </button>
          <button
            onClick={onReplace}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reemplazar letra actual
          </button>
        </div>
      )}
    </div>
  );
};

export default AiResultDisplay;
