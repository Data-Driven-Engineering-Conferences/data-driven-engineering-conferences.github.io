import React, { useMemo, useState, useEffect, useRef } from 'react';
import { YearlyStats, Domain, Paper, PublicationTrendsBySourceRow } from '../../types';
import { DOMAINS } from '../../constants';
import { useData } from '../../context/DataContext';

const TOP_N = 10;

interface Props {
  data: YearlyStats[];
  domains?: Domain[];
  papers?: Paper[];
  /** Full-corpus paper counts by year (merged); used for "X of Y" total so classified ≤ total. */
  publicationTrendsBySource?: PublicationTrendsBySourceRow[];
  /** Full-range corpus total (sum merged over all years); used to detect full range and show model classified. */
  fullCorpusTotal?: number;
}

/**
 * Normalize paper sub-area to a canonical sub-area from the baseline (domains.json).
 * Canonical list has ~246 sub-areas from CFA/baseline. Every paper maps to exactly one canonical sub-area;
 * no "Others" row and no unmatched bucket — if no match, use the paper's domain's first sub-area.
 */
function normalizeSubAreaToCanonical(raw: string, domains: Domain[], domainId: string): string {
  const canonicalList = [...new Set(domains.flatMap(d => d.subAreas ?? []))].filter(Boolean);
  const firstSubAreaForDomain = (did: string): string => {
    const dom = domains.find(d => d.id === did);
    const subs = dom?.subAreas?.filter(Boolean);
    if (subs?.length) return subs[0];
    return canonicalList[0] ?? '';
  };
  if (canonicalList.length === 0) return raw?.trim() || firstSubAreaForDomain(domainId);

  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

  if (!raw || typeof raw !== 'string') return firstSubAreaForDomain(domainId);
  const rawNorm = norm(raw);
  if (!rawNorm) return firstSubAreaForDomain(domainId);

  // Exact match (case-insensitive, collapse spaces)
  const exact = canonicalList.find(c => norm(c) === rawNorm);
  if (exact) return exact;

  // Substring match: paper often contains canonical plus "(under ...)". Prefer longest canonical that appears in raw.
  const sortedByLength = [...canonicalList].sort((a, b) => b.length - a.length);
  for (const c of sortedByLength) {
    const cNorm = norm(c);
    if (rawNorm.includes(cNorm) || cNorm.includes(rawNorm)) return c;
  }

  return firstSubAreaForDomain(domainId);
}

/** First domain in list with given id (domains.json can have duplicate ids). */
function getDomainById(domains: Domain[], id: string): Domain | undefined {
  return domains.find(d => d.id === id);
}

/** Sequential: 0% = white, 50% = yellow, 100% = red (prevalence low → high). */
const SCALE_LOW = '#ffffff';   // white (0%)
const SCALE_MID = '#eab308';  // yellow (50%)
const SCALE_HIGH = '#b91c1c'; // red (100%)

function lerpHex(hex0: string, hex1: string, t: number): string {
  const r = Math.round(parseInt(hex0.slice(1, 3), 16) * (1 - t) + parseInt(hex1.slice(1, 3), 16) * t);
  const g = Math.round(parseInt(hex0.slice(3, 5), 16) * (1 - t) + parseInt(hex1.slice(3, 5), 16) * t);
  const b = Math.round(parseInt(hex0.slice(5, 7), 16) * (1 - t) + parseInt(hex1.slice(5, 7), 16) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Value 0–100 → white (0) → yellow (50) → red (100). */
function prevalenceToColor(value: number, min = 0, max = 100): string {
  const t = max > min ? (value - min) / (max - min) : 0;
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.5) return lerpHex(SCALE_LOW, SCALE_MID, clamped * 2);
  return lerpHex(SCALE_MID, SCALE_HIGH, (clamped - 0.5) * 2);
}

/** Dark text on white/yellow, white text on red. */
function textColorForPrevalence(value: number, min = 0, max = 100): string {
  const t = max > min ? (value - min) / (max - min) : 0;
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped > 0.65) return '#fff';
  return '#1e293b';
}

/** Domain heatmap row: label, color, value per year; optional breakdown for Others. fullLabel = full text for tooltip (Sub-Area: SubareaName/Domain). */
interface HeatmapRow {
  label: string;
  color: string;
  values: Record<number, number>;
  /** When set (Sub-Area rows), shown on hover in first column; format SubareaName/Domain. */
  fullLabel?: string;
}

interface HeatmapFigureProps {
  title: string;
  categoryLabel: 'Domain' | 'Sub-Area';
  rows: HeatmapRow[];
  years: number[];
  othersBreakdownByYear?: Record<number, { name: string; pct: number }[]>;
  /** Min/max for gradient (excluding Others). min=0, max=largest value in non-Others rows. */
  scaleMin: number;
  scaleMax: number;
}

const CELL_H = 36;
const LABEL_W = 220;
const SCALE_W = 52;

function HeatmapScale({ tableHeight, scaleMin, scaleMax }: { tableHeight: number; scaleMin: number; scaleMax: number }) {
  const min = scaleMin;
  const max = scaleMax > min ? scaleMax : min + 1;
  const mid = (min + max) / 2;
  const q1 = min + (max - min) * 0.25;
  const q3 = min + (max - min) * 0.75;
  return (
    <div className="flex flex-col shrink-0" style={{ width: SCALE_W }}>
      <div className="text-slate-500 text-[10px] font-medium uppercase tracking-wider mb-1 whitespace-nowrap truncate" title="Prevalence (%)">
        Prev. (%)
      </div>
      <div className="relative shrink-0 flex" style={{ height: tableHeight }}>
        <div className="flex flex-col justify-between py-0.5 text-[10px] font-medium text-slate-600 leading-none shrink-0 pr-1">
          <span>{max.toFixed(1)}</span>
          <span>{mid.toFixed(1)}</span>
          <span>{min.toFixed(1)}</span>
        </div>
        <div
          className="w-3 rounded border border-slate-200 shrink-0"
          style={{
            height: '100%',
            background: `linear-gradient(to top, ${prevalenceToColor(min, min, max)}, ${prevalenceToColor(q1, min, max)}, ${prevalenceToColor(mid, min, max)}, ${prevalenceToColor(q3, min, max)}, ${prevalenceToColor(max, min, max)})`,
          }}
        />
      </div>
    </div>
  );
}

type OthersPanelState = {
  year: number;
  categoryLabel: 'Domain' | 'Sub-Area';
  breakdown: { name: string; pct: number }[] | undefined;
  numVal: number;
} | null;

const OTHERS_PANEL_MIN_W = 320;
const OTHERS_PANEL_DEFAULT_W = 440;

function HeatmapFigure({ title, categoryLabel, rows, years, othersBreakdownByYear, scaleMin, scaleMax }: HeatmapFigureProps) {
  const [hoveredCell, setHoveredCell] = useState<{ year: number } | null>(null);
  const [openPanel, setOpenPanel] = useState<OthersPanelState>(null);
  const [panelPosition, setPanelPosition] = useState({ x: 200, y: 200 });
  const [panelWidth, setPanelWidth] = useState(OTHERS_PANEL_DEFAULT_W);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelPositionRef = useRef(panelPosition);
  const resizeStartRef = useRef({ clientX: 0, width: OTHERS_PANEL_DEFAULT_W });

  panelPositionRef.current = panelPosition;

  useEffect(() => {
    if (!isDraggingPanel) return;
    const onMove = (e: MouseEvent) => {
      setPanelPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };
    const onUp = () => setIsDraggingPanel(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingPanel, dragOffset]);

  useEffect(() => {
    if (!isResizingPanel) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartRef.current.clientX;
      setPanelWidth(Math.max(OTHERS_PANEL_MIN_W, resizeStartRef.current.width + delta));
    };
    const onUp = () => setIsResizingPanel(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizingPanel]);

  const openOthersPanel = (
    year: number,
    breakdown: { name: string; pct: number }[] | undefined,
    numVal: number,
    clickClientX: number,
    clickClientY: number
  ) => {
    setOpenPanel({ year, categoryLabel, breakdown, numVal });
    const w = OTHERS_PANEL_DEFAULT_W;
    const h = 320; // approximate panel height for viewport clamp
    const gap = 12;
    // Place panel just next to cursor (right and down), keep in viewport
    const x = Math.min(
      Math.max(8, clickClientX + gap),
      typeof window !== 'undefined' ? window.innerWidth - w - 8 : clickClientX + gap
    );
    const y = Math.min(
      Math.max(8, clickClientY + gap),
      typeof window !== 'undefined' ? window.innerHeight - h - 8 : clickClientY + gap
    );
    setPanelWidth(w);
    setPanelPosition({ x, y });
  };

  const closePanel = () => setOpenPanel(null);

  const renderBreakdownContent = (year: number, breakdown: { name: string; pct: number }[] | undefined, numVal: number) => (
    <>
      <div className="font-semibold mb-2 text-white">
        Others breakdown – {categoryLabel === 'Domain' ? 'Domains' : 'Sub-areas'} ({year})
      </div>
      {breakdown && breakdown.length > 0 ? (
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {breakdown.map(({ name, pct }) => (
            <li key={name} className="flex justify-between gap-2 min-w-0">
              <span className="break-words min-w-0 flex-1">{name}</span>
              <span className="shrink-0">{pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      ) : numVal > 0 ? (
        <p className="text-slate-300">
          Breakdown unavailable for this year ({numVal.toFixed(1)}% in Others).
        </p>
      ) : (
        <p className="text-slate-300">
          No {categoryLabel === 'Domain' ? 'domains' : 'sub-areas'} in Others for this year.
        </p>
      )}
    </>
  );

  return (
    <figure className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm w-full min-w-0">
      <figcaption className="text-lg font-serif font-bold text-slate-800 mb-4">{title}</figcaption>
      <div className="w-full min-w-0 flex gap-4">
        <div
          className="min-w-0 flex-1 overflow-visible"
          style={{
            display: 'grid',
            gridTemplateColumns: `${LABEL_W}px repeat(${years.length}, 1fr)`,
            gridTemplateRows: `36px repeat(${rows.length}, ${CELL_H}px)`,
            gap: 0,
          }}
        >
          <div
            className="border-b border-r border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wider flex items-center px-2 min-w-0"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            {categoryLabel}
          </div>
          {years.map((year, j) => (
            <div
              key={year}
              className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium flex items-center justify-center min-w-0"
              style={{ gridColumn: j + 2, gridRow: 1 }}
            >
              {year}
            </div>
          ))}
          {rows.map((row, i) => {
            const isOthersRow = row.label === 'Others';
            const firstYear = years.length ? Number(years[0]) : 0;
            const firstYearBreakdown = isOthersRow && (othersBreakdownByYear?.[firstYear] ?? othersBreakdownByYear?.[years[0]]);
            const firstYearVal = isOthersRow ? (row.values[firstYear] ?? 0) : 0;
            return (
              <React.Fragment key={row.fullLabel ?? row.label}>
                <div
                  className={`border-b border-r border-slate-200 flex items-center pl-2 pr-2 text-xs font-medium text-slate-800 min-w-0 break-words ${isOthersRow ? 'cursor-pointer' : ''}`}
                  style={{
                    gridColumn: 1,
                    gridRow: i + 2,
                    borderLeftWidth: 4,
                    borderLeftColor: row.label === 'Others' ? '#e2e8f0' : row.color,
                    minHeight: CELL_H,
                    backgroundColor: '#fff',
                    whiteSpace: 'normal',
                  }}
                  title={row.fullLabel ?? row.label}
                  {...(isOthersRow
                    ? {
                        onMouseDown: (e: React.MouseEvent) => {
                          if (e.button === 0) {
                            e.preventDefault();
                            e.stopPropagation();
                            openOthersPanel(firstYear, firstYearBreakdown, firstYearVal, e.clientX, e.clientY);
                          }
                        },
                      }
                    : {})}
                >
                  {categoryLabel === 'Sub-Area' && row.label !== 'Others' ? (
                    <span className="block line-clamp-2 overflow-hidden break-words w-full" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                      {row.label}
                    </span>
                  ) : (
                    row.label
                  )}
                </div>
                {years.map((year, j) => {
                  const yr = Number(year);
                  const value = row.values[yr] ?? row.values[year] ?? 0;
                  const numVal = typeof value === 'number' ? value : 0;
                  const isOthers = row.label === 'Others';
                  const isHovered = hoveredCell?.year === year && isOthers;
                  const breakdown = isOthers && (othersBreakdownByYear?.[yr] ?? othersBreakdownByYear?.[year] ?? othersBreakdownByYear?.[String(year)]);
                  const bgColor = isOthers ? '#ffffff' : prevalenceToColor(numVal, scaleMin, scaleMax);
                  const textColor = isOthers ? '#1e293b' : textColorForPrevalence(numVal, scaleMin, scaleMax);
                  return (
                    <div
                      key={year}
                      className="border-b border-slate-200 flex items-center justify-center text-xs relative min-w-0 cursor-pointer"
                      style={{
                        gridColumn: j + 2,
                        gridRow: i + 2,
                        minHeight: CELL_H,
                        backgroundColor: bgColor,
                        color: textColor,
                      }}
                      onMouseEnter={() => setHoveredCell(isOthers ? { year } : null)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onMouseDown={(e) => {
                        if (isOthers && e.button === 0) {
                          e.preventDefault();
                          e.stopPropagation();
                          openOthersPanel(yr, breakdown, numVal, e.clientX, e.clientY);
                        }
                      }}
                    >
                      {typeof value === 'number' ? value.toFixed(1) : value}
                      {isHovered && isOthers && (
                        <div
                          className="absolute left-1/2 bottom-full z-50 mb-1 -translate-x-1/2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg border border-slate-600 pointer-events-none"
                          role="tooltip"
                        >
                          {renderBreakdownContent(yr, breakdown, numVal)}
                          <p className="mt-2 text-slate-300 text-[10px]">Click cell to open full panel</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
        <HeatmapScale tableHeight={36 + rows.length * CELL_H} scaleMin={scaleMin} scaleMax={scaleMax} />
      </div>

      {/* Draggable, resizable Others breakdown panel (click to open, drag header to move, drag right edge to resize, X to close) */}
      {openPanel && openPanel.categoryLabel === categoryLabel && (
        <div
          className="bg-white shadow-2xl rounded-xl border border-slate-200 overflow-hidden flex flex-col z-[100]"
          style={{
            position: 'fixed',
            left: panelPosition.x,
            top: panelPosition.y,
            width: panelWidth,
            minWidth: OTHERS_PANEL_MIN_W,
            cursor: isDraggingPanel ? 'grabbing' : 'default',
          }}
        >
          <div
            className="cursor-grab active:cursor-grabbing bg-slate-800 text-white px-3 py-2 flex items-center justify-between select-none border-b border-slate-600"
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              e.preventDefault();
              setIsDraggingPanel(true);
              setDragOffset({
                x: e.clientX - panelPositionRef.current.x,
                y: e.clientY - panelPositionRef.current.y,
              });
            }}
          >
            <span className="text-xs font-semibold truncate min-w-0">
              Others – {openPanel.categoryLabel === 'Domain' ? 'Domains' : 'Sub-areas'} ({openPanel.year})
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); closePanel(); }}
              className="text-slate-300 hover:text-white p-1 rounded transition-colors shrink-0"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-3 bg-slate-800 text-white text-xs max-h-72 overflow-y-auto min-w-0" onMouseDown={(e) => e.stopPropagation()}>
            {renderBreakdownContent(openPanel.year, openPanel.breakdown, openPanel.numVal)}
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-slate-600 active:bg-slate-500"
            title="Drag to resize"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              resizeStartRef.current = { clientX: e.clientX, width: panelWidth };
              setIsResizingPanel(true);
            }}
            style={{ touchAction: 'none' }}
          />
        </div>
      )}
    </figure>
  );
}

const ThematicAtlas: React.FC<Props> = ({ data, domains: domainsProp, papers: papersProp, publicationTrendsBySource, fullCorpusTotal }) => {
  const { papers: contextPapers, activeModel, availableModels } = useData();
  const domains = domainsProp ?? DOMAINS;
  const papersForThematic = useMemo(() => {
    if (papersProp?.length) return papersProp;
    if (!contextPapers?.length || !data.length) return [];
    const years = new Set(data.map(d => d.year));
    return contextPapers.filter(p => years.has(p.year));
  }, [papersProp, contextPapers, data]);

  const { domainHeatmapRows, domainYears, domainOthersBreakdown, domainScaleMin, domainScaleMax, subAreaHeatmapRows, subAreaYears, subAreaOthersBreakdown, subAreaScaleMin, subAreaScaleMax } = useMemo(() => {
    if (!papersForThematic.length) {
      return {
        domainHeatmapRows: [] as HeatmapRow[],
        domainYears: [] as number[],
        domainOthersBreakdown: undefined as Record<number, { name: string; pct: number }[]> | undefined,
        domainScaleMin: 0,
        domainScaleMax: 100,
        subAreaHeatmapRows: [] as HeatmapRow[],
        subAreaYears: [] as number[],
        subAreaOthersBreakdown: undefined as Record<number, { name: string; pct: number }[]> | undefined,
        subAreaScaleMin: 0,
        subAreaScaleMax: 100,
      };
    }

    const domainById = (id: string) => getDomainById(domains, id);
    const domainName = (id: string) => domainById(id)?.name ?? (id === 'UNK' ? 'Unclassified' : id);

    // --- Domain: count by year x domainId (all papers; so "Others" breakdown shows the other 6 domains) ---
    const byYearDomain: Record<number, Record<string, number>> = {};
    const yearTotalsDomain: Record<number, number> = {};
    papersForThematic.forEach(p => {
      const y = p.year;
      yearTotalsDomain[y] = (yearTotalsDomain[y] || 0) + 1;
      const did = p.domainId != null && String(p.domainId).trim() !== '' ? String(p.domainId).trim() : 'UNK';
      if (!byYearDomain[y]) byYearDomain[y] = {};
      byYearDomain[y][did] = (byYearDomain[y][did] || 0) + 1;
    });
    const allYears = Object.keys(yearTotalsDomain).map(Number).sort((a, b) => a - b);
    const prevalenceDomain: Record<number, Record<string, number>> = {};
    allYears.forEach(y => {
      prevalenceDomain[y] = {};
      const total = yearTotalsDomain[y] || 1;
      Object.entries(byYearDomain[y] || {}).forEach(([did, count]) => {
        prevalenceDomain[y][did] = (count / total) * 100;
      });
    });
    // Top 10 domains by total prevalence across years; rest go into "Others"
    const domainIdsAll = [...domains]
      .filter(d => d.id != null && String(d.id).trim() !== '')
      .sort((a, b) => {
        const na = parseInt(String(a.id), 10);
        const nb = parseInt(String(b.id), 10);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return String(a.id).localeCompare(String(b.id));
      })
      .map(d => d.id);
    const domainSumAcrossYears: Record<string, number> = {};
    allYears.forEach(y => {
      Object.entries(prevalenceDomain[y] || {}).forEach(([did, pct]) => {
        domainSumAcrossYears[did] = (domainSumAcrossYears[did] || 0) + pct;
      });
    });
    const top10DomainIds = Object.entries(domainSumAcrossYears)
      .filter(([, sum]) => sum > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([did]) => did);
    const domainOthersBreakdown: Record<number, { name: string; pct: number }[]> = {};
    allYears.forEach(y => {
      const total = yearTotalsDomain[y] || 1;
      const othersEntries = domainIdsAll
        .filter(did => !top10DomainIds.includes(did))
        .map(did => ({ name: domainName(did), pct: prevalenceDomain[y]?.[did] ?? 0 }))
        .filter(o => o.pct > 0)
        .sort((a, b) => b.pct - a.pct);
      domainOthersBreakdown[y] = othersEntries;
    });
    const domainRows: HeatmapRow[] = top10DomainIds.map(did => {
      const d = domainById(did);
      const values: Record<number, number> = {};
      allYears.forEach(y => {
        values[y] = prevalenceDomain[y][did] ?? 0;
      });
      const fullName = domainName(did);
      return { label: fullName, color: d?.color ?? '#94a3b8', values };
    });
    // Others row for domains
    const domainOthersValues: Record<number, number> = {};
    allYears.forEach(y => {
      domainOthersValues[y] = domainIdsAll
        .filter(did => !top10DomainIds.includes(did))
        .reduce((sum, did) => sum + (prevalenceDomain[y]?.[did] ?? 0), 0);
    });
    domainRows.push({ label: 'Others', color: '#e2e8f0', values: domainOthersValues });

    // --- Sub-area: use as-is from papers (no re-normalization; data prepared upstream for 09) ---
    const byYearSub: Record<number, Record<string, number>> = {};
    const subAreaToDomainId: Record<string, string> = {};
    const subAreaDomainCounts: Record<string, Record<string, number>> = {};
    papersForThematic.forEach(p => {
      const y = p.year;
      const norm = (p.subArea ?? '').trim();
      if (!byYearSub[y]) byYearSub[y] = {};
      byYearSub[y][norm] = (byYearSub[y][norm] || 0) + 1;
      subAreaToDomainId[norm] = subAreaToDomainId[norm] ?? p.domainId;
      if (!subAreaDomainCounts[norm]) subAreaDomainCounts[norm] = {};
      subAreaDomainCounts[norm][p.domainId] = (subAreaDomainCounts[norm][p.domainId] || 0) + 1;
    });
    const allYearsSub = Object.keys(byYearSub).map(Number).sort((a, b) => a - b);
    const yearTotalsSub: Record<number, number> = {};
    allYearsSub.forEach(y => {
      yearTotalsSub[y] = Object.values(byYearSub[y] || {}).reduce((a, b) => a + b, 0);
    });
    const prevalenceSub: Record<number, Record<string, number>> = {};
    allYearsSub.forEach(y => {
      prevalenceSub[y] = {};
      const total = yearTotalsSub[y] || 1;
      Object.entries(byYearSub[y] || {}).forEach(([sub, count]) => {
        prevalenceSub[y][sub] = (count / total) * 100;
      });
    });
    const subSumAcrossYears: Record<string, number> = {};
    allYearsSub.forEach(y => {
      Object.entries(prevalenceSub[y] || {}).forEach(([sub, pct]) => {
        subSumAcrossYears[sub] = (subSumAcrossYears[sub] || 0) + pct;
      });
    });
    const top10SubAreas = Object.entries(subSumAcrossYears)
      .filter(([s]) => s.trim() !== '')
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([s]) => s);

    const dominantDomainForSub = (sub: string): string => {
      const counts = subAreaDomainCounts[sub];
      if (!counts) return subAreaToDomainId[sub] ?? 'UNK';
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'UNK';
    };
    const subAreaRows: HeatmapRow[] = top10SubAreas.map(sub => {
      const did = dominantDomainForSub(sub);
      const d = domainById(did);
      const domainNameStr = domainName(did) || String(did) || 'Unclassified';
      const subAreaLabel = `${sub}/${domainNameStr}`;
      const values: Record<number, number> = {};
      allYearsSub.forEach(y => {
        values[y] = prevalenceSub[y][sub] ?? 0;
      });
      return { label: sub, fullLabel: subAreaLabel, color: d?.color ?? '#94a3b8', values };
    });
    // Others row for sub-areas: breakdown shows SubareaName/Domain
    const subAreaOthersBreakdown: Record<number, { name: string; pct: number }[]> = {};
    allYearsSub.forEach(y => {
      const othersEntries = Object.entries(prevalenceSub[y] || {})
        .filter(([sub]) => sub.trim() !== '' && !top10SubAreas.includes(sub))
        .map(([sub, pct]) => ({
          name: `${sub}/${domainName(dominantDomainForSub(sub)) || dominantDomainForSub(sub) || 'Unclassified'}`,
          pct,
        }))
        .filter(o => o.pct > 0)
        .sort((a, b) => b.pct - a.pct);
      subAreaOthersBreakdown[y] = othersEntries;
    });
    const subAreaOthersValues: Record<number, number> = {};
    allYearsSub.forEach(y => {
      subAreaOthersValues[y] = Object.entries(prevalenceSub[y] || {})
        .filter(([sub]) => sub.trim() !== '' && !top10SubAreas.includes(sub))
        .reduce((sum, [, pct]) => sum + pct, 0);
    });
    subAreaRows.push({ label: 'Others', color: '#e2e8f0', values: subAreaOthersValues });

    // Min/max for gradient: exclude Others. min=0, max=largest value in non-Others rows.
    const domainNonOthersValues = domainRows.filter(r => r.label !== 'Others').flatMap(r => Object.values(r.values));
    const subAreaNonOthersValues = subAreaRows.filter(r => r.label !== 'Others').flatMap(r => Object.values(r.values));
    const domainScaleMax = domainNonOthersValues.length ? Math.max(...domainNonOthersValues) : 100;
    const subAreaScaleMax = subAreaNonOthersValues.length ? Math.max(...subAreaNonOthersValues) : 100;

    return {
      domainHeatmapRows: domainRows,
      domainYears: allYears,
      domainOthersBreakdown,
      domainScaleMin: 0,
      domainScaleMax,
      subAreaHeatmapRows: subAreaRows,
      subAreaYears: allYearsSub,
      subAreaOthersBreakdown,
      subAreaScaleMin: 0,
      subAreaScaleMax,
    };
  }, [papersForThematic, domains]);

  const hasHeatmapData = domainHeatmapRows.length > 0 && subAreaHeatmapRows.length > 0;

  const { totalInRange, classifiedInRange } = useMemo(() => {
    // Total = sum of merged papers from publication trends (full corpus) for the selected year range
    const total =
      publicationTrendsBySource?.length
        ? publicationTrendsBySource.reduce((acc, r) => acc + (r.merged ?? 0), 0)
        : 0;

    const activeModelInfo = activeModel && availableModels?.length ? availableModels.find(m => m.id === activeModel) : null;
    const isFullRange = fullCorpusTotal != null && fullCorpusTotal > 0 && total === fullCorpusTotal;

    let classified: number;
    if (activeModelInfo != null) {
      if (isFullRange) {
        // Full range: use total classified from model metadata
        classified = activeModelInfo.classified;
      } else if (activeModelInfo.classifiedByYear) {
        // Partial range: sum classified papers for the years in publicationTrendsBySource
        const yearsInRange = new Set(publicationTrendsBySource?.map(r => r.year) ?? []);
        classified = Object.entries(activeModelInfo.classifiedByYear)
          .filter(([year]) => yearsInRange.has(Number(year)))
          .reduce((sum, [, count]) => sum + (count as number), 0);
      } else {
        // Fallback: count papers with valid domainId
        classified = papersForThematic.filter(
          p => p.domainId != null && String(p.domainId).trim() !== '' && p.domainId !== 'UNK'
        ).length;
      }
    } else {
      // No model info: fallback to counting papers with domainId
      classified = papersForThematic.filter(
        p => p.domainId != null && String(p.domainId).trim() !== '' && p.domainId !== 'UNK'
      ).length;
    }

    return { totalInRange: total, classifiedInRange: classified };
  }, [publicationTrendsBySource, papersForThematic, activeModel, availableModels, fullCorpusTotal]);

  return (
    <div className="space-y-6 animate-fade-in">
      <p className="text-sm text-slate-500">
        Model inference: prevalence (%) of top {TOP_N} domains and top {TOP_N} sub-areas by year; remaining categories shown as Others (hover for breakdown). Time range follows the global filter.
      </p>
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
        <strong>Thematic coverage:</strong> Classification is based only on papers with a <strong>valid abstract</strong> (non-null and more than 50 characters). Papers without such an abstract are excluded from the LLM step.{' '}
        {totalInRange > 0 && (
          <>
            For the selected period: <strong>{classifiedInRange.toLocaleString()}</strong> of <strong>{totalInRange.toLocaleString()}</strong> papers are classified.
          </>
        )}
      </p>
      {hasHeatmapData ? (
        <div className="flex flex-col gap-8 w-full">
          <HeatmapFigure
            title="IISE Domain Evolution Over Time (10 domains + Others)"
            categoryLabel="Domain"
            rows={domainHeatmapRows}
            years={domainYears}
            othersBreakdownByYear={domainOthersBreakdown}
            scaleMin={domainScaleMin}
            scaleMax={domainScaleMax}
          />
          <HeatmapFigure
            title="IISE Sub-Area Evolution Over Time (Top 10 + Others)"
            categoryLabel="Sub-Area"
            rows={subAreaHeatmapRows}
            years={subAreaYears}
            othersBreakdownByYear={subAreaOthersBreakdown}
            scaleMin={subAreaScaleMin}
            scaleMax={subAreaScaleMax}
          />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
          No thematic data in the selected time range. Adjust the year slider or load a model with classifications.
        </div>
      )}
    </div>
  );
};

export default ThematicAtlas;
