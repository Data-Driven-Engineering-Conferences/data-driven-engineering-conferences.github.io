import React, { useState, useRef, useEffect } from 'react';
import { DOMAINS } from '../constants';
import { Filter, ChevronDown } from 'lucide-react';

export type FilterType = 'domain' | 'subdomain';

export interface DomainFilter {
  type: 'domain';
  value: string; // domainId
}

export interface SubdomainFilter {
  type: 'subdomain';
  value: string; // subArea name
  domainId: string; // parent domain
}

export type ActiveFilter = DomainFilter | SubdomainFilter;

interface Props {
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
}

const DomainFilterComponent: React.FC<Props> = ({ activeFilters, onFiltersChange }) => {
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

  const toggleFilter = (type: 'domain' | 'subdomain', value: string, domainId?: string) => {
    const newFilters = [...activeFilters];
    
    if (type === 'domain') {
      const index = newFilters.findIndex(f => f.type === 'domain' && f.value === value);
      if (index >= 0) {
        // Remove domain filter and all its subdomain filters
        newFilters.splice(index, 1);
        // Remove all subdomains of this domain
        const domain = domainsList.find(d => d.id === value);
        if (domain) {
          (domain.subAreas ?? []).forEach(subArea => {
            const subIndex = newFilters.findIndex(
              f => f.type === 'subdomain' && f.value === subArea && f.domainId === value
            );
            if (subIndex >= 0) newFilters.splice(subIndex, 1);
          });
        }
      } else {
        newFilters.push({ type: 'domain', value });
      }
    } else {
      // subdomain
      const index = newFilters.findIndex(
        f => f.type === 'subdomain' && f.value === value && f.domainId === domainId
      );
      if (index >= 0) {
        newFilters.splice(index, 1);
      } else {
        newFilters.push({ type: 'subdomain', value, domainId: domainId! });
      }
    }
    
    onFiltersChange(newFilters);
  };


  const isDomainSelected = (domainId: string) => {
    return activeFilters.some(f => f.type === 'domain' && f.value === domainId);
  };

  const isSubdomainSelected = (subArea: string, domainId: string) => {
    return activeFilters.some(
      f => f.type === 'subdomain' && f.value === subArea && f.domainId === domainId
    );
  };

  const getDomainName = (domainId: string) => {
    return DOMAINS.find(d => d.id === domainId)?.name ?? (domainId === 'UNK' ? 'Unclassified' : domainId);
  };

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
        title="Filter by domain and subdomain"
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
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-[500px] overflow-y-auto">
          <div className="p-4">
            <div className="font-bold text-slate-800 mb-4 text-sm">Filter by Domain & Subdomain</div>
            
            {domainsList.map(domain => {
              const domainSelected = isDomainSelected(domain.id);
              const selectedSubdomains = (domain.subAreas ?? []).filter(sub => 
                isSubdomainSelected(sub, domain.id)
              );
              
              return (
                <div key={domain.id} className="mb-4 last:mb-0">
                  {/* Domain Checkbox */}
                  <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={domainSelected}
                      onChange={() => toggleFilter('domain', domain.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full border border-slate-300"
                        style={{ backgroundColor: domain.color }}
                      />
                      <span className="font-medium text-slate-700 text-sm">{domain.name}</span>
                    </div>
                  </label>

                  {/* Subdomains */}
                  {domainSelected && (
                    <div className="ml-6 mt-2 space-y-1">
                      {(domain.subAreas ?? []).map(subArea => (
                        <label
                          key={subArea}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSubdomainSelected(subArea, domain.id)}
                            onChange={() => toggleFilter('subdomain', subArea, domain.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-600">{subArea}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default DomainFilterComponent;

