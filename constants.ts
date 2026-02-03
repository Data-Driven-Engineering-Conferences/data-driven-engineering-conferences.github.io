import { Domain, Paper, YearlyStats, NetworkData, GraphNode, GraphLink } from './types';

// --- Configuration ---
export const START_YEAR = 2002;
export const END_YEAR = 2025;

export const DOMAINS: Domain[] = [
  { id: 'MAN', name: 'Manufacturing & Design', color: '#2563eb', subAreas: ['Additive Mfg', 'Smart Factories', 'Lean Principles', 'CAD/CAM'] },
  { id: 'HLT', name: 'Healthcare Systems', color: '#dc2626', subAreas: ['Patient Flow', 'Telehealth', 'Medical Decision Making', 'Public Health'] },
  { id: 'DAT', name: 'Data Science & AI', color: '#7c3aed', subAreas: ['Machine Learning', 'Predictive Analytics', 'LLMs in IE', 'Optimization'] },
  { id: 'SUP', name: 'Supply Chain', color: '#d97706', subAreas: ['Logistics', 'Resilience', 'Inventory Control', 'Blockchain'] },
  { id: 'SUS', name: 'Sustainability', color: '#0d9488', subAreas: ['Circular Economy', 'Green Energy', 'Carbon Footprint', 'Waste Mgmt'] },
  { id: 'HFE', name: 'Human Factors', color: '#e11d48', subAreas: ['Cognitive Ergo', 'Safety', 'Human-Robot Interaction', 'UX Design'] },
];

export const AFFILIATION_COLORS: Record<string, string> = {
  'Univ. of Michigan': '#1e40af', // Blue 800
  'Georgia Tech': '#b45309',      // Amber 700
  'Purdue Univ.': '#0f172a',      // Slate 900
  'Virginia Tech': '#9f1239',     // Rose 800
  'Texas A&M': '#581c87',         // Purple 900
};

// --- Helpers ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

// --- Mock Data Generators ---

// 1. Generate Yearly Stats (Macro Trends)
export const generateYearlyStats = (): YearlyStats[] => {
  const stats: YearlyStats[] = [];
  let baseVolume = 250;
  
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    // Trend: Slow growth, slight dip in 2020, boom in 2023+
    if (year > 2010) baseVolume += 15;
    if (year === 2020) baseVolume -= 80;
    if (year > 2020) baseVolume += 40;

    const totalPapers = baseVolume + randomInt(-20, 20);
    
    // Domain distribution changes over time
    const domainCounts: Record<string, number> = {};
    let remaining = totalPapers;

    DOMAINS.forEach((d, i) => {
      // Logic: Mfg starts high, drops slightly. Data Science starts low, explodes.
      let share = 0.16; // default equal share
      if (d.id === 'MAN') share = year < 2010 ? 0.35 : 0.20;
      if (d.id === 'DAT') share = year < 2010 ? 0.05 : (year > 2018 ? 0.25 : 0.15);
      if (d.id === 'HLT') share = 0.15; // steady
      
      const count = Math.floor(totalPapers * share);
      domainCounts[d.id] = count;
      remaining -= count;
    });
    
    // Dump remainder into Sustainability (growing trend)
    domainCounts['SUS'] = (domainCounts['SUS'] || 0) + remaining;

    stats.push({
      year,
      totalPapers,
      totalCitations: Math.floor(totalPapers * (randomInt(5, 50) - (year - 2000) * 0.5)), // Older papers have more citations
      domainCounts
    });
  }
  return stats;
};

// 2. Generate Detailed Paper List (Archive & Network Source)
// Generating 200 representative papers for the table/network views
export const generatePapers = (): Paper[] => {
  const papers: Paper[] = [];
  const totalToGen = 200;
  const affiliations = Object.keys(AFFILIATION_COLORS);

  for (let i = 0; i < totalToGen; i++) {
    const year = randomInt(START_YEAR, END_YEAR);
    const domain = pick(DOMAINS);
    const subArea = pick(domain.subAreas);
    
    // Title Gen
    const prefixes = ['Optimizing', 'A Study on', 'Analysis of', 'Integrated', 'Next-Gen', 'Review of', 'AI-Driven'];
    const title = `${pick(prefixes)} ${subArea} in ${domain.name} Contexts`;

    // Authors
    const numAuthors = randomInt(1, 4);
    const authors = Array.from({length: numAuthors}).map((_, idx) => ({
      id: `auth-${i}-${idx}`,
      name: `Author ${String.fromCharCode(65 + randomInt(0, 25))}. Name`,
      affiliation: pick(affiliations)
    }));

    papers.push({
      id: `p-${i}`,
      title,
      year,
      authors,
      domainId: domain.id,
      subArea,
      citations: Math.max(0, Math.floor((2026 - year) * randomFloat(0, 5) * (randomInt(0, 10) === 0 ? 10 : 1))), // Skewed high occasionally
      pageRank: randomFloat(0.001, 0.999),
      llmConfidence: Math.random() > 0.3 ? 'High' : 'Medium', // 70% High confidence
      abstract: "Lorem ipsum data analysis..."
    });
  }
  return papers.sort((a, b) => b.pageRank - a.pageRank); // Initial sort by influence
};

// 3. Generate Network Data

// Mode A: Social (Co-author)
export const generateSocialNetwork = (papers: Paper[]): NetworkData => {
  // Social: Nodes = Authors, Links = Co-authors
  const nodesMap = new Map<string, GraphNode>();
  const links: any[] = [];

  papers.slice(0, 50).forEach(p => { // Use top 50 papers for graph clarity
    for (let i = 0; i < p.authors.length; i++) {
      const a1 = p.authors[i];
      if (!nodesMap.has(a1.id)) {
        nodesMap.set(a1.id, { 
            id: a1.id, 
            label: a1.name, 
            group: a1.affiliation, 
            val: 1, 
            color: AFFILIATION_COLORS[a1.affiliation] || '#64748b', 
            nodeType: 'author', 
            fullLabel: a1.name 
        });
      } else {
        const node = nodesMap.get(a1.id);
        if (node) node.val += 0.5;
      }

      for (let j = i + 1; j < p.authors.length; j++) {
        const a2 = p.authors[j];
        if (!nodesMap.has(a2.id)) {
           nodesMap.set(a2.id, { 
               id: a2.id, 
               label: a2.name, 
               group: a2.affiliation, 
               val: 1, 
               color: AFFILIATION_COLORS[a2.affiliation] || '#64748b', 
               nodeType: 'author', 
               fullLabel: a2.name 
           });
        }
        links.push({ source: a1.id, target: a2.id, value: 1 });
      }
    }
  });

  return { nodes: Array.from(nodesMap.values()), links };
};

// Mode B1: Citation (Mixed: Authors + Papers)
export const generateMixedCitationNetwork = (papers: Paper[]): NetworkData => {
  // Knowledge: Mixed Graph of Authors AND Papers
  // Papers cite papers. Authors write papers.
  const topPapers = papers.slice(0, 30); // Use subset to avoid clutter
  const nodesMap = new Map<string, GraphNode>();
  const links: any[] = [];

  topPapers.forEach(p => {
    // 1. Add Paper Node
    if (!nodesMap.has(p.id)) {
      nodesMap.set(p.id, {
        id: p.id,
        label: p.id, // short label
        fullLabel: p.title,
        group: p.domainId,
        val: p.pageRank * 15,
        color: DOMAINS.find(d => d.id === p.domainId)?.color || '#000',
        nodeType: 'paper'
      });
    }

    // 2. Add Author Nodes & Connect to Paper (Authorship)
    p.authors.forEach(a => {
      // Create author node if not exists
      if (!nodesMap.has(a.id)) {
        nodesMap.set(a.id, {
          id: a.id,
          label: a.name,
          fullLabel: `${a.name} (${a.affiliation})`,
          group: 'AUTHOR', // Special group for author nodes
          val: 3, // Standard size for authors in this view
          color: '#334155', // Slate-700 for authors
          nodeType: 'author'
        });
      }
      
      // Add Edge: Author -> Paper
      links.push({ 
        source: a.id, 
        target: p.id, 
        value: 2 // Strong connection
      });
    });
  });
  
  // 3. Add Paper -> Paper Citations (Simulated)
  const paperNodes = Array.from(nodesMap.values()).filter(n => n.nodeType === 'paper');
  paperNodes.forEach((source, i) => {
    paperNodes.forEach((target, j) => {
      if (i !== j && source.group === target.group && Math.random() > 0.85) {
        links.push({ source: source.id, target: target.id, value: 1 });
      }
    });
  });

  return { nodes: Array.from(nodesMap.values()), links };
};

// Mode B2: Citation (Papers Only)
export const generatePaperCitationNetwork = (papers: Paper[]): NetworkData => {
  const selectedPapers = papers.slice(0, 50); // More papers since no authors
  const nodes: GraphNode[] = selectedPapers.map(p => ({
    id: p.id,
    label: p.id,
    fullLabel: p.title,
    group: p.domainId,
    val: p.pageRank * 20,
    color: DOMAINS.find(d => d.id === p.domainId)?.color || '#999',
    nodeType: 'paper'
  }));

  const links: any[] = [];
  nodes.forEach((source, i) => {
    nodes.forEach((target, j) => {
      // Simulate citation: Papers in same domain very likely to cite
      if (i !== j && source.group === target.group && Math.random() > 0.88) {
        links.push({ source: source.id, target: target.id, value: 1 });
      } else if (i !== j && Math.random() > 0.98) {
         // Random cross-domain citation
         links.push({ source: source.id, target: target.id, value: 1 });
      }
    });
  });

  return { nodes, links };
};

// Mode B3: Citation (Authors Only)
export const generateAuthorCitationNetwork = (papers: Paper[]): NetworkData => {
  const subset = papers.slice(0, 80);
  const authorMap = new Map<string, GraphNode>();
  
  subset.forEach(p => {
    p.authors.forEach(a => {
      if (!authorMap.has(a.id)) {
        authorMap.set(a.id, {
          id: a.id,
          label: a.name,
          fullLabel: `${a.name} (${a.affiliation})`,
          group: a.affiliation,
          val: 3, 
          color: AFFILIATION_COLORS[a.affiliation] || '#64748b', 
          nodeType: 'author'
        });
      } else {
         const n = authorMap.get(a.id);
         if(n) n.val += 1; // More papers = larger node
      }
    });
  });

  const nodes = Array.from(authorMap.values());
  const links: any[] = [];
  
  // Random citations between authors (simulating intellectual influence)
  nodes.forEach((source, i) => {
    nodes.forEach((target, j) => {
       if (i !== j && Math.random() > 0.97) {
         links.push({ source: source.id, target: target.id, value: 1 });
       }
    });
  });
  
  return { nodes, links };
};

// Pre-calculate data
export const MOCK_STATS = generateYearlyStats();
export const MOCK_PAPERS = generatePapers();
export const MOCK_SOCIAL = generateSocialNetwork(MOCK_PAPERS);
export const MOCK_CITATION_MIXED = generateMixedCitationNetwork(MOCK_PAPERS);
export const MOCK_CITATION_PAPER = generatePaperCitationNetwork(MOCK_PAPERS);
export const MOCK_CITATION_AUTHOR = generateAuthorCitationNetwork(MOCK_PAPERS);
// Backward compatibility if needed, though we will update Community to use specific ones
export const MOCK_KNOWLEDGE = MOCK_CITATION_MIXED;