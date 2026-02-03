import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Paper, Domain } from '../../types';
import { DOMAINS } from '../../constants';
import { Search, ArrowUpDown, AlertCircle, X, Info, ExternalLink, GraduationCap, Move, FileText } from 'lucide-react';
import DomainFilter, { ActiveFilter } from '../DomainFilter';

interface Props {
  data: Paper[];
  domains?: Domain[];
}

type SortField = 'year' | 'citations';

interface PaperWindow {
  id: string;
  paper: Paper;
  x: number;
  y: number;
  zIndex: number;
}

const Archive: React.FC<Props> = ({ data, domains: domainsProp }) => {
  const domainsList = domainsProp ?? DOMAINS;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('citations');
  const [sortDesc, setSortDesc] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Paper detail windows
  const [windows, setWindows] = useState<PaperWindow[]>([]);
  const [nextZIndex, setNextZIndex] = useState(10);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    // Use paper.domainId and paper.subArea directly - JSON already has correct values
    let res = data.filter(p => {
      // Text search
      const matchesSearch =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.authors.some(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      const domId = p.domainId;
      const subArea = p.subArea ?? '';

      // Domain/Subdomain filters
      if (activeFilters.length === 0) return true;

      return activeFilters.some(filter => {
        if (filter.type === 'domain') {
          return domId === filter.value;
        } else {
          return domId === filter.domainId && subArea === filter.value;
        }
      });
    });

    res.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortDesc ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
    });

    return res;
  }, [data, searchTerm, sortField, sortDesc, activeFilters]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const getDomainColor = (id: string) => domainsList.find(d => d.id === id)?.color || '#000';
  const getDomainName = (id: string) => domainsList.find(d => d.id === id)?.name ?? (id === 'UNK' ? 'Unclassified' : id);

  // Window management functions
  const addWindow = (paper: Paper, initialX: number, initialY: number) => {
    setWindows(prev => {
      if (prev.find(w => w.id === paper.id)) {
        return prev.map(w => w.id === paper.id ? { ...w, zIndex: nextZIndex + 1 } : w);
      }
      const offsetCount = prev.length;
      return [...prev, {
        id: paper.id,
        paper,
        x: Math.min(initialX + 20 + (offsetCount * 10), (containerRef.current?.clientWidth || 800) - 380),
        y: Math.max(50, Math.min(initialY - 100 + (offsetCount * 10), window.innerHeight - 400)),
        zIndex: nextZIndex + 1
      }];
    });
    setNextZIndex(prev => prev + 1);
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const bringToFront = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex + 1 } : w));
    setNextZIndex(prev => prev + 1);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string, x: number, y: number) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
    setDraggingId(id);
    setDragOffset({ x: e.clientX - x, y: e.clientY - y });
    bringToFront(id);
  };

  useEffect(() => {
    if (!draggingId) return;
    const handleMouseMove = (e: MouseEvent) => {
      setWindows(prev => prev.map(w => {
        if (w.id !== draggingId) return w;
        return { ...w, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
      }));
    };
    const handleMouseUp = () => setDraggingId(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragOffset]);

  return (
    <div ref={containerRef} className="space-y-4 animate-fade-in relative">
      {/* Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-serif font-bold text-slate-800 text-lg">Data Archive</h3>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search titles, authors..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DomainFilter
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
              domains={domainsList}
            />
          </div>
        </div>

        {/* Filter Tags */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {activeFilters.map((filter, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border"
                style={{
                  backgroundColor: filter.type === 'domain'
                    ? `${domainsList.find(d => d.id === filter.value)?.color || '#64748b'}15`
                    : `${domainsList.find(d => d.id === (filter as any).domainId)?.color || '#64748b'}15`,
                  color: filter.type === 'domain'
                    ? domainsList.find(d => d.id === filter.value)?.color || '#64748b'
                    : domainsList.find(d => d.id === (filter as any).domainId)?.color || '#64748b',
                  borderColor: filter.type === 'domain'
                    ? `${domainsList.find(d => d.id === filter.value)?.color || '#64748b'}30`
                    : `${domainsList.find(d => d.id === (filter as any).domainId)?.color || '#64748b'}30`
                }}
              >
                <span>
                  {filter.type === 'domain'
                    ? getDomainName(filter.value)
                    : filter.value}
                </span>
                <button
                  onClick={() => {
                    const newFilters = activeFilters.filter((_, i) => i !== index);
                    setActiveFilters(newFilters);
                  }}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                  aria-label="Remove filter"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Note: citations scope and cutoff */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm">
          <Info className="w-4 h-4 flex-shrink-0 text-slate-500" />
          <span>Citation values are available only for the top 200 most-cited papers; other rows may show 0. Citation data cutoff date: <strong>November 8, 2025</strong>.</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium uppercase text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 w-16">#</th>
                <th className="px-4 py-4">Title / Author</th>
                <th className="px-4 py-4 w-20 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('year')}>
                  <div className="flex items-center gap-1">Year <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-4 py-4 w-56">Domain</th>
                <th className="px-4 py-4 w-24 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('citations')}>
                   <div className="flex items-center justify-end gap-1">Citations <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-4 py-4 w-20 text-center" title="LLM Confidence">LLM Conf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((paper, idx) => (
                <tr
                  key={paper.id}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    addWindow(paper, rect.left, rect.top);
                  }}
                >
                  <td className="px-4 py-4 text-slate-400 font-mono text-xs">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-serif font-medium text-slate-900 line-clamp-1 group-hover:text-blue-700 transition-colors">{paper.title}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span>
                        {paper.authors && paper.authors.length > 0
                          ? `${paper.authors[0].name}${paper.authors.length > 1 ? ' et al.' : ''}`
                          : 'Unknown author'}
                      </span>
                      {paper.proquestUrl && (
                        <a
                          href={paper.proquestUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="View on ProQuest"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <a
                        href={`https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:text-amber-800 transition-colors"
                        title="Search on Google Scholar"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GraduationCap size={12} />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600 font-mono">
                    {paper.year}
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      // Use paper.domainId directly - JSON already has correct domain from regeneration script
                      const domainId = paper.domainId;
                      const domainName = getDomainName(domainId);
                      const color = getDomainColor(domainId);
                      return (
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: `${color}15`,
                            color,
                            borderColor: `${color}30`
                          }}
                          title={paper.subArea ? `Sub-area: ${paper.subArea}` : undefined}
                        >
                          {domainName}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4 text-right font-mono">
                    {(paper.citations ?? 0) > 0 ? (
                      <span className="text-slate-700 cursor-help" title="Citation data cutoff: November 8, 2025">{paper.citations}</span>
                    ) : (
                      <span className="text-amber-500 cursor-help" title="Citation data is not available.">0</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {(() => {
                      // Use paper.llmConfidence directly - JSON already has confidence from regeneration script
                      const conf = paper.llmConfidence || 'Medium';
                      return (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded border border-slate-200" title={`LLM Confidence: ${conf}`}>
                          <div className={`w-2 h-2 rounded-full ${conf === 'High' ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                          <span className="text-[10px] uppercase font-bold text-slate-500">{conf.substring(0,1)}</span>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 && (
                 <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                     <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                     No papers found matching your criteria.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paper Detail Windows */}
      {windows.map((w) => (
        <div
          key={w.id}
          className="fixed w-96 max-h-[80vh] bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-slate-200 overflow-hidden flex flex-col z-50"
          style={{
            left: w.x,
            top: w.y,
            zIndex: w.zIndex,
            cursor: 'default'
          }}
          onMouseDown={(e) => handleMouseDown(e, w.id, w.x, w.y)}
        >
          <div className="h-2 w-full shrink-0 bg-blue-500"></div>
          <div className="p-4 pt-3 cursor-move bg-slate-50 border-b border-slate-100 select-none flex justify-between items-center group">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Move size={10} className="text-slate-300 group-hover:text-blue-400" />
              Paper Details
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
            {/* Title */}
            <h4 className="font-serif font-bold text-slate-800 text-lg leading-snug mb-3">
              {w.paper.title}
            </h4>

            {/* Authors */}
            <div className="mb-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Authors</div>
              <div className="text-sm text-slate-700">
                {w.paper.authors && w.paper.authors.length > 0
                  ? w.paper.authors.map(a => a.name).join('; ')
                  : 'Unknown author'}
              </div>
            </div>

            {/* Year & Domain */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Year</div>
                <div className="font-mono font-bold text-slate-900">{w.paper.year}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Domain</div>
                <span
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: `${getDomainColor(w.paper.domainId)}15`,
                    color: getDomainColor(w.paper.domainId),
                    borderColor: `${getDomainColor(w.paper.domainId)}30`
                  }}
                >
                  {getDomainName(w.paper.domainId)}
                </span>
              </div>
            </div>

            {/* Sub-area */}
            {w.paper.subArea && (
              <div className="mb-4">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Sub-area</div>
                <div className="text-sm text-slate-700">{w.paper.subArea}</div>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4 border-t border-slate-100 pt-3">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Citations</div>
                <div className="font-mono font-bold text-slate-900">{w.paper.citations ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">LLM Conf.</div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${w.paper.llmConfidence === 'High' ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                  <span className="font-bold text-slate-900">{w.paper.llmConfidence || 'Medium'}</span>
                </div>
              </div>
            </div>

            {/* Abstract */}
            {w.paper.abstract && (
              <div className="mb-4 border-t border-slate-100 pt-3">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Abstract</div>
                <div className="text-sm text-slate-600 leading-relaxed max-h-40 overflow-y-auto">
                  {w.paper.abstract}
                </div>
              </div>
            )}

            {/* External Links */}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {w.paper.proquestUrl && (
                <a
                  href={w.paper.proquestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 transition-colors"
                >
                  <FileText size={14} />
                  <span>ProQuest</span>
                  <ExternalLink size={12} />
                </a>
              )}
              <a
                href={`https://scholar.google.com/scholar?q=${encodeURIComponent(w.paper.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-sm font-medium text-amber-700 transition-colors"
              >
                <GraduationCap size={14} />
                <span>Google Scholar</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Archive;
