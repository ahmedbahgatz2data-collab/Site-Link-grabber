import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, FileSpreadsheet, Code2 } from 'lucide-react';
import { PageGrabResult, ExtractedLink, GrabOptions } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: PageGrabResult[];
  filterOptions: GrabOptions;
  theme?: 'dark' | 'light';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  results,
  filterOptions,
  theme = 'dark'
}) => {
  const [exportFormat, setExportFormat] = useState<'txt' | 'csv' | 'json'>('txt');
  const [includeScope, setIncludeScope] = useState<'matched' | 'all'>('matched');
  const [onlyUnique, setOnlyUnique] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Flatten links
  const allLinks: ExtractedLink[] = [];
  results.forEach(r => {
    if (r.status === 'success' && r.links) {
      allLinks.push(...r.links);
    }
  });

  // Filter links
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
    }

    let sMatch = true;
    if (substring) {
      const s = filterOptions.matchCase ? substring : substring.toLowerCase();
      const u = filterOptions.matchCase ? link.url : link.url.toLowerCase();
      const r = filterOptions.matchCase ? link.rawHref : link.rawHref.toLowerCase();
      const t = filterOptions.matchCase ? link.text : link.text.toLowerCase();
      sMatch = u.includes(s) || r.includes(s) || t.includes(s);
    }

    return prefix && substring
      ? (filterOptions.matchMode === 'any' ? pMatch || sMatch : pMatch && sMatch)
      : (prefix ? pMatch : sMatch);
  };

  let targetLinks = includeScope === 'matched' ? allLinks.filter(isLinkMatched) : allLinks;

  if (onlyUnique) {
    const seen = new Set<string>();
    targetLinks = targetLinks.filter(l => {
      const lower = l.url.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }

  // Generate Content
  const generateExportContent = (): string => {
    if (exportFormat === 'txt') {
      return targetLinks.map(l => l.url).join('\n');
    }

    if (exportFormat === 'csv') {
      const headers = ['URL', 'Anchor Text', 'Domain', 'Type', 'File Extension', 'Source Page URL', 'Source Title'];
      const rows = targetLinks.map(l => [
        `"${l.url.replace(/"/g, '""')}"`,
        `"${l.text.replace(/"/g, '""')}"`,
        `"${l.domain.replace(/"/g, '""')}"`,
        l.isInternal ? 'Internal' : 'External',
        `"${l.fileExtension || ''}"`,
        `"${l.sourceUrl.replace(/"/g, '""')}"`,
        `"${l.sourceTitle.replace(/"/g, '""')}"`
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    if (exportFormat === 'json') {
      return JSON.stringify(
        targetLinks.map(l => ({
          url: l.url,
          anchorText: l.text,
          domain: l.domain,
          type: l.isInternal ? 'internal' : 'external',
          fileExtension: l.fileExtension,
          sourcePage: l.sourceUrl,
          sourceTitle: l.sourceTitle
        })),
        null,
        2
      );
    }

    return '';
  };

  const handleDownload = () => {
    const content = generateExportContent();
    const mimeTypes = {
      txt: 'text/plain;charset=utf-8',
      csv: 'text/csv;charset=utf-8;',
      json: 'application/json;charset=utf-8'
    };

    const finalContent = exportFormat === 'csv' ? '\uFEFF' + content : content;
    const blob = new Blob([finalContent], { type: mimeTypes[exportFormat] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grabbed_links_${Date.now()}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const content = generateExportContent();
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const previewSnippet = generateExportContent().slice(0, 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className={
        theme === 'dark'
          ? 'bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden'
          : 'bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden'
      }>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 dark:text-zinc-100">
                تصدير الروابط المستخرجة (Export Links)
              </h3>
              <p className="text-xs text-zinc-400">
                تنزيل الروابط بصيغ متعددة (TXT, CSV, JSON) متوافقة مع برامج التحميل وقواعد البيانات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              صيغة التصدير (Export Format)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('txt')}
                className={
                  exportFormat === 'txt'
                    ? 'p-3 rounded-xl border-2 border-cyan-500 bg-cyan-500/10 text-cyan-300 flex flex-col items-center gap-1.5'
                    : 'p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 flex flex-col items-center gap-1.5'
                }
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs font-bold">TXT (قائمة روابط)</span>
                <span className="text-[10px] text-zinc-500">رابط في كل سطر لـ IDM و curl</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={
                  exportFormat === 'csv'
                    ? 'p-3 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 text-emerald-300 flex flex-col items-center gap-1.5'
                    : 'p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 flex flex-col items-center gap-1.5'
                }
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span className="text-xs font-bold">CSV (جدول إكسيل)</span>
                <span className="text-[10px] text-zinc-500">شامل النصوص والنطاقات والأنواع</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('json')}
                className={
                  exportFormat === 'json'
                    ? 'p-3 rounded-xl border-2 border-indigo-500 bg-indigo-500/10 text-indigo-300 flex flex-col items-center gap-1.5'
                    : 'p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 flex flex-col items-center gap-1.5'
                }
              >
                <Code2 className="w-5 h-5" />
                <span className="text-xs font-bold">JSON (بيانات برمجية)</span>
                <span className="text-[10px] text-zinc-500">مصفوفة كائنات مهيكلة</span>
              </button>
            </div>
          </div>

          {/* Scope & Deduplication */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                نطاق التصدير
              </label>
              <select
                value={includeScope}
                onChange={(e: any) => setIncludeScope(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-200"
              >
                <option value="matched">الروابط المطابقة للمعيار فقط ({targetLinks.length})</option>
                <option value="all">جميع الروابط المستخرجة ({allLinks.length})</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                إزالة التكرار
              </label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={onlyUnique}
                  onChange={(e) => setOnlyUnique(e.target.checked)}
                  className="rounded border-zinc-700 text-cyan-600 focus:ring-cyan-500"
                />
                <span>تصدير الروابط الفريدة فقط (Unique URLs)</span>
              </label>
            </div>
          </div>

          {/* Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-400">
                معاينة محتوى التصدير ({targetLinks.length} رابط):
              </label>
            </div>
            <pre
              dir="ltr"
              className="p-3 text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 max-h-48 overflow-y-auto whitespace-pre custom-scrollbar"
            >
              {previewSnippet || 'لا توجد روابط لتصديرها.'}
              {targetLinks.length > 20 && '\n... (باقي الروابط تظهر في الملف المحمل)'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-800/80 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={handleCopy}
            disabled={targetLinks.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'تم النسخ!' : 'نسخ المحتوى'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={targetLinks.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل الملف ({targetLinks.length} رابط)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
