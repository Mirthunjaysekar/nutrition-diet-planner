/* ================================
   CONFIG — auto-detects local vs Railway
================================ */
const API_URL = window.location.hostname === "127.0.0.1"
  ? "http://127.0.0.1:5000"
  : "";

/* ================================
   UTIL
================================ */
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function load(key) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
function getUserId() { return localStorage.getItem('nutri_user_id') || 1; }

/* ================================
   RADAR CHART
================================ */
let radarChartInstance = null;

function drawRadarChart(actual, recommended) {
  const labels = ['Calories', 'Protein', 'Carbs', 'Fat', 'Fiber', 'Sodium'];
  const keys   = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sodium'];
  const actualPct = keys.map(k => Math.round((actual[k] / recommended[k]) * 100));

  const ctx = document.getElementById('ndvRadarChart').getContext('2d');
  if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: 'Your Intake (%)',
          data: actualPct,
          backgroundColor: 'rgba(99,102,241,0.25)',
          borderColor: 'rgba(99,102,241,0.9)',
          borderWidth: 2.5,
          pointBackgroundColor: 'rgba(99,102,241,1)',
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: 'Recommended (100%)',
          data: labels.map(() => 100),
          backgroundColor: 'rgba(16,185,129,0.10)',
          borderColor: 'rgba(16,185,129,0.6)',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 160,
          ticks: { stepSize: 40, color: '#888', font: { size: 10 }, callback: v => v + '%' },
          grid: { color: 'rgba(150,150,150,0.2)' },
          angleLines: { color: 'rgba(150,150,150,0.2)' },
          pointLabels: { font: { size: 12, weight: '600' }, color: '#555' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}%` } }
      }
    }
  });
}

function renderStatusPills(ndvStatus) {
  const container = document.getElementById('ndvStatusPills');
  if (!container) return;
  container.innerHTML = '';
  const colorMap = {
    'Optimal':   { bg: '#d1fae5', color: '#065f46', icon: '✅' },
    'Deficient': { bg: '#fef3c7', color: '#92400e', icon: '⚠️' },
    'Excess':    { bg: '#fee2e2', color: '#991b1b', icon: '🚨' }
  };
  Object.entries(ndvStatus).forEach(([nutrient, status]) => {
    const s = colorMap[status] || { bg: '#f3f4f6', color: '#374151', icon: '•' };
    const pill = document.createElement('span');
    pill.className = 'ndv-pill';
    pill.style.cssText = `background:${s.bg};color:${s.color};`;
    pill.innerHTML = `${s.icon} ${nutrient}: <strong>${status}</strong>`;
    container.appendChild(pill);
  });
}

/* ================================
   UI HELPERS
================================ */
function updateProgressStep(step) {
  document.querySelectorAll('.progress-step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 <= step);
  });
}

function showAlert(message, type = 'info') {
  const d = document.createElement('div');
  d.className = `alert-message ${type}`;
  d.innerHTML = message;
  const c = document.querySelector('.container');
  c.insertBefore(d, c.firstChild);
  setTimeout(() => d.remove(), 3000);
}

/* ================================
   STEP 1: BMI
================================ */
function calculateBMI() {
  const age = document.getElementById("age").value;
  const height = document.getElementById("height").value;
  const weight = document.getElementById("weight").value;
  if (!age || !height || !weight) { showAlert("Please enter age, height and weight", "error"); return; }

  const bmi = (weight / ((height / 100) ** 2)).toFixed(2);
  let category = "", color = "";
  if (bmi < 18.5)    { category = "Underweight"; color = "#f39c12"; }
  else if (bmi < 25) { category = "Normal";      color = "#2ecc71"; }
  else if (bmi < 30) { category = "Overweight";  color = "#e67e22"; }
  else               { category = "Obese";        color = "#e74c3c"; }

  const el = document.getElementById("bmiResult");
  el.innerText = `BMI: ${bmi} (${category})`;
  el.style.color = color;
  el.style.borderColor = color;
  document.getElementById("healthSection").classList.remove("hidden");
  updateProgressStep(2);
  save("userProfile", { age, height, weight });
  document.getElementById("healthSection").scrollIntoView({ behavior: 'smooth' });
}

/* ================================
   STEP 2: INITIAL MEAL
================================ */
async function showInitialMeal() {
  document.getElementById("initialMeal").classList.remove("hidden");
  document.getElementById("foodConsumed").classList.remove("hidden");
  updateProgressStep(3);

  const disease  = document.getElementById("disease").value;
  const foodPref = document.querySelector('input[name="foodPref"]:checked').value;
  const allergy  = document.getElementById("allergy").value;
  save("healthDetails", { disease, foodPref, allergy });

  try {
    ['initBreakfast','initLunch','initDinner','initSnack'].forEach(id => {
      document.getElementById(id).innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    });
    const res = await fetch(`${API_URL}/initial-meal-plan`);
    if (!res.ok) throw new Error("failed");
    const plans = await res.json();
    const plan = plans.find(p => p.disease===disease && p.food_preference===foodPref && p.allergy===allergy)
               || plans.find(p => p.disease===disease && p.food_preference===foodPref)
               || plans[0];
    document.getElementById("initBreakfast").innerText = plan.breakfast || "-";
    document.getElementById("initLunch").innerText     = plan.lunch     || "-";
    document.getElementById("initDinner").innerText    = plan.dinner    || "-";
    document.getElementById("initSnack").innerText     = plan.snack     || "-";
    save("initialMeal", plan);
    document.getElementById("initialMeal").scrollIntoView({ behavior: 'smooth' });
  } catch {
    const defaults = ["Oatmeal with fruits","Grilled chicken salad","Brown rice with vegetables","Greek yogurt"];
    ["initBreakfast","initLunch","initDinner","initSnack"].forEach((id, i) => {
      document.getElementById(id).innerText = defaults[i];
    });
    showAlert("Using demo meal plan", "warning");
  }
}

/* ================================
   STEP 3: CALCULATE DDS + RADAR
================================ */
async function calculateDDS() {
  const foodText = document.getElementById("foods").value.trim();
  if (!foodText) { showAlert("Please enter foods eaten today", "error"); return; }

  const foods   = foodText.split("\n").map(f => f.trim()).filter(Boolean);
  const disease = document.getElementById("disease").value || "general";
  const user_id = parseInt(getUserId());

  try {
    document.getElementById("ddsScore").innerHTML   = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById("dwDdsScore").innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById("riskLevel").innerHTML  = '<i class="fas fa-spinner fa-spin"></i>';

    const response = await fetch(`${API_URL}/calculate-dds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foods, disease, user_id })
    });
    if (!response.ok) throw new Error("Backend error");
    const data = await response.json();

    ["ddsSection","adaptiveMeal","ndvSection","dcmSection"].forEach(id => {
      document.getElementById(id).classList.remove("hidden");
    });
    updateProgressStep(4);

    // Scores
    document.getElementById("ddsScore").innerText   = data.DDS;
    document.getElementById("dwDdsScore").innerText = data.DW_DDS;
    const riskEl = document.getElementById("riskLevel");
    riskEl.innerText   = data.risk_level;
    riskEl.style.color = data.risk_level === "Low" ? "#2ecc71" : data.risk_level === "Medium" ? "#f39c12" : "#e74c3c";

    const msgEl = document.getElementById("ddsMessage");
    if (data.risk_level === "Low") {
      msgEl.innerHTML = '✅ Excellent! Your diet is well balanced. Keep up the good work!';
      msgEl.style.background = "linear-gradient(135deg, #d4edda, #c3e6cb)";
    } else if (data.risk_level === "Medium") {
      msgEl.innerHTML = '⚠️ Minor imbalance detected. Follow the adaptive meal plan for correction.';
      msgEl.style.background = "linear-gradient(135deg, #fff3cd, #ffeeba)";
    } else {
      msgEl.innerHTML = '🚨 High deviation detected. Immediate dietary correction required!';
      msgEl.style.background = "linear-gradient(135deg, #f8d7da, #f5c6cb)";
    }

    // Meals
    document.getElementById("adpBreakfast").innerText = data.adaptive_meal_plan.breakfast;
    document.getElementById("adpLunch").innerText     = data.adaptive_meal_plan.lunch;
    document.getElementById("adpDinner").innerText    = data.adaptive_meal_plan.dinner;
    document.getElementById("adpSnack").innerText     = data.adaptive_meal_plan.snack;

    // ✅ RADAR CHART
    drawRadarChart(data.actual_nutrition, data.recommended_nutrition);

    // ✅ STATUS PILLS
    renderStatusPills(data.NDV_status);

    // NDV bars
    const ndvList = document.getElementById("ndvList");
    ndvList.innerHTML = "";
    Object.entries(data.NDV).forEach(([n, v]) => {
      const div = document.createElement("div");
      div.className = "ndv-item";
      let color = "#2ecc71";
      if (Math.abs(v) > 30) color = "#e74c3c";
      else if (Math.abs(v) > 15) color = "#f39c12";
      div.innerHTML = `
        <div class="ndv-label">${n}</div>
        <div class="ndv-value" style="color:${color}">${v}</div>
        <div class="ndv-bar">
          <div class="ndv-bar-fill" style="width:${Math.min(Math.abs(v)*100,100)}%;background:${color}"></div>
        </div>`;
      ndvList.appendChild(div);
    });

    // DCM
    document.getElementById("dcmValue").innerText = data.DCM_value;
    let dcmColor = "#2ecc71";
    if (data.DCM_status.includes("Worsening")) dcmColor = "#e74c3c";
    else if (data.DCM_status.includes("No Significant")) dcmColor = "#f39c12";
    document.getElementById("dcmStatus").innerHTML =
      `<span class="status-badge" style="background:${dcmColor}">${data.DCM_status}</span>`;

    document.getElementById("ddsSection").scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    showAlert("Backend error. Please check if server is running.", "error");
  }
}

/* ================================
   INIT
================================ */
window.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem('nutri_user_id')) {
    window.location.href = '/login';
    return;
  }

  const userName = localStorage.getItem('nutri_user_name');
  if (userName) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:10px;right:15px;background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);color:white;padding:8px 16px;border-radius:20px;font-size:13px;z-index:999;';
    el.innerHTML = `👤 ${userName} &nbsp;<a href="#" onclick="logout()" style="color:#ffcdd2;font-size:11px;">Logout</a>`;
    document.body.appendChild(el);
  }

  ["healthSection","initialMeal","foodConsumed","ddsSection","adaptiveMeal","ndvSection","dcmSection"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.classList.add("hidden"); });

  document.getElementById("bmiResult").innerText = "";
  updateProgressStep(1);

  const savedProfile = load("userProfile");
  if (savedProfile) {
    document.getElementById("age").value    = savedProfile.age    || "";
    document.getElementById("height").value = savedProfile.height || "";
    document.getElementById("weight").value = savedProfile.weight || "";
  }
  const savedHealth = load("healthDetails");
  if (savedHealth) {
    document.getElementById("disease").value = savedHealth.disease || "general";
    document.getElementById("allergy").value = savedHealth.allergy || "none";
    if (savedHealth.foodPref === "non-veg") document.getElementById("nonVeg").checked = true;
    else document.getElementById("veg").checked = true;
  }
});

function logout() {
  localStorage.removeItem('nutri_user_id');
  localStorage.removeItem('nutri_user_name');
  window.location.href = '/login';
}

/* ================================
   DB FUNCTIONS
================================ */
async function saveMealToDB(mealData, msgDivId) {
  try {
    await fetch(`${API_URL}/api/save-meal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...mealData, user_id: parseInt(getUserId()) })
    });
    if (msgDivId) {
      document.getElementById(msgDivId).innerText = "✅ Saved!";
      document.getElementById(msgDivId).style.color = "green";
    }
  } catch {
    if (msgDivId) {
      document.getElementById(msgDivId).innerText = "❌ Failed.";
      document.getElementById(msgDivId).style.color = "red";
    }
  }
}

function saveInitialMealPlan() {
  saveMealToDB({ meal_name: "Initial Meal Plan", calories: null, protein: null, carbs: null, fats: null }, "saveMealMsg");
}
function saveAdaptiveMealPlan() {
  saveMealToDB({ meal_name: "Adaptive Meal Plan", calories: null, protein: null, carbs: null, fats: null }, "saveAdaptiveMsg");
}

/* ================================
   INJECTED STYLES
================================ */
const style = document.createElement('style');
style.textContent = `
  .radar-chart-wrapper { background:rgba(255,255,255,0.6); border-radius:16px; padding:20px; margin-bottom:8px; border:1px solid rgba(99,102,241,0.15); }
  .radar-title { font-size:15px; font-weight:600; color:#4f46e5; margin:0 0 4px; }
  .radar-subtitle { font-size:13px; color:#6b7280; margin:0 0 16px; }
  .radar-legend { display:flex; align-items:center; gap:6px; margin-top:12px; font-size:12px; color:#6b7280; justify-content:center; }
  .legend-dot { width:12px; height:12px; border-radius:3px; display:inline-block; }
  .ndv-status-pills { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
  .ndv-pill { font-size:12px; padding:4px 12px; border-radius:99px; font-weight:500; }
  .ndv-item { background:white; border-radius:15px; padding:15px; margin-bottom:10px; }
  .ndv-label { font-weight:600; margin-bottom:5px; }
  .ndv-value { font-size:18px; font-weight:700; margin-bottom:8px; }
  .ndv-bar { height:8px; background:#e0e0e0; border-radius:4px; overflow:hidden; }
  .ndv-bar-fill { height:100%; border-radius:4px; transition:width 0.3s ease; }
  .alert-message.error   { background:linear-gradient(135deg,#f8d7da,#f5c6cb); color:#721c24; }
  .alert-message.warning { background:linear-gradient(135deg,#fff3cd,#ffeeba); color:#856404; }
  .fa-spinner { animation:spin 1s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;
document.head.appendChild(style);