/*
 * 🎨 弹幕改色 V8.2 稳定增强版
 * -------------------------------------------
 * 1. 面板端: 点击首页 Panel 切换配色方案 + 自动清理
 * 2. 响应端: 自动拦截精准改色，修复了 SyntaxError
 * -------------------------------------------
 */

const STORE_KEY = "dm_color_config_v8";

// 1. 预设配色方案池
const SCHEMES = [
  { name: "清新马卡龙", mode: "cycle", colors: [11193542, 11513775, 14474460, 12632297, 13484213] },
  { name: "猛男粉紫", mode: "cycle", colors: [16744703, 16758465, 14525951, 16761087] },
  { name: "纯净护眼", mode: "fixed", colors: [12632256] },
  { name: "赛博全随机", mode: "random", colors: [] }
];

// --- A. Panel 入口逻辑 ---
if (typeof $request === "undefined" && typeof $input !== "undefined") {
  let config;
  try {
    config = JSON.parse($persistentStore.read(STORE_KEY) || "null");
  } catch (e) {
    config = null;
  }

  // 🎮 处理点击交互
  if ($input.event === "tap") {
    let currentIndex = SCHEMES.findIndex(s => s.name === (config?.schemeName || "未初始化"));
    let nextIndex = (currentIndex + 1) % (SCHEMES.length + 1); 

    if (nextIndex < SCHEMES.length) {
      // 切换正常方案
      let nextScheme = SCHEMES[nextIndex];
      config = { mode: nextScheme.mode, colors: nextScheme.colors, schemeName: nextScheme.name };
      $persistentStore.write(JSON.stringify(config), STORE_KEY);
      $notification.post("🎨 弹幕配色已切换", `当前方案: ${nextScheme.name}`, "刷新视频后生效");
    } else {
      // 🧹 触发自清理逻辑：擦除本地存储碎片
      $persistentStore.write("", STORE_KEY);
      config = null;
      $notification.post("🧹 存储已重置", "已擦除本地配色配置", "恢复默认状态");
    }
  }

  // 🖥 显示面板内容
  let schemeTitle = config?.schemeName || "默认 (已清理)";
  let modeText = config ? (config.mode === "random" ? "全随机" : `${config.colors?.length || 0} 色循环`) : "未初始化";
  
  $done({
    title: "弹幕改色控制器",
    content: `当前方案: ${schemeTitle}\n状态: ${modeText} | 点击循环/重置`,
    icon: config ? "paintpalette.fill" : "trash.fill",
    "icon-color": config ? (config.mode === "random" ? "#FFD700" : "#ff6b6b") : "#aaaaaa"
  });
} 

// --- B. Response 入口逻辑 ---
else if (typeof $response !== "undefined") {
  if (!$response.body) {
    $done({}); 
  } else {
    try {
      // 读取配置，如果为空则使用 fallback 默认值
      let cfg = { mode: "cycle", colors: [11193542] };
      const stored = JSON.parse($persistentStore.read(STORE_KEY) || "{}");
      if (stored && stored.mode) cfg = stored;

      // 防止数组为空导致的计算错误
      if ((cfg.mode === "cycle" || cfg.mode === "fixed") && (!cfg.colors || cfg.colors.length === 0)) {
        cfg.colors = [11193542];
      }

      let json = JSON.parse($response.body);
      ptr = 0; // 重置指针，防止颜色索引累加
      processDeep(json, cfg);
      $done({ body: JSON.stringify(json) });
    } catch (e) {
      console.log("[改色V8.2 Error] " + e);
      $done({ body: $response.body }); // 出错时放行原始数据，保证弹幕不消失
    }
  }
} else {
  $done({});
}

// ----------------- 核心算法 (无 return 修正版) -----------------

function isWhite(v) {
  if (v === 16777215) return true;
  if (typeof v === "number") return Math.floor(v) === 16777215;
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "16777215" || /^#?ffffff(ff)?$/i.test(s) || /^0x0*ffffff$/i.test(s) || s.includes("255,255,255");
}

function isColorLike(v) {
  if (typeof v === "number") return v >= 0 && v <= 0xFFFFFF;
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return /^#?[0-9a-f]{6}([0-9a-f]{2})?$/.test(s) || /^0x[0-9a-f]{6,8}$/.test(s) || /^\d{1,8}$/.test(s);
}

let ptr = 0;
function getColor(cfg) {
  if (cfg.mode === "fixed") return cfg.colors[0];
  if (cfg.mode === "random") return Math.floor(Math.random() * 0x1000000);
  return cfg.colors[ptr++ % cfg.colors.length];
}

function looksLikeDanmakuArray(arr) {
  if (!Array.isArray(arr) || arr.length < 3) return false;
  if (typeof arr[0] !== "number" || typeof arr[1] !== "number") return false;
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
      if (isWhite(obj[i])) obj[i] = colorForThisArray ?? getColor(cfg);
      else if (obj[i] && typeof obj[i] === "object") processDeep(obj[i], cfg);
    }
  } else if (obj && typeof obj === "object") {
    let cached = null;
    const pick = () => (cached ??= getColor(cfg)); // 懒生成：真的需要改色时才计算

    for (const key in obj) {
      const val = obj[key];
      if (val && typeof val === "object") {
        processDeep(val, cfg);
      } else if (isWhite(val)) {
        obj[key] = pick();
      } else {
        const k = key.toLowerCase();
        if ((k.includes("color") || key === "c") && isColorLike(val)) {
          obj[key] = pick();
        }
      }
    }
  }
}
