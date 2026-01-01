// lyric_widget.js (REMOTE, SINGLE FILE, NO IMPORTS)
// For Scripting runtime (NOT Scriptable)

const BANK_URL = "https://raw.githubusercontent.com/marrylily/share/main/bank/lyrics_bank.json";

// ========= util: safe storage =========
// 你们的 scripting 通常会有 Storage / Keychain / local cache 的能力
// 这里用一个最通用的方式：如果 Storage 不存在就退化为内存（无缓存）
function getStore() {
  // 优先尝试 Scripting 自带的 Storage
  if (typeof Storage !== "undefined") return Storage;
  // 其次尝试 Keychain（有些环境提供）
  if (typeof Keychain !== "undefined") {
    return {
      get: (k) => (Keychain.contains(k) ? Keychain.get(k) : null),
      set: (k, v) => Keychain.set(k, String(v)),
    };
  }
  // 最后退化：无持久化
  return {
    get: () => null,
    set: () => {},
  };
}

const store = getStore();

function nowISOHour() {
  return new Date().toISOString().slice(0, 13);
}
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function cleanLines(lines) {
  return (lines || [])
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .filter((s) => s.length >= 4 && !/^\W+$/.test(s));
}

async function fetchJson(url, timeoutSec = 6) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutSec * 1000);
  const resp = await fetch(url, { signal: controller.signal, cache: "no-store" });
  clearTimeout(t);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

// ========= remote bank with cache =========
const BANK_CACHE_KEY = "__lyrics_bank_cache__";
const BANK_META_KEY = "__lyrics_bank_meta__";
const MIN_FETCH_HOURS = 6;

async function loadBank() {
  const metaRaw = store.get(BANK_META_KEY);
  let meta = {};
  try { meta = metaRaw ? JSON.parse(metaRaw) : {}; } catch {}

  const now = Date.now();
  const lastFetchAt = meta.lastFetchAt || 0;
  const minMs = MIN_FETCH_HOURS * 60 * 60 * 1000;

  // 需要拉取？
  if (now - lastFetchAt >= minMs) {
    try {
      const url = `${BANK_URL}?v=${encodeURIComponent(nowISOHour())}`;
      const bank = await fetchJson(url, 6);
      store.set(BANK_CACHE_KEY, JSON.stringify(bank));
      store.set(BANK_META_KEY, JSON.stringify({ lastFetchAt: now, lastUrl: url }));
      return bank;
    } catch (e) {
      store.set(BANK_META_KEY, JSON.stringify({ lastFetchAt: now, lastError: String(e) }));
      // 拉取失败 -> 用缓存
    }
  }

  // fallback：缓存
  const cached = store.get(BANK_CACHE_KEY);
  try {
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

// ========= daily theme + random line =========
const STATE_KEY = "__lyrics_state__";

async function getDailyLine() {
  const bank = await loadBank();
  const keys = Object.keys(bank || {}).filter((k) => bank[k]?.lines?.length);

  if (!keys.length) {
    return { themeName: "未配置", line: "（歌词库为空 / 拉取失败）" };
  }

  const param = String(Widget?.parameter || "").trim(); // 你环境里叫 Widget.parameter
  const day = todayKey();

  let state = {};
  try {
    const raw = store.get(STATE_KEY);
    state = raw ? JSON.parse(raw) : {};
  } catch {}

  let themeKey;
  if (param && param !== "random" && bank[param]) {
    themeKey = param;
  } else {
    if (state.dayKey === day && state.themeKey && bank[state.themeKey]) {
      themeKey = state.themeKey;
    } else {
      themeKey = pickRandom(keys);
    }
  }

  const theme = bank[themeKey];
  const lines = cleanLines(theme?.lines || []);
  const chosen = lines.length ? pickRandom(lines) : "（该主题歌词为空）";

  store.set(
    STATE_KEY,
    JSON.stringify({
      dayKey: day,
      themeKey,
      themeName: theme?.name || themeKey,
      updatedAt: Date.now(),
    }),
  );

  return { themeName: theme?.name || themeKey, line: chosen };
}

// ========= render =========
async function main() {
  const data = await getDailyLine();

  const family = Widget.family; // systemSmall / systemMedium / accessoryRectangular ...
  // 你工程里有 JSX 组件也行，但这里我们直接用 Text 简化，保证 100% 跑通
  // 如果你想用 JSX，我们下一步再升级到 bundle 方案

  const line = `${data.themeName}\n${data.line}`;

  Widget.present(
    <Text>{line}</Text>
  );
}

// 必须挂到 global，给 Loader 调用
globalThis.__remoteMain__ = main;
