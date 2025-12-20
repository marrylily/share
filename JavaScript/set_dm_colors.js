/*
 * 🎨 弹幕改色 V8.1 稳定增强版
 * - 修 return / 防 colors 为空 / 懒生成颜色 / 减少数组误伤 / 只改“像颜色”的字段
 */

const STORE_KEY = "dm_color_config_v8";

const SCHEMES = [
  { name: "清新马卡龙", mode: "cycle", colors: [11193542, 11513775, 14474460, 12632297, 13484213] },
  { name: "猛男粉紫", mode: "cycle", colors: [16744703, 16758465, 14525951, 16761087] },
  { name: "纯净护眼", mode: "fixed", colors: [12632256] },
  { name: "赛博全随机", mode: "random", colors: [] }
];

// --- A. Panel ---
if (typeof $request === "undefined" && typeof $input !== "undefined") {
  let config;
  try {
    config = JSON.parse($persistentStore.read(STORE_KEY) || "null");
  } catch (e) {
    config = null;
  }

  // 没配置就写入默认（更直观）
  if (!config || !config.mode) {
    const d = SCHEMES[0];
    config = { mode: d.mode, colors: d.colors, schemeName: d.name };
    $persistentStore.write(JSON.stringify(config), STORE_KEY);
  }

  if ($input.event === "tap") {
    let currentIndex = SCHEMES.findIndex(s => s.name === (config.schemeName || SCHEMES[0].name));
    if (currentIndex < 0) currentIndex = 0;
    let nextScheme = SCHEMES[(currentIndex + 1) % SCHEMES.length];
    config = { mode: nextScheme.mode, colors: nextScheme.colors, schemeName: nextScheme.name };
    $persistentStore.write(JSON.stringify(config), STORE_KEY);
    $notification.post("🎨 弹幕配色已切换", `当前方案: ${nextScheme.name}`, "刷新视频后生效");
  }

  let schemeTitle = config.schemeName || "默认方案";
  let modeText = config.mode === "random" ? "全随机" : `${(config.colors || []).length} 色循环`;
  $done({
    title: "弹幕改色控制器",
    content: `当前方案: ${schemeTitle} (${modeText})\n点击快速切换配色方案`,
    icon: "paintpalette.fill",
    "icon-color": config.mode === "random" ? "#FFD700" : "#ff6b6b"
  });
}

// --- B. Response ---
else if (typeof $response !== "undefined") {
  try {
    if (!$response.body) return $done({}); // ✅ 必须 return

    let cfg = { mode: "cycle", colors: [11193542], schemeName: "默认" };
    try {
      const stored = JSON.parse($persistentStore.read(STORE_KEY) || "{}");
      if (stored && stored.mode) cfg = stored;
    } catch (e) {}

    // ✅ 防止 cycle 但 colors 为空
    if (cfg.mode === "cycle" && (!Array.isArray(cfg.colors) || cfg.colors.length === 0)) {
      cfg.colors = [11193542];
    }
    if (cfg.mode === "fixed" && (!Array.isArray(cfg.colors) || cfg.colors.length === 0)) {
      cfg.colors = [11193542];
    }

    const json = JSON.parse($response.body);
    ptr = 0; // ✅ 每次响应重置（避免某些环境复用脚本导致颜色跑飞）
    processDeep(json, cfg);
    return $done({ body: JSON.stringify(json) });

  } catch (e) {
    console.log("[改色V8.1 Error] " + e);
    return $done({ body: $response.body });
  }
} else {
  $done({});
}

// ----------------- 核心逻辑 -----------------

function isWhite(v) {
  if (v === 16777215) return true;
  if (typeof v === "number") return Math.floor(v) === 16777215;
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "16777215" ||
    /^#?ffffff(ff)?$/i.test(s) ||
    /^0x0*ffffff$/i.test(s) ||
    s.includes("255,255,255");
}

// “像颜色”的判断：避免把别的字段硬改成数字
function isColorLike(v) {
  if (typeof v === "number") return v >= 0 && v <= 0xFFFFFF;
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return /^#?[0-9a-f]{6}([0-9a-f]{2})?$/.test(s) || /^0x[0-9a-f]{6,8}$/.test(s) || /^\d{1,8}$/.test(s);
}

let ptr = 0;
function getColor(cfg) {
  if (cfg.mode === "fixed") return cfg.colors[0];
  if (cfg.mode === "random") return Math.floor(Math.random() * 0x1000000); // 0..0xFFFFFF
  return cfg.colors[ptr++ % cfg.colors.length];
}

// 更严格的“弹幕数组”判定：减少误伤
function looksLikeDanmakuArray(arr) {
  // 常见结构： [time, mode, color, ...] 或 [stime, something, color]
  if (!Array.isArray(arr) || arr.length < 3) return false;
  if (typeof arr[0] !== "number" || typeof arr[1] !== "number") return false;

  // 第3位本来就是白色/颜色，才当作颜色位处理
  return isWhite(arr[2]) || isColorLike(arr[2]);
}

function processDeep(obj, cfg) {
  if (Array.isArray(obj)) {
    let colorForThisArray = null;

    if (looksLikeDanmakuArray(obj)) {
      colorForThisArray = getColor(cfg);
      obj[2] = colorForThisArray;
    }

    for (let i = 0; i < obj.length; i++) {
      const v = obj[i];
      if (isWhite(v)) obj[i] = colorForThisArray ?? getColor(cfg);
      else if (v && typeof v === "object") processDeep(v, cfg);
    }
    return;
  }

  if (obj && typeof obj === "object") {
    let cached = null;
    const pick = () => (cached ??= getColor(cfg)); // ✅ 懒生成：真的需要时才取色

    for (const key in obj) {
      const val = obj[key];

      if (val && typeof val === "object") {
        processDeep(val, cfg);
        continue;
      }

      // 白色直接替换
      if (isWhite(val)) {
        obj[key] = pick();
        continue;
      }

      // 暴力改色：但只改“像颜色”的字段，减少误伤
      const k = key.toLowerCase();
      if ((k.includes("color") || key === "c") && isColorLike(val)) {
        obj[key] = pick();
      }
    }
  }
}