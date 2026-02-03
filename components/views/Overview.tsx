import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { YearlyStats, Domain, PublicationTrendsBySourceRow } from '../../types';
import { DOMAINS } from '../../constants';

const SOURCE_COLORS = {
  merged: '#808080',
  proquest: '#228B22',
  google_scholar: '#87CEEB',
} as const;

interface Props {
  data: YearlyStats[];
  publicationTrendsBySource?: PublicationTrendsBySourceRow[];
  domains?: Domain[];
}

const Overview: React.FC<Props> = ({ data, publicationTrendsBySource = [], domains: domainsProp }) => {
  const domains = domainsProp ?? DOMAINS;

  // Bar chart data: year-by-year papers by source (Merged, ProQuest, Google Scholar).
  // Prefer publication_trends_by_source; fallback to merged-only from yearly stats so the chart always shows when data exists.
  const barChartData =
    publicationTrendsBySource.length > 0
      ? publicationTrendsBySource.map(r => ({
          year: r.year,
          Merged: r.merged,
          ProQuest: r.proquest,
          'Google Scholar': r.google_scholar,
        }))
      : data.map(d => ({
          year: d.year,
          Merged: d.totalPapers,
          ProQuest: 0,
          'Google Scholar': 0,
        }));

  // Full-corpus total: use same source as Thematic Atlas (publication_trends_by_source merged) so Overview and Thematic Atlas totals match.
  const totalPapers =
    publicationTrendsBySource.length > 0
      ? publicationTrendsBySource.reduce((acc, r) => acc + (r.merged ?? 0), 0)
      : data.reduce((acc, curr) => acc + curr.totalPapers, 0);
  const totalCitations = data.reduce((acc, curr) => acc + curr.totalCitations, 0);
  const totalPapersWithCitationData = data.reduce((acc, curr) => acc + (curr.papersWithCitationData ?? 0), 0);
  const hasCoverageData = data.some(s => s.papersWithCitationData !== undefined);
  const coveragePct = hasCoverageData && totalPapers > 0 ? (totalPapersWithCitationData / totalPapers) * 100 : null;
  const avgCitationsPerPaper = totalPapers > 0 ? totalCitations / totalPapers : 0;
  const peakYear =
    barChartData.length > 0
      ? barChartData.reduce((max, curr) => (curr.Merged > max.Merged ? curr : max), barChartData[0]).year
      : data.length
        ? data.reduce((max, curr) => (curr.totalPapers > max.totalPapers ? curr : max), data[0]).year
        : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total Papers</div>
          <div className="text-3xl font-serif font-bold text-slate-900">{totalPapers.toLocaleString()}</div>
          <div
            className="text-xs text-green-600 mt-2 font-medium cursor-help"
            title="Share of papers in the selected year range that have at least one citation in our data (from Google Scholar). Coverage = (papers with citations > 0) ÷ total papers."
          >
            {coveragePct != null ? `${coveragePct.toFixed(1)}% Citation coverage` : '—'}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total Citations</div>
          <div className="text-3xl font-serif font-bold text-slate-900">{totalCitations.toLocaleString()}</div>
          <div
            className="text-xs text-blue-600 mt-2 font-medium cursor-help"
            title="Average citations per paper over the selected year range. Equals Total Citations ÷ Total Papers (so it matches the numbers shown above)."
          >
            ~{avgCitationsPerPaper.toFixed(1)} cites per paper avg
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Peak Volume Year</div>
          <div className="text-3xl font-serif font-bold text-slate-900">{peakYear}</div>
        </div>
      </div>

      {/* Main Chart: Publication trends by data source (Merged, ProQuest, Google Scholar) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-serif font-bold text-slate-800 mb-6">IISE Publication Trends by Data Source (2002–2025)</h3>
        {barChartData.length > 0 ? (
          <div className="w-full min-h-[360px]" style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={360}>
            <BarChart
              data={barChartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              barCategoryGap="8%"
              barGap={4}
            >
              <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} label={{ value: 'Number of Papers', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '12px' }}
                labelStyle={{ fontFamily: 'Merriweather, serif', fontWeight: 'bold', marginBottom: '8px' }}
                formatter={(value: number) => [value.toLocaleString(), undefined]}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Merged" name="Merged" fill={SOURCE_COLORS.merged} radius={[2, 2, 0, 0]} />
              <Bar dataKey="ProQuest" name="ProQuest" fill={SOURCE_COLORS.proquest} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Google Scholar" name="Google Scholar" fill={SOURCE_COLORS.google_scholar} radius={[2, 2, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Publication trends by source not available. Run 09_web_data_generation with raw ProQuest and Google Scholar data to generate publication_trends_by_source.json.
          </div>
        )}
      </div>
    </div>
  );
};

export default Overview;