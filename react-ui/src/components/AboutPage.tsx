import React from 'react';
import { useThemeStyles } from '../hooks/useThemeStyles';

export const AboutPage: React.FC = () => {
  const { getCardClass, getTextClass, getSecondaryTextClass } = useThemeStyles();

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
          About HK Bus Tool
        </h2>
        <div className="prose max-w-none">
          <p className={`mb-4 transition-colors duration-300 ${getSecondaryTextClass()}`}>
            HK Bus Tool is a comprehensive application for accessing Hong Kong bus information. 
            It provides real-time data from KMB (Kowloon Motor Bus) and Citybus APIs.
          </p>
          <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${getTextClass()}`}>
            Features:
          </h3>
          <ul className={`list-disc list-inside mb-4 space-y-1 transition-colors duration-300 ${getSecondaryTextClass()}`}>
            <li>Search bus routes by number, origin, or destination</li>
            <li>Find bus stops by name or ID</li>
            <li>Multi-language support (English, Traditional Chinese)</li>
            <li>Real-time data from official Hong Kong bus APIs</li>
            <li>Local SQLite database for fast queries</li>
            <li>Multiple theme support for better user experience</li>
          </ul>
          <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${getTextClass()}`}>
            Data Sources:
          </h3>
          <ul className={`list-disc list-inside mb-4 space-y-1 transition-colors duration-300 ${getSecondaryTextClass()}`}>
            <li>KMB (Kowloon Motor Bus) - Official API</li>
            <li>Citybus - Official API</li>
          </ul>
          <p className={`transition-colors duration-300 ${getSecondaryTextClass()}`}>
            This tool is designed to help commuters and developers access Hong Kong bus information 
            efficiently and reliably.
          </p>
        </div>
      </div>
    </div>
  );
}; 