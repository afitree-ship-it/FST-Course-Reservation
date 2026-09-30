/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudUpload, 
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
  Trash2,
  Mail
} from 'lucide-react';
import { YEARS, ReservationRequest, CoStudent, CourseInput } from '../types';
import { submitRequest, getStatusByStudentId, getCachedRequestsByStudentId, getRemoteSettings } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';
import { Calendar, Bell, Lock, ShieldAlert, Users, UserPlus } from 'lucide-react';
import ScrambleText from './ScrambleText';

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
  const [courses, setCourses] = useState<Array<{
    courseCode: string;
    courseName: string;
    section: string;
    instructor: string;
    coStudents?: CoStudent[];
  }>>([
    { courseCode: '', courseName: '', section: '', instructor: '', coStudents: [] }
  ]);
  const [proofType, setProofType] = useState<'file' | 'link'>('file');
  const [facebookProofLink, setFacebookProofLink] = useState('');
  const [facebookProofFile, setFacebookProofFile] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
  const [isProofAutoRestored, setIsProofAutoRestored] = useState(false);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(true);

  // Student notification choice states
  const [notifyChannel] = useState<'email'>('email');
  const [notifyContact, setNotifyContact] = useState('');
  // Prefetch data when student ID reaches 9 digits to make it feel instant
  useEffect(() => {
    if (studentId.trim().length === 9 && isStudentIdValid(studentId)) {
      getStatusByStudentId(studentId.trim());
    }
  }, [studentId]);

  // โหลดอีเมลเดิมที่เคยกรอกไว้เพื่อความสะดวก
  useEffect(() => {
    const savedEmail = localStorage.getItem('notify_contact_email');
    if (savedEmail) {
      setNotifyContact(savedEmail);
    }
  }, []);

  // System schedule & opening states
  const [systemOpenStatus, setSystemOpenStatus] = useState<{
    isOpen: boolean;
    mode: 'always_open' | 'scheduled' | 'closed';
    startDate?: string;
    endDate?: string;
    message?: string;
    loading: boolean;
  }>({
    isOpen: true,
    mode: 'always_open',
    loading: true
  });

  // Flow states
  const [step, setStep] = useState<1 | 2>(1);
  const [checkingStudentId, setCheckingStudentId] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  // Errors feedback (touched validation)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch opening schedule on mount
  useEffect(() => {
    getRemoteSettings().then(settings => {
      const mode = (settings.system_opening_mode as any) || 'always_open';
      const start = settings.system_open_start || '';
      const end = settings.system_open_end || '';
      const message = settings.system_closed_message || '';

      const now = new Date();
      let isOpen = true;

      if (mode === 'closed') {
        isOpen = false;
      } else if (mode === 'scheduled') {
        const startTime = start ? new Date(start).getTime() : 0;
        const endTime = end ? new Date(end).getTime() : Infinity;
        const currentTime = now.getTime();
        isOpen = currentTime >= startTime && currentTime <= endTime;
      }

      setSystemOpenStatus({
        isOpen,
        mode,
        startDate: start,
        endDate: end,
        message,
        loading: false
      });
    }).catch(() => {
      setSystemOpenStatus(prev => ({ ...prev, loading: false }));
    });
  }, []);

  // Form validations
  const isStudentIdValid = (id: string) => /^\d{9}$/.test(id.trim());
  const isPhoneValid = (ph: string) => /^0\d{9}$/.test(ph.trim()); 
  const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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

  useEffect(() => {
    if (step === 2) {
      if (window.history.state?.formStep !== 2) {
        try {
          window.history.pushState({ tab: 'reserve', formStep: 2 }, '', '#step2');
        } catch (e) {}
      }

      const handlePopState = (e: PopStateEvent) => {
        // When popped back to step 1 (or any state that isn't formStep 2)
        if (!e.state || e.state.formStep !== 2) {
          setStep(1);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
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

  // Smart formatting for Thai names & academic titles
  // Solves mobile keyboard issue where pressing '.' emits a space, and PC Thai keyboard where '.' emits 'ใ'
  const autoFormatThaiNameOrTitle = (val: string): string => {
    return val
      // Replace 'ใ' that mistakenly follows abbreviations (PC Thai keyboard '.' key = 'ใ')
      .replace(/(ผศ|รศ|ศ|ดร|อ|นส|น\.ส)ใ/g, '$1.')
      // Replace space right after common Thai academic/honorific abbreviations with a dot
      .replace(/^(\s*ผศ)\s+/g, '$1.')
      .replace(/^(\s*รศ)\s+/g, '$1.')
      .replace(/^(\s*ศ)\s+/g, '$1.')
      .replace(/^(\s*ดร)\s+/g, '$1.')
      .replace(/^(\s*อ)\s+/g, '$1.')
      .replace(/^(\s*นส)\s+/g, '$1.')
      .replace(/^(\s*น\.ส)\s+/g, '$1.')
      // Also handle compound titles like ผศ.ดร or รศ.ดร
      .replace(/(ผศ\.)(ดร)\s+/g, '$1$2.')
      .replace(/(รศ\.)(ดร)\s+/g, '$1$2.');
  };

  const handleCourseChange = (index: number, field: string, value: string) => {
    let finalValue = value;
    if (field === 'instructor') {
      finalValue = autoFormatThaiNameOrTitle(value);
    }
    setCourses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: finalValue };
      return updated;
    });
  };

  const addCourseField = () => {
    setCourses(prev => [...prev, { courseCode: '', courseName: '', section: '', instructor: '', coStudents: [] }]);
  };

  const removeCourseField = (index: number) => {
    if (courses.length > 1) {
      setCourses(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddCoStudent = (courseIndex: number) => {
    setCourses(prev => {
      const updated = [...prev];
      const currentCo = updated[courseIndex].coStudents || [];
      updated[courseIndex] = {
        ...updated[courseIndex],
        coStudents: [...currentCo, { studentId: '', fullName: '' }]
      };
      return updated;
    });
  };

  const handleRemoveCoStudent = (courseIndex: number, coStudentIndex: number) => {
    setCourses(prev => {
      const updated = [...prev];
      const currentCo = updated[courseIndex].coStudents || [];
      updated[courseIndex] = {
        ...updated[courseIndex],
        coStudents: currentCo.filter((_, idx) => idx !== coStudentIndex)
      };
      return updated;
    });
  };

  const handleCoStudentChange = (
    courseIndex: number,
    coStudentIndex: number,
    field: 'studentId' | 'fullName',
    value: string
  ) => {
    setCourses(prev => {
      const updated = [...prev];
      const currentCo = [...(updated[courseIndex].coStudents || [])];
      currentCo[coStudentIndex] = {
        ...currentCo[coStudentIndex],
        [field]: value
      };
      updated[courseIndex] = {
        ...updated[courseIndex],
        coStudents: currentCo
      };
      return updated;
    });
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

    if (!notifyContact.trim()) {
      errors.notifyContact = isTh ? 'กรุณากรอกอีเมลสำหรับรับแจ้งเตือน' : 'Please enter your email address.';
    } else if (!isEmailValid(notifyContact)) {
      errors.notifyContact = isTh ? 'รูปแบบอีเมลไม่ถูกต้อง' : 'Invalid email format.';
    }

    courses.forEach((course, index) => {
      if (!course.courseCode.trim()) errors[`courseCode_${index}`] = t('errCourseCode');
      if (!course.courseName.trim()) errors[`courseName_${index}`] = t('errCourseName');
      if (!course.section.trim()) errors[`section_${index}`] = t('errSec');
      if (!course.instructor.trim()) errors[`instructor_${index}`] = t('errInstructor');

      if (course.coStudents && course.coStudents.length > 0) {
        course.coStudents.forEach((cs, csIdx) => {
          if (!cs.studentId.trim()) {
            errors[`coStudent_id_${index}_${csIdx}`] = isTh ? 'กรุณากรอกรหัสนักศึกษาเพื่อน' : 'Enter friend student ID';
          } else if (!isStudentIdValid(cs.studentId)) {
            errors[`coStudent_id_${index}_${csIdx}`] = isTh ? 'รหัสต้องมี 9 หลัก' : 'Must be 9 digits';
          } else if (cs.studentId.trim() === studentId.trim()) {
            errors[`coStudent_id_${index}_${csIdx}`] = isTh ? 'รหัสตรงกับผู้กรอกหลัก' : 'Matches primary student ID';
          }

          if (!cs.fullName.trim()) {
            errors[`coStudent_name_${index}_${csIdx}`] = isTh ? 'กรุณากรอกชื่อเพื่อน' : 'Enter friend name';
          }
        });
      }
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

    const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(isTh ? 'กรุณาอัปโหลดเฉพาะไฟล์รูปภาพ (PNG, JPG, JPEG, etc.)' : 'Please upload image files only (PNG, JPG, JPEG).', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(isTh ? 'ขนาดไฟล์ใหญ่เกินไป จำกัดที่ 10MB' : 'File size is too large (must be under 10MB).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        let maxDim = 800; // เริ่มบีบที่ 800px

        const compress = () => {
          let currentWidth = width;
          let currentHeight = height;
          if (currentWidth > currentHeight) {
            if (currentWidth > maxDim) {
              currentHeight *= maxDim / currentWidth;
              currentWidth = maxDim;
            }
          } else {
            if (currentHeight > maxDim) {
              currentWidth *= maxDim / currentHeight;
              currentHeight = maxDim;
            }
          }

          canvas.width = currentWidth;
          canvas.height = currentHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
            let quality = 0.7;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            // บีบอัดจนกว่าขนาด String Base64 จะน้อยกว่า 45,000 ตัวอักษร (ข้อจำกัด Google Sheets 50,000)
            while (compressedDataUrl.length > 45000 && quality > 0.1) {
              quality -= 0.15;
              compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            
            // ถ้ายอมลดคุณภาพสุดๆ แล้วยังใหญ่ไป ให้ลดขนาดแกน (Dimension) ลงอีกครึ่งนึง
            if (compressedDataUrl.length > 45000 && maxDim > 200) {
              maxDim -= 200;
              compress();
              return;
            }

            setFacebookProofFile({
              name: file.name,
              type: 'image/jpeg',
              dataUrl: compressedDataUrl
            });
            setIsProofAutoRestored(false);
            try {
              const saveObj = {
                proofType: 'file',
                facebookProofFile: {
                  name: file.name,
                  type: 'image/jpeg',
                  dataUrl: compressedDataUrl
                },
                facebookProofLink: ''
              };
              if (studentId.trim()) {
                localStorage.setItem('saved_proof_' + studentId.trim(), JSON.stringify(saveObj));
              }
              localStorage.setItem('saved_proof_last', JSON.stringify(saveObj));
            } catch (err) {
              // ignore quota
            }
            showToast(isTh ? 'อัปโหลดและประมวลผลไฟล์รูปภาพเรียบร้อย' : 'Screenshot uploaded and processed successfully.', 'success');
          } else {
            showToast(isTh ? 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ' : 'Error processing image.', 'error');
          }
        };
        
        compress();
      };
      img.onerror = () => {
        showToast(isTh ? 'เกิดข้อผิดพลาดในการโหลดรูปภาพ' : 'Error loading image.', 'error');
      };
      img.src = e.target?.result as string;
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

  const getDirectImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('data:image/') || url.startsWith('blob:')) return url;
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
    }
    return url;
  };

  const clearFile = () => {
    setFacebookProofFile(null);
    setIsProofAutoRestored(false);
    try {
      if (studentId.trim()) {
        localStorage.removeItem('saved_proof_' + studentId.trim());
      }
      localStorage.removeItem('saved_proof_last');
    } catch (e) {
      // ignore
    }
  };

  const restoreProofData = (id: string, remoteData?: ReservationRequest): boolean => {
    try {
      // 1. Check local storage for this student or last saved proof (fastest and retains high-res base64)
      const savedRaw = (id ? localStorage.getItem('saved_proof_' + id) : null) || localStorage.getItem('saved_proof_last');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed.proofType === 'file' && parsed.facebookProofFile?.dataUrl) {
          setProofType('file');
          setFacebookProofFile(parsed.facebookProofFile);
          setIsProofAutoRestored(true);
          return true;
        } else if (parsed.proofType === 'link' && parsed.facebookProofLink) {
          setProofType('link');
          setFacebookProofLink(parsed.facebookProofLink);
          setIsProofAutoRestored(true);
          return true;
        }
      }
    } catch (err) {
      // ignore JSON parse error
    }

    // 2. Check remote record from past requests
    if (remoteData) {
      if (remoteData.proofType === 'link' && remoteData.facebookProofLink) {
        setProofType('link');
        setFacebookProofLink(remoteData.facebookProofLink);
        setIsProofAutoRestored(true);
        return true;
      } else if (remoteData.facebookProofFile && remoteData.facebookProofFile.dataUrl) {
        setProofType('file');
        setFacebookProofFile(remoteData.facebookProofFile);
        setIsProofAutoRestored(true);
        return true;
      } else if (remoteData.proofType === 'file' && remoteData.facebookProofLink) {
        // GAS saves drive URL in facebookProofLink
        const driveUrl = remoteData.facebookProofLink;
        setProofType('file');
        setFacebookProofFile({
          name: isTh ? 'รูปโปรไฟล์ Facebook จากคำร้องเดิม' : 'Previous Facebook Profile Proof',
          type: 'image/jpeg',
          dataUrl: driveUrl
        });
        setIsProofAutoRestored(true);
        return true;
      }
    }

    setIsProofAutoRestored(false);
    return false;
  };

  const handleCheckStudentId = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ studentId: true });
    
    if (!studentId.trim() || !isStudentIdValid(studentId)) {
      showToast(isTh ? 'กรุณากรอกรหัสนักศึกษา 9 หลักให้ถูกต้อง' : 'Please enter a valid 9-digit student ID', 'warning');
      return;
    }

    setCheckingStudentId(true);

    const cached = getCachedRequestsByStudentId(studentId.trim());
    if (cached && cached.length > 0) {
      const sortedData = [...cached].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latest = sortedData[0];
      setFullName(String(latest.fullName || ''));
      setFaculty(String(latest.faculty || ''));
      setDepartment(String(latest.department || ''));
      setYear(String(latest.year || ''));
      setPhone(String(latest.phone || ''));
      if (latest.notifyContact) setNotifyContact(String(latest.notifyContact));
      restoreProofData(studentId.trim(), latest);
      setHasProfile(true);
      setTouched({});
      setStep(2);
      setCheckingStudentId(false);
      return;
    }

    try {
      const res = await getStatusByStudentId(studentId.trim());
      setTouched({}); 
      if (res.success && res.data && res.data.length > 0) {
        const latest = res.data[0];
        setFullName(String(latest.fullName || ''));
        setFaculty(String(latest.faculty || ''));
        setDepartment(String(latest.department || ''));
        setYear(String(latest.year || ''));
        setPhone(String(latest.phone || ''));
        if (latest.notifyContact) setNotifyContact(String(latest.notifyContact));
        restoreProofData(studentId.trim(), latest);
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
        setNotifyContact('');
        setHasProfile(false);
        // Check if this browser has a saved proof of contact from earlier
        restoreProofData(studentId.trim());
      }
      setStep(2);
    } catch (err) {
      setFullName('');
      setFaculty('');
      setDepartment('');
      setYear('');
      setPhone('');
      setCourses([{ courseCode: '', courseName: '', section: '', instructor: '' }]);
      setFacebookProofLink('');
      setFacebookProofFile(null);
      setNotifyContact('');
      setHasProfile(false);
      // Check if this browser has a saved proof of contact from earlier
      restoreProofData(studentId.trim());
      setTouched({});
      setStep(2);
    } finally {
      setCheckingStudentId(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!systemOpenStatus.isOpen) {
      showToast(isTh ? 'ขณะนี้ระบบปิดรับคำร้องสำรองที่นั่ง' : 'System is currently closed for seat reservation requests.', 'error');
      return;
    }

    const submitTouched: Record<string, boolean> = {
      fullName: true,
      studentId: true,
      department: true,
      year: true,
      notifyContact: true,
      facebookProofLink: true,
      facebookProofFile: true,
      phone: true,
      consent: true,
    };
    courses.forEach((c, idx) => {
      submitTouched[`courseCode_${idx}`] = true;
      submitTouched[`courseName_${idx}`] = true;
      submitTouched[`section_${idx}`] = true;
      submitTouched[`instructor_${idx}`] = true;
      if (c.coStudents) {
        c.coStudents.forEach((_, csIdx) => {
          submitTouched[`coStudent_id_${idx}_${csIdx}`] = true;
          submitTouched[`coStudent_name_${idx}_${csIdx}`] = true;
        });
      }
    });
    setTouched(submitTouched);

    if (!isValidForm) {
      showToast(t('toastFillError'), 'warning');
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.border-rose-300, .text-rose-500');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
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
        instructor: c.instructor.trim(),
        coStudents: (c.coStudents || [])
          .filter(cs => cs.studentId.trim() && cs.fullName.trim())
          .map(cs => ({
            studentId: cs.studentId.trim(),
            fullName: cs.fullName.trim()
          }))
      })),
      proofType,
      facebookProofLink: proofType === 'link' ? facebookProofLink : undefined,
      facebookProofFile: proofType === 'file' && facebookProofFile ? facebookProofFile : undefined,
      phone: phone.trim(),
      consent,
      notifyChannel: 'email' as const,
      notifyContact: notifyContact.trim(),
      language: language // 👈 ส่งค่าภาษาปัจจุบัน (เช่น 'th' หรือ 'en') ไปให้ Backend
    };

    try {
      const response = await submitRequest(submitPayload);
      if (response.success && response.data) {
        localStorage.setItem('notify_contact_email', notifyContact.trim());

        // Remember contact proof (image or link)
        try {
          const proofPayload = {
            proofType,
            facebookProofLink: proofType === 'link' ? facebookProofLink.trim() : '',
            facebookProofFile: proofType === 'file' && facebookProofFile ? facebookProofFile : null
          };
          if (studentId.trim()) {
            localStorage.setItem('saved_proof_' + studentId.trim(), JSON.stringify(proofPayload));
          }
          localStorage.setItem('saved_proof_last', JSON.stringify(proofPayload));
        } catch (proofErr) {
          // ignore storage quota error
        }

        showToast(isTh ? 'ส่งคำร้องขอดำเนินการเรียบร้อยแล้ว!' : 'Seat reservation requested successfully!', 'success');
        onSuccess(studentId.trim(), response.data);
      } else {
        showToast(response.error || (isTh ? 'ส่งข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง' : 'Submission failed. Please try again.'), 'error');
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
      
      {/* 🚀 Submission Progress Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-mangosteen/10 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 border-4 border-mangosteen/30 rounded-full border-t-mangosteen animate-spin"></div>
                <CloudUpload className="w-8 h-8 text-mangosteen relative z-10 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 font-sans mb-2">
                {isTh ? 'กำลังอัปโหลดคำร้องของคุณ' : 'Submitting Your Request'}
              </h3>
              <p className="text-slate-500 font-sans text-sm mb-6">
                {isTh ? 'กรุณารอสักครู่ ระบบกำลังส่งข้อมูลไปยังฐานข้อมูล (เสร็จสิ้นใน 1 วินาที)...' : 'Please wait, transmitting data to server (approx. 1 second)...'}
              </p>
              
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '90%' }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="absolute top-0 left-0 h-full bg-mangosteen rounded-full"
                ></motion.div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-3 font-medium uppercase tracking-widest animate-pulse">CONNECTING TO GOOGLE SHEETS...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`relative transition-all duration-300 ${step === 1 ? 'max-w-xl mx-auto' : 'w-full'}`}>
        {/* Soft Ambient Brand Glow Behind the Card */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-mangosteen/15 via-rose-300/20 to-mangosteen/15 rounded-3xl sm:rounded-[2rem] blur-xl opacity-75 -z-10" />

        <div className="bg-white/85 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_-15px_rgba(122,31,43,0.12),_0_10px_25px_-10px_rgba(0,0,0,0.04)] overflow-hidden border border-white/90 transition-all duration-300">
          {step !== 1 && (
            <div className="p-5 sm:p-7 md:p-8 border-b border-slate-100/90 bg-gradient-to-r from-slate-50/80 via-white/50 to-slate-50/80 backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2.5 mb-1.5">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-[#7A1F2B] to-[#9E2A3B] rounded-full shadow-xs"></div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 font-sans">{t('formTitle')}</h2>
                  </div>
                  <p className="text-slate-500 text-xs sm:text-sm font-sans tracking-wide">
                    {t('formSubtitle')}
                  </p>
                </div>

                {/* ID badge & change ID action button */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold font-mono shadow-2xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ID: {studentId}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={goBackToStep1}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-mangosteen border border-slate-200/80 hover:border-mangosteen/30 text-xs font-semibold font-sans transition-all shadow-2xs cursor-pointer active:scale-95"
                    title={isTh ? 'เปลี่ยนรหัสนักศึกษา' : 'Change Student ID'}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isTh ? 'เปลี่ยนรหัส' : 'Change ID'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={step === 1 ? handleCheckStudentId : handleSubmit} className={`${step === 1 ? 'p-6 sm:p-10 space-y-6 sm:space-y-8' : 'p-5 sm:p-8 space-y-8'}`} id="scitech-reserve-form">
            {!systemOpenStatus.isOpen && (
              <div className="bg-rose-50/90 border border-rose-200/80 rounded-2xl p-4 sm:p-5 text-rose-800 shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-rose-100 rounded-xl text-rose-600 shrink-0 mt-0.5 shadow-2xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm sm:text-base text-rose-900 font-sans">
                      {isTh ? 'ขณะนี้ระบบปิดรับคำร้องสำรองที่นั่งวิชาเรียน' : 'System Closed for Seat Reservation'}
                    </h4>
                    <p className="text-xs sm:text-sm text-rose-700 leading-relaxed font-sans">
                      {systemOpenStatus.message || (isTh ? 'อยู่นอกกำหนดเวลาการรับคำร้อง หรือเจ้าหน้าที่ปิดการรับคำร้องชั่วคราว' : 'Currently outside the scheduled reservation period or temporarily closed by administrator.')}
                    </p>
                    {systemOpenStatus.mode === 'scheduled' && systemOpenStatus.startDate && (
                      <div className="mt-2 text-xs font-semibold bg-rose-100/90 inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-rose-800 font-sans">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{isTh ? 'กำหนดการรับคำร้อง:' : 'Schedule:'} {new Date(systemOpenStatus.startDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} - {systemOpenStatus.endDate ? new Date(systemOpenStatus.endDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : 'เปิดต่อเนื่อง'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 1 ? (
              <div className="relative space-y-6 sm:space-y-8 py-2 sm:py-4">
                {/* Subtle Ambient Glow inside Card */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-mangosteen/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-mangosteen/10 rounded-full blur-2xl pointer-events-none" />

                <div className="text-center space-y-3 relative z-10">
                  {/* Brand Pill */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-mangosteen/5 border border-mangosteen/15 text-mangosteen text-xs font-semibold shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-mangosteen" />
                    <span>{isTh ? 'คณะวิทยาศาสตร์และเทคโนโลยี • มหาวิทยาลัยฟาฏอนี' : 'Faculty of Science & Technology • Fatoni University'}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 font-sans">
                    {t('formTitle')}
                  </h2>
                  
                  <h3 className="text-sm sm:text-base font-bold text-mangosteen font-sans min-h-[1.5rem] flex items-center justify-center">
                    <ScrambleText text={isTh ? 'กรอกรหัสนักศึกษาเพื่อเริ่มต้น' : 'Enter Student ID to Start'} duration={2800} />
                  </h3>
                  
                  <p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto font-sans leading-relaxed">
                    {isTh ? 'ระบบจะค้นหาและเชื่อมโยงข้อมูลประวัติเดิมของคุณอัตโนมัติ' : 'We will automatically retrieve your student records if available'}
                  </p>
                </div>

                <div className="max-w-xs mx-auto relative z-10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 font-sans px-1">
                    <span>{t('studentIdLabel')} <span className="text-rose-500">*</span></span>
                    <span className={`text-[11px] font-mono font-semibold ${studentId.length === 9 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                      {studentId.length}/9 หลัก
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={9}
                      value={studentId}
                      onChange={e => setStudentId(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => handleBlur('studentId')}
                      placeholder="xxxxxxxxx"
                      className={`w-full px-4 py-3.5 sm:py-4 rounded-2xl border-2 text-center text-lg sm:text-xl font-bold font-mono tracking-[0.25em] sm:tracking-[0.35em] transition-all bg-white/90 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-4 shadow-inner ${
                        touched.studentId && validationErrors.studentId
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                          : 'border-slate-200/90 focus:border-mangosteen focus:ring-mangosteen/15 text-slate-800'
                      }`}
                      id="input-studentId-step1"
                    />
                  </div>
                  {touched.studentId && validationErrors.studentId && (
                    <p className="mt-1 text-xs text-rose-500 font-sans font-medium text-center">{validationErrors.studentId}</p>
                  )}
                </div>

                <div className="pt-2 flex justify-center relative z-10">
                  <button
                    type="submit"
                    disabled={checkingStudentId || !studentId.trim() || studentId.trim().length !== 9}
                    className="w-full max-w-xs py-3.5 px-6 bg-gradient-to-r from-[#7A1F2B] via-[#8E2232] to-[#7A1F2B] hover:brightness-110 active:scale-[0.98] text-white font-bold font-sans rounded-2xl shadow-lg shadow-mangosteen/25 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2.5 cursor-pointer text-sm sm:text-base tracking-wide"
                  >
                    {checkingStudentId ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>{isTh ? 'กำลังค้นหาประวัติ...' : 'Searching Profile...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{isTh ? 'เข้าสู่แบบฟอร์ม' : 'Continue to Form'}</span>
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
                  </div>

                  {hasProfile && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50/70 text-emerald-800 p-3.5 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm font-sans border border-emerald-200/70 shadow-2xs mb-4">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="font-bold">{isTh ? '✨ พบประวัติข้อมูลเดิมของคุณ' : '✨ Profile Found!'}</strong>
                        <p className="opacity-90 text-xs mt-0.5 text-emerald-700">
                          {isTh ? 'เราได้กรอกข้อมูลส่วนตัวและอีเมลให้คุณแล้ว คุณสามารถแก้ไขได้หรือข้ามไปเลือกรายวิชาได้เลย' : 'We have pre-filled your personal info & email. You can edit it or skip directly to selecting courses.'}
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
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck="false"
                        value={fullName}
                        onChange={e => setFullName(autoFormatThaiNameOrTitle(e.target.value))}
                        onBlur={() => handleBlur('fullName')}
                        placeholder={isTh ? 'เช่น นายอับดุลเลาะห์ หรือ น.ส.ฟาตีมะห์' : 'e.g., Mr. Muhammad or Ms. Fatimah'}
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

                  {/* รหัสนักศึกษา */}
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

                  {/* อีเมลสำหรับรับแจ้งเตือน (ย้ายมาไว้ที่นี่) */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-sans">
                      {isTh ? 'อีเมลสำหรับรับแจ้งเตือนผล' : 'Notification Email Address'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4 text-mangosteen" />
                      </div>
                      <input
                        type="email"
                        value={notifyContact}
                        onChange={e => setNotifyContact(e.target.value)}
                        onBlur={() => handleBlur('notifyContact')}
                        placeholder={isTh ? 'เช่น student@ftu.ac.th' : 'e.g., student@ftu.ac.th'}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 text-sm sm:text-base font-medium font-sans transition-all focus:outline-hidden focus:ring-4 bg-slate-50 hover:bg-white ${
                          touched.notifyContact && validationErrors.notifyContact
                            ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/20 text-rose-700'
                            : 'border-slate-200 focus:border-mangosteen focus:ring-mangosteen/20 text-slate-700'
                        }`}
                        id="input-email"
                      />
                    </div>
                    {touched.notifyContact && validationErrors.notifyContact ? (
                      <p className="mt-1 text-xs text-rose-500 font-sans font-medium">{validationErrors.notifyContact}</p>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-400 font-sans">
                        {isTh ? '* ระบบจะบันทึกอีเมลนี้คู่กับรหัสนักศึกษา เพื่อให้ระบบส่งผลการพิจารณาไปให้อัตโนมัติ' : '* We will save this email with your ID for automatic notifications.'}
                      </p>
                    )}
                  </div>

                  {/* เลือกคณะ */}
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

                  {/* สาขาวิชา */}
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
                        itemHover: 'hover:bg-sky-50 hover:text-sky-800',
                        selectedBg: 'bg-sky-50 text-sky-800 font-medium'
                      } : isLiberal ? {
                        accent: 'border-l-orange-500',
                        focusRing: 'focus:ring-orange-500/15',
                        focusBorder: 'focus:border-orange-500',
                        activeText: 'text-orange-700',
                        itemHover: 'hover:bg-orange-50/50 hover:text-orange-850',
                        selectedBg: 'bg-orange-50/50 text-orange-800 font-medium'
                      } : isEdu ? {
                        accent: 'border-l-purple-600',
                        focusRing: 'focus:ring-purple-600/15',
                        focusBorder: 'focus:border-purple-600',
                        activeText: 'text-purple-700',
                        itemHover: 'hover:bg-purple-50 hover:text-purple-800',
                        selectedBg: 'bg-purple-50 text-purple-800 font-medium'
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
                      placeholder="08x-xxx-xxxx"
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
                          placeholder={isTh ? 'เช่น 01 หรือ 02' : 'e.g., 01 or 02'}
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
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck="false"
                          value={course.instructor}
                          onChange={e => handleCourseChange(index, 'instructor', e.target.value)}
                          onBlur={() => handleBlur(`instructor_${index}`)}
                          placeholder={isTh ? 'เช่น ผศ.ดร.อนุวัตร วอลี' : 'e.g., Asst. Prof. Dr. Anuwat Worlee'}
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

                    {/* ส่วนเพิ่มเพื่อนร่วมกลุ่ม (Group Reservation) */}
                    <div className="mt-4 pt-3 border-t border-slate-200/70 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-mangosteen" />
                          <span className="text-xs font-bold text-slate-750 font-sans">
                            {isTh ? 'เพื่อนร่วมสำรองที่นั่งวิชานี้ (ฝากกรอก)' : 'Group Reservation (Friends)'}
                          </span>
                          {(course.coStudents?.length || 0) > 0 && (
                            <span className="text-[11px] bg-mangosteen/10 text-mangosteen font-bold px-2 py-0.5 rounded-full font-mono">
                              +{course.coStudents?.length} {isTh ? 'คน' : 'people'}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-sans">
                          {isTh 
                            ? `รวมขอสำรอง: ${1 + (course.coStudents?.length || 0)} ที่นั่ง`
                            : `Total requested: ${1 + (course.coStudents?.length || 0)} seats`}
                        </span>
                      </div>

                      {/* Friend rows */}
                      {course.coStudents && course.coStudents.length > 0 && (
                        <div className="space-y-2.5 bg-slate-100/70 p-3 rounded-xl border border-slate-200">
                          <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                            {isTh 
                              ? '📌 เพื่อนสามารถนำรหัสนักศึกษาของตนเองไปตรวจสอบสถานะคำร้องได้โดยตรง' 
                              : '📌 Friends can use their own Student ID to check request status anytime.'}
                          </p>
                          {course.coStudents.map((cs, csIdx) => (
                            <div key={csIdx} className="bg-white p-2.5 rounded-lg border border-slate-250 shadow-3xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-mangosteen font-sans">
                                  {isTh ? `เพื่อนคนที่ ${csIdx + 1}` : `Friend #${csIdx + 1}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCoStudent(index, csIdx)}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer text-xs flex items-center gap-1 font-sans"
                                  title={isTh ? 'ลบเพื่อนคนนี้' : 'Remove friend'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-semibold">{isTh ? 'ลบ' : 'Remove'}</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <input
                                    type="text"
                                    value={cs.studentId}
                                    maxLength={9}
                                    onChange={e => handleCoStudentChange(index, csIdx, 'studentId', e.target.value.replace(/\D/g, ''))}
                                    onBlur={() => handleBlur(`coStudent_id_${index}_${csIdx}`)}
                                    placeholder={isTh ? 'รหัสนักศึกษา 9 หลัก' : '9-digit Student ID'}
                                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono font-bold transition-all focus:outline-hidden focus:ring-2 ${
                                      touched[`coStudent_id_${index}_${csIdx}`] && validationErrors[`coStudent_id_${index}_${csIdx}`]
                                        ? 'border-rose-300 bg-rose-50/30 text-rose-700 focus:ring-rose-200'
                                        : 'border-slate-250 bg-slate-50 hover:bg-white text-slate-800 focus:border-mangosteen focus:ring-mangosteen/20'
                                    }`}
                                  />
                                  {touched[`coStudent_id_${index}_${csIdx}`] && validationErrors[`coStudent_id_${index}_${csIdx}`] && (
                                    <p className="mt-1 text-[10px] text-rose-500 font-sans font-medium">
                                      {validationErrors[`coStudent_id_${index}_${csIdx}`]}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <input
                                    type="text"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    value={cs.fullName}
                                    onChange={e => handleCoStudentChange(index, csIdx, 'fullName', autoFormatThaiNameOrTitle(e.target.value))}
                                    onBlur={() => handleBlur(`coStudent_name_${index}_${csIdx}`)}
                                    placeholder={isTh ? 'เช่น นาย/น.ส. ชื่อ นามสกุล' : "e.g., Mr./Ms. Full Name"}
                                    className={`w-full px-3 py-2 rounded-lg border text-xs font-sans font-medium transition-all focus:outline-hidden focus:ring-2 ${
                                      touched[`coStudent_name_${index}_${csIdx}`] && validationErrors[`coStudent_name_${index}_${csIdx}`]
                                        ? 'border-rose-300 bg-rose-50/30 text-rose-700 focus:ring-rose-200'
                                        : 'border-slate-250 bg-slate-50 hover:bg-white text-slate-800 focus:border-mangosteen focus:ring-mangosteen/20'
                                    }`}
                                  />
                                  {touched[`coStudent_name_${index}_${csIdx}`] && validationErrors[`coStudent_name_${index}_${csIdx}`] && (
                                    <p className="mt-1 text-[10px] text-rose-500 font-sans font-medium">
                                      {validationErrors[`coStudent_name_${index}_${csIdx}`]}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add friend button */}
                      <button
                        type="button"
                        onClick={() => handleAddCoStudent(index)}
                        className="w-full py-2 px-3 border border-dashed border-mangosteen/40 hover:border-mangosteen bg-mangosteen/5 hover:bg-mangosteen/10 text-mangosteen text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans active:scale-[0.99]"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>
                          {course.coStudents && course.coStudents.length > 0 
                            ? (isTh ? '+ เพิ่มเพื่อนร่วมกลุ่มอีกคน (ไม่จำกัด)' : '+ Add Another Friend (Unlimited)')
                            : (isTh ? '+ เพิ่มเพื่อนร่วมสำรองที่นั่งวิชานี้ (ฝากกรอก / เพิ่มได้ไม่จำกัด)' : '+ Add Friends to Group Reservation (Unlimited)')}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* ปุ่มเพิ่มวิชา */}
                <button
                  type="button"
                  onClick={addCourseField}
                  className="w-full py-4 bg-white/70 hover:bg-white text-mangosteen border-2 border-dashed border-mangosteen/30 hover:border-mangosteen text-sm font-bold rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2.5 font-sans active:scale-[0.99]"
                >
                  <div className="bg-mangosteen/10 p-1.5 rounded-xl text-mangosteen">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span>{isTh ? 'เพิ่มรายวิชาเรียนที่ต้องการสำรองอีก' : 'Add another course details'}</span>
                </button>
              </div>

              {/* Section 3: ช่องทางสำหรับติดต่อกลับเพื่อยืนยันหรือตรวจสอบข้อมูล */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-mangosteen text-white flex items-center justify-center shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-800 font-sans">
                        {isTh ? 'ช่องทางติดต่อกลับ (แนบรูปโปรไฟล์ Facebook)' : 'Contact Proof (Facebook Profile Screenshot)'}
                      </h3>
                    </div>
                  </div>
                  {isProofAutoRestored && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-3xs">
                      <span>✓</span>
                      <span>{isTh ? 'จดจำเดิม' : 'Auto'}</span>
                    </span>
                  )}
                </div>

                {/* Main Upload Box (Compact for Mobile) */}
                {facebookProofFile ? (
                  /* STATE: มีรูปภาพอัปโหลดแล้ว (ขนาดกะทัดรัด ไม่กินพื้นที่หน้าจอมือถือ) */
                  <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-2.5 sm:p-3 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-emerald-900 font-sans truncate">
                          {isTh ? 'อัปโหลดรูปภาพแล้ว (1 ไฟล์)' : 'Image Uploaded (1 File)'}
                        </span>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full font-mono shrink-0">
                        {isTh ? 'พร้อมส่ง' : 'Ready'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-emerald-200/80">
                      <img
                        src={getDirectImageUrl(facebookProofFile.dataUrl)}
                        alt="Uploaded Profile Proof"
                        className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-md border border-slate-200 bg-slate-50 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-bold text-slate-800 truncate" title={facebookProofFile.name}>
                          {facebookProofFile.name}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-sans">
                          {isTh ? 'แนบส่งพร้อมคำร้อง' : 'Attached with request'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => document.getElementById('fb-image-upload')?.click()}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 font-sans"
                          title={isTh ? 'เปลี่ยนรูป' : 'Change'}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span className="hidden sm:inline">{isTh ? 'เปลี่ยนรูป' : 'Change'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={clearFile}
                          className="p-1.5 sm:px-2.5 sm:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 font-sans"
                          title={isTh ? 'ลบออก' : 'Remove'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isTh ? 'ลบ' : 'Remove'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* STATE: ยังไม่ได้อัปโหลดรูป (กล่องแนวนอนกะทัดรัด แตะเลือกรูปได้ทันที) */
                  <div className="space-y-1.5">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('fb-image-upload')?.click()}
                      className={`border-2 border-dashed rounded-xl p-3 sm:p-4 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs ${
                        isDragOver
                          ? 'border-mangosteen bg-mangosteen/5 scale-[1.01]'
                          : touched.facebookProofFile && validationErrors.facebookProofFile
                            ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
                            : 'border-slate-300 hover:border-mangosteen bg-white hover:bg-mangosteen/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-mangosteen/10 text-mangosteen flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-mangosteen group-hover:text-white transition-all shadow-xs">
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-mangosteen transition-colors font-sans truncate">
                            {isTh ? 'แตะเพื่อเลือกรูปโปรไฟล์ Facebook' : 'Tap to upload Facebook profile photo'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-sans truncate">
                            {isTh ? '1 รูปภาพ • รองรับทุกไฟล์ (JPG, PNG, HEIC ฯลฯ)' : '1 photo • All formats (JPG, PNG, HEIC)'}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-xs font-bold text-mangosteen bg-mangosteen/10 group-hover:bg-mangosteen group-hover:text-white px-2.5 py-1.5 rounded-lg transition-colors font-sans">
                        {isTh ? 'เลือกรูป' : 'Browse'}
                      </span>
                    </div>

                    {touched.facebookProofFile && validationErrors.facebookProofFile && (
                      <p className="text-xs text-rose-500 font-sans font-medium">{validationErrors.facebookProofFile}</p>
                    )}
                  </div>
                )}

                {/* Hidden input for 1 image file */}
                <input
                  type="file"
                  id="fb-image-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Alternative link entry if needed */}
                <div className="pt-0.5">
                  {proofType === 'link' ? (
                    <div className="space-y-1.5 p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700 font-sans">
                          {isTh ? 'ระบุลิงก์โปรไฟล์ Facebook แทน' : 'Paste Facebook Profile Link'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setProofType('file')}
                          className="text-[11px] text-mangosteen font-bold hover:underline cursor-pointer"
                        >
                          {isTh ? '← สลับไปใช้อัปโหลดรูปภาพ' : '← Switch to photo upload'}
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Globe className="w-4 h-4" />
                        </div>
                        <input
                          type="url"
                          value={facebookProofLink}
                          onChange={e => {
                            setFacebookProofLink(e.target.value);
                            setIsProofAutoRestored(false);
                            try {
                              const saveObj = { proofType: 'link', facebookProofFile: null, facebookProofLink: e.target.value };
                              if (studentId.trim()) localStorage.setItem('saved_proof_' + studentId.trim(), JSON.stringify(saveObj));
                              localStorage.setItem('saved_proof_last', JSON.stringify(saveObj));
                            } catch (err) {}
                          }}
                          onBlur={() => handleBlur('facebookProofLink')}
                          placeholder="https://facebook.com/your.username"
                          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm font-sans rounded-lg border border-slate-200 focus:outline-hidden focus:border-mangosteen"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProofType('link')}
                      className="text-[11px] text-slate-400 hover:text-mangosteen transition-colors font-sans cursor-pointer hover:underline"
                    >
                      {isTh ? 'หากไม่สะดวกแนบรูป สามารถคลิกที่นี่เพื่อวางลิงก์โปรไฟล์แทนได้' : 'Cannot upload a photo? Click here to provide URL link instead'}
                    </button>
                  )}
                </div>
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
                      : `I consent and authorize the Faculty of Science and Technology to aggregate, store, and process my academic and personal data specified in this reservation form for student quota queue assignments.`}
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
                    className="w-full sm:w-1/3 py-3.5 sm:py-4 px-6 rounded-2xl font-sans font-bold border-2 border-slate-200/90 text-slate-600 hover:text-slate-800 bg-white/70 hover:bg-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] text-sm"
                    id="btn-back-to-step1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {isTh ? 'ย้อนกลับ' : 'Back'}
                  </button>
                  <button
                     type="submit"
                    disabled={isSubmitting}
                    className={`w-full sm:w-2/3 py-3.5 sm:py-4 px-6 rounded-2xl font-sans font-bold text-white tracking-wide shadow-xl shadow-mangosteen/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer bg-gradient-to-r from-[#7A1F2B] via-[#8E2232] to-[#7A1F2B] hover:brightness-110 active:scale-[0.99] text-sm sm:text-base ${
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
    </div>
  </motion.div>
);
}