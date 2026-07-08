/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RequestStatus = 'รอดำเนินการ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ';

export interface CourseInput {
  courseCode: string;
  courseName: string;
  section: string;
  instructor: string;
  status?: RequestStatus;
  rejectionReason?: string;
  processedAt?: string;
  processedBy?: string;
}

export interface ReservationRequest {
  id: string; // Unique Request Tracking Code e.g. RES-2026-XXXX
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
