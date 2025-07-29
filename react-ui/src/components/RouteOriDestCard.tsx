import React from 'react';
import { useThemeStyles } from '../hooks/useThemeStyles';

export interface RouteOriDestCardProps {
  route: {
    orig_tc?: string;
    dest_tc?: string;
    orig_en?: string;
    dest_en?: string;
    description_en?: string;
  };
}

export const RouteOriDestCard: React.FC<RouteOriDestCardProps> = ({ route }) => {
  const { getGrayTextClass } = useThemeStyles();

  return (
    <div className="flex flex-col items-center px-2 py-1 rounded-lg max-w-[25%] min-w-0">
      <div className={`text-lg font-medium text-center ${getGrayTextClass()}`}>
        {route.orig_tc} → {route.dest_tc}
      </div>
      <div className={`text-sm text-center ${getGrayTextClass()}`}>
        {route.orig_en && route.dest_en ? `${route.orig_en} → ${route.dest_en}` : (route.description_en || '')}
      </div>
    </div>
  );
}; 