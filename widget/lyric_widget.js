// lyric_logic.js (REMOTE PURE JS)
// 必须：纯 JS、无 import、无 JSX、无 TS 类型
// 输出：globalThis.__getLyricText__() 返回 { title, body }

const BANK_URL = "https://raw.githubusercontent.com/marrylily/share/main/bank/lyrics_bank.json";

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

async function fetchJson(url, timeoutSec) {
  timeoutSec = timeoutSec || 6;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutSec * 1000);
  const resp = await fetch(url, { signal: controller.signal, cache: "no-store" });
  clearTimeout(t);
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return await resp.json();
}

// 远程脚本内部也可以做缓存，但为了兼容性我们把缓存留给本地 Loader
async function getDailyLine(param, cachedState) {
  const bank = await fetchJson(`${BANK_URL}?v=${encodeURIComponent(nowISOHour())}`, 6);
  const keys = Object.keys(bank || {}).filter((k) => bank[k] && bank[k].lines && bank[k].lines.length);

  if (!keys.length) return { themeName: "未配置", line: "（歌词库为空 / 拉取失败）" };

  const day = todayKey();
  let themeKey = "";

  if (param && param !== "random" && bank[param]) {
    themeKey = param;
  } else {
    // 今天主题固定：state 里有就用，没有就随机
    if (cachedState && cachedState.dayKey === day && cachedState.themeKey && bank[cachedState.themeKey]) {
      themeKey = cachedState.themeKey;
    } else {
      themeKey = pickRandom(keys);
    }
  }

  const theme = bank[themeKey];
  const lines = cleanLines(theme.lines || []);
  const chosen = lines.length ? pickRandom(lines) : "（该主题歌词为空）";

  return {
    themeKey: themeKey,
    themeName: theme.name || themeKey,
    dayKey: day,
    line: chosen,
  };
}

// ✅ 暴露给 Loader 调用
globalThis.__getLyricText__ = async function (param, cachedState) {
  const r = await getDailyLine(param, cachedState);
  return {
    state: { dayKey: r.dayKey, themeKey: r.themeKey, themeName: r.themeName },
    title: "🎵 " + r.themeName,
    body: r.line,
  };
};
