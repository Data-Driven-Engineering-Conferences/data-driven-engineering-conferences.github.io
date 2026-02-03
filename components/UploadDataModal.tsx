import React, { useState, useRef } from 'react';
import { X, Upload, Folder, FileText, AlertCircle, CheckCircle, Info, Github } from 'lucide-react';

import type { LoadedAppData } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded?: (data: LoadedAppData) => void;
}

const UploadDataModal: React.FC<Props> = ({ isOpen, onClose, onDataLoaded }) => {
  const [uploadMethod, setUploadMethod] = useState<'folder' | 'github'>('github');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'validating' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [validationMessage, setValidationMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Get the folder path (first file's directory)
      const firstFile = files[0];
      const folderPath = firstFile.webkitRelativePath.split('/')[0];
      setSelectedFolder(folderPath);
    }
  };

  const parseGithubUrl = (url: string): { owner: string; repo: string; branch: string } | null => {
    // Support formats:
    // https://github.com/owner/repo
    // https://github.com/owner/repo/tree/branch
    // https://github.com/owner/repo.git
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
      /github\.com\/([^\/]+)\/([^\/]+)\.git/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', ''),
          branch: match[3] || 'main'
        };
      }
    }
    return null;
  };

  const validateGithubRepo = async (url: string): Promise<boolean> => {
    const parsed = parseGithubUrl(url);
    if (!parsed) {
      setErrorMessage('Invalid GitHub URL format. Use: https://github.com/owner/repo');
      return false;
    }

    setUploadStatus('validating');
    setValidationMessage('Validating repository structure...');

    try {
      // Check if required files exist by trying to fetch them
      const baseUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}`;
      const requiredFiles = [
        'raw/IISE_2002_2025_Proquest_Nov-8_CutOff.csv', // Generic primary dataset
        'raw/IISE_2002_2025_GS_Nov-8_CutOff.csv' // Google Scholar dataset
      ];

      const checks = await Promise.allSettled(
        requiredFiles.map(file => fetch(`${baseUrl}/${file}`, { method: 'HEAD' }))
      );

      const missingFiles = requiredFiles.filter((_, idx) => 
        checks[idx].status === 'rejected' || 
        (checks[idx].status === 'fulfilled' && !checks[idx].value.ok)
      );

      if (missingFiles.length > 0) {
        setErrorMessage(`Missing required files: ${missingFiles.join(', ')}`);
        setUploadStatus('error');
        return false;
      }

      setValidationMessage('Repository structure validated successfully!');
      return true;
    } catch (error) {
      setErrorMessage('Failed to validate repository. Make sure it is public and accessible.');
      setUploadStatus('error');
      return false;
    }
  };

  const fetchDataFromGithub = async (url: string) => {
    const parsed = parseGithubUrl(url);
    if (!parsed) return null;

    const baseUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}`;
    
    try {
      // Fetch processed data files (output from analysis pipeline)
      const processedFiles = [
        'data/processed/web_app_data/yearly_stats.json',
        'data/processed/web_app_data/publication_trends_by_source.json',
        'data/processed/web_app_data/papers.json',
        'data/processed/web_app_data/authors.json',
        'data/processed/web_app_data/domains.json',
        'data/processed/web_app_data/coauthorship_network_unified.json',
        'data/processed/web_app_data/citation_network_paper.json',
        'data/processed/web_app_data/citation_network_author.json',
        'data/processed/web_app_data/citation_network_mixed.json'
      ];

      const dataPromises = processedFiles.map(async (file) => {
        try {
          const response = await fetch(`${baseUrl}/${file}`);
          if (response.ok) {
            const data = await response.json();
            return { file, data, success: true };
          }
          return { file, data: null, success: false };
        } catch (error) {
          return { file, data: null, success: false };
        }
      });

      const results = await Promise.all(dataPromises);
      const successful = results.filter(r => r.success);
      
      if (successful.length === 0) {
        throw new Error('No processed data files found. Make sure the repository contains processed output from the analysis pipeline.');
      }

      return results.reduce((acc, result) => {
        if (result.success) {
          const key = result.file.split('/').pop()?.replace('.json', '') || '';
          acc[key] = result.data;
        }
        return acc;
      }, {} as Record<string, any>);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch data from repository');
    }
  };

  const handleUpload = async () => {
    setErrorMessage('');
    setValidationMessage('');

    if (uploadMethod === 'github') {
      if (!githubUrl.trim()) {
        setErrorMessage('Please enter a GitHub repository URL');
        setUploadStatus('error');
        return;
      }

      const isValid = await validateGithubRepo(githubUrl);
      if (!isValid) return;

      setUploadStatus('uploading');
      setValidationMessage('Fetching processed data from repository...');

      try {
        const data = await fetchDataFromGithub(githubUrl);
        
        if (!data || Object.keys(data).length === 0) {
          throw new Error('No data could be loaded from the repository');
        }

        onDataLoaded?.(data as LoadedAppData);

        setUploadStatus('success');
        setValidationMessage('Data loaded successfully! Updating views...');
        
        setTimeout(() => {
          onClose();
          setUploadStatus('idle');
          setGithubUrl('');
          setValidationMessage('');
        }, 2000);
      } catch (error) {
        setUploadStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load data');
      }
    } else {
      // Folder upload (existing implementation)
      if (!selectedFolder && (!fileInputRef.current?.files || fileInputRef.current.files.length === 0)) {
        setErrorMessage('Please select a folder or files to upload');
        setUploadStatus('error');
        return;
      }

      setUploadStatus('uploading');
      setErrorMessage('');

      try {
        // TODO: Implement actual file upload logic
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setUploadStatus('success');
        setTimeout(() => {
          onClose();
          setUploadStatus('idle');
          setSelectedFolder('');
        }, 2000);
      } catch (error) {
        setUploadStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      }
    }
  };

  const requiredFiles = [
    { name: 'Primary Dataset CSV', description: 'Main dataset with paper metadata (e.g., IISE_2002_2025_Proquest_*.csv)' },
    { name: 'IISE_2002_2025_GS_*.csv', description: 'Google Scholar citation data' },
  ];

  const requiredFields = {
    PrimaryDataset: ['ID', 'Title', 'Authors', 'Year', 'Abstract', 'Keywords', 'Affiliation'],
    GoogleScholar: ['ID', 'Title', 'Authors', 'Year', 'Cites', 'Abstract']
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-slate-900">Add Your Own Data</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Important Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
              <div className="space-y-2">
                <h3 className="font-semibold text-amber-900">Important: Processed Data Required</h3>
                <p className="text-sm text-amber-800">
                  This tool expects <strong>processed output</strong> from the analysis codebase. 
                  The repository should contain the processed JSON files generated by the analysis pipeline 
                  (notebooks 02-07), located in <code className="bg-amber-100 px-1 rounded">data/processed/web_app_data/</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Upload Method Selection */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Select Data Source</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setUploadMethod('github')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  uploadMethod === 'github'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Github className={`mx-auto mb-2 ${uploadMethod === 'github' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                <div className="font-medium text-slate-900">GitHub Repository</div>
                <div className="text-xs text-slate-500 mt-1">Fetch from public repo</div>
              </button>
              <button
                onClick={() => setUploadMethod('folder')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  uploadMethod === 'folder'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Folder className={`mx-auto mb-2 ${uploadMethod === 'folder' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                <div className="font-medium text-slate-900">Local Folder</div>
                <div className="text-xs text-slate-500 mt-1">Upload from computer</div>
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">
                  {uploadMethod === 'github' ? 'Repository Structure Requirements' : 'Data Structure Requirements'}
                </h3>
                <p className="text-sm text-blue-800">
                  {uploadMethod === 'github' 
                    ? 'The GitHub repository should follow the same structure as this codebase, with processed data in data/processed/web_app_data/'
                    : 'Upload a folder containing your processed data files. The folder should follow the structure below:'}
                </p>
              </div>
            </div>
          </div>

          {/* Required Files */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText size={18} />
              Required Files
            </h3>
            <div className="space-y-2">
              {requiredFiles.map((file, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="font-mono text-sm text-slate-900">{file.name}</div>
                  <div className="text-xs text-slate-600 mt-1">{file.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* GitHub URL Input */}
          {uploadMethod === 'github' && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Github size={18} />
                GitHub Repository URL
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                />
                <p className="text-xs text-slate-500">
                  Enter the URL of a public GitHub repository containing processed analysis output.
                  The repository should have the same structure as this codebase.
                </p>
              </div>
            </div>
          )}

          {/* Required Fields (for folder upload) */}
          {uploadMethod === 'folder' && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Required CSV Columns (Raw Input)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <h4 className="font-medium text-slate-900 mb-2">Primary Dataset CSV</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {requiredFields.PrimaryDataset.map((field, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-green-600" />
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <h4 className="font-medium text-slate-900 mb-2">Google Scholar CSV</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {requiredFields.GoogleScholar.map((field, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-green-600" />
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Upload Section - Folder Upload */}
          {uploadMethod === 'folder' && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Upload size={18} />
                Select Data Folder
              </h3>
              
              <div className="space-y-4">
                {/* Folder Upload */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    ref={folderInputRef}
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderSelect}
                    className="hidden"
                    id="folder-upload"
                  />
                  <label
                    htmlFor="folder-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Folder className="text-blue-600" size={32} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Click to select folder</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Select the folder containing your processed data files
                      </p>
                    </div>
                    {selectedFolder && (
                      <p className="text-sm text-blue-600 font-medium mt-2">
                        Selected: {selectedFolder}
                      </p>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          <div className="space-y-3">
            {/* Validation/Progress Message */}
            {uploadStatus === 'validating' && validationMessage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
                <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-800">{validationMessage}</div>
              </div>
            )}

            {/* Error Message */}
            {uploadStatus === 'error' && errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-red-800">{errorMessage}</div>
              </div>
            )}

            {/* Success Message */}
            {uploadStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-green-800">
                  {validationMessage || 'Data loaded successfully! Updating views...'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploadStatus === 'uploading' || uploadStatus === 'success' || uploadStatus === 'validating'}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {(uploadStatus === 'uploading' || uploadStatus === 'validating') && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {uploadStatus === 'validating' 
              ? 'Validating...' 
              : uploadStatus === 'uploading' 
              ? 'Loading...' 
              : uploadStatus === 'success' 
              ? 'Processing...' 
              : uploadMethod === 'github'
              ? 'Load from Repository'
              : 'Upload & Process'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadDataModal;

