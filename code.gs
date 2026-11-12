/**
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

// รหัสคำร้องแบบไม่ซ้ำ (เดิมสุ่มแค่ 4 หลัก มีโอกาสชนกันสูงมากเมื่อมีคำร้องหลักร้อย
// ทำให้แอดมินกดอนุมัติแล้วไปแก้ "แถวอื่น" ที่มีรหัสเดียวกัน)
function newId(prefix) {
  var y = new Date().getFullYear() + 543;
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var rand = '';
  for (var i = 0; i < 6; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
  return prefix + '-' + y + '-' + rand;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- Auth (ตรวจสิทธิ์แอดมินฝั่งเซิร์ฟเวอร์) ----------
// เดิมการตรวจรหัสแอดมินทำเฉพาะในเบราว์เซอร์ ใครก็ยิง API อนุมัติ/ลบแอดมิน/ดึงข้อมูลนักศึกษาทั้งหมดได้
var SESSION_TTL_SECONDS = 6 * 60 * 60; // 6 ชั่วโมง

// เก็บเซสชันใน ScriptProperties (ถาวร) + CacheService (เร็ว)
// ถ้าใช้ CacheService อย่างเดียว Google อาจลบทิ้งก่อนเวลา ทำให้แอดมินหลุดออกจากระบบเอง
function createAdminSession(name) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var adminName = String(name || 'แอดมินระบบ');
  var exp = Date.now() + SESSION_TTL_SECONDS * 1000;
  var props = PropertiesService.getScriptProperties();
  cleanupExpiredSessions(props);
  props.setProperty('sess_' + token, JSON.stringify({ n: adminName, e: exp }));
  CacheService.getScriptCache().put('sess_' + token, adminName, SESSION_TTL_SECONDS);
  return token;
}

function getAdminFromToken(token) {
  if (!token || !/^[0-9a-f]{64}$/.test(String(token))) return null;
  var key = 'sess_' + token;
  var cache = CacheService.getScriptCache();
  var name = cache.get(key);
  if (name) return name;
  var raw = PropertiesService.getScriptProperties().getProperty(key);
  if (!raw) return null;
  try {
    var sess = JSON.parse(raw);
    var left = Math.floor((sess.e - Date.now()) / 1000);
    if (left <= 0) { PropertiesService.getScriptProperties().deleteProperty(key); return null; }
    cache.put(key, sess.n, Math.min(left, SESSION_TTL_SECONDS));
    return sess.n;
  } catch (e) {
    return null;
  }
}

function destroyAdminSession(token) {
  if (!token) return;
  CacheService.getScriptCache().remove('sess_' + token);
  PropertiesService.getScriptProperties().deleteProperty('sess_' + token);
}

function cleanupExpiredSessions(props) {
  var all = props.getProperties();
  var now = Date.now();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('sess_') !== 0) return;
    try { if (JSON.parse(all[k]).e < now) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
  });
}

function unauthorized() {
  return jsonOut({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบแอดมินใหม่อีกครั้ง' });
}

function countAdmins() {
  var rows = adminsSheet().getDataRange().getValues();
  var n = 0;
  for (var i = 1; i < rows.length; i++) if (rows[i][0]) n++;
  // จำไว้ถาวรว่าระบบเคยมีแอดมินแล้ว => ถ้าภายหลังชีต Admins ว่าง (ลบด้วยมือ) คนนอกจะตั้งตัวเองเป็นแอดมินไม่ได้
  if (n > 0) {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('ADMIN_BOOTSTRAPPED') !== 'true') props.setProperty('ADMIN_BOOTSTRAPPED', 'true');
  }
  return n;
}

function isBootstrapAllowed() {
  return countAdmins() === 0 && PropertiesService.getScriptProperties().getProperty('ADMIN_BOOTSTRAPPED') !== 'true';
}

// กู้คืนกรณีลบแอดมินหมดจนเข้าระบบไม่ได้: เปิดไฟล์นี้ใน Apps Script แล้วกด Run ฟังก์ชันนี้ (ทำได้เฉพาะเจ้าของสคริปต์)
// จากนั้นเปิดหน้าแอดมินบนเว็บเพื่อตั้งรหัสผ่านแอดมินคนแรกใหม่
function resetAdminSetup() {
  PropertiesService.getScriptProperties().deleteProperty('ADMIN_BOOTSTRAPPED');
  Logger.log('เปิดให้ตั้งค่าแอดมินคนแรกใหม่ได้แล้ว (ใช้ได้เฉพาะเมื่อชีต Admins ว่างอยู่)');
}

function handleAdminLogin(data) {
  var hash = String(data.hash || '');
  if (!/^[0-9a-f]{64}$/.test(hash)) return jsonOut({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' });
  // กันการเดารหัสแบบรัว ๆ: จำกัด 10 ครั้ง / 5 นาที ต่อทั้งระบบ
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('login_fails') || 0);
  if (fails >= 20) return jsonOut({ success: false, error: 'พยายามเข้าสู่ระบบผิดหลายครั้ง กรุณารอ 5 นาที' });
  var rows = adminsSheet().getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === hash) {
      var name = String(rows[i][1] || 'แอดมินทั่วไป');
      ensureProofCleanupTrigger();
      return jsonOut({ success: true, name: name, token: createAdminSession(name) });
    }
  }
  cache.put('login_fails', String(fails + 1), 300);
  return jsonOut({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' });
}

// ---------- Settings (cache + แยก public/private) ----------
var PUBLIC_SETTING_KEYS = ['custom_logo', 'custom_favicon', 'system_opening_mode', 'system_open_start', 'system_open_end', 'system_closed_message'];

function readAllSettings() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('settings_all');
  if (cached) { try { return JSON.parse(cached); } catch (e) {} }
  var sRows = settingsSheet().getDataRange().getValues();
  var settings = {};
  for (var m = 1; m < sRows.length; m++) {
    if (sRows[m][0]) settings[String(sRows[m][0])] = String(sRows[m][1]);
  }
  try { cache.put('settings_all', JSON.stringify(settings), 600); } catch (e) {} // >100KB จะ cache ไม่ได้ ก็อ่านจากชีตตามปกติ
  return settings;
}

function invalidateSettingsCache() {
  CacheService.getScriptCache().remove('settings_all');
}

function publicSettings() {
  var all = readAllSettings();
  var out = {};
  PUBLIC_SETTING_KEYS.forEach(function (k) { if (all[k] !== undefined) out[k] = all[k]; });
  return out;
}

function parseLocalDateTime(str) {
  if (!str) return null;
  var s2 = String(str).trim();
  // ค่าจากช่อง datetime-local ไม่มีโซนเวลา => ตีความเป็นเวลาไทย (+07:00)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s2)) s2 += '+07:00';
  var d = new Date(s2);
  return isNaN(d.getTime()) ? null : d;
}

function checkSystemClosed() {
  var st = readAllSettings();
  var mode = st.system_opening_mode || 'always_open';
  var msg = st.system_closed_message || 'ขณะนี้ระบบปิดรับคำร้องสำรองที่นั่ง';
  if (mode === 'closed') return msg;
  if (mode === 'scheduled') {
    var now = new Date();
    var start = parseLocalDateTime(st.system_open_start);
    var end = parseLocalDateTime(st.system_open_end);
    if ((start && now < start) || (end && now > end)) return msg;
  }
  return '';
}

function isWebhookUrl(s) {
  return /^https:\/\//.test(String(s || ''));
}

// LINE Notify ปิดให้บริการถาวรตั้งแต่ 31 มี.ค. 2025 การยิงไปที่ notify-api.line.me ทำให้ทุกคำร้องช้าลงโดยไม่มีประโยชน์
// จึงรองรับเฉพาะ Webhook URL (Discord / Google Chat / Make / n8n ฯลฯ)
function postWebhook(url, message) {
  if (!isWebhookUrl(url)) return false;
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ content: message, text: message }),
    muteHttpExceptions: true
  });
  return true;
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
  if (value instanceof Date) {
    // ถ้าชีตตีความปีเป็น พ.ศ. ผิด (ได้ปี ค.ศ. 14xx) ให้บวก 543 กลับ
    if (value.getFullYear() < 1800) {
      var fixed = new Date(value.getTime());
      fixed.setFullYear(value.getFullYear() + 543);
      return fixed.toISOString();
    }
    return value.toISOString();
  }
  var str = String(value).trim();
  var dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
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
  // พิจารณาครบทุกวิชาแล้วแต่ผลผสม (อนุมัติบาง/ไม่อนุมัติบาง) => ถือว่าอนุมัติ (ได้ที่นั่งอย่างน้อย 1 วิชา)
  // เดิมคืนค่า 'รอดำเนินการ' ทำให้คำร้องค้างอยู่ในรายการรอตรวจตลอดไป
  var anyPending = courses.some(function (c) { return !c.status || c.status === 'รอดำเนินการ'; });
  if (!anyPending) return 'อนุมัติแล้ว';
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

// ส่งข้อความแจ้งเตือนแอดมินผ่าน Webhook (Discord / Google Chat ฯลฯ)
function sendAdminWebhookNotification(message) {
  try {
    var st = readAllSettings();
    if (st.notify_on_new_request !== 'true') return;
    postWebhook(st.notify_line_token, message);
  } catch (err) {
    Logger.log('Admin notify error: ' + err.toString());
  }
}

function sendStatusChangeWebhookNotification(message) {
  try {
    var st = readAllSettings();
    if (st.notify_on_status_change === 'false') return;
    postWebhook(st.notify_line_token, message);
  } catch (err) {
    Logger.log('Status change notify error: ' + err.toString());
  }
}

// ใช้สำหรับปุ่ม "ทดสอบการแจ้งเตือน" ในหน้าแอดมิน (ต้องล็อกอิน) — ไม่เปิดให้คนนอกใช้เป็นตัวยิง URL ใด ๆ
function handleDispatchNotification(data) {
  var tokenOrWebhook = data.tokenOrWebhook;
  var message = data.message;
  if (!tokenOrWebhook || !message) {
    return jsonOut({ success: false, error: 'Missing token or message' });
  }
  if (!isWebhookUrl(tokenOrWebhook)) {
    return jsonOut({ success: false, error: 'LINE Notify ปิดให้บริการแล้ว (31 มี.ค. 2025) กรุณาใช้ Webhook URL ที่ขึ้นต้นด้วย https:// แทน' });
  }
  try {
    postWebhook(tokenOrWebhook, String(message).slice(0, 2000));
    return jsonOut({ success: true });
  } catch (e) {
    return jsonOut({ success: false, error: e.toString() });
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
            '<span style="font-size: 16px; font-weight: bold; color: #0f172a;">' + escapeHtml(c.courseCode || '-') + '</span>' +
            '<div style="font-size: 14px; color: #334155; font-weight: 500; margin-top: 2px;">' + escapeHtml(c.courseName || '-') + '</div>' +
          '</div>' +
          '<div style="margin-left: 8px; text-align: right;">' +
            '<span style="background-color: ' + badgeBg + '; color: ' + badgeColor + '; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; display: inline-block;">' +
              statusText +
            '</span>' +
          '</div>' +
        '</div>' +

        '<div style="font-size: 13px; color: #64748b; line-height: 1.6; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 8px;">' +
          '<div>• <strong>กลุ่ม/เซกชัน (Section):</strong> <span style="color: #1e293b; font-weight: bold;">' + escapeHtml(c.section || '-') + '</span></div>' +
          '<div>• <strong>อาจารย์ผู้สอน (Instructor):</strong> <span style="color: #1e293b;">' + escapeHtml(c.instructor || '-') + '</span></div>' +
        '</div>';

    if (c.rejectionReason && isRej) {
      cardsHtml += 
        '<div style="background-color: #fff1f2; border-radius: 6px; padding: 8px 10px; margin-top: 8px; font-size: 12px; color: #be123c;">' +
          '<strong>[ไม่อนุมัติ] เหตุผล/หมายเหตุ (Reason):</strong> ' + escapeHtml(c.rejectionReason) +
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
        '<div style="font-weight: bold; color: #1e293b;">' + (i + 1) + '. ' + escapeHtml(f.fullName) + '</div>' +
        '<div style="color: #64748b; font-size: 12px; margin-top: 2px;">' +
          'รหัสนักศึกษา (Student ID): <span style="color: #0284c7; font-weight: bold;">' + escapeHtml(f.studentId) + '</span> ' +
          (f.courseCode ? '<span style="color: #64748b;">| ฝากวิชา: ' + escapeHtml(f.courseCode) + '</span>' : '') +
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

function readAllRequests() {
  var rows = requestsSheet().getDataRange().getValues();
  var results = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) results.push(rowToRequest(rows[i]));
  }
  return results;
}

function readAuditLogs() {
  var auRows = auditSheet().getDataRange().getValues();
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
  return logs.slice(0, 500);
}

function readAdmins() {
  var aRows = adminsSheet().getDataRange().getValues();
  var admins = [];
  for (var k = 1; k < aRows.length; k++) {
    if (aRows[k][0]) admins.push({ hash: String(aRows[k][0]), name: String(aRows[k][1]), addedAt: String(aRows[k][2]) });
  }
  return admins;
}

// ค้นหาคำร้องของนักศึกษาคนเดียว: ต้องเป็นรหัส 9 หลักเท่านั้น และเทียบแบบตรงตัว
// (เดิมถ้าส่ง studentId ว่าง indexOf('') จะคืนค่า 0 => ได้ข้อมูลนักศึกษา "ทุกคน" ออกไปแบบไม่ต้องล็อกอิน)
function findRequestsByStudentId(studentId) {
  if (!/^\d{9}$/.test(studentId)) return null;
  var rows = requestsSheet().getDataRange().getValues();
  var filtered = [];
  for (var j = 1; j < rows.length; j++) {
    if (!rows[j][0]) continue;
    var own = normalizeId(rows[j][2]) === studentId;
    var asFriend = false;
    if (!own) {
      try {
        var cs = JSON.parse(rows[j][20] || '[]');
        asFriend = cs.some(function (c) {
          return (c.coStudents || []).some(function (f) { return normalizeId(f.studentId) === studentId; });
        });
      } catch (e) {}
    }
    if (own || asFriend) filtered.push(rowToRequest(rows[j]));
  }
  return filtered;
}

// ---------- ปิดบังข้อมูลส่วนตัวสำหรับการค้นหาแบบสาธารณะ ----------
// หน้าเช็กสถานะ/ฟอร์มนักศึกษาไม่ต้องล็อกอิน และรหัสนักศึกษาเดาได้ง่าย จึงซ่อนข้อมูลติดต่อและรูปหลักฐาน
// (แอดมินดึงผ่าน getAllRequests ซึ่งต้องล็อกอิน ยังเห็นข้อมูลครบเหมือนเดิม)
function maskPhone(phone) {
  var p = String(phone || '').replace(/\D/g, '');
  if (p.length < 6) return p ? '******' : '';
  return p.slice(0, 2) + '******' + p.slice(-2);
}

function maskEmail(email) {
  var e = String(email || '').trim();
  var at = e.indexOf('@');
  if (at < 1) return e ? '***' : '';
  var local = e.slice(0, at);
  return local.slice(0, Math.min(2, local.length)) + '***' + e.slice(at);
}

function toPublicRequest(req) {
  var out = {};
  for (var k in req) if (req.hasOwnProperty(k)) out[k] = req[k];
  out.phone = maskPhone(req.phone);
  out.notifyContact = maskEmail(req.notifyContact);
  delete out.facebookProofLink;
  delete out.facebookProofFile;
  return out;
}

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var action = p.action || '';
  try {
    // ---- Public (ไม่ต้องล็อกอิน) ----
    if (action === 'getStatusByStudentId') {
      var sid = String(p.studentId || '').replace(/^'/, '').trim();
      if (!/^\d{9}$/.test(sid)) return jsonOut({ success: false, error: 'รหัสนักศึกษาต้องเป็นตัวเลข 9 หลัก' });
      var sCache = CacheService.getScriptCache();
      var ver = getDataVersion();
      var hit = sCache.get('stu_' + sid);
      if (hit) {
        try { var parsed = JSON.parse(hit); if (parsed.v === ver) return jsonOut({ success: true, data: parsed.d }); } catch (e) {}
      }
      var found = findRequestsByStudentId(sid).map(toPublicRequest);
      try { sCache.put('stu_' + sid, JSON.stringify({ v: ver, d: found }), 120); } catch (e) {}
      return jsonOut({ success: true, data: found });
    }
    if (action === 'getPublicSettings' || (action === 'getSettings' && !p.token)) {
      return jsonOut({ success: true, data: publicSettings() });
    }
    if (action === 'adminStatus') {
      return jsonOut({ success: true, hasAdmins: !isBootstrapAllowed() });
    }

    // ---- Admin เท่านั้น ----
    if (!getAdminFromToken(p.token)) return unauthorized();
    if (action === 'checkEmailQuota') {
      return jsonOut({ success: true, remainingDailyQuota: MailApp.getRemainingDailyQuota(), sentFromUser: Session.getEffectiveUser().getEmail(), timestamp: new Date().toISOString() });
    }
    if (action === 'getAllRequests') return jsonOut({ success: true, data: readAllRequests() });
    if (action === 'getAdmins') return jsonOut({ success: true, data: readAdmins() });
    if (action === 'getSettings') return jsonOut({ success: true, data: readAllSettings() });
    if (action === 'getAuditLogs') return jsonOut({ success: true, data: readAuditLogs() });

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

    // ---- Public ----
    if (action === 'submitRequest') return handleSubmitRequest(postData);
    if (action === 'adminLogin') return handleAdminLogin(postData);
    if (action === 'submitFollowUp') return handleSubmitFollowUp(postData);
    // สร้างแอดมินคนแรกได้เฉพาะตอนที่ชีต Admins ยังว่างเท่านั้น
    if (action === 'addAdmin' && isBootstrapAllowed()) return handleAddAdmin(postData);

    // ---- Admin เท่านั้น ----
    var adminName = getAdminFromToken(postData.token);
    if (!adminName) return unauthorized();
    postData.processedBy = adminName;   // ใช้ชื่อจาก session จริง ไม่เชื่อชื่อที่ส่งมาจากเบราว์เซอร์
    postData.adminName = adminName;

    if (action === 'getAllRequests') {
      // ถ้าข้อมูลไม่เปลี่ยนจากรอบก่อน (เวอร์ชันเท่าเดิม) ไม่ต้องอ่านชีตและไม่ต้องส่งข้อมูลทั้งก้อนกลับไป
      var curVer = getDataVersion();
      if (postData.ifVersion && curVer !== '0' && postData.ifVersion === curVer) {
        return jsonOut({ success: true, notModified: true, version: curVer });
      }
      return jsonOut({ success: true, data: readAllRequests(), version: curVer });
    }
    if (action === 'getAdmins') return jsonOut({ success: true, data: readAdmins() });
    if (action === 'getSettings') return jsonOut({ success: true, data: readAllSettings() });
    if (action === 'getAuditLogs') return jsonOut({ success: true, data: readAuditLogs() });
    if (action === 'getProofImage') return handleGetProofImage(postData);
    if (action === 'checkEmailQuota') {
      return jsonOut({ success: true, remainingDailyQuota: MailApp.getRemainingDailyQuota(), sentFromUser: Session.getEffectiveUser().getEmail(), timestamp: new Date().toISOString() });
    }
    if (action === 'updateStatus') {
      var r1 = handleUpdateStatus(postData);
      logAudit(adminName, 'เปลี่ยนสถานะคำร้อง', postData.requestId, postData.status + (postData.rejectionReason ? ' — ' + postData.rejectionReason : ''));
      return r1;
    }
    if (action === 'updateCourseStatus') {
      var r2 = handleUpdateCourseStatus(postData);
      logAudit(adminName, 'เปลี่ยนสถานะรายวิชา', postData.requestId, postData.courseCode + ': ' + postData.status + (postData.rejectionReason ? ' — ' + postData.rejectionReason : ''));
      return r2;
    }
    if (action === 'addAdmin') return handleAddAdmin(postData);
    if (action === 'deleteAdmin') return handleDeleteAdmin(postData);
    if (action === 'saveSetting') return handleSaveSettings({ settings: [{ key: postData.key, value: postData.value }] });
    if (action === 'saveSettings') return handleSaveSettings(postData);
    if (action === 'recordAuditLog') return handleRecordAuditLog(postData);
    if (action === 'dispatchNotification') return handleDispatchNotification(postData);
    if (action === 'adminLogout') { destroyAdminSession(postData.token); return jsonOut({ success: true }); }

    return jsonOut({ success: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonOut({ success: false, error: err.toString() });
  }
}

// กันสองแอดมินกดอนุมัติคำร้องเดียวกันพร้อมกันแล้วเขียนทับ JSON รายวิชาของกันและกัน
function withLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return jsonOut({ success: false, error: 'ระบบกำลังประมวลผลคำขออื่น กรุณาลองใหม่' });
  try { return fn(); } finally { lock.releaseLock(); }
}

// ---------- Request Handlers ----------

function handleSubmitRequest(data) {
  // ตรวจข้อมูลขั้นต่ำฝั่งเซิร์ฟเวอร์
  var sidCheck = String(data.studentId || '').trim();
  if (!/^\d{9}$/.test(sidCheck)) return jsonOut({ success: false, error: 'รหัสนักศึกษาไม่ถูกต้อง' });
  if (!data.fullName || String(data.fullName).length > 200) return jsonOut({ success: false, error: 'ชื่อ-นามสกุลไม่ถูกต้อง' });
  if (data.courses && data.courses.length > 20) return jsonOut({ success: false, error: 'จำนวนรายวิชามากเกินไป' });
  var badSection = (data.courses || []).some(function (c) { return !/^\d{1,4}$/.test(String(c.section || '').trim()); });
  if (badSection) return jsonOut({ success: false, error: 'กลุ่มเรียนต้องเป็นตัวเลขเท่านั้น' });
  if (data.facebookProofLink && !/^https?:\/\//i.test(String(data.facebookProofLink))) {
    return jsonOut({ success: false, error: 'ลิงก์หลักฐานต้องขึ้นต้นด้วย http:// หรือ https://' });
  }
  // ตรวจช่วงเวลาเปิดรับคำร้องที่ฝั่งเซิร์ฟเวอร์ด้วย (เดิมตรวจแค่ตอนเปิดหน้าเว็บ ถ้าเปิดหน้าค้างไว้ก่อนเวลาปิด ก็ยังส่งได้หลังปิดรับ)
  var closedMsg = checkSystemClosed();
  if (closedMsg) return jsonOut({ success: false, error: closedMsg });

  // กันคำร้องซ้ำ: เบราว์เซอร์ retry ตอนเน็ตหลุด ทั้งที่ครั้งแรกบันทึกสำเร็จไปแล้ว
  var cache = CacheService.getScriptCache();
  var idemKey = data.clientRequestId ? 'submit_' + String(data.clientRequestId).slice(0, 80) : '';
  if (idemKey) {
    var prev = cache.get(idemKey);
    if (prev) return ContentService.createTextOutput(prev).setMimeType(ContentService.MimeType.JSON);
  }

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
      coStudentsText += item.studentId + " - " + item.fullName + " (วิชา: " + item.courseCode + ")\n";
    }
  } else {
    coStudentsText = "ไม่มีเพื่อนร่วมกลุ่ม (No co-applicants)"; // ห้ามขึ้นต้นด้วย "-" ชีตจะมองเป็นสูตรแล้วขึ้น #ERROR!
  }

  var proofLink = data.facebookProofLink || '';
  if (data.facebookProofFile && data.facebookProofFile.dataUrl) {
    proofLink = data.facebookProofFile.dataUrl; 
  }

  var FOLDER_ID = PROOF_FOLDER_ID;

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
      
      // เปิดสิทธิ์ให้ดูรูปได้ด้วยลิงก์ ถ้าโดเมนมหาวิทยาลัยห้ามแชร์สาธารณะ ให้ถอยมาแชร์ภายในโดเมน (@ftu.ac.th)
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        Logger.log('ANYONE_WITH_LINK not allowed: ' + shareErr);
        try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) { Logger.log('DOMAIN_WITH_LINK failed: ' + e2); }
      }
      
      proofLink = file.getUrl(); 
    } catch (error) {
      // เดิมบันทึกคำร้องต่อไปพร้อมข้อความ "Upload Error" โดยนักศึกษาไม่รู้ตัว => ตอนนี้แจ้งให้ส่งใหม่
      Logger.log('Proof upload failed: ' + error);
      return jsonOut({ success: false, error: 'อัปโหลดรูปหลักฐานไม่สำเร็จ กรุณากดส่งคำร้องอีกครั้ง (ข้อมูลที่กรอกยังอยู่ครบ)' });
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

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var newRowIndex;
  try {
  sheet.appendRow([
    id, formattedDate, studentIdStr, data.fullName || '', data.year || '', data.faculty || '', data.department || '',
    summary.courseCodes, summary.courseNames, summary.sections, summary.instructors, phoneStr, data.proofType || '',
    proofLink, 'รอดำเนินการ', '', summary.count, '', '', proofFileJSON, coursesJSONStr, notifyChan, contactEmail,
    "",             // 24. สถานะอีเมล
    coStudentsText, // 25. เพื่อนร่วมกลุ่ม
    totalSeats      // 26. จำนวนที่นั่งรวม
  ]);
  SpreadsheetApp.flush();
  bumpDataVersion();
  newRowIndex = sheet.getLastRow(); // อยู่ใน lock => ได้แถวของคำร้องนี้แน่นอน (เดิมอาจไปเขียนสถานะอีเมลทับแถวคนอื่น)
  } finally {
    lock.releaseLock();
  }

  var newReq = {
    id: id, studentId: data.studentId, fullName: data.fullName, department: data.department, faculty: data.faculty, 
    year: data.year, phone: data.phone, status: 'รอดำเนินการ', createdAt: now, proofType: data.proofType, 
    facebookProofLink: proofLink, courses: courses
  };

  // อีเมลยืนยัน + แจ้งเตือนแอดมิน ใช้เวลาหลายวินาที (ส่งอีเมล ~2-4 วิ)
  // หน้าเว็บรุ่นใหม่ส่ง deferNotify มา => ตอบกลับนักศึกษาทันที แล้วหน้าเว็บจะเรียก submitFollowUp ต่อเบื้องหลัง
  var notifyCtx = {
    data: { fullName: data.fullName, studentId: data.studentId, department: data.department, faculty: data.faculty, year: data.year, phone: data.phone },
    id: id, contactEmail: contactEmail, courses: courses, coStudentsList: coStudentsList,
    coStudentsText: coStudentsText, formattedDate: formattedDate, totalSeats: totalSeats
  };
  var deferred = false;
  if (data.deferNotify) {
    try {
      cache.put('post_' + id, JSON.stringify(notifyCtx), 3600);
      deferred = true;
    } catch (e) { deferred = false; }
  }
  if (!deferred) runSubmitNotifications(notifyCtx);

  var payload = JSON.stringify({ success: true, data: newReq, followUp: deferred });
  if (idemKey) { try { cache.put(idemKey, payload, 900); } catch (e) {} }
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}

// ---------- ลบรูปหลักฐานที่เก่าเกิน 3 ปี ----------
var PROOF_FOLDER_ID = '1SMwTumzdm_FQczUdH0gqnG55lS70JMAf';
var PROOF_RETENTION_YEARS = 3;

// ทำงานอัตโนมัติสัปดาห์ละครั้ง (ตั้งเวลาให้เองเมื่อแอดมินล็อกอิน หรือกด Run ฟังก์ชัน installProofCleanupTrigger)
// ย้ายรูปที่สร้างเกิน 3 ปีไปถังขยะของ Drive (กู้คืนได้ภายใน 30 วัน) แล้วระบุในชีตว่ารูปถูกลบตามกำหนดเก็บรักษา
function cleanupOldProofs() {
  var started = Date.now();
  var cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - PROOF_RETENTION_YEARS);
  var trashedIds = {};
  var count = 0;
  var files = DriveApp.getFolderById(PROOF_FOLDER_ID).getFiles();
  while (files.hasNext()) {
    if (Date.now() - started > 4.5 * 60 * 1000) break; // กันเกินเวลา 6 นาทีของ Apps Script รอบหน้าจะทำต่อ
    var f = files.next();
    if (f.getDateCreated() < cutoff) {
      f.setTrashed(true);
      trashedIds[f.getId()] = true;
      count++;
    }
  }
  if (count > 0) {
    var sheet = requestsSheet();
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var link = String(rows[i][13] || '');
      var m = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m && trashedIds[m[1]]) {
        sheet.getRange(i + 1, 14).setValue('ลบรูปแล้วตามกำหนดเก็บรักษา ' + PROOF_RETENTION_YEARS + ' ปี');
      }
    }
  }
  Logger.log('cleanupOldProofs: moved ' + count + ' file(s) to trash');
  return count;
}

function installProofCleanupTrigger() {
  var exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'cleanupOldProofs'; });
  if (!exists) {
    ScriptApp.newTrigger('cleanupOldProofs').timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();
  }
}

function ensureProofCleanupTrigger() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('CLEANUP_TRIGGER_OK') === 'true') return;
  try {
    installProofCleanupTrigger();
    props.setProperty('CLEANUP_TRIGGER_OK', 'true');
  } catch (e) {
    Logger.log('Cannot install cleanup trigger: ' + e);
  }
}

// ส่งรูปหลักฐานให้แอดมินผ่าน Apps Script (สคริปต์รันในนามเจ้าของโฟลเดอร์ จึงเปิดไฟล์ได้เสมอ)
// ใช้เมื่อเบราว์เซอร์ของแอดมินเปิดรูปจาก Drive ตรง ๆ ไม่ได้ เช่น ล็อกอิน Google คนละบัญชี
// หรือโดเมนมหาวิทยาลัยไม่อนุญาตให้แชร์ไฟล์แบบสาธารณะ
function handleGetProofImage(data) {
  var fileId = String(data.fileId || '');
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return jsonOut({ success: false, error: 'รหัสไฟล์ไม่ถูกต้อง' });
  try {
    var file = DriveApp.getFileById(fileId);
    if (file.isTrashed()) return jsonOut({ success: false, error: 'ไฟล์นี้ถูกลบแล้ว' });
    // อนุญาตเฉพาะไฟล์ในโฟลเดอร์รูปหลักฐานเท่านั้น
    var inFolder = false;
    var parents = file.getParents();
    while (parents.hasNext()) { if (parents.next().getId() === PROOF_FOLDER_ID) { inFolder = true; break; } }
    if (!inFolder) return jsonOut({ success: false, error: 'ไม่อนุญาตให้เปิดไฟล์นี้' });
    var blob = file.getBlob();
    var type = blob.getContentType() || 'image/jpeg';
    if (type.indexOf('image/') !== 0) return jsonOut({ success: false, error: 'ไฟล์นี้ไม่ใช่รูปภาพ' });
    var bytes = blob.getBytes();
    if (bytes.length > 15 * 1024 * 1024) return jsonOut({ success: false, error: 'ไฟล์ใหญ่เกินไป' });
    return jsonOut({ success: true, dataUrl: 'data:' + type + ';base64,' + Utilities.base64Encode(bytes) });
  } catch (e) {
    return jsonOut({ success: false, error: 'ไม่พบไฟล์ใน Google Drive (อาจถูกลบไปแล้ว หรือไม่ได้อยู่ในโฟลเดอร์หลักฐาน)' });
  }
}

function runSubmitNotifications(ctx) {
  var data = ctx.data, id = ctx.id, contactEmail = ctx.contactEmail, courses = ctx.courses,
      coStudentsList = ctx.coStudentsList, coStudentsText = ctx.coStudentsText,
      formattedDate = ctx.formattedDate, totalSeats = ctx.totalSeats;
  var sheet = requestsSheet();
  var newRowIndex = findRowById(sheet, id);
  if (newRowIndex < 0) return;

  // --- ส่งอีเมลยืนยันการรับคำร้อง ---
  if (contactEmail && contactEmail.indexOf('@') > -1) {
    var subject = "[FTU FST] ยืนยันการรับคำร้องขอสำรองที่นั่งวิชาเรียน / Confirmation (" + id + ")";
    
    var coursesCardsHtml = buildMobileCoursesCards(courses, 'รอดำเนินการ');
    var coStudentsCardHtml = buildMobileCoStudentsCard(coStudentsList);

    var textBody = "เรียน / Dear " + (data.fullName || 'Student') + " (รหัสนักศึกษา / Student ID: " + (data.studentId || '-') + "),\n\n" +
                   "ระบบได้รับคำร้องขอสำรองที่นั่งวิชาเรียนของคุณเรียบร้อยแล้ว\n" +
                   "We have successfully received your course seat reservation request.\n\n" +
                   "--------------------------------------------------\n" +
                   "• รหัสคำร้อง / Request ID: " + id + "\n" +
                   "• วันที่ยื่น / Submission Date: " + formattedDate + "\n" +
                   "• คณะ/สาขาวิชา: " + (data.faculty || '-') + " - " + (data.department || '-') + "\n" +
                   "• จำนวนที่นั่งรวม / Total Seats: " + totalSeats + " ที่นั่ง (Seats)\n" +
                   "• สถานะเริ่มต้น / Initial Status: รอดำเนินการ (Pending)\n" +
                   "--------------------------------------------------\n\n";

    if (coStudentsList.length > 0) {
      textBody += "รายชื่อเพื่อนร่วมกลุ่มที่ฝากจอง / Co-applicants:\n" + coStudentsText + "\n";
    }

    textBody += "โปรดรอเจ้าหน้าที่ตรวจสอบเอกสารและพิจารณาคำร้อง โดยระบบจะส่งอีเมลแจ้งเตือนอีกครั้งเมื่อมีความคืบหน้าครับ\n" +
                "Please wait for our staff to verify your documents and process the request.\n\n" +
                "--\n" + SENDER_NAME + "\nคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี";

    var htmlBody = 
      "<div style='background-color: #f8fafc; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>" +
        "<div style='max-width: 560px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;'>" +
          
          "<div style='background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; padding: 20px 16px; text-align: center;'>" +
            "<h2 style='margin: 0; font-size: 18px; font-weight: bold;'>ยืนยันการรับคำร้องขอสำรองที่นั่ง</h2>" +
            "<p style='margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;'>Course Seat Reservation Confirmation</p>" +
          "</div>" +

          "<div style='padding: 18px 16px; color: #1e293b;'>" +
            "<p style='font-size: 15px; margin: 0 0 12px 0;'>" +
              "เรียน / Dear <strong>" + escapeHtml(data.fullName || 'Student') + "</strong> " +
              "<span style='color: #64748b;'>(รหัส: <strong>" + escapeHtml(data.studentId || '-') + "</strong>)</span>," +
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
              "<div><strong>สาขาวิชา / Department:</strong> " + escapeHtml(data.department || '-') + "</div>" +
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

  // ส่งแจ้งเตือนคำร้องเข้าใหม่ไปยังแอดมิน (LINE / Discord / Webhook)
  try {
    var courseSummaryList = courses.map(function(c) {
      return "• " + (c.courseCode || '') + " " + (c.courseName || '') + " (กลุ่ม " + (c.section || '') + ")";
    }).join("\n");

    var adminAlertMsg = "\n📩 [มีคำร้องสำรองที่นั่งเข้าใหม่!]\n" +
                        "------------------------\n" +
                        "👤 นักศึกษา: " + (data.fullName || '-') + "\n" +
                        "🆔 รหัสนักศึกษา: " + (data.studentId || '-') + "\n" +
                        "🏫 สาขาวิชา: " + (data.department || '-') + "\n" +
                        "🔖 รหัสคำร้อง: " + id + "\n" +
                        "👥 จำนวนที่นั่ง: " + totalSeats + " ที่นั่ง\n\n" +
                        "📚 รายวิชาที่ขอสำรอง:\n" + courseSummaryList + "\n" +
                        "------------------------\n" +
                        "กรุณาเข้าตรวจในระบบแอดมิน";

    sendAdminWebhookNotification(adminAlertMsg);
  } catch (alertErr) {
    Logger.log("Admin notification error: " + alertErr.toString());
  }

}

// เรียกจากหน้าเว็บหลังส่งคำร้องสำเร็จ (ทำงานเบื้องหลัง นักศึกษาไม่ต้องรอ) ทำงานได้ครั้งเดียวต่อคำร้อง
function handleSubmitFollowUp(data) {
  var key = 'post_' + String(data.id || '');
  var cache = CacheService.getScriptCache();
  var raw = cache.get(key);
  if (!raw) return jsonOut({ success: true, skipped: true });
  cache.remove(key);
  runSubmitNotifications(JSON.parse(raw));
  return jsonOut({ success: true });
}

// เขียนกลับเฉพาะคอลัมน์ที่เปลี่ยนจากการพิจารณา (O..U และ X)
// ห้ามเขียนทับทั้งแถว: Google Sheets จะตีความค่าใหม่เหมือนพิมพ์เอง ทำให้รหัสนักศึกษา/เบอร์โทรที่เป็นข้อความ
// กลายเป็นตัวเลข (เบอร์โทรหายเลข 0 นำหน้า) และวันที่ยื่นคำร้องอาจถูกแปลงผิดปี => คำร้องหายจากหน้าตรวจสอบสถานะ
function writeDecisionColumns(sheet, rowNum, row) {
  sheet.getRange(rowNum, 15, 1, 7).setValues([row.slice(14, 21)]); // O:U  สถานะ, เหตุผล, จำนวนวิชา, วันที่ดำเนินการ, ผู้ดำเนินการ, หลักฐาน JSON, รายวิชา JSON
  sheet.getRange(rowNum, 24).setValue(row[23] || '');               // X    สถานะการส่งอีเมล
}

// เวอร์ชันข้อมูล: เพิ่มทุกครั้งที่มีการเขียน ใช้ตัดสินว่าแคชผลค้นหารายนักศึกษายังใช้ได้ไหม
// ทำให้หน้าตรวจสอบสถานะที่เช็กซ้ำทุก 30 วินาทีแทบไม่ต้องอ่านชีตเลยถ้าไม่มีอะไรเปลี่ยน
function getDataVersion() {
  return CacheService.getScriptCache().get('data_ver') || '0';
}

function bumpDataVersion() {
  CacheService.getScriptCache().put('data_ver', Date.now() + '-' + Math.random().toString(36).slice(2), 21600);
}

function normalizeId(v) {
  return String(v == null ? '' : v).replace(/\D/g, '');
}

function handleUpdateStatus(data) {
  // ล็อกเฉพาะช่วงอ่าน-แก้-เขียนชีต (ไม่กี่ร้อยมิลลิวินาที) แล้วปล่อยก่อนส่งอีเมล
  // เดิมล็อกค้างระหว่างส่งอีเมล 2-4 วิ ทำให้แอดมินกดหลายรายการติดกันต้องต่อคิวรอ
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return jsonOut({ success: false, error: 'ระบบกำลังประมวลผลคำขออื่น กรุณาลองใหม่' });
  var sheet = requestsSheet();
  var rowNum = findRowById(sheet, data.requestId);
  if (rowNum === -1) { lock.releaseLock(); return jsonOut({ success: false, error: 'ไม่พบคำร้อง' }); }

  var nowDate = new Date();
  var formattedDate = Utilities.formatDate(nowDate, "GMT+7", "dd/MM/yyyy HH:mm:ss"); 
  var now = nowDate.toISOString();
  
  var status = data.status;
  var rawReason = data.rejectionReason || data.reason || ''; 
  var rejectionReason = status === 'ไม่อนุมัติ' ? rawReason : '';
  var processedBy = data.processedBy || 'แอดมินระบบ';

  // อ่านทั้งแถวครั้งเดียว แก้ในหน่วยความจำ แล้วเขียนกลับครั้งเดียว (เดิมเรียกชีต ~10 ครั้งต่อการกดอนุมัติ 1 ครั้ง)
  var rowRange = sheet.getRange(rowNum, 1, 1, REQUESTS_HEADERS.length);
  var row = rowRange.getValues()[0];
  var courses = [];
  try { courses = row[20] ? JSON.parse(row[20]) : []; } catch (err) { courses = []; }
  courses = courses.map(function (c) {
    return Object.assign({}, c, {
      status: status,
      rejectionReason: rejectionReason || undefined,
      processedBy: processedBy,
      processedAt: now
    });
  });
  row[14] = status;
  row[15] = rejectionReason;
  row[17] = formattedDate;
  row[18] = processedBy;
  row[20] = JSON.stringify(courses);
  var emailStatusCol = 23; // index ของคอลัมน์ 24
  var result = rowToRequest(row);
  try {
    writeDecisionColumns(sheet, rowNum, row);
    bumpDataVersion();
  } finally {
    lock.releaseLock();
  }

  var coStudentsList = extractCoStudents(courses);
  var studentEmail = result.notifyContact || '';

  var shouldEmail = status === 'อนุมัติแล้ว' || status === 'ไม่อนุมัติ';
  if (shouldEmail && studentEmail && studentEmail.indexOf('@') > -1) {
    var isApprove = status === 'อนุมัติแล้ว';
    var isReject = status === 'ไม่อนุมัติ';
    var headerBg = isApprove ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : (isReject ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' : 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)');
    var statusBadgeColor = isApprove ? '#059669' : (isReject ? '#dc2626' : '#d97706');
    var displayStatusEN = isApprove ? 'Approved' : (isReject ? 'Rejected' : 'Pending');
    
    var emailSubject = "[FTU FST] ผลการพิจารณาคำร้องสำรองที่นั่ง / Result: " + status + " (" + displayStatusEN + ") - " + result.id;
    
    var coursesCardsHtml = buildMobileCoursesCards(courses, status);
    var coStudentsCardHtml = buildMobileCoStudentsCard(coStudentsList);
    var regBoxHtml = buildMobileRegInstructionsBox(isApprove);

    var textBody = "เรียน / Dear " + result.fullName + " (รหัสนักศึกษา / Student ID: " + result.studentId + "),\n\n" +
                    "คำร้องขอสำรองที่นั่งวิชาเรียนของท่าน (รหัสคำร้อง / Request ID: " + result.id + ") ได้รับการพิจารณาเรียบร้อยแล้ว\n" +
                    "Your course seat reservation request has been processed.\n\n" +
                    "--------------------------------------------------\n" +
                    "• ผลการพิจารณา / Decision: " + status + " (" + displayStatusEN + ")\n" +
                    "• ผู้ดำเนินการ / Processed by: " + processedBy + "\n" +
                    "• วันที่ดำเนินการ / Processed Date: " + formattedDate + "\n" +
                    (rejectionReason ? "• เหตุผล/หมายเหตุ / Reason: " + rejectionReason + "\n" : "") +
                    "--------------------------------------------------\n\n";

    if (coStudentsList.length > 0) {
      textBody += "รายชื่อเพื่อนร่วมกลุ่มที่ฝากจอง / Co-applicants:\n";
      for (var f = 0; f < coStudentsList.length; f++) {
        textBody += (f + 1) + ". " + coStudentsList[f].fullName + " (" + coStudentsList[f].studentId + ")\n";
      }
      textBody += "\n";
    }

    if (isApprove) {
      textBody += "[คำแนะนำในการลงทะเบียนเรียน / Registration Instructions]\n" +
                  "คำร้องของท่านได้รับการอนุมัติแล้ว กรุณาเข้าไปเพิ่มรายวิชาดังกล่าวด้วยตนเองในระบบบริการการศึกษา:\n" +
                  "Your seat reservation has been Approved. Please proceed to add this course yourself in the FTU Registrar System:\n" +
                  "URL: " + REG_SYSTEM_URL + "\n\n";
    }

    textBody += "--\n" + SENDER_NAME + "\nคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี";

    var htmlBody = 
      "<div style='background-color: #f8fafc; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>" +
        "<div style='max-width: 560px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;'>" +
          
          "<div style='background: " + headerBg + "; color: #ffffff; padding: 20px 16px; text-align: center;'>" +
            "<h2 style='margin: 0; font-size: 18px; font-weight: bold;'>ผลการพิจารณาคำร้องสำรองที่นั่ง</h2>" +
            "<p style='margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;'>Course Seat Reservation Status Notification</p>" +
          "</div>" +

          "<div style='padding: 18px 16px; color: #1e293b;'>" +
            "<p style='font-size: 15px; margin: 0 0 12px 0;'>" +
              "เรียน / Dear <strong>" + escapeHtml(result.fullName) + "</strong> " +
              "<span style='color: #64748b;'>(รหัส: <strong>" + escapeHtml(result.studentId) + "</strong>)</span>," +
            "</p>" +

            "<div style='background-color: #f8fafc; border-left: 5px solid " + statusBadgeColor + "; border-radius: 8px; padding: 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;'>" +
              "<div style='font-size: 15px; margin-bottom: 4px;'>" +
                "<strong>ผลการพิจารณา / Decision:</strong> " +
                "<span style='color: " + statusBadgeColor + "; font-weight: bold; font-size: 16px;'>" + status + " (" + displayStatusEN + ")</span>" +
              "</div>" +
              "<div><strong>รหัสคำร้อง / Request ID:</strong> <span style='color: #0284c7; font-weight: bold;'>" + result.id + "</span></div>" +
              (rejectionReason ? "<div style='color: #dc2626; margin-top: 4px;'><strong>เหตุผล/หมายเหตุ (Reason / Remarks):</strong> " + escapeHtml(rejectionReason) + "</div>" : "") +
              "<div style='color: #64748b; font-size: 12px; margin-top: 4px;'>ผู้ดำเนินการ: " + escapeHtml(processedBy) + " &nbsp;|&nbsp; วันที่: " + formattedDate + "</div>" +
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
    row[emailStatusCol] = (row[emailStatusCol] || '') + (sendRes2.success ? " | ✅ แจ้งผลแล้ว (" + status + ")" : " | ❌ แจ้งผลล้มเหลว: " + sendRes2.message);
  } else if (shouldEmail) {
    row[emailStatusCol] = (row[emailStatusCol] || '') + " | ⚠️ ไม่มีอีเมล";
  }
  if (shouldEmail) sheet.getRange(rowNum, 24).setValue(row[emailStatusCol] || '');

  try {
    var statusAlertMsg = "\n📢 [ผลการพิจารณาคำร้องสำรองที่นั่ง]\n" +
                         "------------------------\n" +
                         "🔖 รหัสคำร้อง: " + result.id + "\n" +
                         "👤 นักศึกษา: " + result.fullName + " (" + result.studentId + ")\n" +
                         "⚖️ ผลการพิจารณา: " + status + "\n" +
                         "👮‍♂️ ผู้ดำเนินการ: " + processedBy + "\n" +
                         (rejectionReason ? "📌 หมายเหตุ: " + rejectionReason + "\n" : "") +
                         "------------------------";
    sendStatusChangeWebhookNotification(statusAlertMsg);
  } catch (err) {}

  return jsonOut({ success: true, data: result, processedBy: processedBy, processedAt: now });
}

function handleUpdateCourseStatus(data) {
  // ล็อกเฉพาะช่วงอ่าน-แก้-เขียนชีต (ไม่กี่ร้อยมิลลิวินาที) แล้วปล่อยก่อนส่งอีเมล
  // เดิมล็อกค้างระหว่างส่งอีเมล 2-4 วิ ทำให้แอดมินกดหลายรายการติดกันต้องต่อคิวรอ
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return jsonOut({ success: false, error: 'ระบบกำลังประมวลผลคำขออื่น กรุณาลองใหม่' });
  var sheet = requestsSheet();
  var rowNum = findRowById(sheet, data.requestId);
  if (rowNum === -1) { lock.releaseLock(); return jsonOut({ success: false, error: 'ไม่พบคำร้อง' }); }

  var nowDate = new Date();
  var formattedDate = Utilities.formatDate(nowDate, "GMT+7", "dd/MM/yyyy HH:mm:ss");
  var now = nowDate.toISOString();
  
  var status = data.status;
  var rawReason = data.rejectionReason || data.reason || '';
  var rejectionReason = status === 'ไม่อนุมัติ' ? rawReason : '';
  var processedBy = data.processedBy || 'แอดมินระบบ';

  var rowRange = sheet.getRange(rowNum, 1, 1, REQUESTS_HEADERS.length);
  var row = rowRange.getValues()[0];
  var courses = [];
  try { courses = row[20] ? JSON.parse(row[20]) : []; } catch (err) { courses = []; }

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

  var overallStatus = recomputeOverallStatus(courses);
  var overallRejectionReasons = courses
    .filter(function(c) { return c.status === 'ไม่อนุมัติ' && c.rejectionReason; })
    .map(function(c) { return c.courseCode + ': ' + c.rejectionReason; })
    .join('\n');

  row[20] = JSON.stringify(courses);
  row[14] = overallStatus;
  row[15] = overallRejectionReasons;
  row[17] = overallStatus !== 'รอดำเนินการ' ? formattedDate : '';
  row[18] = overallStatus !== 'รอดำเนินการ' ? processedBy : '';
  var emailStatusCol = 23;
  var result = rowToRequest(row);
  try {
    writeDecisionColumns(sheet, rowNum, row);
    bumpDataVersion();
  } finally {
    lock.releaseLock();
  }

  var coStudentsList = extractCoStudents(courses);
  var studentEmail = result.notifyContact || '';

  // รวมเป็นอีเมลเดียวเมื่อพิจารณา "ครบทุกวิชา" แล้ว (เดิมส่ง 1 ฉบับต่อวิชา คำร้อง 3 วิชาได้ 3 ฉบับ)
  var approvedCount = courses.filter(function (c) { return c.status === 'อนุมัติแล้ว'; }).length;
  var rejectedCount = courses.filter(function (c) { return c.status === 'ไม่อนุมัติ'; }).length;
  var allDecided = courses.length > 0 && approvedCount + rejectedCount === courses.length;
  var shouldEmail = (status === 'อนุมัติแล้ว' || status === 'ไม่อนุมัติ') && allDecided;
  if (shouldEmail && studentEmail && studentEmail.indexOf('@') > -1) {
    var isApprove = approvedCount > 0;
    var isReject = approvedCount === 0;
    var decisionSummary = approvedCount === courses.length ? 'อนุมัติทุกวิชา'
      : (rejectedCount === courses.length ? 'ไม่อนุมัติทุกวิชา'
      : 'อนุมัติ ' + approvedCount + ' วิชา / ไม่อนุมัติ ' + rejectedCount + ' วิชา');
    var decisionSummaryEN = approvedCount === courses.length ? 'All approved'
      : (rejectedCount === courses.length ? 'All rejected'
      : approvedCount + ' approved / ' + rejectedCount + ' rejected');
    rejectionReason = overallRejectionReasons;
    var headerBg = isApprove ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : (isReject ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' : 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)');
    var statusBadgeColor = isApprove ? '#059669' : (isReject ? '#dc2626' : '#d97706');
    var displayStatusEN = isApprove ? 'Approved' : (isReject ? 'Rejected' : 'Pending');
    
    var emailSubject = "[FTU FST] ผลการพิจารณาคำร้องสำรองที่นั่ง: " + decisionSummary + " - " + result.id;
    var coursesCardsHtml = buildMobileCoursesCards(courses, '');
    var coStudentsCardHtml = buildMobileCoStudentsCard(coStudentsList);
    var regBoxHtml = buildMobileRegInstructionsBox(isApprove);

    var textBody = "เรียน / Dear " + result.fullName + " (รหัสนักศึกษา / Student ID: " + result.studentId + "),\n\n" +
                    "คำร้องรหัส " + result.id + " ได้รับการพิจารณาครบทุกรายวิชาแล้ว\n" +
                    "All courses in your request " + result.id + " have been processed.\n\n" +
                    "--------------------------------------------------\n" +
                    courses.map(function (c) { return "• " + c.courseCode + " " + (c.courseName || '') + ": " + c.status; }).join("\n") + "\n" +
                    "• สรุปผล / Summary: " + decisionSummary + " (" + decisionSummaryEN + ")\n" +
                    "• ผู้ดำเนินการ / Processed by: " + processedBy + "\n" +
                    (rejectionReason ? "• เหตุผล/หมายเหตุ / Reason: " + rejectionReason + "\n" : "") +
                    "--------------------------------------------------\n\n";

    if (coStudentsList.length > 0) {
      textBody += "รายชื่อเพื่อนร่วมกลุ่มที่ฝากจอง / Co-applicants:\n";
      for (var f = 0; f < coStudentsList.length; f++) {
        textBody += (f + 1) + ". " + coStudentsList[f].fullName + " (" + coStudentsList[f].studentId + ")\n";
      }
      textBody += "\n";
    }

    if (isApprove) {
      textBody += "[คำแนะนำในการลงทะเบียนเรียน / Registration Instructions]\n" +
                  "คำร้องของท่านได้รับการอนุมัติแล้ว กรุณาเข้าไปเพิ่มรายวิชาดังกล่าวด้วยตนเองในระบบบริการการศึกษา:\n" +
                  "Your seat reservation has been Approved. Please proceed to add this course yourself in the FTU Registrar System:\n" +
                  "URL: " + REG_SYSTEM_URL + "\n\n";
    }

    textBody += "--\n" + SENDER_NAME + "\nคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี";

    var htmlBody = 
      "<div style='background-color: #f8fafc; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>" +
        "<div style='max-width: 560px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;'>" +
          
          "<div style='background: " + headerBg + "; color: #ffffff; padding: 20px 16px; text-align: center;'>" +
            "<h2 style='margin: 0; font-size: 18px; font-weight: bold;'>ผลการพิจารณาคำร้องสำรองที่นั่ง</h2>" +
            "<p style='margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;'>Course Seat Reservation Status Notification</p>" +
          "</div>" +

          "<div style='padding: 18px 16px; color: #1e293b;'>" +
            "<p style='font-size: 15px; margin: 0 0 12px 0;'>" +
              "เรียน / Dear <strong>" + escapeHtml(result.fullName) + "</strong> " +
              "<span style='color: #64748b;'>(รหัส: <strong>" + escapeHtml(result.studentId) + "</strong>)</span>," +
            "</p>" +

            "<div style='background-color: #f8fafc; border-left: 5px solid " + statusBadgeColor + "; border-radius: 8px; padding: 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;'>" +
              "<div style='font-size: 15px; margin-bottom: 4px;'>" +
                "<strong>พิจารณาครบทุกรายวิชาแล้ว</strong> <span style='color: #64748b;'>(" + courses.length + " วิชา)</span>" +
              "</div>" +
              "<div><strong>ผลการพิจารณา / Decision:</strong> " +
                "<span style='color: " + statusBadgeColor + "; font-weight: bold; font-size: 15px;'>" + decisionSummary + " (" + decisionSummaryEN + ")</span>" +
              "</div>" +
              "<div><strong>รหัสคำร้อง / Request ID:</strong> <span style='color: #0284c7; font-weight: bold;'>" + result.id + "</span></div>" +
              (rejectionReason ? "<div style='color: #dc2626; margin-top: 4px; white-space: pre-line;'><strong>เหตุผล/หมายเหตุ (Reason / Remarks):</strong> " + escapeHtml(rejectionReason) + "</div>" : "") +
              "<div style='color: #64748b; font-size: 12px; margin-top: 4px;'>ผู้ดำเนินการ: " + escapeHtml(processedBy) + " &nbsp;|&nbsp; วันที่: " + formattedDate + "</div>" +
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
    row[emailStatusCol] = (row[emailStatusCol] || '') + (sendRes3.success ? " | ✅ แจ้งผลครบทุกวิชา (" + decisionSummary + ")" : " | ❌ แจ้งผลล้มเหลว: " + sendRes3.message);
    sheet.getRange(rowNum, 24).setValue(row[emailStatusCol] || '');
  }

  try {
    var courseAlertMsg = "\n📢 [ผลการพิจารณารายวิชา]\n" +
                         "------------------------\n" +
                         "🔖 รหัสคำร้อง: " + result.id + "\n" +
                         "👤 นักศึกษา: " + result.fullName + " (" + result.studentId + ")\n" +
                         "📚 วิชา: " + data.courseCode + "\n" +
                         "⚖️ ผลการพิจารณา: " + status + "\n" +
                         "👮‍♂️ ผู้ดำเนินการ: " + processedBy + "\n" +
                         (rejectionReason ? "📌 หมายเหตุ: " + rejectionReason + "\n" : "") +
                         "------------------------";
    sendStatusChangeWebhookNotification(courseAlertMsg);
  } catch (err) {}

  return jsonOut({ success: true, data: result, processedBy: processedBy, processedAt: now });
}

// ---------- Admin Handlers ----------

function handleAddAdmin(data) {
  var hash = String(data.hash || '');
  if (!/^[0-9a-f]{64}$/.test(hash)) return jsonOut({ success: false, error: 'ข้อมูลรหัสผ่านไม่ถูกต้อง' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = adminsSheet();
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === hash) return jsonOut({ success: true });
    }
    var formattedDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    sheet.appendRow([hash, String(data.name || 'แอดมินทั่วไป').slice(0, 100), formattedDate]);
    return jsonOut({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteAdmin(data) {
  var sheet = adminsSheet();
  var rows = sheet.getDataRange().getValues();
  var rowNum = -1, total = 0;
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    total++;
    if (String(rows[i][0]) === String(data.hash)) rowNum = i + 1;
  }
  if (rowNum > -1 && total <= 1) return jsonOut({ success: false, error: 'ต้องมีแอดมินเหลืออย่างน้อย 1 คน' });
  if (rowNum > -1) sheet.deleteRow(rowNum);
  return jsonOut({ success: true });
}

// บันทึกการตั้งค่าหลายค่าในครั้งเดียว (เดิมหน้าแอดมินยิงทีละค่า 7 ครั้งติดกัน = รอ 10-20 วินาที)
function handleSaveSettings(data) {
  var list = data.settings || [];
  if (!list.length) return jsonOut({ success: true });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = settingsSheet();
    var rows = sheet.getDataRange().getValues();
    var index = {};
    for (var i = 1; i < rows.length; i++) if (rows[i][0]) index[String(rows[i][0])] = i;
    var appended = [];
    list.forEach(function (it) {
      var key = String(it.key || '');
      if (!key) return;
      var val = it.value == null ? '' : String(it.value);
      if (val.length > 49000) throw new Error('ค่าการตั้งค่า "' + key + '" ยาวเกินที่ Google Sheets รับได้ (50,000 ตัวอักษร/ช่อง)');
      if (index[key] !== undefined) rows[index[key]][1] = val;
      else appended.push([key, val]);
    });
    if (rows.length > 1) sheet.getRange(2, 1, rows.length - 1, 2).setValues(rows.slice(1).map(function (r) { return [r[0], r[1]]; }));
    if (appended.length) sheet.getRange(sheet.getLastRow() + 1, 1, appended.length, 2).setValues(appended);
    invalidateSettingsCache();
    return jsonOut({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// บันทึกประวัติการอนุมัติฝั่งเซิร์ฟเวอร์ (เดิมหน้าเว็บไม่เคยเรียกบันทึก ทำให้แท็บประวัติว่างเปล่า)
function logAudit(adminName, action, targetId, details) {
  try {
    var id = 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    var formattedDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    auditSheet().appendRow([id, formattedDate, adminName || 'เจ้าหน้าที่', action || '', targetId || '', String(details || '').slice(0, 1000)]);
  } catch (e) {
    Logger.log('audit log error: ' + e);
  }
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
