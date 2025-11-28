// ==============================
// Supabase 初期化
// ==============================

const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("StepLink script loaded. URL =", SUPABASE_URL);

// ==============================
// DOM取得
// ==============================

// 投稿まわり
const tweetInput = document.getElementById("tweetInput");
const postTweetBtn = document.getElementById("postTweetBtn");
const charCounter = document.getElementById("charCounter");
const imageInput = document.getElementById("imageInput");
const imageSelectBtn = document.getElementById("imageSelectBtn");
const imagePreview = document.getElementById("imagePreview");

// モーダル側
const tweetModal = document.getElementById("tweetModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const tweetInputModal = document.getElementById("tweetInputModal");
const postTweetBtnModal = document.getElementById("postTweetBtnModal");
const charCounterModal = document.getElementById("charCounterModal");
const imageInputModal = document.getElementById("imageInputModal");
const imageSelectBtnModal = document.getElementById("imageSelectBtnModal");
const imagePreviewModal = document.getElementById("imagePreviewModal");

// 投稿一覧
const tweetsContainer = document.getElementById("tweetsContainer");
const profileTweetsContainer = document.getElementById("profileTweetsContainer");

// ページ切り替え
const navItems = document.querySelectorAll(".nav-item");
const homePage = document.getElementById("homePage");
const messagesPage = document.getElementById("messagesPage");
const profilePage = document.getElementById("profilePage");

// テーマ
const themeToggle = document.getElementById("themeToggle");

// アカウント表示
const currentUserNameEl = document.getElementById("currentUserName");
const currentUserHandleEl = document.getElementById("currentUserHandle");
const currentUserAvatarEl = document.getElementById("currentUserAvatar");
const switchAccountBtn = document.getElementById("switchAccountBtn");

// プロフィール表示
const profileNameEl = document.getElementById("profileName");
const profileHandleEl = document.getElementById("profileHandle");

// アカウントモーダル
const accountModal = document.getElementById("accountModal");
const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");
const accountTabs = document.querySelectorAll(".account-tab");
const loginView = document.getElementById("accountLoginView");
const registerView = document.getElementById("accountRegisterView");

const loginHandleInput = document.getElementById("loginHandleInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginErrorEl = document.getElementById("loginError");

const regNameInput = document.getElementById("regNameInput");
const regHandleInput = document.getElementById("regHandleInput");
const regEmailInput = document.getElementById("regEmailInput");
const regAvatarInput = document.getElementById("regAvatarInput");
const regPasswordInput = document.getElementById("regPasswordInput");
const registerSubmitBtn = document.getElementById("registerSubmitBtn");
const registerErrorEl = document.getElementById("registerError");

// ==============================
// 定数
// ==============================

const MAX_LENGTH = 140;
const THEME_KEY = "steplinkTheme";

// ==============================
// テーマ
// ==============================

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (!saved) return;
  document.body.setAttribute("data-theme", saved);
  if (themeToggle) {
    themeToggle.textContent = saved === "light" ? "☀️" : "🌙";
  }
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", next);
  if (themeToggle) {
    themeToggle.textContent = next === "light" ? "☀️" : "🌙";
  }
  localStorage.setItem(THEME_KEY, next);
}

if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

// ==============================
// 認証 & プロフィール
// ==============================

async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

async function fetchProfile(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.warn("fetchProfile error:", error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn("fetchProfile exception:", e);
    return null;
  }
}

async function upsertProfile(user) {
  const name = regNameInput.value.trim() || "StepLinkユーザー";
  const handle = regHandleInput.value.trim();
  const avatar = (regAvatarInput.value.trim() || "🧑‍💻").slice(0, 4);

  if (!handle) {
    throw new Error("handle required");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    name,
    handle,
    avatar,
    bio: ""
  });

  if (error) {
    console.error("upsertProfile error:", error);
    throw error;
  }
}

async function updateCurrentUserUI() {
  const user = await getCurrentUser();
  if (!user) {
    if (currentUserNameEl) currentUserNameEl.textContent = "未ログイン";
    if (currentUserHandleEl) currentUserHandleEl.textContent = "";
    if (currentUserAvatarEl) currentUserAvatarEl.textContent = "❔";
    if (profileNameEl) profileNameEl.textContent = "StepLinkユーザー";
    if (profileHandleEl) profileHandleEl.textContent = "@user";
    return;
  }

  const profile = await fetchProfile(user.id);

  const name = profile?.name || user.email || "StepLinkユーザー";
  const handle =
  profile?.handle ||
  (user.email ? user.email.split("@")[0] : "user");

  const avatar = profile?.avatar || "🧑‍💻";

  if (currentUserNameEl) currentUserNameEl.textContent = name;
  if (currentUserHandleEl) currentUserHandleEl.textContent = "@" + handle;
  if (currentUserAvatarEl) currentUserAvatarEl.textContent = avatar;

  if (profileNameEl) profileNameEl.textContent = name;
  if (profileHandleEl) profileHandleEl.textContent = "@" + handle;
}

// アカウントモーダル開閉
function openAccountModal() {
  if (!accountModal) return;
  accountModal.classList.remove("hidden");
}

function closeAccountModal() {
  if (!accountModal) return;
  accountModal.classList.add("hidden");
  if (loginErrorEl) loginErrorEl.textContent = "";
  if (registerErrorEl) registerErrorEl.textContent = "";
}

if (switchAccountBtn) {
  switchAccountBtn.addEventListener("click", openAccountModal);
}
if (closeAccountModalBtn) {
  closeAccountModalBtn.addEventListener("click", closeAccountModal);
}
if (accountModal) {
  accountModal.addEventListener("click", (e) => {
    if (e.target === accountModal || e.target.classList.contains("modal-backdrop")) {
      closeAccountModal();
    }
  });
}

// アカウントタブ切り替え
accountTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    accountTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const mode = tab.dataset.mode;
    if (mode === "login") {
      loginView.classList.remove("hidden");
      registerView.classList.add("hidden");
    } else {
      loginView.classList.add("hidden");
      registerView.classList.remove("hidden");
    }
  });
});

// 新規登録
if (registerSubmitBtn) {
  registerSubmitBtn.addEventListener("click", async () => {
    const name = regNameInput.value.trim();
    const handle = regHandleInput.value.trim();
    const email = regEmailInput.value.trim();
    const pw = regPasswordInput.value;

    if (registerErrorEl) registerErrorEl.textContent = "";

    if (!name || !handle || !email || !pw) {
      if (registerErrorEl) registerErrorEl.textContent = "全部入力してね";
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw
      });

      if (error) {
        console.error("signUp error:", error);
        if (registerErrorEl) registerErrorEl.textContent = "登録に失敗した…";
        return;
      }

      const user = data.user;
      if (!user) {
        if (registerErrorEl) registerErrorEl.textContent = "メール確認が必要かも。メール見てみてね。";
        return;
      }

      await upsertProfile(user);

      closeAccountModal();
      await updateCurrentUserUI();
      await loadAndRenderTweets();
    } catch (e) {
      console.error("registerSubmit exception:", e);
      if (registerErrorEl) registerErrorEl.textContent = "エラーが発生した…";
    }
  });
}

// ログイン
if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener("click", async () => {
    const email = loginHandleInput.value.trim();
    const pw = loginPasswordInput.value;

    if (loginErrorEl) loginErrorEl.textContent = "";

    if (!email || !pw) {
      if (loginErrorEl) loginErrorEl.textContent = "メールとパスワードを入れてね";
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pw
      });

      if (error) {
        console.error("signIn error:", error);
        if (loginErrorEl) loginErrorEl.textContent = "ログインに失敗した…";
        return;
      }

      closeAccountModal();
      await updateCurrentUserUI();
      await loadAndRenderTweets();
    } catch (e) {
      console.error("loginSubmit exception:", e);
      if (loginErrorEl) loginErrorEl.textContent = "エラーが発生した…";
    }
  });
}

// ==============================
// 投稿
// ==============================

function formatTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diffSec = (now - d) / 1000;
  if (diffSec < 60) return "今";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function setupComposer({ textarea, postButton, counter, fileInput, fileButton, preview, afterPost }) {
  if (!textarea || !postButton || !counter || !fileInput || !fileButton || !preview) return;

  textarea.addEventListener("input", () => {
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX_LENGTH}`;
    postButton.disabled = len === 0 || len > MAX_LENGTH;
  });

  fileButton.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) {
      preview.style.display = "none";
      preview.innerHTML = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.style.display = "block";
      preview.innerHTML = `<img src="${e.target.result}" alt="preview" />`;
    };
    reader.readAsDataURL(file);
  });

  postButton.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (!text || text.length > MAX_LENGTH) return;

    const user = await getCurrentUser();
    if (!user) {
      alert("投稿するにはログインしてね");
      return;
    }

    let imageSrc = null;
    const file = fileInput.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        imageSrc = e.target.result;
        await createTweet(user, text, imageSrc);
        finishPost();
      };
      reader.readAsDataURL(file);
    } else {
      await createTweet(user, text, imageSrc);
      finishPost();
    }

    function finishPost() {
      textarea.value = "";
      counter.textContent = `0 / ${MAX_LENGTH}`;
      postButton.disabled = true;
      fileInput.value = "";
      preview.style.display = "none";
      preview.innerHTML = "";
      if (afterPost) afterPost();
    }
  });

  postButton.disabled = true;
  counter.textContent = `0 / 140`;
}

async function createTweet(user, text, imageSrc) {
  try {
    const { error } = await supabase.from("tweets").insert({
      user_id: user.id,
      text,
      image_url: imageSrc
    });
    if (error) {
      console.error("createTweet error:", error);
      alert("投稿の保存に失敗した…");
      return;
    }
    await loadAndRenderTweets();
  } catch (e) {
    console.error("createTweet exception:", e);
    alert("投稿でエラーが発生した…");
  }
}

async function loadTweets() {
  try {
    const { data, error } = await supabase
      .from("tweets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadTweets error:", error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error("loadTweets exception:", e);
    return [];
  }
}

async function loadAndRenderTweets() {
  const tweets = await loadTweets();

  const renderTo = (container) => {
    if (!container) return;
    container.innerHTML = "";

    tweets.forEach((t) => {
      const el = document.createElement("article");
      el.className = "tweet";
      el.innerHTML = `
        <div class="avatar">🧑‍💻</div>
        <div class="tweet-main">
          <div class="tweet-header">
            <span class="tweet-name">StepLinkユーザー</span>
            <span class="tweet-handle">@user</span>
            <span class="tweet-time">・${formatTime(t.created_at)}</span>
          </div>
          <div class="tweet-text"></div>
          ${
            t.image_url
              ? `<div class="tweet-image"><img src="${t.image_url}" alt="image" /></div>`
              : ""
          }
        </div>
      `;
      el.querySelector(".tweet-text").textContent = t.text;
      container.appendChild(el);
    });
  };

  renderTo(tweetsContainer);
  renderTo(profileTweetsContainer);
}

// ==============================
// ページ切り替え
// ==============================

function showPage(page) {
  if (homePage) homePage.classList.add("hidden");
  if (messagesPage) messagesPage.classList.add("hidden");
  if (profilePage) profilePage.classList.add("hidden");

  if (page === "messages" && messagesPage) {
    messagesPage.classList.remove("hidden");
  } else if (page === "profile" && profilePage) {
    profilePage.classList.remove("hidden");
  } else if (homePage) {
    homePage.classList.remove("hidden");
  }
}

navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    navItems.forEach((n) => n.classList.remove("active"));
    item.classList.add("active");
    showPage(page);
  });
});

// ==============================
// 投稿モーダル
// ==============================

function openModal() {
  if (!tweetModal) return;
  tweetModal.classList.remove("hidden");
  if (tweetInputModal) tweetInputModal.focus();
}

function closeModal() {
  if (!tweetModal) return;
  tweetModal.classList.add("hidden");
}

if (openModalBtn && closeModalBtn && tweetModal) {
  openModalBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  tweetModal.addEventListener("click", (e) => {
    if (e.target === tweetModal || e.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  });
}

// ==============================
// 初期化
// ==============================

(async () => {
  loadTheme();

  // メイン投稿欄
  setupComposer({
    textarea: tweetInput,
    postButton: postTweetBtn,
    counter: charCounter,
    fileInput: imageInput,
    fileButton: imageSelectBtn,
    preview: imagePreview
  });

  // モーダル投稿欄
  setupComposer({
    textarea: tweetInputModal,
    postButton: postTweetBtnModal,
    counter: charCounterModal,
    fileInput: imageInputModal,
    fileButton: imageSelectBtnModal,
    preview: imagePreviewModal,
    afterPost: closeModal
  });

  await updateCurrentUserUI();
  await loadAndRenderTweets();
})();
