export interface ExtractedLink {
  id: string;
  url: string;               // Normalized absolute URL
  rawHref: string;           // Original raw href or src attribute
  text: string;              // Anchor / label text or media description
  titleAttr?: string;        // title attribute or type attribute
  domain: string;            // Hostname (e.g. example.com)
  isInternal: boolean;       // Same domain as source page
  isSpecialProtocol: boolean;// mailto, tel, javascript, etc.
  fileExtension?: string;    // e.g. .mp4, .pdf, .zip, .html
  sourceUrl: string;         // Webpage where link was found
  sourceTitle: string;       // Source page title
  tagType: 'a' | 'source' | 'video' | 'audio' | 'iframe' | 'area' | 'link' | 'media_embed' | 'data_attr';
  mediaType?: string;        // e.g. "video/mp4", "audio/mpeg"
  matchedPrefix?: boolean;   // Matched by prefix rule
  matchedSubstring?: boolean;// Matched by substring rule
}

export interface PageGrabResult {
  url: string;
  finalUrl: string;
  title: string;
  status: 'success' | 'error' | 'fetching';
  errorMessage?: string;
  httpStatus?: number;
  fetchTimeMs: number;
  totalLinksCount: number;
  matchedLinksCount: number;
  links: ExtractedLink[];
  isLocalHtml?: boolean;
}

export interface GrabOptions {
  prefix: string;            // بداية الرابط (e.g. "https://" or "/docs/")
  substring: string;         // جزء من الرابط (e.g. "download", "pdf", "mp4")
  matchCase: boolean;        // حساسية حالة الأحرف
  useRegex: boolean;         // استخدام تعبير نمطي
  matchMode: 'any' | 'prefix' | 'substring' | 'both';
  domainScope: 'all' | 'internal' | 'external'; // نطاق الروابط
  onlyUnique: boolean;       // استبعاد التكرار
  excludeAnchors: boolean;   // استبعاد روابط الصفحة مثل #top
  excludeJavascript: boolean;// استبعاد javascript:
  stealthMode: boolean;      // تجاوز الحماية بمحاكاة متصفح Chrome
  includeMediaSources: boolean; // استخراج مصادر الفيديو والصوت <source>, <video>, <audio>
}

export interface GrabHistoryItem {
  id: string;
  timestamp: number;
  sourceUrls: string[];
  totalExtracted: number;
  matchedCount: number;
  prefixFilter?: string;
  substringFilter?: string;
}

export interface PresetSample {
  id: string;
  name: string;
  description: string;
  urls: string[];
  prefix?: string;
  substring?: string;
}
