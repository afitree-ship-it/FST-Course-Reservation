/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  BookOpen, 
  Smartphone, 
  Upload, 
  Globe, 
  FileCheck, 
  CheckCircle, 
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  RefreshCw,
  X,
  ChevronDown,
  Plus,
  Trash2
} from 'lucide-react';
import { YEARS, ReservationRequest } from '../types';
import { submitRequest, getStatusByStudentId, getCachedRequestsByStudentId } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';

interface ScrambleTextProps {
  text: string;
  duration?: number;
}

const ScrambleText: React.FC<ScrambleTextProps> = ({ text, duration = 2800 }) => {
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [trigger, setTrigger] = useState(0);
  const [elapsed, setElapsed] = useState(duration);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // วนลูปการแอนิเมชันถอดรหัส (Scramble Effect) ทุกๆ 5.3 วินาที (เริ่มถอดรหัส 3 วินาที + คงสถานะข้อความจริงไว้ 2.3 วินาที)
  useEffect(() => {
    if (isReducedMotion) return;
    const intervalId = setInterval(() => {
      setTrigger((prev) => prev + 1);
    }, duration + 2300);
    return () => clearInterval(intervalId);
  }, [isReducedMotion, duration]);

  useEffect(() => {
    if (isReducedMotion) {
      setElapsed(duration);
      return;
    }

    let animationFrameId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const time = now - startTime;
      setElapsed(Math.min(time, duration));

      if (time < duration) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [trigger, duration, isReducedMotion]);

  // แยกกลุ่มพยัญชนะและสระ/วรรณยุกต์ซ้อนของภาษาไทยเพื่อให้โครงสร้างตัวอักษรไม่พังขณะถอดรหัส
  const segments = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);
      
      // สระหรือสัญลักษณ์ซ้อนบน-ล่าง และวรรณยุกต์ภาษาไทย (ไม่รวม 'า' 0x0e32 หรือ 'ำ' 0x0e33 ที่มีความกว้างปกติ)
      const isCombining = (code === 0x0e31) || 
                          (code >= 0x0e34 && code <= 0x0e3a) || 
                          (code >= 0x0e47 && code <= 0x0e4e);
      
      if (isCombining && result.length > 0) {
        result[result.length - 1] += char;
      } else {
        result.push(char);
      }
    }
    return result;
  }, [text]);

  const charset = "!<>-_\\/[]{}—=+*^?#@%";

  return (
    <span 
      aria-label={text} 
      className="inline-flex items-center justify-center select-none font-sans font-bold text-slate-700 leading-normal"
    >
      {segments.map((segment, idx) => {
        if (segment === ' ') {
          return (
            <span key={idx} className="w-[0.25em] inline-block">
              &nbsp;
            </span>
          );
        }

        const startSettle = (idx / segments.length) * (duration * 0.75);
        const settleDeadline = startSettle + 150;
        const isSettled = isReducedMotion || elapsed >= settleDeadline;

        let displayChar = segment;
        if (!isSettled) {
          const randomIndex = Math.floor(Math.random() * charset.length);
          displayChar = charset[randomIndex];
        }

        return (
          <span key={idx} className="relative inline-block overflow-hidden align-middle">
            {/* Invisible baseline preserving exact typography & width of the final character to prevent layout jitter */}
            <span className="invisible select-none pointer-events-none" aria-hidden="true">
              {segment}
            </span>
            {/* Perfectly aligned absolute character overlays */}
            <span 
              className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-colors duration-150 ${
                isSettled 
                  ? 'text-slate-700 font-sans font-bold' 
                  : 'text-slate-500 font-mono font-medium'
              }`} 
              aria-hidden="true"
            >
              {displayChar}
            </span>
          </span>
        );
      })}
    </span>
  );
};

const FACULTIES_DATA = {
  'คณะวิทยาศาสตร์และเทคโนโลยี': {
    colorClass: 'bg-mangosteen border-mangosteen text-white shadow-sm shadow-mangosteen/20',
    unselectedClass: 'border-slate-200 hover:bg-mangosteen/5 hover:text-mangosteen hover:border-mangosteen',
    dotColor: 'bg-[#7A1F2B]',
    departments: [
      'สาขาวิชาเทคโนโลยีและวิทยาการดิจิทัล',
      'สาขาวิชาเทคโนโลยีสารสนเทศ',
      'สาขาวิชาวิทยาการข้อมูลและการวิเคราะห์',
      'สาขาวิชาวิจัยและพัฒนาผลิตภัณฑ์ฮาลาล'
    ]
  },
  'คณะอิสลามศึกษาและนิติศาสตร์': {
    colorClass: 'bg-sky-600 border-sky-600 text-white shadow-sm shadow-sky-600/20',
    unselectedClass: 'border-slate-200 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-500',
    dotColor: 'bg-sky-600',
    departments: [
      'สาขาวิชาอุศูลุดดีน',
      'สาขาวิชาอิสลามศึกษา',
      'สาขาวิชานิติศาสตร์',
      'สาขาวิชาชะรีอะฮฺ',
      'สาขาวิชาอัลกุรอานและอัสสุนนะฮฺ'
    ]
  },
  'คณะศิลปศาสตร์และสังคมศาสตร์': {
    colorClass: 'bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/20',
    unselectedClass: 'border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-400',
    dotColor: 'bg-orange-500',
    departments: [
      'สาขาวิชาภาษาอาหรับ',
      'สาขาวิชารัฐประศาสนศาสตร์',
      'สาขาวิชาเศรษฐศาสตร์การเงินและการธนาคาร',
      'สาขาวิชาภาษาอังกฤษ',
      'สาขาวิชาภาษามลายู',
      'สาขาวิชาบริหารธุรกิจ'
    ]
  },
  'คณะศึกษาศาสตร์': {
    colorClass: 'bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-600/20',
    unselectedClass: 'border-slate-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-500',
    dotColor: 'bg-purple-600',
    departments: [
      'สาขาวิชาการศึกษาปฐมวัย',
      'สาขาวิชาเคมี',
      'สาขาวิชาอิสลามศึกษา',
      'สาขาวิชาภาษาอาหรับ',
      'สาขาวิชาวิทยาศาสตร์ทั่วไป',
      'สาขาวิชาภาษาอังกฤษ',
      'สาขาวิชาภาษามลายูและเทคโนโลยีการศึกษา'
    ]
  }
} as const;

interface FormSectionProps {
  onSuccess: (studentId: string, request: ReservationRequest) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function FormSection({ onSuccess, showToast }: FormSectionProps) {
  const { language, setLanguage, t, isTh } = useTranslation();
  // Field states
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [year, setYear] = useState('');
  const [courses, setCourses] = useState<Omit<ReservationRequest, 'id' | 'fullName' | 'studentId' | 'department' | 'faculty' | 'year' | 'courses' | 'proofType' | 'facebookProofLink' | 'facebookProofFile' | 'phone' | 'consent' | 'status' | 'rejectionReason' | 'createdAt'>[]>([
    { courseCode: '', courseName: '', section: '', instructor: '' }
  ]);
  const [proofType, setProofType] = useState<'file' | 'link'>('file');
  const [facebookProofLink, setFacebookProofLink] = useState('');
  const [facebookProofFile, setFacebookProofFile] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(true);

  // Flow states
  const [step, setStep] = useState<1 | 2>(1);
  const [checkingStudentId, setCheckingStudentId] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  // Errors feedback (touched validation)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Form validations
  const isStudentIdValid = (id: string) => /^\d{9}$/.test(id.trim());
  const isPhoneValid = (ph: string) => /^0\d{9}$/.test(ph.trim()); // 10 digits Thai phone starting with 0

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#department-dropdown-wrapper')) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Synchronize step with browser history to allow physical/browser back button to go back to step 1
  useEffect(() => {
    if (step === 2) {
      if (window.history.state?.formStep !== 2) {
        window.history.pushState({ formStep: 2 }, '');
      }

      const handlePopState = () => {
        setStep(1);
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (window.history.state?.formStep === 2) {
          window.history.back();
        }
      };
    }
  }, [step]);

  const goBackToStep1 = () => {
    if (window.history.state?.formStep === 2) {
      window.history.back();
    } else {
      setStep(1);
    }
  };

  const handleCourseChange = (index: number, field: string, value: string) => {
    setCourses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addCourseField = () => {
    setCourses(prev => [...prev, { courseCode: '', courseName: '', section: '', instructor: '' }]);
  };

  const removeCourseField = (index: number) => {
    if (courses.length > 1) {
      setCourses(prev => prev.filter((_, i) => i !== index));
    }
  };

  const getFormErrors = () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = t('errFullName');
    if (!studentId.trim()) {
      errors.studentId = t('errStudentId');
    } else if (!isStudentIdValid(studentId)) {
      errors.studentId = t('errStudentIdValid');
    }
    if (!faculty) errors.faculty = isTh ? 'กรุณาเลือกคณะ' : 'Please select a faculty';
    if (!department) errors.department = t('errDepartment');
    if (!year) errors.year = t('errYear');

    courses.forEach((course, index) => {
      if (!course.courseCode.trim()) errors[`courseCode_${index}`] = t('errCourseCode');
      if (!course.courseName.trim()) errors[`courseName_${index}`] = t('errCourseName');
      if (!course.section.trim()) errors[`section_${index}`] = t('errSec');
      if (!course.instructor.trim()) errors[`instructor_${index}`] = t('errInstructor');
    });
    
    if (proofType === 'link' && !facebookProofLink.trim()) {
      errors.facebookProofLink = isTh ? 'กรุณากรอกลิงก์โปรไฟล์ Facebook' : 'Please provide your Facebook profile URL link.';
    } else if (proofType === 'link' && !facebookProofLink.trim().startsWith('http')) {
      errors.facebookProofLink = isTh ? 'ลิงก์ไม่ถูกต้อง ต้องเริ่มต้นด้วย http:// หรือ https://' : 'Invalid URL. Link must start with http:// or https://';
    }
    
    if (proofType === 'file' && !facebookProofFile) {
      errors.facebookProofFile = t('errProofFile');
    }

    if (phone.trim() && !isPhoneValid(phone)) {
      errors.phone = t('errPhone');
    }

    if (!consent) {
      errors.consent = t('errConsent');
    }

    return errors;
  };

  const validationErrors = getFormErrors();
  const isValidForm = Object.keys(validationErrors).length === 0;

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Convert File to Base64
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(isTh ? 'กรุณาอัปโหลดเฉพาะไฟล์รูปภาพ (PNG, JPG, JPEG, etc.)' : 'Please upload image files only (PNG, JPG, JPEG).', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(isTh ? 'ขนาดไฟล์ใหญ่เกินไป จำกัดที่ 5MB' : 'File size is too large (must be under 5MB).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFacebookProofFile({
        name: file.name,
        type: file.type,
        dataUrl: e.target?.result as string
      });
      showToast(isTh ? 'อัปโหลดและประมวลผลไฟล์รูปภาพเรียบร้อย' : 'Screenshot uploaded and processed successfully.', 'success');
    };
    reader.onerror = () => {
      showToast(isTh ? 'เกิดข้อผิดพลาดในการโหลดไฟล์' : 'An error occurred while loading the file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearFile = () => {
    setFacebookProofFile(null);
  };

  const handleCheckStudentId = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ studentId: true });
    
    if (!studentId.trim() || !isStudentIdValid(studentId)) {
      showToast(isTh ? 'กรุณากรอกรหัสนักศึกษา 9 หลักให้ถูกต้อง' : 'Please enter a valid 9-digit student ID', 'warning');
      return;
    }

    setCheckingStudentId(true);

    // 1. Instant Cache Check (takes 0ms!)
    const cached = getCachedRequestsByStudentId(studentId.trim());
    if (cached && cached.length > 0) {
      const sortedData = [...cached].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latest = sortedData[0];
      setFullName(String(latest.fullName || ''));
      setFaculty(String(latest.faculty || ''));
      setDepartment(String(latest.department || ''));
      setYear(String(latest.year || ''));
      setPhone(String(latest.phone || ''));
      setHasProfile(true);
      setTouched({});
      setStep(2);
      setCheckingStudentId(false);
      return;
    }

    // 2. Fetch from network if not in cache
    try {
      const res = await getStatusByStudentId(studentId.trim());
      setTouched({}); // Reset touched state for step 2
      if (res.success && res.data && res.data.length > 0) {
        // found past records! Pre-fill latest info
        const latest = res.data[0];
        setFullName(String(latest.fullName || ''));
        setFaculty(String(latest.faculty || ''));
        setDepartment(String(latest.department || ''));
        setYear(String(latest.year || ''));
        setPhone(String(latest.phone || ''));
        setHasProfile(true);
      } else {
        setFullName('');
        setFaculty('');
        setDepartment('');
        setYear('');
        setPhone('');
        setCourses([{ courseCode: '', courseName: '', section: '', instructor: '' }]);
        setFacebookProofLink('');
        setFacebookProofFile(null);
        setHasProfile(false);
      }
      setStep(2);
    } catch (err) {
      // In case of error (maybe first time or network issue), still go to step 2 but they need to fill in manually
      setFullName('');
      setFaculty('');
      setDepartment('');
      setYear('');
      setPhone('');
      setCourses([{ courseCode: '', courseName: '', section: '', instructor: '' }]);
      setFacebookProofLink('');
      setFacebookProofFile(null);
      setHasProfile(false);
      setTouched({});
      setStep(2);
    } finally {
      setCheckingStudentId(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitTouched: Record<string, boolean> = {
      fullName: true,
      studentId: true,
      department: true,
      year: true,
      facebookProofLink: true,
      facebookProofFile: true,
      phone: true,
      consent: true,
    };
    courses.forEach((_, idx) => {
      submitTouched[`courseCode_${idx}`] = true;
      submitTouched[`courseName_${idx}`] = true;
      submitTouched[`section_${idx}`] = true;
      submitTouched[`instructor_${idx}`] = true;
    });
    setTouched(submitTouched);

    if (!isValidForm) {
      showToast(t('toastFillError'), 'warning');
      return;
    }

    setIsSubmitting(true);
    const submitPayload = {
      fullName,
      studentId: studentId.trim(),
      department,
      faculty,
      year,
      courseCode: courses[0]?.courseCode.toUpperCase().trim() || '',
      courseName: courses[0]?.courseName.trim() || '',
      section: courses[0]?.section.trim() || '',
      instructor: courses[0]?.instructor.trim() || '',
      courses: courses.map(c => ({
        courseCode: c.courseCode.toUpperCase().trim(),
        courseName: c.courseName.trim(),
        section: c.section.trim(),
        instructor: c.instructor.trim()
      })),
      proofType,
      facebookProofLink: proofType === 'link' ? facebookProofLink : undefined,
      facebookProofFile: proofType === 'file' && facebookProofFile ? facebookProofFile : undefined,
      phone: phone.trim(),
      consent
    };

    try {
      const response = await submitRequest(submitPayload);
      if (response.success && response.data) {
        showToast(isTh ? 'ส่งคำร้องขอดำเนินการเรียบร้อยแล้ว!' : 'Seat reservation requested successfully!', 'success');
        onSuccess(studentId.trim(), response.data);
      } else {
        showToast(response.error || (isTh ? 'ส่งข้อมูลล้มเหลว กรุณาลองใช้วิธีจำลองระบบ' : 'Submission failed. Please try demo mode.'), 'error');
      }
    } catch (err) {
      showToast(isTh ? 'เกิดข้อผิดพลาดในการติดต่อระบบเซิร์ฟเวอร์' : 'Error connecting to the remote server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
      id="reservation-form-container"
    >
      <div className="bg-white/85 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),_0_15px_30px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-white/90 transition-all duration-300">
        {/* Banner header inside the card - Clean Minimalism Accent Line */}
        {step !== 1 && (
          <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="w-1.5 h-6 bg-mangosteen rounded-full"></div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-mangosteen font-sans">{t('formTitle')}</h2>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm font-sans tracking-wide">
                  {t('formSubtitle')}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={step === 1 ? handleCheckStudentId : handleSubmit} className={`${step === 1 ? 'p-5 sm:p-8 space-y-4 sm:space-y-6' : 'p-6 md:p-8 space-y-8'}`} id="scitech-reserve-form">
          {step === 1 ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-mangosteen font-sans mb-1">{t('formTitle')}</h2>
                <h3 className="text-sm sm:text-base font-bold text-slate-700 font-sans min-h-[1.5rem] flex items-center justify-center">
                  <ScrambleText text={isTh ? 'กรอกรหัสนักศึกษาเพื่อเริ่มต้น' : 'Enter Student ID to Start'} duration={2800} />
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{isTh ? 'ระบบจะตรวจสอบข้อมูลส่วนตัวของคุณจากฐานข้อมูล' : 'We will check your profile in our database'}</p>
              </div>

              <div className="max-w-xs mx-auto">
                <label className="block text-xs sm:text-sm font-semibold text-slate-600 mb-1 sm:mb-1.5 font-sans text-center">
                  {t('studentIdLabel')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={studentId}
                  onChange={e => setStudentId(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => handleBlur('studentId')}
                  placeholder="xxxxxxxxx"
                  className={`w-full px-4 py-2.5 sm:py-3 rounded-xl border-2 text-center text-md sm:text-lg font-bold font-sans tracking-widest transition-all focus:outline-hidden focus:ring-4 ${
                    touched.studentId && validationErrors.studentId
                      ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                      : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/20 text-slate-700'
                  }`}
                  id="input-studentId-step1"
                  autoFocus
                />
                {touched.studentId && validationErrors.studentId && (
                  <p className="mt-1.5 text-xs text-rose-500 font-sans font-medium text-center">{validationErrors.studentId}</p>
                )}
              </div>

              <div className="pt-2 sm:pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={checkingStudentId || !studentId.trim()}
                  className="w-full max-w-xs py-2.5 sm:py-3 px-6 bg-mangosteen hover:bg-mangosteen-light text-white font-bold font-sans rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
                >
                  {checkingStudentId ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isTh ? 'ถัดไป' : 'Next'}
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Section 1: ข้อมูลนักศึกษา */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-mangosteen" />
                    <h3 className="font-bold text-sm text-slate-800 font-sans tracking-wide">{t('sectionApplicant')}</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setFullName('');
                      setFaculty('');
                      setDepartment('');
                      setYear('');
                      setPhone('');
                      setCourses([{ courseCode: '', courseName: '', section: '', instructor: '' }]);
                      setFacebookProofLink('');
                      setFacebookProofFile(null);
                      setHasProfile(false);
                      setTouched({});
                      setStep(1);
                    }}
                    className="text-xs text-slate-500 hover:text-mangosteen font-semibold transition-colors flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-md"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {isTh ? 'เปลี่ยนรหัสนักศึกษา' : 'Change ID'}
                  </button>
                </div>

                {hasProfile && (
                  <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-start gap-2 text-sm font-sans mb-4 border border-emerald-200/50">
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <strong>{isTh ? 'พบประวัติข้อมูลของคุณ' : 'Profile found!'}</strong>
                      <p className="opacity-90 text-xs mt-0.5">
                        {isTh ? 'เราได้กรอกข้อมูลส่วนตัวให้คุณแล้ว คุณสามารถแก้ไขได้หรือข้ามไปเลือกรายวิชาได้เลย' : 'We have pre-filled your personal info. You can edit it or skip directly to selecting courses.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ชื่อ-นามสกุล */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans">
                      {t('fullNameLabel')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        onBlur={() => handleBlur('fullName')}
                        placeholder={isTh ? 'เช่น นายสุขใจ เรียนดี' : 'e.g., Muhammad Zakariya'}
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-slate-50 hover:bg-white text-sm sm:text-base font-medium font-sans transition-all focus:outline-hidden focus:ring-4 ${
                          touched.fullName && validationErrors.fullName
                            ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                            : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/20 text-slate-700'
                        }`}
                        id="input-fullName"
                      />
                    </div>
                    {touched.fullName && validationErrors.fullName && (
                      <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors.fullName}</p>
                    )}
                  </div>

                  {/* รหัสนักศึกษา (Read-only in step 2 usually, but let them edit if they want) */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans">
                      {t('studentIdLabel')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={9}
                      value={studentId}
                      onChange={e => setStudentId(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => handleBlur('studentId')}
                      placeholder="xxxxxxxxx"
                      className={`w-full px-4 py-3 rounded-xl border-2 text-sm sm:text-base font-medium font-sans tracking-wide transition-all focus:outline-hidden focus:ring-4 ${
                        touched.studentId && validationErrors.studentId
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                          : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/20 bg-slate-100 text-slate-500'
                      }`}
                      id="input-studentId"
                      readOnly
                    />
                    {touched.studentId && validationErrors.studentId && (
                  <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors.studentId}</p>
                )}
              </div>

              {/* เลือกคณะ ( dynamic responsive group of styled buttons ) */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2 font-sans">
                  {t('facultyLabel')} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" id="faculty-buttons-grid">
                  {[
                    { name: 'คณะวิทยาศาสตร์และเทคโนโลยี', label: isTh ? 'คณะวิทยาศาสตร์และเทคโนโลยี' : 'Science & Tech', activeBg: 'border-mangosteen bg-mangosteen/5 text-mangosteen ring-1 ring-mangosteen/30', hoverBorder: 'hover:border-mangosteen hover:bg-mangosteen/5 text-slate-700', dotClass: 'bg-mangosteen ring-mangosteen/30' },
                    { name: 'คณะอิสลามศึกษาและนิติศาสตร์', label: isTh ? 'คณะอิสลามศึกษาและนิติศาสตร์' : 'Islamic Studies & Law', activeBg: 'border-sky-500 bg-sky-50/50 text-sky-700 ring-1 ring-sky-500/30', hoverBorder: 'hover:border-sky-500 hover:bg-sky-50/50 text-slate-700', dotClass: 'bg-sky-500 ring-sky-500/30' },
                    { name: 'คณะศิลปศาสตร์และสังคมศาสตร์', label: isTh ? 'คณะศิลปศาสตร์และสังคมศาสตร์' : 'Liberal Arts & SocSci', activeBg: 'border-orange-500 bg-orange-50/40 text-orange-700 ring-1 ring-orange-500/30', hoverBorder: 'hover:border-orange-400 hover:bg-orange-50/40 text-slate-700', dotClass: 'bg-orange-500 ring-orange-500/30' },
                    { name: 'คณะศึกษาศาสตร์', label: isTh ? 'คณะศึกษาศาสตร์' : 'Education', activeBg: 'border-purple-500 bg-purple-50/50 text-purple-700 ring-1 ring-purple-500/30', hoverBorder: 'hover:border-purple-500 hover:bg-purple-50/50 text-slate-700', dotClass: 'bg-purple-500 ring-purple-500/30' }
                  ].map((fac) => {
                    const isSelected = faculty === fac.name;
                    return (
                      <button
                        key={fac.name}
                        type="button"
                        onClick={() => {
                          setFaculty(fac.name);
                          setDepartment('');
                          handleBlur('faculty');
                        }}
                        className={`w-full text-left px-3.5 py-3 rounded-xl border text-xs sm:text-sm font-medium font-sans transition-all duration-150 cursor-pointer flex items-center gap-3 shadow-xs ${
                          isSelected
                            ? fac.activeBg
                            : `border-slate-200 bg-white ${fac.hoverBorder}`
                        }`}
                        id={`btn-faculty-${fac.name}`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                          isSelected ? `${fac.dotClass} ring-4 scale-105` : 'bg-slate-300'
                        }`} />
                        <span className="leading-snug">{fac.label}</span>
                      </button>
                    );
                  })}
                </div>
                {touched.faculty && validationErrors.faculty && (
                  <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors.faculty}</p>
                )}
              </div>

              {/* สาขาวิชา ( updates based on selected faculty ) */}
              <div className="col-span-1 md:col-span-2 relative" id="department-dropdown-wrapper">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans">
                  {t('departmentLabel')} <span className="text-rose-500">*</span>
                </label>
                {(() => {
                  const isSciTech = faculty === 'คณะวิทยาศาสตร์และเทคโนโลยี';
                  const isIslamic = faculty === 'คณะอิสลามศึกษาและนิติศาสตร์';
                  const isLiberal = faculty === 'คณะศิลปศาสตร์และสังคมศาสตร์';
                  const isEdu = faculty === 'คณะศึกษาศาสตร์';

                  const facultyTheme = isSciTech ? {
                    accent: 'border-l-mangosteen',
                    focusRing: 'focus:ring-mangosteen/15',
                    focusBorder: 'focus:border-mangosteen',
                    activeText: 'text-mangosteen',
                    itemHover: 'hover:bg-mangosteen/5 hover:text-mangosteen',
                    selectedBg: 'bg-mangosteen/5 text-mangosteen font-medium'
                  } : isIslamic ? {
                    accent: 'border-l-sky-600',
                    focusRing: 'focus:ring-sky-600/15',
                    focusBorder: 'focus:border-sky-600',
                    activeText: 'text-sky-700',
                    itemHover: 'hover:bg-sky-50 hover:text-sky-850 hover:text-sky-800',
                    selectedBg: 'bg-sky-50 text-sky-850 text-sky-800 font-medium'
                  } : isLiberal ? {
                    accent: 'border-l-orange-500',
                    focusRing: 'focus:ring-orange-500/15',
                    focusBorder: 'focus:border-orange-500',
                    activeText: 'text-orange-700',
                    itemHover: 'hover:bg-orange-50/50 hover:text-orange-850',
                    selectedBg: 'bg-orange-50/50 text-orange-850 text-orange-800 font-medium'
                  } : isEdu ? {
                    accent: 'border-l-purple-600',
                    focusRing: 'focus:ring-purple-600/15',
                    focusBorder: 'focus:border-purple-600',
                    activeText: 'text-purple-700',
                    itemHover: 'hover:bg-purple-50 hover:text-purple-850 hover:text-purple-800',
                    selectedBg: 'bg-purple-50 text-purple-850 text-purple-800 font-medium'
                  } : {
                    accent: 'border-l-slate-300',
                    focusRing: 'focus:ring-slate-200/50',
                    focusBorder: 'focus:border-slate-300',
                    activeText: 'text-slate-500',
                    itemHover: 'hover:bg-slate-50',
                    selectedBg: 'bg-slate-50'
                  };

                  return (
                    <div className="relative font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          if (!faculty) {
                            showToast(isTh ? 'กรุณาเลือกคณะก่อนเลือกสาขาวิชา' : 'Please select a faculty first', 'warning');
                            return;
                          }
                          setIsDeptDropdownOpen(!isDeptDropdownOpen);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 hover:bg-slate-50 text-sm sm:text-base font-medium font-sans bg-white transition-all text-left border-l-4 cursor-pointer ${facultyTheme.accent} ${
                          touched.department && validationErrors.department
                            ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                            : `border-slate-200 focus:outline-hidden focus:ring-4 ${facultyTheme.focusRing} ${facultyTheme.focusBorder}`
                        }`}
                        id="input-department-trigger"
                      >
                        <span className={department ? 'text-slate-900 font-medium' : 'text-slate-400 font-normal shadow-xs'}>
                          {department ? (isTh ? department : (t(department) || department)) : t('deptSelectPlaceholder')}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isDeptDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1.5 z-30 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto duration-150 animate-in fade-in slide-in-from-top-1">
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDepartment('');
                                setIsDeptDropdownOpen(false);
                                handleBlur('department');
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-slate-400 hover:bg-slate-50 border-b border-rose-50/50 font-sans cursor-pointer font-medium"
                            >
                              {t('deptSelectPlaceholder')}
                            </button>
                            {(FACULTIES_DATA[faculty as keyof typeof FACULTIES_DATA]?.departments || []).map(dept => {
                              const isSelected = department === dept;
                              return (
                                <button
                                  key={dept}
                                  type="button"
                                  onClick={() => {
                                    setDepartment(dept);
                                    setIsDeptDropdownOpen(false);
                                    handleBlur('department');
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-sans transition-colors cursor-pointer flex items-center justify-between ${
                                    isSelected ? facultyTheme.selectedBg : `text-slate-700 ${facultyTheme.itemHover}`
                                  }`}
                                >
                                  <span>{isTh ? dept : (t(dept) || dept)}</span>
                                  {isSelected && (
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSciTech ? 'bg-mangosteen' : isIslamic ? 'bg-sky-600' : isLiberal ? 'bg-orange-500' : 'bg-purple-600'}`} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {touched.department && validationErrors.department && (
                  <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors.department}</p>
                )}
              </div>

              {/* ชั้นปี */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans">
                  {t('academicYearLabel')} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {YEARS.map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setYear(yr);
                        handleBlur('year');
                      }}
                      className={`py-2 px-1 text-center text-xs sm:text-sm font-bold rounded-lg font-sans transition-all border cursor-pointer ${
                        year === yr
                          ? 'border-mangosteen bg-mangosteen/5 text-mangosteen ring-1 ring-mangosteen'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                      id={`btn-year-${yr}`}
                    >
                      {isTh ? `ปี ${yr}` : `Year ${yr}`}
                    </button>
                  ))}
                </div>
                {touched.year && validationErrors.year && (
                  <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors.year}</p>
                )}
              </div>

              {/* เบอร์โทรศัพท์ */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans">
                  {t('phoneLabel')} <span className="text-xs font-normal text-slate-400">{t('phoneOptional')}</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => handleBlur('phone')}
                  placeholder={isTh ? '08xxxxxxxx' : 'e.g., 08xxxxxxxx'}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-sm sm:text-base font-medium font-sans tracking-wide transition-all focus:outline-hidden focus:ring-4 bg-slate-50 hover:bg-white ${
                    touched.phone && validationErrors.phone
                      ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                      : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/20 text-slate-700'
                  }`}
                  id="input-phone"
                />
                {touched.phone && validationErrors.phone && (
                  <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: รายละเอียดวิชาเรียน */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-mangosteen" />
                <h3 className="font-bold text-sm text-slate-800 font-sans tracking-wide">{t('sectionCourse')}</h3>
              </div>
              <span className="text-xs bg-mangosteen/10 text-mangosteen px-2 py-0.5 rounded-full font-sans font-semibold">
                {courses.length} {isTh ? 'วิชา' : 'courses'}
              </span>
            </div>

            {courses.map((course, index) => (
              <div key={index} className="p-5 bg-slate-50/50 rounded-xl border border-slate-250/60 space-y-4 relative">
                {courses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCourseField(index)}
                    className="absolute top-4 right-4 text-rose-500 hover:text-white hover:bg-rose-500 p-1.5 rounded-lg border border-rose-200 hover:border-transparent transition-all cursor-pointer flex items-center justify-center"
                    title={isTh ? 'ลบรายวิชานี้' : 'Remove this course'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="text-xs font-bold text-slate-400 font-sans tracking-wider uppercase mb-1">
                  {isTh ? `วิชาที่ ${index + 1}` : `Course #${index + 1}`}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* รหัสวิชา */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">
                      {t('courseCodeLabel')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={course.courseCode}
                      onChange={e => handleCourseChange(index, 'courseCode', e.target.value.toUpperCase())}
                      onBlur={() => handleBlur(`courseCode_${index}`)}
                      placeholder={isTh ? 'เช่น IT2301-123' : 'e.g., IT2301-123'}
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-slate-50 hover:bg-white text-sm font-semibold tracking-wide font-sans transition-all focus:outline-hidden focus:ring-4 ${
                        touched[`courseCode_${index}`] && validationErrors[`courseCode_${index}`]
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                          : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/20 text-slate-700'
                      }`}
                    />
                    {touched[`courseCode_${index}`] && validationErrors[`courseCode_${index}`] && (
                      <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors[`courseCode_${index}`]}</p>
                    )}
                  </div>

                  {/* ชื่อวิชา */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">
                      {isTh ? 'ชื่อรายวิชา' : 'Course Name'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={course.courseName}
                      onChange={e => handleCourseChange(index, 'courseName', e.target.value)}
                      onBlur={() => handleBlur(`courseName_${index}`)}
                      placeholder={isTh ? 'เช่น การออกแบบระบบข้อมูล' : 'e.g., Database Systems Design'}
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-slate-50 hover:bg-white text-sm font-medium font-sans transition-all focus:outline-hidden focus:ring-4 ${
                        touched[`courseName_${index}`] && validationErrors[`courseName_${index}`]
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                          : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/20 text-slate-700'
                      }`}
                    />
                    {touched[`courseName_${index}`] && validationErrors[`courseName_${index}`] && (
                      <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors[`courseName_${index}`]}</p>
                    )}
                  </div>

                  {/* กลุ่มที่ต้องการลง */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">
                      {isTh ? 'กลุ่ม' : 'Section'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={course.section}
                      onChange={e => handleCourseChange(index, 'section', e.target.value)}
                      onBlur={() => handleBlur(`section_${index}`)}
                      placeholder={isTh ? 'เช่น กลุ่ม 01' : 'e.g., Section 1'}
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-slate-50 hover:bg-white text-sm font-medium font-sans transition-all focus:outline-hidden focus:ring-4 ${
                        touched[`section_${index}`] && validationErrors[`section_${index}`]
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                          : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/20 text-slate-700'
                      }`}
                    />
                    {touched[`section_${index}`] && validationErrors[`section_${index}`] && (
                      <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors[`section_${index}`]}</p>
                    )}
                  </div>

                  {/* ผู้สอน */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">
                      {t('instructorLabel')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={course.instructor}
                      onChange={e => handleCourseChange(index, 'instructor', e.target.value)}
                      onBlur={() => handleBlur(`instructor_${index}`)}
                      placeholder={isTh ? 'เช่น ผศ.ดร.ใจดี มุ่งมั่น' : 'e.g., Asst. Prof. Dr. Muhammad Zakariya'}
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-slate-50 hover:bg-white text-sm font-medium font-sans transition-all focus:outline-hidden focus:ring-4 ${
                        touched[`instructor_${index}`] && validationErrors[`instructor_${index}`]
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                          : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/20 text-slate-700'
                      }`}
                    />
                    {touched[`instructor_${index}`] && validationErrors[`instructor_${index}`] && (
                      <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors[`instructor_${index}`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* ปุ่มเพิ่มวิชา */}
            <button
              type="button"
              onClick={addCourseField}
              className="w-full py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 font-sans hover:shadow active:scale-95"
            >
              <div className="bg-emerald-100 p-1 rounded-md text-emerald-800">
                <Plus className="w-5 h-5" />
              </div>
              {isTh ? 'เพิ่มรายวิชาเรียนที่ต้องการสำรองอีก' : 'Add another course details'}
            </button>
          </div>

          {/* Section 3: ช่องทางสำหรับติดต่อกลับเพื่อยืนยันหรือตรวจสอบข้อมูล */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
              <Globe className="w-4 h-4 text-mangosteen" />
              <h3 className="font-bold text-sm text-slate-800 font-sans tracking-wide">{t('ช่องทางการติดต่อ')}</h3>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-3">
              <span className="text-sm font-bold text-mangosteen shrink-0 pt-0.5 font-sans">
                {isTh ? 'ℹ️ สำหรับติดต่อกลับ:' : 'ℹ️ Contact Person Info:'}
              </span>
              <p className="text-sm text-slate-700 font-sans leading-relaxed font-normal">
                {isTh
                  ? 'เจ้าหน้าที่จะดำเนินการค้นหาและติดต่อกลับผู้ยื่นคำร้องผ่านช่องทาง Facebook โดยตรง ในกรณีที่พบปัญหา ข้อสงสัย หรือมีความจำเป็นต้องแจ้งข้อมูลเพิ่มเติม โดยนักศึกษาสามารถเลือก แนบรูปหน้าโปรไฟล์ หรือ ระบุลิงก์โปรไฟล์ ก็ได้ตามประสงค์'
                  : 'For any issues regarding your reservation status, authorities will contact you directly on Facebook. You can either upload a screenshot of your Facebook Profile, or paste public URL link to your Facebook Profile.'}
              </p>
            </div>

            {/* Selector: แฟลต/อัปโหลด VS สลับลิงก์ */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setProofType('file')}
                className={`py-2 px-3 text-xs font-medium font-sans text-center rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  proofType === 'file'
                    ? 'bg-white text-mangosteen shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="btn-proof-file"
              >
                <Upload className="w-3.5 h-3.5" />
                {isTh ? 'สะดวกแนบรูปหน้าโปรไฟล์ Facebook' : 'Upload Facebook Profile Screenshot'}
              </button>
              <button
                type="button"
                onClick={() => setProofType('link')}
                className={`py-2 px-3 text-xs font-medium font-sans text-center rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  proofType === 'link'
                    ? 'bg-white text-mangosteen shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="btn-proof-link"
              >
                <Globe className="w-3.5 h-3.5" />
                {isTh ? 'สะดวกพิมพ์ลิงก์ของโปรไฟล์แทน' : 'Provide Link to Facebook Profile'}
              </button>
            </div>

            {proofType === 'file' ? (
              /* Drag state & File field */
              <div className="space-y-2">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center min-h-[160px] cursor-pointer ${
                    isDragOver
                      ? 'border-mangosteen bg-mangosteen/5 scale-[1.01]'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                  onClick={() => document.getElementById('fb-image-upload')?.click()}
                >
                  <input
                    type="file"
                    id="fb-image-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {facebookProofFile ? (
                    <div className="flex flex-col items-center gap-3 w-full" onClick={e => e.stopPropagation()}>
                      <div className="relative">
                        <img
                          src={facebookProofFile.dataUrl}
                          alt="Facebook Join Screen Capture Proof"
                          className="max-h-36 rounded-lg pointer-events-none object-contain shadow-xs border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={clearFile}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-md hover:bg-rose-600 transition-colors cursor-pointer"
                          title={isTh ? 'ลบออก' : 'Remove'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs font-mono text-slate-500 text-center truncate max-w-sm font-semibold">
                        {facebookProofFile.name} ({(facebookProofFile.type)})
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-3 bg-white rounded-full shadow-xs text-slate-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 font-sans">{t('dragAndDropFile')}</p>
                      <p className="text-xs text-slate-400 font-sans">{t('fileSupport')}</p>
                    </div>
                  )}
                </div>
                {touched.facebookProofFile && validationErrors.facebookProofFile && (
                  <p className="text-xs text-rose-500 font-sans font-medium">{validationErrors.facebookProofFile}</p>
                )}
              </div>
            ) : (
              /* Link input */
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
                  {t('linkInputLabel')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={facebookProofLink}
                    onChange={e => setFacebookProofLink(e.target.value)}
                    onBlur={() => handleBlur('facebookProofLink')}
                    placeholder="https://facebook.com/your.username"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-sans transition-all focus:outline-hidden focus:ring-2 ${
                      touched.facebookProofLink && validationErrors.facebookProofLink
                        ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/20'
                        : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/10'
                    }`}
                    id="input-facebookProofLink"
                  />
                </div>
                {touched.facebookProofLink && validationErrors.facebookProofLink && (
                  <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors.facebookProofLink}</p>
                )}
              </div>
            )}
          </div>

          {/* Section 4: ข้อกำหนดความยินยอม */}
          <div className="space-y-4 pt-2 border-t border-slate-100 font-sans">
            <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider font-sans">
              {t('sectionConsent')}
            </h4>
            <label className="flex items-start gap-3 cursor-pointer group" id="check-consent-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => {
                  setConsent(e.target.checked);
                  handleBlur('consent');
                }}
                className="mt-1 rounded-sm border-slate-300 text-mangosteen focus:ring-mangosteen shrink-0 h-5 w-5 cursor-pointer"
                id="checkbox-consent"
              />
              <span className="text-sm text-slate-700 font-bold leading-relaxed group-hover:text-slate-900 transition-colors select-none">
                {isTh
                  ? `ข้าพเจ้ายินยอมให้${faculty || 'ทางมหาวิทยาลัย'} เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลที่ระบุในแบบฟอร์มนี้ เพื่อใช้ประโยชน์ในการบริหารจัดการโควตาและจัดสำรองที่นั่งในสิทธิ์นักศึกษาตามวัตถุประสงค์โดยชอบด้วยกฎหมาย`
                  : `I consent and authorize ${faculty || 'the University'} to aggregate, store, and process my academic and personal data specified in this reservation form for student quota queue assignments.`}
                <span className="text-rose-500 font-bold ml-1">*</span>
              </span>
            </label>
            {touched.consent && validationErrors.consent && (
              <p className="text-xs text-rose-500 font-sans font-medium">{validationErrors.consent}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={goBackToStep1}
                className="w-full sm:w-1/3 py-4 px-6 rounded-xl font-sans font-bold border-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                id="btn-back-to-step1"
              >
                <ArrowLeft className="w-4 h-4" />
                {isTh ? 'ย้อนกลับ' : 'Back'}
              </button>
              <button
                 type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-2/3 py-4 px-6 rounded-xl font-sans font-bold text-white tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer bg-mangosteen hover:bg-mangosteen-hover active:scale-[0.99] shadow-mangosteen/25 ${
                  isSubmitting ? 'bg-slate-400 cursor-not-allowed shadow-none opacity-50' : ''
                }`}
                id="btn-submit-request"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    {t('submitButton')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
            {!isValidForm && (
              <p className="text-center text-xs text-slate-400 font-sans mt-3">
                {isTh 
                  ? '* กรุณากรอกหัวข้อที่มีเครื่องหมายดอกจัน (*) และยินยอมเก็บข้อมูลให้ครบสมบูรณ์ก่อนกดยืนยันส่งคำร้อง' 
                  : '* Please complete all fields containing (*) and agree to the storage consent terms above to submit.'}
              </p>
            )}
          </div>
          </>
          )}
        </form>
      </div>
    </motion.div>
  );
}
