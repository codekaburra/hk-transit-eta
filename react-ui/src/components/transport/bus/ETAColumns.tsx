import React from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { formatETAParts } from '../../../services/utils';

// The operators publish three departures per stop.
const ETA_COLUMNS = 3;

export interface ETAColumnsProps {
  etaData: string[];
}

// One column per departure, soonest first. Stacked in a single column the three
// readings run together and it takes a moment to tell them apart.
//
// The columns carry no heading: left to right already says which departure is
// which, and a label per column crowds a narrow slot.
export const ETAColumns: React.FC<ETAColumnsProps> = ({ etaData }) => {
  const { getGrayTextClass, getSecondaryTextClass } = useThemeStyles();

  return (
    <div className="grid grid-cols-3 gap-2 shrink-0">
      {Array.from({ length: ETA_COLUMNS }, (_, index) => {
        const parts = etaData[index] ? formatETAParts(etaData[index]) : null;
        return (
          <div key={`eta-${index}`} className="w-20 text-center">
            {parts ? (
              <>
                <div className={`text-xs font-medium leading-tight transition-colors duration-300 ${getGrayTextClass()}`}>
                  {parts.wait}
                </div>
                <div className={`text-[10px] leading-tight transition-colors duration-300 ${getSecondaryTextClass()}`}>
                  {parts.time}
                </div>
              </>
            ) : (
              // An empty column rather than a missing one, so the columns stay
              // aligned down the list.
              <div className={`text-xs ${getSecondaryTextClass()}`}>—</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
