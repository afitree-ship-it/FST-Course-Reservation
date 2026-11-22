import { useEffect, useState } from 'react';
import { Ban, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { getRemoteSettings, saveRemoteSettings } from '../services/api';
import { BlockedCourse, parseBlockedCourses } from '../utils/blockedCourses';

type Toast = (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;

const DEFAULT_MSG = 'รายวิชานี้ไม่รับคำร้องผ่านระบบนี้ กรุณาติดต่อคณะเจ้าของรายวิชาโดยตรง';

/**
 * Admin card: courses that must NOT be requested through this system (e.g. the student has to go to
 * the owning faculty in person). Students see the message on the form and cannot submit; the backend
 * rejects such requests too. Stored in the Settings sheet under `blocked_courses`.
 */
export default function BlockedCoursesSettings({ showToast }: { showToast: Toast }) {
  const [list, setList] = useState<BlockedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState<BlockedCourse>({ code: '', name: '', message: '' });

  const load = async () => {
    setLoading(true);
    const st = await getRemoteSettings(true);
    setList(parseBlockedCourses(st.blocked_courses));
    setDirty(false);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (i: number, patch: Partial<BlockedCourse>) => {
    setList(l => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    setDirty(true);
  };
  const remove = (i: number) => {
    setList(l => l.filter((_, idx) => idx !== i));
    setDirty(true);
  };
  const add = () => {
    const code = draft.code.trim().toUpperCase();
    const name = (draft.name || '').trim();
    if (!code && !name) { showToast('กรอกรหัสวิชาหรือชื่อวิชาอย่างน้อย 1 อย่าง', 'warning'); return; }
    if (code && list.some(x => x.code.toUpperCase() === code)) { showToast(`มีรหัสวิชา ${code} อยู่ในรายการแล้ว`, 'warning'); return; }
    setList(l => [...l, { code, name, message: draft.message.trim() || DEFAULT_MSG }]);
    setDraft({ code: '', name: '', message: '' });
    setDirty(true);
  };

  const save = async () => {
    const clean = list
      .map(x => ({ code: x.code.trim().toUpperCase(), name: (x.name || '').trim(), message: (x.message || '').trim() || DEFAULT_MSG }))
      .filter(x => x.code || x.name);
    setSaving(true);
    const ok = await saveRemoteSettings({ blocked_courses: JSON.stringify(clean) });
    setSaving(false);
    if (ok) {
      setList(clean);
      setDirty(false);
      showToast(clean.length ? `บันทึกแล้ว: บล็อก ${clean.length} รายวิชา` : 'บันทึกแล้ว: ไม่มีรายวิชาที่บล็อก', 'success');
    } else {
      showToast('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', 'error');
    }
  };

  const input = 'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-hidden focus:border-mangosteen focus:ring-2 focus:ring-mangosteen/20';

  return (
    <div className="bg-white/90 backdrop-blur-2xl rounded-2xl p-5 sm:p-6 border border-white/90 shadow-md space-y-4 font-sans" id="blocked-courses-settings">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-extrabold text-slate-800">รายวิชาที่ไม่รับคำร้องผ่านระบบ</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            นักศึกษาที่กรอกรหัสหรือชื่อวิชาเหล่านี้จะเห็นข้อความแจ้ง และส่งคำร้องไม่ได้ (ระบบหลังบ้านตรวจซ้ำอีกชั้น)
          </p>
        </div>
        <button type="button" onClick={load} className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> โหลดใหม่
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-4">กำลังโหลด...</div>
      ) : (
        <div className="space-y-3">
          {list.length === 0 && <div className="text-sm text-slate-400">ยังไม่มีรายวิชาที่บล็อก</div>}
          {list.map((b, i) => (
            <div key={i} className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)_auto] items-start">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor={`bc-code-${i}`}>รหัสวิชา</label>
                <input id={`bc-code-${i}`} value={b.code} onChange={e => update(i, { code: e.target.value.toUpperCase() })} className={`${input} font-mono`} placeholder="GE2100-243" />
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor={`bc-name-${i}`}>ชื่อวิชา (ไม่บังคับ — ใช้จับกรณีนักศึกษาพิมพ์แค่ชื่อ)</label>
                  <input id={`bc-name-${i}`} value={b.name || ''} onChange={e => update(i, { name: e.target.value })} className={input} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor={`bc-msg-${i}`}>ข้อความที่นักศึกษาจะเห็น</label>
                  <textarea id={`bc-msg-${i}`} rows={2} value={b.message} onChange={e => update(i, { message: e.target.value })} className={input} />
                </div>
              </div>
              <button type="button" onClick={() => remove(i)} className="self-end sm:self-start mt-5 p-2 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer" aria-label={`เลิกบล็อก ${b.code || b.name}`} title="เลิกบล็อกรายวิชานี้">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* add new */}
          <div className="rounded-xl border border-dashed border-slate-300 p-3 grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)_auto] items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="bc-new-code">รหัสวิชาใหม่</label>
              <input id="bc-new-code" value={draft.code} onChange={e => setDraft(d => ({ ...d, code: e.target.value.toUpperCase() }))} className={`${input} font-mono`} placeholder="เช่น GE2100-243" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="bc-new-name">ชื่อวิชา (ไม่บังคับ)</label>
                <input id="bc-new-name" value={draft.name || ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className={input} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="bc-new-msg">ข้อความแจ้งนักศึกษา</label>
                <input id="bc-new-msg" value={draft.message} onChange={e => setDraft(d => ({ ...d, message: e.target.value }))} className={input} placeholder={DEFAULT_MSG} />
              </div>
            </div>
            <button type="button" onClick={add} className="h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> เพิ่ม
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            {dirty && <span className="text-xs text-amber-700 font-semibold">มีการแก้ไขที่ยังไม่บันทึก</span>}
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="h-10 px-5 rounded-lg bg-mangosteen hover:bg-mangosteen-hover disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" /> {saving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
