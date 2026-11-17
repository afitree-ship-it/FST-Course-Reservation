import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Search, X, Check, ChevronDown, Users } from 'lucide-react';
import { CourseCatalog, CatalogCourse, CatalogSection } from '../types';

/**
 * Modal for students: browse every course the faculty opened this semester (from reg.ftu.ac.th),
 * search by code / Thai / English name / instructor, see sections with instructor, time and seats,
 * and pick a course (or a specific section) to fill the form row.
 */
export default function CourseCatalogBrowser({
  catalog,
  isTh,
  onPick,
  onClose
}: {
  catalog: CourseCatalog;
  isTh: boolean;
  onPick: (course: CatalogCourse, section?: CatalogSection) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [prefix, setPrefix] = useState('all');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const prefixes = useMemo(() => {
    const set = new Set<string>();
    catalog.courses.forEach(c => { const m = c.code.match(/^[A-Z]+/); if (m) set.add(m[0]); });
    return Array.from(set).sort();
  }, [catalog]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.courses.filter(c => {
      if (prefix !== 'all' && !c.code.startsWith(prefix)) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.nameTh.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.sections.some(s => s.instructors.some(i => i.toLowerCase().includes(q)))
      );
    });
  }, [catalog, query, prefix]);

  const primaryName = (c: CatalogCourse) => (isTh ? c.nameTh : c.nameEn || c.nameTh);
  const secondaryName = (c: CatalogCourse) => (isTh ? c.nameEn : c.nameEn ? c.nameTh : '');
  const termLabel = catalog.semester === '3'
    ? (isTh ? `ภาคฤดูร้อน ปีการศึกษา ${catalog.year}` : `Summer ${catalog.year}`)
    : (isTh ? `ภาคเรียนที่ ${catalog.semester} ปีการศึกษา ${catalog.year}` : `Semester ${catalog.semester}/${catalog.year}`);

  // render into <body> so the form card's blur/overflow can't clip this full-screen dialog
  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? 'รายวิชาทั้งหมดของคณะ' : 'All faculty courses'}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-modal overflow-hidden font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-mangosteen" />
                <h3 className="text-base font-extrabold text-slate-800">
                  {isTh ? 'รายวิชาทั้งหมดของคณะวิทยาศาสตร์และเทคโนโลยี' : 'Faculty of Science and Technology courses'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {termLabel} · {catalog.courses.length} {isTh ? 'วิชา' : 'courses'} · {isTh ? 'ข้อมูลจากระบบทะเบียน' : 'from the registrar'}
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label={isTh ? 'ปิด' : 'Close'}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={isTh ? 'ค้นหารหัสวิชา ชื่อวิชา (ไทย/อังกฤษ) หรือชื่ออาจารย์' : 'Search code, course name (TH/EN) or instructor'}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-mangosteen focus:outline-hidden text-sm"
            />
          </div>

          {prefixes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {['all', ...prefixes].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrefix(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer border transition-colors ${
                    prefix === p ? 'bg-mangosteen text-white border-mangosteen' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p === 'all' ? (isTh ? 'ทั้งหมด' : 'All') : p}
                  <span className="ml-1 opacity-70">
                    {p === 'all' ? catalog.courses.length : catalog.courses.filter(c => c.code.startsWith(p)).length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 space-y-2">
          {list.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">
              {isTh ? 'ไม่พบรายวิชาที่ค้นหา — ปิดหน้าต่างนี้แล้วกรอกรหัสวิชาเองได้' : 'No matching course — close this and type the code yourself'}
            </div>
          )}
          {list.map(c => {
            const open = openCode === c.code;
            const left = c.sections.reduce((n, s) => n + (s.remaining || 0), 0);
            return (
              <div key={c.code} className={`rounded-xl border transition-colors ${open ? 'border-mangosteen/40 bg-mangosteen/[0.03]' : 'border-slate-200 bg-white'}`}>
                <button
                  type="button"
                  onClick={() => setOpenCode(open ? null : c.code)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer"
                  aria-expanded={open}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono font-bold text-sm text-slate-800">{c.code}</span>
                      <span className="text-sm font-semibold text-slate-800">{primaryName(c)}</span>
                    </div>
                    {secondaryName(c) && <div className="text-xs text-slate-500">{secondaryName(c)}</div>}
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {c.credit} · {c.sections.length} {isTh ? 'กลุ่ม' : 'sections'} ({c.sections.map(s => s.section).join(', ')}) · {isTh ? `เหลือรวม ${left} ที่นั่ง` : `${left} seats left`}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 mt-1 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="px-4 pb-4 space-y-2">
                    {c.sections.map(s => (
                      <div key={s.section} className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="min-w-0 flex-1 text-xs space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-mangosteen text-sm">{isTh ? 'กลุ่ม' : 'Sec'} {s.section}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.remaining > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {s.remaining > 0
                                ? (isTh ? `เหลือ ${s.remaining}/${s.capacity}` : `${s.remaining}/${s.capacity} left`)
                                : (isTh ? `เต็ม ${s.enrolled}/${s.capacity}` : `Full ${s.enrolled}/${s.capacity}`)}
                            </span>
                          </div>
                          <div className="text-slate-700 flex items-start gap-1">
                            <Users className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                            <span>{s.instructors.length ? s.instructors.join(', ') : (isTh ? 'ยังไม่ระบุอาจารย์' : 'Instructor TBA')}</span>
                          </div>
                          {s.time && <div className="text-slate-500">{s.time}</div>}
                          {s.note && <div className="text-amber-700">{s.note}</div>}
                        </div>
                        <button
                          type="button"
                          onClick={() => onPick(c, s)}
                          className="shrink-0 px-3.5 py-2 rounded-lg bg-mangosteen hover:bg-mangosteen-hover text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> {isTh ? 'เลือกกลุ่มนี้' : 'Pick this section'}
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => onPick(c)}
                      className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      {isTh ? 'เลือกวิชานี้ (ไปเลือกกลุ่มในฟอร์ม หรือกรอกกลุ่มอื่นเอง)' : 'Pick this course (choose or type the section in the form)'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
