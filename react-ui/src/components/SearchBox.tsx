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
            Search {searchType === 'route' ? 'Routes' : 'Stops'}
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`${searchType === 'route' ? 'routes, origins, or destinations' : '巴士站 stops'}...`}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors duration-300 ${getInputClass()}`}
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor="searchType" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${getTextClass()}`}>
            Search Type
          </label>
          <select
            id="searchType"
            value={searchType}
            onChange={(e) => onSearchTypeChange(e.target.value as 'route' | 'stop')}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors duration-300 ${getInputClass()}`}
          >
            <option value="route">路線 Routes</option>
            <option value="stop">巴士站 Stops</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 