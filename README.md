# แบบสอบถาม → Google Sheet (อัตโนมัติ)

เว็บฟอร์มแบบหลายขั้นตอน (multi-step): กรอกข้อมูลพื้นฐาน → ตอบคำถาม 5 ข้อ (A / B / C)
เมื่อกดส่ง ข้อมูลจะถูกบันทึกลง Google Sheet โดยอัตโนมัติผ่าน Google Apps Script
(ไม่ต้องมี server ของตัวเอง ไม่ต้องตั้งค่า credentials)

<img width="733" height="640" alt="Screenshot 2026-07-23 093543" src="https://github.com/user-attachments/assets/ccb5e477-daa4-48f7-97fe-ae75e3d9f055" />
<img width="1316" height="222" alt="image" src="https://github.com/user-attachments/assets/f2b78f2c-cc54-4391-ae95-10f71541c10a" />

## โครงสร้างไฟล์

```
googlesheet-integration/
├── index.html          # หน้าเว็บฟอร์ม
├── style.css           # สไตล์ (สวย + responsive)
├── script.js           # ตรรกะ multi-step + ส่งข้อมูล
├── apps-script/
│   └── Code.gs         # โค้ดฝั่ง Google Apps Script
└── README.md
```

## ขั้นตอนติดตั้ง

### 1) เตรียม Google Sheet + Apps Script

1. สร้าง **Google Sheet** ใหม่ (sheets.new)
2. เมนู **Extensions → Apps Script**
3. ลบโค้ดเดิมทั้งหมด แล้ววางเนื้อหาจากไฟล์ `apps-script/Code.gs`
4. กด **Save** (ไอคอนแผ่นดิสก์)
5. กด **Deploy → New deployment**
   - คลิกไอคอนเฟือง ⚙️ → เลือก **Web app**
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
   - กด **Deploy** แล้วอนุญาตสิทธิ์ (Authorize) ตามที่ระบบขอ
6. คัดลอก **Web app URL** (ลงท้ายด้วย `/exec`)

> ทดสอบได้: เปิด URL นั้นใน browser ควรเห็น `{"status":"ok",...}`

### 2) เชื่อมเว็บกับ Apps Script

เปิด `index.html` แก้บรรทัดนี้ (อยู่ท้ายไฟล์):

```js
window.CONFIG = {
  SCRIPT_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE"
};
```

วาง Web app URL ที่คัดลอกมาแทนข้อความ `PASTE_YOUR...`

### 3) เปิดใช้งาน

เปิด `index.html` ด้วย browser ได้เลย หรือรันเซิร์ฟเวอร์ในเครื่อง:

```powershell
# ในโฟลเดอร์โปรเจกต์
python -m http.server 8000
# แล้วเปิด http://localhost:8000
```

กรอกฟอร์ม → ตอบครบ 5 ข้อ → กด **ส่งข้อมูล** → ตรวจดูใน Google Sheet
แถวใหม่จะถูกเพิ่มในแท็บ **Responses** อัตโนมัติ

## การปรับแต่ง

- **แก้คำถาม/ตัวเลือก:** แก้ตัวแปร `QUESTIONS` ที่ต้นไฟล์ `script.js`
  (เพิ่ม/ลดจำนวนคำถามได้ ระบบปรับ progress bar ให้เอง)
- **แก้หัวตาราง Sheet:** แก้ `HEADERS` ใน `Code.gs`
  (ถ้าเปลี่ยนจำนวนคำถาม อย่าลืมแก้ทั้ง `HEADERS` และ `appendRow` ใน `doPost`)
- **เปลี่ยนสี/ธีม:** แก้ตัวแปร CSS ใน `:root` ที่ต้นไฟล์ `style.css`

## หมายเหตุเรื่อง CORS

โค้ดใช้ `mode: "no-cors"` ในการ POST ทำให้ browser ส่งข้อมูลได้โดยไม่ติด CORS
แต่แลกกับการที่ JavaScript อ่านค่า response กลับมาไม่ได้ — ถือว่า "ไม่ error = ส่งสำเร็จ"
หากต้องการอ่าน response จริง (เช่น ยืนยันผลลัพธ์) ต้องตั้งค่า CORS header เพิ่มเติมฝั่ง Apps Script

https://docs.google.com/spreadsheets/d/1_EsN_3HQ_64LnzG4SvnxBPs7AoBcAzATmjBvWhmn0TY/edit?gid=768700194#gid=768700194
https://script.google.com/u/0/home/projects/1NuKmsX646N6Kxq0hd93eyjVFTMY2t2zhYD2YI-9ToFqd9LSx4n7Pj5g4/edit
