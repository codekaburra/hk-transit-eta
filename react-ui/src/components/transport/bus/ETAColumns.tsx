import React from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { formatETAParts } from '../../../services/utils';

// The operators publish three departures per stop.
const ETA_COLUMNS = 3;

export interface ETAColumnsProps {
  etaData: string[];
  // True while the first fetch is in flight. A refetch keeps the previous
  // readings, so it does not need to be told apart.
  loading?: boolean;
}

// One column per departure, soonest first. Stacked in a single column the three
// readings run together and it takes a moment to tell them apart.
//
// The columns carry no heading: left to right already says which departure is
// which, and a label per column crowds a narrow slot.
//
// Three fixed columns and a stop name do not fit a phone — at 375px the name is
// left about 50px — so below sm the columns take the full width of their own
// row and the wait drops to its short form.
export const ETAColumns: React.FC<ETAColumnsProps> = ({ etaData, loading = false }) => {
  const { getGrayTextClass, getSecondaryTextClass } = useThemeStyles();
  const waiting = loading && etaData.length === 0;

  return (
    <div className="grid grid-cols-3 gap-2 w-full sm:w-auto shrink-0">
      {Array.from({ length: ETA_COLUMNS }, (_, index) => {
        // A dash means the operator published nothing for that slot. Showing it
        // before the first response says "no bus" about a stop nobody has asked
        // about yet, which is what a route out of service looks like.
        if (waiting) {
          return (
            <div key={`eta-${index}`} className={`w-full sm:w-20 text-center text-xs ${getSecondaryTextClass()}`}>
              ⋯
            </div>
          );
        }
        const parts = etaData[index] ? formatETAParts(etaData[index]) : null;
        return (
          <div key={`eta-${index}`} className="w-full sm:w-20 text-center">
            {parts ? (
              <>
                <div className={`text-xs font-medium leading-tight transition-colors duration-300 ${getGrayTextClass()}`}>
                  <span className="sm:hidden">{parts.shortWait}</span>
                  <span className="hidden sm:inline">{parts.wait}</span>
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
