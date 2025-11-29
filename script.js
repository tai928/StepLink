
// =======================================================
// StepLink × Supabase 完全版 script.js
// （たい専用／二重コードなし／保存バグなし）
// =======================================================

// ------------------------------
//  Supabase 設定（ここを書き換える）
// ------------------------------
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("StepLink script loaded:", SUPABASE_URL);

// ------------------------------
//  DOM 取得
// ------------------------------
const body = document.body;

// テーマ
const themeToggleBtn = document.getElementById("themeToggle");

// ナビ
const navItems = document.querySelectorAll(".nav-item");
const homePage = document.getElementById("homePage");
const profilePage = document.getElementById("profilePage");
const messagesPage = document.getElementById("messagesPage");

// 投稿関連
const tweetInput = document.getElementById("tweetInput");
const postTweetBtn = document.getElementById("postTweetBtn");
const tweetsContainer = document.getElementById("tweetsContainer");

// モーダル投稿
const tweetModal = document.getElementById("tweetModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const tweetInputModal = document.getElementById("tweetInputModal");
const postTweetBtnModal = document.getElementById("postTweetBtnModal");

// プロフィールUI
const currentUserAvatarEl = document.getElementById("currentUserAvatar");
const currentUserNameEl = document.getElementById("currentUserName");
const currentUserHandleEl = document.getElementById("currentUserHandle");

// アカウントモーダル
const accountModal = document.getElementById("accountModal");
const switchAccountBtn = document.getElementById("switchAccountBtn");
const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");
const accountLoginView = document.getElementById("accountLoginView");
const accountRegisterView = document.getElementById("accountRegisterView");
const accountTabs = document.querySelectorAll(".account-tab");

// ログイン
const loginHandleInput = document.getElementById("loginHandleInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginError = document.getElementById("loginError");

// 新規登録
const regNameInput = document.getElementById("regNameInput");
const regHandleInput = document.getElementById("regHandleInput");
const regEmailInput = document.getElementById("regEmailInput");
const regAvatarInput = document.getElementById("regAvatarInput");
const regPasswordInput = document.getElementById("regPasswordInput");
const registerSubmitBtn = document.getElementById("registerSubmitBtn");
const registerError = document.getElementById("registerError");

// プロフィール表示
const profileNameEl = document.getElementById("profileName");
const profileHandleEl = document.getElementById("profileHandle");

// ------------------------------
//  グローバル状態
// ------------------------------
let currentUser = null;
let currentProfile = null;
let tweetsCache = [];

// =======================================================
//  テーマ切り替え
// =======================================================
function initTheme() {
  const saved = localStorage.getItem("steplink-theme");
  body.setAttribute("data-theme", saved || "dark");
}

function toggleTheme() {
  const now = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
  body.setAttribute("data-theme", now);
  localStorage.setItem("steplink-theme", now);
  themeToggleBtn.textContent = now === "dark" ? "🌙" : "☀️";
}

// =======================================================
//  ナビゲーション
// =======================================================
function showPage(page) {
  homePage.classList.add("hidden");
  profilePage.classList.add("hidden");
  messagesPage.classList.add("hidden");

  const pages = {
    home: homePage,
    messages: messagesPage,
    profile: profilePage,
  };

  pages[page].classList.remove("hidden");

  navItems.forEach((n) => n.classList.remove("active"));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add("active");
}

// =======================================================
//  モーダル
// =======================================================
function openTweetModal() {
  tweetModal.classList.remove("hidden");
}
function closeTweetModal() {
  tweetModal.classList.add("hidden");
  tweetInputModal.value = "";
}

function openAccountModal() {
  accountModal.classList.remove("hidden");
}
function closeAccountModal() {
  accountModal.classList.add("hidden");
}

// =======================================================
//  プロフィール保存（RLS対応）
// =======================================================
async function upsertProfile({ name, handle, avatar }) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("ログインユーザーが取得できない…");

  const row = {
    id: user.id, // RLS: auth.uid() = id
    name,
    handle,
    avatar,
    updated_at: new Date().toISOString(),
  };

  const { data, error: upsertError } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (upsertError) throw upsertError;

  return data;
}

// =======================================================
//  ユーザー情報取得
// =======================================================
async function refreshCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    currentUser = null;
    currentProfile = null;
    updateUserUI();
    return;
  }

  currentUser = user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  currentProfile = profile || null;
  updateUserUI();
}

// =======================================================
//  UI反映
// =======================================================
function updateUserUI() {
  if (!currentUser || !currentProfile) {
    currentUserAvatarEl.textContent = "🧑‍💻";
    currentUserNameEl.textContent = "未ログイン";
    currentUserHandleEl.textContent = "";
    profileNameEl.textContent = "StepLinkユーザー";
    profileHandleEl.textContent = "@user";
    return;
  }

  currentUserAvatarEl.textContent = currentProfile.avatar;
  currentUserNameEl.textContent = currentProfile.name;
  currentUserHandleEl.textContent = `@${currentProfile.handle}`;
  profileNameEl.textContent = currentProfile.name;
  profileHandleEl.textContent = `@${currentProfile.handle}`;
}

// =======================================================
//  ツイート取得
// =======================================================
async function loadTweets() {
  const { data, error } = await supabase
    .from("tweets")
    .select(
      `
      id,
      content,
      image_url,
      created_at,
      user_id,
      profiles (
        name,
        handle,
        avatar
      )
    `
    )
    .order("created_at", { ascending: false });

  if (!error) {
    tweetsCache = data;
    renderTweets();
  }
}

// =======================================================
//  ツイート表示
// =======================================================
function createTweetCard(tweet) {
  const card = document.createElement("article");
  card.className = "post";

  const avatar = tweet.profiles?.avatar || "🧑‍💻";
  const name = tweet.profiles?.name || "名無し";
  const handle = tweet.profiles?.handle || "user";
  const time = new Date(tweet.created_at).toLocaleString("ja-JP");

  card.innerHTML = `
    <div class="post-avatar">${avatar}</div>
    <div class="post-body">
      <header class="post-header">
        <span class="post-name">${name}</span>
        <span class="post-handle">@${handle}</span>
        <span class="post-dot">·</span>
        <span class="post-time">${time}</span>
      </header>
      <div class="post-content"></div>
      <div class="post-footer">
        <button class="icon-btn">💬</button>
        <button class="icon-btn">♻️</button>
        <button class="icon-btn">❤️</button>
      </div>
    </div>
  `;

  const content = card.querySelector(".post-content");
  const p = document.createElement("p");
  p.textContent = tweet.content;
  content.appendChild(p);

  return card;
}

function renderTweets() {
  tweetsContainer.innerHTML = "";
  tweetsCache.forEach((t) => {
    tweetsContainer.appendChild(createTweetCard(t));
  });
}

// =======================================================
//  ツイート投稿
// =======================================================
async function submitTweet(isModal = false) {
  const textarea = isModal ? tweetInputModal : tweetInput;
  const text = textarea.value.trim();

  if (!text) return;
  if (!currentUser) return alert("ログインが必要です");

  const { error } = await supabase.from("tweets").insert({
    user_id: currentUser.id,
    content: text,
  });

  if (error) {
    console.error(error);
    return alert("投稿でエラーが出たよ…");
  }

  textarea.value = "";
  if (isModal) closeTweetModal();

  await loadTweets();
}

// =======================================================
//  新規登録
// =======================================================
async function handleRegister() {
  registerError.textContent = "";

  const name = regNameInput.value.trim();
  const handle = regHandleInput.value.trim();
  const email = regEmailInput.value.trim();
  const avatar = regAvatarInput.value.trim() || "🧑‍💻";
  const password = regPasswordInput.value;

  if (!name || !handle || !email || !password) {
    registerError.textContent = "未入力の項目があるよ…";
    return;
  }

  registerSubmitBtn.disabled = true;

  // 1️⃣ SignUp
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpError) {
    registerError.textContent = signUpError.message;
    registerSubmitBtn.disabled = false;
    return;
  }

  // 2️⃣ SignIn（セッション作成）
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    registerError.textContent = signInError.message;
    registerSubmitBtn.disabled = false;
    return;
  }

  // 3️⃣ プロフィール保存
  try {
    await upsertProfile({ name, handle, avatar });
  } catch (e) {
    console.error("upsertProfile error:", e);
    registerError.textContent = "プロフィール保存でエラーが出た…";
    registerSubmitBtn.disabled = false;
    return;
  }

  registerSubmitBtn.disabled = false;
  closeAccountModal();

  await refreshCurrentUser();
  await loadTweets();
}

// =======================================================
//  ログイン
// =======================================================
async function handleLogin() {
  loginError.textContent = "";

  const email = loginHandleInput.value.trim();
  const password = loginPasswordInput.value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginError.textContent = error.message;
    return;
  }

  await refreshCurrentUser();
  closeAccountModal();
}

// =======================================================
//  初期化
// =======================================================
async function init() {
  initTheme();
  showPage("home");

  themeToggleBtn.addEventListener("click", toggleTheme);

  navItems.forEach((n) =>
    n.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(n.dataset.page);
    })
  );

  openModalBtn.addEventListener("click", openTweetModal);
  closeModalBtn.addEventListener("click", closeTweetModal);

  switchAccountBtn.addEventListener("click", openAccountModal);
  closeAccountModalBtn.addEventListener("click", closeAccountModal);

  // アカウント切り替え
  accountTabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      accountTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      if (tab.dataset.mode === "login") {
        accountLoginView.classList.remove("hidden");
        accountRegisterView.classList.add("hidden");
      } else {
        accountLoginView.classList.add("hidden");
        accountRegisterView.classList.remove("hidden");
      }
    })
  );

  // 投稿
  postTweetBtn.addEventListener("click", () => submitTweet(false));
  postTweetBtnModal.addEventListener("click", () => submitTweet(true));

  // ログイン/登録
  loginSubmitBtn.addEventListener("click", handleLogin);
  registerSubmitBtn.addEventListener("click", handleRegister);

  // セッション復元
  await refreshCurrentUser();

  await loadTweets();
}

init();

