// ==============================
// Supabase 初期化
// ==============================

// ↓自分のSupabaseプロジェクトの値に置き換える
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ==============================
// DOM取得
// ==============================

// 投稿入力
const tweetInput = document.getElementById("tweetInput");
const postTweetBtn = document.getElementById("postTweetBtn");
const charCounter = document.getElementById("charCounter");
const imageInput = document.getElementById("imageInput");
const imageSelectBtn = document.getElementById("imageSelectBtn");
const imagePreview = document.getElementById("imagePreview");

// 投稿一覧
const tweetsContainer = document.getElementById("tweetsContainer");
const profileTweetsContainer = document.getElementById("profileTweetsContainer");

// ページ
const navItems = document.querySelectorAll(".nav-item");
const homePage = document.getElementById("homePage");
const profilePage = document.getElementById("profilePage");
const messagesPage = document.getElementById("messagesPage");

// テーマ
const themeToggle = document.getElementById("themeToggle");

// アカウント表示
const currentUserNameEl = document.getElementById("currentUserName");
const currentUserHandleEl = document.getElementById("currentUserHandle");
const currentUserAvatarEl = document.getElementById("currentUserAvatar");
const switchAccountBtn = document.getElementById("switchAccountBtn");

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

// 投稿モーダル
const tweetModal = document.getElementById("tweetModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const tweetInputModal = document.getElementById("tweetInputModal");
const postTweetBtnModal = document.getElementById("postTweetBtnModal");
const charCounterModal = document.getElementById("charCounterModal");
const imageInputModal = document.getElementById("imageInputModal");
const imageSelectBtnModal = document.getElementById("imageSelectBtnModal");
const imagePreviewModal = document.getElementById("imagePreviewModal");

// プロフィール表示用
const profileNameEl = document.getElementById("profileName");
const profileHandleEl = document.getElementById("profileHandle");

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
  themeToggle.textContent = saved === "light" ? "☀️" : "🌙";
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", next);
  themeToggle.textContent = next === "light" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, next);
}

themeToggle.addEventListener("click", toggleTheme);

// ==============================
// 認証 & プロフィール
// ==============================

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
    return null;
  }
  return data.user;
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error(error);
  }
  return data || null;
}

async function upsertProfile(user) {
  const name = regNameInput.value.trim() || "StepLinkユーザー";
  const handle = regHandleInput.value.trim();
  const avatar = (regAvatarInput.value.trim() || "🧑‍💻").slice(0, 4);

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    name,
    handle,
    avatar,
    bio: ""
  });

  if (error) {
    console.error(error);
    throw error;
  }
}

async function updateCurrentUserUI() {
  const user = await getCurrentUser();
  if (!user) {
    currentUserNameEl.textContent = "未ログイン";
    currentUserHandleEl.textContent = "";
    currentUserAvatarEl.textContent = "❔";
    profileNameEl.textContent = "StepLinkユーザー";
    profileHandleEl.textContent = "@user";
    return;
  }

  const profile = await fetchProfile(user.id);

  const name = profile?.name || user.email;
  const handle = profile?.handle || (user.email ? user.email.split("@")[0] : "user");
  const avatar = profile?.avatar || "🧑‍💻";

  currentUserNameEl.textContent = name;
  currentUserHandleEl.textContent = "@" + handle;
  currentUserAvatarEl.textContent = avatar;

  profileNameEl.textContent = name;
  profileHandleEl.textContent = "@" + handle;
}

// アカウントモーダル開閉
function openAccountModal() {
  accountModal.classList.remove("hidden");
}

function closeAccountModal() {
  accountModal.classList.add("hidden");
  loginErrorEl.textContent = "";
  registerErrorEl.textContent = "";
}

switchAccountBtn.addEventListener("click", openAccountModal);
closeAccountModalBtn.addEventListener("click", closeAccountModal);

accountModal.addEventListener("click", (e) => {
  if (e.target === accountModal || e.target.classList.contains("modal-backdrop")) {
    closeAccountModal();
  }
});

// タブ切り替え
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
registerSubmitBtn.addEventListener("click", async () => {
  const name = regNameInput.value.trim();
  const handle = regHandleInput.value.trim();
  const email = regEmailInput.value.trim();
  const pw = regPasswordInput.value;

  registerErrorEl.textContent = "";

  if (!name || !handle || !email || !pw) {
    registerErrorEl.textContent = "全部入力してね";
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: pw
  });

  if (error) {
    console.error(error);
    registerErrorEl.textContent = "登録に失敗した…";
    return;
  }

  const user = data.user;
  if (!user) {
    registerErrorEl.textContent = "メール確認が必要かも。メールを確認してみてね。";
    return;
  }

  try {
    await upsertProfile(user);
  } catch (e) {
    registerErrorEl.textContent = "プロフィール保存でエラー…";
    return;
  }

  closeAccountModal();
  await updateCurrentUserUI();
  await loadAndRenderTweets();
});

// ログイン（メール）
loginSubmitBtn.addEventListener("click", async () => {
  const email = loginHandleInput.value.trim();
  const pw = loginPasswordInput.value;
  loginErrorEl.textContent = "";

  if (!email || !pw) {
    loginErrorEl.textContent = "メールとパスワードを入れてね";
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: pw
  });

  if (error) {
    console.error(error);
    loginErrorEl.textContent = "ログインに失敗した…";
    return;
  }

  closeAccountModal();
  await updateCurrentUserUI();
  await loadAndRenderTweets();
});

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
        await createPost(user, text, imageSrc);
        finishPost();
      };
      reader.readAsDataURL(file);
    } else {
      await createPost(user, text, imageSrc);
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
  counter.textContent = `0 / ${MAX_LENGTH}`;
}

async function createPost(user, text, imageSrc) {
  const { error } = await supabase.from("tweets").insert({
    user_id: user.id,
    text,
    image_url: imageSrc
  });
  if (error) {
    console.error(error);
    alert("投稿の保存に失敗した…");
    return;
  }
  await loadAndRenderTweets();
}

async function loadTweets() {
  const { data, error } = await supabase
    .from("tweets")
    .select("*, profiles(name, handle, avatar)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    text: row.text,
    image_url: row.image_url,
    created_at: row.created_at,
    user: {
      name: row.profiles?.name || "StepLinkユーザー",
      handle: row.profiles?.handle || "user",
      avatar: row.profiles?.avatar || "🧑‍💻"
    }
  }));
}

async function loadAndRenderTweets() {
  const tweets = await loadTweets();

  const renderTo = (container, filterUserId = null) => {
    if (!container) return;
    container.innerHTML = "";

    let list = tweets;
    if (filterUserId) {
      list = tweets.filter((t) => t.user_id === filterUserId);
    }

    list.forEach((t) => {
      const el = document.createElement("article");
      el.className = "tweet";
      el.innerHTML = `
        <div class="avatar">${t.user.avatar}</div>
        <div class="tweet-main">
          <div class="tweet-header">
            <span class="tweet-name">${t.user.name}</span>
            <span class="tweet-handle">@${t.user.handle}</span>
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

  const user = await getCurrentUser();
  if (user && profileTweetsContainer) {
    // 自分の投稿だけにしたい場合はここでフィルタするように拡張可能
    renderTo(profileTweetsContainer);
  } else if (profileTweetsContainer) {
    renderTo(profileTweetsContainer);
  }
}

// ==============================
// ページ切り替え
// ==============================

function showPage(page) {
  if (homePage) homePage.classList.add("hidden");
  if (profilePage) profilePage.classList.add("hidden");
  if (messagesPage) messagesPage.classList.add("hidden");

  if (page === "profile" && profilePage) {
    profilePage.classList.remove("hidden");
  } else if (page === "messages" && messagesPage) {
    messagesPage.classList.remove("hidden");
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

  setupComposer({
    textarea: tweetInput,
    postButton: postTweetBtn,
    counter: charCounter,
    fileInput: imageInput,
    fileButton: imageSelectBtn,
    preview: imagePreview
  });

  if (tweetInputModal) {
    setupComposer({
      textarea: tweetInputModal,
      postButton: postTweetBtnModal,
      counter: charCounterModal,
      fileInput: imageInputModal,
      fileButton: imageSelectBtnModal,
      preview: imagePreviewModal,
      afterPost: closeModal
    });
  }

  await updateCurrentUserUI();
  await loadAndRenderTweets();
})();

