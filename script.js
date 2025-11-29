// ===============================
// Supabase 初期化
// ===============================
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co"; // ←自分のURL
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6"; // ←自分のAnon key

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// DOM 要素取得
// ===============================

// テーマ
const themeToggleBtn = document.getElementById("themeToggle");

// ナビ
const navItems = document.querySelectorAll(".nav-item");
const homePage = document.getElementById("homePage");
const messagesPage = document.getElementById("messagesPage");
const profilePage = document.getElementById("profilePage");

// 投稿関係（メイン・モーダル兼用）
const tweetInput = document.getElementById("tweetInput");
const tweetInputModal = document.getElementById("tweetInputModal");
const charCounter = document.getElementById("charCounter");
const charCounterModal = document.getElementById("charCounterModal");
const postTweetBtn = document.getElementById("postTweetBtn");
const postTweetBtnModal = document.getElementById("postTweetBtnModal");

const imageInput = document.getElementById("imageInput");
const imageInputModal = document.getElementById("imageInputModal");
const imageSelectBtn = document.getElementById("imageSelectBtn");
const imageSelectBtnModal = document.getElementById("imageSelectBtnModal");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewModal = document.getElementById("imagePreviewModal");

const tweetsContainer = document.getElementById("tweetsContainer");
const profileTweetsContainer = document.getElementById("profileTweetsContainer");

// 投稿モーダル
const tweetModal = document.getElementById("tweetModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalBackdrop = tweetModal?.querySelector(".modal-backdrop");

// アカウント表示（左下）
const currentUserAvatar = document.getElementById("currentUserAvatar");
const currentUserName = document.getElementById("currentUserName");
const currentUserHandle = document.getElementById("currentUserHandle");
const switchAccountBtn = document.getElementById("switchAccountBtn");

// アカウントモーダル
const accountModal = document.getElementById("accountModal");
const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");
const accountTabs = document.querySelectorAll(".account-tab");
const accountLoginView = document.getElementById("accountLoginView");
const accountRegisterView = document.getElementById("accountRegisterView");

// ログインフォーム
const loginEmailInput = document.getElementById("loginHandleInput"); // メール
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginError = document.getElementById("loginError");

// 新規登録フォーム
const regNameInput = document.getElementById("regNameInput");
const regHandleInput = document.getElementById("regHandleInput");
const regEmailInput = document.getElementById("regEmailInput");
const regAvatarInput = document.getElementById("regAvatarInput");
const regPasswordInput = document.getElementById("regPasswordInput");
const registerSubmitBtn = document.getElementById("registerSubmitBtn");
const registerError = document.getElementById("registerError");

// プロフィールページの表示
const profileNameEl = document.getElementById("profileName");
const profileHandleEl = document.getElementById("profileHandle");
const profileBioEl = document.querySelector(".profile-bio");

// ===============================
// 状態
// ===============================
let currentUser = null; // Supabase の user オブジェクト
let tweets = []; // とりあえずフロント側の配列に保持

// ===============================
// テーマ切り替え
// ===============================
function initTheme() {
  const saved = localStorage.getItem("steplink-theme");
  if (saved === "light" || saved === "dark") {
    document.body.setAttribute("data-theme", saved);
  }
}

function toggleTheme() {
  const now = document.body.getAttribute("data-theme") || "dark";
  const next = now === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem("steplink-theme", next);
}

// ===============================
// ページ切り替え
// ===============================
function switchPage(page) {
  [homePage, messagesPage, profilePage].forEach((p) => {
    if (!p) return;
    p.classList.add("hidden");
  });

  if (page === "home") homePage?.classList.remove("hidden");
  if (page === "messages") messagesPage?.classList.remove("hidden");
  if (page === "profile") profilePage?.classList.remove("hidden");

  navItems.forEach((item) => {
    if (item.dataset.page === page) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

// ===============================
// モーダル開閉
// ===============================
function openTweetModal() {
  tweetModal?.classList.remove("hidden");
}

function closeTweetModal() {
  tweetModal?.classList.add("hidden");
}

function openAccountModal() {
  accountModal?.classList.remove("hidden");
}

function closeAccountModal() {
  accountModal?.classList.add("hidden");
}

// ===============================
// 文字数カウント
// ===============================
function updateCharCounter(src, counterEl) {
  if (!src || !counterEl) return;
  const len = src.value.length;
  counterEl.textContent = `${len} / 140`;
}

// ===============================
// 画像プレビュー
// ===============================
function handleImageSelect(fileInput, previewEl) {
  if (!fileInput || !previewEl || !fileInput.files || fileInput.files.length === 0) {
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    previewEl.innerHTML = "";
    const img = document.createElement("img");
    img.src = e.target.result;
    previewEl.appendChild(img);
  };
  reader.readAsDataURL(file);
}

// ===============================
// ツイート描画（簡易）
// ===============================
function renderTweets() {
  if (!tweetsContainer || !profileTweetsContainer) return;

  tweetsContainer.innerHTML = "";
  profileTweetsContainer.innerHTML = "";

  tweets.forEach((t) => {
    const el = document.createElement("article");
    el.className = "post";

    el.innerHTML = `
      <div class="post-avatar">${t.avatar || "🧑‍💻"}</div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name">${t.name || "ユーザー"}</span>
          <span class="post-handle">@${t.handle || "user"}</span>
          <span class="post-time">${t.time}</span>
        </div>
        <div class="post-text"></div>
      </div>
    `;

    el.querySelector(".post-text").textContent = t.text;

    tweetsContainer.appendChild(el);

    if (currentUser && t.userId === currentUser.id) {
      profileTweetsContainer.appendChild(el.cloneNode(true));
    }
  });
}

function addTweetFromInput(source) {
  const text =
    source === "modal" ? tweetInputModal?.value.trim() : tweetInput?.value.trim();
  if (!text) return;
  if (text.length > 140) {
    alert("140文字までだよ🥺");
    return;
  }

  const baseName = currentUser ? currentUser.user_metadata?.name || "StepLinkユーザー" : "ゲスト";
  const baseHandle = currentUser
    ? currentUser.user_metadata?.handle || "user"
    : "guest";
  const baseAvatar = currentUser
    ? currentUser.user_metadata?.avatar || "🧑‍💻"
    : "🧑‍💻";

  const tweet = {
    id: Date.now(),
    userId: currentUser ? currentUser.id : null,
    name: baseName,
    handle: baseHandle,
    avatar: baseAvatar,
    text,
    time: "今",
  };

  tweets.unshift(tweet);
  renderTweets();

  if (source === "modal" && tweetInputModal) {
    tweetInputModal.value = "";
    updateCharCounter(tweetInputModal, charCounterModal);
    imagePreviewModal.innerHTML = "";
    closeTweetModal();
  } else if (tweetInput) {
    tweetInput.value = "";
    updateCharCounter(tweetInput, charCounter);
    imagePreview.innerHTML = "";
  }
}

// ===============================
// Auth 状態反映
// ===============================
function applyUserToUI(user, profile) {
  currentUser = user;

  const name = profile?.name || user?.user_metadata?.name || "StepLinkユーザー";
  const handle = profile?.handle || user?.user_metadata?.handle || "user";
  const avatar = profile?.avatar || user?.user_metadata?.avatar || "🧑‍💻";

  if (currentUserName) currentUserName.textContent = name;
  if (currentUserHandle) currentUserHandle.textContent = `@${handle}`;
  if (currentUserAvatar) currentUserAvatar.textContent = avatar;

  if (profileNameEl) profileNameEl.textContent = name;
  if (profileHandleEl) profileHandleEl.textContent = `@${handle}`;
  if (profileBioEl) profileBioEl.textContent = profile?.bio || "プロフィールはまだ書かれていません";
}

function resetUserUI() {
  currentUser = null;
  if (currentUserName) currentUserName.textContent = "未ログイン";
  if (currentUserHandle) currentUserHandle.textContent = "";
  if (currentUserAvatar) currentUserAvatar.textContent = "🧑‍💻";

  if (profileNameEl) profileNameEl.textContent = "StepLinkユーザー";
  if (profileHandleEl) profileHandleEl.textContent = "@user";
  if (profileBioEl) profileBioEl.textContent = "プロフィール準備中";
}

// ===============================
// プロフィール取得
// ===============================
async function fetchProfileAndApply(user) {
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("name, handle, avatar, bio")
    .eq("id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("プロフィール取得エラー:", error);
  }

  applyUserToUI(user, data || null);
}

// ===============================
// Auth 初期化
// ===============================
async function initAuth() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("getUser error:", error);
    resetUserUI();
  } else if (data.user) {
    await fetchProfileAndApply(data.user);
  } else {
    resetUserUI();
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth state change:", event, session);
    if (session && session.user) {
      await fetchProfileAndApply(session.user);
    } else {
      resetUserUI();
    }
  });
}

// ===============================
// ログイン
// ===============================
async function handleLogin() {
  loginError.textContent = "";

  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  if (!email || !password) {
    loginError.textContent = "メールとパスワードを入力してね。";
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  console.log("login result:", data, error);

  if (error) {
    loginError.textContent = error.message || "ログインに失敗しました。";
    return;
  }

  await fetchProfileAndApply(data.user);
  closeAccountModal();
}

// ===============================
// 新規登録 + プロフィール保存
// ===============================
async function handleRegister() {
  registerError.textContent = "";

  const name = regNameInput.value.trim();
  const handle = regHandleInput.value.trim();
  const email = regEmailInput.value.trim();
  const avatar = regAvatarInput.value.trim() || "🧑‍💻";
  const password = regPasswordInput.value;

  if (!name || !handle || !email || !password) {
    registerError.textContent = "必須項目が空だよ。";
    return;
  }

  // サインアップ
  const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp(
    {
      email,
      password,
      options: {
        data: {
          name,
          handle,
          avatar,
        },
      },
    }
  );

  console.log("signUp result:", signUpData, signUpError);

  if (signUpError) {
    registerError.textContent = signUpError.message || "サインアップに失敗しました。";
    return;
  }

  const user = signUpData.user;
  if (!user) {
    registerError.textContent = "ユーザー情報が取得できませんでした。";
    return;
  }

  // プロフィール upsert
  const { error: profileError } = await supabaseClient
    .from("profiles")
    .upsert(
      {
        id: user.id,
        name,
        handle,
        avatar,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  console.log("profile upsert result:", profileError);

  if (profileError) {
    registerError.textContent =
      "アカウントは作成されたけど、プロフィール保存でエラーが出たよ。コンソールを見てね。";
    console.error("プロフィール保存エラー:", profileError);
    return;
  }

  await fetchProfileAndApply(user);
  closeAccountModal();
}

// ===============================
// ログアウト
// ===============================
async function handleLogout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error("signOut error:", error);
    alert("ログアウトでエラーが出たよ。");
    return;
  }
  resetUserUI();
}

// ===============================
// アカウントタブ切替
// ===============================
function switchAccountTab(mode) {
  accountTabs.forEach((tab) => {
    if (tab.dataset.mode === mode) tab.classList.add("active");
    else tab.classList.remove("active");
  });

  if (mode === "login") {
    accountLoginView.classList.remove("hidden");
    accountRegisterView.classList.add("hidden");
  } else {
    accountLoginView.classList.add("hidden");
    accountRegisterView.classList.remove("hidden");
  }
}

// ===============================
// イベント登録
// ===============================
function setupEvents() {
  // テーマ
  if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

  // ナビ
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchPage(item.dataset.page);
    });
  });

  // 投稿モーダル
  if (openModalBtn) openModalBtn.addEventListener("click", openTweetModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeTweetModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeTweetModal);

  // 文字数
  if (tweetInput)
    tweetInput.addEventListener("input", () =>
      updateCharCounter(tweetInput, charCounter)
    );
  if (tweetInputModal)
    tweetInputModal.addEventListener("input", () =>
      updateCharCounter(tweetInputModal, charCounterModal)
    );

  // 画像
  if (imageSelectBtn)
    imageSelectBtn.addEventListener("click", () => imageInput.click());
  if (imageSelectBtnModal)
    imageSelectBtnModal.addEventListener("click", () => imageInputModal.click());

  if (imageInput)
    imageInput.addEventListener("change", () =>
      handleImageSelect(imageInput, imagePreview)
    );
  if (imageInputModal)
    imageInputModal.addEventListener("change", () =>
      handleImageSelect(imageInputModal, imagePreviewModal)
    );

  // 投稿
  if (postTweetBtn)
    postTweetBtn.addEventListener("click", () => addTweetFromInput("main"));
  if (postTweetBtnModal)
    postTweetBtnModal.addEventListener("click", () => addTweetFromInput("modal"));

  // アカウントモーダル
  if (switchAccountBtn)
    switchAccountBtn.addEventListener("click", openAccountModal);
  if (closeAccountModalBtn)
    closeAccountModalBtn.addEventListener("click", closeAccountModal);
  const accountBackdrop = accountModal?.querySelector(".modal-backdrop");
  if (accountBackdrop)
    accountBackdrop.addEventListener("click", closeAccountModal);

  // アカウントタブ
  accountTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.mode;
      switchAccountTab(mode);
    });
  });

  // ログイン / 新規登録 / ログアウト
  if (loginSubmitBtn) loginSubmitBtn.addEventListener("click", handleLogin);
  if (registerSubmitBtn)
    registerSubmitBtn.addEventListener("click", handleRegister);

  // ログアウトボタンを別に作ったらここで addEventListener する想定
}

// ===============================
// 初期化
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  switchPage("home");
  setupEvents();
  initAuth();
  updateCharCounter(tweetInput, charCounter);
  updateCharCounter(tweetInputModal, charCounterModal);
});
