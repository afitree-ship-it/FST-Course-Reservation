/**
 * รายวิชาที่ "ไม่รับคำร้องผ่านระบบ" (เช่น ต้องไปติดต่อที่คณะเจ้าของวิชาเอง)
 * แอดมินเพิ่ม/ลบได้ในหน้าแอดมิน > เปิด-ปิดระบบ & แจ้งเตือน (เก็บในชีต Settings คีย์ blocked_courses)
 */
export interface BlockedCourse {
  code: string;
  name?: string;
  message: string;
}

export const DEFAULT_BLOCKED_COURSES: BlockedCourse[] = [
  {
    code: 'GE2100-243',
    name: 'สันติศึกษาเพื่อการสร้างสันติภาพที่ยั่งยืน',
    message: 'รายวิชานี้ต้องติดต่อที่อาคารคณะอิสลามศึกษาและนิติศาสตร์เท่านั้น ไม่สามารถยื่นคำร้องผ่านระบบนี้ได้'
  }
];

const normCode = (s: string) => String(s || '').toUpperCase().replace(/\s+/g, '').trim();
const normName = (s: string) => String(s || '').replace(/\s+/g, '').trim();

export function parseBlockedCourses(raw?: string): BlockedCourse[] {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_BLOCKED_COURSES;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return DEFAULT_BLOCKED_COURSES;
    return arr
      .filter(x => x && (x.code || x.name))
      .map(x => ({ code: normCode(x.code || ''), name: String(x.name || '').trim(), message: String(x.message || '').trim() }));
  } catch {
    return DEFAULT_BLOCKED_COURSES;
  }
}

/** ตรงกันถ้ารหัสวิชาเหมือนกัน หรือชื่อวิชาเหมือนกัน (ไม่สนช่องว่าง) */
export function findBlockedCourse(list: BlockedCourse[], code: string, name?: string): BlockedCourse | null {
  const c = normCode(code);
  const n = normName(name || '');
  return (
    list.find(b => (b.code && c && normCode(b.code) === c) || (b.name && n && n.includes(normName(b.name)))) || null
  );
}

export const blockedMessage = (b: BlockedCourse, isTh: boolean) =>
  b.message ||
  (isTh ? 'รายวิชานี้ไม่รับคำร้องผ่านระบบนี้ กรุณาติดต่อคณะเจ้าของรายวิชาโดยตรง' : 'This course does not accept requests through this system. Please contact the offering faculty directly.');
