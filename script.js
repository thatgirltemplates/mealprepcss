// --------- DATA MODEL (localStorage) ----------
const STORAGE_KEY = "meal_prep_dashboard_v1";

let currentTasks = [];
let currentCategory = "";

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTasks));
  } catch {
    // ignore
  }
}

// --------- DASHBOARD UPDATE ----------
function updateDashboard() {
  updateStats();
  updateProgressRings();
  updateTaskLists();
  updateInsights();
}

function updateStats() {
  const prepTasks = currentTasks.filter(t => t.category === "prep");
  const prepRemaining = prepTasks.filter(t => !t.completed).length;

  const preppedMeals = currentTasks.filter(
    t => t.category === "prepped" && !t.completed
  ).length;

  const leftovers = currentTasks.filter(
    t => t.category === "leftovers" && !t.completed
  ).length;

  document.getElementById("prepTasksCount").textContent = prepRemaining;
  document.getElementById("prepTasksDesc").textContent =
    prepRemaining === 0 && prepTasks.length > 0
      ? "All done!"
      : "Tasks to complete";
  document.getElementById("preppedCount").textContent = preppedMeals;
  document.getElementById("leftoversCount").textContent = leftovers;
}

function updateProgressRings() {
  const prepTasks = currentTasks.filter(t => t.category === "prep");
  const prepTotal = prepTasks.length;
  const prepCompleted = prepTasks.filter(t => t.completed).length;
  const prepPercentage = prepTotal > 0
    ? (prepCompleted / prepTotal) * 100
    : 0;

  const circumference = 2 * Math.PI * 48;
  const prepOffset = circumference - (prepPercentage / 100) * circumference;

  document.getElementById("prepRing").style.strokeDashoffset = prepOffset;
  document.getElementById("prepValue").textContent = prepCompleted;
  document.getElementById("prepTotal").textContent = `/${prepTotal}`;
  document.getElementById("prepPercent").textContent =
    `${Math.round(prepPercentage)}% done`;

  const preppedCount = currentTasks.filter(
    t => t.category === "prepped" && !t.completed
  ).length;
  const preppedOffset = preppedCount > 0 ? 0 : circumference;
  document.getElementById("preppedRing").style.strokeDashoffset = preppedOffset;
  document.getElementById("preppedValue").textContent = preppedCount;
  document.getElementById("preppedPercent").textContent =
    `${preppedCount} ready`;

  const leftoversCount = currentTasks.filter(
    t => t.category === "leftovers" && !t.completed
  ).length;
  const leftoversOffset = leftoversCount > 0 ? 0 : circumference;
  document.getElementById("leftoversRing").style.strokeDashoffset = leftoversOffset;
  document.getElementById("leftoversValue").textContent = leftoversCount;
  document.getElementById("leftoversPercent").textContent =
    `${leftoversCount} available`;
}

function updateTaskLists() {
  ["prep", "prepped", "leftovers"].forEach(category => {
    const listId =
      category === "prep"
        ? "prepList"
        : category === "prepped"
        ? "preppedList"
        : "leftoversList";

    const listElement = document.getElementById(listId);
    const categoryTasks = currentTasks.filter(t => t.category === category);

    if (categoryTasks.length === 0) {
      listElement.innerHTML =
        `<div class="empty-state">${getEmptyMessage(category)}</div>`;
    } else {
      listElement.innerHTML = "";
      categoryTasks.forEach(task => {
        listElement.appendChild(createTaskElement(task));
      });
    }
  });
}

function getEmptyMessage(category) {
  const messages = {
    prep: "Add the prep work you need to do...",
    prepped: "Track meals you've prepped and portioned...",
    leftovers: "Track leftovers from meals you've eaten..."
  };
  return messages[category];
}

function createTaskElement(task) {
  const item = document.createElement("div");
  item.className = "task-item";
  item.dataset.taskId = task.id;
  if (task.completed) item.classList.add("completed");

  const checkbox = document.createElement("div");
  checkbox.className = "checkbox";
  if (task.completed) checkbox.classList.add("checked");

  const content = document.createElement("div");
  content.className = "task-content";

  const text = document.createElement("div");
  text.className = "task-text";
  text.textContent = task.text;
  content.appendChild(text);

  // Portions (for prepped + leftovers)
  if (task.portions && (task.category === "prepped" || task.category === "leftovers")) {
    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.textContent = task.portions;
    content.appendChild(meta);
  }

  // Freshness ("X days old")
  if ((task.category === "prepped" || task.category === "leftovers") && task.cookedDate) {
    const freshness = document.createElement("div");
    freshness.className = "task-meta";

    const cooked = new Date(task.cookedDate);
    if (!isNaN(cooked)) {
      const now = new Date();
      const diffMs = now - cooked;
      const daysOld = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      if (daysOld <= 2) freshness.style.color = "#6B8259";
      else if (daysOld <= 4) freshness.style.color = "#C69D67";
      else freshness.style.color = "#B25C5C";

      freshness.textContent = `${daysOld} day${daysOld !== 1 ? "s" : ""} old`;
      content.appendChild(freshness);
    }
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  deleteBtn.onclick = e => {
    e.stopPropagation();
    deleteTask(task.id);
  };

  item.appendChild(checkbox);
  item.appendChild(content);
  item.appendChild(deleteBtn);

  item.onclick = () => toggleTask(task.id);

  return item;
}

function updateInsights() {
  const container = document.getElementById("insightsContainer");

  if (currentTasks.length === 0) {
    container.innerHTML = `
      <div class="insight-item">
        <div class="insight-icon">🎯</div>
        <div class="insight-text">
          Start tracking your meal prep to see what's ready and what needs doing!
        </div>
      </div>`;
    return;
  }

  const insights = [];

  const prepTasks = currentTasks.filter(t => t.category === "prep");
  const prepRemaining = prepTasks.filter(t => !t.completed).length;

  if (prepRemaining > 0) {
    insights.push(`
      <div class="insight-item">
        <div class="insight-icon">📋</div>
        <div class="insight-text">
          ${prepRemaining} ${prepRemaining === 1 ? "prep task" : "prep tasks"} left to complete
        </div>
      </div>`);
  }

  const preppedCount = currentTasks.filter(
    t => t.category === "prepped" && !t.completed
  ).length;

  const leftoversCount = currentTasks.filter(
    t => t.category === "leftovers" && !t.completed
  ).length;

  const totalReadyToEat = preppedCount + leftoversCount;

  if (totalReadyToEat > 0) {
    insights.push(`
      <div class="inquiry-item">
        <div class="insight-icon">✨</div>
        <div class="insight-value">${totalReadyToEat}</div>
        <div class="insight-text">
          ${totalReadyToEat} meals ready to eat this week.
        </div>
      </div>`);
  }

  container.innerHTML = insights.join("") || `
    <div class="insight-item">
      <div class="insight-icon">👍</div>
      <div class="insight-text">You're all set. Add items as you prep this week.</div>
    </div>`;
}

// --------- TASK ACTIONS ----------
function toggleTask(id) {
  const idx = currentTasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  currentTasks[idx].completed = !currentTasks[idx].completed;
  saveTasks();
  updateDashboard();
}

function deleteTask(id) {
  currentTasks = currentTasks.filter(t => t.id !== id);
  saveTasks();
  updateDashboard();
}

// --------- MODAL ----------
function openModal(category) {
  currentCategory = category;
  document.getElementById("modalOverlay").classList.add("active");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("active");
}

document.getElementById("addPrepBtn").onclick = () => openModal("prep");
document.getElementById("addPreppedBtn").onclick = () => openModal("prepped");
document.getElementById("addLeftoversBtn").onclick = () => openModal("leftovers");
document.getElementById("cancelBtn").onclick = closeModal;

document.getElementById("saveBtn").onclick = () => {
  const text = document.getElementById("taskInput").value.trim();
  if (!text) return;

  let portions = "";
  let cookedDate = "";

  if (currentCategory === "prepped" || currentCategory === "leftovers") {
    portions = document.getElementById("portionsInput").value.trim();
    cookedDate = document.getElementById("dateInput").value;
  }

  currentTasks.push({
    id: `task-${Date.now()}`,
    text,
    category: currentCategory,
    completed: false,
    portions,
    cookedDate,
  });

  saveTasks();
  closeModal();
  updateDashboard();
};

// --------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  currentTasks = loadTasks();
  updateDashboard();
});
