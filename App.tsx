import React, { useState, useMemo } from 'react';
import { START_YEAR, END_YEAR } from './constants';
import { ViewMode } from './types';
import { useData } from './context/DataContext';
import Header from './components/Header';
import { Loader2 } from 'lucide-react';
import UploadDataModal from './components/UploadDataModal';
import GlobalFilter from './components/GlobalFilter';
import ClustrMapsGlobe from './components/ClustrMapsGlobe';
import ScrollToTop from './components/ScrollToTop';
import Overview from './components/views/Overview';
import ThematicAtlas from './components/views/ThematicAtlas';
import Community from './components/views/Community';
import Authors from './components/views/Authors';
import Archive from './components/views/Archive';
import { LayoutDashboard, Map, Network, Users, Database } from 'lucide-react';

const App: React.FC = () => {
  const { yearlyStats, publicationTrendsBySource, papers, domains, setLoadedData, isDataLoading, authorsLoading, setAuthorsLoading, loadingMessage } = useData();

  const [isTabSwitching, setIsTabSwitching] = useState(false);

  const handleTabClick = (tabId: ViewMode) => {
    if (tabId === activeTab) return; // Already on this tab

    // Always clear tab switching state when changing tabs
    setIsTabSwitching(false);

    // Show loading indicator immediately for tabs with heavy content
    const heavyTabs: ViewMode[] = ['AUTHORS', 'COMMUNITY', 'THEMATIC', 'ARCHIVE'];
    if (heavyTabs.includes(tabId)) {
      setIsTabSwitching(true);
      if (tabId === 'AUTHORS') setAuthorsLoading(true);
      // Use setTimeout to ensure loading bar renders BEFORE expensive tab switch
      setTimeout(() => {
        setActiveTab(tabId);
        // Clear switching state after tab renders (AUTHORS uses authorsLoading instead)
        setTimeout(() => setIsTabSwitching(false), 100);
      }, 10);
    } else {
      setActiveTab(tabId);
    }
  };
  const [activeTab, setActiveTab] = useState<ViewMode>('OVERVIEW');
  const [yearRange, setYearRange] = useState<[number, number]>([START_YEAR, END_YEAR]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const filteredStats = useMemo(() => {
    return yearlyStats.filter(s => s.year >= yearRange[0] && s.year <= yearRange[1]);
  }, [yearlyStats, yearRange]);

  const filteredPublicationTrends = useMemo(() => {
    return publicationTrendsBySource.filter(r => r.year >= yearRange[0] && r.year <= yearRange[1]);
  }, [publicationTrendsBySource, yearRange]);

  const fullCorpusTotal = useMemo(
    () => publicationTrendsBySource.reduce((acc, r) => acc + (r.merged ?? 0), 0),
    [publicationTrendsBySource]
  );

  const filteredPapers = useMemo(() => {
    return papers.filter(p => p.year >= yearRange[0] && p.year <= yearRange[1]);
  }, [papers, yearRange]);

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
    { id: 'THEMATIC', label: 'Thematic Atlas', icon: Map },
    { id: 'COMMUNITY', label: 'Community', icon: Network },
    { id: 'AUTHORS', label: 'Authors', icon: Users },
    { id: 'ARCHIVE', label: 'Archive', icon: Database },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Global loading indicator - visible on all tabs (initial load + tab switching) */}
      {(isDataLoading || authorsLoading || isTabSwitching) && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600 text-white shadow-lg">
          <div className="relative flex items-center justify-center gap-3 py-3 px-4">
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            <span className="font-medium">{authorsLoading ? 'Loading Authors tab…' : isTabSwitching ? 'Switching tab…' : (loadingMessage || 'Loading data…')}</span>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400/50 overflow-hidden">
              <div
                className="absolute top-0 h-full w-1/3 bg-white/90"
                style={{ left: '-33%', animation: 'loading-bar 1.2s ease-in-out infinite' }}
              />
            </div>
          </div>
        </div>
      )}

      <div className={(isDataLoading || authorsLoading || isTabSwitching) ? 'pt-14' : ''}>
        <Header 
          onOpenUploadData={() => setIsUploadModalOpen(true)}
          activeView={activeTab}
        />
        
        <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <nav className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-fit mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as ViewMode)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="min-h-[600px]">
          {activeTab === 'OVERVIEW' && <Overview data={filteredStats} publicationTrendsBySource={filteredPublicationTrends} domains={domains} />}
          {activeTab === 'THEMATIC' && <ThematicAtlas data={filteredStats} domains={domains} papers={filteredPapers} publicationTrendsBySource={filteredPublicationTrends} fullCorpusTotal={fullCorpusTotal} />}
          {activeTab === 'COMMUNITY' && <Community />}
          {activeTab === 'AUTHORS' && <Authors />}
          {activeTab === 'ARCHIVE' && <Archive data={filteredPapers} domains={domains} />}
        </div>
        </main>
      </div>

      {/* Scroll to top - appears when scrolled down */}
      <ScrollToTop />

      {/* ClustrMaps visitor globe */}
      <ClustrMapsGlobe />

      {/* Global Controls */}
      <GlobalFilter yearRange={yearRange} setYearRange={setYearRange} />
      
      {/* Modals */}
      <UploadDataModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onDataLoaded={setLoadedData} />
    </div>
  );
};

export default App;