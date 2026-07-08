/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  Calendar, 
  User, 
  ArrowRight, 
  AlertCircle,
  Hash,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { ReservationRequest, RequestStatus } from '../types';
import { getStatusByStudentId } from '../services/api';

interface StatusCheckSectionProps {
  initialStudentId?: string;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}


import { useTranslation } from '../contexts/LanguageContext';

export default function StatusCheckSection({ initialStudentId = '', showToast }: StatusCheckSectionProps) {
  const { t, isTh } = useTranslation();

  const getTabLabel = (tab: string) => {
    if (tab === 'ทั้งหมด') return isTh ? 'ทั้งหมด' : 'All';
    if (tab === 'รอดำเนินการ') return isTh ? 'รอดำเนินการ' : 'Pending';
    if (tab === 'อนุมัติแล้ว') return isTh ? 'อนุมัติแล้ว' : 'Approved';
    if (tab === 'ไม่อนุมัติ') return isTh ? 'ไม่อนุมัติ' : 'Rejected';
    return tab;
  };

  const [studentId, setStudentId] = useState(initialStudentId);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<ReservationRequest[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ทั้งหมด' | RequestStatus>('ทั้งหมด');

  const currentBEYear = new Date().getFullYear() + 543;
  const [selectedYear, setSelectedYear] = useState<number>(currentBEYear);

  // Get unique BE years from results (always includes currentBEYear)
  const availableYears = React.useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentBEYear);
    results.forEach(r => {
      try {
        const year = new Date(r.createdAt).getFullYear() + 543;
        if (!isNaN(year)) {
          yearsSet.add(year);
        }
      } catch (e) {}
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [results, currentBEYear]);

  // Filter results for the selected year
  const resultsForYear = React.useMemo(() => {
    return results.filter(r => {
      try {
        const year = new Date(r.createdAt).getFullYear() + 543;
        return year === selectedYear;
      } catch (e) {
        return selectedYear === currentBEYear;
      }
    });
  }, [results, selectedYear, currentBEYear]);

  // Automatically fetch if initialized with a studentId
  useEffect(() => {
    if (initialStudentId) {
      setStudentId(initialStudentId);
      performSearch(initialStudentId);
    }
  }, [initialStudentId]);

  const performSearch = async (targetId: string) => {
    if (!targetId.trim()) {
      showToast('กรุณากรอกรหัสนักศึกษาเพื่อใช้ตรวจสอบสถานะ', 'warning');
      return;
    }
    
    if (!/^\d{9}$/.test(targetId.trim())) {
      showToast('รหัสนักศึกษาต้องประกอบด้วยตัวเลข 9 หลักเท่านั้น', 'warning');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await getStatusByStudentId(targetId.trim());
      if (response.success) {
        // Sort by newest first (newest createdAt at index 0)
        const sortedData = [...response.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setResults(sortedData);
        if (sortedData.length > 0) {
          // Auto-expand the newest request
          setExpandedId(sortedData[0].id);
          showToast(`พบคำร้องจำนวน ${sortedData.length} รายการสำหรับนักศึกษานี้`, 'success');
        } else {
          showToast('ไม่พบข้อมูลคำร้องของรหัสนักศึกษานี้', 'info');
        }
      } else {
        showToast(response.error || 'ไม่สามารถดึงข้อมูลได้สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการตรวจสอบสถานะ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(studentId);
  };

  
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isTh) {
        return d.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' น.';
      } else {
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {
      return isoString;
    }
  };
const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'รอดำเนินการ':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            {isTh ? "รอดำเนินการ" : "Pending"}
          </span>
        );
      case 'อนุมัติแล้ว':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-fade-in">
            <CheckCircle className="w-3.5 h-3.5" />
            {isTh ? "อนุมัติแล้ว" : "Approved"}
          </span>
        );
      case 'ไม่อนุมัติ':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            {isTh ? "ไม่อนุมัติ" : "Rejected"}
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto space-y-6"
      id="status-check-container"
    >
      {/* Search Header card */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8 border border-slate-200 flex flex-col gap-3.5 sm:gap-5">
        <div className="text-center md:text-left">
          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-1.5 h-6 bg-mangosteen rounded-full"></div>
            <h2 className="text-xl font-extrabold tracking-tight text-mangosteen font-sans underline decoration-2 underline-offset-8">
              {t('statusTitle')}
            </h2>
          </div>
          <p className="text-slate-500 text-xs font-sans">
            {t('statusDesc')}
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3" id="student-search-form">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              pattern="\d*"
              maxLength={9}
              placeholder={t("statusInputPlaceholder")}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-white text-sm font-sans tracking-wide transition-all focus:outline-hidden focus:border-mangosteen focus:ring-4 focus:ring-mangosteen/20"
              id="search-student-id"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-mangosteen hover:bg-mangosteen-hover active:scale-[0.98] text-white rounded-xl text-sm font-bold tracking-wide font-sans shadow-md flex items-center justify-center gap-2 shrink-0 transition-all cursor-pointer"
            id="btn-trigger-search"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {t('statusSearchButton')}
          </button>
        </form>
      </div>

      {/* Results / Skeletons Grid */}
      <div id="status-results-panel">
        {loading ? (
          /* Skeletons */
          <div className="space-y-4">
            {[1, 2].map(n => (
              <div key={n} className="bg-white rounded-xl p-5 border border-slate-100 animate-pulse space-y-3">
                <div className="flex justify-between items-start animate-pulse">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded-md w-1/4"></div>
                    <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                  </div>
                  <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                </div>
                <div className="border-t border-slate-100 pt-3 flex gap-4">
                  <div className="h-3 bg-slate-150 rounded-md w-1/5"></div>
                  <div className="h-3 bg-slate-150 rounded-md w-1/5"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {hasSearched && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 sm:space-y-4"
              >
                {results.length > 0 ? (
                  <div className="space-y-4">
                    {/* 📅 ตัวเลือกปี พ.ศ. (Year Selector) */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-3xs" id="status-year-selector">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-mangosteen animate-pulse" />
                          {isTh ? 'ปีที่ยื่นคำร้อง (พ.ศ.)' : 'Submission Year (C.E.)'}
                        </h4>
                        <p className="text-xs text-slate-400 font-sans">
                          {isTh ? 'เลือกเพื่อตรวจสอบข้อมูลย้อนหลังแยกตามรายปี พ.ศ. ของข้อมูลคำร้อง' : 'Select a year to review historical request data'}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {availableYears.map((yr) => {
                          const isActive = selectedYear === yr;
                          const yrCount = results.filter(r => {
                            try {
                              return (new Date(r.createdAt).getFullYear() + 543) === yr;
                            } catch (e) {
                              return yr === currentBEYear;
                            }
                          }).length;
                          
                          return (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => {
                                setSelectedYear(yr);
                                setStatusFilter('ทั้งหมด');
                              }}
                              className={`px-3 py-1.5 text-xs font-sans font-bold rounded-lg border transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-mangosteen text-white border-mangosteen shadow-xs ring-2 ring-mangosteen/20' 
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <span>{isTh ? yr : yr - 543}</span>
                              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {yrCount}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status Filter Tabs / Pills */}
                    <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60" id="status-filter-tabs">
                      {(['ทั้งหมด', 'รอดำเนินการ', 'อนุมัติแล้ว', 'ไม่อนุมัติ'] as const).map((tab) => {
                        const count = tab === 'ทั้งหมด' 
                          ? resultsForYear.length 
                          : resultsForYear.filter(r => r.status === tab).length;
                        
                        const isActive = statusFilter === tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setStatusFilter(tab)}
                            className={`flex-1 min-w-[70px] sm:min-w-[90px] text-xs py-2 px-2.5 sm:px-3 text-center rounded-xl font-sans font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isActive 
                                ? 'bg-white text-mangosteen shadow-xs border border-slate-200/50 font-extrabold' 
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                            }`}
                          >
                            <span>{getTabLabel(tab)}</span>
                            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                              isActive ? 'bg-mangosteen/10 text-mangosteen' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Results Cards List */}
                    <div className="space-y-4">
                      {resultsForYear
                        .filter(request => statusFilter === 'ทั้งหมด' ? true : request.status === statusFilter)
                        .map((request, idx) => {
                          const isNewestGlobal = results[0]?.id === request.id;
                          const coursesArray = (request.courses && request.courses.length > 0) ? request.courses : [{
                            courseCode: request.courseCode || '',
                            courseName: request.courseName || '',
                            section: request.section || '',
                            instructor: request.instructor || '',
                            status: request.status || 'รอดำเนินการ',
                            rejectionReason: request.rejectionReason
                          }];

                          return (
                            <motion.div
                              key={request.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-white rounded-2xl shadow-xs border border-slate-200 hover:border-mangosteen/30 hover:shadow-md transition-all p-5 space-y-4 relative overflow-hidden"
                              id={`request-status-card-${request.id}`}
                            >
                              {/* Left status colored accent strip */}
                              <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                                request.status === 'รอดำเนินการ' 
                                  ? 'bg-amber-400' 
                                  : request.status === 'อนุมัติแล้ว' 
                                    ? 'bg-emerald-500' 
                                    : 'bg-rose-500'
                              }`}></div>

                              {/* Student Name Header and Submission date */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 pl-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-base font-extrabold text-slate-800 font-sans flex items-center gap-2">
                                      <User className="w-4.5 h-4.5 text-mangosteen" />
                                      {request.fullName}
                                    </span>
                                    {isNewestGlobal && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-200/50">
                                        {isTh ? 'ล่าสุด' : 'Latest'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-slate-400 font-sans">
                                    <Clock className="w-3.5 h-3.5 text-slate-350" />
                                    <span>{isTh ? 'ยื่นเมื่อ' : 'Submitted:'} {formatDate(request.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {getStatusBadge(request.status)}
                                </div>
                              </div>

                              {/* Course Cards / Main Details */}
                              <div className="space-y-3 pl-2">
                                {coursesArray.map((course, cIdx) => {
                                  const courseStatus = course.status || request.status || 'รอดำเนินการ';
                                  return (
                                    <div 
                                      key={cIdx}
                                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2.5 transition-all"
                                    >
                                      {/* Course code & Name with Course Status */}
                                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">
                                            {course.courseCode}
                                          </span>
                                          <span className="text-sm font-extrabold text-slate-800">
                                            {course.courseName}
                                          </span>
                                        </div>

                                        <div className="shrink-0">
                                          {courseStatus === 'อนุมัติแล้ว' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none shadow-3xs">{isTh ? "อนุมัติแล้ว" : "Approved"}</span>
                                          ) : courseStatus === 'ไม่อนุมัติ' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200 leading-none shadow-3xs">{isTh ? "ไม่อนุมัติ" : "Rejected"}</span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50/50 text-amber-700 border border-amber-250 leading-none shadow-3xs">{isTh ? "รอดำเนินการ" : "Pending"}</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Section & Instructor details */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-500 font-sans border-t border-slate-200/40">
                                        <div>
                                          {isTh ? 'กลุ่มเรียน (Section):' : 'Section:'} <span className="font-extrabold text-mangosteen font-mono text-sm">{course.section}</span>
                                        </div>
                                        <div>
                                          {isTh ? 'อาจารย์ผู้สอน:' : 'Instructor:'} <span className="font-semibold text-slate-700">{course.instructor || (isTh ? 'ไม่ระบุ' : 'N/A')}</span>
                                        </div>
                                      </div>

                                      {/* Course level notes */}
                                      {courseStatus === 'ไม่อนุมัติ' && course.rejectionReason && (
                                        <div className="text-xs font-medium text-rose-800 bg-rose-50/50 border border-rose-100 p-2 rounded-lg flex gap-1.5 items-start">
                                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                          <div>
                                            <span className="font-bold">{isTh ? 'หมายเหตุ:' : 'Remark:'}</span> {course.rejectionReason}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Overall rejection reason if entire request was rejected */}
                              {request.status === 'ไม่อนุมัติ' && request.rejectionReason && (
                                <div className="text-xs font-medium text-rose-800 bg-rose-50/50 border border-rose-200/50 p-3 rounded-xl flex gap-2 items-start ml-2">
                                  <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold block mb-0.5 text-rose-900 text-xs">{isTh ? 'หมายเหตุจากเจ้าหน้าที่ (ภาพรวม):' : 'Officer Rejection Comment (Overall):'}</span>
                                    <div className="text-rose-950 font-semibold">{request.rejectionReason}</div>
                                  </div>
                                </div>
                              )}

                              {/* Overall additional notes if request is pending or approved but has extra feedback */}
                              {request.status !== 'ไม่อนุมัติ' && request.rejectionReason && (
                                <div className="text-xs font-medium text-slate-700 bg-slate-50/80 border border-slate-200/50 p-3 rounded-xl flex gap-2 items-start ml-2">
                                  <AlertCircle className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold block mb-0.5 text-slate-600 text-xs">{isTh ? 'บันทึกเพิ่มเติมจากเจ้าหน้าที่:' : 'Additional Note:'}</span>
                                    <div className="text-slate-800 font-medium">{request.rejectionReason}</div>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}

                    {/* Fallback when no item matches current filter */}
                    {resultsForYear.filter(request => statusFilter === 'ทั้งหมด' ? true : request.status === statusFilter).length === 0 && (
                      <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-150 font-sans space-y-2">
                        <Filter className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
                        <h5 className="font-bold text-slate-700">ไม่มีประวัติคำร้องในสถานะนี้</h5>
                        <p className="text-xs text-slate-400">
                          {isTh ? `คุณไม่มีประวัติการส่งคำร้องที่มีสถานะเป็น "${statusFilter}" ในปี พ.ศ. ${selectedYear}` : `No records found with status "${getTabLabel(statusFilter)}" in year ${selectedYear - 543}`}
                        </p>
                      </div>
                    )}
                    </div> {/* Close results list div */}
                  </div>
                ) : (
                  /* No results fallback design */
                  <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-4" id="no-status-results">
                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
                      <Search className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 font-sans text-base">{t('statusNoRecords')}</h4>
                      <p className="text-slate-400 text-xs font-sans mt-1 max-w-sm mx-auto">
                        {t('statusNoRecordsSub')}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
