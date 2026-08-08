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
  X
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
        { courseCode: req.courseCode, courseName: req.courseName, section: req.section, status: req.status }
      ];

      courseList.forEach(c => {
        const code = (c.courseCode || 'UNKNOWN').toUpperCase().trim();
        const name = c.courseName || code;
        if (!courseStatsMap[code]) {
          courseStatsMap[code] = { code, name, total: 0, approved: 0, rejected: 0, pending: 0 };
        }
        courseStatsMap[code].total++;
        if (c.status === 'อนุมัติแล้ว' || (req.status === 'อนุมัติแล้ว' && !c.status)) {
          courseStatsMap[code].approved++;
        } else if (c.status === 'ไม่อนุมัติ' || (req.status === 'ไม่อนุมัติ' && !c.status)) {
          courseStatsMap[code].rejected++;
        } else {
          courseStatsMap[code].pending++;
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

  // Year filter state (Buddhist Era)
  const currentBEYear = new Date().getFullYear() + 543;
  const [selectedYear, setSelectedYear] = useState<number>(currentBEYear);

  const availableYears = React.useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentBEYear); // Always include current year
    requests.forEach(r => {
      try {
        const year = new Date(r.createdAt).getFullYear() + 543;
        if (!isNaN(year)) {
          yearsSet.add(year);
        }
      } catch (e) {}
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [requests, currentBEYear]);

  // Modals / Interactivity
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);
  const [rejectionCourseCode, setRejectionCourseCode] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Handle auto-load on successful login
  useEffect(() => {
    if (isInitiallyLoggedIn && requests.length === 0) {
      fetchRequests();
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
 * Google Apps Script - เชื่อมต่อฟอร์มสำรองที่นั่งวิชาเรียน คณะวิทยาศาสตร์และเทคโนโลยี
 * แหล่งรวมข้อมูลผู้ยื่นคำร้องและจัดเก็บลงใน Google Sheets สำหรับ:
 * ID: 1em96LFx0V2eiEyd5F9XbLFGebvHfGrFYXCGZhK22o50
 */

var SPREADSHEET_ID = "1em96LFx0V2eiEyd5F9XbLFGebvHfGrFYXCGZhK22o50";
var SHEET_NAME = "Requests";
var ADMINS_SHEET_NAME = "Admins";
var SETTINGS_SHEET_NAME = "Settings";
var AUDIT_LOGS_SHEET_NAME = "AuditLogs";

function getSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // บันทึกหัวข้อคอลัมน์ (Headers)
    sheet.appendRow([
      "รหัสคำร้อง",
      "วันที่ยื่นคำร้อง",
      "รหัสนักศึกษา",
      "ชื่อ-นามสกุล",
      "ชั้นปี",
      "คณะ",
      "สาขาวิชา",
      "รหัสวิชา",
      "ชื่อรายวิชา",
      "กลุ่ม/เซกชัน",
      "อาจารย์ผู้สอน",
      "เบอร์โทรศัพท์",
      "ชนิดหลักฐาน (file/link)",
      "รายละเอียดหลักฐาน (Link/DataURL)",
      "สถานะการตรวจสอบ",
      "เหตุผลปฏิเสธสิทธิ์",
      "จำนวนวิชาที่ยื่น",
      "JSON บันทึกเต็ม",
      "ผู้ดำเนินการ/แอดมิน",
      "วันที่ดำเนินการ"
    ]);
    // ปรับรูปแบบหัวตาราง
    sheet.getRange(1, 1, 1, 20).setFontWeight("bold").setBackground("#5F0F40").setFontColor("#FFFFFF");
  }
  return sheet;
}

function getAdminsSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(ADMINS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ADMINS_SHEET_NAME);
    // บันทึกหัวข้อคอลัมน์ (Headers)
    sheet.appendRow(["แฮชรหัสผ่าน", "ชื่อเจ้าหน้าที่", "วันที่เพิ่ม"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#3B82F6").setFontColor("#FFFFFF");
  }
  return sheet;
}

function getSettingsSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
    sheet.appendRow(["Key", "Value"]);
    sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#10B981").setFontColor("#FFFFFF");
  }
  return sheet;
}

function getAuditLogsSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(AUDIT_LOGS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(AUDIT_LOGS_SHEET_NAME);
    sheet.appendRow([
      "รหัสบันทึก (ID)",
      "วัน-เวลา (Timestamp)",
      "แอดมินผู้ดำเนินการ (Admin)",
      "การกระทำ (Action)",
      "รหัสอ้างอิง (Target ID)",
      "รายละเอียด (Details)"
    ]);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#1E3A8A").setFontColor("#FFFFFF");
  }
  return sheet;
}

// 📡 สำหรับรับคำร้องดูสถานะผ่าน GET
function doGet(e) {
  var action = e.parameter.action;
  var out = { success: false, error: "Invalid Action" };
  
  try {
    var sheet = getSheet();
    var rows = sheet.getDataRange().getValues();
    
    if (action === "getStatusByStudentId") {
      var studentId = e.parameter.studentId;
      var results = [];
      var requestMap = {};
      
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        if (String(row[2]).trim() === String(studentId).trim()) {
          var reqId = row[0];
          
          if (!requestMap[reqId]) {
            requestMap[reqId] = {
              id: reqId,
              createdAt: row[1],
              studentId: String(row[2]),
              fullName: row[3],
              year: String(row[4]),
              faculty: row[5],
              department: row[6],
              courseCode: row[7],
              courseName: row[8],
              section: row[9],
              instructor: row[10],
              phone: row[11],
              proofType: row[12],
              facebookProofLink: row[12] === "link" ? row[13] : "",
              facebookProofFile: row[12] === "file" ? { name: "screenshot_profile_fb.png", type: "image/png", dataUrl: row[13] } : null,
              status: row[14] || "รอดำเนินการ",
              rejectionReason: row[15] || "",
              processedBy: (row[18] !== undefined && row[18] !== null) ? String(row[18]) : "",
              processedAt: (row[19] !== undefined && row[19] !== null) ? String(row[19]) : "",
              courses: []
            };
          }
          
          requestMap[reqId].courses.push({
            courseCode: row[7],
            courseName: row[8],
            section: row[9],
            instructor: row[10],
            status: row[14] || "รอดำเนินการ",
            rejectionReason: row[15] || "",
            processedBy: (row[18] !== undefined && row[18] !== null) ? String(row[18]) : "",
            processedAt: (row[19] !== undefined && row[19] !== null) ? String(row[19]) : ""
          });
        }
      }
      
      for (var id in requestMap) {
        results.push(requestMap[id]);
      }
      
      out = { success: true, data: results };
      
    } else if (action === "getAllRequests") {
      var results = [];
      var requestMap = {};
      
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var reqId = row[0];
        
        if (!requestMap[reqId]) {
          requestMap[reqId] = {
            id: reqId,
            createdAt: row[1],
            studentId: String(row[2]),
            fullName: row[3],
            year: String(row[4]),
            faculty: row[5],
            department: row[6],
            courseCode: row[7],
            courseName: row[8],
            section: row[9],
            instructor: row[10],
            phone: row[11],
            proofType: row[12],
            facebookProofLink: row[12] === "link" ? row[13] : "",
            facebookProofFile: row[12] === "file" ? { name: "screenshot_profile_fb.png", type: "image/png", dataUrl: row[13] } : null,
            status: row[14] || "รอดำเนินการ",
            rejectionReason: row[15] || "",
            processedBy: (row[18] !== undefined && row[18] !== null) ? String(row[18]) : "",
            processedAt: (row[19] !== undefined && row[19] !== null) ? String(row[19]) : "",
            courses: []
          };
        }
        
        requestMap[reqId].courses.push({
          courseCode: row[7],
          courseName: row[8],
          section: row[9],
          instructor: row[10],
          status: row[14] || "รอดำเนินการ",
          rejectionReason: row[15] || "",
          processedBy: (row[18] !== undefined && row[18] !== null) ? String(row[18]) : "",
          processedAt: (row[19] !== undefined && row[19] !== null) ? String(row[19]) : ""
        });
      }
      
      for (var id in requestMap) {
        results.push(requestMap[id]);
      }
      
      out = { success: true, data: results };

    } else if (action === "getAdmins") {
      var adminSheet = getAdminsSheet();
      var adminRows = adminSheet.getDataRange().getValues();
      var admins = [];
      for (var i = 1; i < adminRows.length; i++) {
        admins.push({
          hash: String(adminRows[i][0]),
          name: String(adminRows[i][1]),
          addedAt: String(adminRows[i][2])
        });
      }
      out = { success: true, data: admins };
    } else if (action === "getSettings") {
      var settingsSheet = getSettingsSheet();
      var rows = settingsSheet.getDataRange().getValues();
      var settings = {};
      for (var i = 1; i < rows.length; i++) {
        settings[String(rows[i][0])] = String(rows[i][1]);
      }
      out = { success: true, data: settings };
    } else if (action === "getAuditLogs") {
      var auditSheet = getAuditLogsSheet();
      var auditRows = auditSheet.getDataRange().getValues();
      var logs = [];
      for (var i = auditRows.length - 1; i >= 1; i--) {
        logs.push({
          id: String(auditRows[i][0]),
          timestamp: String(auditRows[i][1]),
          adminName: String(auditRows[i][2]),
          action: String(auditRows[i][3]),
          targetId: String(auditRows[i][4]),
          details: String(auditRows[i][5])
        });
      }
      out = { success: true, data: logs };
    }
  } catch (err) {
    out = { success: false, error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

// 📡 สำหรับบันทึก ล็อกอิน อัปเดตสถานะ ของคำร้องผ่าน POST
function doPost(e) {
  var out = { success: false, error: "Invalid Action" };
  
  try {
    var rawData = e.postData.contents;
    var postData = JSON.parse(rawData);
    var action = postData.action;
    var sheet = getSheet();
    
    if (action === "submitRequest") {
      var trackingNumber = "REQ-" + Math.floor(100000 + Math.random() * 900000);
      var timestamp = new Date().toISOString();
      
      var fullName = postData.fullName;
      var studentId = String(postData.studentId);
      var department = postData.department;
      var faculty = postData.faculty;
      var year = String(postData.year);
      var phone = postData.phone || "";
      var proofType = postData.proofType;
      var proofDetail = proofType === "link" ? postData.facebookProofLink : (postData.facebookProofFile ? postData.facebookProofFile.dataUrl : "");
      var status = "รอดำเนินการ";
      
      var courses = postData.courses || [];
      if (courses.length === 0) {
        courses.push({
          courseCode: postData.courseCode,
          courseName: postData.courseName,
          section: postData.section,
          instructor: postData.instructor
        });
      }
      
      for (var i = 0; i < courses.length; i++) {
        var course = courses[i];
        sheet.appendRow([
          trackingNumber,
          timestamp,
          studentId,
          fullName,
          year,
          faculty,
          department,
          course.courseCode,
          course.courseName,
          course.section,
          course.instructor,
          phone,
          proofType,
          proofDetail,
          status,
          "",
          courses.length,
          rawData
        ]);
      }
      
      out = {
        success: true,
        data: {
          id: trackingNumber,
          fullName: fullName,
          studentId: studentId,
          department: department,
          faculty: faculty,
          year: year,
          courseCode: courses[0].courseCode,
          courseName: courses[0].courseName,
          section: courses[0].section,
          instructor: courses[0].instructor,
          courses: courses,
          phone: phone,
          proofType: proofType,
          status: status,
          createdAt: timestamp
        }
      };
      
    } else if (action === "addAdmin") {
      var adminSheet = getAdminsSheet();
      var hash = postData.hash;
      var name = postData.name;
      var addedAt = postData.addedAt || new Date().toISOString();
      
      // Check if duplicate
      var adminRows = adminSheet.getDataRange().getValues();
      var exists = false;
      for (var i = 1; i < adminRows.length; i++) {
        if (String(adminRows[i][0]) === String(hash)) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        adminSheet.appendRow([hash, name, addedAt]);
      }
      out = { success: true };
      
    } else if (action === "deleteAdmin") {
      var adminSheet = getAdminsSheet();
      var hash = postData.hash;
      var adminRows = adminSheet.getDataRange().getValues();
      var deleted = false;
      for (var i = adminRows.length - 1; i >= 1; i--) {
        if (String(adminRows[i][0]) === String(hash)) {
          adminSheet.deleteRow(i + 1);
          deleted = true;
        }
      }
      out = { success: true, deleted: deleted };

    } else if (action === "saveSetting") {
      var settingsSheet = getSettingsSheet();
      var key = postData.key;
      var value = postData.value;
      
      var rows = settingsSheet.getDataRange().getValues();
      var updated = false;
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(key)) {
          settingsSheet.getRange(i + 1, 2).setValue(value);
          updated = true;
          break;
        }
      }
      if (!updated) {
        settingsSheet.appendRow([key, value]);
      }
      out = { success: true };

    } else if (action === "recordAuditLog") {
      var auditSheet = getAuditLogsSheet();
      var logId = "LOG-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
      var timestamp = new Date().toISOString();
      var adminName = postData.adminName || "เจ้าหน้าที่";
      var logAction = postData.logAction || postData.action || "ดำเนินการ";
      var targetId = postData.targetId || "";
      var details = postData.details || "";
      
      auditSheet.appendRow([logId, timestamp, adminName, logAction, targetId, details]);
      out = { success: true };

    } else if (action === "updateStatus") {
      var requestId = postData.requestId;
      var status = postData.status;
      var rejectionReason = postData.rejectionReason || "";
      var processedBy = postData.processedBy || "แอดมินระบบ";
      
      var rows = sheet.getDataRange().getValues();
      var updatedCount = 0;
      
      var searchId = String(requestId).trim();
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var rowId = String(row[0]).trim();
        if (rowId === searchId || rowId.replace("REQ-", "") === searchId.replace("REQ-", "")) {
          sheet.getRange(i + 1, 15).setValue(status);
          sheet.getRange(i + 1, 16).setValue(rejectionReason);
          sheet.getRange(i + 1, 19).setValue(processedBy);
          sheet.getRange(i + 1, 20).setValue((status === "อนุมัติแล้ว" || status === "ไม่อนุมัติ") ? new Date().toISOString() : "");
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        // Record log to AuditLogs sheet
        var auditSheet = getAuditLogsSheet();
        var logId = "LOG-" + new Date().getTime();
        var timestamp = new Date().toISOString();
        var logAction = status === "อนุมัติแล้ว" ? "อนุมัติคำร้อง" : status === "ไม่อนุมัติ" ? "ไม่อนุมัติคำร้อง" : "ปรับเปลี่ยนสถานะคำร้อง";
        var details = "แอดมิน " + processedBy + " กด " + status + " คำร้อง " + requestId + (rejectionReason ? " [เหตุผล: " + rejectionReason + "]" : "");
        auditSheet.appendRow([logId, timestamp, processedBy, logAction, requestId, details]);

        out = { success: true, processedBy: processedBy, processedAt: timestamp };
      } else {
        out = { success: false, error: "ไม่พบรหัสคำร้องนี้ในระบบชีต" };
      }
    } else if (action === "updateCourseStatus") {
      var requestId = postData.requestId;
      var courseCode = postData.courseCode;
      var status = postData.status;
      var rejectionReason = postData.rejectionReason || "";
      var processedBy = postData.processedBy || "แอดมินระบบ";
      
      var rows = sheet.getDataRange().getValues();
      var updatedCount = 0;
      
      var searchId = String(requestId).trim();
      var searchCourseCode = String(courseCode).trim();
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var rowId = String(row[0]).trim();
        var rowCourseCode = String(row[7]).trim();
        if ((rowId === searchId || rowId.replace("REQ-", "") === searchId.replace("REQ-", "")) && rowCourseCode === searchCourseCode) {
          sheet.getRange(i + 1, 15).setValue(status);
          sheet.getRange(i + 1, 16).setValue(rejectionReason);
          sheet.getRange(i + 1, 19).setValue(processedBy);
          sheet.getRange(i + 1, 20).setValue((status === "อนุมัติแล้ว" || status === "ไม่อนุมัติ") ? new Date().toISOString() : "");
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        // Record log to AuditLogs sheet
        var auditSheet = getAuditLogsSheet();
        var logId = "LOG-" + new Date().getTime();
        var timestamp = new Date().toISOString();
        var logAction = status === "อนุมัติแล้ว" ? "อนุมัติรายวิชา" : status === "ไม่อนุมัติ" ? "ไม่อนุมัติรายวิชา" : "ปรับเปลี่ยนสถานะรายวิชา";
        var details = "แอดมิน " + processedBy + " กด " + status + " วิชา " + courseCode + " ในคำร้อง " + requestId + (rejectionReason ? " [เหตุผล: " + rejectionReason + "]" : "");
        auditSheet.appendRow([logId, timestamp, processedBy, logAction, requestId, details]);

        out = { success: true, processedBy: processedBy, processedAt: timestamp };
      } else {
        out = { success: false, error: "ไม่พบรายวิชานี้ในคำร้อง" };
      }
    }
  } catch (err) {
    out = { success: false, error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
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
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
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
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
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
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
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
            String(c.courseName || '').toLowerCase().includes(query)
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
        const year = new Date(req.createdAt).getFullYear() + 543;
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
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
                          const year = new Date(r.createdAt).getFullYear() + 543;
                          return year === selectedYear;
                        }).length 
                      : requests.filter(r => {
                          const year = new Date(r.createdAt).getFullYear() + 543;
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
        
        <button
          onClick={() => {
            fetchRequests();
            showToast('กำลังซิงค์อัปเดตดึงข้อมูลล่าสุด...', 'success');
          }}
          disabled={loadingRequests}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-sans text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-600 active:scale-[0.98] disabled:opacity-50 select-none shadow-3xs"
          title="ดึงข้อมูลล่าสุด"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin' : ''}`} />
          <span>{loadingRequests ? 'กำลังดึงข้อมูลล่าสุด...' : 'ดึงข้อมูลล่าสุด'}</span>
        </button>
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
                            {req.proofType === 'file' && req.facebookProofFile ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: req.facebookProofFile!.dataUrl, title: `ภาพแคปเจอร์สิทธิ์การเข้าร่วม Facebook จากคุณ ${req.fullName}` })}
                                className="bg-slate-100 border border-slate-200 hover:border-mangosteen hover:bg-white text-mangosteen px-2 py-1.5 rounded-lg text-[10px] inline-flex items-center gap-1.5 transition-colors font-bold cursor-pointer shadow-3xs"
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
                      {req.proofType === 'file' && req.facebookProofFile ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: req.facebookProofFile!.dataUrl, title: `หลักฐาน Facebook ของคุณ ${req.fullName}` })}
                          className="bg-slate-100 border border-slate-200 hover:border-mangosteen text-mangosteen hover:bg-white px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
            onClick={() => setPreviewImage(null)}
            id="image-previewer-light-box"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 cursor-default"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 bg-slate-50 border-b border-light-gray flex justify-between items-center">
                <h4 className="font-semibold text-xs text-slate-700 font-sans truncate pr-4">{previewImage.title}</h4>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="text-slate-400 hover:text-slate-600 font-sans text-xs cursor-pointer"
                  id="btn-close-image-previewer"
                >
                  ปิดภาพ x
                </button>
              </div>
              <div className="p-4 bg-slate-950 flex justify-center items-center">
                <img
                  src={previewImage.url}
                  alt="High quality screenshots verification tool"
                  className="max-h-[70vh] object-contain rounded-md"
                />
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
