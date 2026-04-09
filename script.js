/* ================================
   UTIL: LOCAL STORAGE HELPERS
================================ */

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function load(key) {
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : null;
}

/* ================================
   UI UPDATE HELPERS
================================ */

function updateProgressStep(step) {
  document.querySelectorAll('.progress-step').forEach((el, index) => {
    if (index + 1 <= step) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert-message ${type}`;
  alertDiv.innerHTML = message;
  
  const container = document.querySelector('.container');
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

/* ================================
   STEP 1: BMI CALCULATION
================================ */

function calculateBMI() {
  const age = document.getElementById("age").value;
  const height = document.getElementById("height").value;
  const weight = document.getElementById("weight").value;

  if (!age || !height || !weight) {
    showAlert("Please enter age, height and weight", "error");
    return;
  }

  const heightMeters = height / 100;
  const bmi = (weight / (heightMeters * heightMeters)).toFixed(2);

  let category = "";
  let color = "";
  if (bmi < 18.5) {
    category = "Underweight";
    color = "#f39c12";
  } else if (bmi < 25) {
    category = "Normal";
    color = "#2ecc71";
  } else if (bmi < 30) {
    category = "Overweight";
    color = "#e67e22";
  } else {
    category = "Obese";
    color = "#e74c3c";
  }

  const bmiText = `BMI: ${bmi} (${category})`;
  const resultElement = document.getElementById("bmiResult");
  resultElement.innerText = bmiText;
  resultElement.style.color = color;
  resultElement.style.borderColor = color;

  document.getElementById("healthSection").classList.remove("hidden");
  updateProgressStep(2);

  save("userProfile", { age, height, weight });
  save("bmiResult", bmiText);
  
  // Smooth scroll to next section
  document.getElementById("healthSection").scrollIntoView({ behavior: 'smooth' });
}

/* ================================
   STEP 2: INITIAL MEAL PLANNER
================================ */

async function showInitialMeal() {

  document.getElementById("initialMeal").classList.remove("hidden");
  document.getElementById("foodConsumed").classList.remove("hidden");
  updateProgressStep(3);

  const disease = document.getElementById("disease").value;
  const foodPref = document.querySelector('input[name="foodPref"]:checked').value;
  const allergy = document.getElementById("allergy").value;

  save("healthDetails", { disease, foodPref, allergy });

  try {
    // Show loading state
    const mealElements = ['initBreakfast', 'initLunch', 'initDinner', 'initSnack'];
    mealElements.forEach(id => {
      document.getElementById(id).innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    });

    const res = await fetch("http://127.0.0.1:5000/initial-meal-plan");

    if (!res.ok) {
      throw new Error("Initial meal JSON not found from backend");
    }

    const mealPlans = await res.json();

    const matchedPlan =
      mealPlans.find(p =>
        p.disease === disease &&
        p.food_preference === foodPref &&
        p.allergy === allergy
      ) ||
      mealPlans.find(p =>
        p.disease === disease &&
        p.food_preference === foodPref
      ) ||
      mealPlans[0];

    if (!matchedPlan) {
      throw new Error("No meal plan match found");
    }

    document.getElementById("initBreakfast").innerText = matchedPlan.breakfast || "-";
    document.getElementById("initLunch").innerText = matchedPlan.lunch || "-";
    document.getElementById("initDinner").innerText = matchedPlan.dinner || "-";
    document.getElementById("initSnack").innerText = matchedPlan.snack || "-";

    save("initialMeal", matchedPlan);
    
    // Smooth scroll to meal plan
    document.getElementById("initialMeal").scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error("Initial meal fetch failed:", err);
    
    // Fallback meal plan for demo
    const fallbackPlan = {
      breakfast: "Oatmeal with fruits",
      lunch: "Grilled chicken salad",
      dinner: "Brown rice with vegetables",
      snack: "Greek yogurt"
    };
    
    document.getElementById("initBreakfast").innerText = fallbackPlan.breakfast;
    document.getElementById("initLunch").innerText = fallbackPlan.lunch;
    document.getElementById("initDinner").innerText = fallbackPlan.dinner;
    document.getElementById("initSnack").innerText = fallbackPlan.snack;
    
    showAlert("Using demo meal plan (backend not connected)", "warning");
  }
}

/* ================================
   STEP 3: DDS + NDV + DW-DDS + DCM
================================ */

async function calculateDDS() {

  const foodText = document.getElementById("foods").value.trim();
  if (!foodText) {
    showAlert("Please enter foods eaten today", "error");
    return;
  }

  const foods = foodText
    .split("\n")
    .map(f => f.trim())
    .filter(Boolean);

  const disease = document.getElementById("disease").value || "general";

  try {
    // Show loading states
    document.getElementById("ddsScore").innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById("dwDdsScore").innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById("riskLevel").innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const response = await fetch("http://127.0.0.1:5000/calculate-dds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foods, disease })
    });

    if (!response.ok) {
      throw new Error("Backend error");
    }

    const data = await response.json();

    // Show all result sections
    document.getElementById("ddsSection").classList.remove("hidden");
    document.getElementById("adaptiveMeal").classList.remove("hidden");
    document.getElementById("ndvSection").classList.remove("hidden");
    document.getElementById("dcmSection").classList.remove("hidden");
    updateProgressStep(4);

    // Update DDS values
    document.getElementById("ddsScore").innerText = data.DDS;
    document.getElementById("dwDdsScore").innerText = data.DW_DDS;
    
    // Update risk level with color
    const riskElement = document.getElementById("riskLevel");
    riskElement.innerText = data.risk_level;
    
    // Set risk level color
    if (data.risk_level === "Low") {
      riskElement.style.color = "#2ecc71";
    } else if (data.risk_level === "Medium") {
      riskElement.style.color = "#f39c12";
    } else {
      riskElement.style.color = "#e74c3c";
    }

    // Update message with appropriate icon
    const messageElement = document.getElementById("ddsMessage");
    if (data.risk_level === "Low") {
      messageElement.innerHTML = '✅ Excellent! Your diet is well balanced. Keep up the good work!';
      messageElement.style.background = "linear-gradient(135deg, #d4edda, #c3e6cb)";
    } else if (data.risk_level === "Medium") {
      messageElement.innerHTML = '⚠️ Minor imbalance detected. Follow the adaptive meal plan for correction.';
      messageElement.style.background = "linear-gradient(135deg, #fff3cd, #ffeeba)";
    } else {
      messageElement.innerHTML = '🚨 High deviation detected. Immediate dietary correction required!';
      messageElement.style.background = "linear-gradient(135deg, #f8d7da, #f5c6cb)";
    }

    // Update adaptive meal plan
    document.getElementById("adpBreakfast").innerText = data.adaptive_meal_plan.breakfast;
    document.getElementById("adpLunch").innerText = data.adaptive_meal_plan.lunch;
    document.getElementById("adpDinner").innerText = data.adaptive_meal_plan.dinner;
    document.getElementById("adpSnack").innerText = data.adaptive_meal_plan.snack;

    // Update NDV with visual elements
    const ndvList = document.getElementById("ndvList");
    ndvList.innerHTML = "";

    Object.entries(data.NDV).forEach(([n, v]) => {
      const div = document.createElement("div");
      div.className = "ndv-item";
      
      // Calculate color based on deviation
      let color = "#2ecc71";
      if (Math.abs(v) > 30) color = "#e74c3c";
      else if (Math.abs(v) > 15) color = "#f39c12";
      
      div.innerHTML = `
        <div class="ndv-label">${n}</div>
        <div class="ndv-value" style="color: ${color}">${v}</div>
        <div class="ndv-bar">
          <div class="ndv-bar-fill" style="width: ${Math.min(Math.abs(v), 100)}%; background: ${color}"></div>
        </div>
      `;
      
      ndvList.appendChild(div);
    });

    // Update DCM with animation
    document.getElementById("dcmValue").innerText = data.DCM_value;
    const dcmStatus = document.getElementById("dcmStatus");
    
    let statusText = data.DCM_status;
    let statusColor = "#2ecc71";
    
    if (data.DCM_status.includes("Negative")) {
      statusColor = "#e74c3c";
    } else if (data.DCM_status.includes("Positive")) {
      statusColor = "#2ecc71";
    } else {
      statusColor = "#f39c12";
    }
    
    dcmStatus.innerHTML = `<span class="status-badge" style="background: ${statusColor}">${statusText}</span>`;

    // Smooth scroll to results
    document.getElementById("ddsSection").scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    showAlert("Backend error. Please check if Flask server is running.", "error");
    
    // Demo data for presentation
    document.getElementById("ddsSection").classList.remove("hidden");
    document.getElementById("adaptiveMeal").classList.remove("hidden");
    document.getElementById("ndvSection").classList.remove("hidden");
    document.getElementById("dcmSection").classList.remove("hidden");
    
    document.getElementById("ddsScore").innerText = "7.5";
    document.getElementById("dwDdsScore").innerText = "8.2";
    document.getElementById("riskLevel").innerText = "Medium";
    document.getElementById("riskLevel").style.color = "#f39c12";
    
    document.getElementById("ddsMessage").innerHTML = '⚠️ Demo Mode: Using sample data';
    
    document.getElementById("adpBreakfast").innerText = "Quinoa bowl with berries";
    document.getElementById("adpLunch").innerText = "Lentil soup with whole grain bread";
    document.getElementById("adpDinner").innerText = "Grilled fish with steamed vegetables";
    document.getElementById("adpSnack").innerText = "Apple with almond butter";
    
    document.getElementById("dcmValue").innerText = "0.65";
    document.getElementById("dcmStatus").innerHTML = '<span class="status-badge">Positive Momentum</span>';
    
    const ndvList = document.getElementById("ndvList");
    ndvList.innerHTML = "";
    const demoNDV = { Protein: 15, Carbs: -10, Fats: 5, Fiber: 20 };
    Object.entries(demoNDV).forEach(([n, v]) => {
      const div = document.createElement("div");
      div.className = "ndv-item";
      let color = v > 0 ? "#2ecc71" : "#e74c3c";
      div.innerHTML = `
        <div class="ndv-label">${n}</div>
        <div class="ndv-value" style="color: ${color}">${v}%</div>
        <div class="ndv-bar">
          <div class="ndv-bar-fill" style="width: ${Math.abs(v)}%; background: ${color}"></div>
        </div>
      `;
      ndvList.appendChild(div);
    });
  }
}

/* ================================
   INITIAL UI STATE
================================ */

window.addEventListener("DOMContentLoaded", () => {
  // Hide all result sections initially
  [
    "healthSection",
    "initialMeal",
    "foodConsumed",
    "ddsSection",
    "adaptiveMeal",
    "ndvSection",
    "dcmSection"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  document.getElementById("bmiResult").innerText = "";
  updateProgressStep(1);
  
  // Add smooth scrolling for all buttons
  document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function(e) {
      // Don't prevent default, just add smooth scroll after action
      setTimeout(() => {
        const nextSection = this.closest('.glass-card')?.nextElementSibling;
        if (nextSection && !nextSection.classList.contains('hidden')) {
          nextSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    });
  });
  
  // Check for saved data and populate if exists
  const savedProfile = load("userProfile");
  if (savedProfile) {
    document.getElementById("age").value = savedProfile.age || "";
    document.getElementById("height").value = savedProfile.height || "";
    document.getElementById("weight").value = savedProfile.weight || "";
  }
  
  const savedHealth = load("healthDetails");
  if (savedHealth) {
    document.getElementById("disease").value = savedHealth.disease || "general";
    document.getElementById("allergy").value = savedHealth.allergy || "none";
    
    // Set food preference radio
    if (savedHealth.foodPref === "non-veg") {
      document.getElementById("nonVeg").checked = true;
    } else {
      document.getElementById("veg").checked = true;
    }
  }
});

// Add CSS for NDV bars (dynamic addition)
const style = document.createElement('style');
style.textContent = `
  .ndv-item {
    background: white;
    border-radius: 15px;
    padding: 15px;
    margin-bottom: 10px;
  }
  
  .ndv-label {
    font-weight: 600;
    color: var(--dark);
    margin-bottom: 5px;
  }
  
  .ndv-value {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  
  .ndv-bar {
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .ndv-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  
  .alert-message.error {
    background: linear-gradient(135deg, #f8d7da, #f5c6cb);
    color: #721c24;
    border-left-color: #e74c3c;
  }
  
  .alert-message.warning {
    background: linear-gradient(135deg, #fff3cd, #ffeeba);
    color: #856404;
    border-left-color: #f39c12;
  }
  
  .alert-message.success {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    color: #155724;
    border-left-color: #2ecc71;
  }
  
  .fa-spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

document.head.appendChild(style);
// ================================
// DATABASE API FUNCTIONS
// ================================

const API_URL = "http://127.0.0.1:5000";

// Save a meal to the database
async function saveMealToDB(mealData) {
    try {
        const response = await fetch(`${API_URL}/api/save-meal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mealData)
        });
        const result = await response.json();
        console.log("Saved:", result.message);
        alert("✅ Meal saved successfully!");
    } catch (error) {
        console.error("Error saving meal:", error);
        alert("❌ Failed to save meal.");
    }
}

// Get all meals from the database
async function getMealsFromDB() {
    try {
        const response = await fetch(`${API_URL}/api/get-meals`);
        const meals = await response.json();
        console.log("Meals:", meals);
        return meals;
    } catch (error) {
        console.error("Error fetching meals:", error);
    }
}

// Delete a meal from the database
async function deleteMealFromDB(mealId) {
    try {
        const response = await fetch(`${API_URL}/api/delete-meal/${mealId}`, {
            method: "DELETE"
        });
        const result = await response.json();
        console.log("Deleted:", result.message);
        alert("✅ Meal deleted!");
    } catch (error) {
        console.error("Error deleting meal:", error);
    }
}
// Save Initial Meal Plan
function saveInitialMealPlan() {
    const mealData = {
        meal_name: "Initial Meal Plan",
        calories: null,
        protein: null,
        carbs: null,
        fats: null
    };
    saveMealToDB(mealData, "saveMealMsg");
}

// Save Adaptive Meal Plan
function saveAdaptiveMealPlan() {
    const mealData = {
        meal_name: "Adaptive Meal Plan",
        calories: null,
        protein: null,
        carbs: null,
        fats: null
    };
    saveMealToDB(mealData, "saveAdaptiveMsg");
}

// Updated saveMealToDB with message div support
async function saveMealToDB(mealData, msgDivId) {
    try {
        const response = await fetch(`${API_URL}/api/save-meal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mealData)
        });
        const result = await response.json();
        document.getElementById(msgDivId).innerText = "✅ Saved successfully!";
        document.getElementById(msgDivId).style.color = "green";
    } catch (error) {
        document.getElementById(msgDivId).innerText = "❌ Failed to save.";
        document.getElementById(msgDivId).style.color = "red";
    }
}