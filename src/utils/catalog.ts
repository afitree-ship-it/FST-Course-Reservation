import { CatalogSection } from '../types';

/** กลุ่มเลขคี่ = นักศึกษาชาย, กลุ่มเลขคู่ = นักศึกษาหญิง */
export type SectionGender = 'male' | 'female';

export function sectionGender(section?: string): SectionGender | null {
  const n = parseInt(String(section || '').replace(/\D/g, ''), 10);
  if (isNaN(n) || n <= 0) return null;
  return n % 2 === 1 ? 'male' : 'female';
}

export const genderLabel = (g: SectionGender, isTh: boolean) =>
  isTh ? (g === 'male' ? 'ชาย' : 'หญิง') : g === 'male' ? 'Male' : 'Female';

/** เดาเพศจากคำนำหน้าชื่อที่นักศึกษากรอก (ถ้าไม่มีคำนำหน้า คืนค่า null) */
export function genderFromName(fullName?: string): SectionGender | null {
  const s = String(fullName || '').trim().toLowerCase();
  if (!s) return null;
  if (/^(นางสาว|น\.ส\.?|นส\.?|นาง|ms\.?|miss|mrs\.?)/.test(s)) return 'female';
  if (/^(นาย|mr\.?)/.test(s)) return 'male';
  return null;
}

/** รายชื่อผู้สอนตามภาษาที่เลือก (ถ้าไม่มีชื่อภาษาอังกฤษ ใช้ภาษาไทย) */
export function sectionInstructors(s: CatalogSection, isTh: boolean): string[] {
  if (!isTh && s.instructorsEn && s.instructorsEn.length) return s.instructorsEn;
  return s.instructors;
}
