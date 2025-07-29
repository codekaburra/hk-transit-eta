import React from 'react';
import { useThemeStyles } from '../hooks/useThemeStyles';

export interface RouteCodeIconProps {
  routeCode: string;
  type?: 'KMB' | 'CTB' | 'minibus';
  size?: 'sm' | 'md' | 'lg';
}

export const RouteCodeIcon: React.FC<RouteCodeIconProps> = ({ 
  routeCode, 
  type,
  size = 'md'
}) => {
  const { getAccentClass } = useThemeStyles();
  
  // Size configurations
  const sizeClasses = {
    sm: 'w-12 h-10 text-sm',
    md: 'w-14 h-12 text-lg',
    lg: 'w-18 h-16 text-2xl'
  };
  
  // Get background and text style based on type
  const getBackgroundStyle = () => {
    switch (type) {
      case 'KMB':
        return { backgroundColor: '#DC2626' }; // red-600
      case 'CTB':
        return { backgroundColor: '#FFD700' }; // bright yellow/gold
      case 'minibus':
        return { backgroundColor: 'rgba(21, 128, 61, 0.8)' }; // green-700/80
      default:
        return {};
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'KMB':
        return 'text-white';
      case 'CTB':
        return 'text-black';
      case 'minibus':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  const getBorderClass = () => {
    switch (type) {
      case 'KMB':
        return 'border-2 border-red-700 shadow-md';
      case 'CTB':
        return 'border-2 border-yellow-600 shadow-md';
      case 'minibus':
        return 'border-2 border-green-800 shadow-md';
      default:
        return 'border-2 border-gray-300 shadow-sm';
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'KMB':
        return 'font-bold tracking-wide';
      case 'CTB':
        return 'font-bold tracking-wide text-shadow';
      case 'minibus':
        return 'font-bold tracking-wide';
      default:
        return 'font-bold';
    }
  };

  const getBackgroundClass = () => {
    if (type === 'KMB' || type === 'CTB' || type === 'minibus') {
      return ''; // Use inline style instead
    }
    return getAccentClass();
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center transition-colors duration-300 ${getBackgroundClass()} ${getBorderClass()}`}
      style={getBackgroundStyle()}
    >
      <span className={`${getTextStyle()} ${getTextColor()}`}>{routeCode}</span>
    </div>
  );
}; 