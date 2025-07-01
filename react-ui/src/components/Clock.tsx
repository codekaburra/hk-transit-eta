import React, { useState, useEffect } from 'react';
import { useThemeStyles } from '../hooks/useThemeStyles';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const { getTextClass } = useThemeStyles();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    const displaySeconds = seconds.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes}:${displaySeconds} ${ampm}`;
  };

  const formatWeekday = (date: Date): string => {
    const weekdays = ['(日) Sunday', '(一) Monday', '(二) Tuesday', '(三) Wednesday', '(四) Thursday', '(五) Friday', '(六) Saturday'];
    return weekdays[date.getDay()];
  };

  return (
    <div className={`text-center ${getTextClass()}`}>
      <div className="text-sm font-medium opacity-80">
        {formatWeekday(time)}
      </div>
      <div className="text-lg font-mono font-semibold">
        {formatTime(time)}
      </div>
    </div>
  );
}; 