import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type {
  YearlyStats,
  Paper,
  Domain,
  NetworkData,
  AuthorData,
  LoadedAppData,
  PublicationTrendsBySourceRow,
} from '../types';
import {
  START_YEAR,
  END_YEAR,
  MOCK_STATS,
  MOCK_PAPERS,
  DOMAINS,
  MOCK_SOCIAL,
  MOCK_CITATION_MIXED,
  MOCK_CITATION_PAPER,
  MOCK_CITATION_AUTHOR,
} from '../constants';
import { parseGexf } from '../utils/parseGexf';
import { parseClassifiedCsvToMap, type ClassifiedRow } from '../utils/parseClassifiedCsv';
import defaultPublicationTrendsData from '../data/publication_trends_by_source.json';

// Base URL for data (handles subpath deployment, e.g. /app/)
const getDataBase = () => {
  const base = (typeof import.meta !== 'undefined' && (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || '';
  return (base.replace(/\/$/, '') || '') + '/data';
};
const DATA_BASE = getDataBase();

export interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  path: string;
  totalRows: number;
  classified: number;
  coveragePct: number;
  /** Per-year classified paper counts for accurate year-range filtering */
  classifiedByYear?: Record<string, number>;
}

/** Which networks were loaded from GEXF (true) vs JSON fallback (false). */
export type NetworkSource = {
  social: boolean;
  citationMixed: boolean;
  citationPaper: boolean;
  citationAuthor: boolean;
};

type DataContextValue = {
  yearlyStats: YearlyStats[];
  publicationTrendsBySource: PublicationTrendsBySourceRow[];
  papers: Paper[];
  authors: AuthorData[];
  domains: Domain[];
  networkSocial: NetworkData;
  networkCitationMixed: NetworkData;
  networkCitationPaper: NetworkData;
  networkCitationAuthor: NetworkData;
  /** GEXF vs JSON per network (Community tab). */
  networkSource: NetworkSource;
  isLoadedFromData: boolean;
  /** True while initial data (authors, networks, etc.) is being fetched. */
  isDataLoading: boolean;
  /** True while Authors tab is loading its data (top200 metrics, etc.). */
  authorsLoading: boolean;
  setAuthorsLoading: (v: boolean) => void;
  /** Current loading step message (e.g., "Loading authors... (3 of 8)") */
  loadingMessage: string;
  dataSourceLabel: string | null;
  availableModels: ModelInfo[];
  activeModel: string | null;
  /** Map key = normalized title|year -> primary_domain, primary_sub_area, confidence from model's complete_classified_papers CSV */
  classifiedCsvMap: Record<string, ClassifiedRow>;
  setActiveModel: (modelId: string) => void;
  setLoadedData: (data: LoadedAppData) => void;
  loadFromPublic: () => Promise<void>;
};

const defaultNetworks = {
  networkSocial: MOCK_SOCIAL,
  networkCitationMixed: MOCK_CITATION_MIXED,
  networkCitationPaper: MOCK_CITATION_PAPER,
  networkCitationAuthor: MOCK_CITATION_AUTHOR,
};

const defaultAuthors: AuthorData[] = [];

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [yearlyStats, setYearlyStats] = useState<YearlyStats[]>(MOCK_STATS);
  const [publicationTrendsBySource, setPublicationTrendsBySource] = useState<PublicationTrendsBySourceRow[]>(defaultPublicationTrendsData as PublicationTrendsBySourceRow[]);
  const [papers, setPapers] = useState<Paper[]>(MOCK_PAPERS);
  const [authors, setAuthors] = useState<AuthorData[]>(defaultAuthors);
  const [domains, setDomains] = useState<Domain[]>(DOMAINS);
  const [networkSocial, setNetworkSocial] = useState<NetworkData>(MOCK_SOCIAL);
  const [networkCitationMixed, setNetworkCitationMixed] = useState<NetworkData>(MOCK_CITATION_MIXED);
  const [networkCitationPaper, setNetworkCitationPaper] = useState<NetworkData>(MOCK_CITATION_PAPER);
  const [networkCitationAuthor, setNetworkCitationAuthor] = useState<NetworkData>(MOCK_CITATION_AUTHOR);
  const [networkSource, setNetworkSource] = useState<NetworkSource>({
    social: false,
    citationMixed: false,
    citationPaper: false,
    citationAuthor: false,
  });
  const [dataSourceLabel, setDataSourceLabel] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [authorsLoading, setAuthorsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing...');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [activeModel, setActiveModelState] = useState<string | null>(null);
  const [classifiedCsvMap, setClassifiedCsvMap] = useState<Record<string, ClassifiedRow>>({});

  const isLoadedFromData = dataSourceLabel !== null;

  const loadClassifiedCsv = useCallback(async (csvPath: string) => {
    if (!csvPath) {
      setClassifiedCsvMap({});
      return;
    }
    try {
      const res = await fetch(`${DATA_BASE}/${csvPath}`);
      if (!res.ok) {
        setClassifiedCsvMap({});
        return;
      }
      const text = await res.text();
      const map = parseClassifiedCsvToMap(text);
      setClassifiedCsvMap(map);
    } catch (e) {
      console.warn('Failed to load classified CSV:', csvPath, e);
      setClassifiedCsvMap({});
    }
  }, []);

  const setLoadedData = useCallback((data: LoadedAppData) => {
    if (data.yearly_stats && Array.isArray(data.yearly_stats)) setYearlyStats(data.yearly_stats);
    if (data.publication_trends_by_source && Array.isArray(data.publication_trends_by_source)) setPublicationTrendsBySource(data.publication_trends_by_source);
    if (data.papers && Array.isArray(data.papers)) setPapers(data.papers);
    if (data.authors && Array.isArray(data.authors)) setAuthors(data.authors);
    if (data.domains && Array.isArray(data.domains)) setDomains(data.domains);
    if (data.coauthorship_network_unified?.nodes) {
      setNetworkSocial(data.coauthorship_network_unified);
      setNetworkSource(prev => ({ ...prev, social: false }));
    }
    if (data.citation_network_mixed?.nodes) {
      setNetworkCitationMixed(data.citation_network_mixed);
      setNetworkSource(prev => ({ ...prev, citationMixed: false }));
    }
    if (data.citation_network_paper?.nodes) {
      setNetworkCitationPaper(data.citation_network_paper);
      setNetworkSource(prev => ({ ...prev, citationPaper: false }));
    }
    if (data.citation_network_author?.nodes) {
      setNetworkCitationAuthor(data.citation_network_author);
      setNetworkSource(prev => ({ ...prev, citationAuthor: false }));
    }
    setDataSourceLabel('Uploaded / external');
  }, []);

  const loadModelData = useCallback(async (modelId: string) => {
    try {
      // Load model-specific papers and yearly stats
      const papersRes = await fetch(`${DATA_BASE}/papers_${modelId}.json`);
      const statsRes = await fetch(`${DATA_BASE}/yearly_stats_${modelId}.json`);

      if (papersRes.ok && statsRes.ok) {
        const papersData = await papersRes.json();
        const statsData = await statsRes.json();
        setPapers(papersData);
        setYearlyStats(statsData);
        return true;
      }
    } catch (e) {
      console.error('Failed to load model data:', e);
    }
    return false;
  }, []);

  const setActiveModel = useCallback(async (modelId: string) => {
    const success = await loadModelData(modelId);
    if (success) {
      setActiveModelState(modelId);
      setDataSourceLabel(`Model: ${availableModels.find(m => m.id === modelId)?.displayName || modelId}`);
      const model = availableModels.find(m => m.id === modelId);
      if (model?.path) await loadClassifiedCsv(model.path);
      else setClassifiedCsvMap({});
    }
  }, [loadModelData, availableModels, loadClassifiedCsv]);

  const loadFromPublic = useCallback(async () => {
    setIsDataLoading(true);
    setLoadingMessage('Loading models... (1 of 8)');
    let anyLoaded = false;
    try {
      // Load available models
      const modelsRes = await fetch(`${DATA_BASE}/available_models.json`);
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        setAvailableModels(modelsData);

        // Set mixtral as default model (or first model if mixtral not found)
        if (modelsData.length > 0) {
          const mixtralModel = modelsData.find((m: ModelInfo) => m.id.includes('mixtral'));
          const defaultModel = mixtralModel || modelsData[0];
          setActiveModelState(defaultModel.id);
          await loadModelData(defaultModel.id);
          if (defaultModel.path) await loadClassifiedCsv(defaultModel.path);
          anyLoaded = true;
        }
      }

      // Load publication trends by source (Overview bar chart). Cache-bust so 2020 merged=438 is always loaded.
      setLoadingMessage('Loading publication trends... (2 of 8)');
      const trendsRes = await fetch(`${DATA_BASE}/publication_trends_by_source.json?t=438`);
      if (trendsRes.ok) {
        setPublicationTrendsBySource(await trendsRes.json());
        anyLoaded = true;
      }

      // Load static data (authors, domains, networks)
      setLoadingMessage('Loading authors... (3 of 8)');
      const authorsRes = await fetch(`${DATA_BASE}/authors.json`);
      if (authorsRes.ok) {
        setAuthors(await authorsRes.json());
        anyLoaded = true;
      }

      setLoadingMessage('Loading domains... (4 of 8)');
      const domainsRes = await fetch(`${DATA_BASE}/domains.json`);
      if (domainsRes.ok) {
        setDomains(await domainsRes.json());
        anyLoaded = true;
      }

      // Co-authorship: try GEXF first (layout + colors from Gephi), then JSON
      setLoadingMessage('Loading co-authorship network... (5 of 8)');
      let coauthorLoaded = false;
      const coauthorGexfRes = await fetch(`${DATA_BASE}/coauthorship_network_top200.gexf`);
      if (coauthorGexfRes.ok) {
        try {
          const xml = await coauthorGexfRes.text();
          setNetworkSocial(parseGexf(xml, { coauthorship: true }));
          setNetworkSource(prev => ({ ...prev, social: true }));
          coauthorLoaded = true;
          anyLoaded = true;
        } catch (_) { /* fallback to JSON */ }
      }
      if (!coauthorLoaded) {
        const coauthorRes = await fetch(`${DATA_BASE}/coauthorship_network_unified.json`);
        if (coauthorRes.ok) {
          setNetworkSocial(await coauthorRes.json());
          setNetworkSource(prev => ({ ...prev, social: false }));
          anyLoaded = true;
        }
      }

      // Citation (mixed): JSON only
      setLoadingMessage('Loading citation network... (6 of 8)');
      const citeMixedRes = await fetch(`${DATA_BASE}/citation_network_mixed.json`);
      if (citeMixedRes.ok) {
        setNetworkCitationMixed(await citeMixedRes.json());
        setNetworkSource(prev => ({ ...prev, citationMixed: false }));
        anyLoaded = true;
      }

      // Citation (paper): try GEXF first, then JSON
      setLoadingMessage('Loading paper citations... (7 of 8)');
      let citePaperLoaded = false;
      const citePaperGexfRes = await fetch(`${DATA_BASE}/citation_network_paper.gexf`);
      if (citePaperGexfRes.ok) {
        try {
          const xml = await citePaperGexfRes.text();
          setNetworkCitationPaper(parseGexf(xml, { citation: true }));
          setNetworkSource(prev => ({ ...prev, citationPaper: true }));
          citePaperLoaded = true;
          anyLoaded = true;
        } catch (_) { /* fallback to JSON */ }
      }
      if (!citePaperLoaded) {
        const citePaperRes = await fetch(`${DATA_BASE}/citation_network_paper.json`);
        if (citePaperRes.ok) {
          setNetworkCitationPaper(await citePaperRes.json());
          setNetworkSource(prev => ({ ...prev, citationPaper: false }));
          anyLoaded = true;
        }
      }

      // Citation (author): use citation_network_top200.gexf, then JSON
      setLoadingMessage('Loading author citations... (8 of 8)');
      let citeAuthorLoaded = false;
      const citeAuthorGexfRes = await fetch(`${DATA_BASE}/citation_network_top200.gexf`);
      if (citeAuthorGexfRes.ok) {
        try {
          const xml = await citeAuthorGexfRes.text();
          setNetworkCitationAuthor(parseGexf(xml, { citation: true }));
          setNetworkSource(prev => ({ ...prev, citationAuthor: true }));
          citeAuthorLoaded = true;
          anyLoaded = true;
        } catch (_) { /* fallback to JSON */ }
      }
      if (!citeAuthorLoaded) {
        const citeAuthorRes = await fetch(`${DATA_BASE}/citation_network_author.json`);
        if (citeAuthorRes.ok) {
          setNetworkCitationAuthor(await citeAuthorRes.json());
          setNetworkSource(prev => ({ ...prev, citationAuthor: false }));
          anyLoaded = true;
        }
      }

      if (anyLoaded) setDataSourceLabel('Built-in data (/data)');
    } catch (e) {
      console.error('Failed to load data:', e);
      setLoadingMessage('Error loading data');
    } finally {
      setIsDataLoading(false);
      setLoadingMessage('');
    }
  }, [loadModelData, loadClassifiedCsv]);

  useEffect(() => {
    loadFromPublic();
  }, [loadFromPublic]);

  const value = useMemo<DataContextValue>(() => ({
    yearlyStats,
    publicationTrendsBySource,
    papers,
    authors,
    domains,
    networkSocial,
    networkCitationMixed,
    networkCitationPaper,
    networkCitationAuthor,
    networkSource,
    isLoadedFromData,
    isDataLoading,
    authorsLoading,
    setAuthorsLoading,
    loadingMessage,
    dataSourceLabel,
    availableModels,
    activeModel,
    classifiedCsvMap,
    setActiveModel,
    setLoadedData,
    loadFromPublic,
  }), [
    yearlyStats,
    publicationTrendsBySource,
    papers,
    authors,
    domains,
    networkSocial,
    networkCitationMixed,
    networkCitationPaper,
    networkCitationAuthor,
    networkSource,
    isLoadedFromData,
    isDataLoading,
    authorsLoading,
    loadingMessage,
    dataSourceLabel,
    availableModels,
    activeModel,
    classifiedCsvMap,
    setActiveModel,
    setLoadedData,
    loadFromPublic,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
