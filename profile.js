// ==============================
// Supabase 初期化
// ==============================
// supabaseClient.js
// ★ 自分の Supabase 設定に合わせてね
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ==============================
// 小物関数
// ==============================
function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}

function getUidFromQuery() {
  const params = new URLSearchParams(location.search);
  return params.get("uid");
}

// ==============================
// メイン
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  // ------- DOM 取得 -------
  const currentUserAvatarEl = document.getElementById("currentUserAvatar");
  const currentUserNameEl = document.getElementById("currentUserName");
  const currentUserHandleEl = document.getElementById("currentUserHandle");
  const logoutButton = document.getElementById("logoutButton");

  const profileAvatarEl = document.querySelector(".profile-avatar");
  const profileNameEl = document.getElementById("profileName");
  const profileHandleEl = document.getElementById("profileHandle");
  const profileBioEl = document.querySelector(".profile-bio");
  const messageBtn = document.getElementById("messageBtn");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const profileTweetsContainer = document.getElementById("profileTweetsContainer");

  // ------- ログインユーザー取得 -------
  let currentUser = null;
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (!userError && userData.user) {
    currentUser = userData.user;
  }

  // 左下の「自分のアカウント表示」
  if (currentUser) {
    // プロフィールテーブルから自分の表示名などを取る
    let myProfile = null;
    const { data: myProf, error: myProfErr } = await supabaseClient
      .from("profiles")
      .select("name,handle,avatar")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (!myProfErr && myProf) myProfile = myProf;

    const myName =
      myProfile?.name || currentUser.user_metadata?.name || "ユーザー";
    const myHandle =
      myProfile?.handle || currentUser.user_metadata?.handle || "user";
    const myAvatar =
      myProfile?.avatar || currentUser.user_metadata?.avatar || "🧑‍💻";

    if (currentUserAvatarEl) currentUserAvatarEl.textContent = myAvatar;
    if (currentUserNameEl) currentUserNameEl.textContent = myName;
    if (currentUserHandleEl) currentUserHandleEl.textContent = "@" + myHandle;
  }

  // ログアウト
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      location.href = "index.html";
    });
  }

  // ------- どのユーザーのプロフィールを見るか決定 -------
  let viewingUid = getUidFromQuery(); // ?uid= があればその人
  if (!viewingUid && currentUser) {
    // なければ自分
    viewingUid = currentUser.id;
  }

  // 未ログイン ＆ uid なし → 何もできない
  if (!viewingUid) {
    if (profileNameEl) profileNameEl.textContent = "ログインしていません";
    if (profileHandleEl) profileHandleEl.textContent = "";
    if (profileBioEl) profileBioEl.textContent = "ログインするとプロフィールが見られます。";
    if (editProfileBtn) editProfileBtn.style.display = "none";
    if (messageBtn) messageBtn.style.display = "none";
    return;
  }

  // ------- 表示対象ユーザーのプロフィール取得 -------
  let targetProfile = null;
  const { data: profData, error: profErr } = await supabaseClient
    .from("profiles")
    .select("id,name,handle,avatar,bio")
    .eq("id", viewingUid)
    .maybeSingle();

  if (!profErr && profData) {
    targetProfile = profData;
  }

  // プロフィールが無い場合でも user_metadata から頑張る
  const isMe = currentUser && currentUser.id === viewingUid;

  const displayName =
    targetProfile?.name ||
    (isMe ? (currentUser.user_metadata?.name || "ユーザー") : "ユーザー");

  const displayHandle =
    targetProfile?.handle ||
    (isMe ? (currentUser.user_metadata?.handle || "user") : "user");

  const displayAvatar =
    targetProfile?.avatar ||
    (isMe ? (currentUser.user_metadata?.avatar || "🧑‍💻") : "🧑‍💻");

  const displayBio =
    targetProfile?.bio ||
    (isMe ? "プロフィールはまだ書かれていません" : "Bioが未設定です");

  // DOM に反映
  if (profileAvatarEl) profileAvatarEl.textContent = displayAvatar;
  if (profileNameEl) profileNameEl.textContent = displayName;
  if (profileHandleEl) profileHandleEl.textContent = "@" + displayHandle;
  if (profileBioEl) profileBioEl.textContent = displayBio;

  // ------- ボタンの出し分け -------
  if (editProfileBtn) {
    editProfileBtn.style.display = isMe ? "inline-flex" : "none";
  }

  if (messageBtn) {
    if (!isMe) {
      messageBtn.style.display = "inline-flex";
      messageBtn.addEventListener("click", () => {
        // DM 画面に uid を渡して開く
        location.href = `messages.html?uid=${encodeURIComponent(viewingUid)}`;
      });
    } else {
      messageBtn.style.display = "none";
    }
  }

  // ------- そのユーザーのツイート一覧 -------
  if (profileTweetsContainer) {
    const { data: tweets, error: tweetsErr } = await supabaseClient
      .from("tweets")
      .select("*")
      .eq("user_id", viewingUid)
      .order("created_at", { ascending: false })
      .limit(50);

    profileTweetsContainer.innerHTML = "";

    if (!tweetsErr && tweets && tweets.length) {
      tweets.forEach((t) => {
        const article = document.createElement("article");
        article.className = "post";
        article.innerHTML = `
          <div class="post-avatar">${displayAvatar}</div>
          <div class="post-body">
            <div class="post-header">
              <span class="post-name">${escapeHtml(displayName)}</span>
              <span class="post-handle">@${escapeHtml(displayHandle)}</span>
              <span class="post-time">${formatTime(t.created_at)}</span>
            </div>
            <div class="post-text">${escapeHtml(t.content || "")}</div>
          </div>
        `;
        profileTweetsContainer.appendChild(article);
      });
    } else {
      const p = document.createElement("p");
      p.style.padding = "12px 20px";
      p.style.fontSize = "14px";
      p.style.color = "#777";
      p.textContent = "ツイートはまだありません";
      profileTweetsContainer.appendChild(p);
    }
  }
});
