import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Download,
  Filter,
  Search,
  Globe,
  FileText,
  FileCode,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  FileSpreadsheet,
  Video,
  Film,
  Music,
  Play
} from 'lucide-react';
import { PageGrabResult, ExtractedLink, GrabOptions } from '../types';

interface GrabResultsProps {
  results: PageGrabResult[];
  filterOptions: GrabOptions;
  onOpenExport: () => void;
  theme?: 'dark' | 'light';
}

export const GrabResults: React.FC<GrabResultsProps> = ({
  results,
  filterOptions,
  onOpenExport,
  theme = 'dark'
}) => {
  // Live local filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'media' | 'internal' | 'external' | 'files'>('all');
  const [onlyMatched, setOnlyMatched] = useState<boolean>(true);
  const [onlyUnique, setOnlyUnique] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Expanded pages in grouped mode
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});

  // Copy states
  const [copiedLinkMap, setCopiedLinkMap] = useState<Record<string, boolean>>({});
  const [copiedAllSuccess, setCopiedAllSuccess] = useState<boolean>(false);

  // Flatten all links across pages
  const allLinks = useMemo(() => {
    const list: ExtractedLink[] = [];
    results.forEach(p => {
      if (p.status === 'success' && p.links) {
        list.push(...p.links);
      }
    });
    return list;
  }, [results]);

  // Check if link is media (video/audio/<source>)
  const isMediaLink = (l: ExtractedLink): boolean => {
    return (
      l.tagType === 'source' ||
      l.tagType === 'video' ||
      l.tagType === 'audio' ||
      l.tagType === 'media_embed' ||
      Boolean(l.mediaType) ||
      Boolean(l.fileExtension && /\.(mp4|m3u8|webm|mkv|mp3|wav|ogg|avi|mov|flv|ts|m4a|aac)/i.test(l.fileExtension))
    );
  };

  // Determine if a link matches the current filterOptions
  const isLinkMatched = (link: ExtractedLink): boolean => {
    const prefix = (filterOptions.prefix || '').trim();
    const substring = (filterOptions.substring || '').trim();

    if (!prefix && !substring) return true;

    let pMatch = true;
    if (prefix) {
      const p = filterOptions.matchCase ? prefix : prefix.toLowerCase();
      const u = filterOptions.matchCase ? link.url : link.url.toLowerCase();
      const r = filterOptions.matchCase ? link.rawHref : link.rawHref.toLowerCase();
      pMatch = u.startsWith(p) || r.startsWith(p);
      if (!pMatch && !p.startsWith('http')) {
        try {
          const path = new URL(link.url).pathname;
          pMatch = path.startsWith(p) || path.startsWith('/' + p.replace(/^\//, ''));
        } catch {}
      }
    }

    let sMatch = true;
    if (substring) {
      if (filterOptions.useRegex) {
        try {
          const reg = new RegExp(substring, filterOptions.matchCase ? '' : 'i');
          sMatch = reg.test(link.url) || reg.test(link.rawHref) || reg.test(link.text);
        } catch {
          sMatch = false;
        }
      } else {
        const s = filterOptions.matchCase ? substring : substring.toLowerCase();
        const u = filterOptions.matchCase ? link.url : link.url.toLowerCase();
        const r = filterOptions.matchCase ? link.rawHref : link.rawHref.toLowerCase();
        const t = filterOptions.matchCase ? link.text : link.text.toLowerCase();
        sMatch = u.includes(s) || r.includes(s) || t.includes(s);
      }
    }

    if (prefix && substring) {
      return filterOptions.matchMode === 'any' ? (pMatch || sMatch) : (pMatch && sMatch);
    }
    return prefix ? pMatch : sMatch;
  };

  // Filtered links
  const filteredLinks = useMemo(() => {
    let list = allLinks;

    // Filter by match status
    if (onlyMatched && (filterOptions.prefix || filterOptions.substring)) {
      list = list.filter(isLinkMatched);
    }

    // Filter by type
    if (typeFilter === 'media') {
      list = list.filter(isMediaLink);
    } else if (typeFilter === 'internal') {
      list = list.filter(l => l.isInternal);
    } else if (typeFilter === 'external') {
      list = list.filter(l => !l.isInternal && !l.isSpecialProtocol);
    } else if (typeFilter === 'files') {
      list = list.filter(l => Boolean(l.fileExtension));
    }

    // Deduplicate if enabled
    if (onlyUnique) {
      const seen = new Set<string>();
      list = list.filter(l => {
        const lower = l.url.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
    }

    // Live search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(l =>
        l.url.toLowerCase().includes(q) ||
        l.text.toLowerCase().includes(q) ||
        l.domain.toLowerCase().includes(q) ||
        (l.fileExtension && l.fileExtension.toLowerCase().includes(q)) ||
        (l.mediaType && l.mediaType.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allLinks, onlyMatched, typeFilter, onlyUnique, searchQuery, filterOptions]);

  // Grouped links by source page
  const groupedResults = useMemo(() => {
    return results.map(p => {
      let pageLinks = p.links || [];
      if (onlyMatched && (filterOptions.prefix || filterOptions.substring)) {
        pageLinks = pageLinks.filter(isLinkMatched);
      }
      if (typeFilter === 'media') pageLinks = pageLinks.filter(isMediaLink);
      if (typeFilter === 'internal') pageLinks = pageLinks.filter(l => l.isInternal);
      if (typeFilter === 'external') pageLinks = pageLinks.filter(l => !l.isInternal && !l.isSpecialProtocol);
      if (typeFilter === 'files') pageLinks = pageLinks.filter(l => Boolean(l.fileExtension));

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        pageLinks = pageLinks.filter(l =>
          l.url.toLowerCase().includes(q) ||
          l.text.toLowerCase().includes(q)
        );
      }

      return {
        ...p,
        filteredLinks: pageLinks
      };
    });
  }, [results, onlyMatched, typeFilter, searchQuery, filterOptions]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalGrabbed = allLinks.length;
    const uniqueUrls = new Set(allLinks.map(l => l.url.toLowerCase())).size;
    const matchedCount = (filterOptions.prefix || filterOptions.substring)
      ? allLinks.filter(isLinkMatched).length
      : totalGrabbed;
    const internalCount = allLinks.filter(l => l.isInternal).length;
    const externalCount = allLinks.filter(l => !l.isInternal && !l.isSpecialProtocol).length;
    const filesCount = allLinks.filter(l => Boolean(l.fileExtension)).length;
    const mediaCount = allLinks.filter(isMediaLink).length;

    return {
      totalGrabbed,
      uniqueUrls,
      matchedCount,
      internalCount,
      externalCount,
      filesCount,
      mediaCount,
      pagesCount: results.length,
      successPages: results.filter(r => r.status === 'success').length
    };
  }, [allLinks, results, filterOptions]);

  // Copy single link
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkMap(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedLinkMap(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Copy all currently filtered links
  const handleCopyAllFiltered = () => {
    const urlsToCopy = filteredLinks.map(l => l.url);
    if (urlsToCopy.length === 0) return;

    navigator.clipboard.writeText(urlsToCopy.join('\n'));
    setCopiedAllSuccess(true);
    setTimeout(() => setCopiedAllSuccess(false), 2500);
  };

  // Quick download TXT
  const handleDownloadTxt = () => {
    const urlsToDownload = filteredLinks.map(l => l.url);
    if (urlsToDownload.length === 0) return;

    const blob = new Blob([urlsToDownload.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grabbed_links_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Quick download CSV
  const handleDownloadCsv = () => {
    if (filteredLinks.length === 0) return;

    const headers = ['URL', 'Tag Element', 'Anchor / Description', 'Media Type', 'Domain', 'Type', 'File Extension', 'Source Page URL', 'Source Title'];
    const rows = filteredLinks.map(l => [
      `"${l.url.replace(/"/g, '""')}"`,
      `"<${l.tagType}>"`,
      `"${l.text.replace(/"/g, '""')}"`,
      `"${l.mediaType || ''}"`,
      `"${l.domain.replace(/"/g, '""')}"`,
      l.isInternal ? 'Internal' : 'External',
      `"${l.fileExtension || ''}"`,
      `"${l.sourceUrl.replace(/"/g, '""')}"`,
      `"${l.sourceTitle.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grabbed_links_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toggle page in grouped mode
  const togglePageExpand = (url: string) => {
    setExpandedPages(prev => ({ ...prev, [url]: !prev[url] }));
  };

  // Highlight matched prefix or substring in URL
  const renderHighlightedUrl = (url: string) => {
    const prefix = (filterOptions.prefix || '').trim();
    const substring = (filterOptions.substring || '').trim();

    if (!prefix && !substring) {
      return <span>{url}</span>;
    }

    try {
      const lowerUrl = url.toLowerCase();
      let prefixMatchIndex = -1;
      let prefixMatchLen = 0;

      if (prefix && lowerUrl.startsWith(prefix.toLowerCase())) {
        prefixMatchIndex = 0;
        prefixMatchLen = prefix.length;
      }

      let subMatchIndex = -1;
      let subMatchLen = 0;
      if (substring) {
        subMatchIndex = lowerUrl.indexOf(substring.toLowerCase());
        if (subMatchIndex !== -1) {
          subMatchLen = substring.length;
        }
      }

      if (prefixMatchIndex === -1 && subMatchIndex === -1) {
        return <span>{url}</span>;
      }

      if (prefixMatchIndex === 0 && subMatchIndex === -1) {
        return (
          <span>
            <mark className="bg-cyan-500/30 text-cyan-200 px-0.5 rounded font-bold">
              {url.substring(0, prefixMatchLen)}
            </mark>
            {url.substring(prefixMatchLen)}
          </span>
        );
      }

      if (subMatchIndex !== -1) {
        return (
          <span>
            {url.substring(0, subMatchIndex)}
            <mark className="bg-indigo-500/40 text-indigo-200 px-0.5 rounded font-bold">
              {url.substring(subMatchIndex, subMatchIndex + subMatchLen)}
            </mark>
            {url.substring(subMatchIndex + subMatchLen)}
          </span>
        );
      }
    } catch {
      // Fallback
    }

    return <span>{url}</span>;
  };

  // Pagination slice for flat view
  const totalPages = Math.ceil(filteredLinks.length / pageSize) || 1;
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLinks.slice(start, start + pageSize);
  }, [filteredLinks, currentPage, pageSize]);

  // Render tag badges helper
  const renderTagBadges = (link: ExtractedLink) => {
    const isVideo = link.tagType === 'video' || (link.fileExtension && /\.(mp4|m3u8|webm|mkv|mov|avi|flv)/i.test(link.fileExtension));
    const isSource = link.tagType === 'source';

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* HTML Tag Type badge */}
        {isSource && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-full flex items-center gap-1">
            <Film className="w-3 h-3 text-purple-400" />
            &lt;source&gt;
          </span>
        )}

        {link.tagType === 'video' && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-full flex items-center gap-1">
            <Video className="w-3 h-3 text-rose-400" />
            &lt;video&gt;
          </span>
        )}

        {link.tagType === 'audio' && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1">
            <Music className="w-3 h-3 text-amber-400" />
            &lt;audio&gt;
          </span>
        )}

        {link.tagType === 'iframe' && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full">
            &lt;iframe&gt;
          </span>
        )}

        {/* Internal / External */}
        {link.isInternal ? (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
            داخلي
          </span>
        ) : link.isSpecialProtocol ? (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 rounded-full">
            بروتوكول
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
            خارجي
          </span>
        )}

        {/* File Extension */}
        {link.fileExtension && (
          <span className={
            isVideo
              ? 'px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-full flex items-center gap-1'
              : 'px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full'
          }>
            {isVideo && <Play className="w-2.5 h-2.5 fill-current" />}
            {link.fileExtension}
          </span>
        )}

        {/* Media MIME Type */}
        {link.mediaType && (
          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700 rounded">
            {link.mediaType}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Bento Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Grabbed */}
        <div className={
          theme === 'dark'
            ? 'p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md backdrop-blur-md'
            : 'p-4 rounded-2xl bg-white border border-slate-200 shadow-sm'
        }>
          <div className="text-[11px] font-semibold text-zinc-400 mb-1 flex items-center justify-between">
            <span>إجمالي الروابط</span>
            <Layers className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-400">
            {stats.totalGrabbed}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">من {stats.pagesCount} صفحات</div>
        </div>

        {/* Matched Links */}
        <div className={
          theme === 'dark'
            ? 'p-4 rounded-2xl bg-zinc-900/90 border border-cyan-500/30 shadow-md backdrop-blur-md bg-gradient-to-b from-cyan-950/20 to-transparent'
            : 'p-4 rounded-2xl bg-cyan-50/50 border border-cyan-200 shadow-sm'
        }>
          <div className="text-[11px] font-semibold text-cyan-400 mb-1 flex items-center justify-between">
            <span>مطابقة للفلتر</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300">
            {stats.matchedCount}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            {filterOptions.prefix || filterOptions.substring ? 'مطابقة للمعيار' : 'جميع الروابط'}
          </div>
        </div>

        {/* Media & Videos */}
        <div className={
          theme === 'dark'
            ? 'p-4 rounded-2xl bg-zinc-900/90 border border-purple-500/30 shadow-md backdrop-blur-md bg-gradient-to-b from-purple-950/20 to-transparent'
            : 'p-4 rounded-2xl bg-purple-50/50 border border-purple-200 shadow-sm'
        }>
          <div className="text-[11px] font-semibold text-purple-400 mb-1 flex items-center justify-between">
            <span>فيديو وميديا &lt;source&gt;</span>
            <Video className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-300">
            {stats.mediaCount}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">MP4, Video, Audio</div>
        </div>

        {/* Unique Links */}
        <div className={
          theme === 'dark'
            ? 'p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md backdrop-blur-md'
            : 'p-4 rounded-2xl bg-white border border-slate-200 shadow-sm'
        }>
          <div className="text-[11px] font-semibold text-zinc-400 mb-1 flex items-center justify-between">
            <span>روابط فريدة</span>
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-400">
            {stats.uniqueUrls}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">بعد إزالة المكرر</div>
        </div>

        {/* Internal Links */}
        <div className={
          theme === 'dark'
            ? 'p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md backdrop-blur-md'
            : 'p-4 rounded-2xl bg-white border border-slate-200 shadow-sm'
        }>
          <div className="text-[11px] font-semibold text-zinc-400 mb-1 flex items-center justify-between">
            <span>روابط داخلية</span>
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          </div>
          <div className="text-2xl font-black font-mono text-blue-400">
            {stats.internalCount}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">نفس النطاق</div>
        </div>

        {/* Files & Documents */}
        <div className={
          theme === 'dark'
            ? 'p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md backdrop-blur-md'
            : 'p-4 rounded-2xl bg-white border border-slate-200 shadow-sm'
        }>
          <div className="text-[11px] font-semibold text-zinc-400 mb-1 flex items-center justify-between">
            <span>ملفات ومستندات</span>
            <FileText className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {stats.filesCount}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">PDF, ZIP, DOC...</div>
        </div>
      </div>

      {/* 2. Action Toolbar & Live Filter Bar */}
      <div className={
        theme === 'dark'
          ? 'bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-lg backdrop-blur-md space-y-3'
          : 'bg-white border border-slate-200 rounded-2xl p-4 shadow-md space-y-3'
      }>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Live Search in extracted links */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ابحث مباشرة داخل الروابط المستخرجة أو نص الرابط..."
              dir="rtl"
              className={
                theme === 'dark'
                  ? 'w-full pr-9 pl-4 py-2 text-xs bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40'
                  : 'w-full pr-9 pl-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40'
              }
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Filter Buttons & View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className={
              theme === 'dark'
                ? 'flex items-center p-0.5 bg-zinc-950 border border-zinc-800 rounded-xl'
                : 'flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-xl'
            }>
              <button
                onClick={() => setViewMode('flat')}
                className={
                  viewMode === 'flat'
                    ? 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 text-white shadow-xs transition-all'
                    : 'px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all'
                }
              >
                قائمة موحدة
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={
                  viewMode === 'grouped'
                    ? 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 text-white shadow-xs transition-all'
                    : 'px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all'
                }
              >
                مجمعة بالصفحات
              </button>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {(['all', 'media', 'internal', 'external', 'files'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setTypeFilter(type);
                    setCurrentPage(1);
                  }}
                  className={
                    typeFilter === type
                      ? 'px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-cyan-600 text-white shadow-xs'
                      : theme === 'dark'
                      ? 'px-2.5 py-1.5 text-xs rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                      : 'px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                  }
                >
                  {type === 'all' && 'الكل'}
                  {type === 'media' && '🎬 فيديو وميديا (<source>)'}
                  {type === 'internal' && 'داخلية'}
                  {type === 'external' && 'خارجية'}
                  {type === 'files' && 'ملفات'}
                </button>
              ))}
            </div>

            {/* Deduplicate Toggle */}
            <button
              onClick={() => {
                setOnlyUnique(!onlyUnique);
                setCurrentPage(1);
              }}
              className={
                onlyUnique
                  ? 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white shadow-xs'
                  : theme === 'dark'
                  ? 'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                  : 'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
              }
              title="Toggle Deduplication (إزالة الروابط المكررة)"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>فريدة فقط</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/60 dark:border-zinc-800/60">
          <div className="text-xs text-zinc-400">
            عرض <span className="font-mono font-bold text-cyan-400">{filteredLinks.length}</span> رابط
            {filteredLinks.length !== allLinks.length && (
              <span> (من إجمالي {allLinks.length})</span>
            )}
            {searchQuery && <span className="text-amber-400"> • مفلتر بالبحث</span>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy All Button */}
            <button
              onClick={handleCopyAllFiltered}
              disabled={filteredLinks.length === 0}
              className={
                copiedAllSuccess
                  ? 'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-md transition-all'
                  : 'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all'
              }
              title="Copy all currently filtered links (one per line) to clipboard"
            >
              {copiedAllSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAllSuccess ? 'تم نسخ جميع الروابط!' : `نسخ كل الروابط (${filteredLinks.length})`}</span>
            </button>

            {/* Quick TXT Download */}
            <button
              onClick={handleDownloadTxt}
              disabled={filteredLinks.length === 0}
              className={
                theme === 'dark'
                  ? 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all'
                  : 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all'
              }
              title="Download clean plain-text list of URLs"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>تحميل TXT</span>
            </button>

            {/* Quick CSV Download */}
            <button
              onClick={handleDownloadCsv}
              disabled={filteredLinks.length === 0}
              className={
                theme === 'dark'
                  ? 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all'
                  : 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all'
              }
              title="Download CSV table of extracted links"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>تحميل CSV</span>
            </button>

            {/* Full Export Modal Trigger */}
            <button
              onClick={onOpenExport}
              className={
                theme === 'dark'
                  ? 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all'
                  : 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all'
              }
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>خيارات التصدير</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Links Display */}
      {viewMode === 'flat' ? (
        /* Flat List View */
        <div className={
          theme === 'dark'
            ? 'bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md'
            : 'bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg'
        }>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={
                theme === 'dark'
                  ? 'bg-zinc-950/80 border-b border-zinc-800 text-zinc-400'
                  : 'bg-slate-100 border-b border-slate-200 text-slate-600'
              }>
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 text-left font-semibold">الرابط أو المصدر المستخرج (Extracted Link / Media)</th>
                  <th className="py-3 px-4 font-semibold">الوصف / نص الرابط (Description / Anchor)</th>
                  <th className="py-3 px-4 font-semibold">النوع وعنصر HTML</th>
                  <th className="py-3 px-4 font-semibold">الصفحة المصدر</th>
                  <th className="py-3 px-4 text-center w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {paginatedLinks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      لا توجد روابط مطابقة للمعايير المحددة.
                    </td>
                  </tr>
                ) : (
                  paginatedLinks.map((link, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    const isCopied = copiedLinkMap[link.id];

                    return (
                      <tr
                        key={link.id}
                        className={
                          theme === 'dark'
                            ? 'hover:bg-zinc-800/50 transition-colors'
                            : 'hover:bg-slate-50 transition-colors'
                        }
                      >
                        {/* Number */}
                        <td className="py-3 px-4 text-center font-mono text-zinc-500">
                          {rowNumber}
                        </td>

                        {/* URL with highlight */}
                        <td className="py-3 px-4 text-left font-mono max-w-md break-all">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors inline-flex items-center gap-1.5"
                          >
                            {renderHighlightedUrl(link.url)}
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                          </a>
                        </td>

                        {/* Anchor / Description Text */}
                        <td className="py-3 px-4 max-w-xs truncate text-zinc-300 dark:text-zinc-300">
                          <span title={link.text}>{link.text}</span>
                        </td>

                        {/* Type & Badges */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderTagBadges(link)}
                        </td>

                        {/* Source Page */}
                        <td className="py-3 px-4 max-w-xs truncate font-mono text-[11px] text-zinc-400">
                          <span title={link.sourceUrl}>{link.sourceTitle || link.sourceUrl}</span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleCopyLink(link.url, link.id)}
                            className={
                              isCopied
                                ? 'p-1.5 rounded-lg bg-emerald-500 text-white transition-all'
                                : theme === 'dark'
                                ? 'p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all'
                                : 'p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all'
                            }
                            title="Copy URL to clipboard"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-zinc-800/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>النتائج لكل صفحة:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={
                    theme === 'dark'
                      ? 'px-2 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300'
                      : 'px-2 py-1 text-xs bg-slate-100 border border-slate-300 rounded-lg text-slate-700'
                  }
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={1000}>1000 (الكل)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="px-3 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300"
                >
                  السابق
                </button>
                <span className="text-xs font-mono text-zinc-400">
                  {currentPage} من {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-3 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grouped by Source Page View */
        <div className="space-y-4">
          {groupedResults.map((pageRes, pageIdx) => {
            const isExpanded = expandedPages[pageRes.url] !== false;
            const linksCount = pageRes.filteredLinks.length;
            const isError = pageRes.status === 'error';

            return (
              <div
                key={pageIdx}
                className={
                  theme === 'dark'
                    ? 'bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg backdrop-blur-md'
                    : 'bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md'
                }
              >
                {/* Page Accordion Header */}
                <div
                  onClick={() => togglePageExpand(pageRes.url)}
                  className={
                    theme === 'dark'
                      ? 'flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-850 bg-zinc-950/40 border-b border-zinc-800/60 transition-colors'
                      : 'flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 bg-slate-50/70 border-b border-slate-200 transition-colors'
                  }
                >
                  <div className="flex items-center gap-3 rtl:space-x-reverse min-w-0">
                    <button className="text-zinc-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold truncate text-zinc-100 dark:text-zinc-100">
                          {pageRes.title || pageRes.url}
                        </h3>
                        {isError ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-full">
                            فشل الجلب ({pageRes.errorMessage || 'Error'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full font-mono">
                            {linksCount} رابط ومصدر مستخرج
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {pageRes.fetchTimeMs}ms
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono truncate" dir="ltr">
                        {pageRes.url}
                      </p>
                    </div>
                  </div>

                  {/* Actions for this page */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        const urls = pageRes.filteredLinks.map(l => l.url);
                        navigator.clipboard.writeText(urls.join('\n'));
                        setCopiedAllSuccess(true);
                        setTimeout(() => setCopiedAllSuccess(false), 2000);
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1"
                      title="Copy all links from this page"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ روابط الصفحة</span>
                    </button>
                  </div>
                </div>

                {/* Page Links Table if expanded */}
                {isExpanded && (
                  <div className="p-0 overflow-x-auto">
                    {linksCount === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-500">
                        {isError ? pageRes.errorMessage : 'لا توجد روابط أو مصادر مطابقة في هذه الصفحة.'}
                      </div>
                    ) : (
                      <table className="w-full text-right text-xs">
                        <tbody className="divide-y divide-zinc-800/30">
                          {pageRes.filteredLinks.map((link, lIdx) => (
                            <tr
                              key={link.id}
                              className={
                                theme === 'dark'
                                  ? 'hover:bg-zinc-800/40 transition-colors'
                                  : 'hover:bg-slate-50 transition-colors'
                              }
                            >
                              <td className="py-2.5 px-4 font-mono text-zinc-500 w-12 text-center">
                                {lIdx + 1}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-left max-w-md break-all">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
                                >
                                  {renderHighlightedUrl(link.url)}
                                  <ExternalLink className="w-3 h-3 opacity-60" />
                                </a>
                              </td>
                              <td className="py-2.5 px-4 text-zinc-300 max-w-xs truncate">
                                {link.text}
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                {renderTagBadges(link)}
                              </td>
                              <td className="py-2.5 px-4 text-center w-20">
                                <button
                                  onClick={() => handleCopyLink(link.url, link.id)}
                                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                  title="Copy URL"
                                >
                                  {copiedLinkMap[link.id] ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
