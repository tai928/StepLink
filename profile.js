// ==============================
// Supabase 初期化（たい専用）
// ==============================
const SUPABASE_URL = "https://ngtthuwmqdcxgddlbsyo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YJzguO8nmmVKURa58cKwVw__9ulKxI6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// HTML エスケープ用
function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// yyyy-mm-ddTHH:MM:SS → mm/dd HH:MM
function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}

// URL の ?uid= を取る
function getUidFromQuery() {
  const params = new URLSearchParams(location.search);
  return params.get("uid");
}

// ==============================
// メイン処理
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  const profileAvatarEl = document.querySelector(".profile-avatar");
  const profileNameEl = document.getElementById("profileName");
  const profileHandleEl = document.getElementById("profileHandle");
  const profileBioEl = document.querySelector(".profile-bio");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const messageBtn = document.getElementById("messageBtn"); // メッセージボタン（あれば）
  const profileTweetsContainer = document.getElementById("profileTweetsContainer");

  // どのユーザーのプロフか決める
  let viewingUid = getUidFromQuery(); // 他人を見るときは ?uid=xxx
  let currentUser = null;

  // まずログインユーザー取得
  {
    const { data, error } = await supabaseClient.auth.getUser();
    if (!error && data.user) {
      currentUser = data.user;
    }
  }

  // uid が無いときは「自分のプロフ」
  if (!viewingUid) {
    if (!currentUser) {
      // 未ログイン
      if (profileNameEl) profileNameEl.textContent = "ログインしていません";
      if (profileHandleEl) profileHandleEl.textContent = "";
      if (profileBioEl) profileBioEl.textContent = "ログインするとプロフィールが見られます";
      if (editProfileBtn) editProfileBtn.style.display = "none";
      if (messageBtn) messageBtn.style.display = "none";
      return;
    }
    viewingUid = currentUser.id;
  }

  // ==========================
  // プロフィール情報取得
  // ==========================
  let profileRow = null;
  {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id,name,handle,avatar,bio")
      .eq("id", viewingUid)
      .maybeSingle();

    if (!error && data) {
      profileRow = data;
    }
  }

  // profiles テーブルに行が無くても、一応何かしら表示する
  const name =
    profileRow?.name ||
    currentUser?.user_metadata?.name ||
    "ユーザー";
  const handle =
    profileRow?.handle ||
    currentUser?.user_metadata?.handle ||
    "user";
  const avatar =
    profileRow?.avatar ||
    currentUser?.user_metadata?.avatar ||
    "🧑‍💻";
  const bio =
    profileRow?.bio ||
    "Bioが未設定です";

  if (profileAvatarEl) profileAvatarEl.textContent = avatar;
  if (profileNameEl) profileNameEl.textContent = name;
  if (profileHandleEl) profileHandleEl.textContent = "@" + handle;
  if (profileBioEl) profileBioEl.textContent = bio;

  // ==========================
  // ボタンの表示 / 非表示
  // ==========================
  const isMe = currentUser && currentUser.id === viewingUid;

  // 編集ボタン：自分の時だけ
  if (editProfileBtn) {
    if (isMe) {
      editProfileBtn.style.display = "inline-flex";
    } else {
      editProfileBtn.style.display = "none";
    }
  }

  // メッセージボタン：自分以外の時だけ
  if (messageBtn) {
    if (isMe) {
      messageBtn.style.display = "none";
    } else {
      messageBtn.style.display = "inline-flex";
      messageBtn.addEventListener("click", () => {
        // DM 画面に uid を渡して遷移
        location.href = `messages.html?uid=${encodeURIComponent(viewingUid)}`;
      });
    }
  }

  // ==========================
  // そのユーザーのツイート一覧
  // ==========================
  if (profileTweetsContainer) {
    const { data: tweets, error } = await supabaseClient
      .from("tweets")
      .select("*")
      .eq("user_id", viewingUid)
      .order("created_at", { ascending: false })
      .limit(50);

    profileTweetsContainer.innerHTML = "";

    if (!error && tweets && tweets.length) {
      tweets.forEach((t) => {
        const article = document.createElement("article");
        article.className = "post";
        article.innerHTML = `
          <div class="post-avatar">${avatar}</div>
          <div class="post-body">
            <div class="post-header">
              <span class="post-name">${escapeHtml(name)}</span>
              <span class="post-handle">@${escapeHtml(handle)}</span>
              <span class="post-time">${formatTime(t.created_at)}</span>
            </div>
            <div class="post-text">${escapeHtml(t.content)}</div>
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
