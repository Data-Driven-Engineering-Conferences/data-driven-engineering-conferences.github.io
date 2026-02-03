import React from 'react';
import { START_YEAR, END_YEAR } from '../constants';

interface Props {
  yearRange: [number, number];
  setYearRange: (range: [number, number]) => void;
}

const GlobalFilter: React.FC<Props> = ({ yearRange, setYearRange }) => {
  // Simple dual slider simulation with two inputs
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), yearRange[1] - 1);
    setYearRange([val, yearRange[1]]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), yearRange[0] + 1);
    setYearRange([yearRange[0], val]);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 p-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        <div className="shrink-0 font-serif font-bold text-slate-700">Timeframe</div>
        <div className="grow relative h-10 flex items-center">
          {/* Visual Track */}
          <div className="absolute left-0 right-0 h-1 bg-slate-200 rounded-full"></div>
          <div 
            className="absolute h-1 bg-blue-600 rounded-full"
            style={{
              left: `${((yearRange[0] - START_YEAR) / (END_YEAR - START_YEAR)) * 100}%`,
              right: `${100 - ((yearRange[1] - START_YEAR) / (END_YEAR - START_YEAR)) * 100}%`
            }}
          ></div>

          {/* Range Inputs */}
          <input 
            type="range" 
            min={START_YEAR} 
            max={END_YEAR} 
            value={yearRange[0]} 
            onChange={handleMinChange}
            className="absolute w-full pointer-events-none appearance-none bg-transparent z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:appearance-none cursor-pointer"
          />
          <input 
            type="range" 
            min={START_YEAR} 
            max={END_YEAR} 
            value={yearRange[1]} 
            onChange={handleMaxChange}
            className="absolute w-full pointer-events-none appearance-none bg-transparent z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:appearance-none cursor-pointer"
          />
        </div>
        <div className="shrink-0 font-mono text-sm bg-slate-100 px-3 py-1 rounded border border-slate-200 text-slate-600">
          {yearRange[0]} — {yearRange[1]}
        </div>
      </div>
    </div>
  );
};

export default GlobalFilter;