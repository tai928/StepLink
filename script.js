// =====================================
// Supabase 初期化
// =====================================
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {

  // ---- emergency stubs (temporary) ----
async function initHome(){ try { await loadTweetsFromDB?.(); } catch(e){ console.error(e); } }
async function initMessages(){}
async function initNotifications(){}
async function initProfile(){ try { await loadProfilePage?.(); } catch(e){ console.error(e); } }
// -------------------------------------
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

  await loadAuthState();

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
          <span class="post-name" data-profile-uid="${row.user_id}">${name}</span>
          <span class="post-handle" data-profile-uid="${row.user_id}">@${handle}</span>
          <span class="post-time">${formatTime(row.created_at)}</span>
        </div>
        <div class="post-text">${row.content || ""}</div>
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
          <span class="reply-name" data-profile-uid="${replyRow.user_id}">${name}</span>
          <span class="reply-handle" data-profile-uid="${replyRow.user_id}">@${handle}</span>
          <span class="reply-time">${formatTime(replyRow.created_at)}</span>
        </div>
        <div class="reply-text">${replyRow.content}</div>
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
    // ★ ここでモーダルが用意されているか確認し、なければ prompt にフォールバック
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

    // 即時反映
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
      .select("id,from_user_id,to_user_id,content,created_at")
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
          <div class="dm-conv-name">${prof.name || "ユーザー"}</div>
          <div class="dm-conv-last">${dm.content}</div>
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
      .select("id,from_user_id,to_user_id,content,created_at")
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
        <div class="dm-message-text">${dm.content}</div>
        <div class="dm-message-time">${formatTime(dm.created_at)}</div>
      `;
      dmMessagesBox.appendChild(div);
    });

    dmMessagesBox.scrollTop = dmMessagesBox.scrollHeight;
  }

  async function openDMWithUser(userId) {
    if (!currentUser || !dmLayout) {
      // DM ページ以外なら messages.html に飛ばす
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
  }

  async function sendDM() {
    if (!currentUser || !currentDMPartnerId || !dmTextarea) return;
    const text = dmTextarea.value.trim();
    if (!text) return;

    const { error } = await supabaseClient.from("messages").insert({
      from_user_id: currentUser.id,
      to_user_id: currentDMPartnerId,
      content: text,
    });

    if (error) {
      console.error("dm insert error:", error);
      alert("DM送信に失敗した…😭");
      return;
    }

    dmTextarea.value = "";
    await loadDMThread(currentDMPartnerId);
    await loadDMConversations();
  }

  if (dmSendBtn && dmTextarea) {
    dmSendBtn.addEventListener("click", sendDM);
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

    // ★ 修正ポイント：
    // aタグなどの中にあっても通知ページに飛ばされないように、
    // デフォルトのリンク遷移を止める
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
  // DM一覧（messages.html を開いた時）
  // =====================================
  if (dmLayout && currentUser) {
    await loadDMConversations();

    // URL に ?uid=xxx があれば、その人との DM を開く
    const params = new URLSearchParams(location.search);
    const qUid = params.get("uid");
    if (qUid) {
      openDMWithUser(qUid);
    }
  }

  if (dmConversationList) {
    dmConversationList.addEventListener("click", (e) => {
      const item = e.target.closest(".dm-conversation-item");
      if (!item) return;
      const pid = item.dataset.partnerUid;
      if (!pid) return;
      openDMWithUser(pid);
    });
  }

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
      const ids = tweets.map((t) => t.id);

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

      tweets.forEach((t) => {
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
              <span class="post-name" data-profile-uid="${t.user_id}">${name}</span>
              <span class="post-handle" data-profile-uid="${t.user_id}">@${handle}</span>
              <span class="post-time">${formatTime(t.created_at)}</span>
            </div>
            <div class="post-text">${t.content || ""}</div>
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

  // =====================================
  // ページ別初期化
  // =====================================
  const page = document.body.dataset.page || "home";

  try {
    if (page === "home") {
      await loadTweetsFromDB();
    } else if (page === "profile") {
      await loadProfilePage();
    } else if (page === "messages") {
      if (dmLayout && currentUser) {
        await loadDMConversations();
        const params = new URLSearchParams(location.search);
        const qUid = params.get("uid");
        if (qUid) await openDMWithUser(qUid);
      }
    } else if (page === "notifications") {
      if (notificationsContainer) {
        notificationsContainer.innerHTML = "<p>通知は準備中🥺</p>";
      }
    }
  } catch (e) {
    console.error("page init error:", e);
  }


});
