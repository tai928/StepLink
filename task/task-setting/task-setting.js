const supabase = window.supabaseClient;
const plans = window.taskPlans || [];

const plansListEl = document.getElementById("plansList");
const detailPanelEl = document.getElementById("detailPanel");
const searchInputEl = document.getElementById("planSearch");
const savedTasksListEl = document.getElementById("savedTasksList");
const reloadTasksBtn = document.getElementById("reloadTasksBtn");

let selectedPlanId = plans[0]?.id || null;
let currentUser = null;

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return "未設定";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("ja-JP");
}

function getFilteredPlans() {
  const keyword = searchInputEl.value.trim().toLowerCase();
  if (!keyword) return plans;

  return plans.filter((plan) => {
    const target = `${plan.category} ${plan.title} ${plan.excerpt} ${plan.detail} ${(plan.points || []).join(" ")}`.toLowerCase();
    return target.includes(keyword);
  });
}

function renderPlans() {
  const filtered = getFilteredPlans();

  if (!filtered.length) {
    plansListEl.innerHTML = `<div class="empty-box">該当する実行案が見つかりませんでした。</div>`;
    detailPanelEl.innerHTML = `<div class="detail-empty">検索条件に一致する実行案がありません。</div>`;
    return;
  }

  if (!filtered.some((plan) => plan.id === selectedPlanId)) {
    selectedPlanId = filtered[0].id;
  }

  plansListEl.innerHTML = filtered.map((plan) => `
    <button class="plan-card ${selectedPlanId === plan.id ? "active" : ""}" data-plan-id="${escapeHtml(plan.id)}">
      <div class="plan-inner">
        <div class="plan-thumb-wrap">
          <img class="plan-thumb" src="${escapeHtml(plan.thumbnail)}" alt="${escapeHtml(plan.title)}">
          <span class="plan-category">${escapeHtml(plan.category)}</span>
        </div>
        <div class="plan-content">
          <h3>${escapeHtml(plan.title)}</h3>
          <p class="plan-excerpt">${escapeHtml(plan.excerpt)}</p>
          <div class="plan-footer">
            <span class="plan-link">詳細を見る</span>
            <span class="plan-tag">タスク候補</span>
          </div>
        </div>
      </div>
    </button>
init();