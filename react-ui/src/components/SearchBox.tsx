import React from 'react';
import { SearchBoxProps } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';

export const SearchBox: React.FC<SearchBoxProps> = ({
  searchTerm,
  onSearchChange,
  searchType,
  onSearchTypeChange,
}) => {
  const { getCardClass, getTextClass, getInputClass } = useThemeStyles();

  return (
    <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${getTextClass()}`}>
            Search {searchType === 'bus-route' ? 'Routes' : 'Stops'}
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`${searchType === 'bus-route' ? 'routes, origins, or destinations' : '巴士站 stops'}...`}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors duration-300 ${getInputClass()}`}
          />
        </div>
      </div>
    </div>
  );
}; 