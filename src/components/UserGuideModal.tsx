import React from 'react';
import { X, FileText, Download, Link2, Globe, Filter, Copy, CheckCircle, ShieldCheck } from 'lucide-react';
import { generateUserGuidePdf } from '../utils/pdfGuideGenerator';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className={
        theme === 'dark'
          ? 'bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-zinc-800 overflow-hidden text-zinc-100'
          : 'bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-900'
      }>
        {/* Header */}
        <div className={
          theme === 'dark'
            ? 'p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950'
            : 'p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50'
        }>
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">دليل استخدام مستخرج الروابط (Link Grabber)</h3>
              <p className="text-xs text-zinc-400">شرح طريقة استخراج وتصفية الروابط ونسخها وتصديرها</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => generateUserGuidePdf()}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all shadow-xs"
              title="تحميل الدليل بصيغة PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs leading-relaxed">
          {/* Section 1 */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
            <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>1. ما هو Link Grabber وكيف يعمل؟</span>
            </h4>
            <p className="text-zinc-300">
              يقوم التطبيق بالدخول السريع إلى صفحات الويب التي تحددها (مع دعم كامل لبروتوكول HTTP/2 وتجاوز حماية البوتات عبر got-scraping)، ثم يقوم باستخراج كافة الروابط التشعبية (<code className="text-cyan-300 font-mono">a href</code>) الموجودة بداخل هذه الصفحات وتحويل الروابط النسبية إلى روابط كاملة جاهزة للاستخدام.
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
            <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>2. تصفية الروابط (بداية الرابط أو جزء منه)</span>
            </h4>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="font-bold text-cyan-300 block mb-0.5">• بداية الرابط (Link Prefix):</span>
                <p className="text-zinc-400">
                  تحديد بداية الرابط التي ترغب في استخراجها، مثل الروابط التي تبدأ بـ <code className="text-zinc-200 font-mono">https://</code> أو مسار محدد مثل <code className="text-zinc-200 font-mono">/docs/</code> أو <code className="text-zinc-200 font-mono">/products/</code> أو <code className="text-zinc-200 font-mono">/wiki/</code>.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="font-bold text-indigo-300 block mb-0.5">• جزء من الرابط (Link Substring):</span>
                <p className="text-zinc-400">
                  تحديد كلمة أو امتداد أو جزء يتواجد في أي مكان داخل الرابط أو نص الرابط، مثل <code className="text-zinc-200 font-mono">download</code> أو <code className="text-zinc-200 font-mono">.pdf</code> أو <code className="text-zinc-200 font-mono">2024</code> أو <code className="text-zinc-200 font-mono">article</code>.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="font-bold text-emerald-300 block mb-0.5">• الجمع بين الاثنين:</span>
                <p className="text-zinc-400">
                  يمكنك وضع بداية رابط وجزء من رابط معاً ليتم استخراج فقط الروابط التي تبدأ بالبداية المحددة وتحتوي أيضاً على الكلمة المطلوبة.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Copy className="w-4 h-4" />
              <span>3. نسخ وتصدير الروابط بضغطة واحدة</span>
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-300">
              <li>
                <strong>نسخ كل الروابط (Copy All):</strong> ينسخ جميع الروابط المستخرجة مباشرة إلى الحافظة (رابط في كل سطر) جاهزة للصق في برامج التحميل (Internet Download Manager، JDownloader، wget، curl) أو ملفات إكسيل.
              </li>
              <li>
                <strong>تنزيل ملف TXT:</strong> تنزيل قائمة نصية نظيفة لكافة الروابط.
              </li>
              <li>
                <strong>تنزيل ملف CSV:</strong> جدول كامل يتضمن الرابط، نص الرابط، النطاق، والصفحة المصدر.
              </li>
              <li>
                <strong>تنزيل JSON:</strong> كائنات برمجية للمطورين.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>4. وضع التصفح المتخفي (Anti-Bot Stealth)</span>
            </h4>
            <p className="text-zinc-300">
              يستخدم التطبيق محرك <code className="text-cyan-300 font-mono">got-scraping</code> مع بصمة متصفحات حديثة (Chrome/Edge)، وتشفير TLS JA3 وبروتوكول HTTP/2، مما يتيح له تجاوز أغلب حمايات الحظر وسحب الروابط بدقة وسرعة.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 dark:border-zinc-800/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            فهمت، حسناً
          </button>
        </div>
      </div>
    </div>
  );
};
