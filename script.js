// ==============================
// Supabase 初期化
// ==============================

// ★自分の Supabase プロジェクトの値に合わせてね
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  // ------------------------------
  // 共通状態
  // ------------------------------
  let currentUser = null;
  let currentProfile = null;
  let replyTargetId = null; // 返信先ツイートの id

  // ------------------------------
  // よく使う DOM を取る
  // ------------------------------
  const tweetsContainer = document.getElementById("tweetsContainer");
  const profileTweetsContainer = document.getElementById(
    "profileTweetsContainer"
  );
  const themeToggleBtn = document.getElementById("themeToggle");

  // ==============================
  // 🌙 テーマ切り替え（おまけ）
  // ==============================
  (function setupTheme() {
    const savedTheme = localStorage.getItem("steplink-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      document.body.setAttribute("data-theme", savedTheme);
    }
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
        const now = document.body.getAttribute("data-theme") || "light";
        const next = now === "dark" ? "light" : "dark";
        document.body.setAttribute("data-theme", next);
        localStorage.setItem("steplink-theme", next);
      });
    }
  })();

  // ==============================
  // 👤 認証状態＆プロフィール読み込み
  // ==============================
  async function loadAuthState() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
      console.error("getUser error:", error);
      applyUserUI(null, null);
      return;
    }
    if (!data.user) {
      applyUserUI(null, null);
      return;
    }

    currentUser = data.user;

    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("name, handle, avatar, bio")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("プロフィール取得エラー:", profileError);
    }

    currentProfile = profileData || null;
    applyUserUI(currentUser, currentProfile);
  }

  function applyUserUI(user, profile) {
    const nameEl = document.getElementById("currentUserName");
    const handleEl = document.getElementById("currentUserHandle");
    const avatarEl = document.getElementById("currentUserAvatar");

    const profileNameEl = document.getElementById("profileName");
    const profileHandleEl = document.getElementById("profileHandle");
    const profileBioEl = document.querySelector(".profile-bio");
    const profileAvatarEl = document.getElementById("profileAvatar");

    if (!user) {
      if (nameEl) nameEl.textContent = "未ログイン";
      if (handleEl) handleEl.textContent = "";
      if (avatarEl) avatarEl.textContent = "🧑‍💻";

      if (profileNameEl) profileNameEl.textContent = "StepLinkユーザー";
      if (profileHandleEl) profileHandleEl.textContent = "@user";
      if (profileBioEl) profileBioEl.textContent = "プロフィール準備中";
      if (profileAvatarEl) profileAvatarEl.textContent = "🧑‍💻";
      return;
    }

    const name =
      profile?.name || user.user_metadata?.name || "StepLinkユーザー";
    const handle = profile?.handle || user.user_metadata?.handle || "user";
    const avatar = profile?.avatar || user.user_metadata?.avatar || "🧑‍💻";
    const bio = profile?.bio || "プロフィールはまだ書かれていません";

    if (nameEl) nameEl.textContent = name;
    if (handleEl) handleEl.textContent = "@" + handle;
    if (avatarEl) avatarEl.textContent = avatar;

    if (profileNameEl) profileNameEl.textContent = name;
    if (profileHandleEl) profileHandleEl.textContent = "@" + handle;
    if (profileBioEl) profileBioEl.textContent = bio;
    if (profileAvatarEl) profileAvatarEl.textContent = avatar;
  }

  await loadAuthState();

  // ==============================
  // 🕒 日付フォーマット
  // ==============================
  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  }

  // ==============================
  // 🐦 tweets 読み込み（返信対応）
  // ==============================
  async function fetchAllTweets() {
    const { data, error } = await supabaseClient
      .from("tweets")
      .select("*")
      .order("created_at", { ascending: true }); // 古い順に取得

    if (error) {
      console.error("tweets load error:", error);
      return [];
    }
    return data || [];
  }

  function renderTweet(row, replies, container) {
    const article = document.createElement("article");
    article.className = "post";
    article.dataset.tweetId = row.id;

    article.innerHTML = `
      <div class="post-avatar">${row.avatar}</div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name">${row.name}</span>
          <span class="post-handle">@${row.handle}</span>
          <span class="post-time">${formatTime(row.created_at)}</span>
        </div>

        <div class="post-text"></div>

        <button class="reply-btn" data-tweet-id="${row.id}">返信</button>

        <div class="replies"></div>
      </div>
    `;

    article.querySelector(".post-text").textContent = row.content;

    const repliesContainer = article.querySelector(".replies");
    replies.forEach((rep) => {
      const repEl = document.createElement("div");
      repEl.className = "reply-item";
      repEl.innerHTML = `
        <span class="reply-avatar">${rep.avatar}</span>
        <div class="reply-body-wrap">
          <div class="reply-header">
            <span class="post-name">${rep.name}</span>
            <span class="post-handle">@${rep.handle}</span>
            <span class="post-time">${formatTime(rep.created_at)}</span>
          </div>
          <div class="reply-body-text">${rep.content}</div>
        </div>
      `;
      repliesContainer.appendChild(repEl);
    });

    container.appendChild(article);
  }

  async function loadHomeTimeline() {
    if (!tweetsContainer) return;

    const rows = await fetchAllTweets();
    const parents = rows.filter((t) => !t.parent_id);
    const replies = rows.filter((t) => t.parent_id);

    const repliesMap = new Map();
    replies.forEach((rep) => {
      if (!repliesMap.has(rep.parent_id)) repliesMap.set(rep.parent_id, []);
      repliesMap.get(rep.parent_id).push(rep);
    });

    tweetsContainer.innerHTML = "";
    parents
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // 親ツイートは新しい順
      .forEach((parent) => {
        const reps = repliesMap.get(parent.id) || [];
        renderTweet(parent, reps, tweetsContainer);
      });
  }

  async function loadProfileTimeline() {
    if (!profileTweetsContainer || !currentUser) return;

    const rows = await fetchAllTweets();
    const parents = rows.filter(
      (t) => !t.parent_id && t.user_id === currentUser.id
    );
    const replies = rows.filter((t) => t.parent_id);

    const repliesMap = new Map();
    replies.forEach((rep) => {
      if (!repliesMap.has(rep.parent_id)) repliesMap.set(rep.parent_id, []);
      repliesMap.get(rep.parent_id).push(rep);
    });

    profileTweetsContainer.innerHTML = "";
    parents
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .forEach((parent) => {
        const reps = repliesMap.get(parent.id) || [];
        renderTweet(parent, reps, profileTweetsContainer);
      });
  }

  async function reloadTimelines() {
    await loadHomeTimeline();
    await loadProfileTimeline();
  }

  await reloadTimelines();

  // ==============================
  // ✏️ 文字数カウンター
  // ==============================
  function updateCounter(input, counter) {
    if (!input || !counter) return;
    counter.textContent = `${input.value.length} / 140`;
  }

  const tweetInput = document.getElementById("tweetInput");
  const charCounter = document.getElementById("charCounter");
  const tweetInputModal = document.getElementById("tweetInputModal");
  const charCounterModal = document.getElementById("charCounterModal");

  if (tweetInput && charCounter) {
    updateCounter(tweetInput, charCounter);
    tweetInput.addEventListener("input", () =>
      updateCounter(tweetInput, charCounter)
    );
  }
  if (tweetInputModal && charCounterModal) {
    updateCounter(tweetInputModal, charCounterModal);
    tweetInputModal.addEventListener("input", () =>
      updateCounter(tweetInputModal, charCounterModal)
    );
  }

  // ==============================
  // 🖼 画像プレビュー（ローカルのみ）
  // ==============================
  function setupImagePicker(selectBtn, fileInput, preview) {
    if (!selectBtn || !fileInput || !preview) return;
    selectBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = "";
        const img = document.createElement("img");
        img.src = e.target.result;
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  setupImagePicker(
    document.getElementById("imageSelectBtn"),
    document.getElementById("imageInput"),
    document.getElementById("imagePreview")
  );
  setupImagePicker(
    document.getElementById("imageSelectBtnModal"),
    document.getElementById("imageInputModal"),
    document.getElementById("imagePreviewModal")
  );

  // ==============================
  // 🐦 ツイート作成（通常＋返信共通）
  // ==============================
  async function createTweet(text, parentId = null) {
    if (!currentUser) {
      alert("ログインしてから投稿してね🥺");
      return;
    }

    const name =
      currentProfile?.name || currentUser.user_metadata?.name || "StepLinkユーザー";
    const handle =
      currentProfile?.handle || currentUser.user_metadata?.handle || "user";
    const avatar =
      currentProfile?.avatar || currentUser.user_metadata?.avatar || "🧑‍💻";

    const { error } = await supabaseClient.from("tweets").insert({
      user_id: currentUser.id,
      name,
      handle,
      avatar,
      content: text,
      parent_id: parentId,
    });

    if (error) {
      console.error("tweet insert error:", error);
      alert("投稿に失敗しちゃった…😭 コンソール見て！");
      return;
    }

    await reloadTimelines();
  }

  async function handlePostFrom(input, counter, preview) {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    if (text.length > 140) {
      alert("140文字までだよ🥺");
      return;
    }

    await createTweet(text, null);
    input.value = "";
    if (counter) updateCounter(input, counter);
    if (preview) preview.innerHTML = "";
  }

  const postTweetBtn = document.getElementById("postTweetBtn");
  const imagePreview = document.getElementById("imagePreview");
  if (postTweetBtn && tweetInput) {
    postTweetBtn.addEventListener("click", () =>
      handlePostFrom(tweetInput, charCounter, imagePreview)
    );
  }

  const postTweetBtnModal = document.getElementById("postTweetBtnModal");
  const imagePreviewModal = document.getElementById("imagePreviewModal");
  if (postTweetBtnModal && tweetInputModal) {
    postTweetBtnModal.addEventListener("click", () =>
      handlePostFrom(tweetInputModal, charCounterModal, imagePreviewModal)
    );
  }

  // ==============================
  // 📝 投稿モーダル開閉
  // ==============================
  const tweetModal = document.getElementById("tweetModal");
  const openModalBtn = document.getElementById("openModalBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const tweetModalBackdrop = tweetModal?.querySelector(".modal-backdrop");

  function openTweetModal() {
    if (tweetModal) tweetModal.classList.remove("hidden");
  }
  function closeTweetModal() {
    if (tweetModal) tweetModal.classList.add("hidden");
  }

  if (openModalBtn && tweetModal) {
    openModalBtn.addEventListener("click", openTweetModal);
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeTweetModal);
  }
  if (tweetModalBackdrop) {
    tweetModalBackdrop.addEventListener("click", closeTweetModal);
  }

  // ==============================
  // 💬 返信モーダル
  // ==============================
  const replyModal = document.getElementById("replyModal");
  const closeReplyModalBtn = document.getElementById("closeReplyModal");
  const replyInput = document.getElementById("replyInput");
  const sendReplyBtn = document.getElementById("sendReplyBtn");
  const replyBackdrop = replyModal?.querySelector(".modal-backdrop");

  function openReplyModal(tweetId) {
    replyTargetId = tweetId;
    if (replyInput) replyInput.value = "";
    if (replyModal) replyModal.classList.remove("hidden");
  }

  function closeReplyModal() {
    if (replyModal) replyModal.classList.add("hidden");
    replyTargetId = null;
  }

  if (closeReplyModalBtn) {
    closeReplyModalBtn.addEventListener("click", closeReplyModal);
  }
  if (replyBackdrop) {
    replyBackdrop.addEventListener("click", closeReplyModal);
  }

  if (sendReplyBtn && replyInput) {
    sendReplyBtn.addEventListener("click", async () => {
      if (!replyTargetId) return;
      const text = replyInput.value.trim();
      if (!text) return;
      if (text.length > 140) {
        alert("140文字までだよ🥺");
        return;
      }
      await createTweet(text, replyTargetId);
      closeReplyModal();
    });
  }

  // 各ツイート内の「返信」ボタン（イベント委譲）
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.classList.contains("reply-btn")) {
      const id = target.dataset.tweetId;
      if (id) openReplyModal(id);
    }
  });

  // ==============================
  // 👥 アカウントモーダル
  // ==============================
  const accountModal = document.getElementById("accountModal");
  const switchAccountBtn = document.getElementById("switchAccountBtn");
  const bottomAccountBtn = document.getElementById("bottomAccountBtn");
  const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");
  const accountBackdrop = accountModal?.querySelector(".modal-backdrop");

  function openAccountModal() {
    if (accountModal) accountModal.classList.remove("hidden");
  }
  function closeAccountModal() {
    if (accountModal) accountModal.classList.add("hidden");
  }

  if (switchAccountBtn) {
    switchAccountBtn.addEventListener("click", openAccountModal);
  }
  if (bottomAccountBtn) {
    bottomAccountBtn.addEventListener("click", openAccountModal);
  }
  if (closeAccountModalBtn) {
    closeAccountModalBtn.addEventListener("click", closeAccountModal);
  }
  if (accountBackdrop) {
    accountBackdrop.addEventListener("click", closeAccountModal);
  }

  // アカウントタブ切り替え
  const accountTabs = document.querySelectorAll(".account-tab");
  const accountLoginView = document.getElementById("accountLoginView");
  const accountRegisterView = document.getElementById("accountRegisterView");

  function switchAccountTab(mode) {
    accountTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.mode === mode);
    });

    if (!accountLoginView || !accountRegisterView) return;

    if (mode === "login") {
      accountLoginView.classList.remove("hidden");
      accountRegisterView.classList.add("hidden");
    } else {
      accountLoginView.classList.add("hidden");
      accountRegisterView.classList.remove("hidden");
    }
  }

  accountTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchAccountTab(tab.dataset.mode));
  });

  // ==============================
  // 🆕 新規登録
  // ==============================
  const regNameInput = document.getElementById("regNameInput");
  const regHandleInput = document.getElementById("regHandleInput");
  const regEmailInput = document.getElementById("regEmailInput");
  const regAvatarInput = document.getElementById("regAvatarInput");
  const regPasswordInput = document.getElementById("regPasswordInput");
  const registerError = document.getElementById("registerError");
  const registerSubmitBtn = document.getElementById("registerSubmitBtn");

  async function handleRegister() {
    if (!regNameInput || !regHandleInput || !regEmailInput || !regPasswordInput)
      return;

    const name = regNameInput.value.trim();
    const handle = regHandleInput.value.trim();
    const email = regEmailInput.value.trim();
    const avatar = (regAvatarInput?.value.trim() || "🧑‍💻").trim();
    const password = regPasswordInput.value;

    if (!name || !handle || !email || !password) {
      if (registerError) registerError.textContent = "必須項目が空だよ🥺";
      return;
    }

    if (registerError) registerError.textContent = "";

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { name, handle, avatar },
      },
    });

    if (error) {
      console.error("signUp error:", error);
      if (registerError) {
        if (error.message.includes("User already registered")) {
          registerError.textContent = "このメールは登録済みだよ。ログインしてね。";
          switchAccountTab("login");
        } else {
          registerError.textContent = error.message;
        }
      }
      return;
    }

    const user = data.user;
    if (user) {
      const { error: profileErr } = await supabaseClient
        .from("profiles")
        .upsert({
          id: user.id,
          name,
          handle,
          avatar,
        });

      if (profileErr) {
        console.error("profiles upsert error:", profileErr);
      }
    }

    alert("アカウント作成できたよ💚 ログインしてね！");
    switchAccountTab("login");
  }

  if (registerSubmitBtn) {
    registerSubmitBtn.addEventListener("click", handleRegister);
  }

  // ==============================
  // 🔐 ログイン
  // ==============================
  const loginHandleInput = document.getElementById("loginHandleInput");
  const loginPasswordInput = document.getElementById("loginPasswordInput");
  const loginError = document.getElementById("loginError");
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");

  async function handleLogin() {
    if (!loginHandleInput || !loginPasswordInput) return;

    const email = loginHandleInput.value.trim();
    const password = loginPasswordInput.value;

    if (!email || !password) {
      if (loginError) loginError.textContent = "メールとパスワードを入れてね🥺";
      return;
    }

    if (loginError) loginError.textContent = "";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("signIn error:", error);
      if (loginError) loginError.textContent = error.message;
      return;
    }

    location.reload();
  }

  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener("click", handleLogin);
  }

  // ==============================
  // 🚪 ログアウト
  // ==============================
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      location.reload();
    });
  }
});
