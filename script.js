// =====================================
// Supabase 初期化
// =====================================
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  // ---------------------------------
  // 共通で使う状態
  // ---------------------------------
  let currentUser = null;
  let currentProfile = null;

  // ページ判定用（body に data-page="home" とか付けておくと便利）
  const pageType = document.body.dataset.page || "home";

  // DOM のよく使う要素
  const tweetsContainer = document.getElementById("tweetsContainer");
  const profileTweetsContainer = document.getElementById("profileTweetsContainer");
  const notificationsContainer = document.getElementById("notificationsContainer");

  // DM 関連要素
  const dmLayout = document.querySelector(".dm-layout");
  const dmConversationList = document.querySelector(".dm-conversation-list");
  const dmMessagesBox = document.querySelector(".dm-messages");
  const dmTextarea = document.getElementById("dmInput");
  const dmSendBtn = document.getElementById("dmSendBtn");
  const dmPartnerNameEl = document.getElementById("dmPartnerName");
  const dmPartnerHandleEl = document.getElementById("dmPartnerHandle");
  const dmPartnerAvatarEl = document.getElementById("dmPartnerAvatar");

  let currentDMPartnerId = null;
  let profilesCache = new Map(); // id -> profile

  // 返信モーダル（あれば使う。無ければ prompt() にフォールバック）
  const replyModal = document.getElementById("replyModal");
  const replyTextarea = document.getElementById("replyTextarea");
  const replyCharCounter = document.getElementById("replyCharCounter");
  const replySubmitBtn = document.getElementById("replySubmitBtn");
  const replyCancelBtn = document.getElementById("replyCancelBtn");
  let replyingTweetId = null;

  // アカウントモーダル
  const accountModal = document.getElementById("accountModal");
  const switchAccountBtn = document.getElementById("switchAccountBtn");
  const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");

  // ログイン / 新規登録フォーム
  const accountTabs = document.querySelectorAll(".account-tab");
  const accountLoginView = document.getElementById("accountLoginView");
  const accountRegisterView = document.getElementById("accountRegisterView");

  const regNameInput = document.getElementById("regNameInput");
  const regHandleInput = document.getElementById("regHandleInput");
  const regEmailInput = document.getElementById("regEmailInput");
  const regAvatarInput = document.getElementById("regAvatarInput");
  const regPasswordInput = document.getElementById("regPasswordInput");
  const registerError = document.getElementById("registerError");
  const registerSubmitBtn = document.getElementById("registerSubmitBtn");

  const loginHandleInput = document.getElementById("loginHandleInput");
  const loginPasswordInput = document.getElementById("loginPasswordInput");
  const loginError = document.getElementById("loginError");
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");

  // ログアウトボタン（左下）
  const logoutBtn = document.getElementById("logoutBtn");

  // タイムライン投稿用
  const tweetInput = document.getElementById("tweetInput");
  const charCounter = document.getElementById("charCounter");
  const imageSelectBtn = document.getElementById("imageSelectBtn");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const postTweetBtn = document.getElementById("postTweetBtn");

  // 共通のアカウント表示
  const currentUserNameEl = document.getElementById("currentUserName");
  const currentUserHandleEl = document.getElementById("currentUserHandle");
  const currentUserAvatarEl = document.getElementById("currentUserAvatar");

  // プロフィールページ用
  const profileNameEl = document.getElementById("profileName");
  const profileHandleEl = document.getElementById("profileHandle");
  const profileBioEl = document.querySelector(".profile-bio");
  const profileAvatarEl = document.querySelector(".profile-avatar");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const dmFromProfileBtn = document.getElementById("dmFromProfileBtn");

  // プロフィール編集モーダル
  const editProfileModal = document.getElementById("editProfileModal");
  const closeEditProfileModalBtn = document.getElementById("closeEditProfileModalBtn");
  const editProfileNameInput = document.getElementById("editProfileName");
  const editProfileHandleInput = document.getElementById("editProfileHandle");
  const editProfileAvatarInput = document.getElementById("editProfileAvatar");
  const editProfileBioTextarea = document.getElementById("editProfileBio");
  const editProfileSaveBtn = document.getElementById("editProfileSaveBtn");

  // =====================================
  // 共通ユーティリティ
  // =====================================

  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  }

  function updateCounter(input, counter) {
    if (!input || !counter) return;
    counter.textContent = `${input.value.length} / 140`;
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  function escapeHTML(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // 🔔 未読DMがあると通知ベルに●（notifDot を付けてる前提）
  async function refreshUnreadDMIndicator() {
    const dot = document.getElementById("notifDot");
    if (!dot) return;

    if (!currentUser) {
      dot.classList.remove("show");
      return;
    }

    const { count, error } = await supabaseClient
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("to_user_id", currentUser.id)
      .eq("is_read", false);

    if (error) {
      console.warn("unread count error:", error);
      return;
    }

    dot.classList.toggle("show", (count || 0) > 0);
  }

  // =====================================
  // 認証状態のロード & UI反映
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

    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("name, handle, avatar, bio")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("プロフィール取得エラー:", profileError);
    }

    currentProfile = profileData || null;
    if (currentProfile) {
      profilesCache.set(currentUser.id, { id: currentUser.id, ...currentProfile });
    }
    applyUserUI(currentUser, currentProfile);
  }

  function applyUserUI(user, profile) {
    const name =
      profile?.name || user?.user_metadata?.name || (user ? "ユーザー" : "未ログイン");
    const handle =
      profile?.handle || user?.user_metadata?.handle || (user ? "user" : "");
    const avatar =
      profile?.avatar || user?.user_metadata?.avatar || "🧑‍💻";
    const bio = profile?.bio || "プロフィールはまだ書かれていません";

    if (currentUserNameEl) currentUserNameEl.textContent = name;
    if (currentUserHandleEl) currentUserHandleEl.textContent = user ? "@" + handle : "";
    if (currentUserAvatarEl) currentUserAvatarEl.textContent = avatar;

    if (profileNameEl) profileNameEl.textContent = name;
    if (profileHandleEl) profileHandleEl.textContent = user ? "@" + handle : "@user";
    if (profileBioEl) profileBioEl.textContent = bio;
    if (profileAvatarEl) profileAvatarEl.textContent = avatar;
  }

  // =====================================
  // Realtime: messages 既読同期
  // =====================================
  let rtChannel = null;

  function subscribeMessagesRealtime() {
    if (!currentUser) return;

    rtChannel?.unsubscribe();

    rtChannel = supabaseClient
      .channel("rt-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        async (payload) => {
          const row = payload.new || payload.old;

          // DM画面で、開いてる相手とのスレッドに関係する更新なら再描画
          if (
            pageType === "messages" &&
            currentDMPartnerId &&
            row &&
            (
              (row.from_user_id === currentUser.id && row.to_user_id === currentDMPartnerId) ||
              (row.from_user_id === currentDMPartnerId && row.to_user_id === currentUser.id)
            )
          ) {
            await loadDMThread(currentDMPartnerId);
            await loadDMConversations();
          }

          // 未読●更新
          await refreshUnreadDMIndicator();
        }
      )
      .subscribe();
  }

  // =====================================
  // Presence: オンライン表示
  // =====================================
  let presenceChannel = null;
  let onlineSet = new Set();

  function setupPresence() {
    if (!currentUser) return;

    presenceChannel?.unsubscribe();

    presenceChannel = supabaseClient.channel("presence-global", {
      config: { presence: { key: currentUser.id } },
    });

    presenceChannel.on("presence", { event: "sync" }, () => {
      onlineSet = new Set(Object.keys(presenceChannel.presenceState()));
      updateOnlineUI();
    });

    presenceChannel.on("presence", { event: "join" }, ({ key }) => {
      onlineSet.add(key);
      updateOnlineUI();
    });

    presenceChannel.on("presence", { event: "leave" }, ({ key }) => {
      onlineSet.delete(key);
      updateOnlineUI();
    });

    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({ at: new Date().toISOString() });
      }
    });
  }

  function updateOnlineUI() {
    const badge = document.getElementById("dmOnlineBadge");
    if (!badge || !currentDMPartnerId) return;
    badge.textContent = onlineSet.has(currentDMPartnerId) ? "オンライン" : "オフライン";
  }

  // =====================================
  // アカウントモーダル
  // =====================================
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

  if (switchAccountBtn && accountModal) {
    switchAccountBtn.addEventListener("click", () => openModal(accountModal));
  }
  if (closeAccountModalBtn) {
    closeAccountModalBtn.addEventListener("click", () => closeModal(accountModal));
  }

  accountTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchAccountTab(tab.dataset.mode));
  });

  async function handleRegister() {
    if (!regNameInput || !regHandleInput || !regEmailInput || !regPasswordInput) return;

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
          registerError.textContent = "このメールは登録済み。ログインしてね。";
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
      if (profileErr) console.error("profiles upsert error:", profileErr);
    }

    alert("アカウント作成できたよ💚 メール確認してからログインしてね！");
    switchAccountTab("login");
  }

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

  if (registerSubmitBtn) {
    registerSubmitBtn.addEventListener("click", handleRegister);
  }
  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener("click", handleLogin);
  }

  // ログアウト
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      location.href = "index.html";
    });
  }

  const switchAccountBtnMobile = document.getElementById("switchAccountBtnMobile");
  if (switchAccountBtnMobile && accountModal) {
    switchAccountBtnMobile.addEventListener("click", () => openModal(accountModal));
  }

  // =====================================
  // タイムライン（ホーム）
  // =====================================

  function renderTweet(row, options = {}) {
    if (!tweetsContainer) return;

    const article = document.createElement("article");
    article.className = "post";
    article.dataset.tweetId = row.id;

    const name = row.name || "ユーザー";
    const handle = row.handle || "user";
    const avatar = row.avatar || "🧑‍💻";

    article.innerHTML = `
      <div class="post-avatar" data-profile-uid="${row.user_id}">
        ${avatar}
      </div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name" data-profile-uid="${row.user_id}">${escapeHTML(name)}</span>
          <span class="post-handle" data-profile-uid="${row.user_id}">@${escapeHTML(handle)}</span>
          <span class="post-time">${formatTime(row.created_at)}</span>
        </div>
        <div class="post-text">${escapeHTML(row.content || "")}</div>
        <div class="post-footer">
          <button class="icon-btn reply-btn" data-tweet-id="${row.id}">返信</button>
          <button class="icon-btn like-btn" data-tweet-id="${row.id}">
            <span class="like-icon">${options.likedByMe ? "♥" : "♡"}</span>
            <span class="like-count">${options.likeCount ?? 0}</span>
          </button>
        </div>
        <div class="replies" data-tweet-id="${row.id}"></div>
      </div>
    `;

    tweetsContainer.appendChild(article);
  }

  function renderReply(replyRow) {
    const repliesBox = document.querySelector(
      `.replies[data-tweet-id="${replyRow.tweet_id}"]`
    );
    if (!repliesBox) return;

    const div = document.createElement("div");
    div.className = "reply-card";
    const name = replyRow.name || "ユーザー";
    const handle = replyRow.handle || "user";
    const avatar = replyRow.avatar || "🧑‍💻";

    div.innerHTML = `
      <div class="reply-avatar" data-profile-uid="${replyRow.user_id}">
        ${avatar}
      </div>
      <div class="reply-body">
        <div class="reply-header">
          <span class="reply-name" data-profile-uid="${replyRow.user_id}">${escapeHTML(name)}</span>
          <span class="reply-handle" data-profile-uid="${replyRow.user_id}">@${escapeHTML(handle)}</span>
          <span class="reply-time">${formatTime(replyRow.created_at)}</span>
        </div>
        <div class="reply-text">${escapeHTML(replyRow.content)}</div>
      </div>
    `;

    repliesBox.appendChild(div);
  }

  async function loadTweetsFromDB() {
    if (!tweetsContainer) return;

    const { data: tweets, error } = await supabaseClient
      .from("tweets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("tweets load error:", error);
      return;
    }

    tweetsContainer.innerHTML = "";

    if (!tweets || tweets.length === 0) return;

    const tweetIds = tweets.map((t) => t.id);

    // いいね情報読み込み
    let likesByTweet = new Map();
    let likedByMeSet = new Set();
    if (tweetIds.length > 0) {
      const { data: likes, error: likesErr } = await supabaseClient
        .from("tweet_likes")
        .select("tweet_id,user_id")
        .in("tweet_id", tweetIds);

      if (!likesErr && likes) {
        for (const l of likes) {
          const arr = likesByTweet.get(l.tweet_id) || [];
          arr.push(l.user_id);
          likesByTweet.set(l.tweet_id, arr);
          if (currentUser && l.user_id === currentUser.id) {
            likedByMeSet.add(l.tweet_id);
          }
        }
      }
    }

    // ツイート描画
    tweets.forEach((t) => {
      const likeUsers = likesByTweet.get(t.id) || [];
      renderTweet(t, {
        likeCount: likeUsers.length,
        likedByMe: likedByMeSet.has(t.id),
      });
    });

    // 返信読み込み
    const { data: replies, error: repliesErr } = await supabaseClient
      .from("tweet_replies")
      .select("*")
      .in("tweet_id", tweetIds)
      .order("created_at", { ascending: true });

    if (repliesErr) {
      if (repliesErr.code === "42P01") {
        console.warn("tweet_replies テーブルが無いっぽい:", repliesErr.message);
      } else {
        console.error("replies load error:", repliesErr);
      }
      return;
    }

    if (replies) {
      replies.forEach(renderReply);
    }
  }

  // 投稿部分セットアップ
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
      "ユーザー";
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
  // 返信モーダル or prompt
  // =====================================

  function openReplyUI(tweetId) {
    replyingTweetId = tweetId;
    if (replyModal && replyTextarea && replyCharCounter) {
      replyTextarea.value = "";
      updateCounter(replyTextarea, replyCharCounter);
      openModal(replyModal);
      replyTextarea.focus();
    } else {
      const text = prompt("返信内容を入力してね");
      if (text && text.trim()) {
        handleReplySubmit(tweetId, text.trim());
      }
    }
  }

  async function handleReplySubmit(tweetId, textFromModal) {
    if (!currentUser) {
      alert("ログインしてから返信してね🥺");
      return;
    }

    const text = textFromModal ?? (replyTextarea ? replyTextarea.value.trim() : "");
    if (!text) return;
    if (text.length > 140) {
      alert("140文字までだよ🥺");
      return;
    }

    const name =
      currentProfile?.name ||
      currentUser.user_metadata?.name ||
      "ユーザー";
    const handle =
      currentProfile?.handle ||
      currentUser.user_metadata?.handle ||
      "user";
    const avatar =
      currentProfile?.avatar ||
      currentUser.user_metadata?.avatar ||
      "🧑‍💻";

    const { data, error } = await supabaseClient
      .from("tweet_replies")
      .insert({
        tweet_id: tweetId,
        user_id: currentUser.id,
        name,
        handle,
        avatar,
        content: text,
      })
      .select("*")
      .single();

    if (error) {
      console.error("reply insert error:", error);
      alert("返信失敗しちゃった…😭");
      return;
    }

    renderReply(data);

    if (replyModal) closeModal(replyModal);
    if (replyTextarea && replyCharCounter) {
      replyTextarea.value = "";
      updateCounter(replyTextarea, replyCharCounter);
    }
  }

  if (replyTextarea && replyCharCounter) {
    replyTextarea.addEventListener("input", () =>
      updateCounter(replyTextarea, replyCharCounter)
    );
  }
  if (replySubmitBtn) {
    replySubmitBtn.addEventListener("click", () => {
      if (!replyingTweetId) return;
      handleReplySubmit(replyingTweetId);
    });
  }
  if (replyCancelBtn) {
    replyCancelBtn.addEventListener("click", () => {
      if (replyModal) closeModal(replyModal);
    });
  }

  // =====================================
  // いいね
  // =====================================
  async function toggleLike(tweetId, btn) {
    if (!currentUser) {
      alert("ログインしてからいいねしてね🥺");
      return;
    }
    const iconSpan = btn.querySelector(".like-icon");
    const countSpan = btn.querySelector(".like-count");
    const isLiked = iconSpan && iconSpan.textContent === "♥";

    if (!isLiked) {
      const { error } = await supabaseClient.from("tweet_likes").insert({
        tweet_id: tweetId,
        user_id: currentUser.id,
      });
      if (error && error.code !== "23505") {
        console.error("like insert error:", error);
        return;
      }
      if (iconSpan) iconSpan.textContent = "♥";
      if (countSpan) {
        const n = parseInt(countSpan.textContent || "0", 10);
        countSpan.textContent = (n + 1).toString();
      }
    } else {
      const { error } = await supabaseClient
        .from("tweet_likes")
        .delete()
        .eq("tweet_id", tweetId)
        .eq("user_id", currentUser.id);
      if (error) {
        console.error("like delete error:", error);
        return;
      }
      if (iconSpan) iconSpan.textContent = "♡";
      if (countSpan) {
        const n = parseInt(countSpan.textContent || "0", 10);
        countSpan.textContent = Math.max(0, n - 1).toString();
      }
    }
  }

  // =====================================
  // DM関連
  // =====================================
  async function getProfilesByIds(ids) {
    const missing = ids.filter((id) => !profilesCache.has(id));
    if (missing.length > 0) {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id,name,handle,avatar")
        .in("id", missing);
      if (!error && data) {
        data.forEach((p) => profilesCache.set(p.id, p));
      }
    }
    return ids.map(
      (id) =>
        profilesCache.get(id) || {
          id,
          name: "ユーザー",
          handle: "user",
          avatar: "🧑‍💻",
        }
    );
  }

  async function loadDMConversations() {
    if (!dmConversationList || !currentUser) return;

    const { data, error } = await supabaseClient
      .from("messages")
      .select("id,from_user_id,to_user_id,content,created_at,is_read")
      .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01") {
        console.warn("messages テーブルが無いっぽい:", error.message);
      } else {
        console.error("messages load error:", error);
      }
      return;
    }

    // 相手ごとに最新メッセージを拾う
    const latestByPartner = new Map(); // partnerId -> dmRow
    data.forEach((dm) => {
      const partnerId =
        dm.from_user_id === currentUser.id ? dm.to_user_id : dm.from_user_id;
      const cur = latestByPartner.get(partnerId);
      if (!cur || new Date(dm.created_at) > new Date(cur.created_at)) {
        latestByPartner.set(partnerId, dm);
      }
    });

    const partnerIds = Array.from(latestByPartner.keys());
    const partnerProfiles = await getProfilesByIds(partnerIds);

    dmConversationList.innerHTML = "";
    partnerIds.forEach((pid, index) => {
      const prof = partnerProfiles[index];
      const dm = latestByPartner.get(pid);
      const item = document.createElement("div");
      item.className = "dm-conversation-item";
      item.dataset.partnerUid = pid;
      item.innerHTML = `
        <div class="dm-conv-avatar" data-profile-uid="${pid}">
          ${prof.avatar || "🧑‍💻"}
        </div>
        <div class="dm-conv-main">
          <div class="dm-conv-name">${escapeHTML(prof.name || "ユーザー")}</div>
          <div class="dm-conv-last">${escapeHTML(dm.content || "")}</div>
        </div>
        <div class="dm-conv-time">${formatTime(dm.created_at)}</div>
      `;
      dmConversationList.appendChild(item);
    });
  }

  async function loadDMThread(partnerId) {
    if (!dmMessagesBox || !currentUser) return;

    const { data, error } = await supabaseClient
      .from("messages")
      .select("id,from_user_id,to_user_id,content,created_at,is_read,read_at")
      .or(
        `and(from_user_id.eq.${currentUser.id},to_user_id.eq.${partnerId}),and(from_user_id.eq.${partnerId},to_user_id.eq.${currentUser.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("dm thread load error:", error);
      return;
    }

    dmMessagesBox.innerHTML = "";
    data.forEach((dm) => {
      const div = document.createElement("div");
      div.className =
        "dm-message " +
        (dm.from_user_id === currentUser.id ? "me" : "other");
      div.innerHTML = `
        <div class="dm-message-text">${escapeHTML(dm.content)}</div>
        <div class="dm-message-time">${formatTime(dm.created_at)}</div>
      `;
      dmMessagesBox.appendChild(div);
    });

    dmMessagesBox.scrollTop = dmMessagesBox.scrollHeight;

    // ✅ スレッドを開いたら「相手→自分」の未読DMを既読にする（リアルタイム同期の起点）
    await supabaseClient
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("from_user_id", partnerId)
      .eq("to_user_id", currentUser.id)
      .eq("is_read", false);

    await refreshUnreadDMIndicator();
  }

  async function openDMWithUser(userId) {
    if (!currentUser || !dmLayout) {
      window.location.href = `messages.html?uid=${encodeURIComponent(userId)}`;
      return;
    }
    currentDMPartnerId = userId;
    const [prof] = await getProfilesByIds([userId]);

    if (dmPartnerNameEl) dmPartnerNameEl.textContent = prof.name || "ユーザー";
    if (dmPartnerHandleEl)
      dmPartnerHandleEl.textContent = "@" + (prof.handle || "user");
    if (dmPartnerAvatarEl)
      dmPartnerAvatarEl.textContent = prof.avatar || "🧑‍💻";

    await loadDMThread(userId);
    updateOnlineUI();
  }

  async function sendDM() {
    if (!currentUser || !currentDMPartnerId || !dmTextarea) return;
    const text = dmTextarea.value.trim();
    if (!text) return;

    const { error } = await supabaseClient.from("messages").insert({
      from_user_id: currentUser.id,
      to_user_id: currentDMPartnerId,
      content: text,
      is_read: false,
      read_at: null,
    });

    if (error) {
      console.error("dm insert error:", error);
      alert("DM送信に失敗した…😭");
      return;
    }

    dmTextarea.value = "";
    await loadDMThread(currentDMPartnerId);
    await loadDMConversations();
    await refreshUnreadDMIndicator();
  }

  if (dmSendBtn && dmTextarea) {
    dmSendBtn.addEventListener("click", sendDM);
  }

  if (dmTextarea) {
    dmTextarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendDM();
      }
    });
  }

  // =====================================
  // 通知
  // =====================================
  function renderNotificationsEmpty(msg = "通知はまだないよ🥺") {
    if (!notificationsContainer) return;
    notificationsContainer.innerHTML = `
      <div class="empty-state">
        <p>${escapeHTML(msg)}</p>
      </div>
    `;
  }

  function renderNotificationItem(n, actorProfile) {
    if (!notificationsContainer) return;

    const actorName = actorProfile?.name || "ユーザー";
    const actorHandle = actorProfile?.handle || "user";
    const actorAvatar = actorProfile?.avatar || "🧑‍💻";

    let icon = "🔔";
    let title = "通知";
    let body = "";
    let actionHTML = "";

    if (n.type === "like") {
      icon = "❤️";
      title = "いいね";
      body = "あなたの投稿にいいねしました";
      actionHTML = n.tweet_id
        ? `<a class="notif-link" href="index.html?t=${encodeURIComponent(n.tweet_id)}">投稿を見る</a>`
        : "";
    } else if (n.type === "reply") {
      icon = "💬";
      title = "返信";
      body = escapeHTML(n.content || "");
      actionHTML = n.tweet_id
        ? `<a class="notif-link" href="index.html?t=${encodeURIComponent(n.tweet_id)}">投稿を見る</a>`
        : "";
    } else if (n.type === "dm") {
      icon = "✉️";
      title = "メッセージ";
      body = escapeHTML(n.content || "");
      actionHTML = n.actor_id
        ? `<a class="notif-link" href="messages.html?uid=${encodeURIComponent(n.actor_id)}">開く</a>`
        : "";
    }

    const div = document.createElement("article");
    div.className = "post notif-item";
    div.innerHTML = `
      <div class="post-avatar" data-profile-uid="${escapeHTML(n.actor_id)}">${actorAvatar}</div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name" data-profile-uid="${escapeHTML(n.actor_id)}">${escapeHTML(actorName)}</span>
          <span class="post-handle" data-profile-uid="${escapeHTML(n.actor_id)}">@${escapeHTML(actorHandle)}</span>
          <span class="post-time">${formatTime(n.created_at)}</span>
        </div>
        <div class="post-text">
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:18px;">${icon}</span>
            <strong>${title}</strong>
          </div>
          <div style="margin-top:6px;">${body}</div>
        </div>
        <div class="post-footer">
          ${actionHTML}
        </div>
      </div>
    `;

    notificationsContainer.appendChild(div);
  }

  async function loadNotifications() {
    if (!notificationsContainer) return;

    if (!currentUser) {
      renderNotificationsEmpty("ログインすると通知が見れるよ🥺");
      return;
    }

    notificationsContainer.innerHTML = "";

    // ① 自分のツイートID一覧
    const { data: myTweets, error: myTweetsErr } = await supabaseClient
      .from("tweets")
      .select("id")
      .eq("user_id", currentUser.id);

    if (myTweetsErr) {
      console.error("my tweets load error:", myTweetsErr);
      renderNotificationsEmpty("通知の読み込みに失敗した…😭");
      return;
    }

    const myTweetIds = (myTweets || []).map((t) => t.id);

    // ② 返信（自分の投稿への返信）
    let replyNotifs = [];
    if (myTweetIds.length > 0) {
      const { data: replies, error: repliesErr } = await supabaseClient
        .from("tweet_replies")
        .select("id,tweet_id,user_id,content,created_at")
        .in("tweet_id", myTweetIds)
        .neq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (repliesErr && repliesErr.code !== "42P01") {
        console.error("notif replies load error:", repliesErr);
      } else if (replies) {
        replyNotifs = replies.map((r) => ({
          type: "reply",
          actor_id: r.user_id,
          tweet_id: r.tweet_id,
          content: r.content,
          created_at: r.created_at,
        }));
      }
    }

    // ③ いいね（自分の投稿へのいいね）
    let likeNotifs = [];
    if (myTweetIds.length > 0) {
      const { data: likes, error: likesErr } = await supabaseClient
        .from("tweet_likes")
        .select("tweet_id,user_id,created_at")
        .in("tweet_id", myTweetIds)
        .neq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (likesErr) {
        console.warn("notif likes load warn:", likesErr);
      } else if (likes) {
        likeNotifs = likes.map((l) => ({
          type: "like",
          actor_id: l.user_id,
          tweet_id: l.tweet_id,
          created_at: l.created_at,
        }));
      }
    }

    // ④ DM（自分宛ての最新）
    let dmNotifs = [];
    const { data: dms, error: dmsErr } = await supabaseClient
      .from("messages")
      .select("id,from_user_id,to_user_id,content,created_at")
      .eq("to_user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (dmsErr && dmsErr.code !== "42P01") {
      console.error("notif dm load error:", dmsErr);
    } else if (dms) {
      dmNotifs = dms.map((m) => ({
        type: "dm",
        actor_id: m.from_user_id,
        content: m.content,
        created_at: m.created_at,
      }));
    }

    // ⑤ まとめて新しい順にソート
    const all = [...replyNotifs, ...likeNotifs, ...dmNotifs]
      .filter((n) => n.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 60);

    if (all.length === 0) {
      renderNotificationsEmpty("通知はまだないよ🥺");
      return;
    }

    // ⑥ 相手プロフィールをまとめて取得して描画
    const actorIds = Array.from(new Set(all.map((n) => n.actor_id).filter(Boolean)));
    const actorProfiles = await getProfilesByIds(actorIds);
    const byId = new Map(actorProfiles.map((p) => [p.id, p]));

    all.forEach((n) => renderNotificationItem(n, byId.get(n.actor_id)));
  }

  // =====================================
  // プロフィール編集
  // =====================================

  function openEditProfileModal() {
    if (!currentUser || !currentProfile || !editProfileModal) return;
    editProfileNameInput.value = currentProfile.name || "";
    editProfileHandleInput.value = currentProfile.handle || "";
    editProfileAvatarInput.value = currentProfile.avatar || "";
    editProfileBioTextarea.value = currentProfile.bio || "";
    openModal(editProfileModal);
  }

  async function saveProfileChanges() {
    if (!currentUser) return;

    const name = editProfileNameInput.value.trim() || null;
    const handle = editProfileHandleInput.value.trim() || null;
    const avatar = editProfileAvatarInput.value.trim() || null;
    const bio = editProfileBioTextarea.value.trim() || null;

    const { error } = await supabaseClient
      .from("profiles")
      .upsert({
        id: currentUser.id,
        name,
        handle,
        avatar,
        bio,
      });

    if (error) {
      console.error("profile update error:", error);
      alert("プロフィール更新失敗した…😭");
      return;
    }

    currentProfile = { name, handle, avatar, bio };
    profilesCache.set(currentUser.id, { id: currentUser.id, ...currentProfile });
    applyUserUI(currentUser, currentProfile);
    closeModal(editProfileModal);
  }

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", openEditProfileModal);
  }
  if (closeEditProfileModalBtn) {
    closeEditProfileModalBtn.addEventListener("click", () =>
      closeModal(editProfileModal)
    );
  }
  if (editProfileSaveBtn) {
    editProfileSaveBtn.addEventListener("click", saveProfileChanges);
  }

  // プロフィールページで「DMする」ボタン
  if (dmFromProfileBtn) {
    dmFromProfileBtn.addEventListener("click", () => {
      const uid = dmFromProfileBtn.dataset.targetUid;
      if (!uid) return;
      openDMWithUser(uid);
    });
  }

  // =====================================
  // アイコン / 名前クリックでプロフィールへ
  // =====================================
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-profile-uid]");
    if (!target) return;
    const uid = target.dataset.profileUid;
    if (!uid) return;

    e.preventDefault();
    e.stopPropagation();

    window.location.href = `profile.html?uid=${encodeURIComponent(uid)}`;
  });

  // =====================================
  // ツイート内ボタン（返信 / いいね）のクリック委譲
  // =====================================
  document.addEventListener("click", (e) => {
    const replyBtn = e.target.closest(".reply-btn");
    if (replyBtn) {
      const tweetId = replyBtn.dataset.tweetId;
      if (tweetId) openReplyUI(tweetId);
      return;
    }

    const likeBtn = e.target.closest(".like-btn");
    if (likeBtn) {
      const tweetId = likeBtn.dataset.tweetId;
      if (tweetId) toggleLike(tweetId, likeBtn);
      return;
    }
  });

  // =====================================
  // プロフィールページで別ユーザーを表示
  // =====================================
  async function loadProfilePage() {
    const params = new URLSearchParams(location.search);
    const uidParam = params.get("uid");
    const targetUserId = uidParam || currentUser?.id;
    if (!targetUserId) return;

    // 自分のページかどうかでボタン切り替え
    if (editProfileBtn) {
      editProfileBtn.style.display =
        currentUser && targetUserId === currentUser.id ? "inline-flex" : "none";
    }
    if (dmFromProfileBtn) {
      dmFromProfileBtn.style.display =
        currentUser && targetUserId !== currentUser.id ? "inline-flex" : "none";
      dmFromProfileBtn.dataset.targetUid = targetUserId;
    }

    // プロフィール情報
    const { data: prof, error } = await supabaseClient
      .from("profiles")
      .select("id,name,handle,avatar,bio")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!error && prof) {
      profilesCache.set(targetUserId, prof);
      if (profileNameEl) profileNameEl.textContent = prof.name || "ユーザー";
      if (profileHandleEl)
        profileHandleEl.textContent = "@" + (prof.handle || "user");
      if (profileBioEl)
        profileBioEl.textContent =
          prof.bio || "プロフィールはまだ書かれていません";
      if (profileAvatarEl)
        profileAvatarEl.textContent = prof.avatar || "🧑‍💻";
    }

    // そのユーザーのツイート
    if (profileTweetsContainer) {
      const { data: tweets, error: tErr } = await supabaseClient
        .from("tweets")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (tErr) {
        console.error("profile tweets load error:", tErr);
        return;
      }

      profileTweetsContainer.innerHTML = "";
      const ids = (tweets || []).map((t) => t.id);

      // いいね集計
      let likesByTweet = new Map();
      let likedByMe = new Set();
      if (ids.length > 0) {
        const { data: likes } = await supabaseClient
          .from("tweet_likes")
          .select("tweet_id,user_id")
          .in("tweet_id", ids);
        if (likes) {
          likes.forEach((l) => {
            const arr = likesByTweet.get(l.tweet_id) || [];
            arr.push(l.user_id);
            likesByTweet.set(l.tweet_id, arr);
            if (currentUser && l.user_id === currentUser.id) {
              likedByMe.add(l.tweet_id);
            }
          });
        }
      }

      (tweets || []).forEach((t) => {
        const article = document.createElement("article");
        article.className = "post";
        article.dataset.tweetId = t.id;

        const name = t.name || "ユーザー";
        const handle = t.handle || "user";
        const avatar = t.avatar || "🧑‍💻";
        const likeUsers = likesByTweet.get(t.id) || [];

        article.innerHTML = `
          <div class="post-avatar" data-profile-uid="${t.user_id}">
            ${avatar}
          </div>
          <div class="post-body">
            <div class="post-header">
              <span class="post-name" data-profile-uid="${t.user_id}">${escapeHTML(name)}</span>
              <span class="post-handle" data-profile-uid="${t.user_id}">@${escapeHTML(handle)}</span>
              <span class="post-time">${formatTime(t.created_at)}</span>
            </div>
            <div class="post-text">${escapeHTML(t.content || "")}</div>
            <div class="post-footer">
              <button class="icon-btn reply-btn" data-tweet-id="${t.id}">返信</button>
              <button class="icon-btn like-btn" data-tweet-id="${t.id}">
                <span class="like-icon">${likedByMe.has(t.id) ? "♥" : "♡"}</span>
                <span class="like-count">${likeUsers.length}</span>
              </button>
            </div>
            <div class="replies" data-tweet-id="${t.id}"></div>
          </div>
        `;

        profileTweetsContainer.appendChild(article);
      });

      // 返信もつける
      if (ids.length > 0) {
        const { data: replies, error: rErr } = await supabaseClient
          .from("tweet_replies")
          .select("*")
          .in("tweet_id", ids)
          .order("created_at", { ascending: true });

        if (!rErr && replies) {
          replies.forEach(renderReply);
        }
      }
    }
  }

  // =====================================
  // ページ別初期化
  // =====================================

  // 1) 認証読み込み
  await loadAuthState();

  // 2) リアルタイム＆未読＆Presence（ログインしてる時だけ動く）
  subscribeMessagesRealtime();
  setupPresence();
  await refreshUnreadDMIndicator();

  // 3) ページごとの読み込み
  try {
    if (pageType === "home") {
      await loadTweetsFromDB();
    } else if (pageType === "profile") {
      await loadProfilePage();
    } else if (pageType === "messages") {
      if (dmLayout && currentUser) {
        await loadDMConversations();
        const params = new URLSearchParams(location.search);
        const qUid = params.get("uid");
        if (qUid) await openDMWithUser(qUid);
      }
    } else if (pageType === "notifications") {
      await loadNotifications();
    }
  } catch (e) {
    console.error("page init error:", e);
  }

  // DM一覧クリック
  if (dmConversationList) {
    dmConversationList.addEventListener("click", (e) => {
      const item = e.target.closest(".dm-conversation-item");
      if (!item) return;
      const pid = item.dataset.partnerUid;
      if (!pid) return;
      openDMWithUser(pid);
    });
  }
});
