import { PresetSample } from '../types';

export const SAMPLE_PRESETS: PresetSample[] = [
  {
    id: 'video-sources',
    name: 'فيديو وميديا (<source> و MP4)',
    description: 'استخراج روابط مصادر الفيديو والصوت <source src="..."> وملفات .mp4',
    urls: [
      'https://www.w3schools.com/html/html5_video.asp'
    ],
    prefix: '',
    substring: '.mp4'
  },
  {
    id: 'wikipedia-science',
    name: 'ويكيبيديا (روابط مقالات معينة)',
    description: 'استخراج روابط المقالات العلمية والمصادر التي تبدأ بـ /wiki/ أو تحتوي على science',
    urls: [
      'https://en.wikipedia.org/wiki/Artificial_intelligence',
      'https://en.wikipedia.org/wiki/Computer_science'
    ],
    prefix: '/wiki/',
    substring: 'learning'
  },
  {
    id: 'mdn-web-docs',
    name: 'توثيق MDN (صفحات JavaScript)',
    description: 'استخراج روابط التوثيق التي تبدأ بـ /en-US/docs/Web/ وتحتوي على JavaScript',
    urls: [
      'https://developer.mozilla.org/en-US/docs/Web/JavaScript'
    ],
    prefix: '/en-US/docs/Web/',
    substring: 'Reference'
  },
  {
    id: 'python-docs',
    name: 'مكتبات Python الرسمية',
    description: 'استخراج روابط المكتبات القياسية والدوال في التوثيق الرسمي لـ Python',
    urls: [
      'https://docs.python.org/3/library/index.html'
    ],
    prefix: '',
    substring: '.html'
  }
];
