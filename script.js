// =====================================
// Supabase 初期化
// =====================================
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  // =====================================
  // 状態
  // =====================================
  const page = document.body?.dataset?.page || "home";
  let currentUser = null;
  let currentProfile = null;

  let currentDMPartnerId = null;
  const profilesCache = new Map(); // id -> profile

  let rtChannel = null;
  let presenceChannel = null;
  let onlineSet = new Set();

  // =====================================
  // DOM helpers
  // =====================================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  // 共通
  const tweetsContainer =
    byId("tweetsContainer") ||
    byId("timelinePosts") ||
    byId("postsContainer") ||
    (page === "home" ? document.querySelector("main.timeline .posts") : null);

  const profileTweetsContainer = byId("profileTweetsContainer");
  const notificationsContainer = byId("notificationsContainer");

  // アカウント表示
  const currentUserNameEl = byId("currentUserName");
  const currentUserHandleEl = byId("currentUserHandle");
  const currentUserAvatarEl = byId("currentUserAvatar");

  // アカウントモーダル
  const accountModal = byId("accountModal");
  const switchAccountBtn = byId("switchAccountBtn");
  const switchAccountBtnMobile = byId("switchAccountBtnMobile");
  const closeAccountModalBtn = byId("closeAccountModalBtn");

  const accountTabs = $$(".account-tab");
  const accountLoginView = byId("accountLoginView");
  const accountRegisterView = byId("accountRegisterView");

  // 登録/ログイン
  const regNameInput = byId("regNameInput");
  const regHandleInput = byId("regHandleInput");
  const regEmailInput = byId("regEmailInput");
  const regAvatarInput = byId("regAvatarInput");
  const regPasswordInput = byId("regPasswordInput");
  const registerError = byId("registerError");
  const registerSubmitBtn = byId("registerSubmitBtn");

  const loginHandleInput = byId("loginHandleInput");
  const loginPasswordInput = byId("loginPasswordInput");
  const loginError = byId("loginError");
  const loginSubmitBtn = byId("loginSubmitBtn");

  const logoutBtn = byId("logoutBtn");

  // ツイート投稿
  const tweetInput = byId("tweetInput");
  const charCounter = byId("charCounter");
  const imageSelectBtn = byId("imageSelectBtn");
  const imageInput = byId("imageInput");
  const imagePreview = byId("imagePreview");
  const postTweetBtn = byId("postTweetBtn");

  // 返信モーダル（任意）
  const replyModal = byId("replyModal");
  const replyTextarea = byId("replyTextarea");
  const replyCharCounter = byId("replyCharCounter");
  const replySubmitBtn = byId("replySubmitBtn");
  const replyCancelBtn = byId("replyCancelBtn");
  let replyingTweetId = null;

  // プロフィール
  const profileNameEl = byId("profileName");
  const profileHandleEl = byId("profileHandle");
  const profileBioEl = byId("profileBio") || $(".profile-bio");
  const profileAvatarEl = byId("profileAvatar") || $(".profile-avatar");
  const editProfileBtn = byId("editProfileBtn");
  const dmFromProfileBtn = byId("dmFromProfileBtn");

  // プロフィール編集（IDがページで違うことがあるので両対応）
  const editProfileModal = byId("editProfileModal");
  const closeEditProfileModalBtn =
    byId("closeEditProfileModalBtn") || byId("closeEditProfileModal");
  const editProfileNameInput = byId("editProfileName") || byId("editNameInput");
  const editProfileHandleInput =
    byId("editProfileHandle") || byId("editHandleInput");
  const editProfileAvatarInput =
    byId("editProfileAvatar") || byId("editAvatarInput");
  const editProfileBioTextarea = byId("editProfileBio") || byId("editBioInput");
  const editProfileSaveBtn = byId("editProfileSaveBtn") || byId("saveProfileBtn");

  // DM
  const dmLayout = $(".dm-layout");
  const dmConversationList = $(".dm-conversation-list") || byId("dmConversations");
  const dmMessagesBox = $(".dm-messages") || byId("dmMessages");
  const dmTextarea = byId("dmInput");
  const dmSendBtn = byId("dmSendBtn");
  const dmPartnerNameEl = byId("dmPartnerName");
  const dmPartnerHandleEl = byId("dmPartnerHandle");
  const dmPartnerAvatarEl = byId("dmPartnerAvatar");

  // =====================================
  // Utils
  // =====================================
  const escapeHTML = (str) =>
    String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  function updateCounter(input, counter) {
    if (!input || !counter) return;
    counter.textContent = `${input.value.length} / 140`;
  }

  function applyUserUI(user, profile) {
    const name =
      profile?.name ||
      user?.user_metadata?.name ||
      (user ? "ユーザー" : "未ログイン");
    const handle =
      profile?.handle || user?.user_metadata?.handle || (user ? "user" : "");
    const avatar = profile?.avatar || user?.user_metadata?.avatar || "🧑‍💻";
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
  // Auth / Profile load
  // =====================================
  async function loadAuthState() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
      console.error("getUser error:", error);
      currentUser = null;
      currentProfile = null;
      applyUserUI(null, null);
      return;
    }
    if (!data?.user) {
      currentUser = null;
      currentProfile = null;
      applyUserUI(null, null);
      return;
    }

    currentUser = data.user;

    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id,name,handle,avatar,bio")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      console.warn("profiles load warn:", profileError);
    }

    currentProfile = profileData || null;
    if (currentProfile) profilesCache.set(currentUser.id, currentProfile);
    applyUserUI(currentUser, currentProfile);
  }

  // =====================================
  // Account modal
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
      options: { data: { name, handle, avatar } },
    });

    if (error) {
      console.error("signUp error:", error);
      if (registerError) {
        if (error.message?.includes("User already registered")) {
          registerError.textContent = "このメールは登録済み。ログインしてね。";
          switchAccountTab("login");
        } else {
          registerError.textContent = error.message;
        }
      }
      return;
    }

    const user = data?.user;
    if (user) {
      const { error: profileErr } = await supabaseClient.from("profiles").upsert({
        id: user.id,
        name,
        handle,
        avatar,
      });
      if (profileErr) console.warn("profiles upsert warn:", profileErr);
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

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("signIn error:", error);
      if (loginError) loginError.textContent = error.message;
      return;
    }
    location.reload();
  }

  // =====================================
  // Profiles cache
  // =====================================
  async function getProfilesByIds(ids) {
    const unique = Array.from(new Set((ids || []).filter(Boolean)));
    const missing = unique.filter((id) => !profilesCache.has(id));

    if (missing.length > 0) {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id,name,handle,avatar,bio")
        .in("id", missing);

      if (!error && data) data.forEach((p) => profilesCache.set(p.id, p));
    }

    return unique.map(
      (id) =>
        profilesCache.get(id) || {
          id,
          name: "ユーザー",
          handle: "user",
          avatar: "🧑‍💻",
          bio: "",
        }
    );
  }

  // =====================================
  // Tweets (Home)
  // =====================================
  function renderTweet(row, options = {}) {
    if (!tweetsContainer) return;

    const article = document.createElement("article");
    article.className = "post";
    article.dataset.tweetId = row.id;

    const name = row.name || "ユーザー";
    const handle = row.handle || "user";
    const avatar = row.avatar || "🧑‍💻";
    const isMine = currentUser && row.user_id === currentUser.id;

    article.innerHTML = `
      <div class="post-avatar" data-profile-uid="${escapeHTML(row.user_id)}">${escapeHTML(avatar)}</div>
      <div class="post-body">
        <div class="post-header">
          <span class="post-name" data-profile-uid="${escapeHTML(row.user_id)}">${escapeHTML(name)}</span>
          <span class="post-handle" data-profile-uid="${escapeHTML(row.user_id)}">@${escapeHTML(handle)}</span>
          <span class="post-time">${formatTime(row.created_at)}</span>
        </div>
        <div class="post-text">${escapeHTML(row.content || "")}</div>
        <div class="post-footer">
          <button class="icon-btn reply-btn" data-tweet-id="${row.id}">返信</button>
          <button class="icon-btn like-btn" data-tweet-id="${row.id}">
            <span class="like-icon">${options.likedByMe ? "♥" : "♡"}</span>
            <span class="like-count">${options.likeCount ?? 0}</span>
          </button>
          ${isMine ? `<button class="icon-btn delete-tweet-btn" data-tweet-id="${row.id}">削除</button>` : ""}
        </div>
        <div class="replies" data-tweet-id="${row.id}"></div>
      </div>
    `;
    tweetsContainer.appendChild(article);
  }

  function renderReply(replyRow) {
    const repliesBox = document.querySelector(`.replies[data-tweet-id="${replyRow.tweet_id}"]`);
    if (!repliesBox) return;

    const div = document.createElement("div");
    div.className = "reply-card";

    const name = replyRow.name || "ユーザー";
    const handle = replyRow.handle || "user";
    const avatar = replyRow.avatar || "🧑‍💻";

    div.innerHTML = `
      <div class="reply-avatar" data-profile-uid="${escapeHTML(replyRow.user_id)}">${escapeHTML(avatar)}</div>
      <div class="reply-body">
        <div class="reply-header">
          <span class="reply-name" data-profile-uid="${escapeHTML(replyRow.user_id)}">${escapeHTML(name)}</span>
          <span class="reply-handle" data-profile-uid="${escapeHTML(replyRow.user_id)}">@${escapeHTML(handle)}</span>
          <span class="reply-time">${formatTime(replyRow.created_at)}</span>
        </div>
        <div class="reply-text">${escapeHTML(replyRow.content || "")}</div>
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

    // likes
    const likesByTweet = new Map();
    const likedByMeSet = new Set();

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
          if (currentUser && l.user_id === currentUser.id) likedByMeSet.add(l.tweet_id);
        }
      }
    }

    // render tweets
    tweets.forEach((t) => {
      const likeUsers = likesByTweet.get(t.id) || [];
      renderTweet(t, {
        likeCount: likeUsers.length,
        likedByMe: likedByMeSet.has(t.id),
      });
    });

    // replies
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
    if (replies) replies.forEach(renderReply);
  }

  async function createTweet(text) {
    if (!currentUser) {
      alert("ログインしてから投稿してね🥺");
      return;
    }

    const name = currentProfile?.name || currentUser.user_metadata?.name || "ユーザー";
    const handle = currentProfile?.handle || currentUser.user_metadata?.handle || "user";
    const avatar = currentProfile?.avatar || currentUser.user_metadata?.avatar || "🧑‍💻";

    const { error } = await supabaseClient.from("tweets").insert({
      user_id: currentUser.id,
      name,
      handle,
      avatar,
      content: text,
    });

    if (error) {
      console.error("tweet insert error:", error);
      alert("投稿に失敗しちゃった…😭");
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

  // ✅ 投稿削除
  async function deleteTweet(tweetId) {
    if (!currentUser) return;

    const ok = confirm("この投稿を削除する？（元に戻せない）");
    if (!ok) return;

    // 外部キーCASCADEが無い場合の保険
    await supabaseClient.from("tweet_likes").delete().eq("tweet_id", tweetId);
    await supabaseClient.from("tweet_replies").delete().eq("tweet_id", tweetId);

    const { error } = await supabaseClient
      .from("tweets")
      .delete()
      .eq("id", tweetId)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("delete tweet error:", error);
      alert("削除できなかった…😭（RLS/権限を確認して）");
      return;
    }

    if (page === "home") await loadTweetsFromDB();
    if (page === "profile") await loadProfilePage();
  }

  // =====================================
  // Reply UI
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
      if (text && text.trim()) handleReplySubmit(tweetId, text.trim());
    }
  }

  async function handleReplySubmit(tweetId, textFromModal) {
    if (!currentUser) {
      alert("ログインしてから返信してね🥺");
      return;
    }

    const text = textFromModal ?? replyTextarea?.value?.trim() ?? "";
    if (!text) return;
    if (text.length > 140) {
      alert("140文字までだよ🥺");
      return;
    }

    const name = currentProfile?.name || currentUser.user_metadata?.name || "ユーザー";
    const handle = currentProfile?.handle || currentUser.user_metadata?.handle || "user";
    const avatar = currentProfile?.avatar || currentUser.user_metadata?.avatar || "🧑‍💻";

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

  // =====================================
  // Like
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
        countSpan.textContent = String(n + 1);
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
        countSpan.textContent = String(Math.max(0, n - 1));
      }
    }
  }

  // =====================================
  // DM 既読（重要）
  // =====================================
  async function markThreadAsRead(partnerId) {
    if (!currentUser || !partnerId) return;

    // 自分が受け取った(相手→自分) 未読だけ既読化
    const { error } = await supabaseClient
      .from("messages")
      .update({ is_read: true })
      .eq("to_user_id", currentUser.id)
      .eq("from_user_id", partnerId)
      .eq("is_read", false);

    if (error) {
      // RLSでupdate許可してないとここで死ぬ
      console.warn("markThreadAsRead warn:", error);
      return;
    }

    await refreshUnreadDMIndicator();
  }

  // =====================================
  // DM
  // =====================================
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

    // partnerごとに最新
    const latestByPartner = new Map();
    (data || []).forEach((dm) => {
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

      const isActive = currentDMPartnerId && pid === currentDMPartnerId;
      const isUnreadFromPartner =
        dm &&
        dm.to_user_id === currentUser.id &&
        dm.from_user_id === pid &&
        dm.is_read === false;

      const item = document.createElement("div");
      item.className = "dm-conversation-item" + (isActive ? " active" : "");
      item.dataset.partnerUid = pid;

      // 未読なら●（CSSは好きに）
      const unreadDot = isUnreadFromPartner
        ? `<span class="dm-unread-dot" style="display:inline-block;width:8px;height:8px;border-radius:99px;background:var(--green-main);margin-left:6px;"></span>`
        : "";

      item.innerHTML = `
        <div class="dm-conv-avatar" data-profile-uid="${escapeHTML(pid)}">${escapeHTML(prof.avatar || "🧑‍💻")}</div>
        <div class="dm-conv-main">
          <div class="dm-conv-name">${escapeHTML(prof.name || "ユーザー")}${unreadDot}</div>
          <div class="dm-conv-last">${escapeHTML(dm?.content || "")}</div>
        </div>
        <div class="dm-conv-time">${formatTime(dm?.created_at)}</div>
      `;
      dmConversationList.appendChild(item);
    });
  }

  function renderDMMessageRow(dm) {
    const isMe = dm.from_user_id === currentUser.id;
    const status = isMe ? (dm.is_read ? "既読" : "送信済み") : "";

    const div = document.createElement("div");
    div.className = "dm-message " + (isMe ? "me" : "other");

    // 自分のメッセージだけ status 表示
    div.innerHTML = `
      <div class="dm-message-text">${escapeHTML(dm.content || "")}</div>
      <div class="dm-message-time">
        ${formatTime(dm.created_at)}
        ${isMe ? `<span class="dm-message-status" style="margin-left:6px; font-size:11px; color:var(--text-sub);">${status}</span>` : ""}
      </div>
    `;
    return div;
  }

  async function loadDMThread(partnerId) {
    if (!dmMessagesBox || !currentUser) return;

    const { data, error } = await supabaseClient
      .from("messages")
      .select("id,from_user_id,to_user_id,content,created_at,is_read")
      .or(
        `and(from_user_id.eq.${currentUser.id},to_user_id.eq.${partnerId}),and(from_user_id.eq.${partnerId},to_user_id.eq.${currentUser.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("dm thread load error:", error);
      return;
    }

    dmMessagesBox.innerHTML = "";
    (data || []).forEach((dm) => dmMessagesBox.appendChild(renderDMMessageRow(dm)));
    dmMessagesBox.scrollTop = dmMessagesBox.scrollHeight;
  }

  async function openDMWithUser(userId) {
    if (!currentUser || !dmLayout) {
      window.location.href = `messages.html?uid=${encodeURIComponent(userId)}`;
      return;
    }
    currentDMPartnerId = userId;

    const [prof] = await getProfilesByIds([userId]);
    if (dmPartnerNameEl) dmPartnerNameEl.textContent = prof.name || "ユーザー";
    if (dmPartnerHandleEl) dmPartnerHandleEl.textContent = "@" + (prof.handle || "user");
    if (dmPartnerAvatarEl) dmPartnerAvatarEl.textContent = prof.avatar || "🧑‍💻";

    updateOnlineUI();

    // 先に既読化 → その後表示すると “既読” が即反映されやすい
    await markThreadAsRead(userId);
    await loadDMThread(userId);
    await loadDMConversations();
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

  function subscribeMessagesRealtime() {
    if (!currentUser) return;

    // 古いチャンネル掃除
    try {
      rtChannel?.unsubscribe?.();
    } catch (_) {}

    rtChannel = supabaseClient
      .channel("rt-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        async (payload) => {
          const row = payload.new || payload.old;
          if (!row) return;

          // messagesページで対象スレッドなら更新
          if (
            page === "messages" &&
            currentDMPartnerId &&
            ((row.from_user_id === currentUser.id && row.to_user_id === currentDMPartnerId) ||
              (row.from_user_id === currentDMPartnerId && row.to_user_id === currentUser.id))
          ) {
            // 相手→自分の新着が来たら、開いてるなら即既読化
            if (row.to_user_id === currentUser.id && row.from_user_id === currentDMPartnerId) {
              await markThreadAsRead(currentDMPartnerId);
            }

            await loadDMThread(currentDMPartnerId);
            await loadDMConversations();
          }

          await refreshUnreadDMIndicator();
        }
      )
      .subscribe();
  }

  function setupPresence() {
    if (!currentUser) return;

    try {
      presenceChannel?.unsubscribe?.();
    } catch (_) {}

    presenceChannel = supabaseClient.channel("presence-global", {
      config: { presence: { key: currentUser.id } },
    });

    presenceChannel.on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState?.() || {};
      onlineSet = new Set(Object.keys(state));
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
    const badge = byId("dmOnlineBadge");
    if (!badge || !currentDMPartnerId) return;
    badge.textContent = onlineSet.has(currentDMPartnerId) ? "オンライン" : "オフライン";
  }

  // 未読ドット（通知ベルの●）
  async function refreshUnreadDMIndicator() {
    const dot = byId("notifDot");
    if (!dot || !currentUser) return;

    const { count, error } = await supabaseClient
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("to_user_id", currentUser.id)
      .eq("is_read", false);

    if (!error) {
      dot.classList.toggle("show", (count || 0) > 0);
    }
  }

  // =====================================
  // Notifications
  // =====================================
  function renderNotificationsEmpty(msg = "通知はまだないよ🥺") {
    if (!notificationsContainer) return;
    notificationsContainer.innerHTML = `<div class="empty-state"><p>${escapeHTML(msg)}</p></div>`;
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
      <div class="post-avatar" data-profile-uid="${escapeHTML(n.actor_id)}">${escapeHTML(actorAvatar)}</div>
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
        <div class="post-footer">${actionHTML}</div>
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

    // 自分のツイートID
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

    // replies
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

    // likes（tweet_likesにcreated_atがある前提）
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

    // dm（自分宛て）
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

    const all = [...replyNotifs, ...likeNotifs, ...dmNotifs]
      .filter((n) => n.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 60);

    if (all.length === 0) {
      renderNotificationsEmpty("通知はまだないよ🥺");
      return;
    }

    const actorIds = Array.from(new Set(all.map((n) => n.actor_id).filter(Boolean)));
    const actorProfiles = await getProfilesByIds(actorIds);
    const byIdMap = new Map(actorProfiles.map((p) => [p.id, p]));

    all.forEach((n) => renderNotificationItem(n, byIdMap.get(n.actor_id)));
  }

  // =====================================
  // Profile page
  // =====================================
  async function loadProfilePage() {
    const params = new URLSearchParams(location.search);
    const uidParam = params.get("uid");
    const targetUserId = uidParam || currentUser?.id;
    if (!targetUserId) return;

    // 自分/他人でボタン
    if (editProfileBtn) {
      editProfileBtn.style.display =
        currentUser && targetUserId === currentUser.id ? "inline-flex" : "none";
    }
    if (dmFromProfileBtn) {
      dmFromProfileBtn.style.display =
        currentUser && targetUserId !== currentUser.id ? "inline-flex" : "none";
      dmFromProfileBtn.dataset.targetUid = targetUserId;
    }

    const { data: prof, error } = await supabaseClient
      .from("profiles")
      .select("id,name,handle,avatar,bio")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!error && prof) {
      profilesCache.set(targetUserId, prof);
      if (profileNameEl) profileNameEl.textContent = prof.name || "ユーザー";
      if (profileHandleEl) profileHandleEl.textContent = "@" + (prof.handle || "user");
      if (profileBioEl)
        profileBioEl.textContent = prof.bio || "プロフィールはまだ書かれていません";
      if (profileAvatarEl) profileAvatarEl.textContent = prof.avatar || "🧑‍💻";
    }

    if (!profileTweetsContainer) return;

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

    // likes summary
    const likesByTweet = new Map();
    const likedByMe = new Set();

    if (ids.length > 0) {
      const { data: likes } = await supabaseClient
        .from("tweet_likes")
        .select("tweet_id,user_id")
        .in("tweet_id", ids);

      (likes || []).forEach((l) => {
        const arr = likesByTweet.get(l.tweet_id) || [];
        arr.push(l.user_id);
        likesByTweet.set(l.tweet_id, arr);
        if (currentUser && l.user_id === currentUser.id) likedByMe.add(l.tweet_id);
      });
    }

    (tweets || []).forEach((t) => {
      const article = document.createElement("article");
      article.className = "post";
      article.dataset.tweetId = t.id;

      const name = t.name || "ユーザー";
      const handle = t.handle || "user";
      const avatar = t.avatar || "🧑‍💻";
      const likeUsers = likesByTweet.get(t.id) || [];
      const isMine = currentUser && t.user_id === currentUser.id;

      article.innerHTML = `
        <div class="post-avatar" data-profile-uid="${escapeHTML(t.user_id)}">${escapeHTML(avatar)}</div>
        <div class="post-body">
          <div class="post-header">
            <span class="post-name" data-profile-uid="${escapeHTML(t.user_id)}">${escapeHTML(name)}</span>
            <span class="post-handle" data-profile-uid="${escapeHTML(t.user_id)}">@${escapeHTML(handle)}</span>
            <span class="post-time">${formatTime(t.created_at)}</span>
          </div>
          <div class="post-text">${escapeHTML(t.content || "")}</div>
          <div class="post-footer">
            <button class="icon-btn reply-btn" data-tweet-id="${t.id}">返信</button>
            <button class="icon-btn like-btn" data-tweet-id="${t.id}">
              <span class="like-icon">${likedByMe.has(t.id) ? "♥" : "♡"}</span>
              <span class="like-count">${likeUsers.length}</span>
            </button>
            ${isMine ? `<button class="icon-btn delete-tweet-btn" data-tweet-id="${t.id}">削除</button>` : ""}
          </div>
          <div class="replies" data-tweet-id="${t.id}"></div>
        </div>
      `;
      profileTweetsContainer.appendChild(article);
    });

    // replies render
    if (ids.length > 0) {
      const { data: replies, error: rErr } = await supabaseClient
        .from("tweet_replies")
        .select("*")
        .in("tweet_id", ids)
        .order("created_at", { ascending: true });

      if (!rErr && replies) replies.forEach(renderReply);
    }
  }

  // =====================================
  // Profile edit
  // =====================================
  function openEditProfileModal() {
    if (!currentUser || !editProfileModal) return;

    const prof = currentProfile || profilesCache.get(currentUser.id) || {};
    if (editProfileNameInput) editProfileNameInput.value = prof.name || "";
    if (editProfileHandleInput) editProfileHandleInput.value = prof.handle || "";
    if (editProfileAvatarInput) editProfileAvatarInput.value = prof.avatar || "";
    if (editProfileBioTextarea) editProfileBioTextarea.value = prof.bio || "";

    openModal(editProfileModal);
  }

  async function saveProfileChanges() {
    if (!currentUser) return;

    const name = editProfileNameInput?.value?.trim() || null;
    const handle = editProfileHandleInput?.value?.trim() || null;
    const avatar = editProfileAvatarInput?.value?.trim() || null;
    const bio = editProfileBioTextarea?.value?.trim() || null;

    const { error } = await supabaseClient.from("profiles").upsert({
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

    currentProfile = { id: currentUser.id, name, handle, avatar, bio };
    profilesCache.set(currentUser.id, currentProfile);
    applyUserUI(currentUser, currentProfile);
    closeModal(editProfileModal);
  }

  // =====================================
  // Global click handlers
  // =====================================
  document.addEventListener("click", (e) => {
    // profile jump
    const profTarget = e.target.closest("[data-profile-uid]");
    if (profTarget) {
      const uid = profTarget.dataset.profileUid;
      if (uid) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `profile.html?uid=${encodeURIComponent(uid)}`;
      }
      return;
    }

    // reply
    const replyBtn = e.target.closest(".reply-btn");
    if (replyBtn) {
      const tweetId = replyBtn.dataset.tweetId;
      if (tweetId) openReplyUI(tweetId);
      return;
    }

    // like
    const likeBtn = e.target.closest(".like-btn");
    if (likeBtn) {
      const tweetId = likeBtn.dataset.tweetId;
      if (tweetId) toggleLike(tweetId, likeBtn);
      return;
    }

    // delete tweet
    const delBtn = e.target.closest(".delete-tweet-btn");
    if (delBtn) {
      const tweetId = delBtn.dataset.tweetId;
      if (tweetId) deleteTweet(tweetId);
      return;
    }
  });

  // =====================================
  // Init wiring
  // =====================================
  async function init() {
    // account modal wiring
    if (switchAccountBtn && accountModal)
      switchAccountBtn.addEventListener("click", () => openModal(accountModal));
    if (switchAccountBtnMobile && accountModal)
      switchAccountBtnMobile.addEventListener("click", () => openModal(accountModal));
    if (closeAccountModalBtn)
      closeAccountModalBtn.addEventListener("click", () => closeModal(accountModal));

    accountTabs.forEach((tab) => {
      tab.addEventListener("click", () => switchAccountTab(tab.dataset.mode));
    });

    if (registerSubmitBtn) registerSubmitBtn.addEventListener("click", handleRegister);
    if (loginSubmitBtn) loginSubmitBtn.addEventListener("click", handleLogin);

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        location.href = "index.html";
      });
    }

    // counters
    if (tweetInput && charCounter) {
      updateCounter(tweetInput, charCounter);
      tweetInput.addEventListener("input", () => updateCounter(tweetInput, charCounter));
    }

    if (replyTextarea && replyCharCounter) {
      replyTextarea.addEventListener("input", () => updateCounter(replyTextarea, replyCharCounter));
    }
    if (replySubmitBtn) {
      replySubmitBtn.addEventListener("click", () => {
        if (!replyingTweetId) return;
        handleReplySubmit(replyingTweetId);
      });
    }
    if (replyCancelBtn) replyCancelBtn.addEventListener("click", () => closeModal(replyModal));

    // image preview (optional)
    if (imageSelectBtn && imageInput && imagePreview) {
      imageSelectBtn.addEventListener("click", () => imageInput.click());
      imageInput.addEventListener("change", () => {
        const file = imageInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          imagePreview.innerHTML = "";
          const img = document.createElement("img");
          img.src = ev.target.result;
          imagePreview.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
    }

    // post tweet
    if (postTweetBtn && tweetInput) {
      postTweetBtn.addEventListener("click", () =>
        handlePostFrom(tweetInput, charCounter, imagePreview)
      );
    }

    // profile edit
    if (editProfileBtn) editProfileBtn.addEventListener("click", openEditProfileModal);
    if (closeEditProfileModalBtn)
      closeEditProfileModalBtn.addEventListener("click", () => closeModal(editProfileModal));
    if (editProfileSaveBtn) editProfileSaveBtn.addEventListener("click", saveProfileChanges);

    // profile DM button
    if (dmFromProfileBtn) {
      dmFromProfileBtn.addEventListener("click", () => {
        const uid = dmFromProfileBtn.dataset.targetUid;
        if (uid) openDMWithUser(uid);
      });
    }

    // DM send
    if (dmSendBtn && dmTextarea) dmSendBtn.addEventListener("click", sendDM);
    if (dmTextarea) {
      dmTextarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendDM();
        }
      });
    }

    // DM conversation click
    if (dmConversationList) {
      dmConversationList.addEventListener("click", (e) => {
        const item = e.target.closest(".dm-conversation-item");
        if (!item) return;
        const pid = item.dataset.partnerUid;
        if (pid) openDMWithUser(pid);
      });
    }

    // auth load
    await loadAuthState();

    // realtime + presence + unread dot
    subscribeMessagesRealtime();
    setupPresence();
    await refreshUnreadDMIndicator();

    // page init
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
        await loadNotifications();
      }
    } catch (e) {
      console.error("page init error:", e);
    }
  }

  init();
});
