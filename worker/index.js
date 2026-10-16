const COOKIE = "wuu_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const USERNAME_RE = /^[A-Za-z0-9_]{1,32}$/;
const encoder = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}
function fail(message, status = 400) { return json({ error: message }, status); }
function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const part = raw.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return part ? part.slice(name.length + 1) : "";
}
function cookieHeader(value, maxAge = SESSION_SECONDS) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function digest(value) {
  const result = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(result)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function passwordHash(password, salt = randomToken(16)) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  // Cloudflare Workers Web Crypto currently caps PBKDF2 at 100,000 iterations.
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return { salt, hash: [...new Uint8Array(bits)].map(x => x.toString(16).padStart(2, "0")).join("") };
}
async function constantTimeEqual(a, b) {
  const [x, y] = await Promise.all([digest(String(a || "")), digest(String(b || ""))]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
async function body(request) {
  try { return await request.json(); } catch { return null; }
}
function requireSameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}
async function currentUser(request, env) {
  const raw = cookieValue(request, COOKIE);
  if (!raw) return null;
  return env.DB.prepare(`SELECT u.id, u.username, u.nickname, u.role, u.banned
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>?`).bind(await digest(raw), Math.floor(Date.now() / 1000)).first();
}
function safeUser(user) {
  return user ? { id: user.id, username: user.username, nickname: user.nickname, role: user.role, banned: !!user.banned } : null;
}
async function needUser(request, env) {
  const user = await currentUser(request, env);
  if (!user) return { response: fail("请先登录。", 401) };
  if (user.banned) return { response: fail("此账户已被封禁。", 403) };
  return { user };
}
async function needAdmin(request, env) {
  const auth = await needUser(request, env);
  if (auth.response) return auth;
  if (auth.user.role !== "superadmin") return { response: fail("需要超级管理员权限。", 403) };
  return auth;
}
function validString(s, min, max) { return typeof s === "string" && s.trim().length >= min && s.trim().length <= max; }
function normalizeRecord(kind, record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  if (kind === "entry") {
    if (!validString(record.w, 1, 80) || typeof record.r !== "string" || typeof record.i !== "string" || !Array.isArray(record.d) || !Array.isArray(record.x) || record.d.some(x => typeof x !== "string") || record.x.some(x => typeof x !== "string")) return null;
    return { w: record.w, r: record.r, i: record.i, d: record.d, x: record.x, m: Number.isFinite(record.m) ? record.m : 0, ct: Array.isArray(record.ct) ? record.ct.map(String) : [] };
  }
  if (kind === "char") {
    if (!validString(record.c, 1, 8) || typeof record.r !== "string" || typeof record.ipa !== "string" || !Array.isArray(record.d) || !Array.isArray(record.g) || record.d.some(x => typeof x !== "string") || (record.x !== undefined && (!Array.isArray(record.x) || record.x.some(x => typeof x !== "string"))) || record.g.some(g => !Array.isArray(g) || typeof g[0] !== "string" || !Array.isArray(g[1]) || g[1].some(n => !Number.isInteger(n)))) return null;
    return { c: record.c, r: record.r, ipa: record.ipa, d: record.d, x: Array.isArray(record.x) ? record.x : [], g: record.g, ...(record.m === undefined ? {} : { m: Number(record.m) || 0 }) };
  }
  return null;
}
async function handleApi(request, env) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", "access-control-allow-headers": "content-type,x-bootstrap-key" } });
  if (method !== "GET" && !requireSameOrigin(request)) return fail("跨来源请求已拒绝。", 403);

  if (path === "/api/dictionary" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT kind, record_key, data FROM dictionary_edits").all();
    return json({ edits: results.map(row => ({ kind: row.kind, key: row.record_key, data: JSON.parse(row.data) })) });
  }
  if (path === "/api/register" && method === "POST") {
    const input = await body(request);
    if (!input || !USERNAME_RE.test(input.username || "")) return fail("用户名须为 1–32 位英文字母、数字或下划线。 ");
    if (!validString(input.nickname, 1, 48)) return fail("昵称不能为空，且最多 48 个字符。 ");
    if (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128) return fail("密码须为 8–128 个字符。 ");
    if (!env.REGISTRATION_INVITE_CODE) return fail("注册邀请码尚未配置。", 503);
    if (!await constantTimeEqual(input.inviteCode, env.REGISTRATION_INVITE_CODE)) return fail("邀请码无效。", 403);
    const taken = await env.DB.prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE").bind(input.username).first();
    if (taken) return fail("用户名已被使用。", 409);
    const { salt, hash } = await passwordHash(input.password);
    const result = await env.DB.prepare("INSERT INTO users (username,nickname,password_salt,password_hash,role,created_at) VALUES (?,?,?,?, 'user',?)")
      .bind(input.username, input.nickname.trim(), salt, hash, Math.floor(Date.now() / 1000)).run();
    const userId = result.meta.last_row_id;
    const token = randomToken();
    await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await digest(token), userId, Math.floor(Date.now() / 1000) + SESSION_SECONDS).run();
    return json({ user: { id: userId, username: input.username, nickname: input.nickname.trim(), role: "user", banned: false } }, 201, { "set-cookie": cookieHeader(token) });
  }
  if (path === "/api/login" && method === "POST") {
    const input = await body(request);
    if (!input || typeof input.username !== "string" || typeof input.password !== "string") return fail("请输入用户名与密码。");
    const user = await env.DB.prepare("SELECT id,username,nickname,role,banned,password_salt,password_hash FROM users WHERE username=? COLLATE NOCASE").bind(input.username).first();
    if (!user || user.banned) return fail("用户名或密码错误，或账户已被封禁。", 401);
    const computed = await passwordHash(input.password, user.password_salt);
    if (!await constantTimeEqual(computed.hash, user.password_hash)) return fail("用户名或密码错误。", 401);
    const token = randomToken();
    await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await digest(token), user.id, Math.floor(Date.now() / 1000) + SESSION_SECONDS).run();
    return json({ user: safeUser(user) }, 200, { "set-cookie": cookieHeader(token) });
  }
  if (path === "/api/logout" && method === "POST") {
    const raw = cookieValue(request, COOKIE);
    if (raw) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(raw)).run();
    return json({ ok: true }, 200, { "set-cookie": cookieHeader("", 0) });
  }
  if (path === "/api/me" && method === "GET") {
    const auth = await needUser(request, env);
    if (auth.response) return json({ user: null });
    return json({ user: safeUser(auth.user) });
  }
  if (path === "/api/unread" && method === "GET") {
    const auth = await needUser(request, env);
    if (auth.response) return json({ count: 0 });
    const row = auth.user.role === "superadmin"
      ? await env.DB.prepare("SELECT COUNT(*) AS n FROM messages m JOIN threads t ON t.id=m.thread_id WHERE t.archived=0 AND m.sender_id!=? AND m.is_read=0").bind(auth.user.id).first()
      : await env.DB.prepare("SELECT COUNT(*) AS n FROM messages m JOIN threads t ON t.id=m.thread_id WHERE t.user_id=? AND m.sender_id!=? AND m.is_read=0").bind(auth.user.id, auth.user.id).first();
    return json({ count: row?.n || 0 });
  }
  if (path === "/api/feedback" && method === "POST") {
    const auth = await needUser(request, env); if (auth.response) return auth.response;
    const input = await body(request);
    if (!input || !validString(input.text, 1, 5000)) return fail("反馈内容不能为空，最多 5000 个字符。 ");
    const targetType = ["entry", "char"].includes(input.targetType) ? input.targetType : null;
    const targetValue = targetType && validString(input.targetValue, 1, 120) ? input.targetValue.trim() : null;
    const result = await env.DB.prepare("INSERT INTO threads (user_id,subject,target_type,target_value,created_at,updated_at) VALUES (?,?,?,?,?,?)")
      .bind(auth.user.id, (input.subject || "用户反馈").slice(0, 120), targetType, targetValue, Date.now(), Date.now()).run();
    const threadId = result.meta.last_row_id;
    await env.DB.prepare("INSERT INTO messages (thread_id,sender_id,body,created_at,is_read) VALUES (?,?,?,?,0)")
      .bind(threadId, auth.user.id, input.text.trim(), Date.now()).run();
    return json({ threadId }, 201);
  }
  if (path === "/api/threads" && method === "GET") {
    const auth = await needUser(request, env); if (auth.response) return auth.response;
    const sql = auth.user.role === "superadmin"
      ? `SELECT t.id,t.subject,t.target_type,t.target_value,t.updated_at,u.id AS user_id,u.username,u.nickname,
          (SELECT body FROM messages WHERE thread_id=t.id ORDER BY id DESC LIMIT 1) AS preview,
          (SELECT created_at FROM messages WHERE thread_id=t.id ORDER BY id DESC LIMIT 1) AS last_message_at,
          (SELECT COUNT(*) FROM messages m WHERE m.thread_id=t.id AND m.sender_id!=? AND m.is_read=0) AS unread
        FROM threads t JOIN users u ON u.id=t.user_id WHERE t.archived=0 ORDER BY t.updated_at DESC LIMIT 250`
      : `SELECT t.id,t.subject,t.target_type,t.target_value,t.updated_at,u.id AS user_id,u.username,u.nickname,
          (SELECT body FROM messages WHERE thread_id=t.id ORDER BY id DESC LIMIT 1) AS preview,
          (SELECT created_at FROM messages WHERE thread_id=t.id ORDER BY id DESC LIMIT 1) AS last_message_at,
          (SELECT COUNT(*) FROM messages m WHERE m.thread_id=t.id AND m.sender_id!=? AND m.is_read=0) AS unread
        FROM threads t JOIN users u ON u.id=t.user_id WHERE t.user_id=? AND t.archived=0 ORDER BY t.updated_at DESC LIMIT 250`;
    const { results } = auth.user.role === "superadmin" ? await env.DB.prepare(sql).bind(auth.user.id).all() : await env.DB.prepare(sql).bind(auth.user.id, auth.user.id).all();
    return json({ threads: results });
  }
  const threadMatch = path.match(/^\/api\/threads\/(\d+)(?:\/messages)?$/);
  if (threadMatch && method === "GET") {
    const auth = await needUser(request, env); if (auth.response) return auth.response;
    const threadId = Number(threadMatch[1]);
    const thread = await env.DB.prepare("SELECT t.*,u.username,u.nickname FROM threads t JOIN users u ON u.id=t.user_id WHERE t.id=? AND t.archived=0").bind(threadId).first();
    if (!thread || (auth.user.role !== "superadmin" && thread.user_id !== auth.user.id)) return fail("找不到此对话。", 404);
    await env.DB.prepare("UPDATE messages SET is_read=1 WHERE thread_id=? AND sender_id!=?").bind(threadId, auth.user.id).run();
    const { results } = await env.DB.prepare("SELECT m.id,m.sender_id,m.body,m.created_at,u.username,u.nickname,u.role FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.thread_id=? ORDER BY m.id").bind(threadId).all();
    return json({ thread: { id: thread.id, subject: thread.subject, targetType: thread.target_type, targetValue: thread.target_value, user: { id: thread.user_id, username: thread.username, nickname: thread.nickname } }, messages: results });
  }
  if (threadMatch && method === "POST") {
    const auth = await needUser(request, env); if (auth.response) return auth.response;
    const threadId = Number(threadMatch[1]), input = await body(request);
    const thread = await env.DB.prepare("SELECT id,user_id FROM threads WHERE id=? AND archived=0").bind(threadId).first();
    if (!thread || (auth.user.role !== "superadmin" && thread.user_id !== auth.user.id)) return fail("找不到此对话。", 404);
    if (!input || !validString(input.text, 1, 5000)) return fail("回复不能为空，最多 5000 个字符。 ");
    await env.DB.prepare("INSERT INTO messages (thread_id,sender_id,body,created_at,is_read) VALUES (?,?,?,?,0)").bind(threadId, auth.user.id, input.text.trim(), Date.now()).run();
    await env.DB.prepare("UPDATE threads SET updated_at=? WHERE id=?").bind(Date.now(), threadId).run();
    return json({ ok: true }, 201);
  }
  if (path === "/api/admin/bootstrap" && method === "POST") {
    if (!env.BOOTSTRAP_ADMIN_KEY) return fail("尚未设置管理员初始化密钥。", 503);
    const key = request.headers.get("X-Bootstrap-Key") || "", input = await body(request);
    if (!await constantTimeEqual(key, env.BOOTSTRAP_ADMIN_KEY)) return fail("初始化密钥无效。", 403);
    const existing = await env.DB.prepare("SELECT id FROM users WHERE role='superadmin' LIMIT 1").first();
    if (existing) return fail("超级管理员已初始化；此接口已关闭。", 409);
    if (!input || !USERNAME_RE.test(input.username || "")) return fail("请先注册账户，并提供其用户名。 ");
    const result = await env.DB.prepare("UPDATE users SET role='superadmin' WHERE username=? COLLATE NOCASE").bind(input.username).run();
    if (!result.meta.changes) return fail("找不到该用户名，请先注册。", 404);
    return json({ ok: true });
  }
  if (path === "/api/admin/users" && method === "GET") {
    const auth = await needAdmin(request, env); if (auth.response) return auth.response;
    const { results } = await env.DB.prepare("SELECT id,username,nickname,role,banned,created_at FROM users ORDER BY id").all();
    return json({ users: results });
  }
  if (path === "/api/admin/users" && method === "POST") {
    const auth = await needAdmin(request, env); if (auth.response) return auth.response;
    const input = await body(request);
    if (!input || !Number.isInteger(input.id)) return fail("用户编号无效。");
    const target = await env.DB.prepare("SELECT id,role FROM users WHERE id=?").bind(input.id).first();
    if (!target) return fail("找不到用户。", 404);
    if (target.role === "superadmin" && target.id !== auth.user.id) return fail("不能修改其他超级管理员账户。", 403);
    if ((input.action === "ban" || input.action === "unban") && target.role === "superadmin") return fail("不能封禁超级管理员账户。", 403);
    if (input.action === "ban" || input.action === "unban") {
      await env.DB.prepare("UPDATE users SET banned=? WHERE id=?").bind(input.action === "ban" ? 1 : 0, input.id).run();
      if (input.action === "ban") await env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(input.id).run();
      return json({ ok: true });
    }
    if (input.action === "edit") {
      if (!USERNAME_RE.test(input.username || "") || !validString(input.nickname, 1, 48)) return fail("用户名或昵称格式无效。");
      const clash = await env.DB.prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE AND id!=?").bind(input.username, input.id).first();
      if (clash) return fail("用户名已被使用。", 409);
      if (input.password && (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128)) return fail("新密码须为 8–128 个字符。");
      await env.DB.prepare("UPDATE users SET username=?,nickname=? WHERE id=?").bind(input.username, input.nickname.trim(), input.id).run();
      if (input.password) {
        const { salt, hash } = await passwordHash(input.password);
        await env.DB.prepare("UPDATE users SET password_salt=?,password_hash=? WHERE id=?").bind(salt, hash, input.id).run();
        await env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(input.id).run();
      }
      return json({ ok: true });
    }
    return fail("不支持的操作。");
  }
  if (path === "/api/admin/dictionary" && method === "POST") {
    const auth = await needAdmin(request, env); if (auth.response) return auth.response;
    const input = await body(request);
    if (!input || !["entry", "char"].includes(input.kind) || !validString(input.key, 1, 160)) return fail("词典记录标识无效。");
    const record = normalizeRecord(input.kind, input.record);
    if (!record) return fail("词典记录格式不正确，未保存。");
    await env.DB.prepare("INSERT INTO dictionary_edits (kind,record_key,data,updated_by,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(kind,record_key) DO UPDATE SET data=excluded.data,updated_by=excluded.updated_by,updated_at=excluded.updated_at")
      .bind(input.kind, input.key, JSON.stringify(record), auth.user.id, Date.now()).run();
    return json({ ok: true });
  }
  return fail("未找到 API。", 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await handleApi(request, env); }
      catch (error) {
        console.error(JSON.stringify({ event: "api_error", path: url.pathname, message: String(error?.message || error) }));
        return fail("服務暫時無法處理請求，請稍後再試。", 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
