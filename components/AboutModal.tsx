import React from 'react';
import { X, Github, Database, AlertCircle, ExternalLink } from 'lucide-react';

const ABSTRACT_ID = '16759';
const PAPER_TITLE = 'A Data-Driven Analysis for Engineering Conferences: the Institute of Industrial and Systems Engineering (IISE) Annual Conference Proceedings (2002-2025)';
const GITHUB_URL = 'https://github.com/Data-Driven-Engineering-Conferences/data-driven-engineering-conferences-iise2026-codebase_dev';
const DATAVERSE_URL = 'https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/YW4IJG';
const GITHUB_ISSUE_URL = `${GITHUB_URL}/issues/new?template=data_correction.yml`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-serif font-bold text-slate-900">About This Project</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Paper Info */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Paper</h3>
            <p className="text-lg font-serif font-semibold text-slate-900">{PAPER_TITLE}</p>
            <p className="text-sm text-slate-500 mt-1">Abstract ID: {ABSTRACT_ID}</p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Resources</h3>
            <div className="space-y-2">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
              >
                <div className="p-2 bg-slate-900 rounded-lg text-white">
                  <Github size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">GitHub Repository</div>
                  <div className="text-sm text-slate-500">Source code and documentation</div>
                </div>
                <ExternalLink size={16} className="text-slate-400" />
              </a>

              <a
                href={DATAVERSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
              >
                <div className="p-2 bg-red-600 rounded-lg text-white">
                  <Database size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">Harvard Dataverse</div>
                  <div className="text-sm text-slate-500">Dataset and research data</div>
                </div>
                <ExternalLink size={16} className="text-slate-400" />
              </a>
            </div>
          </div>

          {/* Report Issue */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900">Found an issue with the data?</h4>
                <p className="text-sm text-amber-700 mt-1">
                  If you notice any incorrect information, missing data, or other issues,
                  please help us improve by opening a GitHub issue.
                </p>
                <a
                  href={GITHUB_ISSUE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Github size={16} />
                  Report an Issue
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <p className="text-xs text-slate-500 text-center">
            This interactive visualization accompanies the IISE 2026 conference submission.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
