import React from 'react';

interface BusCompanyIconProps {
  company: string;
  className?: string;
}

const ICON_STYLE = {
  height: 28,
  width: 40,
  display: 'inline-block',
  objectFit: 'contain' as const,
};

export const BusCompanyIcon: React.FC<BusCompanyIconProps> = ({ company, className }) => {
  if (company === 'KMB') {
    return (
      <img
        src={process.env.PUBLIC_URL + '/KMB_300x200.png'}
        alt="KMB"
        title="KMB"
        style={ICON_STYLE}
        className={className}
      />
    );
  }
  if (company === 'CTB') {
    return (
      <img
        src={process.env.PUBLIC_URL + '/citybus_bg.svg'}
        alt="Citybus"
        title="Citybus"
        style={ICON_STYLE}
        className={className}
      />
    );
  }
  return null;
}; 