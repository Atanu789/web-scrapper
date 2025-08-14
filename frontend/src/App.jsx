import { AlertCircle, CheckCircle, Clock, Copy, Download, Eye, FileDown, FileText, Globe, Loader2, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';

// --- Configuration ---
// Adjust this URL to where your backend server is running.
const API_BASE_URL = 'http://localhost:4001/api/scrape'; 

function App() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('single'); // 'single' or 'batch'
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(''); // 'scrape', 'preview', 'pdf'
  const [stats, setStats] = useState({
    processingTime: 0,
    contentLength: 0
  });
  const [error, setError] = useState('');
  const [batchUrls, setBatchUrls] = useState(['']);
  const [notification, setNotification] = useState(null);

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingAction('scrape');
    setResult(null);
    setError('');
    setStats({ processingTime: 0, contentLength: 0 });

    const startTime = Date.now();

    try {
      let response;
      
      if (mode === 'single') {
        // Single URL scraping for JSON
        response = await fetch(`${API_BASE_URL}/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: input })
        });
      } else {
        // Batch URL scraping
        const validUrls = batchUrls.filter(url => url.trim() !== '');
        if (validUrls.length === 0) {
          setError('Please enter at least one valid URL');
          setLoading(false);
          setLoadingAction('');
          return;
        }
        
        response = await fetch(`${API_BASE_URL}/scrape/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            urls: validUrls,
            concurrent: Math.min(3, validUrls.length) // Adjust concurrency based on URL count
          })
        });
      }

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setStats({
          processingTime: Date.now() - startTime,
          contentLength: mode === 'single' 
            ? data.data?.content?.length || 0
            : data.results?.reduce((total, r) => total + (r.content?.length || 0), 0) || 0
        });
        showNotification(
          mode === 'single' 
            ? 'Content extracted successfully!' 
            : `Batch processing complete: ${data.summary?.successful || 0}/${data.summary?.total || 0} successful`
        );
      } else {
        setError(data.error || data.details || 'Something went wrong!');
        showNotification('Scraping failed', 'error');
      }
    } catch (err) {
      console.error('Scraping error:', err);
      setError('Network error: Could not connect to the server. Make sure the backend is running on the correct port.');
      showNotification('Network connection failed', 'error');
    }

    setLoading(false);
    setLoadingAction('');
  };

  const handlePreview = async () => {
    if (!input || mode !== 'single') return;
    
    setLoading(true);
    setLoadingAction('preview');
    setResult(null);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: true,
          preview: true, // Custom flag for the UI to identify a preview
          data: data, // The backend preview response
        });
        showNotification('Preview loaded successfully!');
      } else {
        setError(data.error || data.details || 'Preview failed');
        showNotification('Preview failed', 'error');
      }
    } catch (err) {
      setError('Network error: Could not connect to the server.');
      showNotification('Network connection failed', 'error');
      console.error('Preview error:', err);
    }

    setLoading(false);
    setLoadingAction('');
  };

  const handleDownloadPdf = async () => {
    if (!input || mode !== 'single') return;

    setLoading(true);
    setLoadingAction('pdf');
    setError('');

    try {
        const response = await fetch(`${API_BASE_URL}/scrape?format=pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: input }),
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Extract filename from content-disposition header, or create a default
            const disposition = response.headers.get('content-disposition');
            let filename = `scraped-content-${new Date().getTime()}.pdf`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            showNotification('PDF downloaded successfully!');
        } else {
            // If the server returns an error as JSON, we need to parse it
            const errorData = await response.json();
            setError(errorData.error || errorData.details || 'PDF download failed.');
            showNotification('PDF download failed', 'error');
        }
    } catch (err) {
        setError('Network error: Could not connect to the server.');
        showNotification('Network connection failed', 'error');
        console.error('PDF download error:', err);
    }

    setLoading(false);
    setLoadingAction('');
  };

  const addBatchUrl = () => {
    if (batchUrls.length < 20) { // Updated to match backend limit
      setBatchUrls([...batchUrls, '']);
    }
  };

  const removeBatchUrl = (index) => {
    const newUrls = batchUrls.filter((_, i) => i !== index);
    setBatchUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const updateBatchUrl = (index, value) => {
    const newUrls = [...batchUrls];
    newUrls[index] = value;
    setBatchUrls(newUrls);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy content', 'error');
    }
  };

  const downloadAsJson = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraper-results-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('JSON file downloaded!');
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4 transition-all duration-300">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-300 ${
          notification.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-green-500 text-white'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-full h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-orange-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
               Scrappy
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Extract web content as JSON or download a clean PDF 
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-3xl p-8 transition-all duration-300 hover:shadow-3xl">
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl inline-flex">
                  <button
                    onClick={() => setMode('single')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${mode === 'single'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                  >
                    <Globe className="w-5 h-5" />
                    Single URL
                  </button>
                  <button
                    onClick={() => setMode('batch')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${mode === 'batch'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                  >
                    <FileText className="w-5 h-5" />
                    Batch URLs (up to 20)
                  </button>
                </div>
              </div>

              {mode === 'single' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Globe className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Enter website URL (e.g., https://example.com/article)..."
                      className="w-full pl-12 pr-4 py-4 text-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400 text-gray-900 dark:text-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !loading && input) handleSubmit(e);
                      }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={handlePreview}
                      disabled={loading || !input}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && loadingAction === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Preview
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !input}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                       {loading && loadingAction === 'scrape' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                      Get JSON
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={loading || !input}
                      className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && loadingAction === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                      Get PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-80 overflow-y-auto space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                    {batchUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-sm text-gray-400">#{index + 1}</span>
                          </div>
                          <input
                            value={url}
                            onChange={(e) => updateBatchUrl(index, e.target.value)}
                            placeholder="Enter URL..."
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                          />
                        </div>
                        {batchUrls.length > 1 && (
                          <button
                            onClick={() => removeBatchUrl(index)}
                            className="px-3 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            title="Remove URL"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    {batchUrls.length < 20 && (
                      <button
                        onClick={addBatchUrl}
                        className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors text-sm font-medium"
                      >
                        + Add URL
                      </button>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={loading || batchUrls.every(url => !url.trim())}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                      Process Batch
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    {batchUrls.filter(url => url.trim()).length} / 20 URLs
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mt-4">
                  <div className="text-red-800 dark:text-red-400 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Error:</strong> {error}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="w-6 h-6" />
                    <div>
                      <h2 className="text-xl font-bold">
                        {result.preview ? 'Content Preview' : 
                         mode === 'single' ? 'Extraction Results' : 'Batch Results'}
                      </h2>
                      <div className="text-sm text-green-100 flex items-center gap-4">
                        {stats.processingTime > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(stats.processingTime)}
                          </span>
                        )}
                        {stats.contentLength > 0 && <span>{formatBytes(stats.contentLength)}</span>}
                        {mode === 'batch' && result.summary && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {result.summary.successful}/{result.summary.total} successful
                            {result.summary.totalWords && ` • ${result.summary.totalWords} words`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadAsJson}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      JSON
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[30rem] overflow-y-auto p-6">
                {mode === 'single' ? (
                  result.success && (result.data || result.preview) && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4">
                        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
                          {result.preview ? result.data.title : result.data.title}
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <a href={result.preview ? result.data.url : result.data.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                            {result.preview ? result.data.url : result.data.url}
                          </a>
                        </div>
                        
                        {/* Word count and stats for single mode */}
                        {!result.preview && result.stats && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex gap-4">
                            {result.stats.wordCount && <span>Words: {result.stats.wordCount}</span>}
                            {result.stats.contentLength && <span>Size: {formatBytes(result.stats.contentLength)}</span>}
                            {result.stats.extractedAt && <span>Extracted: {new Date(result.stats.extractedAt).toLocaleString()}</span>}
                          </div>
                        )}
                        
                        <div className="bg-white dark:bg-gray-600 rounded-xl p-4 max-h-64 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                            {result.preview ? result.data.preview : result.data.content}
                          </pre>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => copyToClipboard(result.preview ? result.data.preview : result.data.content)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copy Content
                          </button>
                          {result.preview && result.data.stats && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                              Preview ({result.data.preview.length} chars) • Full content: {formatBytes(result.data.stats.fullContentLength)}
                            </span>
                          )}
                        </div>
                      </div>

                      {!result.preview && result.data.metadata && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                          <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Metadata</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {result.data.metadata.description && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                                <p className="text-gray-600 dark:text-gray-400">{result.data.metadata.description}</p>
                              </div>
                            )}
                            {result.data.metadata.author && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Author:</span>
                                <p className="text-gray-600 dark:text-gray-400">{result.data.metadata.author}</p>
                              </div>
                            )}
                            {result.data.metadata.keywords && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Keywords:</span>
                                <p className="text-gray-600 dark:text-gray-400">{result.data.metadata.keywords}</p>
                              </div>
                            )}
                            {result.data.metadata.publishDate && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Published:</span>
                                <p className="text-gray-600 dark:text-gray-400">{new Date(result.data.metadata.publishDate).toLocaleDateString()}</p>
                              </div>
                            )}
                            {result.data.metadata.language && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Language:</span>
                                <p className="text-gray-600 dark:text-gray-400">{result.data.metadata.language}</p>
                              </div>
                            )}
                            {result.data.metadata.siteName && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Site:</span>
                                <p className="text-gray-600 dark:text-gray-400">{result.data.metadata.siteName}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  result.success && result.results && (
                    <div className="space-y-4">
                      {result.results.map((item, index) => (
                        <div key={index} className={`rounded-2xl p-4 ${
                          item.success 
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate pr-4">
                              {item.success ? item.title : 'Failed'}
                            </h4>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.success && item.wordCount && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                                  {item.wordCount} words
                                </span>
                              )}
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                item.success 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                              }`}>
                                {item.success ? 'Success' : 'Error'}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                              {item.url}
                            </a>
                          </div>
                          {item.success ? (
                            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                                {item.content?.substring(0, 300)}{item.content?.length > 300 ? '...' : ''}
                              </pre>
                            </div>
                          ) : (
                            <div className="text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <strong>Error:</strong> {item.error}
                                {item.scrapingAttempts && (
                                  <div className="text-xs text-red-500 dark:text-red-300 mt-1">
                                    Failed after {item.scrapingAttempts} attempts
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {item.success && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => copyToClipboard(item.content)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                Copy
                              </button>
                              {item.timestamp && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  • {new Date(item.timestamp).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Footer with API info */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Powered by Essential Web Scraper API • 
              <span className="mx-2">•</span>
              Backend should be running on <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">localhost:4001</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;