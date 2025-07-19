import { Clock, Eye, FileText, Globe, Link, Loader2, Search, Settings, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('url');
  const [result, setResult] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    maxDepth: 2,
    maxLinksPerPage: 3
  });
  const [stats, setStats] = useState({
    totalPages: 0,
    totalContentLength: 0,
    processingTime: 0
  });
  const [depthWiseResults, setDepthWiseResults] = useState({});
  const [selectedDepth, setSelectedDepth] = useState(null);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'depth'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    setSources([]);
    setDepthWiseResults({});
    setSelectedDepth(null);
    setViewMode('summary');
    setStats({ totalPages: 0, totalContentLength: 0, processingTime: 0 });

    const startTime = Date.now();

    try {
      const requestBody = mode === 'url'
        ? { url: input, maxDepth: settings.maxDepth, maxLinksPerPage: settings.maxLinksPerPage, summarize: true }
        : { query: input, maxDepth: settings.maxDepth, maxLinksPerPage: settings.maxLinksPerPage, summarize: true };

      const response = await fetch('https://web-scrapper-jz7g.onrender.com/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {

        setDepthWiseResults(data.depthWiseResults || {});

        let processedResult = '';
        let processedSources = [];

        if (data.summary && data.summary !== "No summary requested - set summarize=true to get AI summary") {
          processedResult = data.summary;
        } else {
          // If no summary, create a formatted result from the scraped content
          processedResult = formatScrapedContent(data.depthWiseResults || {});
        }

        // Process sources from rawResults
        if (data.rawResults && Array.isArray(data.rawResults)) {
          processedSources = data.rawResults.map(item => ({
            url: item.url,
            title: item.title,
            depth: item.depth,
            contentLength: item.contentLength,
            timestamp: item.timestamp
          }));
        }

        setResult(processedResult);
        setSources(processedSources);
        setStats({
          totalPages: data.totalPages || 0,
          totalContentLength: calculateTotalContentLength(processedSources),
          processingTime: Date.now() - startTime
        });
      } else {
        setResult(`Error: ${data.error || 'Something went wrong!'}`);
      }
    } catch (err) {
      setResult('Network error: Could not connect to server');
    }

    setLoading(false);
  };

  const formatScrapedContent = (depthWiseResults) => {
    let formattedContent = '';

    Object.keys(depthWiseResults).forEach(depth => {
      const results = depthWiseResults[depth];
      formattedContent += `## Depth ${depth} Results\n\n`;

      results.forEach((result, index) => {
        formattedContent += `### ${result.title}\n\n`;
        formattedContent += `**URL:** ${result.url}\n\n`;
        formattedContent += `**Content Length:** ${formatBytes(result.contentLength)}\n\n`;
        formattedContent += `**Content Preview:**\n${result.content.substring(0, 500)}...\n\n`;
        formattedContent += '---\n\n';
      });
    });

    return formattedContent || 'No content found';
  };

  const formatDepthContent = (depthResults) => {
    if (!depthResults || depthResults.length === 0) {
      return 'No content found for this depth level.';
    }

    let formattedContent = '';

    depthResults.forEach((result, index) => {
      formattedContent += `## ${result.title}\n\n`;
      formattedContent += `**URL:** [${result.url}](${result.url})\n\n`;
      formattedContent += `**Content Length:** ${formatBytes(result.contentLength)}\n\n`;
      formattedContent += `**Timestamp:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
      formattedContent += `**Content:**\n\n${result.content}\n\n`;
      if (index < depthResults.length - 1) {
        formattedContent += '---\n\n';
      }
    });

    return formattedContent;
  };

  const handleDepthClick = (depth) => {
    setSelectedDepth(depth);
    setViewMode('depth');
    const depthResults = depthWiseResults[depth] || [];
    const formattedContent = formatDepthContent(depthResults);
    setResult(formattedContent);
  };

  const handleBackToSummary = () => {
    setViewMode('summary');
    setSelectedDepth(null);
    // Restore original summary or formatted content
    if (depthWiseResults) {
      const originalSummary = formatScrapedContent(depthWiseResults);
      setResult(originalSummary);
    }
  };

  const calculateTotalContentLength = (sources) => {
    return sources.reduce((total, source) => total + (source.contentLength || 0), 0);
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4 transition-all duration-300">
      {/* Background animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-full h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-orange-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Advanced Web Scraper
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Extract insights from multiple sources with AI-powered nested link discovery
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-3xl p-8 transition-all duration-300 hover:shadow-3xl">
            <div className="space-y-6">
              {/* Mode Switch */}
              <div className="flex justify-center">
                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl inline-flex">
                  <button
                    onClick={() => setMode('url')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${mode === 'url'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                  >
                    <Globe className="w-5 h-5" />
                    URL
                  </button>
                  <button
                    onClick={() => setMode('query')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${mode === 'query'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                  >
                    <Search className="w-5 h-5" />
                    Search Query
                  </button>
                </div>
              </div>

              {/* Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {mode === 'url' ? (
                    <Globe className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Search className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={mode === 'url' ? 'Enter website URL...' : 'Enter search query...'}
                  className="w-full pl-12 pr-4 py-4 text-lg bg-gray-50 text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading && input) handleSubmit(e);
                  }}
                />
              </div>

              {/* Settings Toggle */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Advanced Settings
                </button>
              </div>

              {/* Advanced Settings */}
              {showSettings && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 space-y-4 border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Link className="w-5 h-5" />
                    Nested Link Scraping
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Depth: {settings.maxDepth}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        value={settings.maxDepth}
                        onChange={(e) => setSettings({ ...settings, maxDepth: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        How deep to follow links (1-4 levels)
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Links per Page: {settings.maxLinksPerPage}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={settings.maxLinksPerPage}
                        onChange={(e) => setSettings({ ...settings, maxLinksPerPage: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Max links to follow per page (1-10)
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <strong>Note:</strong> Higher values will provide more comprehensive results but take longer to process.
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading || !input}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing {stats.totalPages > 0 ? `(${stats.totalPages} pages)` : '...'}
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    Extract & Analyze
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 dark:text-gray-400">
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {result && (
        <div className="fixed text-white inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative bg-white dark:bg-gray-900 w-full max-w-7xl h-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">
                    {viewMode === 'depth' ? `Depth ${selectedDepth} Results` : 'Analysis Results'}
                  </h2>
                  <div className="text-sm text-blue-100 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {stats.totalPages} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(stats.processingTime)}
                    </span>
                    <span>
                      {formatBytes(stats.totalContentLength)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewMode === 'depth' && (
                  <button
                    onClick={handleBackToSummary}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Back to Overview
                  </button>
                )}
                <button
                  onClick={() => setResult('')}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Depth Navigation Sidebar */}
              {Object.keys(depthWiseResults).length > 0 && (
                <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Link className="w-5 h-5" />
                      Depth Levels
                    </h3>
                  </div>
                  <div className="p-4 space-y-2">
                    <button
                      onClick={handleBackToSummary}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'summary'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                    >
                      📋 Overview
                    </button>
                    {Object.keys(depthWiseResults).map(depth => (
                      <button
                        key={depth}
                        onClick={() => handleDepthClick(depth)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedDepth === depth
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>🔍 Depth {depth}</span>
                          <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                            {depthWiseResults[depth]?.length || 0}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources Sidebar */}
              {sources.length > 0 && (
                <div className="w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Link className="w-5 h-5" />
                      Sources ({sources.length})
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {sources
                      .filter(source => selectedDepth === null || source.depth.toString() === selectedDepth)
                      .map((source, index) => (
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${source.depth === 0 ? 'bg-green-500' :
                              source.depth === 1 ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`}></div>
                            <span className="text-xs font-medium text-gray-500">
                              Depth {source.depth}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1 truncate" title={source.title}>
                            {source.title}
                          </div>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline block truncate"
                            title={source.url}
                          >
                            {source.url}
                          </a>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatBytes(source.contentLength)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-none">
                  <div className="prose dark:prose-invert prose-lg max-w-none">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Dark mode scrollbar */
        .dark ::-webkit-scrollbar-track {
          background: #374151;
        }

        .dark ::-webkit-scrollbar-thumb {
          background: #6b7280;
        }

        .dark ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* Range slider styling */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

export default App