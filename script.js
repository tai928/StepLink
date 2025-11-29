// ==============================
// Supabase 設定
// ==============================

// ★ここは自分の Supabase プロジェクトの値にしておいてね
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

// CDN 版 supabase-js v2 を想定
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("StepLink script loaded. URL =", SUPABASE_URL);

// ==============================
// DOM 要素
// ==============================
const body = document.body;

// テーマ
const themeToggleBtn = document.getElementById("themeToggle");

// ナビ & ページ
const navItems = document.querySelectorAll(".nav-item");
const homePage = document.getElementById("homePage");
const messagesPage = document.getElementById("messagesPage");
const profilePage = document.getElementById("profilePage");

// 投稿モーダル
const tweetModal = document.getElementById("tweetModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

// アカウントモーダル
const accountModal = document.getElementById("accountModal");
const switchAccountBtn = document.getElementById("switchAccountBtn");
const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");
const accountTabs = document.querySelectorAll(".account-tab");
const accountLoginView = document.getElementById("accountLoginView");
const accountRegisterView = document.getElementById("accountRegisterView");

// ログイン関連入力
const loginHandleInput = document.getElementById("loginHandleInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginError = document.getElementById("loginError");

// 新規登録関連入力
const regNameInput = document.getElementById("regNameInput");
const regHandleInput = document.getElementById("regHandleInput");
const regEmailInput = document.getElementById("regEmailInput");
const regAvatarInput = document.getElementById("regAvatarInput");
const regPasswordInput = document.getElementById("regPasswordInput");
const registerSubmitBtn = document.getElementById("registerSubmitBtn");
const registerError = document.getElementById("registerError");

// ユーザー表示
const currentUserAvatarEl = document.getElementById("currentUserAvatar");
const currentUserNameEl = document.getElementById("currentUserName");
const currentUserHandleEl = document.getElementById("currentUserHandle");

// プロフィール側表示
const profileNameEl = document.getElementById("profileName");
const profileHandleEl = document.getElementById("profileHandle");

// ホーム投稿欄
const tweetInput = document.getElementById("tweetInput");
const charCounter = document.getElementById("charCounter");
const imageSelectBtn = document.getElementById("imageSelectBtn");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const postTweetBtn = document.getElementById("postTweetBtn");

// モーダル投稿欄
const tweetInputModal = document.getElementById("tweetInputModal");
const charCounterModal = document.getElementById("charCounterModal");
const imageSelectBtnModal = document.getElementById("imageSelectBtnModal");
const imageInputModal = document.getElementById("imageInputModal");
const imagePreviewModal = document.getElementById("imagePreviewModal");
const postTweetBtnModal = document.getElementById("postTweetBtnModal");

// 投稿リスト
const tweetsContainer = document.getElementById("tweetsContainer");
const profileTweetsContainer = document.getElementById("profileTweetsContainer");

// ==============================
// 状態
// ==============================
let currentUser = null;     // Supabase auth.user
let currentProfile = null;  // profiles テーブルの行
let tweetsCache = [];       // 取得したツイート

// ==============================
// テーマ
// ==============================
function initTheme() {
  const saved = localStorage.getItem("steplink-theme");
  if (saved === "light" || saved === "dark") {
    body.setAttribute("data-theme", saved);
  } else {
    body.setAttribute("data-theme", "dark");
  }
  themeToggleBtn.textContent =
    body.getAttribute("data-theme") === "dark" ? "🌙" : "☀️";
}

function toggleTheme() {
  const now = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
  body.setAttribute("data-theme", now);
  localStorage.setItem("steplink-theme", now);
  themeToggleBtn.textContent = now === "dark" ? "🌙" : "☀️";
}

// ==============================
// ページ切り替え
// ==============================
function showPage(page) {
  homePage.classList.add("hidden");
  messagesPage.classList.add("hidden");
  profilePage.classList.add("hidden");

  navItems.forEach((item) => item.classList.remove("active"));

  if (page === "home") {
    homePage.classList.remove("hidden");
  } else if (page === "messages") {
    messagesPage.classList.remove("hidden");
  } else if (page === "profile") {
    profilePage.classList.remove("hidden");
  }

  const activeItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeItem) activeItem.classList.add("active");
}

// ==============================
// モーダル
// ==============================
function openTweetModal() {
  tweetModal.classList.remove("hidden");
}

function closeTweetModal() {
  tweetModal.classList.add("hidden");
  tweetInputModal.value = "";
  charCounterModal.textContent = "0 / 140";
  clearImagePreview(imagePreviewModal);
  imageInputModal.value = "";
}

function openAccountModal() {
  accountModal.classList.remove("hidden");
}

function closeAccountModal() {
  accountModal.classList.add("hidden");
  loginError.textContent = "";
  registerError.textContent = "";
}

// ==============================
// 文字数カウンタ
// ==============================
function updateCharCounter(textarea, counterEl) {
  const len = textarea.value.length;
  counterEl.textContent = `${len} / 140`;
  if (len > 140) {
    counterEl.classList.add("over");
  } else {
    counterEl.classList.remove("over");
  }
}

// ==============================
// 画像プレビュー
// ==============================
function setUpImageSelector(buttonEl, inputEl, previewEl) {
  buttonEl.addEventListener("click", () => {
    inputEl.click();
  });

  inputEl.addEventListener("change", () => {
    const file = inputEl.files[0];
    if (!file) {
      clearImagePreview(previewEl);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      previewEl.innerHTML = "";
      const img = document.createElement("img");
      img.src = reader.result;
      img.alt = "preview";
      previewEl.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function clearImagePreview(previewEl) {
  previewEl.innerHTML = "";
}

// ==============================
// プロフィール upsert（RLS 対策）
// ==============================
async function upsertProfile({ display_name, handle, avatar_emoji }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("getUser error:", userError);
    throw new Error("ログインユーザーが取得できない…");
  }

  const row = {
    id: user.id, // ← auth.uid() と同じになる
    display_name,
    handle,
    avatar_emoji,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("upsertProfile error:", error);
    throw error;
  }

  return data;
}

// ==============================
// ユーザー & プロフィール取得
// ==============================
async function refreshCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("getUser error:", error);
  }

  if (!user) {
    currentUser = null;
    currentProfile = null;
    updateUserUI();
    return;
  }

  currentUser = user;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("profiles select error:", profileError);
  }

  currentProfile = profile || null;
  updateUserUI();
}

// ==============================
// ユーザーUI
// ==============================
function updateUserUI() {
  if (!currentUser || !currentProfile) {
    currentUserAvatarEl.textContent = "🧑‍💻";
    currentUserNameEl.textContent = "未ログイン";
    currentUserHandleEl.textContent = "";
    profileNameEl.textContent = "StepLinkユーザー";
    profileHandleEl.textContent = "@user";
    return;
  }

  const avatar = currentProfile.avatar_emoji || "🧑‍💻";
  const name = currentProfile.display_name || "名前なし";
  const handle = currentProfile.handle || "user";

  currentUserAvatarEl.textContent = avatar;
  currentUserNameEl.textContent = name;
  currentUserHandleEl.textContent = handle ? `@${handle}` : "";

  profileNameEl.textContent = name;
  profileHandleEl.textContent = handle ? `@${handle}` : "@user";
}

// ==============================
// ツイート読み込み
// ==============================
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
        display_name,
        handle,
        avatar_emoji
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadTweets error:", error);
    return;
  }

  tweetsCache = data || [];
  renderTweets();
}

function renderTweets() {
  tweetsContainer.innerHTML = "";
  profileTweetsContainer.innerHTML = "";

  tweetsCache.forEach((tweet) => {
    const card = createTweetCard(tweet);
    tweetsContainer.appendChild(card);

    if (currentUser && tweet.user_id === currentUser.id) {
      const ownCard = createTweetCard(tweet);
      profileTweetsContainer.appendChild(ownCard);
    }
  });
}

function createTweetCard(tweet) {
  const card = document.createElement("article");
  card.className = "post";

  const avatar = tweet.profiles?.avatar_emoji || "🧑‍💻";
  const name = tweet.profiles?.display_name || "名無し";
  const handle = tweet.profiles?.handle || "user";
  const time = tweet.created_at
    ? new Date(tweet.created_at).toLocaleString("ja-JP")
    : "";

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

  const contentEl = card.querySelector(".post-content");
  const textEl = document.createElement("p");
  textEl.textContent = tweet.content || "";
  contentEl.appendChild(textEl);

  if (tweet.image_url) {
    const img = document.createElement("img");
    img.src = tweet.image_url;
    img.alt = "post image";
    img.className = "post-image";
    contentEl.appendChild(img);
  }

  return card;
}

// ==============================
// ツイート投稿
// ==============================
async function submitTweet(source) {
  const isModal = source === "modal";

  const textarea = isModal ? tweetInputModal : tweetInput;
  const previewEl = isModal ? imagePreviewModal : imagePreview;
  const fileInput = isModal ? imageInputModal : imageInput;

  const text = textarea.value.trim();
  if (!text) return;
  if (text.length > 140) {
    alert("140文字を超えてるよ…🥺");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("ログインしてから投稿してね…！");
    openAccountModal();
    return;
  }

  let imageDataUrl = null;
  const imgTag = previewEl.querySelector("img");
  if (imgTag) {
    imageDataUrl = imgTag.src;
  }

  const { error } = await supabase.from("tweets").insert({
    user_id: user.id,
    content: text,
    image_url: imageDataUrl,
  });

  if (error) {
    console.error("submitTweet error:", error);
    alert("投稿でエラーが出ちゃった…コンソール見て…");
    return;
  }

  textarea.value = "";
  updateCharCounter(textarea, isModal ? charCounterModal : charCounter);
  clearImagePreview(previewEl);
  fileInput.value = "";

  if (isModal) {
    closeTweetModal();
  }

  await loadTweets();
}

// ==============================
// イベント
// ==============================
function setupEvents() {
  // テーマ
  themeToggleBtn.addEventListener("click", toggleTheme);

  // ナビ
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      showPage(page);
    });
  });

  // 投稿モーダル
  openModalBtn.addEventListener("click", openTweetModal);
  closeModalBtn.addEventListener("click", closeTweetModal);
  tweetModal
    .querySelector(".modal-backdrop")
    .addEventListener("click", closeTweetModal);

  // アカウントモーダル
  switchAccountBtn.addEventListener("click", openAccountModal);
  closeAccountModalBtn.addEventListener("click", closeAccountModal);
  accountModal
    .querySelector(".modal-backdrop")
    .addEventListener("click", closeAccountModal);

  // アカウントタブ切り替え
  accountTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      accountTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const mode = tab.dataset.mode;
      if (mode === "login") {
        accountLoginView.classList.remove("hidden");
        accountRegisterView.classList.add("hidden");
      } else {
        accountLoginView.classList.add("hidden");
        accountRegisterView.classList.remove("hidden");
      }
    });
  });

  // 文字数カウント
  tweetInput.addEventListener("input", () =>
    updateCharCounter(tweetInput, charCounter)
  );
  tweetInputModal.addEventListener("input", () =>
    updateCharCounter(tweetInputModal, charCounterModal)
  );

  // 画像選択
  setUpImageSelector(imageSelectBtn, imageInput, imagePreview);
  setUpImageSelector(imageSelectBtnModal, imageInputModal, imagePreviewModal);

  // 投稿ボタン
  postTweetBtn.addEventListener("click", () => submitTweet("home"));
  postTweetBtnModal.addEventListener("click", () => submitTweet("modal"));

  // ログイン
  loginSubmitBtn.addEventListener("click", async () => {
    loginError.textContent = "";

    const email = loginHandleInput.value.trim();
    const password = loginPasswordInput.value;

    if (!email || !password) {
      loginError.textContent = "未入力の項目があるよ…";
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("login error:", error);
      loginError.textContent = "ログインに失敗しちゃった…";
      return;
    }

    await refreshCurrentUser();
    await loadTweets();
    closeAccountModal();
  });

  // 新規登録
  registerSubmitBtn.addEventListener("click", async () => {
    registerError.textContent = "";

    const name = regNameInput.value.trim();
    const handle = regHandleInput.value.trim();
    const email = regEmailInput.value.trim();
    const avatar = (regAvatarInput.value || "🧑‍💻").trim();
    const password = regPasswordInput.value;

    if (!name || !handle || !email || !password) {
      registerError.textContent = "未入力の項目があるよ…";
      return;
    }

    // 1️⃣ サインアップ
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.error("signUp error:", signUpError);
      registerError.textContent = "サインアップに失敗しちゃった…";
      return;
    }

    try {
      // 2️⃣ プロフィール upsert
      await upsertProfile({
        display_name: name,
        handle,
        avatar_emoji: avatar,
      });

      await refreshCurrentUser();
      await loadTweets();
      closeAccountModal();
    } catch (e) {
      console.error("register upsertProfile error:", e);
      registerError.textContent = "プロフィール保存でエラー出た…";
    }
  });
}

// ==============================
// 初期化
// ==============================
async function init() {
  initTheme();
  showPage("home");
  setupEvents();

  await refreshCurrentUser();
  await loadTweets();
}

init();
