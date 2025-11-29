// ==============================
// Supabase 初期化
// ==============================

// ★ここ、自分のプロジェクトに書き換えてね
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  // ------------------------------
  // 共通で使うログイン中ユーザー情報
  // ------------------------------
  let currentUser = null;
  let currentProfile = null;

  // 投稿リストのDOM（あれば）
  const tweetsContainer = document.getElementById("tweetsContainer");

  // =====================================
  // 🌙（見た目だけ）テーマ切り替え
  // =====================================
  const themeToggleBtn = document.getElementById("themeToggle");
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

  // =====================================
  // 👤 ログイン状態の初期チェック
  // =====================================
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

    // profiles テーブルからプロフィール取得（なければメタデータ）
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

  // =====================================
  // 👤 ログイン情報をUIに反映
  // =====================================
  function applyUserUI(user, profile) {
    const nameEl = document.getElementById("currentUserName");
    const handleEl = document.getElementById("currentUserHandle");
    const avatarEl = document.getElementById("currentUserAvatar");

    const profileNameEl = document.getElementById("profileName");
    const profileHandleEl = document.getElementById("profileHandle");
    const profileBioEl = document.querySelector(".profile-bio");

    if (!user) {
      if (nameEl) nameEl.textContent = "未ログイン";
      if (handleEl) handleEl.textContent = "";
      if (avatarEl) avatarEl.textContent = "🧑‍💻";

      if (profileNameEl) profileNameEl.textContent = "StepLinkユーザー";
      if (profileHandleEl) profileHandleEl.textContent = "@user";
      if (profileBioEl) profileBioEl.textContent = "プロフィール準備中";
      return;
    }

    const name =
      profile?.name || user.user_metadata?.name || "StepLinkユーザー";
    const handle =
      profile?.handle || user.user_metadata?.handle || "user";
    const avatar =
      profile?.avatar || user.user_metadata?.avatar || "🧑‍💻";
    const bio = profile?.bio || "プロフィールはまだ書かれていません";

    if (nameEl) nameEl.textContent = name;
    if (handleEl) handleEl.textContent = "@" + handle;
    if (avatarEl) avatarEl.textContent = avatar;

    if (profileNameEl) profileNameEl.textContent = name;
    if (profileHandleEl) profileHandleEl.textContent = "@" + handle;
    if (profileBioEl) profileBioEl.textContent = bio;
  }

  await loadAuthState();

  // =====================================
  // 🐦 tweets テーブルから読み込み
  // =====================================
  function renderTweet(row) {
    if (!tweetsContainer) return;

    const article = document.createElement("article");
    article.className = "post";
    article.innerHTML = `
      <div class="post-avatar">${row.avatar}</div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name">${row.name}</span>
          <span class="post-handle">@${row.handle}</span>
          <span class="post-time">${formatTime(row.created_at)}</span>
        </div>
        <div class="post-text"></div>
      </div>
    `;
    article.querySelector(".post-text").textContent = row.content;
    tweetsContainer.appendChild(article);
  }

  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(
      d.getHours()
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  async function loadTweetsFromDB() {
    if (!tweetsContainer) return;
    const { data, error } = await supabaseClient
      .from("tweets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("tweets load error:", error);
      return;
    }

    tweetsContainer.innerHTML = "";
    data.forEach(renderTweet);
  }

  // タイムラインがあるページだけ読み込み
  if (tweetsContainer) {
    await loadTweetsFromDB();
  }

  // =====================================
  // 🧾 アカウントモーダル開閉
  // =====================================
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

  // =====================================
  // 🔁 アカウントタブ切り替え（ログイン / 新規登録）
  // =====================================
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

  // =====================================
  // 🆕 新規登録（signUp + profiles保存）
  // =====================================
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
      // profiles にも保存
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

  // =====================================
  // 🔐 ログイン
  // =====================================
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

    // ログイン成功 → 状態を更新したいのでリロード
    location.reload();
  }

  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener("click", handleLogin);
  }

  // =====================================
  // 🚪 ログアウト（左下の名前をダブルクリック）
  // =====================================
  const currentUserNameEl = document.getElementById("currentUserName");
  if (currentUserNameEl) {
    currentUserNameEl.addEventListener("dblclick", async () => {
      await supabaseClient.auth.signOut();
      location.reload();
    });
  }

  // =====================================
  // ✏️ 文字数カウンター
  // =====================================
  function updateCounter(input, counter) {
    if (!input || !counter) return;
    counter.textContent = `${input.value.length} / 140`;
  }

  // =====================================
  // 📝 ホーム投稿（DBに保存）
  // =====================================
  const tweetInput = document.getElementById("tweetInput");
  const charCounter = document.getElementById("charCounter");
  const imageSelectBtn = document.getElementById("imageSelectBtn");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const postTweetBtn = document.getElementById("postTweetBtn");

  if (tweetInput && charCounter) {
    updateCounter(tweetInput, charCounter);
    tweetInput.addEventListener("input", () =>
      updateCounter(tweetInput, charCounter)
    );
  }

  if (imageSelectBtn && imageInput && imagePreview) {
    imageSelectBtn.addEventListener("click", () => imageInput.click());
    imageInput.addEventListener("change", () => {
      const file = imageInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.innerHTML = "";
        const img = document.createElement("img");
        img.src = e.target.result;
        imagePreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  async function createTweet(text) {
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
    });

    if (error) {
      console.error("tweet insert error:", error);
      alert("投稿に失敗しちゃった…😭 コンソール見て！");
      return;
    }

    // 再読み込み
    await loadTweetsFromDB();
  }

  async function handlePostFrom(input, counter, preview) {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    if (text.length > 140) {
      alert("140文字までだよ🥺");
      return;
    }

    await createTweet(text);

    input.value = "";
    if (counter) updateCounter(input, counter);
    if (preview) preview.innerHTML = "";
  }

  if (postTweetBtn && tweetInput) {
    postTweetBtn.addEventListener("click", () =>
      handlePostFrom(tweetInput, charCounter, imagePreview)
    );
  }

  // =====================================
  // 📝 モーダルからの投稿（これだけ残せばOK）
  // =====================================
  const tweetModal = document.getElementById("tweetModal");
  const openModalBtn = document.getElementById("openModalBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const tweetModalBackdrop = tweetModal?.querySelector(".modal-backdrop");
  
  const tweetInputModal = document.getElementById("tweetInputModal");
  const charCounterModal = document.getElementById("charCounterModal");
  const imageSelectBtnModal = document.getElementById("imageSelectBtnModal");
  const imageInputModal = document.getElementById("imageInputModal");
  const imagePreviewModal = document.getElementById("imagePreviewModal");
  const postTweetBtnModal = document.getElementById("postTweetBtnModal");
  
  function openTweetModal() {
    tweetModal.classList.remove("hidden");
  }
  function closeTweetModal() {
    tweetModal.classList.add("hidden");
  }
  
  if (openModalBtn) {
    openModalBtn.addEventListener("click", openTweetModal);
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeTweetModal);
  }
  if (tweetModalBackdrop) {
    tweetModalBackdrop.addEventListener("click", closeTweetModal);
  }
  
  if (tweetInputModal && charCounterModal) {
    updateCounter(tweetInputModal, charCounterModal);
    tweetInputModal.addEventListener("input", () =>
      updateCounter(tweetInputModal, charCounterModal)
    );
  }
  
  if (imageSelectBtnModal && imageInputModal && imagePreviewModal) {
    imageSelectBtnModal.addEventListener("click", () =>
      imageInputModal.click()
    );
    imageInputModal.addEventListener("change", () => {
      const file = imageInputModal.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreviewModal.innerHTML = "";
        const img = document.createElement("img");
        img.src = e.target.result;
        imagePreviewModal.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }
  
  if (postTweetBtnModal && tweetInputModal) {
    postTweetBtnModal.addEventListener("click", () =>
      handlePostFrom(tweetInputModal, charCounterModal, imagePreviewModal)
    );
  }
});

