/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RequestStatus = 'รอดำเนินการ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ';

export interface CoStudent {
  studentId: string;
  fullName: string;
  department?: string;
  year?: string;
}

export interface CourseInput {
  courseCode: string;
  courseName: string;
  section: string;
  instructor: string;
  coStudents?: CoStudent[]; // เพื่อนร่วมกลุ่มที่ฝากสำรองที่นั่งวิชานี้ (ไม่จำกัดจำนวน)
  status?: RequestStatus;
  rejectionReason?: string;
  processedAt?: string;
  processedBy?: string;
}

export interface ReservationRequest {
  id: string; // Unique Request Tracking Code e.g. RES-2026-XXXX
  term?: string; // ภาคเรียน/ปีการศึกษา เช่น "2/2569" (บันทึกตอนยื่นคำร้อง)
  fullName: string;
  studentId: string;
  department: string;
  faculty: string; // fixed "คณะวิทยาศาสตร์และเทคโนโลยี"
  year: string; // "1", "2", "3", "4"
  courses: CourseInput[];
  courseCode?: string;
  courseName?: string;
  section?: string;
  instructor?: string;
  coStudents?: CoStudent[];
  proofType: 'file' | 'link';
  facebookProofLink?: string;
  facebookProofFile?: {
    name: string;
    type: string;
    dataUrl: string; // base64 string
  };
  phone: string;
  consent: boolean;
  status: RequestStatus;
  rejectionReason?: string;
  createdAt: string; // ISO or formatted date
  processedAt?: string; // ISO date string when final status was set
  processedBy?: string;
  notifyChannel?: 'line' | 'email' | 'none';
  notifyContact?: string;
}

export type SystemOpeningMode = 'always_open' | 'scheduled' | 'closed';

export interface AuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  targetId?: string;
  details: string;
}

export const DEPARTMENTS = [
  'วิทยาการคอมพิวเตอร์ (Computer Science)',
  'เทคโนโลยีสารสนเทศ (Information Technology)',
  'วิทยาศาสตร์ข้อมูลและปัญญาประดิษฐ์ (Data Science and AI)',
  'เทคโนโลยีดิจิทัลและสร้างสรรค์ (Digital Technology)',
  'เคมีประยุกต์ (Applied Chemistry)',
  'ชีววิทยา (Biology)',
  'ฟิสิกส์ (Physics)',
  'คณิตศาสตร์และสถิติประยุกต์ (Mathematics and Applied Statistics)',
  'เทคโนโลยีการอาหาร (Food Technology)',
  'เทคโนโลยีสิ่งแวดล้อม (Environmental Technology)'
] as const;

export const YEARS = ['1', '2', '3', '4', '5+'] as const;

export interface AppState {
  requests: ReservationRequest[];
  isAdminLoggedIn: boolean;
  activeTab: 'reserve' | 'status' | 'admin';
}

// รายวิชาจากระบบทะเบียน (reg.ftu.ac.th)
export interface CatalogSection {
  section: string;
  instructors: string[];
  time: string;
  note: string;
  capacity: number;
  enrolled: number;
  remaining: number;
  status: string;
}

export interface CatalogCourse {
  code: string;
  courseId?: string;
  nameTh: string;
  nameEn: string;
  credit: string;
  sections: CatalogSection[];
}

export interface CourseCatalog {
  enabled: boolean;
  year: string;
  semester: string;
  updatedAt: string;
  prefixes?: string[];
  currentTerm?: string;
  courses: CatalogCourse[];
}

export interface CatalogConfig {
  year: string;
  semester: string;
  patterns: string;
  mode: 'all' | 'selected';
  codes: string[];
  enabled: boolean;
  autoRefresh: boolean;
  currentTerm?: string;
  updatedAt: string;
}

/** ภาคเรียนจากวันที่ (ใช้กับคำร้องเก่าที่ยังไม่มีข้อมูลภาคเรียน): มิ.ย.–ต.ค. = 1, พ.ย.–มี.ค. = 2, เม.ย.–พ.ค. = 3 */
export function termFromDate(d: Date): string {
  const m = d.getMonth() + 1;
  const y = d.getFullYear() + 543;
  if (m >= 6 && m <= 10) return `1/${y}`;
  if (m >= 11) return `2/${y}`;
  if (m <= 3) return `2/${y - 1}`;
  return `3/${y - 1}`;
}

/** เรียงภาคเรียนจากใหม่ไปเก่า เช่น 2/2569, 1/2569, 3/2568 */
export function compareTermsDesc(a: string, b: string): number {
  const [sa, ya] = a.split('/').map(Number);
  const [sb, yb] = b.split('/').map(Number);
  return yb - ya || sb - sa;
}
