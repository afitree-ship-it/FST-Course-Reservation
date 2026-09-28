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

// ส่งข้อความแจ้งเตือนแอดมินผ่าน LINE / Discord / Webhook
function sendAdminWebhookNotification(message) {
  try {
    var sSheet = settingsSheet();
    var sRows = sSheet.getDataRange().getValues();
    var notifyEnabled = 'false';
    var notifyToken = '';
    for (var i = 1; i < sRows.length; i++) {
      if (String(sRows[i][0]) === 'notify_on_new_request') notifyEnabled = String(sRows[i][1]);
      if (String(sRows[i][0]) === 'notify_line_token') notifyToken = String(sRows[i][1]);
    }
    if (notifyEnabled !== 'true' || !notifyToken) return;

    if (notifyToken.indexOf('http://') === 0 || notifyToken.indexOf('https://') === 0) {
      UrlFetchApp.fetch(notifyToken, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ content: message, text: message }),
        muteHttpExceptions: true
      });
    } else {
      UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
        method: 'post',
        headers: { 'Authorization': 'Bearer ' + notifyToken },
        payload: { message: message },
        muteHttpExceptions: true
      });
    }
  } catch (err) {
    Logger.log('Admin notify error: ' + err.toString());
  }
}

function sendStatusChangeWebhookNotification(message) {
  try {
    var sSheet = settingsSheet();
    var sRows = sSheet.getDataRange().getValues();
    var notifyEnabled = 'true';
    var notifyToken = '';
    for (var i = 1; i < sRows.length; i++) {
      if (String(sRows[i][0]) === 'notify_on_status_change') notifyEnabled = String(sRows[i][1]);
      if (String(sRows[i][0]) === 'notify_line_token') notifyToken = String(sRows[i][1]);
    }
    if (notifyEnabled === 'false' || !notifyToken) return;

    if (notifyToken.indexOf('http://') === 0 || notifyToken.indexOf('https://') === 0) {
      UrlFetchApp.fetch(notifyToken, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ content: message, text: message }),
        muteHttpExceptions: true
      });
    } else {
      UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
        method: 'post',
        headers: { 'Authorization': 'Bearer ' + notifyToken },
        payload: { message: message },
        muteHttpExceptions: true
      });
    }
  } catch (err) {
    Logger.log('Status change notify error: ' + err.toString());
  }
}

function handleDispatchNotification(data) {
  var tokenOrWebhook = data.tokenOrWebhook;
  var message = data.message;
  if (!tokenOrWebhook || !message) {
    return jsonOut({ success: false, error: 'Missing token or message' });
  }
  try {
    if (tokenOrWebhook.indexOf('http://') === 0 || tokenOrWebhook.indexOf('https://') === 0) {
      UrlFetchApp.fetch(tokenOrWebhook, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ content: message, text: message }),
        muteHttpExceptions: true
      });
    } else {
      UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
        method: 'post',
        headers: { 'Authorization': 'Bearer ' + tokenOrWebhook },
        payload: { message: message },
        muteHttpExceptions: true
      });
    }
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
    if (action === 'dispatchNotification') return handleDispatchNotification(postData);

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
      coStudentsText += item.studentId + " - " + item.fullName + " (วิชา: " + item.courseCode + ")\n";
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
    .join('\n'); 

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

    var textBody = "เรียน / Dear " + result.fullName + " (รหัสนักศึกษา / Student ID: " + result.studentId + "),\n\n" +
                    "รายวิชา " + data.courseCode + " ตามคำร้องรหัส " + result.id + " ได้รับการพิจารณาแล้ว\n" +
                    "Your request for course " + data.courseCode + " has been processed.\n\n" +
                    "--------------------------------------------------\n" +
                    "• รหัสวิชา / Course Code: " + data.courseCode + "\n" +
                    "• ผลการพิจารณา / Decision: " + status + " (" + displayStatusEN + ")\n" +
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
