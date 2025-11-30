// ==============================
// Supabase 初期化
// ==============================
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  // ログイン中ユーザー
  let currentUser = null;
  let currentProfile = null;

  // 共通で使うDOM
  const tweetsContainer = document.getElementById("tweetsContainer"); // ホーム用
  const profileTweetsContainer = document.getElementById(
    "profileTweetsContainer"
  ); // プロフ用

  // サイドバー＆プロフィール表示パーツ
  const sidebarNameEl = document.getElementById("currentUserName");
  const sidebarHandleEl = document.getElementById("currentUserHandle");
  const sidebarAvatarEl = document.getElementById("currentUserAvatar");

  const profileNameEl = document.getElementById("profileName");
  const profileHandleEl = document.getElementById("profileHandle");
  const profileAvatarEl = document.getElementById("profileAvatar");
  const profileBioEl = document.querySelector(".profile-bio");

  const composerAvatarHome = document.getElementById("composerAvatar");
  const composerAvatarModal = document.getElementById("composerAvatarModal");

  // ログアウトボタン
  const logoutBtn = document.getElementById("logoutBtn");

  // ==============================
  // テーマ切り替え（見た目だけ）
  // ==============================
  const themeToggleBtn = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("steplink-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    document.body.setAttribute("data-theme", savedTheme);
  }
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const now = document.body.getAttribute("data-theme") || "light";
      const next = now === "dark" ? "light" : "light"; // ダーク無し・常にライト
      document.body.setAttribute("data-theme", next);
      localStorage.setItem("steplink-theme", next);
    });
  }

  // ==============================
  // ログイン状態ロード
  // ==============================
  async function loadAuthState() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data.user) {
      currentUser = null;
      currentProfile = null;
      applyUserUI(null, null);
      return;
    }

    currentUser = data.user;

    // profiles から取得
    const { data: p, error: pErr } = await supabaseClient
      .from("profiles")
      .select("name, handle, avatar, bio")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (pErr && pErr.code !== "PGRST116") {
      console.error("profile load error:", pErr);
    }
    currentProfile = p || null;

    // なければ auth の metadata から
    applyUserUI(currentUser, currentProfile);
  }

  // UI反映
  function applyUserUI(user, profile) {
    if (!user) {
      if (sidebarNameEl) sidebarNameEl.textContent = "未ログイン";
      if (sidebarHandleEl) sidebarHandleEl.textContent = "";
      if (sidebarAvatarEl) sidebarAvatarEl.textContent = "🧑‍💻";

      if (profileNameEl) profileNameEl.textContent = "StepLinkユーザー";
      if (profileHandleEl) profileHandleEl.textContent = "@user";
      if (profileAvatarEl) profileAvatarEl.textContent = "🧑‍💻";
      if (profileBioEl) profileBioEl.textContent = "プロフィールはまだ書かれていません";

      if (composerAvatarHome) composerAvatarHome.textContent = "🧑‍💻";
      if (composerAvatarModal) composerAvatarModal.textContent = "🧑‍💻";
      return;
    }

    const name = profile?.name || user.user_metadata?.name || "StepLinkユーザー";
    const handle =
      profile?.handle || user.user_metadata?.handle || "user";
    const avatar =
      profile?.avatar || user.user_metadata?.avatar || "🧑‍💻";
    const bio =
      profile?.bio || user.user_metadata?.bio || "プロフィールはまだ書かれていません";

    if (sidebarNameEl) sidebarNameEl.textContent = name;
    if (sidebarHandleEl) sidebarHandleEl.textContent = "@" + handle;
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = avatar;

    if (profileNameEl) profileNameEl.textContent = name;
    if (profileHandleEl) profileHandleEl.textContent = "@" + handle;
    if (profileAvatarEl) profileAvatarEl.textContent = avatar;
    if (profileBioEl) profileBioEl.textContent = bio;

    if (composerAvatarHome) composerAvatarHome.textContent = avatar;
    if (composerAvatarModal) composerAvatarModal.textContent = avatar;
  }

  await loadAuthState();

  // ==============================
  // ログアウト
  // ==============================
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      location.reload();
    });
  }

  // ==============================
  // アカウントモーダル（ログイン/登録）
  // ==============================
  const accountModal = document.getElementById("accountModal");
  const switchAccountBtn = document.getElementById("switchAccountBtn");
  const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");
  const accountBackdrop = accountModal?.querySelector(".modal-backdrop");

  function openAccountModal() {
    if (accountModal) accountModal.classList.remove("hidden");
  }
  function closeAccountModal() {
    if (accountModal) accountModal.classList.add("hidden");
  }

  if (switchAccountBtn && accountModal) {
    switchAccountBtn.addEventListener("click", openAccountModal);
  }
  if (closeAccountModalBtn) {
    closeAccountModalBtn.addEventListener("click", closeAccountModal);
  }
  if (accountBackdrop) {
    accountBackdrop.addEventListener("click", closeAccountModal);
  }

  // タブ切替
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

  // 新規登録
  const regNameInput = document.getElementById("regNameInput");
  const regHandleInput = document.getElementById("regHandleInput");
  const regEmailInput = document.getElementById("regEmailInput");
  const regAvatarInput = document.getElementById("regAvatarInput");
  const regPasswordInput = document.getElementById("regPasswordInput");
  const registerError = document.getElementById("registerError");
  const registerSubmitBtn = document.getElementById("registerSubmitBtn");

  async function handleRegister() {
    if (
      !regNameInput ||
      !regHandleInput ||
      !regEmailInput ||
      !regPasswordInput
    )
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
      const { error: pErr } = await supabaseClient.from("profiles").upsert({
        id: user.id,
        name,
        handle,
        avatar,
      });
      if (pErr) console.error("profiles upsert error:", pErr);
    }

    alert("アカウント作成できたよ💚 ログインしてね！");
    switchAccountTab("login");
  }

  if (registerSubmitBtn) {
    registerSubmitBtn.addEventListener("click", handleRegister);
  }

  // ログイン
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
  // プロフィール編集
  // ==============================
  const editProfileBtn = document.getElementById("editProfileBtn");
  const editProfileModal = document.getElementById("editProfileModal");
  const closeEditProfileModalBtn = document.getElementById(
    "closeEditProfileModal"
  );
  const editNameInput = document.getElementById("editNameInput");
  const editAvatarInput = document.getElementById("editAvatarInput");
  const editBioInput = document.getElementById("editBioInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const editProfileError = document.getElementById("editProfileError");
  const editProfileBackdrop =
    editProfileModal?.querySelector(".modal-backdrop");

  function openEditProfileModal() {
    if (!editProfileModal || !currentUser) return;

    const name =
      currentProfile?.name ||
      currentUser?.user_metadata?.name ||
      "StepLinkユーザー";
    const avatar =
      currentProfile?.avatar ||
      currentUser?.user_metadata?.avatar ||
      "🧑‍💻";
    const bio =
      currentProfile?.bio ||
      currentUser?.user_metadata?.bio ||
      "";

    if (editNameInput) editNameInput.value = name;
    if (editAvatarInput) editAvatarInput.value = avatar;
    if (editBioInput) editBioInput.value = bio;

    if (editProfileError) editProfileError.textContent = "";

    editProfileModal.classList.remove("hidden");
  }

  function closeEditProfileModal() {
    if (editProfileModal) editProfileModal.classList.add("hidden");
  }

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      if (!currentUser) {
        alert("ログインしてから編集してね🥺");
        return;
      }
      openEditProfileModal();
    });
  }
  if (closeEditProfileModalBtn) {
    closeEditProfileModalBtn.addEventListener("click", closeEditProfileModal);
  }
  if (editProfileBackdrop) {
    editProfileBackdrop.addEventListener("click", closeEditProfileModal);
  }

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
      if (!currentUser) return;

      const name = editNameInput?.value.trim() || "";
      const avatar = editAvatarInput?.value.trim() || "";
      const bio = editBioInput?.value.trim() || "";

      if (!name || !avatar) {
        if (editProfileError)
          editProfileError.textContent = "名前とアイコンは必須だよ🥺";
        return;
      }

      if (editProfileError) editProfileError.textContent = "";

      const handle =
        currentProfile?.handle ||
        currentUser.user_metadata?.handle ||
        "user";

      const { error: pErr } = await supabaseClient.from("profiles").upsert({
        id: currentUser.id,
        name,
        handle,
        avatar,
        bio,
      });
      if (pErr) {
        console.error("profile update error:", pErr);
        if (editProfileError)
          editProfileError.textContent = "プロフィール更新に失敗した…😭";
        return;
      }

      const { error: authErr } = await supabaseClient.auth.updateUser({
        data: { name, handle, avatar, bio },
      });
      if (authErr) {
        console.error("auth update error:", authErr);
      }

      currentProfile = {
        ...(currentProfile || {}),
        name,
        handle,
        avatar,
        bio,
      };
      applyUserUI(currentUser, currentProfile);

      closeEditProfileModal();
    });
  }

  // ==============================
  // 文字数カウンタ & 画像プレビュー
  // ==============================
  function updateCounter(input, counter) {
    if (!input || !counter) return;
    counter.textContent = `${input.value.length} / 140`;
  }

  function setupComposer({
    input,
    counter,
    imageBtn,
    fileInput,
    preview,
    submitBtn,
    parentId = null,
  }) {
    if (input && counter) {
      updateCounter(input, counter);
      input.addEventListener("input", () => updateCounter(input, counter));
    }

    if (imageBtn && fileInput && preview) {
      imageBtn.addEventListener("click", () => fileInput.click());
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

    if (submitBtn && input) {
      submitBtn.addEventListener("click", () =>
        handlePostFrom(input, counter, preview, parentId)
      );
    }
  }

  // ホーム用コンポーザーがあるページ
  setupComposer({
    input: document.getElementById("tweetInput"),
    counter: document.getElementById("charCounter"),
    imageBtn: document.getElementById("imageSelectBtn"),
    fileInput: document.getElementById("imageInput"),
    preview: document.getElementById("imagePreview"),
    submitBtn: document.getElementById("postTweetBtn"),
  });

  // モーダル用コンポーザー
  setupComposer({
    input: document.getElementById("tweetInputModal"),
    counter: document.getElementById("charCounterModal"),
    imageBtn: document.getElementById("imageSelectBtnModal"),
    fileInput: document.getElementById("imageInputModal"),
    preview: document.getElementById("imagePreviewModal"),
    submitBtn: document.getElementById("postTweetBtnModal"),
  });

  // 投稿共通
  async function handlePostFrom(input, counter, preview, parentId = null) {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    if (text.length > 140) {
      alert("140文字までだよ🥺");
      return;
    }

    await createTweet(text, parentId);

    input.value = "";
    if (counter) updateCounter(input, counter);
    if (preview) preview.innerHTML = "";

    if (tweetsContainer) await loadTimeline();
    if (profileTweetsContainer) await loadProfileTimeline();
  }

  async function createTweet(text, parentId = null) {
    if (!currentUser) {
      alert("ログインしてから投稿してね🥺");
      return;
    }

    const name =
      currentProfile?.name ||
      currentUser.user_metadata?.name ||
      "StepLinkユーザー";
    const handle =
      currentProfile?.handle ||
      currentUser.user_metadata?.handle ||
      "user";
    const avatar =
      currentProfile?.avatar ||
      currentUser.user_metadata?.avatar ||
      "🧑‍💻";

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
    }
  }

  // ==============================
  // タイムライン表示
  // ==============================
  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(
      d.getHours()
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function renderTweet(row, container, { showReplyButton = true } = {}) {
    const article = document.createElement("article");
    article.className = "post";
    article.dataset.tweetId = row.id;

    article.innerHTML = `
      <div class="post-avatar">${row.avatar || "🧑‍💻"}</div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name">${row.name}</span>
          <span class="post-handle">@${row.handle}</span>
          <span class="post-time">${formatTime(row.created_at)}</span>
        </div>
        <div class="post-text"></div>
        ${
          showReplyButton
            ? `<div class="post-footer">
                 <button class="icon-btn reply-button">返信</button>
               </div>`
            : ""
        }
        <div class="replies"></div>
      </div>
    `;
    article.querySelector(".post-text").textContent = row.content || "";
    container.appendChild(article);

    return article;
  }

  async function loadReplies(parentId, repliesContainer) {
    if (!repliesContainer) return;
    const { data, error } = await supabaseClient
      .from("tweets")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("replies load error:", error);
      return;
    }

    repliesContainer.innerHTML = "";
    data.forEach((reply) => {
      const div = document.createElement("div");
      div.className = "reply-card";
      div.innerHTML = `
        <div class="reply-avatar">${reply.avatar || "🧑‍💻"}</div>
        <div class="reply-body">
          <div class="reply-header">
            <span class="reply-name">${reply.name}</span>
            <span class="reply-handle">@${reply.handle}</span>
            <span class="reply-time">${formatTime(reply.created_at)}</span>
          </div>
          <div class="reply-text"></div>
        </div>
      `;
      div.querySelector(".reply-text").textContent = reply.content || "";
      repliesContainer.appendChild(div);
    });
  }

  async function loadTimeline() {
    if (!tweetsContainer) return;
    const { data, error } = await supabaseClient
      .from("tweets")
      .select("*")
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("tweets load error:", error);
      return;
    }

    tweetsContainer.innerHTML = "";
    for (const row of data) {
      const article = renderTweet(row, tweetsContainer, {
        showReplyButton: true,
      });
      const repliesContainer = article.querySelector(".replies");
      await loadReplies(row.id, repliesContainer);

      // 返信ボタン
      const replyBtn = article.querySelector(".reply-button");
      if (replyBtn) {
        replyBtn.addEventListener("click", async () => {
          const text = prompt("返信内容を入力してね");
          if (!text) return;
          await createTweet(text, row.id);
          await loadTimeline();
        });
      }
    }
  }

  async function loadProfileTimeline() {
    if (!profileTweetsContainer || !currentUser) return;
    const { data, error } = await supabaseClient
      .from("tweets")
      .select("*")
      .eq("user_id", currentUser.id)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("profile tweets load error:", error);
      return;
    }

    profileTweetsContainer.innerHTML = "";
    data.forEach((row) => {
      renderTweet(row, profileTweetsContainer, { showReplyButton: false });
    });
  }

  if (tweetsContainer) {
    await loadTimeline();
  }
  if (profileTweetsContainer) {
    await loadProfileTimeline();
  }

  // ==============================
  // 投稿モーダル開閉
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
});
