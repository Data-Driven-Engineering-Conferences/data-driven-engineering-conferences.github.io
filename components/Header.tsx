import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, ChevronDown, Plus, Info } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { useData } from '../context/DataContext';
import type { ViewMode } from '../types';
import AboutModal from './AboutModal';

const ABSTRACT_ID = '16759';

interface Props {
  onOpenUploadData?: () => void;
  /** Model selector is only relevant for Thematic Atlas and Archive (domain/classification data). */
  activeView?: ViewMode;
}

const Header: React.FC<Props> = ({ onOpenUploadData, activeView }) => {
  const showModelSelector = activeView === 'THEMATIC' || activeView === 'ARCHIVE';
  const { availableModels, activeModel, setActiveModel } = useData();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const dataSourceOptions = [
    { value: 'combined', label: 'IISE 2002-2025 | Proquest | Google Scholar' },
  ];

  const [selectedSource, setSelectedSource] = useState(dataSourceOptions[0]);

  const handleAddYourOwn = () => {
    setIsDropdownOpen(false);
    if (onOpenUploadData) {
      onOpenUploadData();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg">
             <BookOpen size={20} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-slate-900 text-lg leading-tight">A Data-Driven Analysis for Engineering Conferences</h1>
            <div className="flex items-center gap-2">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="text-[10px] text-slate-500 uppercase tracking-widest font-medium hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
                >
                  {selectedSource.label}
                  <ChevronDown size={10} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[280px] z-50">
                    {dataSourceOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedSource(option);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-[10px] uppercase tracking-widest font-medium transition-colors ${
                          selectedSource.value === option.value
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <div className="border-t border-slate-200 my-1" />
                    <button
                      onClick={handleAddYourOwn}
                      className="w-full text-left px-4 py-2.5 text-[10px] uppercase tracking-widest font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                      <Plus size={12} />
                      Add Your Own
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showModelSelector && availableModels.length > 0 && activeModel && (
            <ModelSelector
              models={availableModels}
              activeModel={activeModel}
              onModelChange={setActiveModel}
            />
          )}
          <button
            onClick={() => setIsAboutOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="About this project"
          >
            <Info size={16} />
            <span>Abstract ID ({ABSTRACT_ID})</span>
          </button>
        </div>
      </div>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </header>
  );
};

export default Header;