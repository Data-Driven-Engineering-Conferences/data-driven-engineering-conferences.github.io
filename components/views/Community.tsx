import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { MOCK_SOCIAL, MOCK_CITATION_PAPER, MOCK_CITATION_AUTHOR, DOMAINS } from '../../constants';
import { NetworkData, GraphNode } from '../../types';
import { useData } from '../../context/DataContext';
import { User, FileText, Search, ZoomIn, ZoomOut, Home, X, MousePointer2, Users, File, Move } from 'lucide-react';
import DomainFilter, { ActiveFilter } from '../DomainFilter';

interface WindowState {
  id: string;
  node: GraphNode;
  x: number;
  y: number;
  zIndex: number;
}

interface TooltipState {
  x: number;
  y: number;
  content: React.ReactNode;
}

const Community: React.FC = () => {
  const {
    networkSocial,
    networkCitationMixed,
    networkCitationPaper,
    networkCitationAuthor,
    networkSource,
    papers,
    domains: contextDomains,
  } = useData();
  const domainsList = (contextDomains?.length ? contextDomains : DOMAINS);
  const papersList = papers ?? [];

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [mode, setMode] = useState<'SOCIAL' | 'CITATION'>('SOCIAL');
  const [citationType, setCitationType] = useState<'PAPER' | 'AUTHOR'>('AUTHOR');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  
  // Interaction State
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [hoverLink, setHoverLink] = useState<any | null>(null);
  const [linkTooltip, setLinkTooltip] = useState<TooltipState | null>(null);
  const [nodeTooltip, setNodeTooltip] = useState<TooltipState | null>(null);
  const [nextZIndex, setNextZIndex] = useState(10);
  
  // Dragging State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // D3 Refs
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgSelectionRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const gSelectionRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const homeTransformRef = useRef<d3.ZoomTransform | null>(null);

  // Data Selection with Filtering
  const data: NetworkData = useMemo(() => {
    const social = (networkSocial?.nodes?.length ? networkSocial : MOCK_SOCIAL) as NetworkData;
    const mixed = (networkCitationMixed?.nodes?.length ? networkCitationMixed : MOCK_CITATION_MIXED) as NetworkData;
    const paperNet = (networkCitationPaper?.nodes?.length ? networkCitationPaper : MOCK_CITATION_PAPER) as NetworkData;
    const authorNet = (networkCitationAuthor?.nodes?.length ? networkCitationAuthor : MOCK_CITATION_AUTHOR) as NetworkData;

    let baseData: NetworkData;
    if (mode === 'SOCIAL') {
      baseData = JSON.parse(JSON.stringify(social));
    } else if (citationType === 'PAPER') {
      baseData = JSON.parse(JSON.stringify(paperNet));
    } else if (citationType === 'AUTHOR') {
      baseData = JSON.parse(JSON.stringify(authorNet));
    } else {
      baseData = JSON.parse(JSON.stringify(mixed));
    }

    // Apply domain/subdomain filters (only for paper nodes in CITATION mode)
    if (activeFilters.length > 0 && mode === 'CITATION') {
      const filteredData = { ...baseData };
      
      // Filter nodes (papers)
      filteredData.nodes = baseData.nodes.filter(node => {
        if (node.nodeType !== 'paper') return true; // Keep all author nodes
        
        // Check if paper matches any filter
        return activeFilters.some(filter => {
          if (filter.type === 'domain') {
            return node.group === filter.value;
          } else {
            // subdomain filter - need to check paper's subArea
            const paper = papersList.find((p: { id: string }) => p.id === node.id);
            if (!paper) return false;
            return paper.domainId === filter.domainId && paper.subArea === filter.value;
          }
        });
      });

      // Filter links to only include connections between remaining nodes
      const nodeIds = new Set(filteredData.nodes.map(n => n.id));
      filteredData.links = baseData.links.filter(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      });

      return filteredData;
    }

    return baseData;
  }, [mode, citationType, activeFilters, networkSocial, networkCitationPaper, networkCitationAuthor, papersList]);

  const currentSourceFromGexf =
    mode === 'SOCIAL' ? networkSource.social
    : citationType === 'MIXED' ? networkSource.citationMixed
    : citationType === 'PAPER' ? networkSource.citationPaper
    : networkSource.citationAuthor;

  // -----------------------------------------------------------------------
  // Window Management
  // -----------------------------------------------------------------------
  const addWindow = useCallback((node: GraphNode, initialX: number, initialY: number) => {
    setWindows(prev => {
      if (prev.find(w => w.id === node.id)) {
        return prev.map(w => w.id === node.id ? { ...w, zIndex: nextZIndex + 1 } : w);
      }
      const offsetCount = prev.length;
      return [...prev, {
        id: node.id,
        node,
        x: Math.min(initialX + 20 + (offsetCount * 10), (containerRef.current?.clientWidth || 800) - 300), 
        y: Math.max(initialY - 50 + (offsetCount * 10), 20),
        zIndex: nextZIndex + 1
      }];
    });
    setNextZIndex(z => z + 1);
  }, [nextZIndex]);

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const bringToFront = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex + 1 } : w));
    setNextZIndex(z => z + 1);
  };

  // -----------------------------------------------------------------------
  // Drag Logic
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // D3 Initialization
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 600;

    const svg = d3.select(svgRef.current);
    svgSelectionRef.current = svg;
    svg.selectAll("*").remove(); 

    const g = svg.append("g");
    gSelectionRef.current = g;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    zoomRef.current = zoom;

    // GEXF layout: nodes already have x, y (and colors/sizes from file). Render as-is, no force simulation.
    const hasGexfLayout = data.nodes.length > 0 && data.nodes.every(
      (d: any) => typeof d.x === 'number' && typeof d.y === 'number'
    );

    // Apply initial transform after layout is ready (requestAnimationFrame ensures container is sized)
    requestAnimationFrame(() => {
      const actualWidth = containerRef.current?.clientWidth || width;
      if (hasGexfLayout) {
        // Fit view to GEXF graph bounds
        const xExtent = d3.extent(data.nodes, (d: any) => d.x) as [number, number];
        const yExtent = d3.extent(data.nodes, (d: any) => d.y) as [number, number];
        const cx = (xExtent[0] + xExtent[1]) / 2;
        const cy = (yExtent[0] + yExtent[1]) / 2;
        const w = Math.max((xExtent[1] - xExtent[0]) || 1, 1);
        const h = Math.max((yExtent[1] - yExtent[0]) || 1, 1);
        const padding = 80;
        const scale = Math.min((actualWidth - padding) / w, (height - padding) / h, 1.2);
        const transform = d3.zoomIdentity.translate(actualWidth / 2, height / 2).scale(scale).translate(-cx, -cy);
        homeTransformRef.current = transform;
        svg.call(zoom.transform, transform);
      } else {
        const transform = d3.zoomIdentity.translate(actualWidth/2, height/2).scale(0.8).translate(-actualWidth/2, -height/2);
        homeTransformRef.current = transform;
        svg.call(zoom.transform, transform);
      }
    });

    let simulation: d3.Simulation<any, any> | null = null;
    if (!hasGexfLayout) {
      simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(
           mode === 'SOCIAL' ? 40 : 80
        ))
        .force("charge", d3.forceManyBody().strength(mode === 'SOCIAL' ? -80 : -120))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius((d: any) => (d.val || 5) + 4));
    }

    // 1. Visible Links (Visuals only)
    const visibleLinks = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("class", "visible-link")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: any) => Math.sqrt(d.value));

    // 2. Hit Links (Transparent, Thicker, Events)
    const hitLinks = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("class", "hit-link")
      .attr("stroke", "transparent")
      .attr("stroke-width", 15) // Wide hit area
      .style("cursor", "pointer")
      .on("mouseover", (event, d: any) => {
        setHoverLink(d);
        // Determine relationship label
        let label = "Connected";
        if (mode === 'SOCIAL') label = "Co-Authorship";
        else if (d.source.nodeType === 'author' && d.target.nodeType === 'paper') label = "Authored";
        else if (d.source.nodeType === 'paper' && d.target.nodeType === 'paper') label = "Cites";
        
        // Get mouse coordinates - handle both D3 event and native event
        const nativeEvent = (event as any).sourceEvent || event;
        const x = nativeEvent.clientX || (nativeEvent as any).pageX || 0;
        const y = nativeEvent.clientY || (nativeEvent as any).pageY || 0;
        
        setLinkTooltip({
          x,
          y,
          content: (
            <>
              <div className="font-bold text-slate-800 mb-2 text-sm">{label}</div>
              <div className="text-slate-600 text-xs flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                <span className="truncate max-w-[100px]" title={d.source.label}>{d.source.label}</span>
                <span className="text-slate-400">→</span>
                <span className="truncate max-w-[100px]" title={d.target.label}>{d.target.label}</span>
              </div>
            </>
          )
        });
      })
      .on("mousemove", (event) => {
         // Get mouse coordinates - handle both D3 event and native event
         const nativeEvent = (event as any).sourceEvent || event;
         const x = nativeEvent.clientX || (nativeEvent as any).pageX || 0;
         const y = nativeEvent.clientY || (nativeEvent as any).pageY || 0;
         setLinkTooltip(prev => prev ? ({ ...prev, x, y }) : null);
      })
      .on("mouseout", () => {
         setHoverLink(null);
         setLinkTooltip(null);
      });

    // Draw Nodes (GEXF: use viz:size from file; else use formula)
    const node = g.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d: any) => {
        if (hasGexfLayout && typeof d.val === 'number') {
          return Math.min(36, Math.max(5, d.val * 1.2)); // GEXF viz:size → pixel radius (2× scale)
        }
        if (d.nodeType === 'author') return mode === 'SOCIAL' ? 6 : (citationType === 'AUTHOR' ? 4 + (d.val/2) : 4);
        return 4 + (d.val || 1);
      })
      .attr("fill", (d: any) => (d.color != null && d.color !== '') ? d.color : '#94a3b8')
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .call(d3.drag<any, any>()
          .on("start", (event, d) => {
              if (simulation && !event.active) simulation.alphaTarget(0.3).restart();
              if (hasGexfLayout) { d.fx = d.x; d.fy = d.y; }
              else { d.fx = d.x; d.fy = d.y; }
          })
          .on("drag", (event, d) => {
              if (hasGexfLayout) {
                d.x = event.x; d.y = event.y;
                visibleLinks.attr("x1", (L: any) => L.source.x).attr("y1", (L: any) => L.source.y).attr("x2", (L: any) => L.target.x).attr("y2", (L: any) => L.target.y);
                hitLinks.attr("x1", (L: any) => L.source.x).attr("y1", (L: any) => L.source.y).attr("x2", (L: any) => L.target.x).attr("y2", (L: any) => L.target.y);
                node.attr("cx", (n: any) => n.x).attr("cy", (n: any) => n.y);
              } else {
                d.fx = event.x; d.fy = event.y;
              }
          })
          .on("end", (event, d) => {
              if (simulation && !event.active) simulation.alphaTarget(0);
              if (!hasGexfLayout) { d.fx = null; d.fy = null; }
          })
      );

    // D3 Interactions
    node
      .on("mouseover", (event, d) => {
        setHoverNode(d);
        // Get mouse coordinates - handle both D3 event and native event
        const nativeEvent = (event as any).sourceEvent || event;
        const x = nativeEvent.clientX || (nativeEvent as any).pageX || 0;
        const y = nativeEvent.clientY || (nativeEvent as any).pageY || 0;
        
        // Create tooltip content
        const content = (
          <>
            <h4 className="font-serif font-bold text-slate-800 text-sm leading-snug mb-2 break-words">
              {d.fullLabel || d.label}
            </h4>
            {d.nodeType === 'author' ? (
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">A</span>
                  <span>{d.group || 'Author'}</span>
                </div>
                {mode === 'SOCIAL' && (d.topCitedPaperCount != null || d.val != null) && (
                  <div className="text-slate-500 border-t border-slate-100 pt-2 mt-2" title="Number of papers by this author within the top 200 most-cited papers (not total IISE publications)">
                    <strong className="font-mono text-sm">{d.topCitedPaperCount ?? d.val}</strong>
                    <span className="ml-1">top-cited papers</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {d.group && (
                  <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                    {d.group}
                  </div>
                )}
                {mode === 'CITATION' && d.val !== undefined && (
                  <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <div>
                      <strong className="block text-slate-900 font-mono text-sm">{(d.val * 123).toFixed(0)}</strong>
                      <span>Citations</span>
                    </div>
                    <div>
                      <strong className="block text-slate-900 font-mono text-sm">{d.val.toFixed(3)}</strong>
                      <span>PageRank</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
        setNodeTooltip({
          x,
          y,
          content
        });
      })
      .on("mousemove", (event) => {
        // Get mouse coordinates - handle both D3 event and native event
        const nativeEvent = (event as any).sourceEvent || event;
        const x = nativeEvent.clientX || (nativeEvent as any).pageX || 0;
        const y = nativeEvent.clientY || (nativeEvent as any).pageY || 0;
        setNodeTooltip(prev => prev ? ({ ...prev, x, y }) : null);
      })
      .on("mouseout", () => {
        setHoverNode(null);
        setNodeTooltip(null);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        const transform = d3.zoomTransform(svgRef.current!);
        const sx = transform.applyX(d.x!);
        const sy = transform.applyY(d.y!);
        window.dispatchEvent(new CustomEvent('node-clicked', { detail: { node: d, x: sx, y: sy } }));
      });
    
    const clickHandler = (e: any) => {
        addWindow(e.detail.node, e.detail.x, e.detail.y);
    };
    window.addEventListener('node-clicked', clickHandler);

    const updatePositions = () => {
      visibleLinks.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y).attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      hitLinks.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y).attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    };

    if (hasGexfLayout) {
      // GEXF: single position update from node.x, node.y (no simulation)
      updatePositions();
    } else {
      simulation!.on("tick", updatePositions);
      // When force layout settles, apply centered zoom-to-fit as home view
      simulation!.on("end", () => {
        const transform = fitTransform();
        if (transform && svgRef.current && zoomRef.current) {
          homeTransformRef.current = transform;
          d3.select(svgRef.current).transition().duration(400).call(zoomRef.current.transform, transform);
        }
      });
    }

    return () => {
      if (simulation) simulation.stop();
      window.removeEventListener('node-clicked', clickHandler);
    };
  }, [mode, citationType, addWindow, data]); 

  // -----------------------------------------------------------------------
  // Highlights
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!gSelectionRef.current) return;
    const g = gSelectionRef.current;
    
    const openNodeIds = new Set(windows.map(w => w.id));
    const term = searchTerm.toLowerCase();

    const isHighlight = (d: any) => {
        if (term) {
             const label = (d.label || '').toLowerCase();
             const fullLabel = (d.fullLabel || '').toLowerCase();
             return label.includes(term) || fullLabel.includes(term);
        }
        if (hoverLink) {
             if (d.id === hoverLink.source.id || d.id === hoverLink.target.id) return true;
        }
        if (hoverNode && d.id === hoverNode.id) return true;
        if (openNodeIds.has(d.id)) return true;
        return false;
    };

    // Update Nodes
    g.selectAll("circle")
      .transition().duration(200)
      .attr("opacity", (d: any) => {
         if (term) return isHighlight(d) ? 1 : 0.1;
         if (hoverNode || hoverLink) return isHighlight(d) ? 1 : 0.3;
         return 1;
      })
      .attr("stroke", (d: any) => isHighlight(d) ? "#000" : "#fff")
      .attr("stroke-width", (d: any) => isHighlight(d) ? 2.5 : 1.5);

    // Update Links - TARGET ONLY VISIBLE LINKS
    g.selectAll(".visible-link")
      .transition().duration(200)
      .attr("stroke", (d: any) => {
          if (hoverLink && d === hoverLink) return "#1e293b"; 
          if (hoverNode && (d.source.id === hoverNode.id || d.target.id === hoverNode.id)) return "#475569";
          return "#94a3b8";
      })
      .attr("stroke-width", (d: any) => {
          if (hoverLink && d === hoverLink) return Math.sqrt(d.value) * 2.5 + 2; 
          if (hoverNode && (d.source.id === hoverNode.id || d.target.id === hoverNode.id)) return Math.sqrt(d.value) * 1.5;
          return Math.sqrt(d.value);
      })
      .attr("stroke-opacity", (d: any) => {
          if (term) return 0.1; 
          if (hoverLink) return d === hoverLink ? 1 : 0.1;
          if (hoverNode) return (d.source.id === hoverNode.id || d.target.id === hoverNode.id) ? 1 : 0.1;
          return 0.6;
      });

  }, [searchTerm, hoverNode, hoverLink, windows]);

  // -----------------------------------------------------------------------
  // Zoom Helpers
  // -----------------------------------------------------------------------
  const handleZoom = (factor: number) => {
    if (!svgSelectionRef.current || !zoomRef.current) return;
    svgSelectionRef.current.transition().duration(300).call(zoomRef.current.scaleBy, factor);
  };
  const handleResetZoom = () => {
    if (!svgSelectionRef.current || !zoomRef.current) return;
    // Use stored home transform (fits GEXF graph to view)
    if (homeTransformRef.current) {
      svgSelectionRef.current.transition().duration(750)
        .call(zoomRef.current.transform, homeTransformRef.current);
    } else {
      // Fallback if no stored transform
      const width = containerRef.current?.clientWidth || 600;
      const height = 600;
      svgSelectionRef.current.transition().duration(750)
        .call(zoomRef.current.transform, d3.zoomIdentity.translate(width/2, height/2).scale(1).translate(-width/2, -height/2));
    }
  };

  return (
    <div 
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in flex flex-col h-[700px]"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-slate-100 z-10 bg-white shadow-sm">
        <div className="flex flex-col gap-2">
          {/* Title and Controls Row */}
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-serif font-bold text-slate-800 text-lg shrink-0">Network Cartography</h3>
            
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
               <input 
                 type="text" 
                 placeholder="Find entity..."
                 className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            
            {/* Filter - only show in CITATION mode */}
            {mode === 'CITATION' && (
              <DomainFilter 
                activeFilters={activeFilters}
                onFiltersChange={setActiveFilters}
                domains={domainsList}
              />
            )}

            {/* Toggles */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
              <button 
                onClick={() => { setMode('SOCIAL'); setWindows([]); setActiveFilters([]); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${mode === 'SOCIAL' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Users size={14} /> Co-Authorship
              </button>
              <button 
                onClick={() => { setMode('CITATION'); setWindows([]); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${mode === 'CITATION' ? 'bg-white shadow text-purple-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <FileText size={14} /> Citation
              </button>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-xs text-slate-500">
             {mode === 'SOCIAL' ? 'Mapping collaborative clusters (Co-authorship)' : 'Mapping intellectual influence (Citation)'}
          </p>
        </div>
      </div>

      {/* Filter Tags */}
      {mode === 'CITATION' && activeFilters.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 z-10">
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

      {/* SECONDARY HEADER */}
      {mode === 'CITATION' && (
        <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/50 flex justify-center z-10">
            <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400 font-medium uppercase tracking-wide">Citation Scope:</span>
                <div className="flex bg-white border border-slate-200 rounded-md p-0.5">
                    <button 
                      onClick={() => { setCitationType('AUTHOR'); setWindows([]); }}
                      className={`px-3 py-1 rounded-sm transition-colors flex items-center gap-1.5 ${citationType === 'AUTHOR' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                       <User size={12}/> Author
                    </button>
                    <button 
                      onClick={() => { setCitationType('PAPER'); setWindows([]); }}
                      className={`px-3 py-1 rounded-sm transition-colors flex items-center gap-1.5 ${citationType === 'PAPER' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                       <File size={12}/> Papers
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* GRAPH AREA */}
      <div className="relative grow bg-slate-50 overflow-hidden" ref={containerRef}>
        {/* INFO BANNER overlays (do not reduce graph height) */}
        {mode === 'SOCIAL' && (
          <div className="absolute top-0 left-0 right-0 px-4 py-2 border-b border-amber-200 bg-amber-50/95 text-xs text-amber-800 z-10 shadow-sm">
            <strong>Note:</strong> This network shows authors from the <span className="font-semibold">top 200 most-cited papers</span>.
            The "top-cited papers" count for each author refers to how many of those 200 papers they authored,
            <span className="italic"> not</span> their total IISE publications.
          </div>
        )}
        {mode === 'CITATION' && (
          <div className="absolute top-0 left-0 right-0 px-4 py-2 border-b border-purple-200 bg-purple-50/95 text-xs text-purple-800 z-10 shadow-sm">
            <strong>Note:</strong> This citation network is based on the <span className="font-semibold">top 200 most-cited papers</span>.
            {citationType === 'AUTHOR' ? ' Nodes are authors; edges show citation links between them.' : ' Nodes are papers; edges show citation links between papers.'}
          </div>
        )}
        <div className="w-full h-full">
            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing outline-none"></svg>
        </div>

        {/* Node / edge count and data source (top right) - below note */}
        <div className="absolute top-14 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-200 text-xs shadow-sm pointer-events-none select-none z-10 space-y-1">
          <div className="font-medium text-slate-700">
            Nodes: {data.nodes.length.toLocaleString()} · Edges: {data.links.length.toLocaleString()}
          </div>
          <div className="text-slate-600">
            Clusters: {new Set(data.nodes.map(n => n.group).filter(g => g && g !== 'unknown')).size}
          </div>
          <div className="flex items-center gap-2">
            <span className={currentSourceFromGexf ? 'text-emerald-600 font-medium' : 'text-amber-700'}>
              Data: {currentSourceFromGexf ? 'GEXF' : 'JSON'}
            </span>
            {!currentSourceFromGexf && (
              <span className="text-slate-500" title="Copy coauthorship_network_top200.gexf and citation_network_top200.gexf to Web/public/data/ to use Gephi layout and colors.">
                (copy GEXF to public/data/)
              </span>
            )}
          </div>
        </div>

        {/* Zoom Controls - below note */}
        <div className="absolute top-14 left-4 flex flex-col gap-2 z-10">
            <button onClick={() => handleZoom(1.2)} className="p-2 bg-white rounded-lg shadow border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors" title="Zoom In">
                <ZoomIn size={20} />
            </button>
            <button onClick={() => handleZoom(0.8)} className="p-2 bg-white rounded-lg shadow border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors" title="Zoom Out">
                <ZoomOut size={20} />
            </button>
            <button onClick={handleResetZoom} className="p-2 bg-white rounded-lg shadow border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors" title="Reset View">
                <Home size={20} />
            </button>
        </div>

        {/* DYNAMIC LEGEND */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-slate-200 text-xs shadow-sm pointer-events-none select-none z-0 max-h-48 overflow-y-auto">
          <h4 className="font-bold mb-2 text-slate-700 border-b border-slate-100 pb-1">Legend</h4>
          <div className="space-y-1.5">
             {mode === 'SOCIAL' ? (
                <p className="text-slate-500 text-[10px]">Node colors from graph data.</p>
             ) : (
                <>
                   {/* Author Indicator */}
                   {(citationType === 'MIXED' || citationType === 'AUTHOR') && (
                       <div className="flex items-center gap-2 mb-2">
                           <div className="w-3 h-3 rounded-full bg-[#334155] border border-slate-400"></div>
                           <span className="font-medium text-slate-700">Author Node</span>
                       </div>
                   )}
                   
                   {/* Domain Indicators */}
                   {(citationType === 'MIXED' || citationType === 'PAPER') && (
                       <>
                           <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 mt-1">Research Domains</div>
                           {domainsList.map(d => (
                               <div key={d.id} className="flex items-center gap-2">
                                   <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: d.color }}></div>
                                   <span className="text-slate-600 truncate max-w-[120px]" title={d.name}>{d.name}</span>
                               </div>
                           ))}
                       </>
                   )}
                </>
             )}
          </div>
        </div>
        
        {/* NODE TOOLTIP */}
        {nodeTooltip && (
            <div 
                className="fixed z-50 pointer-events-none w-72 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                style={{ left: nodeTooltip.x + 15, top: nodeTooltip.y + 15 }}
            >
                <div className={`h-2 w-full shrink-0 ${mode === 'SOCIAL' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                <div className="p-4">
                    {nodeTooltip.content}
                </div>
            </div>
        )}

        {/* EDGE TOOLTIP */}
        {linkTooltip && (
            <div 
                className="fixed z-50 pointer-events-none w-72 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                style={{ left: linkTooltip.x + 15, top: linkTooltip.y + 15 }}
            >
                <div className={`h-2 w-full shrink-0 ${mode === 'SOCIAL' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                <div className="p-4">
                    {linkTooltip.content}
                </div>
            </div>
        )}

        {/* FLOATING WINDOWS */}
        {windows.map((w) => (
            <div 
                key={w.id}
                className="absolute w-72 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                style={{ 
                    left: w.x, 
                    top: w.y, 
                    zIndex: w.zIndex,
                    cursor: 'default'
                }}
                onMouseDown={(e) => handleMouseDown(e, w.id, w.x, w.y)}
            >
                <div className={`h-2 w-full shrink-0 ${mode === 'SOCIAL' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                <div className="p-4 pt-3 cursor-move bg-slate-50 border-b border-slate-100 select-none flex justify-between items-center group">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Move size={10} className="text-slate-300 group-hover:text-blue-400" />
                        {w.node.nodeType === 'author' ? 'Author' : 'Paper'}
                     </span>
                     <button onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={16} />
                     </button>
                </div>
                
                <div className="p-4" onMouseDown={(e) => e.stopPropagation() /* Prevent dragging from content */}>
                    <h4 className="font-serif font-bold text-slate-800 text-lg leading-snug mb-2 break-words">
                        {w.node.fullLabel || w.node.label}
                    </h4>

                    {w.node.nodeType === 'author' ? (
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">A</span>
                                <span>{w.node.group}</span>
                            </div>
                            {mode === 'SOCIAL' && (w.node.topCitedPaperCount != null || w.node.val != null) && (
                                <div className="text-slate-500 border-t border-slate-100 pt-2" title="Number of papers by this author within the top 200 most-cited papers (not total IISE publications)">
                                    <strong className="font-mono text-lg">{w.node.topCitedPaperCount ?? w.node.val}</strong>
                                    <span className="ml-1 cursor-help border-b border-dotted border-slate-400">top-cited papers</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                             <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                                {w.node.group}
                             </div>
                             {mode === 'CITATION' && w.node.val !== undefined && (
                                 <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                                     <div>
                                         <strong className="block text-slate-900 font-mono text-lg">{(w.node.val * 123).toFixed(0)}</strong>
                                         <span>Citations</span>
                                     </div>
                                     <div>
                                         <strong className="block text-slate-900 font-mono text-lg">{(w.node.val).toFixed(3)}</strong>
                                         <span>PageRank</span>
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Community;