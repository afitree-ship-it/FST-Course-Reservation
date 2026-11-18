import { ReservationRequest } from '../types';

/**
 * หมายเหตุภาพรวมของคำร้องถูกสร้างจากเหตุผลรายวิชา ("รหัสวิชา: เหตุผล" ทีละบรรทัด)
 * ซึ่งแสดงอยู่ใต้แต่ละวิชาแล้ว — คืนเฉพาะส่วนที่ไม่ซ้ำ (ว่าง = ไม่ต้องแสดงกล่องภาพรวม)
 */
export function extraOverallRemark(r: ReservationRequest): string {
  const text = (r.rejectionReason || '').trim();
  if (!text) return '';
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const perCourse = new Set(
    (r.courses || [])
      .filter(c => c.rejectionReason)
      .flatMap(c => [norm(`${c.courseCode}: ${c.rejectionReason}`), norm(c.rejectionReason as string)])
  );
  return text
    .split(/\n+/)
    .filter(line => line.trim() && !perCourse.has(norm(line)))
    .join('\n')
    .trim();
}
