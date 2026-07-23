/**
 * Google Apps Script — รับข้อมูลจาก web form แล้วบันทึกลง Google Sheet
 * + ระบบกันสแปมแบบหลายชั้น (defense in depth)
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

// ============================================================
//  ตั้งค่า
// ============================================================

// วาง ID ของ Google Sheet ที่ต้องการเก็บข้อมูล
// ดูได้จาก URL ของ Sheet:  https://docs.google.com/spreadsheets/d/<<< ID อยู่ตรงนี้ >>>/edit
var SPREADSHEET_ID = "1_EsN_3HQ_64LnzG4SvnxBPs7AoBcAzATmjBvWhmn0TY";

// ชื่อชีต (แท็บ) ที่จะเก็บข้อมูล — จะถูกสร้างอัตโนมัติถ้ายังไม่มี
var SHEET_NAME = "Responses";

// ---- ตั้งค่ากันสแปม ----
// โทเคนลับที่ client ต้องแนบมาด้วย (ต้องตรงกับใน index.html)
// เปลี่ยนเป็นค่าสุ่มของคุณเอง เช่นจาก https://www.uuidgenerator.net/
var FORM_TOKEN = "CHANGE_ME_TO_A_RANDOM_STRING";

// จำกัดจำนวนการส่งต่อ 1 client (clientId) ภายในกรอบเวลา
var RATE_MAX_PER_CLIENT = 5; // ส่งได้ไม่เกิน 5 ครั้ง
var RATE_WINDOW_SEC = 60; // ต่อ 60 วินาที

// จำกัดจำนวนการส่งรวมทั้งระบบต่อกรอบเวลา (กัน flood จากหลาย client)
var RATE_MAX_GLOBAL = 30; // รวมทุกคนไม่เกิน 30 ครั้ง / 60 วินาที

// เวลาขั้นต่ำที่ผู้ใช้ควรใช้กรอกฟอร์ม (วินาที) — bot มักส่งเร็วผิดปกติ
var MIN_FILL_SECONDS = 3;

// ความยาวสูงสุดของแต่ละ field (กัน payload ยักษ์)
var MAX_FIELD_LEN = 500;

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

// ============================================================
//  Endpoint
// ============================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return reject_("empty body");
    }

    // กัน payload ยักษ์ตั้งแต่ต้น
    if (e.postData.contents.length > 10000) {
      return reject_("payload too large");
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return reject_("invalid json");
    }

    // ---- ชั้นที่ 1: Honeypot ----
    // field "website" ถูกซ่อนไว้ในฟอร์ม ผู้ใช้จริงจะไม่กรอก
    // ถ้ามีค่า = bot กรอกทุกช่องอัตโนมัติ → ปฏิเสธ
    if (data.website) {
      return reject_("honeypot triggered");
    }

    // ---- ชั้นที่ 2: Shared token ----
    if (data.token !== FORM_TOKEN) {
      return reject_("invalid token");
    }

    // ---- ชั้นที่ 3: Timing check ----
    // ส่งเร็วเกินไป (< MIN_FILL_SECONDS) = น่าสงสัยว่าเป็น bot
    if (data.startedAt) {
      var elapsed = (Date.now() - Number(data.startedAt)) / 1000;
      if (elapsed >= 0 && elapsed < MIN_FILL_SECONDS) {
        return reject_("submitted too fast");
      }
    }

    // ---- ชั้นที่ 4: Validate ข้อมูล ----
    var v = validate_(data);
    if (!v.ok) {
      return reject_(v.reason);
    }

    // ---- ชั้นที่ 5: Rate limiting ----
    var r = rateLimit_(data.clientId);
    if (!r.ok) {
      return reject_(r.reason);
    }

    // ---- ผ่านทุกชั้น → บันทึก ----
    var sheet = getSheet_();
    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      trim_(data.fullName),
      trim_(data.age),
      trim_(data.gender),
      trim_(data.email),
      trim_(data.phone),
      trim_(data.occupation),
      trim_(data.q1),
      trim_(data.q2),
      trim_(data.q3),
      trim_(data.q4),
      trim_(data.q5),
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

// ============================================================
//  ตรรกะกันสแปม
// ============================================================

// ตรวจความถูกต้อง/สมเหตุสมผลของข้อมูล
function validate_(data) {
  var name = trim_(data.fullName);
  if (!name) return { ok: false, reason: "name required" };
  if (name.length > MAX_FIELD_LEN) return { ok: false, reason: "name too long" };

  var age = Number(data.age);
  if (!age || age < 1 || age > 120) return { ok: false, reason: "invalid age" };

  // email ถ้ากรอกมา ต้องมีรูปแบบพอใช้ได้
  var email = trim_(data.email);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, reason: "invalid email" };
  }

  // คำตอบแต่ละข้อต้องเป็น A/B/C หรือว่าง
  var allowed = { "": true, A: true, B: true, C: true };
  for (var i = 1; i <= 5; i++) {
    var ans = trim_(data["q" + i]);
    if (!allowed[ans]) return { ok: false, reason: "invalid answer q" + i };
  }

  // กันทุก field ยาวเกิน
  var fields = ["gender", "email", "phone", "occupation"];
  for (var j = 0; j < fields.length; j++) {
    if (trim_(data[fields[j]]).length > MAX_FIELD_LEN) {
      return { ok: false, reason: fields[j] + " too long" };
    }
  }

  return { ok: true };
}

// จำกัดอัตราการส่งด้วย CacheService (per-client + global)
function rateLimit_(clientId) {
  var cache = CacheService.getScriptCache();

  // global counter
  var gKey = "rl_global";
  var gCount = Number(cache.get(gKey) || 0) + 1;
  cache.put(gKey, String(gCount), RATE_WINDOW_SEC);
  if (gCount > RATE_MAX_GLOBAL) {
    return { ok: false, reason: "global rate limit" };
  }

  // per-client counter (ถ้าไม่มี clientId ก็ข้ามเฉพาะส่วนนี้ แต่ global ยังคุมอยู่)
  if (clientId) {
    var cKey = "rl_" + String(clientId).slice(0, 64);
    var cCount = Number(cache.get(cKey) || 0) + 1;
    cache.put(cKey, String(cCount), RATE_WINDOW_SEC);
    if (cCount > RATE_MAX_PER_CLIENT) {
      return { ok: false, reason: "client rate limit" };
    }
  }

  return { ok: true };
}

// ============================================================
//  Helpers
// ============================================================

function reject_(reason) {
  // ตอบกลับแบบเดียวกันเสมอ ไม่บอก attacker ว่าติดชั้นไหน (แต่ log ไว้ดูเอง)
  console.warn("rejected: " + reason);
  return json_({ status: "rejected" });
}

function trim_(val) {
  return val == null ? "" : String(val).trim();
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
