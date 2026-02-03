import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, Users, Award, Network, BarChart3, Target, X, ExternalLink, GraduationCap, Move, Loader2 } from 'lucide-react';
import AuthorFilterComponent, { AuthorFilter } from '../AuthorFilter';
import { useData } from '../../context/DataContext';

export interface AuthorData {
  id: string;
  name: string;
  // Citation Network Metrics
  /** Number of papers (in citation dataset) that cite this author's work. Citing papers may be IISE or other venues—see pipeline. */
  citationInDegree: number;
  /** Number of papers (in citation dataset) that this author's papers cite. */
  citationOutDegree: number;
  citationPageRank: number;
  // Co-authorship Network Metrics
  coauthorDegree: number; // Number of co-authors
  eigenvectorCentrality: number;
  betweennessCentrality: number;
  clusteringCoefficient: number;
  // Career Metrics
  totalPapers: number;
  careerSpan: number;
  firstYear: number;
  lastYear: number;
  papersPerYear: number;
  // Community
  communityId: number;
  communitySize: number;
  // Relationship Types
  onlyCites: boolean;
  onlyCited: boolean;
  bothCitesAndCited: boolean;
  // Google Scholar Profile
  googleScholarProfileUrl?: string; // Optional Google Scholar profile URL
}

// Mock author data based on analysis results
const MOCK_AUTHORS: AuthorData[] = [
  {
    id: 'auth-1',
    name: 'S A Rahimi',
    citationInDegree: 246,
    citationOutDegree: 0,
    citationPageRank: 0.0125,
    coauthorDegree: 45,
    eigenvectorCentrality: 0.085,
    betweennessCentrality: 0.023,
    clusteringCoefficient: 0.72,
    totalPapers: 12,
    careerSpan: 8,
    firstYear: 2014,
    lastYear: 2021,
    papersPerYear: 1.5,
    communityId: 1,
    communitySize: 342,
    onlyCites: false,
    onlyCited: true,
    bothCitesAndCited: false,
  },
  {
    id: 'auth-2',
    name: 'A Jamshidi',
    citationInDegree: 246,
    citationOutDegree: 0,
    citationPageRank: 0.0123,
    coauthorDegree: 42,
    eigenvectorCentrality: 0.082,
    betweennessCentrality: 0.021,
    clusteringCoefficient: 0.68,
    totalPapers: 11,
    careerSpan: 7,
    firstYear: 2015,
    lastYear: 2021,
    papersPerYear: 1.57,
    communityId: 1,
    communitySize: 342,
    onlyCites: false,
    onlyCited: true,
    bothCitesAndCited: false,
  },
  {
    id: 'auth-3',
    name: 'D Ait-Kadi',
    citationInDegree: 231,
    citationOutDegree: 0,
    citationPageRank: 0.0118,
    coauthorDegree: 38,
    eigenvectorCentrality: 0.075,
    betweennessCentrality: 0.019,
    clusteringCoefficient: 0.65,
    totalPapers: 10,
    careerSpan: 9,
    firstYear: 2012,
    lastYear: 2020,
    papersPerYear: 1.11,
    communityId: 1,
    communitySize: 342,
    onlyCites: false,
    onlyCited: true,
    bothCitesAndCited: false,
  },
  {
    id: 'auth-4',
    name: 'D K Sobek',
    citationInDegree: 226,
    citationOutDegree: 0,
    citationPageRank: 0.0115,
    coauthorDegree: 35,
    eigenvectorCentrality: 0.071,
    betweennessCentrality: 0.018,
    clusteringCoefficient: 0.70,
    totalPapers: 9,
    careerSpan: 6,
    firstYear: 2016,
    lastYear: 2021,
    papersPerYear: 1.5,
    communityId: 2,
    communitySize: 298,
    onlyCites: false,
    onlyCited: true,
    bothCitesAndCited: false,
  },
  {
    id: 'auth-5',
    name: 'C Jimmerson',
    citationInDegree: 215,
    citationOutDegree: 0,
    citationPageRank: 0.0110,
    coauthorDegree: 40,
    eigenvectorCentrality: 0.068,
    betweennessCentrality: 0.020,
    clusteringCoefficient: 0.74,
    totalPapers: 13,
    careerSpan: 10,
    firstYear: 2011,
    lastYear: 2020,
    papersPerYear: 1.3,
    communityId: 2,
    communitySize: 298,
    onlyCites: false,
    onlyCited: true,
    bothCitesAndCited: false,
  },
  {
    id: 'auth-6',
    name: 'S W Yoon',
    citationInDegree: 199,
    citationOutDegree: 0,
    citationPageRank: 0.0102,
    coauthorDegree: 33,
    eigenvectorCentrality: 0.064,
    betweennessCentrality: 0.016,
    clusteringCoefficient: 0.66,
    totalPapers: 8,
    careerSpan: 7,
    firstYear: 2014,
    lastYear: 2020,
    papersPerYear: 1.14,
    communityId: 3,
    communitySize: 267,
    onlyCites: false,
    onlyCited: true,
    bothCitesAndCited: false,
  },
  {
    id: 'auth-7',
    name: 'H Wang',
    citationInDegree: 198,
    citationOutDegree: 15,
    citationPageRank: 0.0101,
    coauthorDegree: 48,
    eigenvectorCentrality: 0.088,
    betweennessCentrality: 0.025,
    clusteringCoefficient: 0.71,
    totalPapers: 15,
    careerSpan: 12,
    firstYear: 2010,
    lastYear: 2021,
    papersPerYear: 1.25,
    communityId: 3,
    communitySize: 267,
    onlyCites: false,
    onlyCited: false,
    bothCitesAndCited: true,
  },
  {
    id: 'auth-8',
    name: 'Z J K Grado',
    citationInDegree: 197,
    citationOutDegree: 0,
    citationPageRank: 0.0100,
    coauthorDegree: 30,
    eigenvectorCentrality: 0.060,
    betweennessCentrality: 0.014,
    clusteringCoefficient: 0.69,
    totalPapers: 7,
    careerSpan: 5,
    firstYear: 2016,
    lastYear: 2020,
    papersPerYear: 1.4,
    communityId: 4,
    communitySize: 234,
    onlyCites: false,
    onlyCited: true,
    bothCitesAndCited: false,
  },
  {
    id: 'auth-9',
    name: 'M Maftouni',
    citationInDegree: 196,
    citationOutDegree: 0,
    citationPageRank: 0.0099,
    coauthorDegree: 28,
    eigenvectorCentrality: 0.058,
    betweennessCentrality: 0.013,
    clusteringCoefficient: 0.67,
    totalPapers: 6,
    careerSpan: 4,
    firstYear: 2017,
    lastYear: 2020,
    papersPerYear: 1.5,
    communityId: 4,
    communitySize: 234,
    onlyCites: false,
    onlyCited: true,
    bothCitesAndCited: false,
  },
  {
    id: 'auth-10',
    name: 'A C C Law',
    citationInDegree: 196,
    citationOutDegree: 0,
    citationPageRank: 0.0098,
    coauthorDegree: 32,
    eigenvectorCentrality: 0.062,
    betweennessCentrality: 0.015,
    clusteringCoefficient: 0.70,
    totalPapers: 9,
    careerSpan: 8,
    firstYear: 2013,
    lastYear: 2020,
    papersPerYear: 1.125,
    communityId: 5,
    communitySize: 201,
    onlyCites: false,
    onlyCited: true,
    bothCitesAndCited: false,
  },
];

type SortField = 'citationInDegree' | 'citationOutDegree' | 'coauthorDegree' | 'eigenvectorCentrality' | 'betweennessCentrality' | 'clusteringCoefficient' | 'totalPapers' | 'careerSpan' | 'name';

interface AuthorWindow {
  id: string;
  author: AuthorData;
  x: number;
  y: number;
  zIndex: number;
}

const Authors: React.FC = () => {
  const { authors: contextAuthors, isDataLoading, setAuthorsLoading } = useData();
  const authorList = (contextAuthors?.length ? contextAuthors : MOCK_AUTHORS) as AuthorData[];

  // Defer heavy rendering to allow loading bar animations to run
  const [isComponentReady, setIsComponentReady] = useState(false);
  const [top200Loading, setTop200Loading] = useState(true);
  const [authorLoadingStep, setAuthorLoadingStep] = useState('Loading author list...');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDesc, setSortDesc] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'citation' | 'collaboration' | 'career'>('citation');
  const [activeFilters, setActiveFilters] = useState<AuthorFilter[]>([]);
  const [onlyWithGoogleScholar, setOnlyWithGoogleScholar] = useState(false);
  const [onlyTop200, setOnlyTop200] = useState(true);
  const [top200Authors, setTop200Authors] = useState<Set<string>>(new Set());
  const [top200Metrics, setTop200Metrics] = useState<Record<string, {
    coauthorDegree: number;
    eigenvectorCentrality: number;
    betweennessCentrality: number;
    clusteringCoefficient: number;
  }>>({});

  // Load top 200 paper authors list and their metrics
  useEffect(() => {
    const MIN_LOADING_TIME = 500; // Minimum time to show loading bar (ms)
    const startTime = Date.now();

    setTop200Loading(true);
    setAuthorsLoading(true);
    setAuthorLoadingStep('Loading top 200 author list... (1 of 2)');

    const loadTop200Data = async () => {
      try {
        const base = (typeof import.meta !== 'undefined' && (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || '';
        const dataBase = (base.replace(/\/$/, '') || '') + '/data';

        // Load author names list
        const res = await fetch(`${dataBase}/top200_authors.json`);
        if (res.ok) {
          const authors: string[] = await res.json();
          setTop200Authors(new Set(authors));
        }

        // Load metrics for top 200 network (coauthorDegree, eigenvector, betweenness, clustering)
        setAuthorLoadingStep('Loading author metrics... (2 of 2)');
        const metricsRes = await fetch(`${dataBase}/top200_author_metrics.json`);
        if (metricsRes.ok) {
          const metrics = await metricsRes.json();
          setTop200Metrics(metrics);
        }
      } catch (e) {
        console.warn('Failed to load top200 data:', e);
      } finally {
        // Ensure loading bar shows for at least MIN_LOADING_TIME
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsed);

        setTimeout(() => {
          setTop200Loading(false);
          setAuthorsLoading(false);
          setAuthorLoadingStep('');
        }, remainingTime);
      }
    };
    loadTop200Data();
    return () => setAuthorsLoading(false); // clear when unmounting (tab switch)
  }, [setAuthorsLoading]);

  // Defer heavy rendering to allow loading animations to run smoothly
  useEffect(() => {
    // Use requestAnimationFrame + setTimeout to ensure loading UI renders first
    const raf = requestAnimationFrame(() => {
      const timer = setTimeout(() => {
        setIsComponentReady(true);
      }, 50);
      return () => clearTimeout(timer);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const [windows, setWindows] = useState<AuthorWindow[]>([]);
  const [nextZIndex, setNextZIndex] = useState(10);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Get available communities from authors
  const availableCommunities = useMemo(() => {
    if (!isComponentReady) return []; // Skip expensive computation until ready
    const communityMap = new Map<number, number>();
    authorList.forEach(author => {
      const current = communityMap.get(author.communityId) || 0;
      communityMap.set(author.communityId, current + 1);
    });
    return Array.from(communityMap.entries()).map(([id, size]) => ({ id, size }));
  }, [authorList, isComponentReady]);

  const filteredAuthors = useMemo(() => {
    if (!isComponentReady) return []; // Skip expensive computation until ready
    let res = authorList.filter(author => {
      // Text search
      const matchesSearch = author.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Google Scholar filter
      if (onlyWithGoogleScholar && !author.googleScholarProfileUrl) return false;

      // Top 200 papers filter - only show authors from top 200 cited papers co-authorship network
      if (onlyTop200 && top200Authors.size > 0 && !top200Authors.has(author.name.toLowerCase())) return false;

      // Apply filters
      if (activeFilters.length === 0) return true;

      return activeFilters.some(filter => {
        if (filter.type === 'relationship') {
          if (filter.value === 'bothCitesAndCited') return author.bothCitesAndCited;
          if (filter.value === 'onlyCites') return author.onlyCites;
          if (filter.value === 'onlyCited') return author.onlyCited;
        }
        if (filter.type === 'community') {
          return author.communityId === filter.value;
        }
        if (filter.type === 'career') {
          if (filter.value === 'early') return author.careerSpan >= 1 && author.careerSpan <= 3;
          if (filter.value === 'mid') return author.careerSpan >= 4 && author.careerSpan <= 7;
          if (filter.value === 'senior') return author.careerSpan >= 8 && author.careerSpan <= 12;
          if (filter.value === 'long') return author.careerSpan >= 13;
        }
        return false;
      });
    });

    // When Top 200 filter is enabled, replace collaboration metrics with values from top 200 network
    // This ensures the displayed values match the paper's Table 2 (top 200 cited papers co-authorship network)
    if (onlyTop200 && Object.keys(top200Metrics).length > 0) {
      res = res.map(author => {
        const metrics = top200Metrics[author.name.toLowerCase()];
        if (metrics) {
          return {
            ...author,
            coauthorDegree: metrics.coauthorDegree,
            eigenvectorCentrality: metrics.eigenvectorCentrality,
            betweennessCentrality: metrics.betweennessCentrality,
            clusteringCoefficient: metrics.clusteringCoefficient,
          };
        }
        return author;
      });
    }

    res.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        return cmp !== 0 ? cmp : (a.name || '').localeCompare(b.name || '');
      }
      const numA = typeof valA === 'number' && !Number.isNaN(valA) ? valA : Number(valA) || 0;
      const numB = typeof valB === 'number' && !Number.isNaN(valB) ? valB : Number(valB) || 0;
      const cmp = sortDesc ? numB - numA : numA - numB;
      return cmp !== 0 ? cmp : (a.name || '').localeCompare(b.name || '');
    });

    return res;
  }, [authorList, searchTerm, sortField, sortDesc, activeFilters, onlyWithGoogleScholar, onlyTop200, top200Authors, top200Metrics, isComponentReady]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const addWindow = (author: AuthorData, initialX: number, initialY: number) => {
    setWindows(prev => {
      if (prev.find(w => w.id === author.id)) {
        return prev.map(w => w.id === author.id ? { ...w, zIndex: nextZIndex + 1 } : w);
      }
      const offsetCount = prev.length;
      return [...prev, {
        id: author.id,
        author,
        x: Math.min(initialX + 20 + (offsetCount * 10), (containerRef.current?.clientWidth || 800) - 300), 
        y: Math.max(initialY - 50 + (offsetCount * 10), 20),
        zIndex: nextZIndex + 1
      }];
    });
    setNextZIndex(z => z + 1);
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const bringToFront = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex + 1 } : w));
    setNextZIndex(z => z + 1);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string, currentX: number, currentY: number) => {
    e.stopPropagation(); 
    setDraggingId(id);
    setDragOffset({ x: e.clientX - currentX, y: e.clientY - currentY });
    bringToFront(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId) {
      e.preventDefault();
      e.stopPropagation();
      setWindows(prev => prev.map(w => {
        if (w.id === draggingId) {
          return { ...w, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
        }
        return w;
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (draggingId) {
        setWindows(prev => prev.map(w => {
          if (w.id === draggingId) {
            return { ...w, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
          }
          return w;
        }));
      }
    };

    const handleMouseUpGlobal = () => {
      setDraggingId(null);
    };

    if (draggingId) {
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUpGlobal);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [draggingId, dragOffset]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    // Skip expensive computation until ready
    if (!isComponentReady) {
      return {
        total: 0,
        withCitations: 0,
        withCollaborations: 0,
        avgCitations: '0',
        avgCoauthors: '0',
        avgPapers: '0',
        avgCareerSpan: '0',
        bothCitesAndCited: 0,
        onlyCites: 0,
        onlyCited: 0,
      };
    }
    const total = authorList.length;
    if (total === 0) {
      return {
        total: 0,
        withCitations: 0,
        withCollaborations: 0,
        avgCitations: '0',
        avgCoauthors: '0',
        avgPapers: '0',
        avgCareerSpan: '0',
        bothCitesAndCited: 0,
        onlyCites: 0,
        onlyCited: 0,
      };
    }
    const withCitations = authorList.filter(a => a.citationInDegree > 0).length;
    const withCollaborations = authorList.filter(a => a.coauthorDegree > 0).length;
    const avgCitations = authorList.reduce((sum, a) => sum + a.citationInDegree, 0) / total;
    const avgCoauthors = authorList.reduce((sum, a) => sum + a.coauthorDegree, 0) / total;
    const avgPapers = authorList.reduce((sum, a) => sum + a.totalPapers, 0) / total;
    const avgCareerSpan = authorList.reduce((sum, a) => sum + a.careerSpan, 0) / total;
    const bothCitesAndCited = authorList.filter(a => a.bothCitesAndCited).length;
    const onlyCites = authorList.filter(a => a.onlyCites).length;
    const onlyCited = authorList.filter(a => a.onlyCited).length;

    return {
      total,
      withCitations,
      withCollaborations,
      avgCitations: avgCitations.toFixed(1),
      avgCoauthors: avgCoauthors.toFixed(1),
      avgPapers: avgPapers.toFixed(1),
      avgCareerSpan: avgCareerSpan.toFixed(1),
      bothCitesAndCited,
      onlyCites,
      onlyCited,
    };
  }, [authorList, isComponentReady]);

  const isLoading = isDataLoading || top200Loading || !isComponentReady;

  // Show minimal loading state while component initializes (allows loading bar to animate)
  if (!isComponentReady) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Preparing Authors view...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 animate-fade-in relative"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Loading progress bar - prominent, visible at top of Authors tab */}
      {isLoading && (
        <div className="sticky top-0 z-40 -mx-4 -mt-2 mb-4 py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
            <span className="font-medium text-slate-700">
              {isDataLoading ? 'Loading authors and data…' : (authorLoadingStep || 'Loading author metrics…')}
            </span>
          </div>
          <div className="relative mt-2 h-2 w-full bg-slate-200 overflow-hidden rounded-full">
            <div
              className="absolute top-0 h-full w-1/3 bg-blue-500"
              style={{ left: '-33%', animation: 'loading-bar 1.2s ease-in-out infinite' }}
            />
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Authors</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.total.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">In unified network</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" title="Citation details (Cited # Papers, Cites # Papers) are available only for the top 200 most-cited papers.">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Cited # Papers</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.avgCitations}</div>
          <div className="text-xs text-slate-500 mt-1">Per author (top-200)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Co-authors</span>
            <Network className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.avgCoauthors}</div>
          <div className="text-xs text-slate-500 mt-1">Collaboration degree</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Papers</span>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.avgPapers}</div>
          <div className="text-xs text-slate-500 mt-1">Per author</div>
        </div>
      </div>

      {/* Relationship Type Stats */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" title="Citation relationship types are computed only for the top 200 most-cited papers.">
        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Citation Relationship Types
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-sm font-medium text-blue-900">Both Cite & Cited</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{stats.bothCitesAndCited}</div>
            <div className="text-xs text-blue-600 mt-1">Authors with bidirectional citation relationships</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <div className="text-sm font-medium text-purple-900">Only Cite Others</div>
            <div className="text-2xl font-bold text-purple-700 mt-1">{stats.onlyCites}</div>
            <div className="text-xs text-purple-600 mt-1">Authors who cite but aren't cited</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-sm font-medium text-green-900">Only Cited</div>
            <div className="text-2xl font-bold text-green-700 mt-1">{stats.onlyCited}</div>
            <div className="text-xs text-green-600 mt-1">Authors who are cited but don't cite</div>
          </div>
        </div>
      </div>

      {/* Citation scope note */}
      <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
        <strong>Citation metrics (top 10% by citations):</strong> &quot;Cited # Papers&quot; = number of papers from the top 10% most-cited list (887 papers) this author co-authored. &quot;Cites # Papers&quot; = number of papers from the citing set they co-authored (papers that cite the top list). Data from citation network pipeline (03 / 09).
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-serif font-bold text-slate-800 text-lg">Author Directory</h3>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search authors..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Author Filter */}
            <AuthorFilterComponent
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
              availableCommunities={availableCommunities}
            />

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setSelectedMetric('citation')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedMetric === 'citation' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Citation
              </button>
              <button
                onClick={() => setSelectedMetric('collaboration')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedMetric === 'collaboration' ? 'bg-white shadow text-purple-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Collaboration
              </button>
              <button
                onClick={() => setSelectedMetric('career')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedMetric === 'career' ? 'bg-white shadow text-green-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Career
              </button>
            </div>

            {/* Top 200 Authors Filter */}
            <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors" title="Show only authors from top 200 cited papers co-authorship network (511 authors)">
              <input
                type="checkbox"
                checked={onlyTop200}
                onChange={(e) => setOnlyTop200(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
              <Award size={14} className="text-amber-600" />
              <span className="text-xs font-medium text-slate-600">Authors of Top-200 Papers</span>
            </label>

            {/* Google Scholar Filter */}
            <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors" title="Show only authors with a Google Scholar profile URL. GS profiles are available only for authors in the citation network of the top 200 most-cited papers.">
              <input
                type="checkbox"
                checked={onlyWithGoogleScholar}
                onChange={(e) => setOnlyWithGoogleScholar(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <GraduationCap size={14} className="text-blue-600" />
              <span className="text-xs font-medium text-slate-600">GS Profiles Only</span>
            </label>
          </div>
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
                backgroundColor: filter.type === 'relationship'
                  ? filter.value === 'bothCitesAndCited' ? '#dbeafe' : filter.value === 'onlyCites' ? '#f3e8ff' : '#dcfce7'
                  : filter.type === 'community' ? '#f1f5f9' : '#fef3c7',
                color: filter.type === 'relationship'
                  ? filter.value === 'bothCitesAndCited' ? '#1e40af' : filter.value === 'onlyCites' ? '#6b21a8' : '#166534'
                  : filter.type === 'community' ? '#475569' : '#92400e',
                borderColor: filter.type === 'relationship'
                  ? filter.value === 'bothCitesAndCited' ? '#93c5fd' : filter.value === 'onlyCites' ? '#c4b5fd' : '#86efac'
                  : filter.type === 'community' ? '#cbd5e1' : '#fde68a'
              }}
            >
              <span>{filter.label}</span>
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

      {/* Author Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium uppercase text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4" title="Position in the current list (1-based). Order depends on the selected sort and filters; this is not a global rank.">ID</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Author <ArrowUpDown size={12}/></div>
                </th>
                {selectedMetric === 'citation' && (
                  <>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('citationInDegree')} title="Number of papers from the top 10% most-cited list (887 papers) this author co-authored.">
                      <div className="flex items-center justify-end gap-1">Cited # Papers <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('citationOutDegree')} title="Number of papers from the citing set this author co-authored (papers that cite the top 10% list).">
                      <div className="flex items-center justify-end gap-1">Cites # Papers <ArrowUpDown size={12}/></div>
                    </th>
                  </>
                )}
                {selectedMetric === 'collaboration' && (
                  <>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('coauthorDegree')}>
                      <div className="flex items-center justify-end gap-1">Co-authors <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('eigenvectorCentrality')}>
                      <div className="flex items-center justify-end gap-1">Eigenvector <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('betweennessCentrality')}>
                      <div className="flex items-center justify-end gap-1">Betweenness <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('clusteringCoefficient')}>
                      <div className="flex items-center justify-end gap-1">Clustering <ArrowUpDown size={12}/></div>
                    </th>
                  </>
                )}
                {selectedMetric === 'career' && (
                  <>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('totalPapers')}>
                      <div className="flex items-center justify-end gap-1">Papers <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('careerSpan')}>
                      <div className="flex items-center justify-end gap-1">IISE Career Span <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-6 py-4 text-right">Years Active</th>
                    <th className="px-6 py-4 text-right">Papers/Year</th>
                  </>
                )}
                <th className="px-6 py-4 text-center">Community</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAuthors.map((author, idx) => (
                <tr key={`author-row-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                    #{(idx + 1).toString().padStart(3, '0')}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        addWindow(author, rect.left, rect.top);
                      }}
                      className="text-left hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <div className="font-serif font-medium text-slate-900">{author.name}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        {author.googleScholarProfileUrl && (
                          <a
                            href={author.googleScholarProfileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
                            title="View Google Scholar Profile"
                          >
                            <GraduationCap size={12} />
                          </a>
                        )}
                        {author.bothCitesAndCited && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                            Both
                          </span>
                        )}
                        {author.onlyCites && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                            Cites
                          </span>
                        )}
                        {author.onlyCited && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                            Cited
                          </span>
                        )}
                      </div>
                    </button>
                  </td>
                  {selectedMetric === 'citation' && (
                    <>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">
                        {author.citationInDegree}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">
                        {author.citationOutDegree}
                      </td>
                    </>
                  )}
                  {selectedMetric === 'collaboration' && (
                    <>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">
                        {author.coauthorDegree}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {author.eigenvectorCentrality.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {author.betweennessCentrality.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {author.clusteringCoefficient.toFixed(2)}
                      </td>
                    </>
                  )}
                  {selectedMetric === 'career' && (
                    <>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">
                        {author.totalPapers}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {author.careerSpan} years
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {author.firstYear} - {author.lastYear}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {author.papersPerYear.toFixed(2)}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-600">C{author.communityId}</span>
                      <span className="text-[10px] text-slate-500">({author.communitySize})</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Author Detail Windows */}
      {windows.map((w) => (
        <div 
          key={w.id}
          className="fixed w-80 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-slate-200 overflow-hidden flex flex-col z-50"
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
              Author Profile
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }} 
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="p-4" onMouseDown={(e) => e.stopPropagation()}>
            <h4 className="font-serif font-bold text-slate-800 text-lg leading-snug mb-3 break-words">
              {w.author.name}
            </h4>

            {/* Google Scholar Profile */}
            {w.author.googleScholarProfileUrl ? (
              <div className="mb-4">
                <a
                  href={w.author.googleScholarProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 transition-colors"
                >
                  <GraduationCap size={16} />
                  <span>Google Scholar Profile</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            ) : (
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500">
                  <GraduationCap size={16} />
                  <span>Google Scholar profile not available</span>
                </div>
              </div>
            )}

            {/* Author Metrics Summary */}
            <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Cited # Papers</div>
                  <div className="font-mono font-bold text-slate-900">{w.author.citationInDegree}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Co-authors</div>
                  <div className="font-mono font-bold text-slate-900">{w.author.coauthorDegree}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Papers</div>
                  <div className="font-mono font-bold text-slate-900">{w.author.totalPapers}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">IISE Career Span</div>
                  <div className="font-mono font-bold text-slate-900">{w.author.careerSpan} years</div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Community</div>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded border border-slate-200">
                  <span className="text-xs font-bold text-slate-600">C{w.author.communityId}</span>
                  <span className="text-xs text-slate-500">({w.author.communitySize} members)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Authors;

