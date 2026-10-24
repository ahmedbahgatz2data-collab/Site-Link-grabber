import React from 'react';
import { GrabHistoryItem } from '../types';
import { X, History, Trash2, ArrowRight, Calendar, Globe, Link2, Sparkles } from 'lucide-react';

interface GrabHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GrabHistoryItem[];
  onRestore: (item: GrabHistoryItem) => void;
  onClearHistory: () => void;
  theme?: 'dark' | 'light';
}

export const SearchHistoryModal: React.FC<GrabHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onRestore,
  onClearHistory,
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className={
        theme === 'dark'
          ? 'bg-zinc-900 rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-zinc-800 overflow-hidden text-zinc-100'
          : 'bg-white rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-900'
      }>
        {/* Header */}
        <div className={
          theme === 'dark'
            ? 'p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950'
            : 'p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50'
        }>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold">سجل عمليات الاستخراج السابقة</h3>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                مسح السجل
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {history.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <History className="w-8 h-8 mx-auto opacity-40 text-zinc-600" />
              <p className="text-sm font-medium">لا توجد عمليات استخراج سابقة</p>
              <p className="text-xs text-zinc-600">يتم حفظ عملياتك هنا تلقائياً لسرعة الرجوع إليها وإعادة تشغيلها.</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className={
                  theme === 'dark'
                    ? 'group bg-zinc-950 rounded-xl p-4 border border-zinc-800 hover:border-cyan-500/50 transition-all flex items-start justify-between gap-4'
                    : 'group bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-cyan-500/50 transition-all flex items-start justify-between gap-4'
                }
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{new Date(item.timestamp).toLocaleString('ar-EG')}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-cyan-400 font-semibold">{item.matchedCount} رابط مطابق</span>
                    <span className="text-zinc-600 font-mono">({item.totalExtracted} إجمالي)</span>
                  </div>

                  {/* URLs preview */}
                  <div className="text-xs font-mono flex items-center gap-1.5 line-clamp-1" dir="ltr">
                    <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{item.sourceUrls.join(', ')}</span>
                  </div>

                  {/* Filters tags */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {item.prefixFilter && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        يبدأ بـ: {item.prefixFilter}
                      </span>
                    )}
                    {item.substringFilter && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        يحتوي على: {item.substringFilter}
                      </span>
                    )}
                    {!item.prefixFilter && !item.substringFilter && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-zinc-800 text-zinc-400">
                        بدون فلتر (استخراج الكل)
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onRestore(item);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 self-center"
                >
                  <span>إعادة الفحص</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
