import * as d3 from 'd3';

export interface Author {
  id: string;
  name: string;
  affiliation: string;
}

export interface Domain {
  id: string;
  name: string;
  color: string;
  subAreas: string[];
}

export interface Paper {
  id: string;
  title: string;
  year: number;
  authors: Author[];
  domainId: string;
  subArea: string;
  citations: number;
  pageRank: number;
  llmConfidence: 'High' | 'Medium';
  abstract: string;
  proquestUrl?: string;
  doi?: string;
}

export interface YearlyStats {
  year: number;
  totalPapers: number;
  totalCitations: number;
  /** Papers with citation data in this year (for coverage %). Optional until 09 re-run. */
  papersWithCitationData?: number;
  domainCounts: Record<string, number>; // domainId -> count
}

/** Year-by-year paper counts by data source for Overview bar chart (Merged, ProQuest, Google Scholar). */
export interface PublicationTrendsBySourceRow {
  year: number;
  merged: number;
  proquest: number;
  google_scholar: number;
}

export type ViewMode = 'OVERVIEW' | 'THEMATIC' | 'COMMUNITY' | 'AUTHORS' | 'ARCHIVE';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  group: string;
  val: number; // size (GEXF: viz:size; used for node radius)
  label: string;
  color: string;
  fullLabel?: string;
  nodeType: 'author' | 'paper';
  /** Co-authorship GEXF: Number of papers this author has within the top 200 most-cited papers subset (not total IISE papers). */
  topCitedPaperCount?: number;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number; // weight
}

export interface NetworkData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** Author metrics for Authors view (matches pipeline authors.json) */
export interface AuthorData {
  id: string;
  name: string;
  citationInDegree: number;
  citationOutDegree: number;
  citationPageRank: number;
  coauthorDegree: number;
  eigenvectorCentrality: number;
  betweennessCentrality: number;
  clusteringCoefficient: number;
  totalPapers: number;
  careerSpan: number;
  firstYear: number;
  lastYear: number;
  papersPerYear: number;
  communityId: number;
  communitySize: number;
  onlyCites: boolean;
  onlyCited: boolean;
  bothCitesAndCited: boolean;
  googleScholarProfileUrl?: string;
}

/** Loaded data shape from /data/*.json or UploadDataModal */
export interface LoadedAppData {
  yearly_stats?: YearlyStats[];
  publication_trends_by_source?: PublicationTrendsBySourceRow[];
  papers?: Paper[];
  authors?: AuthorData[];
  domains?: Domain[];
  coauthorship_network_unified?: NetworkData;
  citation_network_paper?: NetworkData;
  citation_network_author?: NetworkData;
  citation_network_mixed?: NetworkData;
}