// lyric_widget.js (remote main script)
// 功能：每日主题 + 每次随机一句（数据来自 GitHub lyrics_bank.json）
// 支持：accessoryRectangular / systemSmall / systemMedium / systemLarge
// 参数：jay/mayday/eason -> 固定主题；空/random -> 每天随机主题

const fm = FileManager.local();
const dir = fm.documentsDirectory();

// ✅ 你的歌词库地址（固定）
const BANK_URL = "https://raw.githubusercontent.com/marrylily/share/main/bank/lyrics_bank.json";

const CACHE_DIR = fm.joinPath(dir, "lyrics_cache");
if (!fm.fileExists(CACHE_DIR)) fm.createDirectory(CACHE_DIR);

const BANK_CACHE_FILE = fm.joinPath(CACHE_DIR, "lyrics_bank_cache.json");
const META_FILE = fm.joinPath(CACHE_DIR, "lyrics_bank_meta.json");
const STATE_FILE = fm.joinPath(CACHE_DIR, "lyrics_state.json");

const FETCH_TIMEOUT = 6;
const MIN_FETCH_INTERVAL_HOURS = 6;

function readJson(path, fallback) {
  try {
    if (!fm.fileExists(path)) return fallback;
    return JSON.parse(fm.readString(path));
  } catch {
    return fallback;
  }
}
function writeJson(path, obj) {
  try {
    fm.writeString(path, JSON.stringify(obj, null, 2));
  } catch {}
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
function hourKey() {
  return new Date().toISOString().slice(0, 13);
}

async function fetchRemoteBankIfNeeded() {
  const meta = readJson(META_FILE, { lastFetchAt: 0 });
  const now = Date.now();
  const minMs = MIN_FETCH_INTERVAL_HOURS * 60 * 60 * 1000;
  if (now - (meta.lastFetchAt || 0) < minMs) return null;

  try {
    const url = `${BANK_URL}?v=${encodeURIComponent(hourKey())}`;
    const req = new Request(url);
    req.timeoutInterval = FETCH_TIMEOUT;
    req.headers = { "Cache-Control": "no-cache" };
    const json = await req.loadJSON();
    if (!json || typeof json !== "object") throw new Error("invalid bank");
    writeJson(BANK_CACHE_FILE, json);
    writeJson(META_FILE, { lastFetchAt: now, lastUrl: url });
    return json;
  } catch (e) {
    writeJson(META_FILE, { lastFetchAt: now, lastError: String(e) });
    return null;
  }
}

async function loadBank() {
  const remote = await fetchRemoteBankIfNeeded();
  if (remote) return remote;
  return readJson(BANK_CACHE_FILE, {});
}

async function getData() {
  const bank = await loadBank();
  const keys = Object.keys(bank).filter((k) => bank[k]?.lines?.length);
  if (!keys.length) {
    return { themeName: "未配置", lockscreenLine: "（歌词库为空 / 远程拉取失败）" };
  }

  const param = String(args?.widgetParameter || "").trim();
  const state = readJson(STATE_FILE, {});
  const day = todayKey();

  let themeKey = "";
  if (param && param !== "random" && bank[param]) {
    themeKey = param;
  } else {
    if (state?.dayKey === day && state?.themeKey && bank[state.themeKey]) {
      themeKey = state.themeKey;
    } else {
      themeKey = pickRandom(keys);
    }
  }

  const theme = bank[themeKey];
  const lines = cleanLines(theme?.lines || []);
  const chosen = lines.length ? pickRandom(lines) : "（该主题歌词为空）";

  writeJson(STATE_FILE, {
    dayKey: day,
    themeKey,
    themeName: theme?.name || themeKey,
    updatedAt: Date.now(),
  });

  return { themeName: theme?.name || themeKey, lockscreenLine: chosen };
}

// ==============================
// 渲染不同尺寸
// ==============================
function renderAccessoryRectangular(data) {
  const w = new ListWidget();
  w.setPadding(8, 10, 8, 10);

  const top = w.addStack();
  top.layoutHorizontally();
  const t1 = top.addText(`🎵 ${data.themeName}`);
  t1.font = Font.systemFont(12);
  t1.textOpacity = 0.75;

  top.addSpacer();
  const badge = top.addText("抽卡");
  badge.font = Font.systemFont(11);
  badge.textOpacity = 0.5;

  w.addSpacer(4);

  const line = w.addText(data.lockscreenLine);
  line.font = Font.boldSystemFont(14);
  line.lineLimit = 2;

  return w;
}

function renderSystemSmall(data) {
  const w = new ListWidget();
  w.setPadding(12, 12, 12, 12);
  const title = w.addText(`🎵 ${data.themeName}`);
  title.font = Font.systemFont(12);
  title.textOpacity = 0.8;

  w.addSpacer(8);

  const line = w.addText(data.lockscreenLine);
  line.font = Font.boldSystemFont(13);
  line.lineLimit = 5;
  return w;
}

function renderSystemMedium(data) {
  const w = new ListWidget();
  w.setPadding(14, 14, 14, 14);

  const title = w.addText(`🎵 今日主题：${data.themeName}`);
  title.font = Font.boldSystemFont(14);

  w.addSpacer(8);

  const line = w.addText(data.lockscreenLine);
  line.font = Font.systemFont(14);
  line.lineLimit = 4;

  return w;
}

function renderSystemLarge(data) {
  const w = new ListWidget();
  w.setPadding(16, 16, 16, 16);

  const title = w.addText(`🎵 今日主题：${data.themeName}`);
  title.font = Font.boldSystemFont(16);

  w.addSpacer(10);

  const line = w.addText(data.lockscreenLine);
  line.font = Font.systemFont(16);
  line.lineLimit = 8;

  w.addSpacer();

  const tip = w.addText("提示：参数填 jay/mayday/eason 可固定卡池");
  tip.font = Font.systemFont(11);
  tip.textOpacity = 0.6;

  return w;
}

(async () => {
  const data = await getData();

  let w;
  const family = config.widgetFamily || "systemSmall";
  if (family === "accessoryRectangular") w = renderAccessoryRectangular(data);
  else if (family === "systemSmall") w = renderSystemSmall(data);
  else if (family === "systemMedium") w = renderSystemMedium(data);
  else if (family === "systemLarge") w = renderSystemLarge(data);
  else {
    w = new ListWidget();
    w.addText("未适配").font = Font.boldSystemFont(14);
  }

  Script.setWidget(w);
  Script.complete();
})();
