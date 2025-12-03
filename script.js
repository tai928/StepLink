// ========================================
// StepLink 共通スクリプト  (script.js)
// ========================================

// supabaseClient.js
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ログイン中ユーザー
let currentUser = null;
let currentProfile = null;

// ----------------------------------------
// ユーティリティ
// ----------------------------------------
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

function getQueryParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

// ----------------------------------------
// プロフィール画面へ飛ぶ（アイコン／名前クリック用）
// どのページからでも使えるように window に出しておく
// ----------------------------------------
window.openUserProfile = function (uid) {
  // uid 指定があればその人のプロフィール
  if (uid) {
    location.href = "profile.html?uid=" + encodeURIComponent(uid);
  } else {
    // なければ自分用（クエリ無し）
    location.href = "profile.html";
  }
};

// ----------------------------------------
// ログイン状態の取得 & サイドバー反映
// （プロフィールページの中身は別の initProfilePage で描画）
// ----------------------------------------
async function loadAuthState() {
  const { data, error } = await supabaseClient.auth.getUser();
  const nameEl = document.getElementById("currentUserName");
  const handleEl = document.getElementById("currentUserHandle");
  const avatarEl = document.getElementById("currentUserAvatar");

  if (error || !data.user) {
    currentUser = null;
    currentProfile = null;

    if (nameEl) nameEl.textContent = "未ログイン";
    if (handleEl) handleEl.textContent = "";
    if (avatarEl) avatarEl.textContent = "🧑‍💻";
    return;
  }

  currentUser = data.user;

  const { data: prof, error: pErr } = await supabaseClient
    .from("profiles")
    .select("id,name,handle,avatar,bio")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (!pErr && prof) {
    currentProfile = prof;
  } else {
    // profiles に行が無い場合は user_metadata から補完
    currentProfile = {
      id: currentUser.id,
      name: currentUser.user_metadata?.name || "StepLinkユーザー",
      handle: currentUser.user_metadata?.handle || "user",
      avatar: currentUser.user_metadata?.avatar || "🧑‍💻",
      bio: "プロフィールはまだ書かれていません",
    };
  }

  if (nameEl) nameEl.textContent = currentProfile.name;
  if (handleEl) handleEl.textContent = "@" + currentProfile.handle;
  if (avatarEl) avatarEl.textContent = currentProfile.avatar;
}

// ----------------------------------------
// テーマ切り替え
// ----------------------------------------
function initThemeToggle() {
  const themeToggleBtn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("steplink-theme");
  if (saved === "dark" || saved === "light") {
    document.body.dataset.theme = saved;
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const now = document.body.dataset.theme || "light";
      const next = now === "dark" ? "light" : "dark";
      document.body.dataset.theme = next;
      localStorage.setItem("steplink-theme", next);
    });
  }
}

// ----------------------------------------
// アカウントモーダル / ログイン / 新規登録 / ログアウト
// ----------------------------------------
function initAuthModal() {
  const accountModal = document.getElementById("accountModal");
  const switchAccountBtn = document.getElementById("switchAccountBtn");
  const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");
  const accountBackdrop = accountModal?.querySelector(".modal-backdrop");
  const accountTabs = document.querySelectorAll(".account-tab");
  const loginView = document.getElementById("accountLoginView");
  const registerView = document.getElementById("accountRegisterView");

  function openModal() {
    if (accountModal) accountModal.classList.remove("hidden");
  }
  function closeModal() {
    if (accountModal) accountModal.classList.add("hidden");
  }

  if (switchAccountBtn) switchAccountBtn.addEventListener("click", openModal);
  if (closeAccountModalBtn) closeAccountModalBtn.addEventListener("click", closeModal);
  if (accountBackdrop) accountBackdrop.addEventListener("click", closeModal);

  function switchTab(mode) {
    accountTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.mode === mode);
    });
    if (!loginView || !registerView) return;
    if (mode === "login") {
      loginView.classList.remove("hidden");
      registerView.classList.add("hidden");
    } else {
      loginView.classList.add("hidden");
      registerView.classList.remove("hidden");
    }
  }

  accountTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.mode));
  });
  // 初期はログインタブ
  switchTab("login");

  // 新規登録
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
          switchTab("login");
        } else {
          registerError.textContent = error.message;
        }
      }
      return;
    }

    const user = data.user;
    if (user) {
      await supabaseClient.from("profiles").upsert({
        id: user.id,
        name,
        handle,
        avatar,
      });
    }

    alert("アカウント作成できたよ💚 ログインしてね！");
    switchTab("login");
  }

  if (registerSubmitBtn) registerSubmitBtn.addEventListener("click", handleRegister);

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

    // ログイン成功 → リロード
    location.reload();
  }

  if (loginSubmitBtn) loginSubmitBtn.addEventListener("click", handleLogin);

  // ログアウト
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      location.href = "index.html";
    });
  }
}

// ----------------------------------------
// タイムライン（ホーム）
// ----------------------------------------
async function loadTweetsAndReplies() {
  const tweetsContainer = document.getElementById("tweetsContainer");
  if (!tweetsContainer) return;

  const { data: tweets, error } = await supabaseClient
    .from("tweets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("tweets load error:", error);
    return;
  }

  // 返信
  const tweetIds = tweets.map((t) => t.id);
  let repliesMap = {};
  if (tweetIds.length > 0) {
    const { data: replies, error: rErr } = await supabaseClient
      .from("tweet_replies")
      .select("*")
      .in("tweet_id", tweetIds)
      .order("created_at", { ascending: true });

    if (!rErr && replies) {
      replies.forEach((r) => {
        if (!repliesMap[r.tweet_id]) repliesMap[r.tweet_id] = [];
        repliesMap[r.tweet_id].push(r);
      });
    }
  }

  // いいね
  let likesMap = {};
  if (tweetIds.length > 0) {
    const { data: likes, error: lErr } = await supabaseClient
      .from("tweet_likes")
      .select("tweet_id,user_id")
      .in("tweet_id", tweetIds);

    if (!lErr && likes) {
      likes.forEach((lk) => {
        if (!likesMap[lk.tweet_id]) likesMap[lk.tweet_id] = { count: 0, liked: false };
        likesMap[lk.tweet_id].count++;
        if (currentUser && lk.user_id === currentUser.id) {
          likesMap[lk.tweet_id].liked = true;
        }
      });
    }
  }

  tweetsContainer.innerHTML = "";
  tweets.forEach((t) => renderTweet(t, repliesMap, likesMap));
}

// 1つの tweet を描画
function renderTweet(row, repliesMap, likesMap) {
  const tweetsContainer = document.getElementById("tweetsContainer");
  if (!tweetsContainer) return;

  const tweetId = row.id;
  const userId = row.user_id;
  const likeInfo = likesMap?.[tweetId] || { count: 0, liked: false };

  const article = document.createElement("article");
  article.className = "post";
  article.dataset.tweetId = tweetId;

  article.innerHTML = `
    <div class="post-avatar post-user-click"
         onclick="openUserProfile('${userId}')">
      ${row.avatar || "🧑‍💻"}
    </div>
    <div class="post-body">
      <div class="post-header">
        <span class="post-user-area"
              onclick="openUserProfile('${userId}')">
          <span class="post-name">${escapeHtml(row.name)}</span>
          <span class="post-handle">@${escapeHtml(row.handle)}</span>
        </span>
        <span class="post-time">${formatTime(row.created_at)}</span>
      </div>
      <div class="post-text">${escapeHtml(row.content)}</div>

      <div class="post-footer">
        <button class="icon-btn reply-btn">返信</button>
        <button class="icon-btn like-btn ${likeInfo.liked ? "liked" : ""}">
          ❤️ <span class="like-count">${likeInfo.count}</span>
        </button>
      </div>

      <div class="replies" data-tweet-id="${tweetId}"></div>
    </div>
  `;

  const repliesContainer = article.querySelector(".replies");
  const replies = repliesMap?.[tweetId] || [];
  replies.forEach((rep) => {
    const div = document.createElement("div");
    div.className = "reply-card";
    div.innerHTML = `
      <div class="reply-avatar">${rep.avatar || "🧑‍💻"}</div>
      <div>
        <div class="reply-header">
          <span class="reply-name">${escapeHtml(rep.name)}</span>
          <span class="reply-handle">@${escapeHtml(rep.handle)}</span>
          <span class="reply-time">${formatTime(rep.created_at)}</span>
        </div>
        <div class="reply-text">${escapeHtml(rep.content)}</div>
      </div>
    `;
    repliesContainer.appendChild(div);
  });

  tweetsContainer.appendChild(article);
}

// ホームページ用の初期化
function initTimelinePage() {
  const tweetsContainer = document.getElementById("tweetsContainer");
  if (!tweetsContainer) return;

  const tweetInput = document.getElementById("tweetInput");
  const charCounter = document.getElementById("charCounter");
  const postTweetBtn = document.getElementById("postTweetBtn");

  function updateCounter(el, counter) {
    if (!el || !counter) return;
    counter.textContent = `${el.value.length} / 140`;
  }

  if (tweetInput && charCounter) {
    updateCounter(tweetInput, charCounter);
    tweetInput.addEventListener("input", () => updateCounter(tweetInput, charCounter));
  }

  async function createTweet(text) {
    if (!currentUser || !currentProfile) {
      alert("ログインしてから投稿してね🥺");
      return;
    }
    const { error } = await supabaseClient.from("tweets").insert({
      user_id: currentUser.id,
      name: currentProfile.name,
      handle: currentProfile.handle,
      avatar: currentProfile.avatar,
      content: text,
    });
    if (error) {
      console.error("tweet insert error:", error);
      alert("投稿に失敗しちゃった…😭");
      return;
    }
    await loadTweetsAndReplies();
  }

  if (postTweetBtn && tweetInput) {
    postTweetBtn.addEventListener("click", async () => {
      const text = tweetInput.value.trim();
      if (!text) return;
      if (text.length > 140) {
        alert("140文字までだよ🥺");
        return;
      }
      await createTweet(text);
      tweetInput.value = "";
      updateCounter(tweetInput, charCounter);
    });
  }

  // 返信／いいねのクリック
  tweetsContainer.addEventListener("click", async (e) => {
    const article = e.target.closest(".post");
    if (!article) return;
    const tweetId = article.dataset.tweetId;

    // 返信ボタン
    if (e.target.classList.contains("reply-btn")) {
      if (!currentUser || !currentProfile) {
        alert("ログインしてから返信してね🥺");
        return;
      }
      const text = prompt("返信内容を入力してね");
      if (!text) return;

      const { error } = await supabaseClient.from("tweet_replies").insert({
        tweet_id: tweetId,
        user_id: currentUser.id,
        name: currentProfile.name,
        handle: currentProfile.handle,
        avatar: currentProfile.avatar,
        content: text,
      });
      if (error) {
        console.error("reply insert error:", error);
        alert("返信に失敗しちゃった…😭");
        return;
      }

      // 通知（元ツイ主に）
      try {
        if (article) {
          const authorHandle = article.querySelector(".post-handle")?.textContent || "";
          // 本当は user_id で lookup するのが正しいけど、
          // ここでは簡単に tweet の user_id を使う
          await supabaseClient.from("notifications").insert({
            user_id: article.dataset.userId, // もしあれば
            from_user_id: currentUser.id,
            type: "reply",
            tweet_id: tweetId,
          });
        }
      } catch (e) {
        console.warn("通知作成はスキップ（必須じゃない）", e);
      }

      await loadTweetsAndReplies();
    }

    // いいね
    if (e.target.closest(".like-btn")) {
      if (!currentUser) {
        alert("ログインしてからいいねしてね🥺");
        return;
      }
      const btn = e.target.closest(".like-btn");
      const countSpan = btn.querySelector(".like-count");
      const liked = btn.classList.contains("liked");

      if (!liked) {
        const { error } = await supabaseClient.from("tweet_likes").insert({
          tweet_id: tweetId,
          user_id: currentUser.id,
        });
        if (!error) {
          btn.classList.add("liked");
          countSpan.textContent = String(Number(countSpan.textContent) + 1);
        }
      } else {
        const { error } = await supabaseClient
          .from("tweet_likes")
          .delete()
          .eq("tweet_id", tweetId)
          .eq("user_id", currentUser.id);
        if (!error) {
          btn.classList.remove("liked");
          countSpan.textContent = String(Number(countSpan.textContent) - 1);
        }
      }
    }
  });

  // 最初の読み込み
  loadTweetsAndReplies();
}

// ----------------------------------------
// プロフィールページ
// ----------------------------------------
async function initProfilePage() {
  const root = document.querySelector(".profile-page-root");
  if (!root) return;

  const profileAvatarEl = document.querySelector(".profile-avatar");
  const profileNameEl = document.getElementById("profileName");
  const profileHandleEl = document.getElementById("profileHandle");
  const profileBioEl = document.querySelector(".profile-bio");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const profileTweetsContainer = document.getElementById("profileTweetsContainer");

  // どのユーザーを見るか
  const uidParam = getQueryParam("uid");

  // -----------------------------
  // ① uid が無い = 自分のプロフィール
  // -----------------------------
  if (!uidParam) {
    // 念のためログイン状態確認
    if (!currentUser) {
      const { data, error } = await supabaseClient.auth.getUser();
      if (!error && data.user) currentUser = data.user;
    }
    if (!currentUser) {
      if (profileNameEl) profileNameEl.textContent = "ログインしていません";
      if (profileHandleEl) profileHandleEl.textContent = "";
      if (profileBioEl) profileBioEl.textContent = "";
      if (editProfileBtn) editProfileBtn.style.display = "none";
      return;
    }

    // サイドバーと同じ情報を使いたいので、currentProfile を優先
    if (!currentProfile) {
      await loadAuthState(); // まだなら取り直す
    }

    const me =
      currentProfile || {
        id: currentUser.id,
        name: currentUser.user_metadata?.name || "StepLinkユーザー",
        handle: currentUser.user_metadata?.handle || "user",
        avatar: currentUser.user_metadata?.avatar || "🧑‍💻",
        bio: "プロフィールはまだ書かれていません",
      };

    // 画面に反映
    if (profileAvatarEl) profileAvatarEl.textContent = me.avatar || "🧑‍💻";
    if (profileNameEl) profileNameEl.textContent = me.name;
    if (profileHandleEl) profileHandleEl.textContent = "@" + me.handle;
    if (profileBioEl)
      profileBioEl.textContent =
        me.bio || "プロフィールはまだ書かれていません";

    // 編集ボタンは自分なので表示＆動作
    if (editProfileBtn) {
      editProfileBtn.style.display = "inline-flex";
      editProfileBtn.onclick = () => openEditProfileModal(me);
    }

    // 自分のツイート一覧
    if (profileTweetsContainer) {
      const { data: tweets, error: tErr } = await supabaseClient
        .from("tweets")
        .select("*")
        .eq("user_id", me.id)
        .order("created_at", { ascending: false })
        .limit(50);

      profileTweetsContainer.innerHTML = "";
      if (!tErr && tweets) {
        tweets.forEach((t) => {
          const div = document.createElement("article");
          div.className = "post";
          div.innerHTML = `
            <div class="post-avatar">${me.avatar || "🧑‍💻"}</div>
            <div class="post-body">
              <div class="post-header">
                <span class="post-name">${escapeHtml(me.name)}</span>
                <span class="post-handle">@${escapeHtml(me.handle)}</span>
                <span class="post-time">${formatTime(t.created_at)}</span>
              </div>
              <div class="post-text">${escapeHtml(t.content)}</div>
            </div>
          `;
          profileTweetsContainer.appendChild(div);
        });
      }
    }

    return; // ← ここで終了（他人プロフィール処理には行かない）
  }

  // -----------------------------
  // ② uid がある = 他人のプロフィール
  // -----------------------------
  const viewUserId = uidParam;

  const { data: prof, error } = await supabaseClient
    .from("profiles")
    .select("id,name,handle,avatar,bio")
    .eq("id", viewUserId)
    .maybeSingle();

  let viewProfile;
  if (!error && prof) {
    viewProfile = prof;
  } else {
    // profiles に無い人用の適当な表示
    viewProfile = {
      id: viewUserId,
      name: "不明なユーザー",
      handle: "unknown",
      avatar: "🧑‍💻",
      bio: "",
    };
  }

  if (profileAvatarEl) profileAvatarEl.textContent = viewProfile.avatar || "🧑‍💻";
  if (profileNameEl) profileNameEl.textContent = viewProfile.name;
  if (profileHandleEl) profileHandleEl.textContent = "@" + viewProfile.handle;
  if (profileBioEl)
    profileBioEl.textContent =
      viewProfile.bio || "プロフィールはまだ書かれていません";

  // 他人なので編集ボタンは出さない
  if (editProfileBtn) {
    editProfileBtn.style.display = "none";
  }

  // そのユーザーのツイート
  if (profileTweetsContainer) {
    const { data: tweets, error: tErr } = await supabaseClient
      .from("tweets")
      .select("*")
      .eq("user_id", viewUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    profileTweetsContainer.innerHTML = "";
    if (!tErr && tweets) {
      tweets.forEach((t) => {
        const div = document.createElement("article");
        div.className = "post";
        div.innerHTML = `
          <div class="post-avatar">${viewProfile.avatar || "🧑‍💻"}</div>
          <div class="post-body">
            <div class="post-header">
              <span class="post-name">${escapeHtml(viewProfile.name)}</span>
              <span class="post-handle">@${escapeHtml(viewProfile.handle)}</span>
              <span class="post-time">${formatTime(t.created_at)}</span>
            </div>
            <div class="post-text">${escapeHtml(t.content)}</div>
          </div>
        `;
        profileTweetsContainer.appendChild(div);
      });
    }
  }
}


// プロフィール編集モーダルを開く
function openEditProfileModal(currentProf) {
  const modal = document.getElementById("editProfileModal");
  if (!modal) return;

  const nameInput = document.getElementById("editProfileName");
  const handleInput = document.getElementById("editProfileHandle");
  const avatarInput = document.getElementById("editProfileAvatar");
  const bioInput = document.getElementById("editProfileBio");
  const saveBtn = document.getElementById("editProfileSaveBtn");
  const cancelBtn = document.getElementById("editProfileCancelBtn");
  const backdrop = modal.querySelector(".modal-backdrop");

  nameInput.value = currentProf.name || "";
  handleInput.value = currentProf.handle || "";
  avatarInput.value = currentProf.avatar || "🧑‍💻";
  bioInput.value = currentProf.bio || "";

  function close() {
    modal.classList.add("hidden");
    saveBtn.removeEventListener("click", onSave);
    cancelBtn.removeEventListener("click", close);
    backdrop.removeEventListener("click", close);
  }

  async function onSave() {
    const newName = nameInput.value.trim();
    const newHandle = handleInput.value.trim();
    const newAvatar = avatarInput.value.trim() || "🧑‍💻";
    const newBio = bioInput.value.trim();

    if (!newName || !newHandle) {
      alert("名前とハンドルは必須だよ🥺");
      return;
    }

    // profiles テーブル更新
    const { error } = await supabaseClient.from("profiles").upsert({
      id: currentProf.id,
      name: newName,
      handle: newHandle,
      avatar: newAvatar,
      bio: newBio,
    });
    if (error) {
      console.error("profile upsert error:", error);
      alert("プロフィール更新に失敗した…😭");
      return;
    }

    // auth の metadata も更新しておく（サイドバー表示用）
    try {
      await supabaseClient.auth.updateUser({
        data: { name: newName, handle: newHandle, avatar: newAvatar },
      });
    } catch (e) {
      console.warn("metadata update は失敗したけど致命的ではない", e);
    }

    // currentProfile も同期
    if (currentProfile && currentProfile.id === currentProf.id) {
      currentProfile.name = newName;
      currentProfile.handle = newHandle;
      currentProfile.avatar = newAvatar;
      currentProfile.bio = newBio;
    }

    await loadAuthState(); // サイドバー再描画
    location.reload();     // プロフページも更新
  }

  saveBtn.addEventListener("click", onSave);
  cancelBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  modal.classList.remove("hidden");
}

// ----------------------------------------
// DM（messages.html）
// ※ ざっくり実装。テーブル: messages(id,sender_id,receiver_id,content,created_at)
// ----------------------------------------
async function initDMPage() {
  const dmLayout = document.querySelector(".dm-layout");
  if (!dmLayout) return;

  const convListEl = document.querySelector(".dm-conversation-list");
  const dmMessagesEl = document.querySelector(".dm-messages");
  const dmTextarea = document.getElementById("dmInput");
  const dmSendBtn = document.getElementById("dmSendBtn");
  const partnerNameEl = document.querySelector(".dm-partner-name");
  const partnerHandleEl = document.querySelector(".dm-partner-handle");
  const partnerAvatarEl = document.querySelector(".dm-partner-avatar");

  if (!currentUser) {
    if (dmMessagesEl) dmMessagesEl.textContent = "ログインしていません。";
    return;
  }

  let currentPartnerId = null;
  let partnerProfileCache = {};

  async function loadConversations() {
    // 自分を含むメッセージを全部拾って、相手ごとにまとめる
    const { data, error } = await supabaseClient
      .from("messages")
      .select("id,sender_id,receiver_id,content,created_at")
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("messages load error:", error);
      return;
    }

    const lastByPartner = {};
    data.forEach((m) => {
      const partnerId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
      if (!lastByPartner[partnerId]) lastByPartner[partnerId] = m;
    });

    const partnerIds = Object.keys(lastByPartner);
    convListEl.innerHTML = "";
    if (partnerIds.length === 0) {
      convListEl.textContent = "DMはまだありません。";
      return;
    }

    // プロフィールまとめて取得
    const { data: profs } = await supabaseClient
      .from("profiles")
      .select("id,name,handle,avatar")
      .in("id", partnerIds);

    const profMap = {};
    (profs || []).forEach((p) => (profMap[p.id] = p));

    partnerProfileCache = profMap;

    partnerIds.forEach((pid) => {
      const m = lastByPartner[pid];
      const p = profMap[pid] || {
        id: pid,
        name: "不明なユーザー",
        handle: "unknown",
        avatar: "🧑‍💻",
      };

      const item = document.createElement("div");
      item.className = "dm-conversation-item";
      item.dataset.partnerId = pid;
      item.innerHTML = `
        <div class="dm-conv-avatar">${p.avatar || "🧑‍💻"}</div>
        <div class="dm-conv-main">
          <div class="dm-conv-name">${escapeHtml(p.name)}</div>
          <div class="dm-conv-last">${escapeHtml(m.content)}</div>
        </div>
      `;
      convListEl.appendChild(item);
    });
  }

  async function loadMessagesWith(partnerId) {
    if (!partnerId) return;
    currentPartnerId = partnerId;

    convListEl
      .querySelectorAll(".dm-conversation-item")
      .forEach((el) => el.classList.toggle("active", el.dataset.partnerId === partnerId));

    const p =
      partnerProfileCache[partnerId] ||
      (
        await supabaseClient
          .from("profiles")
          .select("id,name,handle,avatar")
          .eq("id", partnerId)
          .maybeSingle()
      ).data ||
      {
        id: partnerId,
        name: "不明なユーザー",
        handle: "unknown",
        avatar: "🧑‍💻",
      };

    if (partnerAvatarEl) partnerAvatarEl.textContent = p.avatar || "🧑‍💻";
    if (partnerNameEl) partnerNameEl.textContent = p.name;
    if (partnerHandleEl) partnerHandleEl.textContent = "@" + p.handle;

    const { data, error } = await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("messages load error:", error);
      return;
    }

    dmMessagesEl.innerHTML = "";
    data.forEach((m) => {
      const div = document.createElement("div");
      div.className = "dm-message " + (m.sender_id === currentUser.id ? "me" : "other");
      div.innerHTML = `
        <div>${escapeHtml(m.content)}</div>
        <div class="dm-message-time">${formatTime(m.created_at)}</div>
      `;
      dmMessagesEl.appendChild(div);
    });
    dmMessagesEl.scrollTop = dmMessagesEl.scrollHeight;
  }

  convListEl.addEventListener("click", (e) => {
    const item = e.target.closest(".dm-conversation-item");
    if (!item) return;
    loadMessagesWith(item.dataset.partnerId);
  });

  if (dmSendBtn && dmTextarea) {
    dmSendBtn.addEventListener("click", async () => {
      const text = dmTextarea.value.trim();
      if (!text || !currentPartnerId) return;

      const { error } = await supabaseClient.from("messages").insert({
        sender_id: currentUser.id,
        receiver_id: currentPartnerId,
        content: text,
      });
      if (error) {
        console.error("dm send error:", error);
        alert("送信に失敗した…😭");
        return;
      }

      // 通知
      try {
        await supabaseClient.from("notifications").insert({
          user_id: currentPartnerId,
          from_user_id: currentUser.id,
          type: "dm",
        });
      } catch (e) {
        console.warn("通知作成はスキップ", e);
      }

      dmTextarea.value = "";
      await loadMessagesWith(currentPartnerId);
    });
  }

  await loadConversations();
}

// ----------------------------------------
// 通知ページ（notifications.html）
// ----------------------------------------
async function initNotificationsPage() {
  const listEl = document.getElementById("notificationList");
  if (!listEl) return;
  if (!currentUser) {
    listEl.textContent = "ログインしていません。";
    return;
  }

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("notifications load error:", error);
    return;
  }

  listEl.innerHTML = "";
  if (!data || data.length === 0) {
    listEl.textContent = "通知はまだありません。";
    return;
  }

  data.forEach((n) => {
    const li = document.createElement("li");
    let text = "";
    if (n.type === "reply") {
      text = "あなたの投稿に返信がありました";
    } else if (n.type === "dm") {
      text = "新しいDMが届きました";
    } else {
      text = "通知: " + n.type;
    }
    li.textContent = `${text} (${formatTime(n.created_at)})`;
    listEl.appendChild(li);
  });
}

// ----------------------------------------
// DOMContentLoaded で各ページの初期化
// ----------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadAuthState();
  initThemeToggle();
  initAuthModal();

  // ホーム
  if (document.getElementById("tweetsContainer")) {
    initTimelinePage();
  }

  // プロフィール
  if (document.querySelector(".profile-page-root")) {
    initProfilePage();
  }

  // DM
  if (document.querySelector(".dm-layout")) {
    initDMPage();
  }

  // 通知
  if (document.body.dataset.page === "notifications") {
    initNotificationsPage();
  }
});
