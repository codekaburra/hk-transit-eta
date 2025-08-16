import React from 'react';
import { SearchBoxProps } from '../../types';
import { useThemeStyles } from '../../hooks/useThemeStyles';

export const SearchBox: React.FC<SearchBoxProps> = ({
  searchTerm,
  onSearchChange,
  searchType,
  onSearchTypeChange,
}) => {
  const { getCardClass, getTextClass, getInputClass } = useThemeStyles();

  const getSearchLabel = () => {
    switch (searchType) {
      case 'bus-route': return 'Search Bus Routes';
      case 'bus-stop': return 'Search Bus Stops';
      case 'minibus-route': return 'Search Minibus Routes';
      case 'minibus-stop': return 'Search Minibus Stops';
      default: return 'Search';
    }
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'bus-route': return 'bus routes, origins, or destinations...';
      case 'bus-stop': return '巴士站 bus stops...';
      case 'minibus-route': return 'minibus routes, route codes...';
      case 'minibus-stop': return '小巴站 minibus stops...';
      default: return 'search...';
    }
  };

  return (
    <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${getTextClass()}`}>
            {getSearchLabel()}
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={getPlaceholder()}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors duration-300 ${getInputClass()}`}
          />
        </div>
      </div>
    </div>
  );
}; 