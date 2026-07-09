/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  HelpCircle, 
  Sparkles, 
  Lock, 
  FileText, 
  Search, 
  CheckCircle, 
  ArrowRight,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight,
  Database,
  Moon,
  Sun,
  Bell,
  BellRing,
  Check,
  Trash2,
  User,
  X
} from 'lucide-react';

import FormSection from './components/FormSection';
import StatusCheckSection from './components/StatusCheckSection';
import AdminSection from './components/AdminSection';
import ToastContainer, { ToastMessage, ToastType } from './components/Toast';
import { isApiConfigured, isGoogleSheetUrlInstead, getAllRequests, submitRequest } from './services/api';
import { ReservationRequest } from './types';
import { useTranslation } from './contexts/LanguageContext';

export default function App() {
  const { language, setLanguage, t, isTh } = useTranslation();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    try {
      return !!localStorage.getItem('logged_in_admin_name');
    } catch (e) {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<'reserve' | 'status' | 'admin'>(() => {
    try {
      const savedTab = localStorage.getItem('active_tab') as 'reserve' | 'status' | 'admin';
      if (savedTab === 'admin' && !localStorage.getItem('logged_in_admin_name')) {
        return 'reserve';
      }
      return savedTab || 'reserve';
    } catch (e) {
      return 'reserve';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('active_tab', activeTab);
    } catch (e) {
      // ignore
    }
  }, [activeTab]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Transition states for post-submission success view
  const [latestSubmission, setLatestSubmission] = useState<{ studentId: string; request: ReservationRequest } | null>(null);
  
  // Back-and-forth query sharing state
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const [customLogo, setCustomLogo] = useState<string>(() => {
    return localStorage.getItem('custom_logo') || '';
  });

  const [customFavicon, setCustomFavicon] = useState<string>(() => {
    return localStorage.getItem('custom_favicon') || '';
  });

  useEffect(() => {
    // ลบ link rel="icon" ที่มีอยู่ทั้งหมดเพื่อบังคับให้เบราว์เซอร์รับรู้ความเปลี่ยนแปลงและโหลดภาพใหม่ทันที
    const existingFavicons = document.querySelectorAll("link[rel*='icon']");
    existingFavicons.forEach(el => el.parentNode?.removeChild(el));

    const newLink = document.createElement('link');
    newLink.id = 'web-favicon';
    newLink.rel = 'icon';

    const activeFavicon = customFavicon || customLogo;
    
    if (activeFavicon) {
      newLink.href = activeFavicon;
      if (activeFavicon.startsWith('data:image/svg+xml') || activeFavicon.endsWith('.svg')) {
        newLink.setAttribute('type', 'image/svg+xml');
      } else if (activeFavicon.startsWith('data:image/x-icon') || activeFavicon.endsWith('.ico')) {
        newLink.setAttribute('type', 'image/x-icon');
      } else if (activeFavicon.startsWith('data:image/png') || activeFavicon.endsWith('.png')) {
        newLink.setAttribute('type', 'image/png');
      } else {
        newLink.setAttribute('type', 'image/png');
      }
    } else {
      const defaultFavicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%236b1d4f'/%3E%3Cstop offset='100%25' stop-color='%23450e30'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' rx='24' fill='url(%23grad)'/%3E%3Cpath d='M25,40 L50,28 L75,40 L50,52 Z' fill='%2310b981' opacity='0.9'/%3E%3Cpath d='M35,45 L35,58 C35,64 65,64 65,58 L65,45' fill='none' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='round'/%3E%3Cpath d='M70,41 L70,62 L73,62 L73,41 Z' fill='%23ffffff'/%3E%3Ccircle cx='71.5' cy='63' r='2' fill='%23ffffff'/%3E%3Ctext x='50' y='82' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='system-ui, -apple-system, sans-serif' font-weight='900' font-size='18' letter-spacing='0.5'%3EFST FTU%3C/text%3E%3C/svg%3E";
      newLink.href = defaultFavicon;
      newLink.setAttribute('type', 'image/svg+xml');
    }

    document.head.appendChild(newLink);
  }, [customFavicon, customLogo]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  // Toast utility helper
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + '-' + Math.random().toString().substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 4.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Switcher to Status Check with student ID automatically loaded & searched
  const handleViewStatusAfterSubmit = (studentId: string) => {
    setSelectedStudentId(studentId);
    setLatestSubmission(null); // Clear success screen
    setActiveTab('status');
  };

  const handleFormSubmitSuccess = (studentId: string, request: ReservationRequest) => {
    setLatestSubmission({ studentId, request });
  };

  // --- REAL-TIME NOTIFICATION SYSTEM ---
  const [allRequestsState, setAllRequestsState] = useState<ReservationRequest[]>([]);
  
  // Store recent status overrides to prevent background polls from overriding fresh local changes
  const recentStatusOverridesRef = useRef<Record<string, { 
    status: any; 
    timestamp: number;
    courses: Record<string, { status: any; timestamp: number }>
  }>>({});

  const allRequests = allRequestsState;
  
  const setAllRequests = useCallback((update: ReservationRequest[] | ((prev: ReservationRequest[]) => ReservationRequest[])) => {
    setAllRequestsState(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      
      const now = Date.now();
      next.forEach(nextReq => {
        const prevReq = prev.find(p => p.id === nextReq.id);
        if (prevReq) {
          let hasDiff = false;
          const courseOverrides: Record<string, { status: any; timestamp: number }> = {};
          
          if (prevReq.status !== nextReq.status) {
            hasDiff = true;
          }
          
          if (nextReq.courses && prevReq.courses) {
            nextReq.courses.forEach(nc => {
              const pc = prevReq.courses.find(c => c.courseCode === nc.courseCode);
              if (pc && pc.status !== nc.status) {
                hasDiff = true;
                courseOverrides[nc.courseCode] = { status: nc.status, timestamp: now };
              }
            });
          }
          
          if (hasDiff) {
            const existing = recentStatusOverridesRef.current[nextReq.id] || { 
              status: nextReq.status, 
              timestamp: now, 
              courses: {} 
            };
            
            recentStatusOverridesRef.current[nextReq.id] = {
              status: prevReq.status !== nextReq.status ? nextReq.status : existing.status,
              timestamp: prevReq.status !== nextReq.status ? now : existing.timestamp,
              courses: {
                ...existing.courses,
                ...courseOverrides
              }
            };
          }
        }
      });
      
      return next;
    });
  }, []);
  const [bellDropdownOpen, setBellDropdownOpen] = useState(false);
  const [bottomNotifications, setBottomNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    count: number;
    items?: Array<{ name: string; courses: Array<{ courseCode: string; courseName: string; section: string }> }>;
    requestId?: string | null;
  }>>([]);
  
  // Target Request ID to search/highlight in Admin Dashboard
  const [targetRequestId, setTargetRequestId] = useState<string | null>(null);

  // Set of cleared notification IDs (manually dismissed by the user)
  const [clearedNotificationIds, setClearedNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cleared_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const saveClearedNotificationIds = (ids: string[]) => {
    setClearedNotificationIds(ids);
    try {
      localStorage.setItem('cleared_notification_ids', JSON.stringify(ids));
    } catch (e) {
      console.error(e);
    }
  };
  
  // Ref to track known request IDs and first-fetch baseline
  const knownRequestIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  // --- BROWSER NATIVE NOTIFICATIONS ---
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestBrowserNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast(
        isTh 
          ? 'เบราว์เซอร์นี้ไม่สนับสนุนระบบรับการแจ้งเตือนพุชบนหน้าจอ' 
          : 'Your browser does not support browser notifications.', 
        'warning'
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        showToast(
          isTh 
            ? 'อนุมัติการแจ้งเตือนบนเบราว์เซอร์สำเร็จ!' 
            : 'Browser notifications successfully enabled!', 
          'success'
        );
        // Play a test native notification
        try {
          new Notification(
            isTh ? 'ระบบแจ้งเตือนเจ้าหน้าที่เปิดใช้งานแล้ว' : 'Notifications Enabled',
            { 
              body: isTh 
                ? 'คุณจะได้รับข้อความแจ้งเตือนทันทีเมื่อมีผู้ส่งคำร้องใหม่ยื่นเข้ามา' 
                : 'You will receive notifications for new seat reservation requests.' 
            }
          );
        } catch (e) {
          console.error('Failed to trigger test notification:', e);
        }
      } else if (permission === 'denied') {
        showToast(
          isTh 
            ? 'คุณได้ปฏิเสธสิทธิ์แจ้งเตือน กรุณาเปลี่ยนการตั้งค่าของเบราว์เซอร์เพื่อรับการแจ้งเตือน' 
            : 'Notifications denied. Please adjust your browser settings to allow.', 
          'warning'
        );
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  // Helper to trigger a real native browser notification
  const triggerNativeNotification = (title: string, options?: NotificationOptions) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.ico', // Simple fallback favicon
          ...options
        });
      } catch (err) {
        console.error('Failed to trigger native notification:', err);
      }
    }
  };

  // Poll for requests from the database (either LocalStorage or live GAS Sheet)
  const pollRequests = async () => {
    try {
      const response = await getAllRequests();
      if (response.success && response.data) {
        let fetchedRequests = response.data;

        // Merge with fresh local status overrides (less than 15 seconds old)
        const now = Date.now();
        const freshThreshold = 15000; // 15 seconds
        
        // Clean up expired overrides first
        Object.keys(recentStatusOverridesRef.current).forEach(reqId => {
          const override = recentStatusOverridesRef.current[reqId];
          const isRequestOverrideFresh = (now - override.timestamp) < freshThreshold;
          
          const freshCourses: Record<string, { status: any; timestamp: number }> = {};
          let hasFreshCourses = false;
          Object.keys(override.courses).forEach(cc => {
            if ((now - override.courses[cc].timestamp) < freshThreshold) {
              freshCourses[cc] = override.courses[cc];
              hasFreshCourses = true;
            }
          });
          
          if (!isRequestOverrideFresh && !hasFreshCourses) {
            delete recentStatusOverridesRef.current[reqId];
          } else {
            recentStatusOverridesRef.current[reqId].courses = freshCourses;
          }
        });
        
        // Apply fresh overrides to the fetched requests
        fetchedRequests = fetchedRequests.map(req => {
          const override = recentStatusOverridesRef.current[req.id];
          if (!override) return req;
          
          let updatedReq = { ...req };
          const isRequestOverrideFresh = (now - override.timestamp) < freshThreshold;
          
          if (isRequestOverrideFresh) {
            updatedReq.status = override.status;
          }
          
          if (updatedReq.courses) {
            updatedReq.courses = updatedReq.courses.map(c => {
              const courseOverride = override.courses[c.courseCode];
              if (courseOverride && (now - courseOverride.timestamp) < freshThreshold) {
                return { ...c, status: courseOverride.status };
              }
              return c;
            });
          }
          
          return updatedReq;
        });

        setAllRequestsState(fetchedRequests);

        if (!isAdminLoggedIn) {
          // If not logged in as admin, keep the baseline fully synchronized so we don't spam on login
          const ids = new Set(fetchedRequests.map(r => r.id));
          knownRequestIdsRef.current = ids;
          isFirstFetchRef.current = true;
          return;
        }

        if (isFirstFetchRef.current) {
          // Establish the initial baseline of known requests
          const ids = new Set(fetchedRequests.map(r => r.id));
          knownRequestIdsRef.current = ids;
          isFirstFetchRef.current = false;
        } else {
          // Identify newly submitted requests
          const newReqs = fetchedRequests.filter(r => !knownRequestIdsRef.current.has(r.id));
          
          if (newReqs.length > 0) {
            // Update the baseline of known request IDs
            newReqs.forEach(r => knownRequestIdsRef.current.add(r.id));

            // Create notification pop-up
            const count = newReqs.length;
            const notificationId = Date.now().toString() + '-' + Math.random().toString().substring(2, 6);
            let title = '';
            let message = '';
            let items: Array<{ name: string; courses: Array<{ courseCode: string; courseName: string; section: string }> }>;

            if (count === 1) {
              const req = newReqs[0];
              const coursesList = req.courses && req.courses.length > 0 
                ? req.courses 
                : [{ courseCode: req.courseCode || '', courseName: req.courseName || '', section: req.section || '' }];
              title = language === 'th' ? 'มีคำร้องใหม่เข้ามาในระบบ!' : 'New Request Received!';
              message = language === 'th'
                ? `คุณ ${req.fullName} ได้ยื่นคำร้องขอสำรองวิชา (${coursesList.length} วิชา)`
                : `${req.fullName} submitted a course reservation for ${coursesList.length} course(s)`;
              items = [{ name: req.fullName, courses: coursesList }];

              // Trigger Native Browser Notification
              const nativeBody = coursesList.map(c => `• [${c.courseCode}] ${c.courseName} (กลุ่ม ${c.section})`).join('\n');
              triggerNativeNotification(
                isTh 
                  ? `คำร้องใหม่จากคุณ ${req.fullName} (${coursesList.length} วิชา)`
                  : `New Request: ${req.fullName} (${coursesList.length} course(s))`,
                {
                  body: nativeBody,
                  tag: req.id,
                  requireInteraction: true
                }
              );
            } else {
              title = language === 'th' 
                ? `มีคำร้องใหม่เข้ามาจำนวน ${count} รายการ!`
                : `${count} New Requests Received!`;
              message = language === 'th'
                ? `พบข้อมูลคำร้องขอสำรองที่นั่งวิชาเรียนใหม่ถูกยื่นเข้ามาพร้อมกันในระบบ`
                : `Multiple student seat reservation requests submitted simultaneously.`;
              items = newReqs.map(req => {
                const coursesList = req.courses && req.courses.length > 0 
                  ? req.courses 
                  : [{ courseCode: req.courseCode || '', courseName: req.courseName || '', section: req.section || '' }];
                return { name: req.fullName, courses: coursesList };
              });

              // Trigger Native Browser Notification for multiple requests
              const nativeBody = newReqs.map(req => {
                const coursesList = req.courses && req.courses.length > 0 
                  ? req.courses 
                  : [{ courseCode: req.courseCode || 'N/A', courseName: '', section: '' }];
                const coursesSummary = coursesList.map(c => c.courseCode).join(', ');
                return `• ${req.fullName} (${coursesList.length} วิชา: ${coursesSummary})`;
              }).join('\n');
              
              triggerNativeNotification(
                isTh 
                  ? `พบคำร้องใหม่เข้ามาพร้อมกัน ${count} รายการ!`
                  : `${count} new requests submitted simultaneously!`,
                {
                  body: nativeBody,
                  requireInteraction: true
                }
              );
            }

            // Trigger the bottom-right floating popup notification
            setBottomNotifications(prev => [
              ...prev,
              {
                id: notificationId,
                title,
                message,
                count,
                items,
                requestId: count === 1 ? newReqs[0].id : null
              }
            ]);

            // Auto-dismiss bottom notification after 8 seconds
            setTimeout(() => {
              setBottomNotifications(prev => prev.filter(n => n.id !== notificationId));
            }, 8000);
          }
        }
      }
    } catch (err) {
      console.error('Error polling requests:', err);
    }
  };

  // Keep polling function ref fresh to avoid stale closures
  const pollRequestsRef = useRef(pollRequests);
  useEffect(() => {
    pollRequestsRef.current = pollRequests;
  });

  // Run the polling interval once on mount
  useEffect(() => {
    pollRequestsRef.current();

    const interval = setInterval(() => {
      pollRequestsRef.current();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Monitor admin logged-in state changes to properly align the notification baseline
  useEffect(() => {
    if (isAdminLoggedIn) {
      // Refresh baseline immediately when admin logs in so we only show notifications for new requests
      isFirstFetchRef.current = true;
      pollRequestsRef.current();
    } else {
      // Clear previous notifications on logout
      setBottomNotifications([]);
    }
  }, [isAdminLoggedIn]);

  // Helper to simulate request submission for testing purposes
  const simulateNewRequest = async (count: number) => {
    const firstNames = ['อดิศร', 'วิลาวัลย์', 'ซูไฮมิน', 'อันวาร์', 'ซูไบดะห์', 'อัสมาร์', 'รุสลัน', 'นูรฮูดา', 'มารียะห์', 'ซอฟวาน'];
    const lastNames = ['แวหะมะ', 'สาและ', 'หะยีสาและ', 'มะมิง', 'สะแลแม', 'ยูโซะ', 'รักษ์ดี', 'แก้วมณี', 'เจ๊ะมา', 'มะยา'];
    const courses = [
      { code: 'IT201', name: 'Object-Oriented Programming' },
      { code: 'CS302', name: 'Software Engineering' },
      { code: 'DS101', name: 'Data Science Foundations' },
      { code: 'DT305', name: 'Web Application Development' },
      { code: 'CH102', name: 'Organic Chemistry' }
    ];
    const instructors = ['ดร.อานัส ยูโซะ', 'ผศ.ฟาฏิมะห์ มะมิง', 'ดร.มูฮัมหมัด หะยี', 'อาจารย์ฮาซัน สะแลแม'];

    for (let i = 0; i < count; i++) {
      const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const isFemale = Math.random() > 0.5;
      const prefix = isFemale ? 'นางสาว' : 'นาย';
      const fullName = `${prefix}${randomFirstName} ${randomLastName}`;
      const studentId = `6${Math.floor(Math.random() * 8 + 2)}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      const course = courses[Math.floor(Math.random() * courses.length)];
      const instructor = instructors[Math.floor(Math.random() * instructors.length)];

      const mockData: Partial<ReservationRequest> = {
        fullName,
        studentId,
        department: 'เทคโนโลยีสารสนเทศ (Information Technology)',
        faculty: 'คณะวิทยาศาสตร์และเทคโนโลยี',
        year: (Math.floor(Math.random() * 4) + 1).toString(),
        courses: [
          {
            courseCode: course.code,
            courseName: course.name,
            section: `0${Math.floor(Math.random() * 3 + 1)}`,
            instructor,
            status: 'รอดำเนินการ'
          }
        ],
        proofType: 'link',
        facebookProofLink: 'https://facebook.com/mock.profile.' + Math.floor(Math.random() * 1000),
        phone: '08' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
        consent: true,
        status: 'รอดำเนินการ'
      };

      await submitRequest(mockData);
    }
    
    // Refresh the list immediately to trigger notifications instantly
    pollRequests();
    showToast(
      language === 'th' 
        ? `จำลองคำร้องสำเร็จจำนวน ${count} รายการ กำลังอัปเดตระบบ...` 
        : `Simulated ${count} requests. Updating system...`,
      'success'
    );
  };

  // Filter pending requests for the badge counter (excluding cleared ones)
  const pendingRequestsList = allRequests.filter(r => r.status === 'รอดำเนินการ' && !clearedNotificationIds.includes(r.id));
  const pendingCount = pendingRequestsList.length;

  const hasGASUrl = isApiConfigured();
  const hasSheetUrlConflict = isGoogleSheetUrlInstead();

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col justify-between font-sans antialiased">
      {/* Dynamic Demo Warning Banner */}
      {hasSheetUrlConflict ? (
        <div className="bg-rose-600 text-white font-sans text-xs px-4 py-2 text-center flex items-center justify-center gap-2 font-medium shadow-md transition-all duration-300 z-40 animate-bounce">
          <Database className="w-4 h-4 text-white shrink-0 animate-pulse" />
          <span>⚠️ ตรวจพบว่าคุณวาง "ลิงก์ Google Sheets" แทน "ลิงก์ Web App (Google Apps Script)"! ระบบจึงไม่สามารถเชื่อมต่อกันได้อัตโนมัติ กรุณาเข้าสู่ระบบฝ่ายเจ้าหน้าที่เพื่อแก้ไขให้ถูกต้อง!</span>
        </div>
      ) : !hasGASUrl && (
        <div className="bg-amber-500 text-white font-sans text-xs px-4 py-2 text-center flex items-center justify-center gap-2 font-medium shadow-sm transition-all duration-300 z-40">
          <Database className="w-4 h-4 text-white shrink-0 animate-pulse" />
          <span>{t('demoModeWarn')}</span>
          <span className="hidden md:inline-block opacity-75">| {t('demoModeReal')}</span>
        </div>
      )}

      {/* Primary Header */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo & title click resets or targets reserve page */}
          <div 
            onClick={() => {
              setLatestSubmission(null);
              setActiveTab('reserve');
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
            id="brand-header-logo"
          >
            <div className="w-10 h-10 shrink-0 transition-all duration-300 group-hover:rotate-6 group-hover:scale-105 flex items-center justify-center">
              {customLogo ? (
                <img 
                  src={customLogo} 
                  alt="FST FTU" 
                  className="w-full h-full object-cover rounded-xl shadow-xs" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-sm">
                  <defs>
                    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6b1d4f" />
                      <stop offset="100%" stopColor="#450e30" />
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" rx="28" fill="url(#headerGrad)" />
                  <path d="M25,42 L50,30 L75,42 L50,54 Z" fill="#10b981" opacity="0.95" />
                  <path d="M35,47 L35,60 C35,66 65,66 65,60 L65,47" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                  <path d="M70,43 L70,64 L73,64 L73,43 Z" fill="#ffffff" />
                  <circle cx="71.5" cy="65" r="2.5" fill="#ffffff" />
                  <text x="50" y="83" dominantBaseline="middle" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif" fontWeight="900" fontSize="16" letterSpacing="0.5">FST FTU</text>
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-black font-sans tracking-tight text-slate-800 flex items-center gap-1.5 leading-tight">
                {t('systemTitle')}
                <span className="text-[10px] font-bold text-mangosteen bg-mangosteen/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  FST
                </span>
              </h1>
              <p className="text-[10px] font-semibold text-slate-500 font-sans tracking-wide uppercase">
                {t('fstSubtitle')}
              </p>
            </div>
          </div>

          {/* Navigation Control Group */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-stretch sm:self-auto justify-between sm:justify-end">
            {/* Regular Student Toggle Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/50" id="student-navigation-tabs">
              <button
                onClick={() => {
                  setLatestSubmission(null);
                  setActiveTab('reserve');
                }}
                className={`py-2 px-3 sm:py-2 sm:px-4 text-xs font-semibold font-sans rounded-xl transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'reserve'
                    ? 'bg-white text-mangosteen shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
                id="tab-btn-reserve"
              >
                <FileText className="w-4 h-4" />
                {t('tabReserve')}
              </button>
              <button
                onClick={() => {
                  setLatestSubmission(null);
                  setActiveTab('status');
                }}
                className={`py-2 px-3 sm:py-2 sm:px-4 text-xs font-semibold font-sans rounded-xl transition-all duration-300 flex items-center gap-2 cursor-pointer relative group ${
                  activeTab === 'status'
                    ? 'bg-white text-mangosteen shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
                id="tab-btn-status"
              >
                <Search className="w-4 h-4" />
                <span>{t('tabStatus')}</span>
              </button>
            </div>

            {/* Academic-Standard Lang Toggle Switching Button Group */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/50 text-slate-500 text-xs font-bold" id="language-switcher-group">
              <button
                onClick={() => setLanguage('th')}
                className={`px-2.5 py-1.5 rounded-xl transition-all duration-300 text-[11px] font-sans tracking-wider cursor-pointer ${
                  language === 'th' 
                    ? 'bg-white text-mangosteen shadow-sm border border-slate-200/50 font-black' 
                    : 'hover:text-slate-700 hover:bg-slate-200/50'
                }`}
                title="ภาษาไทย"
                id="lang-btn-th"
              >
                TH
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1.5 rounded-xl transition-all duration-300 text-[11px] font-sans tracking-wider cursor-pointer ${
                  language === 'en' 
                    ? 'bg-white text-mangosteen shadow-sm border border-slate-200/50 font-black' 
                    : 'hover:text-slate-700 hover:bg-slate-200/50'
                }`}
                title="English Language"
                id="lang-btn-en"
              >
                EN
              </button>
            </div>

            {/* Subtly Separated staff login trigger */}
            <div className="hidden sm:block">
              <button
                onClick={() => {
                  setLatestSubmission(null);
                  setActiveTab('admin');
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold font-sans flex items-center gap-2 transition-all duration-300 cursor-pointer border ${
                  activeTab === 'admin'
                    ? 'bg-mangosteen text-white border-mangosteen shadow-md shadow-mangosteen/20'
                    : 'text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                }`}
                id="btn-trigger-staff-admin"
                title="สำหรับเจ้าหน้าที่คณะเท่านั้น"
              >
                <Lock className="w-3.5 h-3.5" />
                {t('tabAdmin')}
              </button>
            </div>
            
            {/* Notification Bell Icon & Dropdown Center (Admin Only) */}
            {isAdminLoggedIn && activeTab === 'admin' && (
              <div className="relative" id="notification-bell-container">
                <button
                  onClick={() => setBellDropdownOpen(!bellDropdownOpen)}
                  className={`p-2 rounded-full transition-all duration-300 relative cursor-pointer ${
                    bellDropdownOpen 
                      ? 'bg-mangosteen/10 text-mangosteen' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                  title={isTh ? "การแจ้งเตือน" : "Notifications"}
                >
                  {pendingCount > 0 ? (
                    <BellRing className="w-4 h-4 text-rose-500 animate-pulse" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shadow-xs">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {bellDropdownOpen && (
                    <>
                      {/* Click-away backdrop */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setBellDropdownOpen(false)} 
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                      >
                        {/* Dropdown Header */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-800">
                              {isTh ? 'แจ้งเตือนคำร้อง' : 'Request Notifications'}
                            </span>
                            {pendingCount > 0 && (
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                {pendingCount} {isTh ? 'รอดำเนินการ' : 'Pending'}
                              </span>
                            )}
                          </div>
                          
                          {pendingCount > 0 && (
                            <button
                              onClick={() => {
                                const currentPendingIds = pendingRequestsList.map(r => r.id);
                                const newCleared = [...new Set([...clearedNotificationIds, ...currentPendingIds])];
                                saveClearedNotificationIds(newCleared);
                                showToast(isTh ? 'ล้างการแจ้งเตือนทั้งหมดแล้ว' : 'All notifications cleared.', 'success');
                              }}
                              className="text-[10px] font-bold text-slate-400 hover:text-mangosteen transition-colors flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg"
                              title={isTh ? "เคลียร์แจ้งเตือนทั้งหมด" : "Clear all notifications"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isTh ? 'เคลียร์ทั้งหมด' : 'Clear All'}</span>
                            </button>
                          )}
                        </div>

                        {/* Pending Requests List */}
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {pendingRequestsList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 space-y-1.5">
                              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="text-xs font-semibold">{isTh ? 'ไม่มีคำร้องค้างพิจารณา' : 'All clear! No pending requests.'}</p>
                            </div>
                          ) : (
                            pendingRequestsList.slice(0, 5).map((req, rIdx) => {
                              const coursesList = req.courses && req.courses.length > 0 
                                ? req.courses 
                                : [{ courseCode: req.courseCode || 'N/A', courseName: req.courseName || '', section: req.section || '' }];
                              
                              return (
                                <div 
                                  key={rIdx} 
                                  onClick={() => {
                                    setActiveTab('admin');
                                    setTargetRequestId(req.id);
                                    setBellDropdownOpen(false);
                                  }}
                                  className="p-3 hover:bg-slate-50 transition-colors cursor-pointer text-left space-y-1 group relative pr-10"
                                >
                                  {/* Individual Dismiss Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Avoid triggering card click
                                      const newCleared = [...new Set([...clearedNotificationIds, req.id])];
                                      saveClearedNotificationIds(newCleared);
                                      showToast(isTh ? 'ซ่อนการแจ้งเตือนนี้แล้ว' : 'Notification hidden.', 'info');
                                    }}
                                    className="absolute right-2 top-3 p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                                    title={isTh ? "ซ่อนแจ้งเตือนนี้" : "Hide this notification"}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>

                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-slate-800 group-hover:text-mangosteen transition-colors truncate max-w-[150px]">
                                      {req.fullName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {req.studentId}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-medium">
                                    {isTh ? 'ขอสำรองวิชา:' : 'Requested:'}{' '}
                                    <span className="font-bold text-mangosteen font-mono">{coursesList.length} {isTh ? 'วิชา' : 'course(s)'}</span>
                                  </div>
                                  
                                  {/* Compact Course details list inside the notification dropdown */}
                                  <div className="mt-1.5 pl-2 border-l border-slate-200/80 dark:border-slate-800 space-y-1">
                                    {coursesList.map((course, cIdx) => (
                                      <div key={cIdx} className="text-[10px] text-slate-500 dark:text-slate-400 font-sans leading-tight">
                                        <div className="flex flex-wrap items-center gap-1">
                                          <span className="font-bold font-mono text-mangosteen text-[9.5px] shrink-0">{course.courseCode}</span>
                                          <span className="truncate max-w-[140px] text-slate-600 dark:text-slate-300 font-medium">{course.courseName}</span>
                                          <span className="text-slate-450 shrink-0 text-[9px] font-mono">(Sec {course.section || '-'})</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="text-[9px] text-slate-400 flex items-center gap-1 pt-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>
                                      {isTh ? 'ยื่นเมื่อ:' : 'Submitted:'}{' '}
                                      {new Date(req.createdAt || new Date().toISOString()).toLocaleTimeString(isTh ? 'th-TH' : 'en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Dropdown Footer Action */}
                        <button
                          onClick={() => {
                            setActiveTab('admin');
                            setBellDropdownOpen(false);
                          }}
                          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-sans font-bold text-xs text-center border-t border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>{isTh ? 'ดูบอร์ดควบคุมคำร้องทั้งหมด' : 'Go to Admin Dashboard'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              title="สลับโหมดหน้าจอ"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-start">
        
        <AnimatePresence mode="wait">
          
          {/* POST-SUBMISSION DETAILED SUCCESS LANDING CARD */}
          {latestSubmission ? (
            <motion.div
              key="submit-success-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-xl space-y-6 text-center"
              id="form-submission-success-page"
            >
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xs border border-emerald-100 mb-2">
                <CheckCircle className="w-10 h-10" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-800 font-sans tracking-tight">
                  ได้รับคำร้องแล้ว
                </h3>
                <p className="text-sm text-slate-500 font-sans leading-relaxed">
                  ระบบได้บันทึกคำร้องของคุณเรียบร้อยแล้ว<br/>เจ้าหน้าที่จะทำการพิจารณาตามลำดับคิว
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-500 text-xs font-semibold rounded-lg border border-slate-200 mt-2">
                  <span className="text-slate-400">รหัสอ้างอิง:</span>
                  <strong className="font-mono text-slate-700">{latestSubmission.request.id}</strong>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={() => handleViewStatusAfterSubmit(latestSubmission.studentId)}
                  className="w-full py-3.5 bg-mangosteen hover:bg-mangosteen-hover text-white font-sans font-bold rounded-xl text-sm shadow-md shadow-mangosteen/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-go-check-status-direct"
                >
                  <Search className="w-4 h-4" />
                  ตรวจสอบสถานะคำร้อง
                </button>
                <button
                  onClick={() => setLatestSubmission(null)}
                  className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-sans font-bold rounded-xl text-sm transition-colors cursor-pointer"
                  id="btn-return-submit-again"
                >
                  ส่งคำร้องเพิ่มเติม
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* --- SECTION 1: ENROLLMENT REGISTRATION FORM --- */}
              {activeTab === 'reserve' && (
                <FormSection 
                  onSuccess={handleFormSubmitSuccess}
                  showToast={showToast}
                />
              )}

              {/* --- SECTION 2: CHECK SUBMISSION STATUS --- */}
              {activeTab === 'status' && (
                <StatusCheckSection 
                  initialStudentId={selectedStudentId}
                  showToast={showToast}
                />
              )}

              {/* --- SECTION 3: STAFF / ADMINISTRATIVE VIEW --- */}
              {activeTab === 'admin' && (
                <AdminSection 
                  isInitiallyLoggedIn={isAdminLoggedIn}
                  onLoginSuccess={() => {
                    setIsAdminLoggedIn(true);
                    requestBrowserNotificationPermission();
                  }}
                  onLogout={() => {
                    setIsAdminLoggedIn(false);
                    showToast(t('logoutAdmin'), 'info');
                    setActiveTab('reserve');
                  }}
                  showToast={showToast}
                  requestBrowserNotificationPermission={requestBrowserNotificationPermission}
                  notificationPermission={notificationPermission}
                  targetRequestId={targetRequestId}
                  onClearTargetRequestId={() => setTargetRequestId(null)}
                  requests={allRequests}
                  setRequests={setAllRequests}
                  onFetchRequests={pollRequests}
                  customLogo={customLogo}
                  onUpdateLogo={(newLogo) => {
                    setCustomLogo(newLogo);
                    if (newLogo) {
                      localStorage.setItem('custom_logo', newLogo);
                    } else {
                      localStorage.removeItem('custom_logo');
                    }
                  }}
                  customFavicon={customFavicon}
                  onUpdateFavicon={(newFavicon) => {
                    setCustomFavicon(newFavicon);
                    if (newFavicon) {
                      localStorage.setItem('custom_favicon', newFavicon);
                    } else {
                      localStorage.removeItem('custom_favicon');
                    }
                  }}
                />
              )}
            </>
          )}

        </AnimatePresence>

      </main>

      {/* Footer bar hosting responsive links */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p>
            {t('copyright')}
          </p>
          
          {/* Subtle mobile admin trigger links */}
          <div className="sm:hidden flex items-center justify-center gap-1 text-[11px] text-slate-400">
            <span>{t('forAdmin')}</span>
            <button
              onClick={() => {
                setLatestSubmission(null);
                setActiveTab('admin');
              }}
              className="text-mangosteen font-semibold hover:underline bg-mangosteen/5 py-1 px-2.5 rounded-full inline-flex items-center gap-1 transition-colors cursor-pointer"
              id="footer-staff-trigger"
            >
              <Lock className="w-3 h-3" />
              {t('adminLogin')}
            </button>
          </div>
        </div>
      </footer>

      {/* Embedded Global Toast Containers */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Custom Bottom-Right Floating Notifications Container for Newly Submitted Requests */}
      {isAdminLoggedIn && activeTab === 'admin' && bottomNotifications.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
          {bottomNotifications.length > 1 && (
            <button
              onClick={() => setBottomNotifications([])}
              className="pointer-events-auto self-end px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-sans text-[10px] font-black rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] z-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isTh ? 'เคลียร์แจ้งเตือนลอยทั้งหมด' : 'Dismiss All Popups'}</span>
            </button>
          )}
          <AnimatePresence>
            {bottomNotifications.map((noti) => (
              <motion.div
                key={noti.id}
                initial={{ opacity: 0, x: 50, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
                className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-4 flex flex-col gap-2.5 relative overflow-hidden cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                style={{ minHeight: '80px' }}
                onClick={() => {
                  setActiveTab('admin');
                  if (noti.requestId) {
                    setTargetRequestId(noti.requestId);
                  }
                  setBottomNotifications(prev => prev.filter(n => n.id !== noti.id));
                }}
              >
                {/* Decorative side accent bar */}
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-mangosteen" />
                
                <div className="flex items-start gap-3 pl-1.5">
                  <div className="p-2 bg-mangosteen/10 text-mangosteen rounded-xl animate-bounce shrink-0">
                    <BellRing className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 space-y-1 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                        {noti.title}
                        {noti.count > 1 && (
                          <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                            {noti.count}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering card details click
                          setBottomNotifications(prev => prev.filter(n => n.id !== noti.id));
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      {noti.message}
                    </p>
                  </div>
                </div>

                {/* Show items breakdown with counts/names */}
                {noti.items && noti.items.length > 0 && (
                  <div className="pl-11 pr-2 space-y-1">
                    <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                      {noti.items.slice(0, 3).map((item, itemIdx) => (
                        <div key={itemIdx} className="flex flex-col gap-1 border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-extrabold truncate text-slate-700 dark:text-slate-200">
                              คุณ {item.name}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                              {isTh ? `${item.courses.length} วิชา` : `${item.courses.length} courses`}
                            </span>
                          </div>
                          <div className="space-y-0.5 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                            {item.courses.map((course, cIdx) => (
                              <div key={cIdx} className="flex gap-1.5 items-start text-[9px] leading-tight">
                                <span className="font-mono font-bold text-mangosteen shrink-0">{course.courseCode}</span>
                                <span className="truncate flex-1" title={course.courseName}>{course.courseName}</span>
                                <span className="text-slate-400 shrink-0">Sec {course.section}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {noti.items.length > 3 && (
                        <div className="text-[10px] text-slate-400 text-center font-bold pt-0.5 border-t border-dashed border-slate-200/60">
                          {isTh ? `...และอีก ${noti.items.length - 3} คำร้อง` : `...and ${noti.items.length - 3} more requests`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons on notification popup */}
                <div className="pl-11 pr-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Card click already handles this, but let's make the button work perfectly
                      setActiveTab('admin');
                      if (noti.requestId) {
                        setTargetRequestId(noti.requestId);
                      }
                      setBottomNotifications(prev => prev.filter(n => n.id !== noti.id));
                    }}
                    className="px-3 py-1 bg-mangosteen text-white hover:bg-mangosteen-hover text-[11px] font-black rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{isTh ? 'เปิดจัดการคำร้อง' : 'Open Dashboard'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
