import React, { useState, useRef } from 'react';
import {
  Link2,
  Play,
  RotateCcw,
  SlidersHorizontal,
  UploadCloud,
  FileCode,
  Sparkles,
  Check,
  Globe,
  Filter,
  ShieldCheck,
  AlertCircle,
  Copy,
  FolderOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { GrabOptions, PresetSample } from '../types';
import { SAMPLE_PRESETS } from '../data/presets';

interface GrabControlsProps {
  onGrab: (
    urls: string[],
    filterOptions: GrabOptions,
    rawPages?: Array<{ name: string; html: string }>
  ) => void;
  isLoading: boolean;
  onStop?: () => void;
  theme?: 'dark' | 'light';
}

export const GrabControls: React.FC<GrabControlsProps> = ({
  onGrab,
  isLoading,
  onStop,
  theme = 'dark'
}) => {
  // URLs Input
  const [urlsText, setUrlsText] = useState<string>('');
  
  // Local HTML files
  const [uploadedHtmlFiles, setUploadedHtmlFiles] = useState<Array<{ name: string; html: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [prefix, setPrefix] = useState<string>('');
  const [substring, setSubstring] = useState<string>('');
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [useRegex, setUseRegex] = useState<boolean>(false);
  const [matchMode, setMatchMode] = useState<'both' | 'any'>('both');
  const [domainScope, setDomainScope] = useState<'all' | 'internal' | 'external'>('all');
  const [onlyUnique, setOnlyUnique] = useState<boolean>(true);
  const [excludeAnchors, setExcludeAnchors] = useState<boolean>(true);
  const [excludeJavascript, setExcludeJavascript] = useState<boolean>(true);
  const [stealthMode, setStealthMode] = useState<boolean>(true);
  const [includeMediaSources, setIncludeMediaSources] = useState<boolean>(true);

  // Advanced options accordion
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Extract URLs from text
  const extractUrlsFromText = (text: string): string[] => {
    if (!text.trim()) return [];
    // Split by newlines, commas, or whitespace
    const lines = text.split(/[\r\n,]+/).map(l => l.trim()).filter(l => l.length > 0);
    const urls: string[] = [];

    lines.forEach(line => {
      // Find URLs matching http/https or domains
      const match = line.match(/(https?:\/\/[^\s"'<>]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s"'<>]*)/i);
      if (match) {
        let u = match[0].trim();
        if (!/^https?:\/\//i.test(u)) {
          u = 'https://' + u;
        }
        urls.push(u);
      }
    });

    return Array.from(new Set(urls));
  };

  const parsedUrls = extractUrlsFromText(urlsText);
  const totalTargetCount = parsedUrls.length + uploadedHtmlFiles.length;

  // Handle Preset selection
  const handleApplyPreset = (preset: PresetSample) => {
    setSelectedPresetId(preset.id);
    setUrlsText(preset.urls.join('\n'));
    setPrefix(preset.prefix || '');
    setSubstring(preset.substring || '');
  };

  // Handle File Upload (HTML or TXT with URLs)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');

      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) return;

        if (isHtml) {
          setUploadedHtmlFiles(prev => [...prev, { name: file.name, html: content }]);
        } else {
          // Plain text list of URLs
          const found = extractUrlsFromText(content);
          if (found.length > 0) {
            setUrlsText(prev => (prev ? prev + '\n' + found.join('\n') : found.join('\n')));
          }
        }
      };

      reader.readAsText(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlsText(prev => (prev ? prev + '\n' + text : text));
      }
    } catch {
      // Clipboard access might be blocked
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalTargetCount === 0) return;

    const filterOptions: GrabOptions = {
      prefix,
      substring,
      matchCase,
      useRegex,
      matchMode,
      domainScope,
      onlyUnique,
      excludeAnchors,
      excludeJavascript,
      stealthMode,
      includeMediaSources
    };

    onGrab(parsedUrls, filterOptions, uploadedHtmlFiles);
  };

  const handleClear = () => {
    setUrlsText('');
    setUploadedHtmlFiles([]);
    setPrefix('');
    setSubstring('');
    setSelectedPresetId('');
  };

  return (
    <div className={
      theme === 'dark'
        ? 'bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl backdrop-blur-md transition-colors'
        : 'bg-white border border-slate-200 rounded-2xl p-5 shadow-lg backdrop-blur-md transition-colors'
    }>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Top Header & Presets Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/60 dark:border-zinc-800/60">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className={theme === 'dark' ? 'text-base font-bold text-white' : 'text-base font-bold text-slate-900'}>
                استخراج الروابط من صفحات الويب (Link Grabber)
              </h2>
              <p className={theme === 'dark' ? 'text-xs text-zinc-400' : 'text-xs text-slate-500'}>
                أدخل روابط الصفحات وحدد بداية الرابط أو جزءاً منه للاستخراج
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={theme === 'dark' ? 'text-xs text-zinc-400 font-medium' : 'text-xs text-slate-500 font-medium'}>
              نماذج جاهزة:
            </span>
            {SAMPLE_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={
                  selectedPresetId === preset.id
                    ? 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-600 text-white shadow-xs transition-all'
                    : theme === 'dark'
                    ? 'px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all'
                    : 'px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all'
                }
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Section 1: URLs Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={theme === 'dark' ? 'text-xs font-semibold text-zinc-300 flex items-center gap-1.5' : 'text-xs font-semibold text-slate-700 flex items-center gap-1.5'}>
              <Globe className="w-4 h-4 text-cyan-500" />
              <span>روابط صفحات الويب المراد فحصها (Target URLs)</span>
              {totalTargetCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
                  {totalTargetCount} {totalTargetCount === 1 ? 'صفحة' : 'صفحات'}
                </span>
              )}
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className={
                  theme === 'dark'
                    ? 'flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-all'
                    : 'flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all'
                }
                title="Paste URLs from clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>لصق</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={
                  theme === 'dark'
                    ? 'flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-all'
                    : 'flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all'
                }
                title="Upload HTML or TXT file"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                <span>رفع ملف</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.txt,.csv"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              {(urlsText || uploadedHtmlFiles.length > 0) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder="ضع روابط الصفحات هنا (رابط في كل سطر)...&#10;مثال:&#10;https://en.wikipedia.org/wiki/Artificial_intelligence&#10;https://developer.mozilla.org/en-US/docs/Web/JavaScript"
            rows={4}
            dir="ltr"
            className={
              theme === 'dark'
                ? 'w-full px-3.5 py-2.5 text-xs font-mono bg-zinc-950/80 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all custom-scrollbar'
                : 'w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all custom-scrollbar'
            }
          />

          {/* Uploaded HTML Files Badges */}
          {uploadedHtmlFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={theme === 'dark' ? 'text-xs text-zinc-400' : 'text-xs text-slate-500'}>
                ملفات محلية مضافة:
              </span>
              {uploadedHtmlFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-lg"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setUploadedHtmlFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="text-zinc-400 hover:text-rose-400 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Link Filters (Prefix & Substring) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prefix Filter (بداية الرابط) */}
          <div className={
            theme === 'dark'
              ? 'p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800'
              : 'p-3.5 rounded-xl bg-slate-50 border border-slate-200'
          }>
            <div className="flex items-center justify-between mb-1.5">
              <label className={theme === 'dark' ? 'text-xs font-semibold text-zinc-200 flex items-center gap-1.5' : 'text-xs font-semibold text-slate-800 flex items-center gap-1.5'}>
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>بداية الرابط (Link Prefix) - اختياري</span>
              </label>
              <span className="text-[11px] text-zinc-500">Starts with</span>
            </div>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="مثال: https:// أو /wiki/ أو /docs/ أو /product/"
              dir="ltr"
              className={
                theme === 'dark'
                  ? 'w-full px-3 py-2 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all'
                  : 'w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all'
              }
            />
            {/* Quick prefix chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-zinc-500">اقتراحات:</span>
              {['https://', '/wiki/', '/docs/', '/api/', '/download/', '/item/'].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setPrefix(chip)}
                  className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-all"
                >
                  {chip}
                </button>
              ))}
              {prefix && (
                <button
                  type="button"
                  onClick={() => setPrefix('')}
                  className="text-[10px] text-rose-400 hover:text-rose-300 mr-auto"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* Substring Filter (جزء من الرابط) */}
          <div className={
            theme === 'dark'
              ? 'p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800'
              : 'p-3.5 rounded-xl bg-slate-50 border border-slate-200'
          }>
            <div className="flex items-center justify-between mb-1.5">
              <label className={theme === 'dark' ? 'text-xs font-semibold text-zinc-200 flex items-center gap-1.5' : 'text-xs font-semibold text-slate-800 flex items-center gap-1.5'}>
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>جزء من الرابط (Link Substring / Keyword) - اختياري</span>
              </label>
              <span className="text-[11px] text-zinc-500">Contains</span>
            </div>
            <input
              type="text"
              value={substring}
              onChange={(e) => setSubstring(e.target.value)}
              placeholder="مثال: download أو .pdf أو category أو 2024"
              dir="ltr"
              className={
                theme === 'dark'
                  ? 'w-full px-3 py-2 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all'
                  : 'w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all'
              }
            />
            {/* Quick substring chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-zinc-500">اقتراحات:</span>
              {['.mp4', 'video', 'download', '.pdf', '.zip', 'article', '2024'].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSubstring(chip)}
                  className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all"
                >
                  {chip}
                </button>
              ))}
              {substring && (
                <button
                  type="button"
                  onClick={() => setSubstring('')}
                  className="text-[10px] text-rose-400 hover:text-rose-300 mr-auto"
                >
                  مسح
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Options Accordion */}
        <div className="border-t border-zinc-800/60 dark:border-zinc-800/60 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={
              theme === 'dark'
                ? 'flex items-center justify-between w-full text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors'
                : 'flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors'
            }
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-500" />
              <span>خيارات الاستخراج المتقدمة (Scope, Deduplication, Anti-bot)</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-zinc-800/40">
              {/* Domain Scope */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  نطاق الروابط (Domain Scope)
                </label>
                <select
                  value={domainScope}
                  onChange={(e: any) => setDomainScope(e.target.value)}
                  className={
                    theme === 'dark'
                      ? 'w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200'
                      : 'w-full px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-300 rounded-lg text-slate-800'
                  }
                >
                  <option value="all">الكل (داخلية وخارجية)</option>
                  <option value="internal">روابط داخلية فقط (نفس الموقع)</option>
                  <option value="external">روابط خارجية فقط (مواقع أخرى)</option>
                </select>
              </div>

              {/* Match Mode when both prefix and substring are used */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  تطبيق الفلاتر (إذا وُجد كلاهما)
                </label>
                <select
                  value={matchMode}
                  onChange={(e: any) => setMatchMode(e.target.value)}
                  className={
                    theme === 'dark'
                      ? 'w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200'
                      : 'w-full px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-300 rounded-lg text-slate-800'
                  }
                >
                  <option value="both">كلاهما معاً (الرابط يبدأ بـ ويحتوي على)</option>
                  <option value="any">أي منهما (مطابقة البداية أو الكلمة)</option>
                </select>
              </div>

              {/* Deduplication & Cleanup */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={onlyUnique}
                    onChange={(e) => setOnlyUnique(e.target.checked)}
                    className="rounded border-zinc-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>إزالة الروابط المكررة (Unique Only)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={excludeAnchors}
                    onChange={(e) => setExcludeAnchors(e.target.checked)}
                    className="rounded border-zinc-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>استبعاد قفزات الصفحة (#section)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeMediaSources}
                    onChange={(e) => setIncludeMediaSources(e.target.checked)}
                    className="rounded border-zinc-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-cyan-400 font-semibold">استخراج وسائط &lt;source&gt; و &lt;video&gt;</span>
                </label>
              </div>

              {/* Bot Protection & Regex */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={stealthMode}
                    onChange={(e) => setStealthMode(e.target.checked)}
                    className="rounded border-zinc-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>وضع التخفي (got-scraping HTTP/2)</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={useRegex}
                    onChange={(e) => setUseRegex(e.target.checked)}
                    className="rounded border-zinc-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>استخدام تعبير نمطي (Regex) للكلمة</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-zinc-400">
            {totalTargetCount === 0 ? (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                أدخل رابط صفحة ويب واحدة على الأقل للبدء
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                جاهز لفحص {totalTargetCount} صفحة واستخراج الروابط
                {prefix && ` (تبدأ بـ: "${prefix}")`}
                {substring && ` (تحتوي على: "${substring}")`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLoading && onStop && (
              <button
                type="button"
                onClick={onStop}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all"
              >
                إيقاف العملية
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || totalTargetCount === 0}
              className={
                isLoading || totalTargetCount === 0
                  ? 'flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700 transition-all'
                  : 'flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5'
              }
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري استخراج الروابط...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>استخراج الروابط (Grab Links)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
