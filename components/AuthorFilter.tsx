import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';

export type AuthorFilterType = 'community' | 'relationship' | 'career';

export interface CommunityFilter {
  type: 'community';
  value: number; // communityId
  label: string; // e.g., "Community 1 (342 members)"
}

export interface RelationshipFilter {
  type: 'relationship';
  value: 'onlyCites' | 'onlyCited' | 'bothCitesAndCited';
  label: string;
}

export interface CareerFilter {
  type: 'career';
  value: 'early' | 'mid' | 'senior' | 'long';
  label: string;
}

export type AuthorFilter = CommunityFilter | RelationshipFilter | CareerFilter;

interface Props {
  activeFilters: AuthorFilter[];
  onFiltersChange: (filters: AuthorFilter[]) => void;
  availableCommunities: Array<{ id: number; size: number }>;
}

const AuthorFilterComponent: React.FC<Props> = ({ activeFilters, onFiltersChange, availableCommunities }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleFilter = (filter: AuthorFilter) => {
    const newFilters = [...activeFilters];
    const index = newFilters.findIndex(
      f => f.type === filter.type && f.value === filter.value
    );
    
    if (index >= 0) {
      newFilters.splice(index, 1);
    } else {
      newFilters.push(filter);
    }
    
    onFiltersChange(newFilters);
  };

  const isFilterSelected = (type: AuthorFilterType, value: string | number) => {
    return activeFilters.some(f => f.type === type && f.value === value);
  };

  const relationshipOptions: RelationshipFilter[] = [
    { type: 'relationship', value: 'bothCitesAndCited', label: 'Both Cite & Cited' },
    { type: 'relationship', value: 'onlyCites', label: 'Only Cite Others' },
    { type: 'relationship', value: 'onlyCited', label: 'Only Cited' },
  ];

  const careerOptions: CareerFilter[] = [
    { type: 'career', value: 'early', label: 'Early Career (1-3 years)' },
    { type: 'career', value: 'mid', label: 'Mid Career (4-7 years)' },
    { type: 'career', value: 'senior', label: 'Senior (8-12 years)' },
    { type: 'career', value: 'long', label: 'Long Career (13+ years)' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          activeFilters.length > 0
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
        }`}
        title="Filter authors"
      >
        <Filter size={16} />
        <span className="text-sm font-medium">Filter</span>
        {activeFilters.length > 0 && (
          <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilters.length}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-[500px] overflow-y-auto">
          <div className="p-4">
            <div className="font-bold text-slate-800 mb-4 text-sm">Filter Authors</div>
            
            {/* Relationship Type Filters */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Citation Relationship
              </div>
              <div className="space-y-1">
                {relationshipOptions.map(option => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isFilterSelected('relationship', option.value)}
                      onChange={() => toggleFilter(option)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Community Filters */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Community
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {availableCommunities.map(comm => {
                  const option: CommunityFilter = {
                    type: 'community',
                    value: comm.id,
                    label: `Community ${comm.id} (${comm.size} members)`
                  };
                  return (
                    <label
                      key={comm.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isFilterSelected('community', comm.id)}
                        onChange={() => toggleFilter(option)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Career Stage Filters */}
            <div className="mb-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Career Stage
              </div>
              <div className="space-y-1">
                {careerOptions.map(option => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isFilterSelected('career', option.value)}
                      onChange={() => toggleFilter(option)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorFilterComponent;

