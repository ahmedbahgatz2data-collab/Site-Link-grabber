import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to normalize URL
function normalizeUrl(urlStr: string): string {
  let trimmed = urlStr.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

// Clean text
function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract file extension from URL
function extractFileExtension(urlStr: string): string | undefined {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const lastSlash = pathname.lastIndexOf('/');
    const filename = lastSlash !== -1 ? pathname.substring(lastSlash + 1) : pathname;
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex !== -1 && dotIndex < filename.length - 1) {
      const ext = filename.substring(dotIndex).toLowerCase();
      // Match typical extensions up to 7 characters (e.g. .mp4, .m3u8, .webm, .pdf, .zip, .html, .jpg)
      if (/^\.[a-z0-9]{1,7}$/i.test(ext)) {
        return ext;
      }
    }
  } catch {
    // Ignore
  }
  return undefined;
}

// Extract filename from URL
function extractFilename(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const lastSlash = pathname.lastIndexOf('/');
    const fname = lastSlash !== -1 ? pathname.substring(lastSlash + 1) : pathname;
    return decodeURIComponent(fname || '');
  } catch {
    return '';
  }
}

// Lazy-load gotScraping
let gotScrapingFn: any = null;
async function getGotScraping() {
  if (!gotScrapingFn) {
    const mod = await import('got-scraping');
    gotScrapingFn = mod.gotScraping;
  }
  return gotScrapingFn;
}

interface FetchWebpageResult {
  ok: boolean;
  status: number;
  statusText?: string;
  html?: string;
  error?: string;
  finalUrl: string;
  hops: string[];
}

// Fetch single webpage with Apify got-scraping, TLS / JA3 & HTTP/2 browser fingerprinting
async function fetchWebpage(targetUrl: string, stealthMode: boolean = true): Promise<FetchWebpageResult> {
  const client = await getGotScraping();
  let currentUrl = targetUrl;
  const maxHops = 10;
  const hops: string[] = [currentUrl];
  const timeoutMs = 12000;

  let lastStatus = 0;
  let lastStatusText = '';
  let lastError = '';

  for (let hop = 0; hop <= maxHops; hop++) {
    let origin = '';
    try {
      origin = new URL(currentUrl).origin;
    } catch {
      return {
        ok: false,
        status: 400,
        error: `Invalid URL format: ${currentUrl}`,
        finalUrl: currentUrl,
        hops
      };
    }

    try {
      const requestOptions: any = stealthMode
        ? {
            url: currentUrl,
            http2: true,
            headerGeneratorOptions: {
              browsers: [
                { name: 'chrome', minVersion: 115 },
                { name: 'edge', minVersion: 115 }
              ],
              operatingSystems: ['windows', 'macos'],
              devices: ['desktop'],
              locales: ['en-US', 'en', 'ar']
            },
            headers: {
              'referer': origin ? `${origin}/` : 'https://www.google.com/',
              'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
              'upgrade-insecure-requests': '1',
              'cache-control': 'max-age=0'
            },
            followRedirect: false,
            throwHttpErrors: false,
            timeout: { request: timeoutMs },
            retry: { limit: 0 }
          }
        : {
            url: currentUrl,
            http2: false,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'accept-language': 'en-US,en;q=0.9'
            },
            followRedirect: false,
            throwHttpErrors: false,
            timeout: { request: timeoutMs },
            retry: { limit: 0 }
          };

      const response = await client(requestOptions);
      lastStatus = response.statusCode;
      lastStatusText = response.statusMessage || '';

      const isRedirect = [301, 302, 303, 307, 308].includes(response.statusCode);
      const location = response.headers.location;

      if (isRedirect && location) {
        if (hop >= maxHops) {
          return {
            ok: false,
            status: response.statusCode,
            statusText: response.statusMessage,
            error: `Exceeded maximum redirection limit of 10 hops`,
            finalUrl: currentUrl,
            hops
          };
        }
        const nextUrl = new URL(location, currentUrl).href;
        hops.push(nextUrl);
        currentUrl = nextUrl;
        continue;
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          ok: true,
          status: response.statusCode,
          statusText: response.statusMessage,
          html: response.body || '',
          finalUrl: currentUrl,
          hops
        };
      }

      let errorMessage = `HTTP Error ${response.statusCode}: ${response.statusMessage || ''}`.trim();
      if (response.statusCode === 403) {
        errorMessage = `HTTP Error 403: Forbidden (Access blocked by target server)`;
      } else if (response.statusCode === 429) {
        errorMessage = `HTTP Error 429: Too Many Requests (Rate limit reached)`;
      }

      return {
        ok: false,
        status: response.statusCode,
        statusText: response.statusMessage,
        error: errorMessage,
        finalUrl: currentUrl,
        hops
      };

    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
        lastError = `Connection timed out after ${timeoutMs / 1000}s on ${currentUrl}`;
      } else {
        lastError = err.message || `Failed to fetch webpage (${currentUrl})`;
      }
      return {
        ok: false,
        status: lastStatus || 500,
        statusText: lastStatusText,
        error: lastError,
        finalUrl: currentUrl,
        hops
      };
    }
  }

  return {
    ok: false,
    status: lastStatus || 500,
    statusText: lastStatusText,
    error: lastError || 'Failed to fetch webpage after maximum hops',
    finalUrl: currentUrl,
    hops
  };
}

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

export interface FilterCriteria {
  prefix?: string;           // بداية الرابط
  substring?: string;        // جزء من الرابط
  matchCase?: boolean;       // حساسية حالة الأحرف
  useRegex?: boolean;        // استخدام Regex
  matchMode?: 'any' | 'prefix' | 'substring' | 'both';
  domainScope?: 'all' | 'internal' | 'external';
  onlyUnique?: boolean;
  excludeAnchors?: boolean;
  excludeJavascript?: boolean;
  includeMediaSources?: boolean;
}

interface RawLinkCandidate {
  rawHref: string;
  text: string;
  titleAttr?: string;
  tagType: 'a' | 'source' | 'video' | 'audio' | 'iframe' | 'area' | 'link' | 'media_embed' | 'data_attr';
  mediaType?: string;
}

// Function to extract and filter all links (including <source>, <video>, <audio>, <iframe>, and data-src) from HTML
function extractLinksFromHtml(
  html: string,
  sourceUrl: string,
  filter: FilterCriteria = {}
): { title: string; links: ExtractedLink[]; totalCount: number; matchedCount: number } {
  if (!html || !html.trim()) {
    return { title: 'Empty Page', links: [], totalCount: 0, matchedCount: 0 };
  }

  const $ = cheerio.load(html);
  const title = cleanText($('title').first().text()) || sourceUrl;

  // Check base tag
  let effectiveBaseUrl = sourceUrl;
  const baseHref = $('base[href]').attr('href');
  if (baseHref) {
    try {
      effectiveBaseUrl = new URL(baseHref, sourceUrl).href;
    } catch {
      // Ignore
    }
  }

  let sourceHostname = '';
  try {
    sourceHostname = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    // Ignore
  }

  const rawLinks: RawLinkCandidate[] = [];

  // Helper to push candidate
  const addCandidate = (item: RawLinkCandidate) => {
    const trimmed = item.rawHref?.trim();
    if (!trimmed) return;
    rawLinks.push({
      ...item,
      rawHref: trimmed
    });
  };

  // 1. Extract from <a> tags
  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href');
    if (!rawHref) return;

    const $clone = $(el).clone();
    $clone.find('script, style, noscript').remove();
    let text = cleanText($clone.text());
    if (!text) {
      const imgAlt = cleanText($clone.find('img[alt]').attr('alt') || '');
      if (imgAlt) {
        text = `[صورة: ${imgAlt}]`;
      } else {
        const titleVal = cleanText($(el).attr('title') || '');
        if (titleVal) {
          text = `[${titleVal}]`;
        }
      }
    }

    const titleAttr = cleanText($(el).attr('title') || '');
    addCandidate({ rawHref, text: text || '[رابط بدون نص]', titleAttr, tagType: 'a' });
  });

  // 2. Extract from <source src="..."> & <source srcset="..."> (Key User Request: video/audio sources)
  $('source').each((_, el) => {
    const src = $(el).attr('src')?.trim();
    const srcset = $(el).attr('srcset')?.trim();
    const type = $(el).attr('type')?.trim() || '';
    const parentTag = $(el).parent().prop('tagName')?.toLowerCase() || 'media';
    const filename = src ? extractFilename(src) : '';

    if (src) {
      const typeLabel = type ? `[${parentTag.toUpperCase()} Source: ${type}]` : `[${parentTag.toUpperCase()} Source]`;
      const label = filename ? `${typeLabel} ${filename}` : typeLabel;
      addCandidate({
        rawHref: src,
        text: label,
        titleAttr: type,
        tagType: 'source',
        mediaType: type
      });
    }

    if (srcset) {
      // srcset can contain multiple URLs e.g. "image-1.jpg 1x, image-2.jpg 2x"
      const entries = srcset.split(',');
      entries.forEach(entry => {
        const parts = entry.trim().split(/\s+/);
        if (parts[0]) {
          addCandidate({
            rawHref: parts[0],
            text: `[Source srcset: ${type || parentTag}]`,
            titleAttr: type,
            tagType: 'source',
            mediaType: type
          });
        }
      });
    }
  });

  // 3. Extract from <video src="..."> and <audio src="...">
  $('video[src], audio[src]').each((_, el) => {
    const src = $(el).attr('src')?.trim();
    if (!src) return;
    const tagName = $(el).prop('tagName')?.toLowerCase() || 'video';
    const filename = extractFilename(src);
    addCandidate({
      rawHref: src,
      text: filename ? `[${tagName.toUpperCase()}: ${filename}]` : `[${tagName.toUpperCase()} File]`,
      titleAttr: $(el).attr('type') || '',
      tagType: tagName === 'audio' ? 'audio' : 'video',
      mediaType: $(el).attr('type') || ''
    });
  });

  // 4. Extract from <iframe src="...">, <embed src="...">, <object data="...">
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src')?.trim();
    if (!src) return;
    const titleVal = $(el).attr('title') || $(el).attr('name') || '';
    addCandidate({
      rawHref: src,
      text: titleVal ? `[iFrame: ${titleVal}]` : '[Embedded iFrame]',
      titleAttr: titleVal,
      tagType: 'iframe'
    });
  });

  $('embed[src]').each((_, el) => {
    const src = $(el).attr('src')?.trim();
    if (!src) return;
    const type = $(el).attr('type') || '';
    addCandidate({
      rawHref: src,
      text: `[Embedded Media: ${type || 'embed'}]`,
      titleAttr: type,
      tagType: 'embed' as any,
      mediaType: type
    });
  });

  $('object[data]').each((_, el) => {
    const data = $(el).attr('data')?.trim();
    if (!data) return;
    const type = $(el).attr('type') || '';
    addCandidate({
      rawHref: data,
      text: `[Object Media: ${type || 'object'}]`,
      titleAttr: type,
      tagType: 'media_embed',
      mediaType: type
    });
  });

  // 5. Extract from <area href="...">
  $('area[href]').each((_, el) => {
    const rawHref = $(el).attr('href')?.trim();
    if (!rawHref) return;
    const alt = cleanText($(el).attr('alt') || '');
    addCandidate({ rawHref, text: alt || '[Area Link]', tagType: 'area' });
  });

  // 6. Extract from modern media players and lazy-loading elements (data-src, data-video, data-video-url, data-mp4, data-stream, data-href, data-url)
  $('[data-src], [data-video], [data-video-url], [data-mp4], [data-stream], [data-file], [data-url], [data-href]').each((_, el) => {
    const $el = $(el);
    const tagName = $(el).prop('tagName')?.toLowerCase() || 'el';
    // Skip if it's already an <a> or <source> or <video> that had direct src/href handled
    if (tagName === 'a' && $el.attr('href')) return;
    if (tagName === 'source' && $el.attr('src')) return;
    if ((tagName === 'video' || tagName === 'audio') && $el.attr('src')) return;

    const dataAttributes = ['data-src', 'data-video', 'data-video-url', 'data-mp4', 'data-stream', 'data-file', 'data-url', 'data-href'];
    dataAttributes.forEach(attr => {
      const val = $el.attr(attr)?.trim();
      if (val && !val.startsWith('{') && !val.startsWith('[') && val.length > 3) {
        const filename = extractFilename(val);
        addCandidate({
          rawHref: val,
          text: filename ? `[Data Media ${attr}: ${filename}]` : `[Data Attribute: ${attr}]`,
          titleAttr: attr,
          tagType: 'data_attr'
        });
      }
    });
  });

  // 7. Scan inline scripts for video & media streams (e.g. .mp4, .m3u8, .mpd, .webm, etc.)
  // Often video players on streaming websites define source URLs inside <script> window.playerConfig = { file: "https://...mp4" }
  $('script:not([src])').each((_, el) => {
    const scriptContent = $(el).html();
    if (!scriptContent || scriptContent.length < 10) return;

    // Search for media stream patterns
    const mediaRegex = /(https?:\/\/[^\s"'<>\\]+?\.(?:mp4|m3u8|mpd|webm|mkv|avi|mov|ts|mp3|m4a|wav|aac|flac|ogg)(?:\?[^\s"'<>\\]*)?)/gi;
    let match: RegExpExecArray | null;
    let foundInScript = 0;
    while ((match = mediaRegex.exec(scriptContent)) !== null && foundInScript < 25) {
      foundInScript++;
      const mediaUrl = match[1].replace(/\\/g, ''); // Unescape \/ in JSON
      const filename = extractFilename(mediaUrl);
      addCandidate({
        rawHref: mediaUrl,
        text: filename ? `[Inline Media Player: ${filename}]` : '[Inline Stream URL]',
        titleAttr: 'Inline Script Stream',
        tagType: 'media_embed'
      });
    }
  });

  // Prepare filter conditions
  const prefix = (filter.prefix || '').trim();
  const substring = (filter.substring || '').trim();
  const matchCase = Boolean(filter.matchCase);
  const useRegex = Boolean(filter.useRegex);
  const matchMode = filter.matchMode || 'both';
  const excludeAnchors = filter.excludeAnchors !== false;
  const excludeJavascript = filter.excludeJavascript !== false;

  const extractedLinks: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

  rawLinks.forEach((item, index) => {
    const { rawHref, text, titleAttr, tagType, mediaType } = item;

    // Check special protocols
    const isJavascript = /^javascript:/i.test(rawHref);
    const isAnchorOnly = /^#/.test(rawHref);
    const isMailto = /^mailto:/i.test(rawHref);
    const isTel = /^tel:/i.test(rawHref);
    const isDataUri = /^data:/i.test(rawHref);
    const isSpecialProtocol = isJavascript || isAnchorOnly || isMailto || isTel || isDataUri;

    if (excludeJavascript && isJavascript) return;
    if (excludeAnchors && isAnchorOnly) return;
    if (isDataUri && rawHref.length > 200) return; // Skip large base64 data blobs

    // Resolve absolute URL
    let absoluteUrl = rawHref;
    let domain = '';
    let isInternal = false;

    if (!isSpecialProtocol) {
      try {
        const parsed = new URL(rawHref, effectiveBaseUrl);
        absoluteUrl = parsed.href;
        domain = parsed.hostname.toLowerCase();

        if (sourceHostname && domain) {
          isInternal = domain === sourceHostname ||
                       domain.endsWith('.' + sourceHostname) ||
                       sourceHostname.endsWith('.' + domain);
        }
      } catch {
        absoluteUrl = rawHref;
      }
    }

    // Domain Scope Filter
    if (filter.domainScope === 'internal' && !isInternal) return;
    if (filter.domainScope === 'external' && isInternal) return;

    // Deduplication check if onlyUnique is enabled
    if (filter.onlyUnique) {
      const dedupeKey = absoluteUrl.toLowerCase();
      if (seenUrls.has(dedupeKey)) return;
      seenUrls.add(dedupeKey);
    }

    const fileExtension = extractFileExtension(absoluteUrl);

    // Matching Logic: Prefix & Substring
    let matchedPrefix = true;
    let matchedSubstring = true;

    const urlToTest = matchCase ? absoluteUrl : absoluteUrl.toLowerCase();
    const rawToTest = matchCase ? rawHref : rawHref.toLowerCase();
    const textToTest = matchCase ? text : text.toLowerCase();

    // 1. Prefix Test (بداية الرابط)
    if (prefix) {
      const p = matchCase ? prefix : prefix.toLowerCase();
      matchedPrefix = urlToTest.startsWith(p) || rawToTest.startsWith(p);
      if (!matchedPrefix && !p.startsWith('http')) {
        try {
          const parsed = new URL(absoluteUrl);
          const pathToCheck = matchCase ? parsed.pathname : parsed.pathname.toLowerCase();
          matchedPrefix = pathToCheck.startsWith(p) || pathToCheck.startsWith('/' + p.replace(/^\//, ''));
        } catch {
          // Ignore
        }
      }
    }

    // 2. Substring Test (جزء من الرابط)
    if (substring) {
      if (useRegex) {
        try {
          const regex = new RegExp(substring, matchCase ? '' : 'i');
          matchedSubstring = regex.test(absoluteUrl) || regex.test(rawHref) || regex.test(text);
        } catch {
          matchedSubstring = false;
        }
      } else {
        const sub = matchCase ? substring : substring.toLowerCase();
        matchedSubstring = urlToTest.includes(sub) || rawToTest.includes(sub) || textToTest.includes(sub);
      }
    }

    // Overall match determination
    let isMatch = true;
    if (prefix && substring) {
      isMatch = matchMode === 'any' ? (matchedPrefix || matchedSubstring) : (matchedPrefix && matchedSubstring);
    } else if (prefix) {
      isMatch = matchedPrefix;
    } else if (substring) {
      isMatch = matchedSubstring;
    }

    extractedLinks.push({
      id: `link-${index}-${Math.random().toString(36).substring(2, 7)}`,
      url: absoluteUrl,
      rawHref,
      text: text || '[No Label]',
      titleAttr,
      domain,
      isInternal,
      isSpecialProtocol,
      fileExtension,
      sourceUrl,
      sourceTitle: title,
      tagType,
      mediaType,
      matchedPrefix: prefix ? matchedPrefix : undefined,
      matchedSubstring: substring ? matchedSubstring : undefined
    });
  });

  const totalCount = extractedLinks.length;
  const hasFilter = Boolean(prefix || substring);
  const matchedLinks = hasFilter
    ? extractedLinks.filter(l => {
        const pMatch = prefix ? l.matchedPrefix : true;
        const sMatch = substring ? l.matchedSubstring : true;
        return matchMode === 'any' ? (pMatch || sMatch) : (pMatch && sMatch);
      })
    : extractedLinks;

  return {
    title,
    links: extractedLinks,
    totalCount,
    matchedCount: matchedLinks.length
  };
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'link-grabber', timestamp: new Date().toISOString() });
});

// Primary Link Grabber API Endpoint
app.post('/api/grab-links', async (req, res) => {
  const startTime = Date.now();
  const {
    urls = [],
    rawPages = [],
    filter = {},
    stealthMode = true
  } = req.body;

  const validUrls: string[] = Array.isArray(urls)
    ? urls.map(u => normalizeUrl(String(u))).filter(u => u.startsWith('http://') || u.startsWith('https://'))
    : [];

  const validRawPages: Array<{ name: string; html: string }> = Array.isArray(rawPages)
    ? rawPages.filter(p => p && p.html && typeof p.html === 'string')
    : [];

  if (validUrls.length === 0 && validRawPages.length === 0) {
    return res.status(400).json({
      error: 'يرجى إدخال رابط صفحة ويب صالح واحد على الأقل، أو رفع ملف HTML.'
    });
  }

  // Process raw pages
  const rawPageResults = validRawPages.map(page => {
    const pageStartTime = Date.now();
    const { title, links, totalCount, matchedCount } = extractLinksFromHtml(
      page.html,
      page.name || 'local-file.html',
      filter
    );
    return {
      url: page.name || 'local-file.html',
      finalUrl: page.name || 'local-file.html',
      title: title || page.name,
      status: 'success' as const,
      httpStatus: 200,
      fetchTimeMs: Date.now() - pageStartTime,
      totalLinksCount: totalCount,
      matchedLinksCount: matchedCount,
      links,
      isLocalHtml: true
    };
  });

  // Fetch online URLs concurrently
  const onlinePromises = validUrls.map(async (targetUrl) => {
    const pageStartTime = Date.now();
    const fetchRes = await fetchWebpage(targetUrl, stealthMode);
    const fetchTimeMs = Date.now() - pageStartTime;

    if (!fetchRes.ok) {
      return {
        url: targetUrl,
        finalUrl: fetchRes.finalUrl || targetUrl,
        title: targetUrl,
        status: 'error' as const,
        errorMessage: fetchRes.error,
        httpStatus: fetchRes.status,
        fetchTimeMs,
        totalLinksCount: 0,
        matchedLinksCount: 0,
        links: []
      };
    }

    const { title, links, totalCount, matchedCount } = extractLinksFromHtml(
      fetchRes.html || '',
      fetchRes.finalUrl || targetUrl,
      filter
    );

    return {
      url: targetUrl,
      finalUrl: fetchRes.finalUrl || targetUrl,
      title: title || targetUrl,
      status: 'success' as const,
      httpStatus: fetchRes.status,
      fetchTimeMs,
      totalLinksCount: totalCount,
      matchedLinksCount: matchedCount,
      links
    };
  });

  const onlineResults = await Promise.all(onlinePromises);
  const allResults = [...rawPageResults, ...onlineResults];
  const executionTimeMs = Date.now() - startTime;

  let grandTotalLinks = 0;
  let grandMatchedLinks = 0;
  allResults.forEach(r => {
    grandTotalLinks += r.totalLinksCount;
    grandMatchedLinks += r.matchedLinksCount;
  });

  res.json({
    results: allResults,
    totalLinksCount: grandTotalLinks,
    matchedLinksCount: grandMatchedLinks,
    executionTimeMs,
    timestamp: new Date().toISOString()
  });
});

// Backward compatibility redirect endpoint if requested
app.post('/api/fetch-and-search', (req, res) => {
  res.redirect(307, '/api/grab-links');
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Link Grabber Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
