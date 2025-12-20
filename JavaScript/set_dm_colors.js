/*
 * 🎨 弹幕改色 (V4 终极适配版)
 * -------------------------------------------
 * 适配格式 1: 对象型 { p: "3.5,1,16777215,..." }
 * 适配格式 2: 字符串型 [ "3.5,1,16777215", ... ]
 * 适配格式 3: 数组型 [ 3.5, 1, 16777215, "user", "text" ]  <-- 重点修复这里
 * -------------------------------------------
 */

const STORE_KEY = "dm_color_config_v4";
const DEFAULT_MODE = "cycle";
const DEFAULT_COLORS = [11193542, 11513775, 14474460, 12632297, 13484213];

// === 基础工具 ===
const Storage = {
  read(k) { try { return $persistentStore.read(k); } catch { return null; } },
  write(k, v) { try { return $persistentStore.write(String(v), k); } catch { return false; } }
};

function getConfig() {
  const rawArg = typeof $argument !== "undefined" ? String($argument) : "";
  const pairs = rawArg.split(/&|,/).map(s => s.trim());
  let cfg = {};
  pairs.forEach(p => {
    const [k, v] = p.split(/=|:/).map(x => decodeURIComponent(x ? x.trim() : ""));
    if (k && v) cfg[k] = v;
  });

  if (!cfg.mode) {
    try { Object.assign(cfg, JSON.parse(Storage.read(STORE_KEY) || "{}")); } catch {}
  }
  
  const colors = (cfg.colors || "").replace(/%2C/gi, "|").split(/[\|,;]+/).map(Number).filter(n => !isNaN(n));
  return { mode: cfg.mode || DEFAULT_MODE, colors: colors.length ? colors : DEFAULT_COLORS };
}

// === 颜色生成 ===
let ptr = 0;
function getColor(cfg) {
  if (cfg.mode === "fixed") return cfg.colors[0];
  if (cfg.mode === "random") return Math.floor(Math.random() * 0xFFFFFF);
  const c = cfg.colors[ptr % cfg.colors.length];
  ptr++;
  return c;
}

// === 核心逻辑: 字符串修正 ===
function patchStringP(str, cfg) {
    if (!/^\d+(\.\d+)?/.test(str)) return str;
    let parts = str.split(',');
    while (parts.length < 3) parts.push('0');
    parts[2] = String(getColor(cfg));
    return parts.join(',');
}

// === 核心逻辑: 深度递归 ===
function processDeep(obj, cfg) {
  // 1. 处理数组
  if (Array.isArray(obj)) {
    // 🚨 重点修复: 检查这个数组本身是不是一条“弹幕”
    // DPlayer 标准数组格式: [时间(Number), 类型(Number), 颜色(Number/String), 作者, 内容...]
    // 特征: 长度>=4，第0位是数字，第1位是数字
    if (obj.length >= 4 && typeof obj[0] === 'number' && typeof obj[1] === 'number') {
        // 命中！这是一个弹幕数组，直接修改索引 2 (颜色位)
        obj[2] = getColor(cfg);
        return; // 处理完这条弹幕，不需要再递归进去了
    }

    // 如果不是弹幕数组，那就当它是普通的数据列表，遍历它
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      
      // 情况 A: 字符串型弹幕 ["3.5,1,color", ...]
      if (typeof item === 'string') {
        obj[i] = patchStringP(item, cfg);
      } 
      // 情况 B: 对象型或其他，递归处理
      else if (typeof item === 'object') {
        processDeep(item, cfg);
      }
    }
    return;
  }

  // 2. 处理对象
  if (obj && typeof obj === 'object') {
    let modified = false;
    const newColorInt = getColor(cfg);

    // 情况 C: 对象型 { p: "..." }
    if (typeof obj.p === 'string') {
      obj.p = patchStringP(obj.p, cfg);
      modified = true;
    }

    // 情况 D: 显式 color 字段
    if (obj.color !== undefined) {
      if (typeof obj.color === 'string' && !/^\d+$/.test(obj.color)) {
         // Hex 字符串忽略，强行覆盖数字试试
         obj.color = newColorInt;
      } else {
         obj.color = newColorInt;
      }
      modified = true;
    }

    if (!modified) {
      for (const key in obj) {
        if (typeof obj[key] === 'object' || Array.isArray(obj[key])) {
          processDeep(obj[key], cfg);
        }
      }
    }
  }
}

// === 入口 ===
if (typeof $request === "undefined") {
  const cfg = getConfig();
  $done({
    title: `弹幕改色V4 (${cfg.mode})`,
    content: `已启用数组级强力拦截\n颜色池: ${cfg.colors.length}个`,
    icon: "paintpalette.fill", "icon-color": "#ff6b6b"
  });
} else {
  try {
    if ($response.body) {
      let json = JSON.parse($response.body);
      processDeep(json, getConfig());
      $done({ body: JSON.stringify(json) });
    } else {
      $done({});
    }
  } catch (e) {
    console.log("[改色Error] " + e);
    $done({});
  }
}
