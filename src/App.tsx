import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { GrabControls } from './components/GrabControls';
import { GrabResults } from './components/GrabResults';
import { SearchHistoryModal } from './components/SearchHistoryModal';
import { ExportModal } from './components/ExportModal';
import { UserGuideModal } from './components/UserGuideModal';
import { PageGrabResult, GrabOptions, GrabHistoryItem } from './types';
import { AlertCircle, Link2, Sparkles, Check, Globe } from 'lucide-react';

const LOCAL_STORAGE_HISTORY_KEY = 'link_grabber_history_v1';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('app_theme', nextTheme);
    } catch {
      // Ignore
    }
  };

  const [results, setResults] = useState<PageGrabResult[]>([]);
  const [filterOptions, setFilterOptions] = useState<GrabOptions>({
    prefix: '',
    substring: '',
    matchCase: false,
    useRegex: false,
    matchMode: 'both',
    domainScope: 'all',
    onlyUnique: true,
    excludeAnchors: true,
    excludeJavascript: true,
    stealthMode: true,
    includeMediaSources: true
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState<boolean>(false);

  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // History
  const [history, setHistory] = useState<GrabHistoryItem[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  const saveToHistory = (
    urls: string[],
    totalExtracted: number,
    matchedCount: number,
    prefix?: string,
    substring?: string
  ) => {
    const newItem: GrabHistoryItem = {
      id: `grab-${Date.now()}`,
      timestamp: Date.now(),
      sourceUrls: urls,
      totalExtracted,
      matchedCount,
      prefixFilter: prefix,
      substringFilter: substring
    };

    const updated = [newItem, ...history.slice(0, 24)];
    setHistory(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch {
      // Ignore
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleGrab = async (
    urls: string[],
    options: GrabOptions,
    rawPages: Array<{ name: string; html: string }> = []
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setFilterOptions(options);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/grab-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          urls,
          rawPages,
          filter: options,
          stealthMode: options.stealthMode
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `خطأ في الخادم (HTTP ${res.status})`);
      }

      const data = await res.json();
      setResults(data.results || []);

      // Save to history
      saveToHistory(
        urls.length > 0 ? urls : rawPages.map(p => p.name),
        data.totalLinksCount || 0,
        data.matchedLinksCount || 0,
        options.prefix,
        options.substring
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Grab links request was stopped by user.');
      } else {
        console.error('Error grabbing links:', err);
        setErrorMessage(err.message || 'حدث خطأ أثناء استخراج الروابط، يرجى التحقق من الاتصال والمحاولة مجدداً.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRestoreFromHistory = (item: GrabHistoryItem) => {
    const restoredOptions: GrabOptions = {
      ...filterOptions,
      prefix: item.prefixFilter || '',
      substring: item.substringFilter || ''
    };
    handleGrab(item.sourceUrls, restoredOptions, []);
  };

  // Quick Copy All Links from anywhere in the app
  const totalMatchedLinks = results.reduce((acc, curr) => acc + (curr.matchedLinksCount || 0), 0);

  const handleCopyAllLinks = () => {
    const allUrls: string[] = [];
    results.forEach(r => {
      if (r.links) {
        r.links.forEach(l => {
          if (l.url) allUrls.push(l.url);
        });
      }
    });

    if (allUrls.length === 0) return;

    // Deduplicate if requested
    const finalUrls = filterOptions.onlyUnique ? Array.from(new Set(allUrls)) : allUrls;
    navigator.clipboard.writeText(finalUrls.join('\n'));
    setIsCopiedAll(true);
    setTimeout(() => setIsCopiedAll(false), 2500);
  };

  return (
    <div
      dir="rtl"
      className={
        theme === 'dark'
          ? 'min-h-screen bg-zinc-950 text-zinc-100 selection:bg-cyan-500 selection:text-white transition-colors duration-200'
          : 'min-h-screen bg-slate-50 text-slate-900 selection:bg-cyan-500 selection:text-white transition-colors duration-200'
      }
    >
      {/* App Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        hasResults={results.length > 0}
        historyCount={history.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        totalMatchedLinks={totalMatchedLinks}
        onCopyAllLinks={handleCopyAllLinks}
        isCopiedAll={isCopiedAll}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-md">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <p className="text-xs font-semibold">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Input & Filtering Controls */}
        <GrabControls
          onGrab={handleGrab}
          isLoading={isLoading}
          onStop={handleStop}
          theme={theme}
        />

        {/* Results Section */}
        {results.length > 0 && (
          <GrabResults
            results={results}
            filterOptions={filterOptions}
            onOpenExport={() => setIsExportOpen(true)}
            theme={theme}
          />
        )}
      </main>

      {/* Modals */}
      <SearchHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onRestore={handleRestoreFromHistory}
        onClearHistory={handleClearHistory}
        theme={theme}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        results={results}
        filterOptions={filterOptions}
        theme={theme}
      />

      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        theme={theme}
      />
    </div>
  );
}
