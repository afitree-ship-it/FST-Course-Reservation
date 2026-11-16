import { useEffect, useMemo, useState } from 'react';
import { BookOpen, RefreshCw, Search, Check, Download, ExternalLink } from 'lucide-react';
import { CatalogCourse } from '../types';
import { fetchRegistrarCourses, getCatalogConfig, saveCourseCatalog, refreshCourseCatalogNow, setCatalogAutoRefresh } from '../services/api';

type Toast = (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;

const currentBuddhistYear = () => new Date().getFullYear() + 543;

function formatThaiDateTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Admin card: pull course codes/names (TH + EN) from reg.ftu.ac.th for a chosen year/semester,
 * pick all or some, and publish them to the student form. Apps Script refreshes the published
 * list every day at 06:00 (names, instructors and seats left).
 */
export default function CourseCatalogSettings({ showToast }: { showToast: Toast }) {
  const thisYear = currentBuddhistYear();
  const [year, setYear] = useState(String(thisYear));
  const [semester, setSemester] = useState('2');
  const [patterns, setPatterns] = useState('IT*, DS*, RD*, SC*');
  const [enabled, setEnabled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [savedCodes, setSavedCodes] = useState<string[]>([]);
  const [savedMode, setSavedMode] = useState<'all' | 'selected'>('all');

  const [courses, setCourses] = useState<CatalogCourse[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoIncludeNew, setAutoIncludeNew] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [savingAuto, setSavingAuto] = useState(false);

  useEffect(() => {
    getCatalogConfig().then(cfg => {
      if (!cfg) return;
      if (cfg.year) setYear(cfg.year);
      if (cfg.semester) setSemester(cfg.semester);
      if (cfg.patterns) setPatterns(cfg.patterns);
      setEnabled(cfg.enabled);
      setUpdatedAt(cfg.updatedAt);
      setSavedCodes(cfg.codes || []);
      setSavedMode(cfg.mode);
      setAutoIncludeNew(cfg.mode !== 'selected');
      setAutoRefresh(cfg.autoRefresh !== false);
      // เปิดหน้าตั้งค่าแล้วดึงรายวิชาล่าสุดจากระบบทะเบียนให้อัตโนมัติ (เห็นวิชาที่เพิ่งเปิดใหม่ทันที)
      if (cfg.enabled && cfg.autoRefresh !== false && cfg.year && cfg.semester) {
        handleFetch({ year: cfg.year, semester: cfg.semester, patterns: cfg.patterns, mode: cfg.mode, codes: cfg.codes || [], enabled: true, quiet: true });
      }
    });
  }, []);

  const handleFetch = async (override?: { year: string; semester: string; patterns: string; mode: 'all' | 'selected'; codes: string[]; enabled: boolean; quiet?: boolean }) => {
    const y = override?.year ?? year;
    const sem = override?.semester ?? semester;
    const pat = override?.patterns ?? patterns;
    const isEnabled = override?.enabled ?? enabled;
    const mode = override?.mode ?? savedMode;
    const codes = override?.codes ?? savedCodes;
    setLoading(true);
    const res = await fetchRegistrarCourses(y, sem, pat);
    setLoading(false);
    if (!res.success || !res.data) {
      showToast(res.error || 'ดึงข้อมูลไม่สำเร็จ', 'error');
      return;
    }
    setCourses(res.data);
    // preselect: what was saved before (same term), otherwise everything
    const sameTerm = isEnabled && mode === 'selected' && codes.length > 0;
    setSelected(new Set(sameTerm ? res.data.filter(c => codes.includes(c.code)).map(c => c.code) : res.data.map(c => c.code)));
    const fresh = sameTerm ? res.data.filter(c => !codes.includes(c.code)).length : 0;
    if (!override?.quiet) showToast(`ดึงข้อมูลได้ ${res.data.length} รายวิชา`, 'success');
    else if (fresh > 0) showToast(`มีรายวิชาเปิดใหม่ ${fresh} วิชาที่ยังไม่ได้เลือก`, 'info');
  };

  const filtered = useMemo(() => {
    if (!courses) return [];
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => c.code.toLowerCase().includes(q) || c.nameTh.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q));
  }, [courses, query]);

  const allChecked = !!courses && courses.length > 0 && selected.size === courses.length;

  const toggle = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const toggleAll = () => {
    if (!courses) return;
    setSelected(allChecked ? new Set() : new Set(courses.map(c => c.code)));
  };

  const handleSave = async () => {
    if (!courses) return;
    if (selected.size === 0) {
      showToast('กรุณาเลือกอย่างน้อย 1 รายวิชา', 'warning');
      return;
    }
    const everything = selected.size === courses.length;
    const mode: 'all' | 'selected' = everything && autoIncludeNew ? 'all' : 'selected';
    setSaving(true);
    const res = await saveCourseCatalog({ enabled: true, year, semester, patterns, mode, codes: Array.from(selected) });
    setSaving(false);
    if (res.success) {
      setEnabled(true);
      setSavedMode(mode);
      setSavedCodes(Array.from(selected));
      setUpdatedAt(new Date().toISOString());
      showToast(`เปิดให้นักศึกษาเลือก ${res.count ?? selected.size} รายวิชาแล้ว`, 'success');
    } else {
      showToast(res.error || 'บันทึกไม่สำเร็จ', 'error');
    }
  };

  const handleDisable = async () => {
    setSaving(true);
    const res = await saveCourseCatalog({ enabled: false, year, semester, patterns, mode: savedMode, codes: savedCodes });
    setSaving(false);
    if (res.success) {
      setEnabled(false);
      showToast('ปิดการดึงรายวิชาแล้ว นักศึกษาจะกรอกรายวิชาเองเหมือนเดิม', 'info');
    } else {
      showToast(res.error || 'บันทึกไม่สำเร็จ', 'error');
    }
  };

  const handleToggleAuto = async () => {
    const next = !autoRefresh;
    setSavingAuto(true);
    const ok = await setCatalogAutoRefresh(next);
    setSavingAuto(false);
    if (ok) {
      setAutoRefresh(next);
      showToast(next ? 'เปิดการดึงรายวิชาอัตโนมัติแล้ว (ทุกวัน 06:00 น.)' : 'ปิดการดึงอัตโนมัติแล้ว รายวิชาจะเปลี่ยนเฉพาะเมื่อกดอัปเดตเอง', 'success');
    } else {
      showToast('บันทึกไม่สำเร็จ', 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await refreshCourseCatalogNow();
    setRefreshing(false);
    if (res.success) {
      setUpdatedAt(new Date().toISOString());
      showToast(`อัปเดตจากระบบทะเบียนแล้ว (${res.count ?? 0} รายวิชา)`, 'success');
    } else {
      showToast(res.error || 'อัปเดตไม่สำเร็จ', 'error');
    }
  };

  const years = [thisYear - 1, thisYear, thisYear + 1].map(String);
  if (!years.includes(year)) years.push(year);

  return (
    <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-white/90 shadow-md space-y-5 font-sans mt-6">
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <BookOpen className="w-4 h-4 text-mangosteen" />
          <h3 className="text-base font-extrabold text-slate-800">รายวิชาจากระบบทะเบียน (reg.ftu.ac.th)</h3>
        </div>
        <p className="text-xs text-slate-500">
          ดึงรหัสวิชาและชื่อวิชา (ไทย/อังกฤษ) พร้อมกลุ่มเรียนและอาจารย์ผู้สอน แล้วเลือกรายวิชาที่จะให้นักศึกษาเลือกในฟอร์ม
        </p>
      </div>

      {/* current status */}
      <div className={`rounded-xl px-4 py-3 text-xs border flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between ${enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
        <div>
          {enabled ? (
            <>
              <strong>เปิดใช้งานอยู่</strong> · ปีการศึกษา {year} ภาคเรียน {semester} · {savedMode === 'all' ? `ทุกวิชาที่ตรงกับ ${patterns}` : `เลือกไว้ ${savedCodes.length} วิชา`}
              {updatedAt && <span className="block sm:inline sm:ml-2 text-emerald-700/80">อัปเดตล่าสุด {formatThaiDateTime(updatedAt)}</span>}
            </>
          ) : (
            <>ยังไม่เปิดใช้งาน — นักศึกษากรอกรหัสและชื่อวิชาเอง</>
          )}
        </div>
        {enabled && (
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={handleRefresh} disabled={refreshing} className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> อัปเดตเดี๋ยวนี้
            </button>
            <button type="button" onClick={handleDisable} disabled={saving} className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-60">
              ปิดใช้งาน
            </button>
          </div>
        )}
      </div>

      {/* auto refresh switch */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs">
          <div className="font-bold text-slate-800">ดึงรายวิชาอัตโนมัติ</div>
          <div className="text-slate-500 mt-0.5">
            {autoRefresh
              ? 'เปิดอยู่: อัปเดตชื่อวิชา กลุ่ม อาจารย์ และที่นั่งเหลือจากระบบทะเบียนทุกวัน 06:00 น. และดึงรายการล่าสุดให้เมื่อเปิดหน้านี้'
              : 'ปิดอยู่: รายวิชาในฟอร์มคงเดิม จนกว่าจะกด "อัปเดตเดี๋ยวนี้" หรือ "ดึงรายวิชา" เอง'}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoRefresh}
          aria-label="ดึงรายวิชาอัตโนมัติ"
          onClick={handleToggleAuto}
          disabled={savingAuto}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer disabled:opacity-60 ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* search form */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ปีการศึกษา</label>
          <select value={year} onChange={e => setYear(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
            {years.sort().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ภาคเรียน</label>
          <select value={semester} onChange={e => setSemester(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3 (ฤดูร้อน)</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสวิชา (คั่นด้วย , พิมพ์เล็กหรือใหญ่ก็ได้)</label>
          <input value={patterns} onChange={e => setPatterns(e.target.value.toUpperCase())} placeholder="IT*, DS*, RD*, SC*" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => handleFetch()} disabled={loading} className="px-5 py-2.5 bg-mangosteen hover:bg-mangosteen-hover text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-60">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? 'กำลังดึงข้อมูลจากระบบทะเบียน (อาจใช้เวลา 10–40 วินาที)...' : 'ดึงรายวิชา'}
        </button>
        <a href="https://reg.ftu.ac.th/registrar/class_info.asp" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-mangosteen inline-flex items-center gap-1">
          <ExternalLink className="w-3.5 h-3.5" /> เปิดระบบทะเบียน
        </a>
      </div>

      {/* results */}
      {courses && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-mangosteen" />
              เลือกทั้งหมด ({selected.size}/{courses.length})
            </label>
            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหารหัส/ชื่อวิชา" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm" />
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
            {filtered.length === 0 && <div className="p-6 text-center text-sm text-slate-400">ไม่พบรายวิชา</div>}
            {filtered.map(c => {
              const left = c.sections.reduce((n, s) => n + (s.remaining || 0), 0);
              return (
                <label key={c.code} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selected.has(c.code)} onChange={() => toggle(c.code)} className="w-4 h-4 mt-1 accent-mangosteen shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono font-bold text-sm text-slate-800">{c.code}</span>
                      {enabled && savedMode === 'selected' && !savedCodes.includes(c.code) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">ใหม่</span>
                      )}
                      <span className="text-sm text-slate-700">{c.nameTh}</span>
                    </div>
                    {c.nameEn && <div className="text-xs text-slate-500">{c.nameEn}</div>}
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {c.credit} · {c.sections.length} กลุ่ม (กลุ่ม {c.sections.map(s => s.section).join(', ')}) · เหลือรวม {left} ที่นั่ง
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {selected.size === courses.length && (
            <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={autoIncludeNew} onChange={e => setAutoIncludeNew(e.target.checked)} className="w-4 h-4 mt-0.5 accent-mangosteen" />
              <span>เพิ่มวิชาใหม่ที่ตรงกับรหัส {patterns} ให้อัตโนมัติ เมื่อระบบทะเบียนเปิดวิชาเพิ่มภายหลัง</span>
            </label>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-60">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              เปิดให้นักศึกษาเลือก {selected.size} รายวิชา
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
