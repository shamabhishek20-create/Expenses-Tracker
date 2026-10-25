const STORAGE_KEY = "spendwise_transactions_v1";
const THEME_KEY = "spendwise_theme_v1";
const CATEGORY_OPTIONS = {
  expense: ["Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Entertainment", "Health", "Education", "Travel", "Other"],
  income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"]
};
const CATEGORY_COLORS = {
  "Food & Dining": "#6258e8", "Transport": "#6d9cf3", "Shopping": "#e8a85d",
  "Bills & Utilities": "#e56a75", "Entertainment": "#29b99a", "Health": "#ad82e8",
  "Education": "#4bafc2", "Travel": "#e58fbe", "Other": "#9aa5b5",
  "Salary": "#6258e8", "Freelance": "#6d9cf3", "Business": "#29b99a",
  "Investment": "#e8a85d", "Gift": "#e58fbe"
};
const CATEGORY_ICONS = {
  "Food & Dining": "☕", "Transport": "↗", "Shopping": "◇", "Bills & Utilities": "▤",
  "Entertainment": "♫", "Health": "✚", "Education": "▣", "Travel": "✈",
  "Salary": "↓", "Freelance": "✎", "Business": "▥", "Investment": "↗", "Gift": "♡", "Other": "•"
};

const $ = (id) => document.getElementById(id);
let transactions = loadTransactions();
let selectedType = "expense";
let toastTimer;

function localISODate(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
function currentMonth() { return localISODate().slice(0, 7); }
function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(t => t && t.id && t.date && Number.isFinite(Number(t.amount))) : [];
  } catch { return []; }
}
function saveTransactions() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
  catch { showToast("Could not save in this browser. Check storage settings."); }
}
function currency(value, compact = false) {
  const number = Number(value) || 0;
  if (compact && Math.abs(number) >= 100000) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(number);
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
}
function prettyDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function selectedMonth() { return $("monthFilter").value || currentMonth(); }
function monthTransactions() { return transactions.filter(t => t.date.startsWith(selectedMonth())); }
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function updateSummary() {
  const list = monthTransactions();
  const income = list.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = list.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
  $("balanceValue").textContent = currency(balance, true);
  $("incomeValue").textContent = currency(income, true);
  $("expenseValue").textContent = currency(expense, true);
  $("savingsValue").textContent = `${Math.max(-100, Math.min(100, savingsRate))}%`;
  $("savingsProgress").style.width = `${Math.max(0, Math.min(100, savingsRate))}%`;
  $("savingsCaption").textContent = income === 0 ? "Add income to calculate savings" : balance < 0 ? "Spending exceeds income" : "Income saved this month";
  $("cashflowNet").textContent = `${currency(balance, true)} net`;
  $("cashflowNet").style.color = balance < 0 ? "var(--red)" : "var(--green)";
  const monthLabel = new Date(`${selectedMonth()}-15T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  $("chartPeriod").textContent = monthLabel;
  renderDonut(list.filter(t => t.type === "expense"));
  renderCashflow(list);
}
function renderDonut(expenses) {
  const totals = {};
  expenses.forEach(t => { totals[t.category] = (totals[t.category] || 0) + Number(t.amount); });
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  $("donutTotal").textContent = currency(total, true);
  if (!total) {
    $("donutChart").style.background = "conic-gradient(var(--line) 0deg 360deg)";
    $("categoryLegend").innerHTML = '<div class="empty-chart">Add expenses to see your categories.</div>';
    $("spendingFooter").textContent = "Your spending breakdown will appear here.";
    return;
  }
  let cursor = 0;
  const stops = entries.map(([category, amount]) => {
    const start = cursor;
    cursor += amount / total * 360;
    return `${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other} ${start}deg ${cursor}deg`;
  });
  $("donutChart").style.background = `conic-gradient(${stops.join(",")})`;
  $("categoryLegend").innerHTML = entries.slice(0, 5).map(([category, amount]) => `
    <div class="legend-item">
      <span class="legend-swatch" style="background:${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}"></span>
      <span class="legend-name">${escapeHTML(category)}</span>
      <strong class="legend-value">${Math.round(amount / total * 100)}%</strong>
    </div>`).join("");
  const top = entries[0];
  $("spendingFooter").textContent = `${top[0]} is your top category at ${currency(top[1], true)}.`;
}
function renderCashflow(list) {
  const buckets = Array.from({ length: 7 }, (_, i) => ({ label: ["1–4", "5–9", "10–14", "15–19", "20–24", "25–29", "30–31"][i], income: 0, expense: 0 }));
  list.forEach(t => {
    const day = Number(t.date.slice(8, 10));
    const index = Math.min(6, Math.floor((day - 1) / 5));
    if (t.type === "income") buckets[index].income += Number(t.amount);
    else buckets[index].expense += Number(t.amount);
  });
  const max = Math.max(1, ...buckets.flatMap(b => [b.income, b.expense]));
  $("cashflowChart").innerHTML = buckets.map(b => {
    const hIncome = b.income ? Math.max(4, b.income / max * 100) : 2;
    const hExpense = b.expense ? Math.max(4, b.expense / max * 100) : 2;
    return `<div class="bar-day" title="${b.label}: income ${currency(b.income)}, expenses ${currency(b.expense)}">
      <div class="bar-pair"><span class="bar bar-income" style="height:${hIncome}%"></span><span class="bar bar-expense" style="height:${hExpense}%"></span></div>
      <span class="bar-label">${b.label}</span></div>`;
  }).join("");
}
function filteredTransactions() {
  const query = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value;
  return monthTransactions().filter(t => {
    const matchesQuery = !query || [t.description, t.category, t.date, t.type].some(v => String(v).toLowerCase().includes(query));
    return matchesQuery && (type === "all" || t.type === type);
  }).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
}
function renderTransactions() {
  const list = filteredTransactions();
  const tbody = $("transactionRows");
  $("emptyState").classList.toggle("visible", list.length === 0);
  tbody.innerHTML = list.map(t => {
    const isIncome = t.type === "income";
    const icon = CATEGORY_ICONS[t.category] || (isIncome ? "↓" : "•");
    return `<tr>
      <td><div class="transaction-title"><span class="transaction-symbol ${isIncome ? "symbol-income" : "symbol-expense"}">${icon}</span><div><strong>${escapeHTML(t.description)}</strong><small>${isIncome ? "Money received" : "Money spent"}</small></div></div></td>
      <td><span class="category-pill">${escapeHTML(t.category)}</span></td>
      <td>${prettyDate(t.date)}</td>
      <td><span class="type-pill ${isIncome ? "type-income" : "type-expense"}">${isIncome ? "Income" : "Expense"}</span></td>
      <td class="align-right"><span class="amount ${isIncome ? "income" : "expense"}">${isIncome ? "+" : "−"}${currency(t.amount)}</span></td>
      <td><button class="delete-row" data-delete="${escapeHTML(t.id)}" aria-label="Delete ${escapeHTML(t.description)}" title="Delete transaction">×</button></td>
    </tr>`;
  }).join("");
  $("transactionCount").textContent = `Showing ${list.length} transaction${list.length === 1 ? "" : "s"} for ${new Date(`${selectedMonth()}-15T12:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
}
function render() { updateSummary(); renderTransactions(); }
function updateCategories() {
  const categories = CATEGORY_OPTIONS[selectedType];
  $("category").innerHTML = categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  document.querySelectorAll(".type-option").forEach(btn => btn.classList.toggle("selected", btn.dataset.type === selectedType));
  $("transactionType").value = selectedType;
}
function openModal() {
  $("formError").textContent = "";
  $("transactionForm").reset();
  selectedType = "expense";
  updateCategories();
  $("transactionDate").value = localISODate();
  $("modalBackdrop").hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => $("description").focus(), 50);
}
function closeModal() {
  $("modalBackdrop").hidden = true;
  document.body.style.overflow = "";
}
function addTransaction(event) {
  event.preventDefault();
  const description = $("description").value.trim();
  const amount = Number($("amount").value);
  const date = $("transactionDate").value;
  const category = $("category").value;
  if (!description || !date || !Number.isFinite(amount) || amount <= 0) {
    $("formError").textContent = "Enter a description, valid amount, and date.";
    return;
  }
  transactions.push({
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description, amount: Math.round(amount * 100) / 100, date, category, type: selectedType, createdAt: Date.now()
  });
  saveTransactions();
  $("monthFilter").value = date.slice(0, 7);
  $("searchInput").value = "";
  $("typeFilter").value = "all";
  closeModal();
  render();
  showToast(`${selectedType === "income" ? "Income" : "Expense"} added successfully.`);
}
function exportCSV() {
  const list = filteredTransactions();
  if (!list.length) { showToast("There are no transactions to export for these filters."); return; }
  const rows = [["Description", "Type", "Category", "Date", "Amount (INR)"], ...list.map(t => [t.description, t.type, t.category, t.date, Number(t.amount).toFixed(2)])];
  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `spendwise-transactions-${selectedMonth()}.csv`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  showToast("CSV export downloaded.");
}
function init() {
  $("todayLabel").textContent = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  $("year").textContent = new Date().getFullYear();
  $("monthFilter").value = currentMonth();
  if (localStorage.getItem(THEME_KEY) === "dark") document.body.classList.add("dark-theme");

  ["openAddTop", "emptyAddButton"].forEach(id => $(id).addEventListener("click", openModal));
  $("closeModal").addEventListener("click", closeModal);
  $("cancelModal").addEventListener("click", closeModal);
  $("modalBackdrop").addEventListener("click", e => { if (e.target === $("modalBackdrop")) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("modalBackdrop").hidden) closeModal(); });
  document.querySelectorAll(".type-option").forEach(btn => btn.addEventListener("click", () => { selectedType = btn.dataset.type; updateCategories(); }));
  $("transactionForm").addEventListener("submit", addTransaction);
  $("monthFilter").addEventListener("change", render);
  $("searchInput").addEventListener("input", renderTransactions);
  $("typeFilter").addEventListener("change", renderTransactions);
  $("clearFilters").addEventListener("click", () => { $("searchInput").value = ""; $("typeFilter").value = "all"; renderTransactions(); });
  $("exportBtn").addEventListener("click", exportCSV);
  $("transactionRows").addEventListener("click", e => {
    const button = e.target.closest("[data-delete]");
    if (!button) return;
    const item = transactions.find(t => t.id === button.dataset.delete);
    if (!item) return;
    if (confirm(`Delete "${item.description}"? This cannot be undone.`)) {
      transactions = transactions.filter(t => t.id !== item.id);
      saveTransactions(); render(); showToast("Transaction deleted.");
    }
  });
  $("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    localStorage.setItem(THEME_KEY, document.body.classList.contains("dark-theme") ? "dark" : "light");
  });
  $("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
    link.classList.add("active");
    $("sidebar").classList.remove("open");
  }));
  updateCategories();
  render();
}
document.addEventListener("DOMContentLoaded", init);
