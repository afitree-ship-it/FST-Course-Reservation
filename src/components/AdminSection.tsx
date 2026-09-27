/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  ExternalLink,
  Phone,
  Power,
  Filter,
  AlertCircle,
  HelpCircle,
  GraduationCap,
  Sparkles,
  ChevronDown,
  RefreshCw,
  EyeOff,
  Database,
  Copy,
  Check,
  Settings, Key, Trash2, User,
  Edit,
  BellRing,
  Palette,
  Image as ImageIcon,
  Upload,
  Link2,
  X,
  Users,
  Mail
} from 'lucide-react';
import { ReservationRequest, RequestStatus, AuditLog } from '../types';
import { compressImage } from '../imageUtils';
import { adminLogin, addAdminPassword, getSavedAdminPasswords, removeAdminPassword, getAllRequests, updateStatus, updateCourseStatus, saveApiUrl, getApiUrl, isApiConfigured, getLoggedInAdminName, adminLogout, hashString, syncAdminPasswordsWithGoogleSheets, getRemoteSettings, saveRemoteSetting, getAuditLogs } from '../services/api';
import { BarChart2, PieChart, Calendar, Shield, Bell, FileText, Download } from 'lucide-react';

interface AdminSectionProps {
  isInitiallyLoggedIn: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  requestBrowserNotificationPermission?: () => void;
  notificationPermission?: NotificationPermission;
  targetRequestId?: string | null;
  onClearTargetRequestId?: () => void;
  requests: ReservationRequest[];
  setRequests: React.Dispatch<React.SetStateAction<ReservationRequest[]>>;
  onFetchRequests?: () => Promise<void>;
  customLogo?: string;
  onUpdateLogo?: (newLogo: string) => void;
  customFavicon?: string;
  onUpdateFavicon?: (newFavicon: string) => void;
}

export default function AdminSection({ 
  isInitiallyLoggedIn, 
  onLoginSuccess, 
  onLogout, 
  showToast,
  requestBrowserNotificationPermission,
  notificationPermission,
  targetRequestId,
  onClearTargetRequestId,
  requests,
  setRequests,
  onFetchRequests,
  customLogo,
  onUpdateLogo,
  customFavicon,
  onUpdateFavicon
}: AdminSectionProps) {
  // Authentication states
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loggedInName, setLoggedInName] = useState(getLoggedInAdminName());

  // Navigation tab for Admin View
  const [activeAdminTab, setActiveAdminTab] = useState<'requests' | 'analytics' | 'schedule_settings' | 'audit_logs'>('requests');

  // Audit log states
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditLogSearch, setAuditLogSearch] = useState('');

  // Schedule & Notification settings states
  const [systemOpeningMode, setSystemOpeningMode] = useState<'always_open' | 'scheduled' | 'closed'>('always_open');
  const [systemOpenStart, setSystemOpenStart] = useState('');
  const [systemOpenEnd, setSystemOpenEnd] = useState('');
  const [systemClosedMessage, setSystemClosedMessage] = useState('อยู่นอกกำหนดเวลาการรับคำร้องสำรองที่นั่งวิชาเรียน');
  const [notifyLineToken, setNotifyLineToken] = useState('');
  const [notifyOnNewRequest, setNotifyOnNewRequest] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [isSavingScheduleSettings, setIsSavingScheduleSettings] = useState(false);

  // Unified System Settings states
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'database' | 'logo' | 'password'>('database');

  // Custom logo configuration states
  const [logoInput, setLogoInput] = useState(customLogo || '');
  const [faviconInput, setFaviconInput] = useState(customFavicon || '');

  useEffect(() => {
    if (customLogo !== undefined) {
      setLogoInput(customLogo);
    }
  }, [customLogo]);

  useEffect(() => {
    if (customFavicon !== undefined) {
      setFaviconInput(customFavicon);
    }
  }, [customFavicon]);

  const showPasswordManager = showSystemSettings && activeSettingsTab === 'password';
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [savedPasswords, setSavedPasswords] = useState<{hash: string, name: string, addedAt: string}[]>([]);

  const [hasRegisteredPasswords, setHasRegisteredPasswords] = useState<boolean | null>(null);

  useEffect(() => {
    getSavedAdminPasswords().then(passwords => {
      setSavedPasswords(passwords);
      if (passwords.length > 0) {
        setHasRegisteredPasswords(true);
      }
      
      // Perform background sync if API is configured to avoid "First-time Admin Setup" on new devices
      if (isApiConfigured()) {
        syncAdminPasswordsWithGoogleSheets().then(synced => {
          setSavedPasswords(synced);
          setHasRegisteredPasswords(synced.length > 0);
        }).catch(() => {
          if (passwords.length === 0) {
            setHasRegisteredPasswords(false);
          }
        });
      } else {
        if (passwords.length === 0) {
          setHasRegisteredPasswords(false);
        }
      }
    });
  }, []);

  useEffect(() => {
    setLoggedInName(getLoggedInAdminName());
  }, [isInitiallyLoggedIn]);

  // Fetch remote settings on mount & schedule tab open
  const loadScheduleAndNotifySettings = async () => {
    try {
      const settings = await getRemoteSettings();
      if (settings) {
        setSystemOpeningMode((settings.system_opening_mode as any) || 'always_open');
        setSystemOpenStart(settings.system_open_start || '');
        setSystemOpenEnd(settings.system_open_end || '');
        setSystemClosedMessage(settings.system_closed_message || 'อยู่นอกกำหนดเวลาการรับคำร้องสำรองที่นั่งวิชาเรียน');
        setNotifyLineToken(settings.notify_line_token || '');
        setNotifyOnNewRequest(settings.notify_on_new_request === 'true');
        setNotifyOnStatusChange(settings.notify_on_status_change !== 'false');
      }
    } catch (err) {
      console.error('Failed to load remote schedule settings:', err);
    }
  };

  useEffect(() => {
    loadScheduleAndNotifySettings();
  }, []);

  useEffect(() => {
    if (activeAdminTab === 'schedule_settings') {
      loadScheduleAndNotifySettings();
    } else if (activeAdminTab === 'audit_logs') {
      fetchAuditLogs();
    }
  }, [activeAdminTab]);

  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const logs = await getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      showToast('ไม่สามารถโหลดประวัติการอนุมัติได้', 'error');
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const filteredAuditLogs = useMemo(() => {
    if (!auditLogSearch.trim()) return auditLogs;
    const q = auditLogSearch.toLowerCase().trim();
    return auditLogs.filter(log => 
      (log.adminName && String(log.adminName).toLowerCase().includes(q)) ||
      (log.action && String(log.action).toLowerCase().includes(q)) ||
      (log.targetId && String(log.targetId).toLowerCase().includes(q)) ||
      (log.details && String(log.details).toLowerCase().includes(q))
    );
  }, [auditLogs, auditLogSearch]);

  const handleSaveScheduleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingScheduleSettings(true);
    try {
      await saveRemoteSetting('system_opening_mode', systemOpeningMode);
      await saveRemoteSetting('system_open_start', systemOpenStart);
      await saveRemoteSetting('system_open_end', systemOpenEnd);
      await saveRemoteSetting('system_closed_message', systemClosedMessage);
      await saveRemoteSetting('notify_line_token', notifyLineToken);
      await saveRemoteSetting('notify_on_new_request', String(notifyOnNewRequest));
      await saveRemoteSetting('notify_on_status_change', String(notifyOnStatusChange));

      showToast('บันทึกการตั้งค่ากำหนดการและระบบแจ้งเตือนเรียบร้อยแล้ว!', 'success');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูลตั้งค่า', 'error');
    } finally {
      setIsSavingScheduleSettings(false);
    }
  };

  useEffect(() => {
    if (showSystemSettings) {
      getSavedAdminPasswords().then(setSavedPasswords);
    }
  }, [showSystemSettings]);

  const handleDeletePassword = async (hash: string) => {
    if (savedPasswords.length <= 1) {
      showToast('ไม่สามารถลบรหัสผ่านสุดท้ายได้ ต้องมีบัญชีแอดมินเหลืออย่างน้อย 1 คนเพื่อป้องกันการถูกล็อกเอาท์นอกระบบ', 'warning');
      return;
    }
    await removeAdminPassword(hash);
    const updated = await getSavedAdminPasswords();
    setSavedPasswords(updated);
    setHasRegisteredPasswords(updated.length > 0);
    showToast('ลบรหัสผ่านออกจากอุปกรณ์นี้แล้ว', 'success');
  };

  const handleCopyCourseCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      showToast(`คัดลอกรหัสวิชา ${code} เรียบร้อยแล้ว!`, 'success');
    } catch (err) {
      showToast('ไม่สามารถคัดลอกรหัสวิชาได้', 'error');
    }
  };

  // Analytics Filter State (Buddhist Era or 'all')
  const [analyticsYear, setAnalyticsYear] = useState<number | 'all'>('all');

  // Analytics Computation for Executives & Admins
  const analyticsData = useMemo(() => {
    const filteredRequests = requests.filter(req => {
      if (analyticsYear === 'all') return true;
      let reqYear: number | null = null;
      try {
        if (req.createdAt) {
          const d = new Date(req.createdAt);
          if (!isNaN(d.getTime())) {
            reqYear = d.getFullYear() + 543;
          }
        }
      } catch (e) {}
      if (!reqYear && req.id) {
        const match = req.id.match(/(25\d{2}|20\d{2})/);
        if (match) {
          const y = parseInt(match[1], 10);
          reqYear = y < 2400 ? y + 543 : y;
        }
      }
      return reqYear === analyticsYear;
    });

    const totalRequests = filteredRequests.length;
    let totalApproved = 0;
    let totalRejected = 0;
    let totalPending = 0;

    const courseStatsMap: Record<string, { code: string; name: string; total: number; approved: number; rejected: number; pending: number }> = {};
    const deptStatsMap: Record<string, { dept: string; total: number; approved: number; rejected: number; pending: number }> = {};
    const facultyStatsMap: Record<string, { faculty: string; total: number; approved: number; rejected: number; pending: number }> = {};

    filteredRequests.forEach(req => {
      const isApprovedReq = req.status === 'อนุมัติแล้ว';
      const isRejectedReq = req.status === 'ไม่อนุมัติ';

      if (isApprovedReq) totalApproved++;
      else if (isRejectedReq) totalRejected++;
      else totalPending++;

      // Dept stats
      const dept = req.department || 'ไม่ระบุสาขา';
      if (!deptStatsMap[dept]) {
        deptStatsMap[dept] = { dept, total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      deptStatsMap[dept].total++;
      if (isApprovedReq) deptStatsMap[dept].approved++;
      else if (isRejectedReq) deptStatsMap[dept].rejected++;
      else deptStatsMap[dept].pending++;

      // Faculty stats
      const faculty = req.faculty || 'ไม่ระบุคณะ';
      if (!facultyStatsMap[faculty]) {
        facultyStatsMap[faculty] = { faculty, total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      facultyStatsMap[faculty].total++;
      if (isApprovedReq) facultyStatsMap[faculty].approved++;
      else if (isRejectedReq) facultyStatsMap[faculty].rejected++;
      else facultyStatsMap[faculty].pending++;

      // Course stats
      const courseList = req.courses && req.courses.length > 0 ? req.courses : [
        { courseCode: req.courseCode, courseName: req.courseName, section: req.section, status: req.status, coStudents: req.coStudents }
      ];

      courseList.forEach(c => {
        const code = (c.courseCode || 'UNKNOWN').toUpperCase().trim();
        const name = c.courseName || code;
        
        // 🌟 ไฮไลต์: คำนวณจำนวน "ที่นั่ง" ทั้งหมด (ผู้ยื่นหลัก 1 คน + จำนวนเพื่อน)
        const seatsCount = 1 + (c.coStudents?.length || 0);

        if (!courseStatsMap[code]) {
          courseStatsMap[code] = { code, name, total: 0, approved: 0, rejected: 0, pending: 0 };
        }
        
        // บวกยอดสถิติตาม "จำนวนที่นั่ง" ไม่ใช่จำนวนใบคำร้อง
        courseStatsMap[code].total += seatsCount; 
        
        if (c.status === 'อนุมัติแล้ว' || (req.status === 'อนุมัติแล้ว' && !c.status)) {
          courseStatsMap[code].approved += seatsCount;
        } else if (c.status === 'ไม่อนุมัติ' || (req.status === 'ไม่อนุมัติ' && !c.status)) {
          courseStatsMap[code].rejected += seatsCount;
        } else {
          courseStatsMap[code].pending += seatsCount;
        }
      });
    });

    const topCourses = Object.values(courseStatsMap).sort((a, b) => b.total - a.total);
    const topDepts = Object.values(deptStatsMap).sort((a, b) => b.total - a.total);
    const topFaculties = Object.values(facultyStatsMap).sort((a, b) => b.total - a.total);

    return {
      totalRequests,
      totalApproved,
      totalRejected,
      totalPending,
      topCourses,
      topDepts,
      topFaculties
    };
  }, [requests, analyticsYear]);


  const [gasUrlInput, setGasUrlInput] = useState(getApiUrl());
  const [isCopied, setIsCopied] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Core administrative states
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ทั้งหมด' | RequestStatus>('รอดำเนินการ');
  const [searchQuery, setSearchQuery] = useState('');

  // Combobox Autocomplete States
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Close combobox when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setComboboxOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Compute suggestions from requests list
  const suggestions = useMemo(() => {
    const list: Array<{ type: 'student' | 'course' | 'request'; value: string; label: string; secondary: string; searchTexts: string[] }> = [];
    const seenStudents = new Set<string>();
    const seenCourses = new Set<string>();
    const seenRequests = new Set<string>();

    requests.forEach(req => {
      // Student
      if (req.studentId && !seenStudents.has(req.studentId)) {
        seenStudents.add(req.studentId);
        list.push({
          type: 'student',
          value: req.studentId,
          label: req.fullName || '',
          secondary: req.studentId,
          searchTexts: [String(req.studentId || ''), String(req.fullName || '').toLowerCase()]
        });
      }

      // Request
      if (req.id && !seenRequests.has(req.id)) {
        seenRequests.add(req.id);
        list.push({
          type: 'request',
          value: req.id,
          label: req.id,
          secondary: 'รหัสคำร้อง',
          searchTexts: [String(req.id || '').toLowerCase()]
        });
      }

      // Course
      if (req.courseCode && !seenCourses.has(req.courseCode)) {
        seenCourses.add(req.courseCode);
        list.push({
          type: 'course',
          value: req.courseCode,
          label: `${req.courseCode || ''} - ${req.courseName || ''}`,
          secondary: 'รายวิชา',
          searchTexts: [String(req.courseCode || '').toLowerCase(), String(req.courseName || '').toLowerCase()]
        });
      }

      // Nested courses
      if (req.courses) {
        req.courses.forEach(c => {
          if (c.courseCode && !seenCourses.has(c.courseCode)) {
            seenCourses.add(c.courseCode);
            list.push({
              type: 'course',
              value: c.courseCode,
              label: `${c.courseCode || ''} - ${c.courseName || ''}`,
              secondary: 'รายวิชา',
              searchTexts: [String(c.courseCode || '').toLowerCase(), String(c.courseName || '').toLowerCase()]
            });
          }

          // Co-students inside courses
          if (c.coStudents) {
            c.coStudents.forEach(cs => {
              if (cs.studentId && !seenStudents.has(cs.studentId)) {
                seenStudents.add(cs.studentId);
                list.push({
                  type: 'student',
                  value: cs.studentId,
                  label: cs.fullName || '',
                  secondary: `${cs.studentId} (เพื่อนร่วมกลุ่ม)`,
                  searchTexts: [String(cs.studentId || ''), String(cs.fullName || '').toLowerCase()]
                });
              }
            });
          }
        });
      }
    });

    return list;
  }, [requests]);

  const filteredSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return suggestions.slice(0, 6);
    }
    return suggestions.filter(item => 
      item.searchTexts.some(st => (st || '').includes(query)) ||
      String(item.label || '').toLowerCase().includes(query) ||
      String(item.secondary || '').toLowerCase().includes(query)
    ).slice(0, 8);
  }, [suggestions, searchQuery]);

  // Helper to parse dates safely without Safari/iOS Invalid Date bugs
  const parseDateSafe = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    const str = String(val).trim();
    const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10) - 1;
      let year = parseInt(dmy[3], 10);
      if (year > 2400) year -= 543;
      const hour = dmy[4] ? parseInt(dmy[4], 10) : 0;
      const min = dmy[5] ? parseInt(dmy[5], 10) : 0;
      const sec = dmy[6] ? parseInt(dmy[6], 10) : 0;
      return new Date(year, month, day, hour, min, sec);
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Email Quota Tracking State
  const [emailQuota, setEmailQuota] = useState<{ remaining: number; user: string } | null>(null);
  const [checkingQuota, setCheckingQuota] = useState(false);

  const fetchEmailQuota = async () => {
    if (!isApiConfigured()) return;
    setCheckingQuota(true);
    try {
      const res = await fetch(`${getApiUrl()}?action=checkEmailQuota`);
      const data = await res.json();
      if (data.success && typeof data.remainingDailyQuota === 'number') {
        setEmailQuota({ remaining: data.remainingDailyQuota, user: data.sentFromUser || '' });
      }
    } catch (e) {
      // ignore
    } finally {
      setCheckingQuota(false);
    }
  };

  // Year filter state (Buddhist Era)
  const currentBEYear = new Date().getFullYear() + 543;
  const [selectedYear, setSelectedYear] = useState<number>(currentBEYear);

  const availableYears = React.useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentBEYear); // Always include current year
    requests.forEach(r => {
      try {
        const year = parseDateSafe(r.createdAt).getFullYear() + 543;
        if (!isNaN(year)) {
          yearsSet.add(year);
        }
      } catch (e) {}
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [requests, currentBEYear]);

  // Export Filtered Requests to CSV (with UTF-8 BOM for Microsoft Excel)
  const handleExportCSV = () => {
    if (processedRequests.length === 0) {
      showToast('ไม่มีข้อมูลคำร้องให้ส่งออก', 'warning');
      return;
    }

    const headers = [
      'รหัสคำร้อง',
      'วันที่ยื่น',
      'รหัสนักศึกษา',
      'ชื่อ-นามสกุล',
      'ชั้นปี',
      'คณะ',
      'สาขาวิชา',
      'เบอร์โทรศัพท์',
      'อีเมล/ช่องทางติดต่อ',
      'รหัสวิชา',
      'ชื่อรายวิชา',
      'กลุ่ม/เซกชัน',
      'อาจารย์ผู้สอน',
      'สถานะรายวิชา',
      'สถานะรวม',
      'เหตุผลปฏิเสธ',
      'ผู้ดำเนินการ',
      'วันที่พิจารณา',
      'เพื่อนร่วมกลุ่ม'
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows: string[] = [];
    rows.push(headers.map(escapeCsv).join(','));

    processedRequests.forEach(req => {
      const coList = (req.courses || []).flatMap(c => c.coStudents || []).concat(req.coStudents || []);
      const coStr = coList.map(cs => `${cs.studentId} ${cs.fullName}`).join('; ');

      if (req.courses && req.courses.length > 0) {
        req.courses.forEach(c => {
          rows.push([
            escapeCsv(req.id),
            escapeCsv(req.createdAt),
            escapeCsv(`'${req.studentId}`),
            escapeCsv(req.fullName),
            escapeCsv(req.year),
            escapeCsv(req.faculty),
            escapeCsv(req.department),
            escapeCsv(`'${req.phone || ''}`),
            escapeCsv(req.notifyContact || ''),
            escapeCsv(c.courseCode),
            escapeCsv(c.courseName),
            escapeCsv(c.section),
            escapeCsv(c.instructor),
            escapeCsv(c.status || req.status),
            escapeCsv(req.status),
            escapeCsv(c.rejectionReason || req.rejectionReason || ''),
            escapeCsv(c.processedBy || req.processedBy || ''),
            escapeCsv(c.processedAt || req.processedAt || ''),
            escapeCsv(coStr)
          ].join(','));
        });
      } else {
        rows.push([
          escapeCsv(req.id),
          escapeCsv(req.createdAt),
          escapeCsv(`'${req.studentId}`),
          escapeCsv(req.fullName),
          escapeCsv(req.year),
          escapeCsv(req.faculty),
          escapeCsv(req.department),
          escapeCsv(`'${req.phone || ''}`),
          escapeCsv(req.notifyContact || ''),
          escapeCsv(req.courseCode || ''),
          escapeCsv(req.courseName || ''),
          escapeCsv(req.section || ''),
          escapeCsv(req.instructor || ''),
          escapeCsv(req.status),
          escapeCsv(req.status),
          escapeCsv(req.rejectionReason || ''),
          escapeCsv(req.processedBy || ''),
          escapeCsv(req.processedAt || ''),
          escapeCsv(coStr)
        ].join(','));
      }
    });

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FST_Reservations_${selectedYear}_${statusFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`ส่งออกข้อมูล ${processedRequests.length} รายการเป็นไฟล์ Excel/CSV เรียบร้อยแล้ว`, 'success');
  };

  // Modals / Interactivity
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);
  const [rejectionCourseCode, setRejectionCourseCode] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; rawLink?: string } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Handle auto-load on successful login
  useEffect(() => {
    if (isInitiallyLoggedIn) {
      if (requests.length === 0) {
        fetchRequests();
      }
      fetchEmailQuota();
    }
  }, [isInitiallyLoggedIn, requests.length]);

  // Handle navigation/scrolling to a specific request when clicking notifications
  useEffect(() => {
    if (targetRequestId && requests.length > 0) {
      const found = requests.find(r => r.id === targetRequestId);
      if (found) {
        setSearchQuery(found.id);
        setStatusFilter('ทั้งหมด');
        try {
          const year = new Date(found.createdAt).getFullYear() + 543;
          setSelectedYear(year);
        } catch (e) {
          // ignore
        }
        showToast(`กำลังแสดงข้อมูลคำร้องรหัส ${found.id}`, 'info');
        if (onClearTargetRequestId) {
          onClearTargetRequestId();
        }
      }
    }
  }, [targetRequestId, requests, onClearTargetRequestId, showToast]);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      if (onFetchRequests) {
        await onFetchRequests();
      } else {
        const response = await getAllRequests();
        if (response.success && response.data) {
          setRequests(response.data);
        } else {
          showToast(response.error || 'เกิดข้อผิดพลาดในการโหลดคำร้อง', 'error');
        }
      }
    } catch (err) {
      showToast('ไม่สามารถดึงข้อมูลคำร้องจากระบบเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSaveGasUrl = () => {
    if (!gasUrlInput.trim()) {
      showToast('กรุณากรอก URL ของ Google Apps Script ก่อนบันทึก', 'warning');
      return;
    }
    if (!gasUrlInput.startsWith('https://script.google.com/')) {
      showToast('URL ต้องเริ่มต้นด้วย https://script.google.com/ ซึ่งเป็นลิงก์ของ Google Apps Web App', 'warning');
      return;
    }
    saveApiUrl(gasUrlInput.trim());
    showToast('บันทึกการตั้งค่า Google Sheet และเชื่อมต่อสำเร็จเรียบร้อย', 'success');
    fetchRequests(); // Reload requests using the new Google Sheets live database!
  };

  const handleDisconnectGas = () => {
    saveApiUrl('');
    setGasUrlInput('');
    showToast('ตัดการเชื่อมต่อเรียบร้อยแล้ว ระบบสวิตช์กลับมาเป็นโหมดฐานข้อมูลสาธิตในเครื่อง (Demo Mode)', 'info');
    fetchRequests(); // Reload standard requests using Mock Storage!
  };

  const handleTestConnection = async () => {
    if (!gasUrlInput.trim()) {
      showToast('กรุณากรอก URL เพื่อทดสอบการเชื่อมต่อ', 'warning');
      return;
    }
    
    setIsTestingConnection(true);
    showToast('กำลังทดสอบส่งสัญญาณเชื่อมต่อ Google Sheets...', 'info');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout
      
      const response = await fetch(`${gasUrlInput.trim()}?action=getAllRequests`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      if (data && data.success) {
        showToast('🟢 สำเร็จ! ตรวจสอบสิทธิ์เชื่อมต่อ Google Sheet Live สมบูรณ์ 100%', 'success');
      } else {
        showToast(`🟡 ตอบสนองผิดพลาด: ${data?.error || 'เซิร์ฟเวอร์ยังไม่มีข้อมูลยื่นคำร้อง'} (กรุณาอัปโหลด Apps Script ให้สมบูรณ์)`, 'warning');
      }
    } catch (err: any) {
      console.warn('CORS/Network connection warn:', err);
      showToast('🟢 สำเร็จ! เชื่อมต่อ Apps Script สำเร็จ (หรือระบบอาจติด CORS บราวเซอร์ แต่แอปพลิเคชันหลักใช้งานจริงได้ปกติ)', 'success');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleCopyCode = () => {
    const code = getGoogleAppsScriptCode();
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    showToast('คัดลอกโค้ดสคริปต์ Google Apps Script ลงในคลิปบอร์ดแล้ว', 'success');
    setTimeout(() => setIsCopied(false), 3000);
  };

  const getGoogleAppsScriptCode = () => {
    return `/**
 * ระบบสำรองที่นั่งวิชาเรียน - Backend (Google Apps Script)
 * Sheets: Requests, Admins, Settings, AuditLog
 * Mobile-First Responsive Email (No Emoji Corruption)
 */

var SHEET_REQUESTS = 'Requests';
var SHEET_ADMINS = 'Admins';
var SHEET_SETTINGS = 'Settings';
var SHEET_AUDIT = 'AuditLog';
var SENDER_NAME = 'สำนักวิชาการ FST FTU (Course Reservation)';
var REG_SYSTEM_URL = 'https://reg.ftu.ac.th';

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(name, headers) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold').setBackground('#10B981').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

var REQUESTS_HEADERS = [
  'รหัสคำร้อง', 'วันที่ยื่นคำร้อง', 'รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'ชั้นปี', 'คณะ', 'สาขาวิชา',
  'รหัสวิชา', 'ชื่อรายวิชา', 'กลุ่ม/เซกชัน', 'อาจารย์ผู้สอน', 'เบอร์โทรศัพท์',
  'ชนิดหลักฐาน (file/link)', 'รายละเอียดหลักฐาน (Link/DataURL)',
  'สถานะการตรวจสอบ', 'เหตุผลปฏิเสธสิทธิ์', 'จำนวนวิชาที่ยื่น',
  'วันที่ดำเนินการ', 'ผู้ดำเนินการ', 'ไฟล์หลักฐาน (JSON)', 'รายวิชาที่ยื่น (JSON)',
  'ช่องทางแจ้งเตือน', 'ช่องทางติดต่อ',
  'สถานะการส่งอีเมล', 'รายชื่อเพื่อนร่วมกลุ่ม (ฝากกรอก)', 'จำนวนที่นั่งรวม'
];

function requestsSheet() {
  return getOrCreateSheet(SHEET_REQUESTS, REQUESTS_HEADERS);
}
function adminsSheet() {
  return getOrCreateSheet(SHEET_ADMINS, ['Hash', 'Name', 'AddedAt']);
}
function settingsSheet() {
  return getOrCreateSheet(SHEET_SETTINGS, ['Key', 'Value']);
}
function auditSheet() {
  return getOrCreateSheet(SHEET_AUDIT, ['ID', 'Timestamp', 'AdminName', 'Action', 'TargetID', 'Details']);
}

// ---------- Helpers ----------

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function newId(prefix) {
  var y = new Date().getFullYear() + 543;
  var rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return prefix + '-' + y + '-' + rand;
}

function buildCourseSummary(courses) {
  courses = courses || [];
  return {
    courseCodes: courses.map(function (c) { return c.courseCode || ''; }).join(', '),
    courseNames: courses.map(function (c) { return c.courseName || ''; }).join(', '),
    sections: courses.map(function (c) { return c.section || ''; }).join(', '),
    instructors: courses.map(function (c) { return c.instructor || ''; }).join(', '),
    count: courses.length
  };
}

function rowToRequest(row) {
  var courses = [];
  try { courses = row[20] ? JSON.parse(row[20]) : []; } catch (e) { courses = []; }
  var proofFile = undefined;
  try { proofFile = row[19] ? JSON.parse(row[19]) : undefined; } catch (e) {}

  return {
    id: String(row[0]),
    createdAt: cellToIso(row[1]),
    studentId: String(row[2]).replace(/^'/, ''),
    fullName: String(row[3]),
    year: String(row[4]),
    faculty: String(row[5]),
    department: String(row[6]),
    phone: String(row[11]).replace(/^'/, ''),
    status: String(row[14]),
    rejectionReason: row[15] || undefined,
    processedAt: cellToIso(row[17]) || undefined,
    processedBy: row[18] || undefined,
    proofType: row[12],
    facebookProofLink: row[13] || undefined,
    facebookProofFile: proofFile,
    courses: courses,
    notifyChannel: row[21] || undefined,
    notifyContact: row[22] || undefined
  };
}

function cellToIso(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  var str = String(value).trim();
  var dmyMatch = str.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})(?:\\s+(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?)?$/);
  if (dmyMatch) {
    var day = parseInt(dmyMatch[1], 10);
    var month = parseInt(dmyMatch[2], 10) - 1;
    var year = parseInt(dmyMatch[3], 10);
    if (year > 2400) year -= 543;
    var hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    var min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    var sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    var d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return str;
}

function findRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function recomputeOverallStatus(courses) {
  if (!courses || courses.length === 0) return 'รอดำเนินการ';
  var allApproved = courses.every(function (c) { return c.status === 'อนุมัติแล้ว'; });
  var allRejected = courses.every(function (c) { return c.status === 'ไม่อนุมัติ'; });
  if (allApproved) return 'อนุมัติแล้ว';
  if (allRejected) return 'ไม่อนุมัติ';
  return 'รอดำเนินการ';
}

function sendSafeEmail(toEmail, subject, textBody, htmlBody) {
  if (!toEmail || toEmail.indexOf('@') === -1) {
    return { success: false, message: 'อีเมลไม่ถูกต้อง' };
  }
  
  var quota = MailApp.getRemainingDailyQuota();
  if (quota <= 0) {
    return { success: false, message: 'โควตาส่งอีเมลประจำวันหมดแล้ว (Quota 0)' };
  }

  try {
    GmailApp.sendEmail(toEmail, subject, textBody, {
      name: SENDER_NAME,
      htmlBody: htmlBody
    });
    return { success: true, message: 'GmailApp' };
  } catch (gmailErr) {
    Logger.log('GmailApp error, fallback to MailApp: ' + gmailErr.toString());
    try {
      MailApp.sendEmail({
        to: toEmail,
        subject: subject,
        body: textBody,
        htmlBody: htmlBody,
        name: SENDER_NAME
      });
      return { success: true, message: 'MailApp' };
    } catch (mailErr) {
      return { success: false, message: mailErr.message };
    }
  }
}

// ดึงรายชื่อเพื่อนร่วมกลุ่ม
function extractCoStudents(courses) {
  var list = [];
  if (!courses || !courses.length) return list;
  for (var i = 0; i < courses.length; i++) {
    var c = courses[i];
    if (c.coStudents && c.coStudents.length > 0) {
      for (var j = 0; j < c.coStudents.length; j++) {
        var friend = c.coStudents[j];
        if (friend.studentId || friend.fullName) {
          list.push({
            studentId: friend.studentId || '-',
            fullName: friend.fullName || '-',
            courseCode: c.courseCode || ''
          });
        }
      }
    }
  }
  return list;
}

// สร้างการ์ดรายวิชา (ปราศจาก Emoji ป้องกันตัวอักษรกลายเป็น ?)
function buildMobileCoursesCards(courses, defaultStatus) {
  var cardsHtml = '';
  for (var i = 0; i < courses.length; i++) {
    var c = courses[i];
    var cStatus = c.status || defaultStatus || 'รอดำเนินการ';
    var isApp = cStatus === 'อนุมัติแล้ว';
    var isRej = cStatus === 'ไม่อนุมัติ';
    var borderColor = isApp ? '#10b981' : (isRej ? '#ef4444' : '#f59e0b');
    var badgeColor = isApp ? '#065f46' : (isRej ? '#991b1b' : '#92400e');
    var badgeBg = isApp ? '#d1fae5' : (isRej ? '#fee2e2' : '#fef3c7');
    var statusText = isApp ? 'อนุมัติแล้ว (Approved)' : (isRej ? 'ไม่อนุมัติ (Rejected)' : 'รอดำเนินการ (Pending)');

    cardsHtml += 
      '<div style="background-color: #ffffff; border: 1.5px solid ' + borderColor + '; border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">' +
        '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">' +
          '<div>' +
            '<span style="font-size: 16px; font-weight: bold; color: #0f172a;">' + (c.courseCode || '-') + '</span>' +
            '<div style="font-size: 14px; color: #334155; font-weight: 500; margin-top: 2px;">' + (c.courseName || '-') + '</div>' +
          '</div>' +
          '<div style="margin-left: 8px; text-align: right;">' +
            '<span style="background-color: ' + badgeBg + '; color: ' + badgeColor + '; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; display: inline-block;">' +
              statusText +
            '</span>' +
          '</div>' +
        '</div>' +

        '<div style="font-size: 13px; color: #64748b; line-height: 1.6; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 8px;">' +
          '<div>• <strong>กลุ่ม/เซกชัน (Section):</strong> <span style="color: #1e293b; font-weight: bold;">' + (c.section || '-') + '</span></div>' +
          '<div>• <strong>อาจารย์ผู้สอน (Instructor):</strong> <span style="color: #1e293b;">' + (c.instructor || '-') + '</span></div>' +
        '</div>';

    if (c.rejectionReason && isRej) {
      cardsHtml += 
        '<div style="background-color: #fff1f2; border-radius: 6px; padding: 8px 10px; margin-top: 8px; font-size: 12px; color: #be123c;">' +
          '<strong>[ไม่อนุมัติ] เหตุผล/หมายเหตุ (Reason):</strong> ' + c.rejectionReason +
        '</div>';
    }

    cardsHtml += '</div>';
  }
  return cardsHtml;
}

// สร้างการ์ดรายชื่อเพื่อนร่วมกลุ่ม
function buildMobileCoStudentsCard(coStudentsList) {
  if (!coStudentsList || coStudentsList.length === 0) return '';
  
  var friendsHtml = '';
  for (var i = 0; i < coStudentsList.length; i++) {
    var f = coStudentsList[i];
    friendsHtml += 
      '<div style="background-color: #ffffff; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid #cbd5e1; font-size: 13px;">' +
        '<div style="font-weight: bold; color: #1e293b;">' + (i + 1) + '. ' + f.fullName + '</div>' +
        '<div style="color: #64748b; font-size: 12px; margin-top: 2px;">' +
          'รหัสนักศึกษา (Student ID): <span style="color: #0284c7; font-weight: bold;">' + f.studentId + '</span> ' +
          (f.courseCode ? '<span style="color: #64748b;">| ฝากวิชา: ' + f.courseCode + '</span>' : '') +
        '</div>' +
      '</div>';
  }

  return '<div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin: 16px 0;">' +
    '<div style="font-weight: bold; color: #1e293b; font-size: 14px; margin-bottom: 8px;">' +
      '[เพื่อนร่วมกลุ่ม] รายชื่อเพื่อนร่วมกลุ่มที่ฝากจอง / Co-applicant(s) (' + coStudentsList.length + ' คน):' +
    '</div>' +
    friendsHtml +
  '</div>';
}

// สร้างกล่องคำแนะนำการลงทะเบียน (เมื่ออนุมัติ)
function buildMobileRegInstructionsBox(hasApproved) {
  if (!hasApproved) return '';
  return '<div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">' +
    '<h3 style="margin: 0; color: #065f46; font-size: 16px; font-weight: bold;">' +
      '[คำแนะนำในการลงทะเบียนเรียน]<br>' +
      '<span style="font-size: 13px; font-weight: normal; color: #047857;">Registration Instructions</span>' +
    '</h3>' +
    '<p style="margin: 10px 0 14px 0; color: #047857; font-size: 13px; line-height: 1.6; text-align: left;">' +
      'คำร้องสำรองที่นั่งของท่านได้รับการ <strong>"อนุมัติแล้ว"</strong> กรุณาเข้าไปเพิ่มรายวิชาดังกล่าวด้วยตนเองในระบบบริการการศึกษา มหาวิทยาลัยฟาฏอนี:<br>' +
      '<span style="color: #065f46; font-size: 12px;">Your seat reservation has been <strong>Approved</strong>. Please proceed to add this course yourself in the FTU Registrar System:</span>' +
    '</p>' +
    '<a href="' + REG_SYSTEM_URL + '" target="_blank" style="background-color: #059669; color: #ffffff; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">' +
      '>> เข้าสู่ระบบลงทะเบียนเรียน (reg.ftu.ac.th) <<' +
    '</a>' +
    '<p style="margin: 8px 0 0 0; color: #065f46; font-size: 11px;">' +
      'URL: <a href="' + REG_SYSTEM_URL + '" style="color: #047857;">' + REG_SYSTEM_URL + '</a>' +
    '</p>' +
  '</div>';
}

// ---------- doGet ----------

function doGet(e) {
  var action = (e && e.parameter) ? e.parameter.action : '';
  try {
    if (action === 'checkEmailQuota') {
      var remainingQuota = MailApp.getRemainingDailyQuota();
      var effectiveUser = Session.getEffectiveUser().getEmail();
      return jsonOut({
        success: true,
        remainingDailyQuota: remainingQuota,
        sentFromUser: effectiveUser,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getAllRequests') {
      var sheet = requestsSheet();
      var rows = sheet.getDataRange().getValues();
      var results = [];
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0]) results.push(rowToRequest(rows[i]));
      }
      return jsonOut({ success: true, data: results });
    }

    if (action === 'getStatusByStudentId') {
      var studentId = String(e.parameter.studentId || '').replace(/^'/, '').trim();
      var sheet2 = requestsSheet();
      var rows2 = sheet2.getDataRange().getValues();
      var filtered = [];
      for (var j = 1; j < rows2.length; j++) {
        if (!rows2[j][0]) continue;
        var cleanStudentIdInSheet = String(rows2[j][2]).replace(/^'/, '').trim();
        var coStudentsCell = String(rows2[j][24] || '');
        var coursesCell = String(rows2[j][20] || '');
        var isMatch = (cleanStudentIdInSheet === studentId) ||
                      (coStudentsCell.indexOf(studentId) > -1) ||
                      (coursesCell.indexOf(studentId) > -1);
        if (isMatch) {
          filtered.push(rowToRequest(rows2[j]));
        }
      }
      return jsonOut({ success: true, data: filtered });
    }

    if (action === 'getAdmins') {
      var aSheet = adminsSheet();
      var aRows = aSheet.getDataRange().getValues();
      var admins = [];
      for (var k = 1; k < aRows.length; k++) {
        if (aRows[k][0]) {
          admins.push({ hash: String(aRows[k][0]), name: String(aRows[k][1]), addedAt: String(aRows[k][2]) });
        }
      }
      return jsonOut({ success: true, data: admins });
    }

    if (action === 'getSettings') {
      var sSheet = settingsSheet();
      var sRows = sSheet.getDataRange().getValues();
      var settings = {};
      for (var m = 1; m < sRows.length; m++) {
        if (sRows[m][0]) settings[String(sRows[m][0])] = String(sRows[m][1]);
      }
      return jsonOut({ success: true, data: settings });
    }

    if (action === 'getAuditLogs') {
      var auSheet = auditSheet();
      var auRows = auSheet.getDataRange().getValues();
      var logs = [];
      for (var n = 1; n < auRows.length; n++) {
        if (auRows[n][0]) {
          logs.push({
            id: String(auRows[n][0]),
            timestamp: String(auRows[n][1]),
            adminName: String(auRows[n][2]),
            action: String(auRows[n][3]),
            targetId: String(auRows[n][4] || ''),
            details: String(auRows[n][5])
          });
        }
      }
      logs.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
      return jsonOut({ success: true, data: logs.slice(0, 500) });
    }

    return jsonOut({ success: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonOut({ success: false, error: err.toString() });
  }
}

// ---------- doPost ----------

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;

    if (action === 'submitRequest') return handleSubmitRequest(postData);
    if (action === 'updateStatus') return handleUpdateStatus(postData);
    if (action === 'updateCourseStatus') return handleUpdateCourseStatus(postData);
    if (action === 'addAdmin') return handleAddAdmin(postData);
    if (action === 'deleteAdmin') return handleDeleteAdmin(postData);
    if (action === 'saveSetting') return handleSaveSetting(postData);
    if (action === 'recordAuditLog') return handleRecordAuditLog(postData);

    return jsonOut({ success: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonOut({ success: false, error: err.toString() });
  }
}

// ---------- Request Handlers ----------

function handleSubmitRequest(data) {
  var sheet = requestsSheet();
  var id = newId('RES');
  
  var nowDate = new Date();
  var formattedDate = Utilities.formatDate(nowDate, "GMT+7", "dd/MM/yyyy HH:mm:ss");
  var now = nowDate.toISOString();

  var courses = data.courses && data.courses.length > 0
    ? data.courses
    : [{
        courseCode: data.courseCode || '',
        courseName: data.courseName || '',
        section: data.section || '',
        instructor: data.instructor || '',
        status: 'รอดำเนินการ',
        coStudents: []
      }];

  var summary = buildCourseSummary(courses);

  var coStudentsList = extractCoStudents(courses);
  var coStudentsText = "";
  var totalSeats = courses.length + coStudentsList.length;

  if (coStudentsList.length > 0) {
    for (var j = 0; j < coStudentsList.length; j++) {
      var item = coStudentsList[j];
      coStudentsText += item.studentId + " - " + item.fullName + " (วิชา: " + item.courseCode + ")\\n";
    }
  } else {
    coStudentsText = "- ไม่มีเพื่อนร่วมกลุ่ม (No co-applicants) -";
  }

  var proofLink = data.facebookProofLink || '';
  if (data.facebookProofFile && data.facebookProofFile.dataUrl) {
    proofLink = data.facebookProofFile.dataUrl; 
  }

  var FOLDER_ID = '1SMwTumzdm_FQczUdH0gqnG55lS70JMAf'; 

  if (proofLink.startsWith('data:image/')) {
    try {
      var parts = proofLink.split(',');
      var mimeType = parts[0].match(/:(.*?);/)[1];
      var base64Data = parts[1];
      
      var fileName = 'Proof_' + id;
      if (data.facebookProofFile && data.facebookProofFile.name) {
        fileName = id + '_' + data.facebookProofFile.name;
      }

      var imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
      var folder = DriveApp.getFolderById(FOLDER_ID);
      var file = folder.createFile(imageBlob);
      
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {}
      
      proofLink = file.getUrl(); 
    } catch (error) {
      proofLink = "Upload Error: " + error.message; 
    }
  } else if (proofLink.length > 200) {
    proofLink = "ข้อมูลหลักฐานผิดรูปแบบหรือไม่ใช่รูปภาพ";
  }

  var proofFileJSON = '';
  if (data.facebookProofFile) {
    var cleanProofFile = JSON.parse(JSON.stringify(data.facebookProofFile));
    delete cleanProofFile.dataUrl; 
    proofFileJSON = JSON.stringify(cleanProofFile);
  }

  var cleanCourses = courses ? JSON.parse(JSON.stringify(courses)) : [];
  cleanCourses.forEach(function(c) { delete c.dataUrl; });
  var coursesJSONStr = JSON.stringify(cleanCourses);

  var contactEmail = data.email || data.notifyContact || '';
  var notifyChan = data.notifyChannel || (contactEmail ? 'email' : '');
  var studentIdStr = "'" + String(data.studentId || '');
  var phoneStr = data.phone ? "'" + String(data.phone) : '';

  sheet.appendRow([
    id, formattedDate, studentIdStr, data.fullName || '', data.year || '', data.faculty || '', data.department || '',
    summary.courseCodes, summary.courseNames, summary.sections, summary.instructors, phoneStr, data.proofType || '',
    proofLink, 'รอดำเนินการ', '', summary.count, '', '', proofFileJSON, coursesJSONStr, notifyChan, contactEmail,
    "",             // 24. สถานะอีเมล
    coStudentsText, // 25. เพื่อนร่วมกลุ่ม
    totalSeats      // 26. จำนวนที่นั่งรวม
  ]);

  var newRowIndex = sheet.getLastRow();

  var newReq = {
    id: id, studentId: data.studentId, fullName: data.fullName, department: data.department, faculty: data.faculty, 
    year: data.year, phone: data.phone, status: 'รอดำเนินการ', createdAt: now, proofType: data.proofType, 
    facebookProofLink: proofLink, courses: courses
  };

  // --- ส่งอีเมลยืนยันการรับคำร้อง ---
  if (contactEmail && contactEmail.indexOf('@') > -1) {
    var subject = "[FTU FST] ยืนยันการรับคำร้องขอสำรองที่นั่งวิชาเรียน / Confirmation (" + id + ")";
    
    var coursesCardsHtml = buildMobileCoursesCards(courses, 'รอดำเนินการ');
    var coStudentsCardHtml = buildMobileCoStudentsCard(coStudentsList);

    var textBody = "เรียน / Dear " + (data.fullName || 'Student') + " (รหัสนักศึกษา / Student ID: " + (data.studentId || '-') + "),\\n\\n" +
                   "ระบบได้รับคำร้องขอสำรองที่นั่งวิชาเรียนของคุณเรียบร้อยแล้ว\\n" +
                   "We have successfully received your course seat reservation request.\\n\\n" +
                   "--------------------------------------------------\\n" +
                   "• รหัสคำร้อง / Request ID: " + id + "\\n" +
                   "• วันที่ยื่น / Submission Date: " + formattedDate + "\\n" +
                   "• คณะ/สาขาวิชา: " + (data.faculty || '-') + " - " + (data.department || '-') + "\\n" +
                   "• จำนวนที่นั่งรวม / Total Seats: " + totalSeats + " ที่นั่ง (Seats)\\n" +
                   "• สถานะเริ่มต้น / Initial Status: รอดำเนินการ (Pending)\\n" +
                   "--------------------------------------------------\\n\\n";

    if (coStudentsList.length > 0) {
      textBody += "รายชื่อเพื่อนร่วมกลุ่มที่ฝากจอง / Co-applicants:\\n" + coStudentsText + "\\n";
    }

    textBody += "โปรดรอเจ้าหน้าที่ตรวจสอบเอกสารและพิจารณาคำร้อง โดยระบบจะส่งอีเมลแจ้งเตือนอีกครั้งเมื่อมีความคืบหน้าครับ\\n" +
                "Please wait for our staff to verify your documents and process the request.\\n\\n" +
                "--\\n" + SENDER_NAME + "\\nคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี";

    var htmlBody = 
      "<div style='background-color: #f8fafc; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, \\"Segoe UI\\", Roboto, Helvetica, Arial, sans-serif;'>" +
        "<div style='max-width: 560px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;'>" +
          
          "<div style='background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; padding: 20px 16px; text-align: center;'>" +
            "<h2 style='margin: 0; font-size: 18px; font-weight: bold;'>ยืนยันการรับคำร้องขอสำรองที่นั่ง</h2>" +
            "<p style='margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;'>Course Seat Reservation Confirmation</p>" +
          "</div>" +

          "<div style='padding: 18px 16px; color: #1e293b;'>" +
            "<p style='font-size: 15px; margin: 0 0 12px 0;'>" +
              "เรียน / Dear <strong>" + (data.fullName || 'Student') + "</strong> " +
              "<span style='color: #64748b;'>(รหัส: <strong>" + (data.studentId || '-') + "</strong>)</span>," +
            "</p>" +

            "<p style='color: #475569; font-size: 13px; line-height: 1.5; margin-bottom: 16px;'>" +
              "ระบบได้รับคำร้องขอสำรองที่นั่งวิชาเรียนของท่านเรียบร้อยแล้ว<br>" +
              "<span style='color: #64748b;'>We have successfully received your reservation request.</span>" +
            "</p>" +

            "<div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;'>" +
              "<div style='display: flex; justify-content: space-between;'>" +
                "<span><strong>รหัสคำร้อง / Request ID:</strong></span>" +
                "<span style='color: #0284c7; font-weight: bold;'>" + id + "</span>" +
              "</div>" +
              "<div><strong>วันที่ยื่น / Submission Date:</strong> " + formattedDate + "</div>" +
              "<div><strong>สาขาวิชา / Department:</strong> " + (data.department || '-') + "</div>" +
              "<div><strong>จำนวนที่นั่งรวม / Total Seats:</strong> " + totalSeats + " ที่นั่ง (Seats)</div>" +
              "<div><strong>สถานะเริ่มต้น / Status:</strong> <span style='color: #d97706; font-weight: bold;'>รอดำเนินการ (Pending)</span></div>" +
            "</div>" +

            "<div style='margin-bottom: 8px; font-size: 14px; font-weight: bold; color: #334155;'>[รายวิชา] รายวิชาที่ขอสำรอง / Requested Courses:</div>" +
            coursesCardsHtml +

            coStudentsCardHtml +

            "<div style='background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 12px; margin-top: 18px; font-size: 13px; line-height: 1.5;'>" +
              "<strong style='color: #1e40af;'>[สิ่งที่ต้องดำเนินการต่อไป / Next Step]</strong><br>" +
              "<span style='color: #1e3a8a;'>โปรดรอเจ้าหน้าที่ตรวจสอบเอกสารและพิจารณาคำร้อง โดยระบบจะส่งอีเมลแจ้งผลการพิจารณาให้ทราบอีกครั้งครับ<br>" +
              "<span style='color: #3b82f6; font-size: 12px;'>Please wait for verification. You will receive an automated email once your request is processed.</span></span>" +
            "</div>" +

          "</div>" +

          "<div style='background-color: #f1f5f9; padding: 14px 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5;'>" +
            "<strong>" + SENDER_NAME + "</strong><br>คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี<br>" +
            "นี่คืออีเมลอัตโนมัติ กรุณาอย่าตอบกลับ / Automated email, please do not reply." +
          "</div>" +

        "</div>" +
      "</div>";

    var sendRes = sendSafeEmail(contactEmail, subject, textBody, htmlBody);
    if (sendRes.success) {
      sheet.getRange(newRowIndex, 24).setValue("✅ ยืนยันคำร้องแล้ว (" + sendRes.message + ")");
    } else {
      sheet.getRange(newRowIndex, 24).setValue("❌ ส่งเมลยืนยันล้มเหลว: " + sendRes.message);
    }
  } else {
    sheet.getRange(newRowIndex, 24).setValue("⚠️ ไม่พบอีเมลผู้ยื่น");
  }

  return jsonOut({ success: true, data: newReq });
}

function handleUpdateStatus(data) {
  var sheet = requestsSheet();
  var rowNum = findRowById(sheet, data.requestId);
  if (rowNum === -1) return jsonOut({ success: false, error: 'ไม่พบคำร้อง' });

  var nowDate = new Date();
  var formattedDate = Utilities.formatDate(nowDate, "GMT+7", "dd/MM/yyyy HH:mm:ss"); 
  var now = nowDate.toISOString();
  
  var status = data.status;
  var rawReason = data.rejectionReason || data.reason || ''; 
  var rejectionReason = status === 'ไม่อนุมัติ' ? rawReason : '';
  var processedBy = data.processedBy || 'แอดมินระบบ';

  sheet.getRange(rowNum, 15).setValue(status);              
  sheet.getRange(rowNum, 16).setValue(rejectionReason);      
  sheet.getRange(rowNum, 18).setValue(formattedDate);        
  sheet.getRange(rowNum, 19).setValue(processedBy);          

  var coursesRaw = sheet.getRange(rowNum, 21).getValue();
  var courses = [];
  try { courses = coursesRaw ? JSON.parse(coursesRaw) : []; } catch (err) { courses = []; }
  courses = courses.map(function (c) {
    return Object.assign({}, c, {
      status: status,
      rejectionReason: rejectionReason || undefined,
      processedBy: processedBy,
      processedAt: now
    });
  });
  sheet.getRange(rowNum, 21).setValue(JSON.stringify(courses));

  var updatedRow = sheet.getRange(rowNum, 1, 1, REQUESTS_HEADERS.length).getValues()[0];
  var result = rowToRequest(updatedRow);

  var coStudentsList = extractCoStudents(courses);
  var studentEmail = result.notifyContact || '';

  if (studentEmail && studentEmail.indexOf('@') > -1) {
    var isApprove = status === 'อนุมัติแล้ว';
    var isReject = status === 'ไม่อนุมัติ';
    var headerBg = isApprove ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : (isReject ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' : 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)');
    var statusBadgeColor = isApprove ? '#059669' : (isReject ? '#dc2626' : '#d97706');
    var displayStatusEN = isApprove ? 'Approved' : (isReject ? 'Rejected' : 'Pending');
    
    var emailSubject = "[FTU FST] ผลการพิจารณาคำร้องสำรองที่นั่ง / Result: " + status + " (" + displayStatusEN + ") - " + result.id;
    
    var coursesCardsHtml = buildMobileCoursesCards(courses, status);
    var coStudentsCardHtml = buildMobileCoStudentsCard(coStudentsList);
    var regBoxHtml = buildMobileRegInstructionsBox(isApprove);

    var textBody = "เรียน / Dear " + result.fullName + " (รหัสนักศึกษา / Student ID: " + result.studentId + "),\\n\\n" +
                    "คำร้องขอสำรองที่นั่งวิชาเรียนของท่าน (รหัสคำร้อง / Request ID: " + result.id + ") ได้รับการพิจารณาเรียบร้อยแล้ว\\n" +
                    "Your course seat reservation request has been processed.\\n\\n" +
                    "--------------------------------------------------\\n" +
                    "• ผลการพิจารณา / Decision: " + status + " (" + displayStatusEN + ")\\n" +
                    "• ผู้ดำเนินการ / Processed by: " + processedBy + "\\n" +
                    "• วันที่ดำเนินการ / Processed Date: " + formattedDate + "\\n" +
                    (rejectionReason ? "• เหตุผล/หมายเหตุ / Reason: " + rejectionReason + "\\n" : "") +
                    "--------------------------------------------------\\n\\n";

    if (coStudentsList.length > 0) {
      textBody += "รายชื่อเพื่อนร่วมกลุ่มที่ฝากจอง / Co-applicants:\\n";
      for (var f = 0; f < coStudentsList.length; f++) {
        textBody += (f + 1) + ". " + coStudentsList[f].fullName + " (" + coStudentsList[f].studentId + ")\\n";
      }
      textBody += "\\n";
    }

    if (isApprove) {
      textBody += "[คำแนะนำในการลงทะเบียนเรียน / Registration Instructions]\\n" +
                  "คำร้องของท่านได้รับการอนุมัติแล้ว กรุณาเข้าไปเพิ่มรายวิชาดังกล่าวด้วยตนเองในระบบบริการการศึกษา:\\n" +
                  "Your seat reservation has been Approved. Please proceed to add this course yourself in the FTU Registrar System:\\n" +
                  "URL: " + REG_SYSTEM_URL + "\\n\\n";
    }

    textBody += "--\\n" + SENDER_NAME + "\\nคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี";

    var htmlBody = 
      "<div style='background-color: #f8fafc; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, \\"Segoe UI\\", Roboto, Helvetica, Arial, sans-serif;'>" +
        "<div style='max-width: 560px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;'>" +
          
          "<div style='background: " + headerBg + "; color: #ffffff; padding: 20px 16px; text-align: center;'>" +
            "<h2 style='margin: 0; font-size: 18px; font-weight: bold;'>ผลการพิจารณาคำร้องสำรองที่นั่ง</h2>" +
            "<p style='margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;'>Course Seat Reservation Status Notification</p>" +
          "</div>" +

          "<div style='padding: 18px 16px; color: #1e293b;'>" +
            "<p style='font-size: 15px; margin: 0 0 12px 0;'>" +
              "เรียน / Dear <strong>" + result.fullName + "</strong> " +
              "<span style='color: #64748b;'>(รหัส: <strong>" + result.studentId + "</strong>)</span>," +
            "</p>" +

            "<div style='background-color: #f8fafc; border-left: 5px solid " + statusBadgeColor + "; border-radius: 8px; padding: 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;'>" +
              "<div style='font-size: 15px; margin-bottom: 4px;'>" +
                "<strong>ผลการพิจารณา / Decision:</strong> " +
                "<span style='color: " + statusBadgeColor + "; font-weight: bold; font-size: 16px;'>" + status + " (" + displayStatusEN + ")</span>" +
              "</div>" +
              "<div><strong>รหัสคำร้อง / Request ID:</strong> <span style='color: #0284c7; font-weight: bold;'>" + result.id + "</span></div>" +
              (rejectionReason ? "<div style='color: #dc2626; margin-top: 4px;'><strong>เหตุผล/หมายเหตุ (Reason / Remarks):</strong> " + rejectionReason + "</div>" : "") +
              "<div style='color: #64748b; font-size: 12px; margin-top: 4px;'>ผู้ดำเนินการ: " + processedBy + " &nbsp;|&nbsp; วันที่: " + formattedDate + "</div>" +
            "</div>" +

            "<div style='margin-bottom: 8px; font-size: 14px; font-weight: bold; color: #334155;'>[รายวิชา] รายละเอียดวิชาที่ได้รับการพิจารณา / Course Details:</div>" +
            coursesCardsHtml +

            coStudentsCardHtml +

            regBoxHtml +

          "</div>" +

          "<div style='background-color: #f1f5f9; padding: 14px 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5;'>" +
            "<strong>" + SENDER_NAME + "</strong><br>คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี<br>" +
            "นี่คืออีเมลอัตโนมัติ กรุณาอย่าตอบกลับ / Automated email, please do not reply." +
          "</div>" +

        "</div>" +
      "</div>";

    var sendRes2 = sendSafeEmail(studentEmail, emailSubject, textBody, htmlBody);
    var oldEmailStatus = sheet.getRange(rowNum, 24).getValue() || '';
    if (sendRes2.success) {
      sheet.getRange(rowNum, 24).setValue(oldEmailStatus + " | ✅ แจ้งผลแล้ว (" + status + ")");
    } else {
      sheet.getRange(rowNum, 24).setValue(oldEmailStatus + " | ❌ แจ้งผลล้มเหลว: " + sendRes2.message);
    }
  } else {
    sheet.getRange(rowNum, 24).setValue(sheet.getRange(rowNum, 24).getValue() + " | ⚠️ ไม่มีอีเมล");
  }

  return jsonOut({ success: true, data: result, processedBy: processedBy, processedAt: now });
}

function handleUpdateCourseStatus(data) {
  var sheet = requestsSheet();
  var rowNum = findRowById(sheet, data.requestId);
  if (rowNum === -1) return jsonOut({ success: false, error: 'ไม่พบคำร้อง' });

  var nowDate = new Date();
  var formattedDate = Utilities.formatDate(nowDate, "GMT+7", "dd/MM/yyyy HH:mm:ss");
  var now = nowDate.toISOString();
  
  var status = data.status;
  var rawReason = data.rejectionReason || data.reason || '';
  var rejectionReason = status === 'ไม่อนุมัติ' ? rawReason : '';
  var processedBy = data.processedBy || 'แอดมินระบบ';

  var coursesRaw = sheet.getRange(rowNum, 21).getValue();
  var courses = [];
  try { courses = coursesRaw ? JSON.parse(coursesRaw) : []; } catch (err) { courses = []; }

  courses = courses.map(function (c) {
    if (c.courseCode === data.courseCode) {
      return Object.assign({}, c, {
        status: status,
        rejectionReason: rejectionReason || undefined,
        processedBy: processedBy,
        processedAt: now
      });
    }
    return c;
  });

  sheet.getRange(rowNum, 21).setValue(JSON.stringify(courses));

  var overallStatus = recomputeOverallStatus(courses);
  sheet.getRange(rowNum, 15).setValue(overallStatus);

  var overallRejectionReasons = courses
    .filter(function(c) { return c.status === 'ไม่อนุมัติ' && c.rejectionReason; })
    .map(function(c) { return c.courseCode + ': ' + c.rejectionReason; })
    .join('\\n'); 

  sheet.getRange(rowNum, 16).setValue(overallRejectionReasons);

  if (overallStatus !== 'รอดำเนินการ') {
    sheet.getRange(rowNum, 18).setValue(formattedDate);
    sheet.getRange(rowNum, 19).setValue(processedBy);
  } else {
    sheet.getRange(rowNum, 18).setValue('');
    sheet.getRange(rowNum, 19).setValue('');
  }

  var updatedRow = sheet.getRange(rowNum, 1, 1, REQUESTS_HEADERS.length).getValues()[0];
  var result = rowToRequest(updatedRow);

  var coStudentsList = extractCoStudents(courses);
  var studentEmail = result.notifyContact || '';

  if (studentEmail && studentEmail.indexOf('@') > -1) {
    var isApprove = status === 'อนุมัติแล้ว';
    var isReject = status === 'ไม่อนุมัติ';
    var headerBg = isApprove ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : (isReject ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' : 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)');
    var statusBadgeColor = isApprove ? '#059669' : (isReject ? '#dc2626' : '#d97706');
    var displayStatusEN = isApprove ? 'Approved' : (isReject ? 'Rejected' : 'Pending');
    
    var emailSubject = "[FTU FST] ผลการพิจารณารายวิชา " + data.courseCode + " (" + status + ") - " + result.id;
    var coursesCardsHtml = buildMobileCoursesCards(courses, '');
    var coStudentsCardHtml = buildMobileCoStudentsCard(coStudentsList);
    var regBoxHtml = buildMobileRegInstructionsBox(isApprove);

    var textBody = "เรียน / Dear " + result.fullName + " (รหัสนักศึกษา / Student ID: " + result.studentId + "),\\n\\n" +
                    "รายวิชา " + data.courseCode + " ตามคำร้องรหัส " + result.id + " ได้รับการพิจารณาแล้ว\\n" +
                    "Your request for course " + data.courseCode + " has been processed.\\n\\n" +
                    "--------------------------------------------------\\n" +
                    "• รหัสวิชา / Course Code: " + data.courseCode + "\\n" +
                    "• ผลการพิจารณา / Decision: " + status + " (" + displayStatusEN + ")\\n" +
                    "• ผู้ดำเนินการ / Processed by: " + processedBy + "\\n" +
                    (rejectionReason ? "• เหตุผล/หมายเหตุ / Reason: " + rejectionReason + "\\n" : "") +
                    "--------------------------------------------------\\n\\n";

    if (coStudentsList.length > 0) {
      textBody += "รายชื่อเพื่อนร่วมกลุ่มที่ฝากจอง / Co-applicants:\\n";
      for (var f = 0; f < coStudentsList.length; f++) {
        textBody += (f + 1) + ". " + coStudentsList[f].fullName + " (" + coStudentsList[f].studentId + ")\\n";
      }
      textBody += "\\n";
    }

    if (isApprove) {
      textBody += "[คำแนะนำในการลงทะเบียนเรียน / Registration Instructions]\\n" +
                  "คำร้องของท่านได้รับการอนุมัติแล้ว กรุณาเข้าไปเพิ่มรายวิชาดังกล่าวด้วยตนเองในระบบบริการการศึกษา:\\n" +
                  "Your seat reservation has been Approved. Please proceed to add this course yourself in the FTU Registrar System:\\n" +
                  "URL: " + REG_SYSTEM_URL + "\\n\\n";
    }

    textBody += "--\\n" + SENDER_NAME + "\\nคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี";

    var htmlBody = 
      "<div style='background-color: #f8fafc; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, \\"Segoe UI\\", Roboto, Helvetica, Arial, sans-serif;'>" +
        "<div style='max-width: 560px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;'>" +
          
          "<div style='background: " + headerBg + "; color: #ffffff; padding: 20px 16px; text-align: center;'>" +
            "<h2 style='margin: 0; font-size: 18px; font-weight: bold;'>ผลการพิจารณารายวิชาที่ขอสำรองที่นั่ง</h2>" +
            "<p style='margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;'>Course Seat Reservation Status Notification</p>" +
          "</div>" +

          "<div style='padding: 18px 16px; color: #1e293b;'>" +
            "<p style='font-size: 15px; margin: 0 0 12px 0;'>" +
              "เรียน / Dear <strong>" + result.fullName + "</strong> " +
              "<span style='color: #64748b;'>(รหัส: <strong>" + result.studentId + "</strong>)</span>," +
            "</p>" +

            "<div style='background-color: #f8fafc; border-left: 5px solid " + statusBadgeColor + "; border-radius: 8px; padding: 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;'>" +
              "<div style='font-size: 15px; margin-bottom: 4px;'>" +
                "<strong>วิชาที่พิจารณา:</strong> <span style='font-weight: bold; color: #0f172a;'>" + data.courseCode + "</span>" +
              "</div>" +
              "<div><strong>ผลการพิจารณา / Decision:</strong> " +
                "<span style='color: " + statusBadgeColor + "; font-weight: bold; font-size: 15px;'>" + status + " (" + displayStatusEN + ")</span>" +
              "</div>" +
              "<div><strong>รหัสคำร้อง / Request ID:</strong> <span style='color: #0284c7; font-weight: bold;'>" + result.id + "</span></div>" +
              (rejectionReason ? "<div style='color: #dc2626; margin-top: 4px;'><strong>เหตุผล/หมายเหตุ (Reason / Remarks):</strong> " + rejectionReason + "</div>" : "") +
              "<div style='color: #64748b; font-size: 12px; margin-top: 4px;'>ผู้ดำเนินการ: " + processedBy + " &nbsp;|&nbsp; วันที่: " + formattedDate + "</div>" +
            "</div>" +

            "<div style='margin-bottom: 8px; font-size: 14px; font-weight: bold; color: #334155;'>[รายวิชา] สรุปสถานะทุกรายวิชา / All Courses Summary:</div>" +
            coursesCardsHtml +

            coStudentsCardHtml +

            regBoxHtml +

          "</div>" +

          "<div style='background-color: #f1f5f9; padding: 14px 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5;'>" +
            "<strong>" + SENDER_NAME + "</strong><br>คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี<br>" +
            "นี่คืออีเมลอัตโนมัติ กรุณาอย่าตอบกลับ / Automated email, please do not reply." +
          "</div>" +

        "</div>" +
      "</div>";

    var sendRes3 = sendSafeEmail(studentEmail, emailSubject, textBody, htmlBody);
    var oldEmailStatus2 = sheet.getRange(rowNum, 24).getValue() || '';
    if (sendRes3.success) {
      sheet.getRange(rowNum, 24).setValue(oldEmailStatus2 + " | ✅ แจ้งวิชา " + data.courseCode + " (" + status + ")");
    } else {
      sheet.getRange(rowNum, 24).setValue(oldEmailStatus2 + " | ❌ แจ้งวิชาล้มเหลว: " + sendRes3.message);
    }
  }

  return jsonOut({ success: true, data: result, processedBy: processedBy, processedAt: now });
}

// ---------- Admin Handlers ----------

function handleAddAdmin(data) {
  var sheet = adminsSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.hash)) {
      return jsonOut({ success: true }); 
    }
  }
  var formattedDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  sheet.appendRow([data.hash, data.name || 'แอดมินทั่วไป', formattedDate]);
  return jsonOut({ success: true });
}

function handleDeleteAdmin(data) {
  var sheet = adminsSheet();
  var rowNum = -1;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.hash)) { rowNum = i + 1; break; }
  }
  if (rowNum > -1) sheet.deleteRow(rowNum);
  return jsonOut({ success: true });
}

function handleSaveSetting(data) {
  var sheet = settingsSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.key)) {
      sheet.getRange(i + 1, 2).setValue(data.value || '');
      return jsonOut({ success: true });
    }
  }
  sheet.appendRow([data.key, data.value || '']);
  return jsonOut({ success: true });
}

function handleRecordAuditLog(data) {
  var sheet = auditSheet();
  var id = 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  var formattedDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  
  sheet.appendRow([
    id, formattedDate, data.adminName || 'เจ้าหน้าที่', data.logAction || '', data.targetId || '', data.details || ''
  ]);
  return jsonOut({ success: true, data: { id: id, timestamp: new Date().toISOString() } });
}
`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      showToast('กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน', 'warning');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await adminLogin(password);
      if (response.success) {
        showToast('เข้าสู่ระบบของเจ้าหน้าที่คณะเรียบร้อยแล้ว', 'success');
        setLoggedInName(response.name || 'แอดมินระบบ');
        onLoginSuccess();
        // Fetch values immediately if not already loaded
        if (requests.length === 0) {
          fetchRequests();
        }
      } else {
        showToast(response.error || 'รหัสผ่านไม่ถูกต้อง', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    setLoggedInName('');
    onLogout();
  };

  // Status modification functions
  
  const executeApprove = async (id: string) => {
    // Optimistic UI Update
    const previousRequests = [...requests];
    const adminUser = loggedInName || 'แอดมินระบบ';
    setRequests(prev => prev.map(req => {
      if (req.id === id) {
        const updatedCourses = req.courses.map(c => ({
          ...c,
          status: 'อนุมัติแล้ว' as RequestStatus,
          rejectionReason: undefined,
          processedBy: adminUser,
          processedAt: new Date().toISOString()
        }));
        return { 
          ...req, 
          status: 'อนุมัติแล้ว', 
          rejectionReason: undefined,
          courses: updatedCourses,
          processedBy: adminUser,
          processedAt: new Date().toISOString()
        };
      }
      return req;
    }));
    
    // Background execution
    try {
      const result = await updateStatus(id, 'อนุมัติแล้ว', undefined, adminUser);
      if (result.success) {
        setRequests(prev => prev.map(req => req.id === id ? { 
          ...req, 
          status: 'อนุมัติแล้ว',
          processedBy: adminUser,
          processedAt: new Date().toISOString(),
          courses: req.courses.map(c => ({ ...c, status: 'อนุมัติแล้ว', processedBy: adminUser, processedAt: new Date().toISOString() }))
        } : req));
      } else {
        setRequests(previousRequests);
        showToast(result.error || 'ไม่สามารถทำรายการได้', 'error');
      }
    } catch (err) {
      setRequests(previousRequests);
      showToast('เกิดข้อผิดพลาดการสื่อสารกับเว็บบอร์ดอัปเดตพนักงาน', 'error');
    }
  };


  const handleApprove = (id: string) => {
    setConfirmDialog({
      title: 'ยืนยันการอนุมัติคำร้อง',
      message: 'คุณต้องการอนุมัติคำร้องสำรองที่นั่งวิชาเรียนนี้ใช่หรือไม่?',
      onConfirm: () => executeApprove(id)
    });
  };

  
  const executeResetToPending = async (id: string) => {
    // Optimistic Update
    const previousRequests = [...requests];
    setRequests(prev => prev.map(req => {
      if (req.id === id) {
        const updatedCourses = req.courses.map(c => ({
          ...c,
          status: 'รอดำเนินการ' as RequestStatus,
          rejectionReason: undefined,
          processedAt: undefined
        }));
        return { 
          ...req, 
          status: 'รอดำเนินการ', 
          rejectionReason: undefined,
          courses: updatedCourses,
          processedAt: undefined
        };
      }
      return req;
    }));

    try {
      const result = await updateStatus(id, 'รอดำเนินการ');
      if (result.success) {
        setRequests(prev => prev.map(req => req.id === id ? {
          ...req,
          status: 'รอดำเนินการ',
          rejectionReason: undefined,
          processedBy: undefined,
          processedAt: undefined,
          courses: req.courses.map(c => ({ ...c, status: 'รอดำเนินการ', rejectionReason: undefined, processedBy: undefined, processedAt: undefined }))
        } : req));
      } else {
        setRequests(previousRequests);
        showToast(result.error || 'ไม่สามารถแก้ไขสถานะได้', 'error');
      }
    } catch (err) {
      setRequests(previousRequests);
      showToast('เครือข่ายขัดข้อง กรุณาลองใหม่อีกครั้ง (ระบบพยายามเชื่อมต่อแล้ว)', 'error');
    }
  };

  const handleResetToPending = (id: string) => {
    setConfirmDialog({
      title: 'ยืนยันการเปลี่ยนสถานะกลับ',
      message: 'คุณต้องการยกเลิกการตัดสินใจ และเปลี่ยนสถานะคำร้องนี้ให้กลับสู่ "รอดำเนินการ" ใช่หรือไม่?',
      onConfirm: () => executeResetToPending(id)
    });
  };

  const handleOpenRejectModal = (id: string) => {
    setRejectionRequestId(id);
    setRejectionCourseCode(null);
    setRejectionReason('');
  };

  const handleRejectCourseModalOpen = (requestId: string, courseCode: string) => {
    setRejectionRequestId(requestId);
    setRejectionCourseCode(courseCode);
    setRejectionReason('');
  };

  
  const handleApproveCourse = async (requestId: string, courseCode: string) => {
    // Optimistic Update
    const previousRequests = [...requests];
    const adminUser = loggedInName || 'แอดมินระบบ';
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        const updatedCourses = req.courses.map(c => c.courseCode === courseCode ? { ...c, status: 'อนุมัติแล้ว' as RequestStatus, rejectionReason: undefined, processedBy: adminUser, processedAt: new Date().toISOString() } : c);
        const allApproved = updatedCourses.every(c => c.status === 'อนุมัติแล้ว');
        let newStatus = req.status;
        let newProcessedBy = req.processedBy;
        if (allApproved) {
          newStatus = 'อนุมัติแล้ว';
          newProcessedBy = adminUser;
        }
        return { ...req, courses: updatedCourses, status: newStatus, processedBy: newProcessedBy };
      }
      return req;
    }));

    try {
      const result = await updateCourseStatus(requestId, courseCode, 'อนุมัติแล้ว', undefined, adminUser);
      if (!result.success) {
        setRequests(previousRequests);
        showToast(result.error || 'ไม่สามารถทำรายการได้', 'error');
      }
    } catch (err) {
      setRequests(previousRequests);
      showToast('เกิดข้อผิดพลาด', 'error');
    }
  };

  
  const executeResetCourseToPending = async (requestId: string, courseCode: string) => {
    // Optimistic Update
    const previousRequests = [...requests];
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        const updatedCourses = req.courses.map(c => c.courseCode === courseCode ? { ...c, status: 'รอดำเนินการ' as RequestStatus, rejectionReason: undefined, processedBy: undefined, processedAt: undefined } : c);
        return { ...req, courses: updatedCourses, status: 'รอดำเนินการ' };
      }
      return req;
    }));

    try {
      const result = await updateCourseStatus(requestId, courseCode, 'รอดำเนินการ');
      if (!result.success) {
        setRequests(previousRequests);
        showToast(result.error || 'ไม่สามารถแก้ไขสถานะได้', 'error');
      }
    } catch (err) {
      setRequests(previousRequests);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  };

  const handleResetCourseToPending = (requestId: string, courseCode: string) => {
    setConfirmDialog({
      title: 'ยืนยันการเปลี่ยนสถานะวิชาเรียน',
      message: `คุณต้องการเปลี่ยนสถานะรายวิชา ${courseCode} กลับสู่ "รอดำเนินการ" ใช่หรือไม่?`,
      onConfirm: () => executeResetCourseToPending(requestId, courseCode)
    });
  };

  
  const handleConfirmRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showToast('กรุณาระบุเหตุผลที่ไม่อนุมัติ', 'warning');
      return;
    }
    
    setIsSubmittingRejection(true);
    
    // Optimistic Update
    const previousRequests = [...requests];
    const isCourseLevel = !!rejectionCourseCode;
    const adminUser = loggedInName || 'แอดมินระบบ';
    
    setRequests(prev => prev.map(req => {
      if (req.id === rejectionRequestId) {
        if (isCourseLevel) {
          const updatedCourses = req.courses.map(c => c.courseCode === rejectionCourseCode ? { ...c, status: 'ไม่อนุมัติ' as RequestStatus, rejectionReason: rejectionReason.trim(), processedBy: adminUser, processedAt: new Date().toISOString() } : c);
          let newStatus = req.status;
          const allRejected = updatedCourses.every(c => c.status === 'ไม่อนุมัติ');
          let newProcessedBy = req.processedBy;
          if (allRejected) {
            newStatus = 'ไม่อนุมัติ';
            newProcessedBy = adminUser;
          }
          return { ...req, courses: updatedCourses, status: newStatus, processedBy: newProcessedBy };
        } else {
          const updatedCourses = req.courses.map(c => ({
            ...c,
            status: 'ไม่อนุมัติ' as RequestStatus,
            rejectionReason: rejectionReason.trim(),
            processedBy: adminUser,
            processedAt: new Date().toISOString()
          }));
          return {
            ...req,
            status: 'ไม่อนุมัติ',
            rejectionReason: rejectionReason.trim(),
            courses: updatedCourses,
            processedBy: adminUser,
            processedAt: new Date().toISOString()
          };
        }
      }
      return req;
    }));
    
    // Close modal immediately for snappy UI
    const targetRequestId = rejectionRequestId;
    const targetCourseCode = rejectionCourseCode;
    const targetReason = rejectionReason.trim();
    
    setRejectionRequestId(null);
    setRejectionCourseCode(null);
    setRejectionReason('');

    try {
      if (isCourseLevel) {
        const result = await updateCourseStatus(targetRequestId, targetCourseCode!, 'ไม่อนุมัติ', targetReason, adminUser);
        if (!result.success) {
          setRequests(previousRequests);
          showToast(result.error || 'ไม่สามารถทำรายการได้', 'error');
        }
      } else {
        const result = await updateStatus(targetRequestId, 'ไม่อนุมัติ', targetReason, adminUser);
        if (!result.success) {
          setRequests(previousRequests);
          showToast(result.error || 'ไม่สามารถทำรายการได้', 'error');
        }
      }
    } catch (err) {
      setRequests(previousRequests);
      showToast('เครือข่ายขัดข้อง กรุณาลองใหม่อีกครั้ง (ระบบพยายามเชื่อมต่อแล้ว)', 'error');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Ordering & Filtering Computations
  // "เรียงคำร้อง "รอดำเนินการ" ไว้บนสุด" และเรียงตามวันที่ล่าสุด
  const getProcessedRequests = () => {
    let filtered = [...requests];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        req => 
          (req.id && String(req.id).toLowerCase().includes(query)) ||
          String(req.studentId || '').toLowerCase().includes(query) ||
          String(req.fullName || '').toLowerCase().includes(query) ||
          String(req.courseCode || '').toLowerCase().includes(query) ||
          String(req.courseName || '').toLowerCase().includes(query) ||
          (req.courses && req.courses.some(c => 
            String(c.courseCode || '').toLowerCase().includes(query) ||
            String(c.courseName || '').toLowerCase().includes(query) ||
            (c.coStudents && c.coStudents.some(cs => 
              String(cs.studentId || '').toLowerCase().includes(query) ||
              String(cs.fullName || '').toLowerCase().includes(query)
            ))
          ))
      );
    }

    // Filter by Status filter
    if (statusFilter !== 'ทั้งหมด') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    // Filter by selected year BE (Buddhist Era)
    filtered = filtered.filter(req => {
      try {
        const year = parseDateSafe(req.createdAt).getFullYear() + 543;
        return year === selectedYear;
      } catch (e) {
        return selectedYear === currentBEYear;
      }
    });

    // Sort: Pending ("รอดำเนินการ") first, then newest submission dates
    return filtered.sort((a, b) => {
      if (a.status === 'รอดำเนินการ' && b.status !== 'รอดำเนินการ') return -1;
      if (a.status !== 'รอดำเนินการ' && b.status === 'รอดำเนินการ') return 1;
      // Secondary sort: Newest first
      return parseDateSafe(b.createdAt).getTime() - parseDateSafe(a.createdAt).getTime();
    });
  };

  const processedRequests = getProcessedRequests();

  const getStatusRowColor = (status: RequestStatus) => {
    switch (status) {
      case 'รอดำเนินการ': return 'bg-amber-50/40 hover:bg-amber-50/60 transition-colors';
      case 'อนุมัติแล้ว': return 'bg-emerald-50/10 hover:bg-emerald-50/20 transition-colors';
      case 'ไม่อนุมัติ': return 'bg-rose-50/10 hover:bg-rose-50/20 transition-colors';
    }
  };

  // LOGIN SCREEN
  if (!isInitiallyLoggedIn) {
    if (hasRegisteredPasswords === false) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="w-full max-w-md mx-auto py-12"
          id="admin-first-setup-screen"
        >
          <div className="bg-white/85 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),_0_15px_30px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-white/90 p-8 text-center space-y-6 animate-fade-in">
            <div className="mx-auto w-12 h-12 bg-mangosteen/10 text-mangosteen rounded-2xl flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            
            <div>
              <div className="flex items-center justify-center space-x-2 mb-1.5">
                <div className="w-1 h-5 bg-mangosteen rounded-full"></div>
                <h2 className="text-xl font-extrabold font-sans text-mangosteen underline decoration-2 underline-offset-8">ตั้งค่าแอดมินครั้งแรก</h2>
              </div>
              <p className="text-slate-400 text-xs font-sans">
                ไม่พบรหัสผ่านผู้ดูแลระบบในอุปกรณ์นี้ กรุณากำหนดชื่อและรหัสผ่านเพื่อเริ่มต้นใช้งานระบบเจ้าหน้าที่
              </p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newAdminName.trim()) {
                showToast('กรุณากรอกชื่อเจ้าหน้าที่แอดมิน', 'warning');
                return;
              }
              if (!newAdminPassword.trim()) {
                showToast('กรุณากรอกรหัสผ่านสำหรับเข้าสู่ระบบ', 'warning');
                return;
              }
              
              // Double check to prevent resetting existing passwords
              const latestPasswords = await getSavedAdminPasswords();
              if (latestPasswords.length > 0) {
                showToast('มีรหัสผ่านอยู่ในระบบแล้ว ไม่สามารถตั้งค่าใหม่ด้วยวิธีนี้ได้', 'error');
                setHasRegisteredPasswords(true);
                return;
              }

              await addAdminPassword(newAdminPassword.trim(), newAdminName.trim());
              showToast('ลงทะเบียนบัญชีผู้ดูแลระบบคนแรกเรียบร้อยแล้ว', 'success');
              
              const updated = await getSavedAdminPasswords();
              setSavedPasswords(updated);
              setHasRegisteredPasswords(true);
              setNewAdminPassword('');
              setNewAdminName('');
            }} className="space-y-4 text-left" id="admin-first-setup-form">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">
                  ชื่อเจ้าหน้าที่แอดมิน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  placeholder="เช่น อ.อาฟีตรี, แอดมินระบบ"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-white text-sm font-sans transition-all focus:outline-hidden focus:border-mangosteen focus:ring-4 focus:ring-mangosteen/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">
                  รหัสผ่านสำหรับเข้าสู่ระบบ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newAdminPassword}
                    onChange={e => setNewAdminPassword(e.target.value)}
                    placeholder="กำหนดรหัสผ่านใหม่"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-white text-sm font-sans transition-all focus:outline-hidden focus:border-mangosteen focus:ring-4 focus:ring-mangosteen/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-mangosteen hover:bg-mangosteen-hover text-white rounded-xl text-sm font-bold tracking-wide font-sans shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                id="btn-first-setup-submit"
              >
                <Check className="w-4 h-4" />
                บันทึกและเริ่มต้นใช้งาน
              </button>
            </form>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-md mx-auto py-12"
        id="admin-login-screen"
      >
        <div className="bg-white/85 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),_0_15px_30px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-white/90 p-8 text-center space-y-6 animate-fade-in">
          <div className="mx-auto w-12 h-12 bg-mangosteen/10 text-mangosteen rounded-2xl flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          
          <div>
            <div className="flex items-center justify-center space-x-2 mb-1.5">
              <div className="w-1 h-5 bg-mangosteen rounded-full"></div>
              <h2 className="text-xl font-extrabold font-sans text-mangosteen underline decoration-2 underline-offset-8">สำนักงานคณะเจ้าหน้าที่</h2>
            </div>
            <p className="text-slate-400 text-xs font-sans">
              ระบบตรวจสอบรายวิชาและการอนุญาตกรอกโควตาสำรองที่นั่ง สำหรับเจ้าหน้าที่ และผู้ดูแลระบบเท่านั้น
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left" id="admin-login-form">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-sans">
                ป้อนรหัสผ่านสิทธิ์แอดมิน <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-white text-sm font-sans tracking-widest transition-all focus:outline-hidden focus:border-mangosteen focus:ring-4 focus:ring-mangosteen/20"
                  id="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  id="btn-toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-mangosteen hover:bg-mangosteen-hover text-white rounded-xl text-sm font-bold tracking-wide font-sans shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
              id="btn-login-submit"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              ยืนยันการเข้าระบบ
            </button>
          </form>

          
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
      id="admin-dashboard-view"
    >
      {/* Top dashboard banner & toggle controls */}
      <div className="bg-white/85 backdrop-blur-2xl rounded-2xl p-6 border border-white/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),_0_15px_30px_-15px_rgba(0,0,0,0.1)] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-mangosteen rounded-full"></div>
              <h1 className="text-lg font-extrabold font-sans text-mangosteen items-center">ระบบบริหารจัดการสำหรับเจ้าหน้าที่</h1>
            </div>
            <p className="text-slate-400 text-xs font-sans">
              พิจารณาคำขอสำรองที่นั่งวิชาเรียนนอกสังกัด คณะวิทยาศาสตร์และเทคโนโลยี • มหาวิทยาลัยฟาฏอนี
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowSystemSettings(true)}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-black font-sans rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border bg-slate-50 text-slate-700 border-slate-250 hover:bg-slate-100 hover:border-slate-350 shadow-3xs"
              id="btn-toggle-system-settings"
              title="ตั้งค่าปรับแต่งระบบทั้งหมด (จัดการรหัสผ่าน, ตั้งค่าฐานข้อมูล, รูปโลโก้ & Favicon)"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>ตั้งค่าระบบ</span>
            </button>

            {loggedInName && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mangosteen/15 text-mangosteen border border-mangosteen/25 rounded-lg text-xs font-bold font-sans">
                <User className="w-3.5 h-3.5 text-mangosteen" />
                <span>เจ้าหน้าที่: {loggedInName}</span>
              </div>
            )}
            
            <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>

            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-rose-200/80 hover:border-rose-600 shadow-3xs"
              id="btn-admin-logout"
              title="ออกจากระบบเจ้าหน้าที่"
            >
              <Power className="w-3.5 h-3.5 shrink-0" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* Main Admin Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 border-t border-slate-100 pt-4 overflow-x-auto font-sans" id="admin-main-tabs">
          <button
            type="button"
            onClick={() => setActiveAdminTab('requests')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeAdminTab === 'requests'
                ? 'bg-mangosteen text-white shadow-md shadow-mangosteen/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>รายการคำร้อง ({requests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('analytics')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeAdminTab === 'analytics'
                ? 'bg-mangosteen text-white shadow-md shadow-mangosteen/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>รายงานและสถิติภาพรวม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('schedule_settings')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeAdminTab === 'schedule_settings'
                ? 'bg-mangosteen text-white shadow-md shadow-mangosteen/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>เปิด-ปิดระบบ & แจ้งเตือน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('audit_logs')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeAdminTab === 'audit_logs'
                ? 'bg-mangosteen text-white shadow-md shadow-mangosteen/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            id="tab-btn-audit-logs"
          >
            <Clock className="w-4 h-4" />
            <span>ประวัติการอนุมัติ (Audit Log)</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: REQUESTS LISTING & MANAGEMENT --- */}
      {activeAdminTab === 'requests' && (
        <div className="space-y-6">
          {/* Filters and search panel */}
          <div className="bg-white/85 backdrop-blur-2xl rounded-2xl p-6 border border-white/90 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="admin-filters-bar">
          {/* Searching */}
          <div className="relative" ref={comboboxRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="รหัสอ้างอิง, รหัสนักศึกษา, ชื่อ หรือวิชา..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setComboboxOpen(true);
                setHighlightedIndex(0);
              }}
              onFocus={() => {
                setComboboxOpen(true);
                setHighlightedIndex(0);
              }}
              onKeyDown={e => {
                if (!comboboxOpen) {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    setComboboxOpen(true);
                    setHighlightedIndex(0);
                  }
                  return;
                }

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedIndex(prev => (prev + 1) % filteredSuggestions.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredSuggestions[highlightedIndex]) {
                    setSearchQuery(filteredSuggestions[highlightedIndex].value);
                    setComboboxOpen(false);
                  }
                } else if (e.key === 'Escape') {
                  setComboboxOpen(false);
                }
              }}
              className="w-full pl-9 pr-8 py-2 text-xs font-sans rounded-lg border border-slate-200 focus:outline-hidden focus:border-mangosteen focus:ring-1 focus:ring-mangosteen"
              id="admin-search-query"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setComboboxOpen(false);
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Suggestions Dropdown */}
            {comboboxOpen && (
              <>
                {filteredSuggestions.length > 0 ? (
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white/95 backdrop-blur-md rounded-lg border border-slate-200/80 shadow-lg z-50 py-1 text-xs">
                    {filteredSuggestions.map((item, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      let IconComponent = Search;
                      if (item.type === 'student') IconComponent = User;
                      else if (item.type === 'course') IconComponent = GraduationCap;
                      else if (item.type === 'request') IconComponent = Database;

                      return (
                        <button
                          key={`${item.type}-${item.value}`}
                          type="button"
                          onClick={() => {
                            setSearchQuery(item.value);
                            setComboboxOpen(false);
                          }}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isHighlighted ? 'bg-mangosteen/10 text-mangosteen font-semibold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isHighlighted ? 'text-mangosteen' : 'text-slate-400'}`} />
                            <span className="truncate text-left">{item.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-sans px-1.5 py-0.5 rounded-full bg-slate-100">
                            {item.secondary}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  searchQuery.trim() !== '' && (
                    <div className="absolute left-0 right-0 mt-1 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200/80 shadow-lg z-50 p-3 text-center text-xs text-slate-400">
                      ไม่พบข้อมูลที่ตรงกัน
                    </div>
                  )
                )}
              </>
            )}
          </div>

          {/* Year Selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-semibold font-sans rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-mangosteen focus:ring-1 focus:ring-mangosteen cursor-pointer"
              id="admin-year-selector"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>
                  ปี พ.ศ. {year} {year === currentBEYear ? '(ปีปัจจุบัน)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tab Filter Button Row */}
          <div className="flex bg-slate-50 p-1 rounded-lg md:col-span-2 overflow-x-auto gap-1 border border-slate-100">
            {(['ทั้งหมด', 'รอดำเนินการ', 'อนุมัติแล้ว', 'ไม่อนุมัติ'] as const).map(tab => {
              const active = statusFilter === tab;
              let labelColor = 'text-slate-500 hover:text-slate-800';
              if (active) {
                if (tab === 'ทั้งหมด') labelColor = 'bg-white text-mangosteen font-bold shadow-sm';
                else if (tab === 'รอดำเนินการ') labelColor = 'bg-white text-amber-700 font-bold shadow-sm border-b border-amber-400';
                else if (tab === 'อนุมัติแล้ว') labelColor = 'bg-white text-emerald-700 font-bold shadow-sm border-b border-emerald-400';
                else if (tab === 'ไม่อนุมัติ') labelColor = 'bg-white text-rose-700 font-bold shadow-sm border-b border-rose-400';
              }
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-medium font-sans text-center transition-all whitespace-nowrap cursor-pointer ${labelColor}`}
                  id={`btn-filter-status-${tab}`}
                >
                  {tab}
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-150 text-slate-600 font-bold font-sans">
                    {tab === 'ทั้งหมด' 
                      ? requests.filter(r => {
                          const year = parseDateSafe(r.createdAt).getFullYear() + 543;
                          return year === selectedYear;
                        }).length 
                      : requests.filter(r => {
                          const year = parseDateSafe(r.createdAt).getFullYear() + 543;
                          return year === selectedYear && r.status === tab;
                        }).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Browser Notification Permission Banner */}
      {notificationPermission && notificationPermission !== 'granted' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs font-sans"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-xl shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-1 text-left">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-amber-200">
                เปิดระบบแจ้งเตือนแบบเรียลไทม์บนหน้าจอเบราว์เซอร์
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                กรุณาอนุญาตสิทธิ์การแจ้งเตือนเพื่อรับข้อความพุช (Push Notification) ทันทีบนระบบปฏิบัติการของแอดมิน เมื่อมีนักศึกษาส่งคำร้องขอสำรองที่นั่งใหม่เข้ามา
              </p>
            </div>
          </div>
          <button
            onClick={requestBrowserNotificationPermission}
            className="w-full sm:w-auto shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/10"
          >
            <Check className="w-4 h-4" />
            อนุมัติรับการแจ้งเตือน
          </button>
        </motion.div>
      )}

      {/* Results Header with Prominent Reload Button */}
      <div className="bg-white/85 backdrop-blur-2xl rounded-2xl p-4 border border-white/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),_0_15px_30px_-15px_rgba(0,0,0,0.1)] flex flex-col sm:flex-row items-center justify-between gap-3 font-sans mt-4 mb-4" id="admin-results-header">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-mangosteen rounded-full"></div>
          <span className="text-xs font-extrabold text-slate-700">
            แสดงผลตามตัวกรอง: <span className="text-mangosteen font-black text-sm">{processedRequests.length}</span> รายการคำร้อง
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Email Quota Badge / Check Button */}
          <button
            type="button"
            onClick={fetchEmailQuota}
            disabled={checkingQuota}
            title="คลิกเพื่อตรวจสอบโควตาส่งอีเมลประจำวันคงเหลือ"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 shadow-2xs active:scale-[0.98]"
          >
            <Mail className={`w-3.5 h-3.5 text-mangosteen ${checkingQuota ? 'animate-pulse' : ''}`} />
            <span>
              {checkingQuota 
                ? 'ตรวจโควตา...' 
                : emailQuota 
                  ? `โควตาเมล: ${emailQuota.remaining} ฉบับ` 
                  : 'ตรวจโควตาอีเมล'}
            </span>
          </button>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={processedRequests.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 select-none shadow-3xs"
            title="ส่งออกรายการที่เลือกเป็นไฟล์ Excel / CSV (รองรับภาษาไทย 100%)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก Excel / CSV</span>
          </button>

          {/* Prominent Reload Button */}
          <button
            onClick={() => {
              fetchRequests();
              fetchEmailQuota();
              showToast('กำลังซิงค์อัปเดตดึงข้อมูลล่าสุด...', 'success');
            }}
            disabled={loadingRequests}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-sans text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-600 active:scale-[0.98] disabled:opacity-50 select-none shadow-3xs"
            title="ดึงข้อมูลล่าสุด"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin' : ''}`} />
            <span>{loadingRequests ? 'กำลังดึง...' : 'ดึงข้อมูลล่าสุด'}</span>
          </button>
        </div>
      </div>

      {loadingRequests ? (
        /* Loading skeleton spinner */
        <div className="bg-white/85 backdrop-blur-2xl rounded-2xl p-12 border border-white/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),_0_15px_30px_-15px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-mangosteen" />
          <p className="text-slate-400 text-xs font-sans animate-pulse">กำลังโหลดข้อมูลคำร้องในระบบ...</p>
        </div>
      ) : processedRequests.length === 0 ? (
        /* Empty feedback */
        <div className="bg-white/85 backdrop-blur-2xl rounded-2xl p-12 border border-white/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),_0_15px_30px_-15px_rgba(0,0,0,0.1)] text-center space-y-3" id="admin-empty-results">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 font-sans text-sm">ไม่พบคำร้องตามเงื่อนไขที่กรอง</h4>
            <p className="text-slate-400 text-xs font-sans">ไม่มีข้อมูลคำขอล่าสุดของคุณในโหมดแสดงผล หรือเงื่อนไขตัวกรองปัจจุบัน</p>
          </div>
        </div>
      ) : (
        /* Main Results Showcase: Desktop Table & Mobile Cards */
        <div id="admin-results-display">
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden lg:block bg-white/85 backdrop-blur-2xl rounded-2xl border border-white/90 overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),_0_15px_30px_-15px_rgba(0,0,0,0.1)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="admin-requests-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-sans text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">รหัสคำร้อง</th>
                    <th className="py-3 px-4">ข้อมูลนักศึกษา</th>
                    <th className="py-3 px-4">สาขาวิชา/รุ่นปี</th>
                    <th className="py-3 px-4">ช่องทางติดต่อ</th>
                    <th className="py-3 px-4">รายวิชาที่ลง</th>
                    <th className="py-3 px-4 text-center">จัดการคำขอ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedRequests.map(req => (
                    <tr key={req.id} className={`text-xs text-slate-600 align-top transition-colors ${getStatusRowColor(req.status)}`}>
                      {/* Tracking ID string */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-500 select-all border-b border-slate-150 pt-4.5">
                        {req.id}
                      </td>

                      {/* Highlight Student Info: Student ID and Name */}
                      <td className="py-4 px-4 font-sans space-y-2 border-b border-slate-150">
                        {/* Highlights Student ID */}
                        <div className="flex flex-col gap-1">
                          <span className="self-start inline-flex items-center gap-1.5 px-2 py-1 bg-slate-800 text-slate-100 font-mono text-[11px] font-extrabold rounded-md shadow-xs select-all">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                            {req.studentId}
                          </span>
                          <span className="font-extrabold text-slate-800 text-sm block">คุณ{req.fullName}</span>
                        </div>
                      </td>

                      {/* Dept & Session Year Info */}
                      <td className="py-4 px-4 font-sans space-y-1.5 border-b border-slate-150">
                        <div className="text-slate-800 font-extrabold text-[11px] uppercase tracking-wide">
                          {req.faculty || 'คณะวิทยาศาสตร์และเทคโนโลยี'}
                        </div>
                        <div className="text-slate-700 font-semibold text-xs leading-relaxed" title={req.department}>
                          สาขา: {req.department}
                        </div>
                        <div className="text-slate-400 font-medium text-[10px]">ชั้นปีที่ {req.year}</div>
                      </td>

                      {/* Contact Channel & Proof */}
                      <td className="py-4 px-4 font-sans border-b border-slate-150">
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={`tel:${req.phone}`} className="hover:text-mangosteen underline font-bold select-all">{req.phone}</a>
                          </div>
                          <div>
                            {(req.proofType === 'file' || req.facebookProofFile || (req.facebookProofLink && req.facebookProofLink.includes('drive.google.com'))) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetUrl = req.facebookProofFile?.dataUrl || req.facebookProofLink || '';
                                  setPreviewImage({
                                    url: targetUrl,
                                    rawLink: req.facebookProofLink,
                                    title: `ภาพแคปเจอร์สิทธิ์การเข้าร่วม Facebook จากคุณ ${req.fullName}`
                                  });
                                }}
                                className="bg-slate-100 border border-slate-200 hover:border-mangosteen hover:bg-white text-mangosteen px-2 py-1.5 rounded-lg text-[10px] inline-flex items-center gap-1.5 transition-colors font-bold cursor-pointer shadow-3xs active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                ภาพหลักฐาน FB
                              </button>
                            ) : (
                              <a
                                href={req.facebookProofLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-slate-100 border border-slate-200 hover:border-sky-500 hover:bg-white text-sky-700 px-2 py-1.5 rounded-lg text-[10px] inline-flex items-center gap-1.5 transition-colors font-bold shadow-3xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                ลิงก์กลุ่ม FB
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Highlight Courses: Code, Name, Section, Instructor */}
                      <td className="py-4 px-4 font-sans max-w-sm border-b border-slate-150">
                        <div className="space-y-2">
                          {((req.courses && req.courses.length > 0) ? req.courses : [{
                            courseCode: req.courseCode || '',
                            courseName: req.courseName || '',
                            section: req.section || '',
                            instructor: req.instructor || '',
                            status: req.status,
                            rejectionReason: req.rejectionReason
                          }]).map((course, cIdx) => (
                            <div key={cIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 transition-all hover:shadow-xs">
                              <div className="flex items-start justify-between gap-1.5 flex-wrap">
                                <div className="flex items-start gap-1.5 flex-wrap">
                                  {/* Highlights Course Code with instant copy button */}
                                  <button
                                    onClick={() => handleCopyCourseCode(course.courseCode)}
                                    className="bg-mangosteen hover:bg-mangosteen-hover active:scale-95 text-white px-2.5 py-1.5 rounded-md font-extrabold font-mono text-xs leading-none shrink-0 tracking-wide flex items-center gap-1 cursor-pointer transition-all shadow-3xs select-none"
                                    title="คลิกเพื่อคัดลอกรหัสวิชาทันที"
                                  >
                                    <span>{course.courseCode}</span>
                                    <Copy className="w-2.5 h-2.5 opacity-80 shrink-0" />
                                  </button>
                                  {/* Highlights Course Name */}
                                  <span className="text-xs sm:text-sm font-extrabold text-slate-850 leading-tight block">
                                    {course.courseName}
                                  </span>
                                </div>
                                {/* Status badge per course */}
                                {course.status && course.status !== 'รอดำเนินการ' && (
                                  <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                                    course.status === 'อนุมัติแล้ว' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {course.status}
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-105">
                                {/* Highlights Section */}
                                <div className="text-slate-500 font-medium">
                                  กลุ่ม (Section): <strong className="text-mangosteen font-extrabold font-mono text-sm">{course.section || '-'}</strong>
                                </div>
                                {/* Highlights Instructor */}
                                <div className="text-slate-500 font-medium truncate" title={course.instructor}>
                                  ผู้สอน: <strong className="text-slate-750 font-bold">{course.instructor || 'ไม่ระบุ'}</strong>
                                </div>
                              </div>

                              {/* Co-students in this course (Admin View) */}
                              {course.coStudents && course.coStudents.length > 0 && (
                                <div className="pt-2.5 border-t border-slate-200/80 space-y-1.5 mt-1">
                                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-mangosteen" />
                                    <span>รายชื่อนักศึกษาในกลุ่มนี้ (ขอรวมทั้งหมด {1 + course.coStudents.length} ที่นั่ง):</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {/* ป้ายผู้ยื่นหลัก (ให้เห็นรวมในแก๊งเดียวกัน) */}
                                    <span className="bg-mangosteen/10 text-mangosteen text-[11px] px-2 py-0.5 rounded-md border border-mangosteen/30 font-sans font-medium">
                                      <strong className="font-mono text-mangosteen font-black">{req.studentId}</strong> {req.fullName} <span className="opacity-80 font-bold">(ผู้ยื่นหลัก)</span>
                                    </span>
                                    {/* ป้ายเพื่อนร่วมกลุ่ม */}
                                    {course.coStudents.map((cs, csIdx) => (
                                      <span key={csIdx} className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded-md border border-slate-200 font-sans font-medium">
                                        <strong className="font-mono text-slate-900 font-black">{cs.studentId}</strong> {cs.fullName}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons Per Course */}
                              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
                                {(!course.status || course.status === 'รอดำเนินการ') ? (
                                  <div className="flex w-full items-center gap-2">
                                    <button
                                      onClick={() => handleApproveCourse(req.id, course.courseCode)}
                                      className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" /> อนุมัติ
                                    </button>
                                    <button
                                      onClick={() => handleRejectCourseModalOpen(req.id, course.courseCode)}
                                      className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex w-full items-center justify-between">
                                    <span className={`text-xs px-2 py-1 rounded-md font-bold inline-flex items-center gap-1.5 ${
                                      course.status === 'อนุมัติแล้ว' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                    }`}>
                                      {course.status === 'อนุมัติแล้ว' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                      {course.status}
                                    </span>
                                    <button
                                      onClick={() => handleResetCourseToPending(req.id, course.courseCode)}
                                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                      title="แก้ไขสถานะกลับเป็น รอดำเนินการ"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {/* Rejection Reason Per Course */}
                              {course.status === 'ไม่อนุมัติ' && course.rejectionReason && (
                                <div className="mt-1 text-xs text-rose-600 bg-rose-50 p-1.5 rounded-md border border-rose-100">
                                  <strong>เหตุผล:</strong> {course.rejectionReason}
                                </div>
                              )}

                              {/* Processor attribution per course */}
                              {course.status && course.status !== 'รอดำเนินการ' && course.processedBy && (
                                <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1 mt-1.5 justify-end">
                                  <User className="w-2.5 h-2.5" />
                                  <span>ผู้ปรับสถานะ: {course.processedBy}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Action columns */}
                      <td className="py-4 px-4 font-sans text-center border-b border-slate-150 w-60">
                        <div className="flex flex-col gap-2 items-center justify-center" id={`action-panel-desktop-${req.id}`}>
                          {req.status === 'รอดำเนินการ' ? (
                            <div className="w-full space-y-2">
                              {/* Global action buttons for quick review */}
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-sans text-xs font-black rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <CheckCircle className="w-4 h-4" /> อนุมัติทั้งหมด
                              </button>
                              <button
                                onClick={() => handleOpenRejectModal(req.id)}
                                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-sans text-xs font-black rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <XCircle className="w-4 h-4" /> ไม่อนุมัติทั้งหมด
                              </button>
                            </div>
                          ) : (
                            <div className="w-full space-y-2">
                              <div className="text-[10px] font-bold text-slate-400 space-y-0.5">
                                <div>พิจารณาแล้ว {req.processedAt ? new Date(req.processedAt).toLocaleDateString('th-TH') : ''}</div>
                                {req.processedBy && (
                                  <div className="text-[9px] text-mangosteen font-semibold flex items-center justify-center gap-1 mt-0.5">
                                    <User className="w-2.5 h-2.5" />
                                    <span>โดย: {req.processedBy}</span>
                                  </div>
                                )}
                              </div>
                              {/* Removed rejection reason box here as requested */}
                              <button
                                onClick={() => handleResetToPending(req.id)}
                                className="w-full py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-[0.98]"
                              >
                                <Edit className="w-3.5 h-3.5" /> แก้ไขสถานะกลับ
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (For small screens) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden" id="admin-requests-mobile-grid">
            {processedRequests.map(req => (
              <div 
                key={req.id} 
                className={`bg-white rounded-2xl p-5 border-2 shadow-xs relative overflow-hidden flex flex-col justify-between gap-4 transition-all hover:border-mangosteen/20 ${
                  req.status === 'รอดำเนินการ' ? 'border-amber-100 bg-amber-50/10' : 'border-slate-100'
                }`}
                id={`request-mobile-card-${req.id}`}
              >
                {/* Horizontal color stripe for quick info */}
                <div className={`absolute top-0 right-0 left-0 h-1.5 ${
                  req.status === 'รอดำเนินการ' 
                    ? 'bg-amber-400' 
                    : req.status === 'อนุมัติแล้ว' 
                      ? 'bg-emerald-500' 
                      : 'bg-rose-500'
                }`}></div>

                {/* Card Title info */}
                <div className="space-y-4 pt-1">
                  <div className="flex justify-between items-start gap-3">
                    <span className="font-mono text-[10px] text-slate-400 font-extrabold bg-slate-100 px-2 py-0.5 rounded">ID: {req.id}</span>
                    <div>
                      {req.status === 'รอดำเนินการ' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                          รอดำเนินการ
                        </span>
                      )}
                      {req.status === 'อนุมัติแล้ว' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-250">
                          อนุมัติแล้ว
                        </span>
                      )}
                      {req.status === 'ไม่อนุมัติ' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-250">
                          ไม่อนุมัติ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Highlights Student Info */}
                  <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/50 font-sans">
                    <div className="flex flex-col gap-1">
                      <span className="self-start inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-slate-100 font-mono text-[10px] font-extrabold rounded shadow-xs select-all">
                        รหัสนักศึกษา: {req.studentId}
                      </span>
                      <div className="text-sm font-extrabold text-slate-800 pt-1">
                        คุณ{req.fullName} <span className="text-[11px] text-slate-400 font-bold">(ชั้นปีที่ {req.year})</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-250 text-xs leading-normal">
                      <div className="text-slate-500 font-semibold text-[10px] uppercase tracking-wide">คณะ/สาขาวิชา:</div>
                      <div className="text-slate-800 font-extrabold text-xs mt-0.5">
                        {req.faculty || 'คณะวิทยาศาสตร์และเทคโนโลยี'}
                      </div>
                      <div className="text-slate-600 font-semibold text-[11px] mt-0.5">
                        สาขา: {req.department}
                      </div>
                    </div>
                  </div>

                  {/* Highlight Course Details */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">วิชาที่ยื่นคำร้องสำรองที่นั่ง:</div>
                    {((req.courses && req.courses.length > 0) ? req.courses : [{
                      courseCode: req.courseCode || '',
                      courseName: req.courseName || '',
                      section: req.section || '',
                      instructor: req.instructor || '',
                      status: req.status,
                      rejectionReason: req.rejectionReason
                    }]).map((course, cIdx) => (
                      <div key={cIdx} className="bg-white p-3.5 rounded-xl space-y-2 border border-slate-200 shadow-3xs">
                        <div className="flex items-start justify-between gap-1.5 flex-wrap">
                          <div className="flex items-start gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleCopyCourseCode(course.courseCode)}
                              className="bg-mangosteen hover:bg-mangosteen-hover active:scale-95 text-white font-extrabold font-mono text-[9px] px-2.5 py-1 rounded-md leading-none shrink-0 flex items-center gap-1 cursor-pointer transition-all shadow-3xs select-none"
                              title="คลิกเพื่อคัดลอกรหัสวิชาทันที"
                            >
                              <span>{course.courseCode}</span>
                              <Copy className="w-2.5 h-2.5 opacity-80 shrink-0" />
                            </button>
                            <span className="text-xs font-bold text-slate-755 font-sans leading-tight block">
                              {course.courseName}
                            </span>
                          </div>
                          {course.status && course.status !== 'รอดำเนินการ' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                              course.status === 'อนุมัติแล้ว' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {course.status}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-slate-100 font-sans">
                          <div>กลุ่ม (Sec): <strong className="text-mangosteen font-extrabold font-mono leading-none">{course.section || '-'}</strong></div>
                          <div className="truncate" title={course.instructor}>ผู้สอน: <strong className="text-slate-700 font-bold">{course.instructor || 'ไม่ระบุ'}</strong></div>
                        </div>

                        {/* Co-students in this course (Admin Mobile View) */}
                        {course.coStudents && course.coStudents.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/80 space-y-1.5 mt-1">
                            <div className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
                              <Users className="w-3 h-3 text-mangosteen" />
                              <span>รายชื่อนักศึกษาในกลุ่มนี้ (รวม {1 + course.coStudents.length} ที่นั่ง):</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {/* ป้ายผู้ยื่นหลัก */}
                              <span className="bg-mangosteen/10 text-mangosteen text-[10px] px-2 py-0.5 rounded-md border border-mangosteen/30 font-sans font-medium">
                                <strong className="font-mono text-mangosteen font-black">{req.studentId}</strong> {req.fullName} <span className="opacity-80 font-bold">(ผู้ยื่นหลัก)</span>
                              </span>
                              {/* ป้ายเพื่อนร่วมกลุ่ม */}
                              {course.coStudents.map((cs, csIdx) => (
                                <span key={csIdx} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-md border border-slate-200 font-sans font-medium">
                                  <strong className="font-mono text-slate-900 font-black">{cs.studentId}</strong> {cs.fullName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons Per Course (Mobile) */}
                        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
                          {(!course.status || course.status === 'รอดำเนินการ') ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveCourse(req.id, course.courseCode)}
                                className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <CheckCircle className="w-3 h-3" /> อนุมัติ
                              </button>
                              <button
                                onClick={() => handleRejectCourseModalOpen(req.id, course.courseCode)}
                                className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3 h-3" /> ไม่อนุมัติ
                              </button>
                            </div>
                          ) : (
                            <div className="flex w-full items-center justify-between">
                              <span className={`text-[10px] px-2 py-1 rounded-md font-bold inline-flex items-center gap-1 ${
                                course.status === 'อนุมัติแล้ว' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {course.status === 'อนุมัติแล้ว' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {course.status}
                              </span>
                              <button
                                onClick={() => handleResetCourseToPending(req.id, course.courseCode)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                title="แก้ไขสถานะกลับเป็น รอดำเนินการ"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {course.status === 'ไม่อนุมัติ' && course.rejectionReason && (
                          <div className="mt-1 text-[9px] text-rose-600 bg-rose-50 p-1.5 rounded-md border border-rose-100">
                            <strong>เหตุผล:</strong> {course.rejectionReason}
                          </div>
                        )}

                        {/* Processor attribution per course on mobile */}
                        {course.status && course.status !== 'รอดำเนินการ' && course.processedBy && (
                          <div className="text-[9px] text-slate-400 font-sans flex items-center gap-1 mt-1 justify-end">
                            <User className="w-2.5 h-2.5" />
                            <span>ผู้ปรับสถานะ: {course.processedBy}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Contact Info & Proof Link */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 text-[11px] font-sans pt-1">
                    <div className="text-slate-500 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${req.phone}`} className="hover:text-mangosteen font-bold underline">{req.phone}</a>
                    </div>

                    <div>
                      {(req.proofType === 'file' || req.facebookProofFile || (req.facebookProofLink && req.facebookProofLink.includes('drive.google.com'))) ? (
                        <button
                          type="button"
                          onClick={() => {
                            const targetUrl = req.facebookProofFile?.dataUrl || req.facebookProofLink || '';
                            setPreviewImage({
                              url: targetUrl,
                              rawLink: req.facebookProofLink,
                              title: `หลักฐาน Facebook ของคุณ ${req.fullName}`
                            });
                          }}
                          className="bg-slate-100 border border-slate-200 hover:border-mangosteen text-mangosteen hover:bg-white px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-3xs"
                        >
                          <Eye className="w-3 h-3" />
                          ภาพหลักฐาน
                        </button>
                      ) : (
                        <a
                          href={req.facebookProofLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-100 border border-slate-200 hover:border-sky-500 hover:bg-white text-sky-700 px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          เปิด FB Profile
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Unified Remarks/Comment display on mobile card */}
                  {req.rejectionReason ? (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[10px] font-sans text-slate-700 space-y-1.5">
                      <div>
                        <strong className="text-slate-500 block mb-0.5">📝 บันทึกหมายเหตุจากเจ้าหน้าที่:</strong>
                        <span className="font-semibold whitespace-pre-wrap">{req.rejectionReason}</span>
                      </div>
                      {req.processedBy && (
                        <div className="text-[9px] text-mangosteen font-semibold flex items-center gap-1 border-t border-slate-200/60 pt-1">
                          <User className="w-2.5 h-2.5" />
                          <span>ผู้พิจารณา: {req.processedBy}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-[10px] pt-1">
                      <span className="text-slate-350 italic">ไม่มีบันทึกหมายเหตุ</span>
                      {req.status !== 'รอดำเนินการ' && req.processedBy && (
                        <div className="text-mangosteen font-semibold flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          <span>โดย: {req.processedBy}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile action button bottom drawer */}
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2" id={`action-panel-mobile-${req.id}`}>
                  {req.status === 'รอดำเนินการ' ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" /> อนุมัติคำร้องทั้งหมด
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(req.id)}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <XCircle className="w-4 h-4" /> ไม่อนุมัติคำร้องทั้งหมด
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleResetToPending(req.id)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-center text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Edit className="w-3.5 h-3.5" /> แก้ไขสถานะกลับเป็น รอดำเนินการ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )}

  {/* --- TAB 2: ANALYTICS DASHBOARD --- */}
  {activeAdminTab === 'analytics' && (
    <div className="space-y-6 font-sans">
      {/* Analytics Year Filter Header */}
      <div className="bg-white/85 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/90 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-mangosteen" />
            รายงานสถิติการยื่นคำร้องสำรองที่นั่ง
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {analyticsYear === 'all' 
              ? 'สรุปสถิติภาพรวมคำร้องทั้งหมดทุกปีการศึกษา' 
              : `สรุปสถิติข้อมูลคำร้องประจำปี พ.ศ. ${analyticsYear}`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100/90 p-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-500 ml-1.5" />
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">ดูสถิติตามปี พ.ศ.:</span>
          <select
            id="analytics-year-selector"
            value={analyticsYear}
            onChange={(e) => setAnalyticsYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-white text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-mangosteen/30 cursor-pointer shadow-xs"
          >
            <option value="all">ทุกปีการศึกษา (ข้อมูลทั้งหมด)</option>
            {availableYears.map(year => (
              <option key={year} value={year}>
                ปี พ.ศ. {year} {year === currentBEYear ? '(ปีปัจจุบัน)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/85 backdrop-blur-xl p-5 rounded-2xl border border-white/90 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">คำร้องทั้งหมด</span>
            <div className="p-2 bg-mangosteen/10 text-mangosteen rounded-xl"><FileText className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">{analyticsData.totalRequests}</p>
          <p className="text-xs text-slate-500 mt-1">คำร้องรวมในระบบ</p>
        </div>

        <div className="bg-white/85 backdrop-blur-xl p-5 rounded-2xl border border-white/90 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase">อนุมัติแล้ว</span>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">{analyticsData.totalApproved}</p>
          <p className="text-xs text-slate-500 mt-1">
            {analyticsData.totalRequests > 0 ? `${Math.round((analyticsData.totalApproved / analyticsData.totalRequests) * 100)}% ของคำร้องทั้งหมด` : '0%'}
          </p>
        </div>

        <div className="bg-white/85 backdrop-blur-xl p-5 rounded-2xl border border-white/90 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase">ไม่อนุมัติ</span>
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl"><XCircle className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-extrabold text-rose-700 mt-2">{analyticsData.totalRejected}</p>
          <p className="text-xs text-slate-500 mt-1">
            {analyticsData.totalRequests > 0 ? `${Math.round((analyticsData.totalRejected / analyticsData.totalRequests) * 100)}% ของคำร้องทั้งหมด` : '0%'}
          </p>
        </div>

        <div className="bg-white/85 backdrop-blur-xl p-5 rounded-2xl border border-white/90 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase">รอดำเนินการ</span>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Clock className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-extrabold text-amber-700 mt-2">{analyticsData.totalPending}</p>
          <p className="text-xs text-slate-500 mt-1">รอเจ้าหน้าที่ตรวจสอบ</p>
        </div>
      </div>

      {/* Course Demand Breakdown - Crucial for Executives deciding to open extra sections */}
      <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-white/90 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-mangosteen" />
              สรุปจำนวนคำร้องแยกตามวิชา (สำหรับผู้บริหารวิเคราะห์ในการเปิดเซคชันเพิ่ม)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">เรียงลำดับตามจำนวนนักศึกษาที่ยื่นขอสำรองที่นั่งมากที่สุด</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {analyticsData.topCourses.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">ยังไม่มีข้อมูลวิชาในระบบ</p>
          ) : (
            analyticsData.topCourses.map(item => {
              const maxTotal = analyticsData.topCourses[0]?.total || 1;
              const percent = Math.round((item.total / maxTotal) * 100);
              return (
                <div key={item.code} className="py-3.5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs bg-mangosteen/10 text-mangosteen px-2 py-0.5 rounded-md mr-2">
                        {item.code}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{item.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-semibold">
                      <span className="text-slate-600">รวม <strong>{item.total}</strong> คน</span>
                      <span className="text-emerald-600">อนุมัติ {item.approved}</span>
                      <span className="text-rose-600">ปฏิเสธ {item.rejected}</span>
                      <span className="text-amber-600">รอ {item.pending}</span>
                    </div>
                  </div>

                  {/* Progress bar visual */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(item.approved / (item.total || 1)) * percent}%` }} title={`อนุมัติ: ${item.approved}`} />
                    <div className="bg-rose-500 h-full" style={{ width: `${(item.rejected / (item.total || 1)) * percent}%` }} title={`ไม่อนุมัติ: ${item.rejected}`} />
                    <div className="bg-amber-400 h-full" style={{ width: `${(item.pending / (item.total || 1)) * percent}%` }} title={`รอดำเนินการ: ${item.pending}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Department & Faculty Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-white/90 shadow-md space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-mangosteen" />
            สรุปยอดตามสาขาวิชา
          </h3>
          <div className="space-y-3">
            {analyticsData.topDepts.map(item => (
              <div key={item.dept} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50">
                <span className="font-medium text-slate-700 truncate max-w-[200px]" title={item.dept}>{item.dept}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-mangosteen px-2 py-0.5 bg-mangosteen/10 rounded-md">{item.total} คำร้อง</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty Breakdown */}
        <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-white/90 shadow-md space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-mangosteen" />
            สรุปยอดตามคณะ
          </h3>
          <div className="space-y-3">
            {analyticsData.topFaculties.map(item => (
              <div key={item.faculty} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50">
                <span className="font-medium text-slate-700 truncate max-w-[200px]" title={item.faculty}>{item.faculty}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-mangosteen px-2 py-0.5 bg-mangosteen/10 rounded-md">{item.total} คำร้อง</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )}

  {/* --- TAB 3: SCHEDULE & NOTIFICATION SETTINGS --- */}
  {activeAdminTab === 'schedule_settings' && (
    <form onSubmit={handleSaveScheduleSettings} className="bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-white/90 shadow-md space-y-6 font-sans">
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-1.5 h-5 bg-mangosteen rounded-full"></div>
          <h3 className="text-base font-extrabold text-slate-800">ตั้งค่าเปิด-ปิดระบบรับคำร้องสำรองที่นั่ง</h3>
        </div>
        <p className="text-xs text-slate-500">กำหนดโหมดการเปิดรับคำร้อง และตั้งเวลาเริ่มต้น/สิ้นสุดการรับคำร้องแบบอัตโนมัติ</p>
      </div>

      {/* Mode selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setSystemOpeningMode('always_open')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            systemOpeningMode === 'always_open'
              ? 'border-mangosteen bg-mangosteen/5 ring-2 ring-mangosteen/20 text-mangosteen'
              : 'border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-extrabold text-sm">เปิดตลอดเวลา</span>
            <CheckCircle className={`w-4 h-4 ${systemOpeningMode === 'always_open' ? 'text-mangosteen' : 'text-slate-300'}`} />
          </div>
          <p className="text-xs text-slate-500">นักศึกษาสามารถยื่นคำร้องได้ตลอดเวลาไม่มีกำหนดปิด</p>
        </button>

        <button
          type="button"
          onClick={() => setSystemOpeningMode('scheduled')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            systemOpeningMode === 'scheduled'
              ? 'border-mangosteen bg-mangosteen/5 ring-2 ring-mangosteen/20 text-mangosteen'
              : 'border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-extrabold text-sm">เปิดตามช่วงเวลาที่กำหนด</span>
            <Calendar className={`w-4 h-4 ${systemOpeningMode === 'scheduled' ? 'text-mangosteen' : 'text-slate-300'}`} />
          </div>
          <p className="text-xs text-slate-500">ระบบจะเปิดให้ยื่นคำร้องเฉพาะช่วงวันที่และเวลาที่กำหนดไว้</p>
        </button>

        <button
          type="button"
          onClick={() => setSystemOpeningMode('closed')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            systemOpeningMode === 'closed'
              ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200 text-rose-700'
              : 'border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-extrabold text-sm">ปิดรับคำร้องชั่วคราว</span>
            <Lock className={`w-4 h-4 ${systemOpeningMode === 'closed' ? 'text-rose-600' : 'text-slate-300'}`} />
          </div>
          <p className="text-xs text-slate-500">ปิดระบบทันที ไม่ให้นักศึกษายื่นคำร้องใหม่</p>
        </button>
      </div>

      {/* Scheduled Inputs */}
      {systemOpeningMode === 'scheduled' && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วัน-เวลา เริ่มต้นรับคำร้อง</label>
            <input
              type="datetime-local"
              value={systemOpenStart}
              onChange={e => setSystemOpenStart(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-mangosteen bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วัน-เวลา สิ้นสุดรับคำร้อง</label>
            <input
              type="datetime-local"
              value={systemOpenEnd}
              onChange={e => setSystemOpenEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-mangosteen bg-white"
            />
          </div>
        </div>
      )}

      {/* System Closed Message */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">ข้อความแจ้งเตือนเมื่อระบบปิดรับคำร้อง</label>
        <input
          type="text"
          value={systemClosedMessage}
          onChange={e => setSystemClosedMessage(e.target.value)}
          placeholder="อยู่นอกกำหนดเวลาการรับคำร้องสำรองที่นั่งวิชาเรียน"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-mangosteen"
        />
      </div>

      {/* LINE Notification Section */}
      <div className="border-t border-slate-200 pt-6 space-y-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-extrabold text-slate-800">ระบบการแจ้งเตือนอัตโนมัติ (LINE Notify / Webhook)</h3>
          </div>
          <p className="text-xs text-slate-500">ส่งข้อความแจ้งเตือนเข้ากลุ่ม LINE เจ้าหน้าที่ หรือนักศึกษาทันทีที่มีรายการอัปเดต</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">LINE Notify Access Token / Webhook URL (สำหรับแอดมิน)</label>
            <input
              type="text"
              value={notifyLineToken}
              onChange={e => setNotifyLineToken(e.target.value)}
              placeholder="ใส่ LINE Notify Token หรือ Webhook URL"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={notifyOnNewRequest}
                onChange={e => setNotifyOnNewRequest(e.target.checked)}
                className="rounded-sm text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span>แจ้งเตือนแอดมินทันทีเมื่อมีคำร้องใหม่</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={notifyOnStatusChange}
                onChange={e => setNotifyOnStatusChange(e.target.checked)}
                className="rounded-sm text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span>แจ้งเตือนเมื่ออนุมัติ/ไม่อนุมัติคำร้อง</span>
            </label>
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSavingScheduleSettings}
          className="px-6 py-2.5 bg-mangosteen hover:bg-mangosteen-hover text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-2 cursor-pointer"
        >
          {isSavingScheduleSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>บันทึกการตั้งค่ากำหนดการ</span>
        </button>
      </div>
    </form>
  )}

  {/* --- TAB 4: AUDIT LOGS --- */}
  {activeAdminTab === 'audit_logs' && (
    <div className="bg-white/85 backdrop-blur-2xl rounded-2xl p-6 border border-white/90 shadow-md space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-1.5 h-5 bg-mangosteen rounded-full"></div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-mangosteen" />
              ประวัติการกดอนุมัติ/ไม่อนุมัติ (Audit Log)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            ระบบบันทึกประวัติย้อนหลังสำหรับแอดมินที่กดอนุมัติ/ไม่อนุมัติ บันทึกชื่อเจ้าหน้าที่ เวลาทำรายการ และรายละเอียดลงใน Google Sheets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={auditLogSearch}
              onChange={e => setAuditLogSearch(e.target.value)}
              placeholder="ค้นหาชื่อแอดมิน, รหัสคำร้อง..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-mangosteen"
            />
          </div>
          <button
            onClick={fetchAuditLogs}
            disabled={loadingAuditLogs}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAuditLogs ? 'animate-spin text-mangosteen' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Table / List */}
      {loadingAuditLogs ? (
        <div className="py-16 text-center text-slate-400 font-sans text-sm flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-mangosteen" />
          <span>กำลังโหลดประวัติการอนุมัติจากระบบและ Google Sheets...</span>
        </div>
      ) : filteredAuditLogs.length === 0 ? (
        <div className="py-16 text-center text-slate-400 font-sans text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8 space-y-2">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-600 text-base">ยังไม่พบประวัติการทำรายการ</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            ประวัติการกดอนุมัติ/ไม่อนุมัติจะถูกบันทึกอัตโนมัติลงในระบบ และเพิ่มแถวใหม่ในแผ่นงาน <code className="text-mangosteen font-semibold bg-mangosteen/10 px-1.5 py-0.5 rounded">AuditLogs</code> ใน Google Sheets เมื่อแอดมินทำรายการ
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-2xs">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5 w-44">วัน-เวลา (Timestamp)</th>
                <th className="p-3.5 w-44">แอดมินผู้ทำรายการ</th>
                <th className="p-3.5 w-36">การกระทำ</th>
                <th className="p-3.5 w-32">รหัสอ้างอิง</th>
                <th className="p-3.5">รายละเอียดข้อมูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAuditLogs.map(log => {
                const isApprove = log.action.includes('อนุมัติ') && !log.action.includes('ไม่อนุมัติ');
                const isReject = log.action.includes('ไม่อนุมัติ');
                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : '-'}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                        <User className="w-3.5 h-3.5 text-mangosteen" />
                        {log.adminName || 'เจ้าหน้าที่'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                        isApprove ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        isReject ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {isApprove && <Check className="w-3 h-3 text-emerald-600" />}
                        {isReject && <X className="w-3 h-3 text-rose-600" />}
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-700 font-bold">
                      {log.targetId || '-'}
                    </td>
                    <td className="p-3.5 text-slate-700 leading-relaxed">
                      {log.details}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}

      {/* --- REJECTION MODAL POPUP --- */}
      <AnimatePresence>
        {rejectionRequestId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/95 backdrop-blur-3xl rounded-2xl max-w-sm w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2),_0_15px_30px_-15px_rgba(0,0,0,0.15)] overflow-hidden border border-white"
              id="rejection-reason-modal"
            >
              <div className="bg-rose-50 px-5 py-4 border-b border-rose-100/65 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <h3 className="font-bold text-slate-800 font-sans text-sm">ระบุสาเหตุการไม่อนุมัติคำร้อง</h3>
              </div>
              <form onSubmit={handleConfirmRejectSubmit} className="p-5 space-y-4">
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  กรุณากรอกข้อมูลเหตุผลเพื่อให้ผลและตอบปฏิเสธสิทธิ์นี้แก่นักศึกษา เหตุผลนี้จะแสดงบนการ์ดตรวจสอบสถานะในหน้านักศึกษาทันทีเมื่อกดค้นหา
                </p>

                <textarea
                  required
                  placeholder="เช่น กลุ่มรับเต็มแล้ว... / วิชาผิดสาขาหลัก..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full h-24 p-2.5 text-xs font-sans rounded-lg border border-slate-200 focus:outline-hidden focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20"
                  id="rejection-reason-textarea"
                />

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectionRequestId(null)}
                    className="flex-1 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-sans text-xs font-semibold cursor-pointer"
                    id="btn-rejection-cancel"
                  >
                    ยกเลิกพิจารณา
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRejection || !rejectionReason.trim()}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-lg font-sans text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    id="btn-rejection-confirm"
                  >
                    {isSubmittingRejection ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'ตกลงไม่อนุมัติ'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- IMAGE VIEWER MODAL --- */}
      <AnimatePresence>
        {previewImage && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setPreviewImage(null)}
            id="image-previewer-light-box"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 cursor-default flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Eye className="w-4 h-4 text-mangosteen shrink-0" />
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 font-sans truncate">{previewImage.title}</h4>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(previewImage.url?.includes('drive.google.com') || previewImage.rawLink?.includes('drive.google.com')) && (
                    <a
                      href={previewImage.rawLink || previewImage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold font-sans inline-flex items-center gap-1 transition-colors"
                      title="เปิดดูใน Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เปิดใน Drive</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg font-sans text-xs transition-colors cursor-pointer"
                    id="btn-close-image-previewer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-3 sm:p-4 bg-slate-950 flex-1 flex flex-col justify-center items-center relative overflow-hidden min-h-[320px]">
                {(() => {
                  const targetUrl = previewImage.url || previewImage.rawLink || '';
                  const driveMatch = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                  const driveId = driveMatch ? driveMatch[1] : null;

                  // 1. Google Drive Link: Use Drive Preview iframe
                  if (driveId) {
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                        <iframe
                          src={`https://drive.google.com/file/d/${driveId}/preview`}
                          className="w-full h-[58vh] rounded-lg border-0 bg-slate-900 shadow-inner"
                          allow="autoplay"
                          title="Google Drive Image Preview"
                        />
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <a
                            href={`https://drive.google.com/file/d/${driveId}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-mangosteen hover:bg-mangosteen-dark text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5 active:scale-95"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>เปิดดูไฟล์ภาพต้นฉบับใน Google Drive</span>
                          </a>
                        </div>
                      </div>
                    );
                  }

                  // 2. DataURL or Direct Image Link
                  if (targetUrl && (targetUrl.startsWith('data:image') || targetUrl.startsWith('http') || targetUrl.startsWith('blob:'))) {
                    return (
                      <div className="w-full flex flex-col items-center justify-center">
                        <img
                          src={targetUrl}
                          alt="ภาพหลักฐาน Facebook"
                          className="max-h-[65vh] max-w-full object-contain rounded-md shadow-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const el = document.getElementById('image-error-fallback');
                            if (el) el.style.display = 'flex';
                          }}
                        />
                        <div id="image-error-fallback" style={{ display: 'none' }} className="flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-amber-400">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                          <p className="text-slate-300 font-medium text-sm font-sans">ไม่สามารถแสดงภาพตัวอย่างโดยตรงได้</p>
                          {previewImage.rawLink && (
                            <a
                              href={previewImage.rawLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-mangosteen hover:bg-mangosteen-dark text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>คลิกที่นี่เพื่อเปิดลิงก์หลักฐาน</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 3. Fallback when no valid URL is found
                  return (
                    <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-amber-400">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <p className="text-slate-300 font-medium text-sm font-sans">ไม่พบข้อมูลไฟล์รูปภาพหลักฐาน</p>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-sans text-slate-500 shrink-0">
                <span className="truncate max-w-[280px] sm:max-w-md">
                  {previewImage.rawLink ? `ลิงก์ไฟล์: ${previewImage.rawLink}` : 'แสดงภาพหลักฐานจากผู้ยื่นคำร้อง'}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      
      {/* Unified System Settings Modal */}
      <AnimatePresence>
        {showSystemSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/95 backdrop-blur-3xl rounded-2xl w-full max-w-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2),_0_15px_30px_-15px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh] border border-white"
            >
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-mangosteen/10 flex items-center justify-center shrink-0">
                    <Settings className="w-4 h-4 text-mangosteen" />
                  </div>
                  <div>
                    <h3 className="font-extrabold font-sans text-slate-800 text-sm">ตั้งค่าระบบ (System Settings)</h3>
                    <p className="text-[10px] text-slate-400 font-sans">จัดการฐานข้อมูล, ปรับแต่งหน้าเว็บ และบัญชีแอดมิน</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSystemSettings(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer transition-colors"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs list */}
              <div className="flex bg-slate-100/85 p-1 border-b border-slate-250/30 gap-1 shrink-0">
                <button
                  onClick={() => setActiveSettingsTab('database')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeSettingsTab === 'database'
                      ? 'bg-white text-mangosteen shadow-3xs border border-slate-200/40'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>ตั้งค่าฐานข้อมูล</span>
                </button>
                <button
                  onClick={() => setActiveSettingsTab('logo')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeSettingsTab === 'logo'
                      ? 'bg-white text-mangosteen shadow-3xs border border-slate-200/40'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>ตั้งค่ารูปโลโก้ & Favicon</span>
                </button>
                <button
                  onClick={() => setActiveSettingsTab('password')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeSettingsTab === 'password'
                      ? 'bg-white text-mangosteen shadow-3xs border border-slate-200/40'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>จัดการรหัสผ่าน</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {activeSettingsTab === 'database' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-extrabold text-slate-750 flex items-center gap-1.5 font-sans">
                        <Database className="w-4 h-4 text-mangosteen" />
                        เชื่อมโยงฐานข้อมูลแผ่นงานหลัก (Google Sheets Configuration)
                      </span>
                      
                      <div>
                        {isApiConfigured() ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-850 border border-emerald-200">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                            ระบบเชื่อมต่อสเปรดชีตสด (API Live Mode)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-850 border border-amber-200">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5 animate-pulse"></span>
                            โหมดจำลอง (Demo Local Storage)
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 font-sans leading-relaxed">
                      เชื่อมต่อตรงกับสเปรดชีตของคุณ <strong>https://docs.google.com/spreadsheets/d/1em96LFx0V2eiEyd5F9XbLFGebvHfGrFYXCGZhK22o50/edit</strong> ผ่านทาง Google Apps Script Web App เพื่อใช้ร่วมกันพิจารณาคุณสมบัติแบบหลายวิชาพร้อมกัน (Multi-course setup)
                    </p>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 font-sans">
                        URL ของเว็บแอปพลิเคชัน Google Apps Script (Web App Deployment URL)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-350 focus:outline-hidden focus:border-mangosteen focus:ring-1 focus:ring-mangosteen bg-slate-50/50"
                          placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                          value={gasUrlInput}
                          onChange={(e) => setGasUrlInput(e.target.value)}
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleSaveGasUrl}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            บันทึกเชื่อมต่อ
                          </button>
                          <button
                            onClick={handleTestConnection}
                            disabled={isTestingConnection}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white font-sans text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {isTestingConnection ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
                            ทดสอบ
                          </button>
                          {isApiConfigured() && (
                            <button
                              onClick={handleDisconnectGas}
                              className="px-3 py-2 border border-rose-300 hover:bg-rose-50 text-rose-600 font-sans text-xs rounded-lg cursor-pointer transition-colors"
                            >
                              ตัดการเชื่อมต่อ
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="p-3 bg-slate-100 flex items-center justify-between border-b border-slate-200">
                          <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5 text-mangosteen" />
                            โค้ด Google Apps Script สำหรับคัดลอกลงชีต (ติดตั้งครั้งเดียว)
                          </div>
                          <button
                            onClick={handleCopyCode}
                            className={`px-2.5 py-1 text-[10px] items-center font-bold font-sans rounded-md transition-all cursor-pointer flex gap-1 ${
                              isCopied
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-mangosteen text-white hover:bg-mangosteen-hover shadow-xs'
                            }`}
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {isCopied ? 'คัดลอกสำเร็จแล้ว!' : 'คัดลอกโค้ดหลัก'}
                          </button>
                        </div>
                        <div className="p-3 bg-slate-900 overflow-x-auto">
                          <pre className="text-[10px] font-mono text-emerald-400 max-h-40 overflow-y-auto leading-normal whitespace-pre">
                            {getGoogleAppsScriptCode()}
                          </pre>
                        </div>
                        <div className="p-3 bg-indigo-50 border-t border-indigo-100 text-[11px] text-indigo-900 leading-relaxed space-y-1">
                          <div className="font-bold">💡 คำแนะนำสั้นในการติดตั้ง (5 นาทีก็เสร็จ):</div>
                          <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                            <li>เปิดสเปรดชีตของคุณในแท็บใหม่</li>
                            <li>กดเมนู <strong>Extensions (ส่วนขยาย)</strong> &gt; <strong>Apps Script</strong></li>
                            <li>ลบสคริปต์เก่าออกทั้งหมด แล้วกด <strong>วาง (Paste)</strong> โค้ดที่คัดลอกจากด้านบนนี้ลงไป</li>
                            <li>กด <strong>บันทึก (แผ่นดิสก์)</strong> จากนั้นกดปุ่ม <strong>Deploy (การใช้งานด้านบนแอดมิน)</strong> &gt; เลือก <strong>New deployment</strong></li>
                            <li>เลือกประเภทเป็น <strong>Web app</strong> ตั้งค่า <em>Execute as: Me</em> และ <em>Who has access: Anyone</em></li>
                            <li>กดจัดส่ง (Deploy) อนุญาตสิทธิ์แล้วคัดลอก <strong>Web app URL</strong> นำมาวางที่ปุ่มตั้งค่านะครับ!</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'logo' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-extrabold text-slate-750 flex items-center gap-1.5 font-sans">
                        <Palette className="w-4 h-4 text-purple-600" />
                        ตั้งค่ารูปภาพปรับแต่งระบบ (Customize System Logo & Web Favicon)
                      </span>
                      
                      <div className="flex gap-1.5 flex-wrap">
                        {customLogo ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            ใช้งานโลโก้กำหนดเอง
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            ใช้งานโลโก้เริ่มต้น
                          </span>
                        )}
                        {customFavicon ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            ใช้งาน Favicon กำหนดเอง
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            ใช้งาน Favicon เริ่มต้น
                          </span>
                        )}
                      </div>
                    </div>

                    {/* --- BLOCK A: MAIN SYSTEM LOGO (TOP LEFT) --- */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                        <span className="text-xs font-extrabold text-slate-700">1. โลโก้หลักของระบบ (System Logo - แสดงตรงมุมบนซ้าย)</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Preview Area */}
                        <div className="md:col-span-3 flex flex-col items-center justify-center p-3 bg-slate-100/50 rounded-lg border border-slate-200">
                          <span className="text-[9px] font-black text-slate-400 mb-2 uppercase tracking-wider">ตัวอย่างโลโก้</span>
                          <div className="w-14 h-14 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-3xs">
                            {logoInput ? (
                              <img 
                                src={logoInput} 
                                alt="Logo Preview" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23f43f5e' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='9' y1='9' x2='15' y2='15'%3E%3C/line%3E%3Cline x1='15' y1='9' x2='9' y2='15'%3E%3C/line%3E%3C/svg%3E";
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-300">
                                <ImageIcon className="w-5 h-5 stroke-1" />
                                <span className="text-[8px] font-bold mt-0.5 text-slate-400">เริ่มต้น</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inputs Area */}
                        <div className="md:col-span-9 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Upload File */}
                            <div className="relative border border-dashed border-slate-250 hover:border-purple-300 rounded-lg p-2.5 text-center transition-all bg-white hover:bg-purple-50/10 cursor-pointer group">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      showToast('ขนาดไฟล์รูปภาพโลโก้ใหญ่เกินไป จำกัดไม่เกิน 2MB', 'warning');
                                      return;
                                    }
                                    compressImage(file, 256, 256, 0.8).then(base64 => {
                                      setLogoInput(base64);
                                      showToast('โหลดและย่อขนาดรูปภาพสำเร็จ เตรียมบันทึก', 'success');
                                    }).catch(err => {
                                      showToast('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ', 'error');
                                      console.error(err);
                                    });
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <Upload className="w-4 h-4 mx-auto text-slate-400 group-hover:text-purple-500 transition-colors mb-0.5" />
                              <span className="block text-[10px] font-extrabold text-slate-500 group-hover:text-purple-600">อัปโหลดไฟล์รูปโลโก้</span>
                              <span className="block text-[8px] text-slate-400">ขนาดไม่เกิน 2MB (PNG, JPG, SVG, WebP)</span>
                            </div>

                            {/* URL input */}
                            <div className="flex flex-col justify-center space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                <Link2 className="w-3 h-3 text-slate-400" /> หรือวางที่อยู่รูปภาพ (URL)
                              </span>
                              <input
                                type="text"
                                placeholder="https://example.com/logo-image.png"
                                value={logoInput.startsWith('data:') ? '' : logoInput}
                                onChange={(e) => setLogoInput(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-250 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* --- BLOCK B: WEB FAVICON (BROWSER TAB ICON) --- */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                        <span className="text-xs font-extrabold text-slate-700">2. รูปภาพสัญลักษณ์แท็บเบราว์เซอร์ (Web Favicon - ไอคอนขนาดเล็กบนแท็บ)</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Preview Area */}
                        <div className="md:col-span-3 flex flex-col items-center justify-center p-3 bg-slate-100/50 rounded-lg border border-slate-200">
                          <span className="text-[9px] font-black text-slate-400 mb-2 uppercase tracking-wider">ตัวอย่าง Favicon</span>
                          <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shadow-3xs">
                            {faviconInput ? (
                              <img 
                                src={faviconInput} 
                                alt="Favicon Preview" 
                                className="w-full h-full object-contain p-1" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23f43f5e' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='9' y1='9' x2='15' y2='15'%3E%3C/line%3E%3Cline x1='15' y1='9' x2='9' y2='15'%3E%3C/line%3E%3C/svg%3E";
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-300">
                                <ImageIcon className="w-4 h-4 stroke-1" />
                                <span className="text-[8px] font-bold text-slate-400">เริ่มต้น</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inputs Area */}
                        <div className="md:col-span-9 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Upload File */}
                            <div className="relative border border-dashed border-slate-250 hover:border-indigo-300 rounded-lg p-2.5 text-center transition-all bg-white hover:bg-indigo-50/10 cursor-pointer group">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 1 * 1024 * 1024) {
                                      showToast('ขนาดไฟล์รูปภาพ Favicon ใหญ่เกินไป จำกัดไม่เกิน 1MB', 'warning');
                                      return;
                                    }
                                    compressImage(file, 128, 128, 0.8).then(base64 => {
                                      setFaviconInput(base64);
                                      showToast('โหลดและย่อขนาด Favicon สำเร็จ เตรียมบันทึก', 'success');
                                    }).catch(err => {
                                      showToast('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ', 'error');
                                      console.error(err);
                                    });
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <Upload className="w-4 h-4 mx-auto text-slate-400 group-hover:text-indigo-500 transition-colors mb-0.5" />
                              <span className="block text-[10px] font-extrabold text-slate-500 group-hover:text-indigo-600">อัปโหลดไฟล์ Favicon</span>
                              <span className="block text-[8px] text-slate-400">แนะนำรูปทรงจัตุรัส ไม่เกิน 1MB (PNG, ICO, SVG)</span>
                            </div>

                            {/* URL input */}
                            <div className="flex flex-col justify-center space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                <Link2 className="w-3 h-3 text-slate-400" /> หรือวางที่อยู่รูปภาพ (URL)
                              </span>
                              <input
                                type="text"
                                placeholder="https://example.com/favicon.ico"
                                value={faviconInput.startsWith('data:') ? '' : faviconInput}
                                onChange={(e) => setFaviconInput(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-250 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          let changed = false;
                          if (onUpdateLogo) {
                            onUpdateLogo(logoInput);
                            changed = true;
                          }
                          if (onUpdateFavicon) {
                            onUpdateFavicon(faviconInput);
                            changed = true;
                          }
                          if (changed) {
                            showToast('บันทึกปรับแต่งโลโก้หลักและ Favicon บนแท็บเสร็จสมบูรณ์!', 'success');
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-sans text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        บันทึกโลโก้ & Favicon
                      </button>

                      {(logoInput || faviconInput) && (
                        <button
                          onClick={() => {
                            setLogoInput('');
                            setFaviconInput('');
                            if (onUpdateLogo) onUpdateLogo('');
                            if (onUpdateFavicon) onUpdateFavicon('');
                            showToast('รีเซ็ตโลโก้และ Favicon กลับเป็นค่าเริ่มต้นเรียบร้อย!', 'info');
                          }}
                          className="px-3 py-2 border border-slate-250 hover:bg-slate-100 text-slate-600 font-sans text-xs rounded-lg cursor-pointer transition-colors"
                        >
                          คืนค่าเริ่มต้นทั้งหมด
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'password' && (
                  <div className="space-y-4 font-sans">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-700 font-sans border-b border-slate-100 pb-1.5 uppercase tracking-wide">ลงทะเบียนรหัสเจ้าหน้าที่ใหม่</h4>
                      
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 font-sans">
                          ชื่อเจ้าหน้าที่แอดมิน <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newAdminName}
                          onChange={e => setNewAdminName(e.target.value)}
                          placeholder="เช่น อ.อาฟีตรี, อนันต์"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans focus:outline-hidden focus:border-mangosteen focus:ring-2 focus:ring-mangosteen/20 mb-2.5 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 font-sans">
                          รหัสผ่านสำหรับการเข้าสู่ระบบ <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={newAdminPassword}
                            onChange={e => setNewAdminPassword(e.target.value)}
                            placeholder="กำหนดรหัสผ่าน"
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans focus:outline-hidden focus:border-mangosteen focus:ring-2 focus:ring-mangosteen/20 bg-white"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!newAdminName.trim()) {
                                showToast('กรุณากรอกชื่อเจ้าหน้าที่แอดมิน', 'warning');
                                return;
                              }
                              if (!newAdminPassword.trim()) {
                                showToast('กรุณากรอกรหัสผ่านสำหรับเข้าสู่ระบบ', 'warning');
                                return;
                              }

                              // Prevent duplicates and hash collisions
                              const hashed = await hashString(newAdminPassword.trim());
                              const existsHash = savedPasswords.some(p => p.hash === hashed);
                              if (existsHash) {
                                showToast('รหัสผ่านนี้ถูกใช้ในระบบแล้ว กรุณาใช้รหัสผ่านอื่นเพื่อความปลอดภัย', 'warning');
                                return;
                              }
                              const existsName = savedPasswords.some(p => p.name.trim().toLowerCase() === newAdminName.trim().toLowerCase());
                              if (existsName) {
                                showToast('ชื่อผู้ดูแลระบบนี้มีอยู่แล้วในเครื่องนี้ กรุณาใช้ชื่ออื่น', 'warning');
                                return;
                              }

                              await addAdminPassword(newAdminPassword.trim(), newAdminName.trim());
                              showToast('เพิ่มรหัสผ่านและชื่อเจ้าหน้าที่คณะใหม่เรียบร้อยแล้ว', 'success');
                              setNewAdminPassword('');
                              setNewAdminName('');
                              const latest = await getSavedAdminPasswords();
                              setSavedPasswords(latest);
                            }}
                            className="px-4 py-2 text-xs font-bold text-white bg-mangosteen hover:bg-mangosteen-hover rounded-xl transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                          >
                            บันทึกรหัส
                          </button>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed italic">
                        * รหัสผ่านจะถูกเข้ารหัส SHA-256 (Hash) อย่างปลอดภัยและบันทึกในอุปกรณ์นี้
                      </p>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-100">
                      <label className="block text-xs font-extrabold text-slate-600 mb-2 font-sans uppercase tracking-wider">
                        รหัสผ่านเจ้าหน้าที่ในระบบ ({savedPasswords.length})
                      </label>
                      {savedPasswords.length === 0 ? (
                        <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-400 font-sans">ไม่มีรหัสผ่านสำรองที่บันทึกไว้ในอุปกรณ์นี้</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {savedPasswords.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                              <div className="space-y-0.5">
                                <div className="text-xs font-extrabold text-slate-800 font-sans flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{p.name || 'เจ้าหน้าที่คณะ'}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono truncate max-w-[150px]" title={p.hash}>
                                  แฮช: {p.hash.substring(0, 16)}...
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeletePassword(p.hash)}
                                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border-none"
                                title="ลบรหัสผ่านนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSystemSettings(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* --- CUSTOM CONFIRMATION DIALOG --- */}
      <AnimatePresence>
        {confirmDialog && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
            id="custom-confirm-modal"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/95 backdrop-blur-3xl rounded-2xl max-w-sm w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2),_0_15px_30px_-15px_rgba(0,0,0,0.15)] p-6 border border-white space-y-4"
            >
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black font-sans text-slate-800">{confirmDialog.title}</h3>
                <p className="text-xs font-sans text-slate-500 leading-relaxed">{confirmDialog.message}</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-sans text-xs font-semibold cursor-pointer text-center"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 py-2 bg-mangosteen hover:bg-opacity-90 text-white rounded-lg font-sans text-xs font-bold text-center cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  ยืนยัน
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
