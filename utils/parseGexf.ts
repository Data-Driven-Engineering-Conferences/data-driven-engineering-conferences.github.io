/**
 * Parse GEXF (Gephi) XML into NetworkData for the Community graph.
 * Uses layout (viz:position), colors (viz:color), and size (viz:size) from the file.
 */

import type { NetworkData, GraphNode, GraphLink } from '../types';

const GEXF_NS = 'http://gexf.net/1.3';
const VIZ_NS = 'http://gexf.net/1.3/viz';

function rgbToHex(r: number, g: number, b: number): string {
  const rr = Math.max(0, Math.min(255, Math.round(r)));
  const gg = Math.max(0, Math.min(255, Math.round(g)));
  const bb = Math.max(0, Math.min(255, Math.round(b)));
  return '#' + [rr, gg, bb].map(x => x.toString(16).padStart(2, '0')).join('');
}

/** Find viz child by local name (works even if parser doesn't resolve viz namespace). */
function getVizChild(parent: Element, localName: string): Element | null {
  const byNs = parent.getElementsByTagNameNS(VIZ_NS, localName)[0];
  if (byNs) return byNs;
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    if (el.localName === localName) return el;
    // Some parsers expose viz:color as tagName "viz:color" or "color"
    const tag = (el as Element & { tagName?: string }).tagName ?? '';
    if (tag === localName || tag === `viz:${localName}` || tag.endsWith(`:${localName}`)) return el;
  }
  return null;
}

/** Read RGB from viz:color element (try multiple attribute names for parser quirks). */
function getRgbFromColorEl(colorEl: Element): { r: number; g: number; b: number } | null {
  const get = (key: string) => {
    const v = colorEl.getAttribute(key) ?? colorEl.getAttributeNS(null, key);
    if (v != null) return parseFloat(v);
    return NaN;
  };
  const r = get('r');
  const g = get('g');
  const b = get('b');
  if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return { r, g, b };
  return null;
}

function getAttValue(nodeEl: Element, attrId: string): string | null {
  const attvalues = nodeEl.getElementsByTagNameNS(GEXF_NS, 'attvalues')[0];
  if (!attvalues) return null;
  const list = attvalues.getElementsByTagNameNS(GEXF_NS, 'attvalue');
  for (let i = 0; i < list.length; i++) {
    if (list[i].getAttribute('for') === attrId) return list[i].getAttribute('value');
  }
  return null;
}

/**
 * Parse GEXF XML string into NetworkData.
 * @param xmlText - Raw GEXF file content
 * @param options - coauthorship: all nodes are author; citation: use author_type for nodeType, default author
 */
export function parseGexf(
  xmlText: string,
  options: { coauthorship?: boolean; citation?: boolean } = {}
): NetworkData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('GEXF parse error: ' + (parseError.textContent || 'Invalid XML'));
  }

  const graph = doc.getElementsByTagNameNS(GEXF_NS, 'graph')[0];
  if (!graph) throw new Error('GEXF: missing graph');

  const nodeList = graph.getElementsByTagNameNS(GEXF_NS, 'node');
  const nodeMap = new Map<string, GraphNode>();

  for (let i = 0; i < nodeList.length; i++) {
    const n = nodeList[i];
    const id = n.getAttribute('id') ?? '';
    const label = n.getAttribute('label') ?? id;

    // viz (use helper so we find viz:position, viz:color, viz:size even if namespace differs)
    const pos = getVizChild(n, 'position');
    const colorEl = getVizChild(n, 'color');
    const sizeEl = getVizChild(n, 'size');

    const x = pos ? parseFloat(pos.getAttribute('x') ?? pos.getAttributeNS(null, 'x') ?? '0') : 0;
    const y = pos ? parseFloat(pos.getAttribute('y') ?? pos.getAttributeNS(null, 'y') ?? '0') : 0;
    // Always prefer GEXF viz:color; default only when element or RGB is missing
    let color = '#94a3b8';
    if (colorEl) {
      const hex = colorEl.getAttribute('hex') ?? colorEl.getAttributeNS(null, 'hex');
      if (hex) {
        color = hex.startsWith('#') ? hex : '#' + hex;
      } else {
        const rgb = getRgbFromColorEl(colorEl);
        if (rgb) color = rgbToHex(rgb.r, rgb.g, rgb.b);
      }
    }
    const val = sizeEl ? parseFloat(sizeEl.getAttribute('value') ?? sizeEl.getAttributeNS(null, 'value') ?? '5') : 5;

    // attributes: cluster (group), paper_count (d1), author_type (citation)
    let group = '';
    const clusterVal = getAttValue(n, 'cluster');
    if (clusterVal != null) group = `Cluster ${clusterVal}`;

    // paper_count in GEXF = count of papers within top 200 most-cited subset (not total IISE papers)
    let topCitedPaperCount: number | undefined;
    const paperCountStr = getAttValue(n, 'd1');
    if (paperCountStr != null) {
      const pc = parseInt(paperCountStr, 10);
      if (!Number.isNaN(pc)) topCitedPaperCount = pc;
    }

    let nodeType: 'author' | 'paper' = 'author';
    if (options.coauthorship) nodeType = 'author';
    else if (options.citation) {
      const authorType = getAttValue(n, 'd3'); // author_type in citation GEXF
      nodeType = authorType === 'source' || authorType === 'citing' ? 'author' : 'author';
      // If you add paper GEXF with node type, we could set nodeType = 'paper' from an attribute
    }

    const node: GraphNode = {
      id,
      label,
      fullLabel: label,
      group: group || 'unknown',
      val,
      color,
      nodeType,
      x,
      y,
    };
    if (topCitedPaperCount !== undefined) node.topCitedPaperCount = topCitedPaperCount;
    nodeMap.set(id, node);
  }

  const nodes = Array.from(nodeMap.values());

  const edgeList = graph.getElementsByTagNameNS(GEXF_NS, 'edge');
  const links: GraphLink[] = [];
  for (let i = 0; i < edgeList.length; i++) {
    const e = edgeList[i];
    const sourceId = e.getAttribute('source');
    const targetId = e.getAttribute('target');
    const weight = parseFloat(e.getAttribute('weight') ?? '1');
    if (sourceId && targetId && nodeMap.has(sourceId) && nodeMap.has(targetId)) {
      links.push({
        source: nodeMap.get(sourceId)!,
        target: nodeMap.get(targetId)!,
        value: weight,
      });
    }
  }

  return { nodes, links };
}
