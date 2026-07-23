/**
 * Google Apps Script — รับข้อมูลจาก web form แล้วบันทึกลง Google Sheet
 *
 * วิธีติดตั้ง (ดูละเอียดใน README.md):
 *  1. เปิด Google Sheet ใหม่ที่ต้องการเก็บข้อมูล
 *  2. เมนู Extensions → Apps Script
 *  3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้แทน
 *  4. Deploy → New deployment → Web app
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. คัดลอก Web app URL ไปวางใน index.html (window.CONFIG.SCRIPT_URL)
 */

// วาง ID ของ Google Sheet ที่ต้องการเก็บข้อมูล
// ดูได้จาก URL ของ Sheet:  https://docs.google.com/spreadsheets/d/<<< ID อยู่ตรงนี้ >>>/edit
var SPREADSHEET_ID = "1_EsN_3HQ_64LnzG4SvnxBPs7AoBcAzATmjBvWhmn0TY";

// ชื่อชีต (แท็บ) ที่จะเก็บข้อมูล — จะถูกสร้างอัตโนมัติถ้ายังไม่มี
var SHEET_NAME = "Responses";

// ลำดับคอลัมน์ + หัวตาราง
var HEADERS = [
  "วันเวลาที่ส่ง",
  "ชื่อ-นามสกุล",
  "อายุ",
  "เพศ",
  "อีเมล",
  "เบอร์โทร",
  "อาชีพ/รายละเอียด",
  "ข้อ 1",
  "ข้อ 2",
  "ข้อ 3",
  "ข้อ 4",
  "ข้อ 5",
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();

    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.fullName || "",
      data.age || "",
      data.gender || "",
      data.email || "",
      data.phone || "",
      data.occupation || "",
      data.q1 || "",
      data.q2 || "",
      data.q3 || "",
      data.q4 || "",
      data.q5 || "",
    ]);

    return json_({ status: "success" });
  } catch (err) {
    return json_({ status: "error", message: String(err) });
  }
}

// endpoint สำหรับทดสอบว่า deploy สำเร็จ (เปิด URL ใน browser)
function doGet() {
  return json_({ status: "ok", message: "Web app is running" });
}

// คืน/สร้างชีต พร้อมใส่หัวตารางถ้ายังไม่มี
function getSheet_() {
  // ใช้ openById เพื่อให้ทำงานได้แม้เป็น standalone script (ไม่ได้ผูกกับ Sheet)
  var ss = (SPREADSHEET_ID && SPREADSHEET_ID.indexOf("PASTE_") === -1)
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
