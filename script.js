// ============================================================
//  แบบสอบถาม — Multi-step form + ส่งเข้า Google Sheet
// ============================================================

// ---- คำถาม 5 ข้อ (แก้ไข/เพิ่มได้ตามต้องการ) ----
const QUESTIONS = [
  {
    title: "คำถามที่ 1",
    question: "โดยรวมแล้วคุณพอใจกับบริการของเรามากน้อยเพียงใด?",
    options: [
      { value: "A", text: "พอใจมาก" },
      { value: "B", text: "พอใจปานกลาง" },
      { value: "C", text: "ควรปรับปรุง" },
    ],
  },
  {
    title: "คำถามที่ 2",
    question: "คุณรู้จักเราจากช่องทางใด?",
    options: [
      { value: "A", text: "โซเชียลมีเดีย" },
      { value: "B", text: "เพื่อนแนะนำ" },
      { value: "C", text: "ค้นหาจาก Google" },
    ],
  },
  {
    title: "คำถามที่ 3",
    question: "คุณใช้บริการของเราบ่อยแค่ไหน?",
    options: [
      { value: "A", text: "ทุกวัน" },
      { value: "B", text: "ทุกสัปดาห์" },
      { value: "C", text: "นานๆ ครั้ง" },
    ],
  },
  {
    title: "คำถามที่ 4",
    question: "คุณจะแนะนำเราให้กับผู้อื่นหรือไม่?",
    options: [
      { value: "A", text: "แนะนำแน่นอน" },
      { value: "B", text: "อาจจะแนะนำ" },
      { value: "C", text: "ยังไม่แน่ใจ" },
    ],
  },
  {
    title: "คำถามที่ 5",
    question: "สิ่งใดที่คุณให้ความสำคัญมากที่สุด?",
    options: [
      { value: "A", text: "คุณภาพ" },
      { value: "B", text: "ราคา" },
      { value: "C", text: "การบริการ" },
    ],
  },
];

// ---- สร้าง step สำหรับแต่ละคำถาม ----
const questionSteps = document.getElementById("questionSteps");
QUESTIONS.forEach((q, i) => {
  const stepIndex = i + 1; // step 0 = ข้อมูลพื้นฐาน
  const section = document.createElement("section");
  section.className = "step";
  section.dataset.step = String(stepIndex);
  section.innerHTML = `
    <div class="step-head">
      <span class="step-badge">${q.title}</span>
      <h1>${q.question}</h1>
      <p class="subtitle">เลือกคำตอบที่ตรงกับคุณมากที่สุด</p>
    </div>
    <div class="options">
      ${q.options
        .map(
          (opt) => `
        <label class="option">
          <input type="radio" name="q${stepIndex}" value="${opt.value}" />
          <span class="letter">${opt.value}</span>
          <span class="opt-text">${opt.text}</span>
        </label>`
        )
        .join("")}
    </div>
  `;
  questionSteps.appendChild(section);
});

// ---- toggle การเลือก option (highlight) ----
document.addEventListener("change", (e) => {
  if (e.target.matches('input[type="radio"]')) {
    const group = e.target.name;
    document
      .querySelectorAll(`input[name="${group}"]`)
      .forEach((r) => r.closest(".option").classList.remove("selected"));
    e.target.closest(".option").classList.add("selected");
  }
});

// ============================================================
//  Navigation
// ============================================================
const steps = Array.from(document.querySelectorAll(".step"));
const TOTAL_INPUT_STEPS = 1 + QUESTIONS.length; // ข้อมูลพื้นฐาน + 5 คำถาม
let current = 0;

const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const btnSubmit = document.getElementById("btnSubmit");
const navButtons = document.getElementById("navButtons");

function showStep(index) {
  steps.forEach((s) => s.classList.remove("active"));
  steps[index].classList.add("active");

  const pct = ((index + 1) / TOTAL_INPUT_STEPS) * 100;
  progressFill.style.width = Math.min(pct, 100) + "%";
  progressText.textContent = `ขั้นตอนที่ ${index + 1} จาก ${TOTAL_INPUT_STEPS}`;

  btnPrev.style.display = index === 0 ? "none" : "inline-block";
  btnNext.style.display = index < TOTAL_INPUT_STEPS - 1 ? "inline-block" : "none";
  btnSubmit.style.display = index === TOTAL_INPUT_STEPS - 1 ? "inline-block" : "none";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---- ตรวจสอบความถูกต้องของ step ปัจจุบัน ----
function validateStep(index) {
  // step 0 = ข้อมูลพื้นฐาน
  if (index === 0) {
    const name = document.getElementById("fullName");
    const age = document.getElementById("age");
    let ok = true;
    [name, age].forEach((el) => {
      if (!el.value.trim()) {
        el.classList.add("error");
        ok = false;
      } else {
        el.classList.remove("error");
      }
    });
    if (!ok) showToast("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบ", true);
    return ok;
  }
  // step คำถาม
  const answered = document.querySelector(`input[name="q${index}"]:checked`);
  if (!answered) {
    showToast("กรุณาเลือกคำตอบก่อนไปต่อ", true);
    return false;
  }
  return true;
}

btnNext.addEventListener("click", () => {
  if (!validateStep(current)) return;
  if (current < TOTAL_INPUT_STEPS - 1) {
    current++;
    showStep(current);
  }
});

btnPrev.addEventListener("click", () => {
  if (current > 0) {
    current--;
    showStep(current);
  }
});

// ============================================================
//  ส่งข้อมูลไป Google Sheet
// ============================================================
document.getElementById("surveyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(current)) return;

  const data = {
    fullName: document.getElementById("fullName").value.trim(),
    age: document.getElementById("age").value.trim(),
    gender: document.getElementById("gender").value,
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    occupation: document.getElementById("occupation").value.trim(),
    submittedAt: new Date().toISOString(),
  };
  QUESTIONS.forEach((q, i) => {
    const sel = document.querySelector(`input[name="q${i + 1}"]:checked`);
    data["q" + (i + 1)] = sel ? sel.value : "";
  });

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span class="spinner"></span>กำลังส่ง...';

  try {
    if (
      !window.CONFIG.SCRIPT_URL ||
      window.CONFIG.SCRIPT_URL.includes("PASTE_YOUR")
    ) {
      throw new Error("ยังไม่ได้ตั้งค่า SCRIPT_URL ใน index.html");
    }

    // ใช้ Content-Type text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script
    await fetch(window.CONFIG.SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
    });

    // no-cors ทำให้อ่าน response ไม่ได้ แต่ถ้าไม่ throw = ส่งสำเร็จ
    goToDone();
  } catch (err) {
    console.error(err);
    showToast("ส่งข้อมูลไม่สำเร็จ: " + err.message, true);
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = "ส่งข้อมูล ✓";
  }
});

function goToDone() {
  steps.forEach((s) => s.classList.remove("active"));
  document.querySelector('[data-step="done"]').classList.add("active");
  navButtons.style.display = "none";
  progressFill.style.width = "100%";
  progressText.textContent = "เสร็จสิ้น";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
//  Toast
// ============================================================
let toastTimer;
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.className = "toast"), 3200);
}

// ---- เริ่มต้น ----
showStep(0);
