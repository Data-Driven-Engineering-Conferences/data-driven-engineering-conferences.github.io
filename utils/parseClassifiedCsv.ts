/**
 * Parse complete_classified_papers_new.csv (or similar) and build a lookup map
 * by normalized title|year so Archive can show primary_domain from the CSV.
 */

export interface ClassifiedRow {
  primary_domain: string;
  primary_sub_area: string;
  confidence: string;
}

/** Parse CSV line handling quoted fields (fields may contain commas). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1;
      let field = '';
      while (i < line.length) {
        if (line[i] === '"') {
          i += 1;
          if (line[i] === '"') {
            field += '"';
            i += 1;
          } else break;
        } else {
          field += line[i];
          i += 1;
        }
      }
      out.push(field);
    } else {
      const comma = line.indexOf(',', i);
      if (comma === -1) {
        out.push(line.slice(i).trim());
        break;
      }
      out.push(line.slice(i, comma).trim());
      i = comma + 1;
    }
  }
  return out;
}

function normalizeTitle(title: string): string {
  return (title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['']$/g, '') // match CSV titles that have trailing apostrophe
    .trim();
}

/**
 * Parse CSV text and return a map: key = `${normalize(title)}|${year}` -> ClassifiedRow.
 * CSV columns expected: title, year, primary_domain, primary_sub_area, confidence.
 */
export function parseClassifiedCsvToMap(csvText: string): Record<string, ClassifiedRow> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return {};

  const header = parseCsvLine(lines[0]);
  const titleIdx = header.findIndex((c) => c.toLowerCase() === 'title');
  const yearIdx = header.findIndex((c) => c.toLowerCase() === 'year');
  const primaryDomainIdx = header.findIndex((c) => c.toLowerCase() === 'primary_domain');
  const primarySubAreaIdx = header.findIndex((c) => c.toLowerCase() === 'primary_sub_area');
  const confidenceIdx = header.findIndex((c) => c.toLowerCase() === 'confidence');

  if (
    titleIdx === -1 ||
    yearIdx === -1 ||
    primaryDomainIdx === -1 ||
    primarySubAreaIdx === -1 ||
    confidenceIdx === -1
  ) {
    return {};
  }

  const map: Record<string, ClassifiedRow> = {};
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length <= Math.max(titleIdx, yearIdx, primaryDomainIdx, primarySubAreaIdx, confidenceIdx))
      continue;
    const title = (row[titleIdx] ?? '').trim();
    const yearRaw = row[yearIdx] ?? '';
    const year = String(Math.max(1990, Math.min(2030, parseInt(yearRaw, 10) || 2002)));
    const key = `${normalizeTitle(title)}|${year}`;
    map[key] = {
      primary_domain: (row[primaryDomainIdx] ?? '').trim(),
      primary_sub_area: (row[primarySubAreaIdx] ?? '').trim(),
      confidence: (row[confidenceIdx] ?? 'Medium').trim() || 'Medium',
    };
  }
  return map;
}

/** Build lookup key for a paper (title + year) to match CSV rows. */
export function paperKey(title: string, year: number): string {
  return `${normalizeTitle(title)}|${year}`;
}
