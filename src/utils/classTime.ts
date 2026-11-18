/**
 * Turns the registrar's free-text "day / time / room" cell (e.g. "Mo08:00-11:00 SC201",
 * "จ. 13.00-16.00 น. ห้อง 4201", several lines for several meetings) into readable Thai and
 * English lines. When no clock time can be found the section is treated as having no schedule.
 */
export interface ClassSlot {
  th: string;
  en: string;
}

const DAYS: { re: RegExp; th: string; en: string }[] = [
  { re: /^(?:monday|mon|mo|จันทร์|จ\.?)/i, th: 'จันทร์', en: 'Monday' },
  { re: /^(?:tuesday|tue|tu|อังคาร|อ\.?(?!า))/i, th: 'อังคาร', en: 'Tuesday' },
  { re: /^(?:wednesday|wed|we|พุธ|พ\.?(?!ฤ))/i, th: 'พุธ', en: 'Wednesday' },
  { re: /^(?:thursday|thu|th|พฤหัสบดี|พฤหัส|พฤ\.?)/i, th: 'พฤหัสบดี', en: 'Thursday' },
  { re: /^(?:friday|fri|fr|ศุกร์|ศ\.?)/i, th: 'ศุกร์', en: 'Friday' },
  { re: /^(?:saturday|sat|sa|เสาร์|ส\.?)/i, th: 'เสาร์', en: 'Saturday' },
  { re: /^(?:sunday|sun|su|อาทิตย์|อา\.?)/i, th: 'อาทิตย์', en: 'Sunday' }
];

const TIME_RE = /(\d{1,2})[:.](\d{2})\s*(?:น\.)?\s*[-–~ถึง]+\s*(\d{1,2})[:.](\d{2})\s*(?:น\.)?/;

const pad = (n: string) => n.padStart(2, '0');

function parseSegment(seg: string): ClassSlot | null {
  let rest = seg.trim();
  if (!rest) return null;
  const tm = rest.match(TIME_RE);
  if (!tm) return null;
  const time = `${pad(tm[1])}:${tm[2]}–${pad(tm[3])}:${tm[4]}`;

  // day: look right before the time, or at the very start
  const before = rest.slice(0, tm.index).trim();
  let day: { th: string; en: string } | null = null;
  for (const d of DAYS) {
    if (d.re.test(before)) { day = d; break; }
  }
  if (!day) {
    const lastWord = before.split(/\s+/).pop() || '';
    day = DAYS.find(d => d.re.test(lastWord)) || null;
  }
  // room / anything after the time
  rest = rest.slice((tm.index || 0) + tm[0].length).replace(/^[\s,;·:]+/, '');
  const room = rest.replace(/^(?:ห้อง|room|rm\.?)\s*/i, '').trim();

  const th = [day ? day.th : '', `${time} น.`, room ? `ห้อง ${room}` : ''].filter(Boolean).join(' · ');
  const en = [day ? day.en : '', time, room ? `Room ${room}` : ''].filter(Boolean).join(' · ');
  return { th, en };
}

export function parseClassTime(raw?: string): ClassSlot[] {
  if (!raw) return [];
  // one meeting per line; also split "Mo08:00-11:00 Th13:00-16:00" style runs
  const lines = raw
    .split(/\n|<br\s*\/?>|;|\|/i)
    .flatMap(l => l.split(/(?=(?:\b(?:Mo|Tu|We|Th|Fr|Sa|Su)\s?\d))/));
  const slots = lines.map(parseSegment).filter((x): x is ClassSlot => !!x);
  // unfamiliar format that still contains a clock time: show it as-is rather than "no schedule"
  if (!slots.length && /\d{1,2}[:.]\d{2}/.test(raw)) {
    const text = raw.replace(/\s+/g, ' ').trim();
    return [{ th: text, en: text }];
  }
  return slots;
}

export const hasClassTime = (raw?: string) => parseClassTime(raw).length > 0;
