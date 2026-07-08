import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'th' | 'en';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isTh: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  th: {
    // Header & Banner
    demoModeWarn: 'แอปกำลังทำงานในโหมดระบบสำลองข้อมูลที่จัดเก็บในเบราว์เซอร์ชั่วคราว (Demo Mode) คุณสามารถทดสอบการส่ง ส่งข้อมูล และตรวจเช็คระบบได้ปกติ',
    demoModeReal: 'เพื่อเชื่อมต่อจริง: ล็อกอินเข้าระบบ "สำหรับเจ้าหน้าที่" แล้วเปิดเมนู "ตั้งค่า Google Sheet" เพื่อวางลิงก์บริการใช้งานของตนเอง!',
    systemTitle: 'ระบบสำรองที่นั่งวิชาเรียน',
    fstSubtitle: 'Faculty of Science and Technology',
    tabReserve: 'สำรองที่นั่ง',
    tabStatus: 'ตรวจสอบสถานะ',
    tabAdmin: 'สำหรับเจ้าหน้าที่',
    staffLogin: 'สำหรับเจ้าหน้าที่',
    logoutAdmin: 'ออกจากระบบแอดมินเรียบร้อย',
    copyright: 'คณะวิทยาศาสตร์และเทคโนโลยี • มหาวิทยาลัยฟาฏอนี',
    forAdmin: 'สำหรับแอดมิน:',
    adminLogin: 'เจ้าหน้าที่คณะเข้าสู่ระบบ',

    // Post-Submission Success
    successRef: 'เลขอ้างอิงติดตาม (ID):',
    successSubmitted: 'บันทึกคำร้องเรียบร้อยแล้ว!',
    successProjectDone: 'เสร็จสิ้นโครงการดึงข้อมูลเรียบร้อย',
    successApplicant: 'ผู้ส่งคำขอ:',
    successCourse: 'วิชาที่ขอ:',
    successSec: 'กลุ่ม:',
    successDetail: 'เจ้าหน้าที่จะตรวจสอบและอนุมัติคำร้องของคุณในลำดับถัดไป คุณสามารถตรวจสอบสถานะได้ตลอดเวลาโดยใช้รหัสนักศึกษาของคุณ',
    successSubmitAnother: 'ส่งคำร้องเพิ่มอีกวิชา',
    successGoStatus: 'ไปหน้าตรวจสอบสถานะ',

    // FormSection Elements
    formTitle: 'แบบฟอร์มยื่นคำร้องสำรองที่นั่งรายวิชา',
    formSubtitle: 'กรุณากรอกข้อมูลให้ครบถ้วน ทั้งนี้ คณะขอสงวนสิทธิ์ในการพิจารณาอนุมัติรายวิชานอกสังกัด',
    sectionApplicant: 'ส่วนที่ 1: ข้อมูลผู้ยื่นคำร้อง',
    fullNameLabel: 'ชื่อ - นามสกุล',
    fullNamePlaceholder: 'เช่น นายมูฮัมหมัด ซาการียา',
    fullNameHelp: 'ระบุชื่อเป็นภาษาไทย หรือ อังกฤษตามบัตรนักศึกษา',
    studentIdLabel: 'รหัสนักศึกษา',
    facultyLabel: 'สังกัดคณะ',
    departmentLabel: 'สาขาวิชา',
    deptSelectPlaceholder: '-- เลือกสาขาวิชา --',
    academicYearLabel: 'ชั้นปีการศึกษา',
    academicYearPlaceholder: '-- เลือกชั้นปี --',
    sectionCourse: 'ส่วนที่ 2: รายละเอียดรายวิชาและกลุ่มที่ขอสำรอง',
    courseCodeLabel: 'รหัสวิชา',
    courseTitleLabel: 'ชื่อวิชา',
    courseTitlePlaceholder: 'เช่น Database Systems หรือ เคมีพื้นฐาน',
    courseSecLabel: 'กลุ่มเรียน (Section)',
    courseSecPlaceholder: 'เช่น กลุ่ม 01',
    instructorLabel: 'อาจารย์ผู้สอนประจำกลุ่ม',
    instructorPlaceholder: 'เช่น ดร.ฟาฏิมะห์ มะมิง',
    instructorHelp: 'ระบุชื่ออาจารย์ผู้สอนวิชาที่เลือกเข้าเรียน หรือหากไม่ทราบให้พิมพ์ "ฝ่ายวิชาการ"',
    sectionContact: 'ส่วนที่ 3: ช่องทางการติดต่อกลับโดยเจ้าหน้าที่ (Facebook)',
    contactGuideTitle: 'สำหรับติดต่อกลับ:',
    contactGuideDesc: 'เจ้าหน้าที่จะดำเนินการค้นหาและติดต่อกลับผู้ยื่นคำร้องผ่านช่องทาง Facebook โดยตรง ในกรณีที่พบปัญหา ข้อสงสัย หรือมีความจำเป็นต้องแจ้งข้อมูลเพิ่มเติม โดยนักศึกษาสามารถเลือก แนบรูปหน้าโปรไฟล์ หรือ ระบุลิงก์โปรไฟล์ ก็ได้ตามประสงค์',
    toggleProofFile: 'สะดวกแนบรูปหน้าโปรไฟล์ Facebook',
    toggleProofLink: 'สะดวกพิมพ์ลิงก์ของโปรไฟล์แทน',
    dragAndDropFile: 'ลากรูปภาพหน้าจอโปรไฟล์ของคุณมาวาง หรือกดเพื่ออัปโหลด',
    fileSupport: 'รองรับเฉพาะรูปถ่ายหน้าจอโปรไฟล์หลัก Facebook ของคุณ',
    linkInputLabel: 'วางลิงก์โปรไฟล์ Facebook ของคุณเพื่อให้สืบค้นข้อมูล',
    phoneLabel: 'เบอร์โทรที่สามารถติดต่อได้',
    phoneOptional: '(ไม่บังคับกรอก)',
    phonePlaceholder: 'เช่น 0812345678',
    sectionConsent: 'ข้อตกลงและคำรับรองความถูกต้อง',
    consentCheckbox: 'ข้าพเจ้ายินยอมให้จัดเก็บข้อมูลดังกล่าวข้างต้น และขอรับรองว่าข้อมูลและหลักฐานที่จัดส่งทั้งหมดนี้เป็นความจริงทุกประการ',
    submitButton: 'ส่งคำร้องขอสำรองที่นั่ง',
    submitting: 'กำลังดำเนินการจัดส่งข้อมูล...',

    // FormSection Validation Warnings
    errFullName: 'กรุณาระบุชื่อ-นามสกุล',
    errStudentId: 'กรุณาระบุรหัสนักศึกษา',
    errStudentIdValid: 'รหัสนักศึกษาต้องเป็นตัวเลข 9 หลักเท่านั้น',
    errDepartment: 'กรุณาเลือกสาขาวิชา',
    errYear: 'กรุณาระบุชั้นปี',
    errCourseCode: 'กรุณาระบุรหัสวิชา',
    errCourseName: 'กรุณาระบุชื่อวิชา',
    errSec: 'กรุณาระบุกลุ่มเรียน (Section)',
    errInstructor: 'กรุณาระบุชื่ออาจารย์ผู้สอน',
    errProofFile: 'กรุณาอัปโหลดรูปภาพหน้าจอโปรไฟล์ Facebook เพื่อความสะดวกในการค้นหาและติดต่อกลับ',
    errProofLink: 'กรุณาวางลิงก์โปรไฟล์ Facebook ของคุณให้ถูกต้อง',
    errPhone: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0)',
    errConsent: 'กรุณากดเลือกยินยอมเพื่อส่งข้อมูลคำร้องสำรองที่นั่ง',

    // StatusSection Elements
    statusTitle: 'ตรวจสอบข้อมูลสิทธิ์และสถานะยื่นคำร้อง',
    statusDesc: 'กรอกรหัสนักศึกษา 9 หลักของคุณด้านล่าง เพื่อเรียกดูประวัติและติดตามผลการจัดสิทธิ์จากเจ้าหน้าที่โดยตรง',
    statusInputPlaceholder: 'รหัสนักศึกษา 9 หลัก',
    statusSearchButton: 'ค้นประวัติสิทธิ์',
    statusSearching: 'กำลังเรียกดูข้อมูล...',
    statusHistoryTitle: 'ประวัติลำดับการยื่นคำร้องสำรองสิทธิ์',
    statusNoRecords: 'ไม่พบข้อมูลการยื่นเรื่องสำรองที่นั่งภายใต้รหัสนักศึกษานี้ในระบบ',
    statusNoRecordsSub: 'หากคุณเพิ่งส่งข้อมูล โปรดรอระบบอัปเดตสักครู่ หรือทำการส่งคำร้องใหม่อีกครั้งผ่านหน้าหลัก',
    statusRequestDate: 'วันที่ยื่นคำร้อง:',
    statusCourseCode: 'รหัสวิชา:',
    statusCourseName: 'ชื่อรายวิชา:',
    statusSectionLabel: 'เซกชัน/กลุ่มเรียน:',
    statusInstructorLabel: 'อาจารย์ผู้สอน:',
    statusDeptLabel: 'คณะ/สาขา:',
    statusPhoneLabel: 'เบอร์โทรศัพท์:',
    statusFeedbackLabel: 'ช่องทางติดต่อ Facebook:',
    statusFileAttached: 'แนบไฟล์รูปภาพโปรไฟล์',
    statusLinkProvided: 'ลิงก์โปรไฟล์ยื่นสืบค้น',
    statusEvaluationTitle: 'สถานะการพิจารณาตรวจสอบจากฝ่ายวิชาการ',
    statusEvaluationPending: 'รอดำเนินการ (Pending)',
    statusEvaluationPendingDesc: 'เจ้าพนักงานกำลังสืบค้นสิทธิ์เข้ากลุ่มเรียนและจัดคิว โปรดติดตามสถานะอย่างต่อเนื่อง',
    statusEvaluationApproved: 'อนุมัติเรียบร้อย (Approved)',
    statusEvaluationApprovedDesc: 'ยินดีด้วย! ท่านได้รับการสำรองและจัดสิทธิ์เข้าศึกษาและเข้าร่วมกลุ่มเรียนวิชานี้เรียบร้อยแล้ว',
    statusEvaluationRejected: 'ไม่พิจารณาอนุมัติ (Rejected)',
    statusEvaluationRejectedDesc: 'คำร้องขอถูกปฏิเสธโดยเจ้าหน้าที่ฝ่ายวิชาการ',
    statusRejectionReason: 'เหตุผลการปฏิเสธคำขอ:',

    // AdminSection elements
    adminDashboardTitle: 'หน้าควบคุมงานจัดการการจัดสรรสิทธิ์วิชาเรียน',
    adminDashboardDesc: 'สำหรับอำนวยความสะดวกในการจัดสรร คัดกรอง ตรวจสอบหลักฐาน และพิจารณาอนุมัติคำร้องขอสำรองที่นั่งเรียนของนักศึกษา FST',
    adminLoading: 'กำลังเตรียมข้อมูลหลังบ้านประจำคณะ...',
    adminTotalRequests: 'จำนวนคำร้องสั่งสมรวม',
    adminPendingRequests: 'รอดำเนินการพิจารณา',
    adminApprovedRequests: 'อนุมัติสิทธิ์สำเร็จ',
    adminRejectedRequests: 'ปฏิเสธคำขอสิทธิ์',
    adminSearchPlaceholder: 'ค้นด้วยชื่อ รหัสนักศึกษา หรือรหัสวิชา...',
    adminFilterStatus: 'สถานะคำร้อง:',
    adminFilterFaculty: 'ตัวกรองคณะ:',
    adminExportExcel: 'ส่งออกข้อมูล (Google Sheets / Excel)',
    adminClearAll: 'ล้างข้อมูลผู้ใช้ทั้งหมดเพื่อขึ้นปีการศึกษาใหม่',
    adminClearConfirm: 'คำเตือน: การล้างข้อมูลจะลบคำขอทั้งหมดทันทีอย่างถาวร ยืนยันที่จะลบล้างฐานข้อมูลหรือไม่?',
    adminClearedSuccess: 'ล้างข้อมูลและทดสอบเรียบร้อยแล้ว',
    adminTotalCount: 'พบทั้งหมด {{count}} รายการ',
    adminNoRequestsFound: 'ไม่พบประวัติผลลัพธ์คำขอสอดคล้องเงื่อนไขการกรองข้างต้น',
    adminStudentId: 'รหัสนักศึกษา:',
    adminFacultyDept: 'คณะ / สาขา:',
    adminCourseInstructor: 'วิชา: {{code}} - {{name}} • กลุ่มเรียน: {{section}} (โดย {{instructor}})',
    adminContactPhone: 'เบอร์โทรศัทพ์:',
    adminFacebookAccess: 'ช่องทางติดต่อเฟสบุค:',
    adminSubmitDate: 'ยื่นคำขอเมื่อ:',
    adminStatusAction: 'ประเมินสถานภาพคำร้อง:',
    adminActionApprove: 'อนุมัติคำร้องสิทธิ์',
    adminActionReject: 'ปฏิเสธและกรอกเหตุผล',
    adminRejectionModalTitle: 'ระบุเหตุผลในการปฏิเสธคำร้องขอสำรองที่นั่งเรียน',
    adminRejectionModalPlaceholder: 'เช่น กลุ่มเรียนมีที่นั่งเต็มจริงๆ แล้ว, กรุณากรอกรหัสวิชาให้ถูกต้อง เป็นต้น',
    adminRejectionModalCancel: 'ยกเลิกสิทธิ์',
    adminRejectionModalConfirm: 'ยืนยันการปฏิเสธ',
    adminLoginCardTitle: 'ระบบสารสนเทศหลังบ้าน (สำหรับเจ้าหน้าที่)',
    adminLoginCardDesc: 'กรุณากรอกรหัสความปลอดภัยสำหรับเข้าถึงบอร์ดพิจารณาคำร้องสำรองที่นั่งวิชาเรียนของนักศึกษา',
    adminLoginPassLabel: 'รหัสผ่านรักษาความปลอดภัยหน้าบอร์ดควบคุม',
    adminLoginPassPlaceholder: 'ป้อนรหัสผ่านที่ผู้ดูแลระบบกำหนดไว้',
    adminLoginBtn: 'เข้าสู่ระบบควบคุมความปลอดภัย',
    adminLoginHint: 'สำหรับแอดมินหรืออาจารย์ผู้ประสานงานประจำฝ่ายวิชาการ ดึงเบอร์รายงานผลของระบบผ่านโมเดล',
    adminActionToastApproved: 'อัปเดตสถานะเป็น "อนุมัติแล้ว" เรียบร้อย',
    adminActionToastRejected: 'อัปเดตสถานะเป็น "ปฏิเสธ/ไม่อนุมัติ" เรียบร้อย',

    // General Toasts
    toastFillError: 'กรุณากรอกข้อมูลในแบบฟอร์มให้ถูกต้องและครบถ้วนตามหลักเกณฑ์ที่กำหนดยื่นสิทธิ์',
    toastSaveSuccess: 'ส่งใบคำขอสำรองสิทธิ์การศึกษาสำเร็จ! เลขเอกสารอ้างอิง: {{id}}',
    toastLoadError: 'ไม่สามารถเรียกดูหน้าจอดังกล่าวได้สำเร็จ โปรดทดลองโหลดซ้ำภายหลัง',
    toastInvalidStudentId: 'รหัสนักศึกษาต้องประกอบด้วยตัวเลข 9 หลักเท่านั้น',

    // Faculties & Departments (Thai to English display)
    faculty_scitech: 'คณะวิทยาศาสตร์และเทคโนโลยี',
    faculty_islamic: 'คณะอิสลามศึกษาและนิติศาสตร์',
    faculty_liberal: 'คณะศิลปศาสตร์และสังคมศาสตร์',
    faculty_education: 'คณะศึกษาศาสตร์',

    'สาขาวิชาเทคโนโลยีและวิทยาการดิจิทัล': 'สาขาวิชาเทคโนโลยีและวิทยาการดิจิทัล',
    'สาขาวิชาเทคโนโลยีสารสนเทศ': 'สาขาวิชาเทคโนโลยีสารสนเทศ',
    'สาขาวิชาวิทยาการข้อมูลและการวิเคราะห์': 'สาขาวิชาวิทยาการข้อมูลและการวิเคราะห์',
    'สาขาวิชาวิจัยและพัฒนาผลิตภัณฑ์ฮาลาล': 'สาขาวิชาวิจัยและพัฒนาผลิตภัณฑ์ฮาลาล',
    'สาขาวิชาอุศูลุดดีน': 'สาขาวิชาอุศูลุดดีน',
    'สาขาวิชาอิสลามศึกษา': 'สาขาวิชาอิสลามศึกษา',
    'สาขาวิชานิติศาสตร์': 'สาขาวิชานิติศาสตร์',
    'สาขาวิชาชะรีอะฮฺ': 'สาขาวิชาชะรีอะฮฺ',
    'สาขาวิชาอัลกุรอานและอัสสุนนะฮฺ': 'สาขาวิชาอัลกุรอานและอัสสุนนะฮฺ',
    'สาขาวิชาภาษาอาหรับ': 'สาขาวิชาภาษาอาหรับ',
    'สาขาวิชารัฐประศาสนศาสตร์': 'สาขาวิชารัฐประศาสนศาสตร์',
    'สาขาวิชาเศรษฐศาสตร์การเงินและการธนาคาร': 'สาขาวิชาเศรษฐศาสตร์การเงินและการธนาคาร',
    'สาขาวิชาภาษาอังกฤษ': 'สาขาวิชาภาษาอังกฤษ',
    'สาขาวิชาภาษามลายู': 'สาขาวิชาภาษามลายู',
    'สาขาวิชาบริหารธุรกิจ': 'สาขาวิชาบริหารธุรกิจ',
    'สาขาวิชาการศึกษาปฐมวัย': 'สาขาวิชาการศึกษาปฐมวัย',
    'สาขาวิชาเคมี': 'สาขาวิชาเคมี',
    'สาขาวิชาวิทยาศาสตร์ทั่วไป': 'สาขาวิชาวิทยาศาสตร์ทั่วไป',
    'สาขาวิชาภาษามลายูและเทคโนโลยีการศึกษา': 'สาขาวิชาภาษามลายูและเทคโนโลยีการศึกษา'
  },
  en: {
    // Header & Banner
    demoModeWarn: 'The application is running in browser session-cached mode (Demo Mode) for evaluation. Form posting and validations perform fully.',
    demoModeReal: 'To connect to Production: Login as Staff and click "Google Sheet Setup" to insert your deployed App connection URL!',
    systemTitle: 'Course Seat Reservation System',
    fstSubtitle: 'Faculty of Science and Technology',
    tabReserve: 'Reserve Seat',
    tabStatus: 'Check Status',
    tabAdmin: 'Staff Portal',
    staffLogin: 'Staff Login',
    logoutAdmin: 'Successfully logged out of administrative board.',
    copyright: '© Faculty of Science and Technology • Academic Logistics & Course Scheduler',
    forAdmin: 'For Staff:',
    adminLogin: 'Faculty Officer Log In',

    // Post-Submission Success
    successRef: 'Reference ID (Track Number):',
    successSubmitted: 'Request Submitted Successfully!',
    successProjectDone: 'Seat reservation recorded securely',
    successApplicant: 'Applicant Name:',
    successCourse: 'Course:',
    successSec: 'Section / Group:',
    successDetail: 'Academic officers are evaluating your eligibility. You can track this status boards instantly anytime with your student identifier.',
    successSubmitAnother: 'Submit for Another Course',
    successGoStatus: 'View Submission Log Tab',

    // FormSection Elements
    formTitle: 'Course Seat Reservation Form',
    formSubtitle: 'In case the course capacity is full or registration is locked. Please supply authentic academic information below for rapid manual review.',
    sectionApplicant: 'Section 1: Applicant Profile',
    fullNameLabel: 'Applicant Full Name',
    fullNamePlaceholder: 'e.g., Muhammad Zakariya',
    fullNameHelp: 'As shown on national ID card, passport, or official student ID card',
    studentIdLabel: 'Student Identifier (9 Digits)',
    facultyLabel: 'Faculty / School Affiliation',
    departmentLabel: 'Department / Major',
    deptSelectPlaceholder: '-- Select Major / Field of Study --',
    academicYearLabel: 'Academic Year of Study',
    academicYearPlaceholder: '-- Select Year --',
    sectionCourse: 'Section 2: Requested Course & Section Details',
    courseCodeLabel: 'Course Code',
    courseTitleLabel: 'Course Title',
    courseTitlePlaceholder: 'e.g., Database Systems or General Chemistry',
    courseSecLabel: 'Assigned Section / Group',
    courseSecPlaceholder: 'e.g., Group 01',
    instructorLabel: 'Course Instructor',
    instructorPlaceholder: 'e.g., Dr. Fatimah Maming',
    instructorHelp: 'State the instructor name of the section. If unspecified, fill "Academic Office"',
    sectionContact: 'Section 3: Staff Direct Callback Channel (Facebook)',
    contactGuideTitle: 'For Direct Callback:',
    contactGuideDesc: 'To finalize approvals or clarify files, academic officers will search and contact requested students directly via Facebook messenger. Please either attach a screenshot of your main profile page or type in your profile URL link directly.',
    toggleProofFile: 'Attach Profile Screenshot Instead',
    toggleProofLink: 'Provide Profile Web URL Link',
    dragAndDropFile: 'Drop profile screenshot page here or click to choose from system storage',
    fileSupport: 'Supports image copies of your Facebook account details page to help validation',
    linkInputLabel: 'Facebook Desktop or Mobile Profile URL Address',
    phoneLabel: 'Contact Phone Number',
    phoneOptional: '(Optional Input)',
    phonePlaceholder: 'e.g., 0812345678',
    sectionConsent: 'Academic Disclaimer & Student Affirmation',
    consentCheckbox: 'I hereby declare that all supplied documents and descriptors are accurate, and consent to records being audited for official course scheduling.',
    submitButton: 'Submit Seat Reservation Form',
    submitting: 'Transmitting record securely to registrar database...',

    // FormSection Validation Warnings
    errFullName: 'Full Name is required.',
    errStudentId: 'Student ID is required.',
    errStudentIdValid: 'Student ID must be exactly 9 numeric digits.',
    errDepartment: 'Please select a department.',
    errYear: 'Please select your academic year.',
    errCourseCode: 'Course Code is required.',
    errCourseName: 'Course Title is required.',
    errSec: 'Please specify the exact section/group.',
    errInstructor: 'Course Instructor name is required.',
    errProofFile: 'Please upload a image screenshot of your Facebook profile so officers can contact you.',
    errProofLink: 'Please provide a valid Facebook profile URL link.',
    errPhone: 'Phone number format is incorrect (Must be 10 digits starting with 0).',
    errConsent: 'Please accept the terms and checkbox acknowledgment above to submit.',

    // StatusSection Elements
    statusTitle: 'Track Enrollment & Seat Allocation Status',
    statusDesc: 'Provide your 9-digit Student Identifier below to track official seat arrangement state updates directly.',
    statusInputPlaceholder: '9-Digit Student ID (e.g., 650109121)',
    statusSearchButton: 'Search Academic Log',
    statusSearching: 'Querying database registers...',
    statusHistoryTitle: 'Course Seat Allocation History Log',
    statusNoRecords: 'No reservation submission reports could be found for this Student ID.',
    statusNoRecordsSub: 'If you submitted recently, please wait while logs synchronize or proceed to file a new reservation form.',
    statusRequestDate: 'Submitted On:',
    statusCourseCode: 'Course Code:',
    statusCourseName: 'Subject:',
    statusSectionLabel: 'Section/Group:',
    statusInstructorLabel: 'Instructor:',
    statusDeptLabel: 'Faculty / Field:',
    statusPhoneLabel: 'Contact tel:',
    statusFeedbackLabel: 'Provided Facebook handle:',
    statusFileAttached: 'Profile Screenshot Uploaded',
    statusLinkProvided: 'Facebook URL Link Supplied',
    statusEvaluationTitle: 'Academic Registrar Review Decisions',
    statusEvaluationPending: 'Pending Evaluation',
    statusEvaluationPendingDesc: 'Your request queuing list checks are under review. Faculty teams will process soon.',
    statusEvaluationApproved: 'Approved',
    statusEvaluationApprovedDesc: 'Congratulations! Seat allocation requested has been approved and registered.',
    statusEvaluationRejected: 'Declined / Denied',
    statusEvaluationRejectedDesc: 'This request reservation has been evaluated and rejected by officers.',
    statusRejectionReason: 'Officer Rejection Comment:',

    // AdminSection elements
    adminDashboardTitle: 'Division of Academic Records Control Panel',
    adminDashboardDesc: 'Dedicated workspace for evaluating, filtering, analyzing, and reviewing student course seat reservation applications.',
    adminLoading: 'Synchronizing FST cloud data assets...',
    adminTotalRequests: 'Total Submissions',
    adminPendingRequests: 'Pending Evaluation',
    adminApprovedRequests: 'Allocated / Approved',
    adminRejectedRequests: 'Declined Lists',
    adminSearchPlaceholder: 'Search name, student code, course code...',
    adminFilterStatus: 'Log status:',
    adminFilterFaculty: 'Faculty:',
    adminExportExcel: 'Export Sheets Ledger',
    adminClearAll: 'Purge Current Archive (Academic Year End)',
    adminClearConfirm: 'Critical Warning: You are about to permanently purge the entire student reservation logs. Are you completely sure?',
    adminClearedSuccess: 'Academic registry archive records purged successfully.',
    adminTotalCount: 'Displaying {{count}} request instances',
    adminNoRequestsFound: 'No registry cases match the configured search filters.',
    adminStudentId: 'Student ID Code:',
    adminFacultyDept: 'Faculty / Field of Study:',
    adminCourseInstructor: 'Course: {{code}} - {{name}} • Group / Sec: {{section}} (Lecturer: {{instructor}})',
    adminContactPhone: 'Contact Number:',
    adminFacebookAccess: 'Callback Facebook:',
    adminSubmitDate: 'Filing Timestamp:',
    adminStatusAction: 'Log Evaluation & Action Menu:',
    adminActionApprove: 'Approve Reservation',
    adminActionReject: 'Decline (Provide Reason)',
    adminRejectionModalTitle: 'Specify Reason for Declining Seat Reservation',
    adminRejectionModalPlaceholder: 'e.g., Course capacity caps hard limit reached, Incorrect code provided, etc.',
    adminRejectionModalCancel: 'Cancel Operation',
    adminRejectionModalConfirm: 'Decline Entry Permanently',
    adminLoginCardTitle: 'Academic Operations Portal Login',
    adminLoginCardDesc: 'Affirmed authority staff required. Key in administrative authorization key below.',
    adminLoginPassLabel: 'Administrative Safety Access Key Code',
    adminLoginPassPlaceholder: 'Enter your registered administrator password',
    adminLoginBtn: 'Establish Safe Dashboard Terminal',
    adminLoginHint: 'Access is limited strictly to coordinator, scheduler teams, or advisor panels.',
    adminActionToastApproved: 'Request status updated to "Approved".',
    adminActionToastRejected: 'Request status is updated to "Declined / Denied" successfully.',

    // General Toasts
    toastFillError: 'Form checks failed. Fill all starred items cleanly first.',
    toastSaveSuccess: 'Filing processed! Saved as Case reference ID: {{id}}',
    toastLoadError: 'System error fetching server logs. Retry shortly.',
    toastInvalidStudentId: 'Student code must be exactly 9 number characters.',

    // Faculties & Departments (Thai/English conversion map)
    faculty_scitech: 'Faculty of Science and Technology',
    faculty_islamic: 'Faculty of Islamic Studies and Law',
    faculty_liberal: 'Faculty of Liberal Arts and Social Sciences',
    faculty_education: 'Faculty of Education',

    'สาขาวิชาเทคโนโลยีและวิทยาการดิจิทัล': 'Department of Digital Technology and Technology',
    'สาขาวิชาเทคโนโลยีสารสนเทศ': 'Department of Information Technology',
    'สาขาวิชาวิทยาการข้อมูลและการวิเคราะห์': 'Department of Data Science and Analytics',
    'สาขาวิชาวิจัยและพัฒนาผลิตภัณฑ์ฮาลาล': 'Halal Product Research and Development Program',
    'สาขาวิชาอุศูลุดดีน': 'Department of Usuluddin',
    'สาขาวิชาอิสลามศึกษา': 'Department of Islamic Studies',
    'สาขาวิชานิติศาสตร์': 'Department of Law',
    'สาขาวิชาชะรีอะฮฺ': 'Department of Sharia',
    'สาขาวิชาอัลกุรอานและอัสสุนนะฮฺ': 'Al-Quran and Al-Sunnah Program',
    'สาขาวิชาภาษาอาหรับ': 'Department of Arabic Language',
    'สาขาวิชารัฐประศาสนศาสตร์': 'Department of Public Administration',
    'สาขาวิชาเศรษฐศาสตร์การเงินและการธนาคาร': 'Department of Financial and Banking Economics',
    'สาขาวิชาภาษาอังกฤษ': 'Department of English Language',
    'สาขาวิชาภาษามลายู': 'Department of Malay Language',
    'สาขาวิชาบริหารธุรกิจ': 'Department of Business Administration',
    'สาขาวิชาการศึกษาปฐมวัย': 'Department of Early Childhood Education',
    'สาขาวิชาเคมี': 'Department of Chemistry',
    'สาขาวิชาวิทยาศาสตร์ทั่วไป': 'Department of General Science',
    'สาขาวิชาภาษามลายูและเทคโนโลยีการศึกษา': 'Department of Malay Language and Educational Technology'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('applet_language');
      if (stored === 'en' || stored === 'th') {
        return stored;
      }
    } catch (e) {
      // Ignored
    }
    return 'th'; // Default to Thai is crucial as requested
  });

  useEffect(() => {
    try {
      localStorage.setItem('applet_language', language);
    } catch (e) {
      // Ignored
    }
  }, [language]);

  const t = (key: string): string => {
    return TRANSLATIONS[language][key] || TRANSLATIONS['th'][key] || key;
  };

  const isTh = language === 'th';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isTh }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
