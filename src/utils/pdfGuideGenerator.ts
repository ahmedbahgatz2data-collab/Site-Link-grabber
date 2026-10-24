import { jsPDF } from 'jspdf';

export function generateUserGuidePdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('Link Grabber & URL Extractor', 20, 20);

  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text('User Guide & Instructions Manual', 20, 28);

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, 33, 190, 33);

  let y = 42;

  const addSection = (title: string, items: string[]) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 20, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    items.forEach((item) => {
      const wrappedLines = doc.splitTextToSize(`• ${item}`, 165);
      const blockHeight = wrappedLines.length * 5.5;

      if (y + blockHeight > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(wrappedLines, 24, y);
      y += blockHeight + 2;
    });
    y += 4;
  };

  addSection('1. Overview & Purpose (نظرة عامة)', [
    'Link Grabber is a high-speed tool that crawls target web pages and extracts all internal and external hyperlinks.',
    'It allows targeted extraction using URL prefix (بداية الرابط) and substring/contains filters (جزء من الرابط).',
    'Provides instant 1-click batch copy (newline-delimited) ready for download managers (IDM, JDownloader, curl, wget) and spreadsheets.'
  ]);

  addSection('2. How to Grab Links (طريقة الاستخدام)', [
    'Step 1: Enter one or more webpage URLs in the input box (one per line, or space/comma separated). You can also upload a local HTML file.',
    'Step 2 (Optional): Set a Link Prefix filter (e.g. "https://example.com/docs/" or "/wiki/") to only grab links starting with that pattern.',
    'Step 3 (Optional): Set a Link Substring filter (e.g. "download", "pdf", "2024") to only grab links containing that text in the URL or anchor label.',
    'Step 4: Click "Grab Links Now (استخراج الروابط)".'
  ]);

  addSection('3. Filtering & Scope Controls (خيارات التصفية)', [
    'Prefix Match (بداية الرابط): Grabs links starting with the specified string, matching either full absolute URL or relative path.',
    'Substring Match (جزء من الرابط): Grabs links containing the specified keyword anywhere in the URL or anchor text.',
    'Domain Scope: Filter between All Links, Internal Links (same host), or External Links (third-party sites).',
    'Deduplication (Unique Links): Eliminates duplicate URLs so you get a clean, unique list of endpoints.',
    'Live Filtering: Once grabbed, you can filter or search links in real time without having to re-fetch the web pages.'
  ]);

  addSection('4. Export & Copy Options (النسخ والتصدير)', [
    'Copy All Links: Instantly copies all extracted/filtered links to your clipboard separated by newlines.',
    'Export TXT: Downloads a clean plain-text list of URLs ready for automated scrapers or download managers.',
    'Export CSV: Downloads full tabular data including URL, Anchor Text, Source Page, Domain, and Link Type.',
    'Export JSON: Downloads structured JSON data with full link metadata.'
  ]);

  addSection('5. Anti-Bot & Stealth Mode (التصفح المتخفي)', [
    'Uses Apify got-scraping with realistic Chrome/Edge TLS JA3 fingerprinting and HTTP/2 emulation.',
    'Bypasses basic anti-scraping and cloud protections while preserving hop-by-hop redirects.'
  ]);

  doc.save('Link_Grabber_User_Guide.pdf');
}
