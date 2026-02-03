import React from 'react';
import { Brain, Check } from 'lucide-react';

export interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  path: string;
  totalRows: number;
  classified: number;
  coveragePct: number;
}

interface Props {
  models: ModelInfo[];
  activeModel: string;
  onModelChange: (modelId: string) => void;
}

const ModelSelector: React.FC<Props> = ({ models, activeModel, onModelChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const activeModelInfo = models.find(m => m.id === activeModel);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all text-sm"
      >
        <Brain className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-slate-700">
          Model: <span className="text-blue-600">{activeModelInfo?.displayName || 'Select'}</span>
        </span>
        <span className="text-xs text-slate-500 ml-1">
          ({activeModelInfo?.classified.toLocaleString()} classified)
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <Brain className="w-3.5 h-3.5" />
                LLM Classification Model
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {models.map((model) => {
                const isActive = model.id === activeModel;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                      isActive ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold text-sm ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                            {model.displayName}
                          </span>
                          {isActive && (
                            <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mb-2">
                          {model.name}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="bg-slate-100 px-2 py-1 rounded">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Classified</div>
                            <div className="text-sm font-bold text-slate-800">{model.classified.toLocaleString()}</div>
                          </div>
                          <div className="bg-slate-100 px-2 py-1 rounded">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Coverage</div>
                            <div className="text-sm font-bold text-slate-800">{model.coveragePct}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
              Different models may classify papers into different domains. Select a model to compare classifications.
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSelector;
