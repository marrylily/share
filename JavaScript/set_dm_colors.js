/*
 * 🎨 弹幕改色 (V6 终极补漏版)
 * -------------------------------------------
 * 核心修复: 强制覆盖非数字型颜色 (如 "#FFFFFF")
 * 解决问题: 修复列表中夹杂的少量白色弹幕
 * -------------------------------------------
 */

const STORE_KEY = "dm_color_config_v6";
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

// === 辅助: 字符串修正 ===
function patchStringP(str, cfg) {
    // 看起来像弹幕数据的字符串 (数字开头)
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
    // 🚨 V6 核心修复: 只要前两个是数字，且长度够，就认定为弹幕
    // 不再检查 obj[2] (颜色位) 是否为数字，防止漏掉 Hex 字符串
    if (obj.length >= 4 && !isNaN(obj[0]) && !isNaN(obj[1])) {
        // 直接修改第 3 位 (索引2)
        obj[2] = getColor(cfg);
        return; 
    }

    // 普通遍历
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      if (typeof item === 'string') {
        obj[i] = patchStringP(item, cfg);
      } else if (typeof item === 'object') {
        processDeep(item, cfg);
      }
    }
    return;
  }

  // 2. 处理对象
  if (obj && typeof obj === 'object') {
    let modified = false;
    const newColorInt = getColor(cfg);

    // 情况 A: p 属性
    if (typeof obj.p === 'string') {
      obj.p = patchStringP(obj.p, cfg);
      modified = true;
    }

    // 情况 B: 显式 color 字段 (兼容各种命名)
    const colorKeys = ['color', 'c', 'colour', 'Color', 'hex'];
    for (const key of colorKeys) {
        if (obj[key] !== undefined) {
             // 只要字段存在，暴力覆盖
             obj[key] = newColorInt;
             modified = true;
        }
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
    title: `弹幕改色V6 (${cfg.mode})`,
    content: `补漏模式: 强制覆盖Hex颜色\n颜色池: ${cfg.colors.length}个`,
    icon: "paintpalette.fill", "icon-color": "#ff6b6b"
  });
} else {
  try {
    if ($response.body) {
      // 兼容非 JSON 响应 (极少见但存在)
      let bodyStr = $response.body;
      let json = JSON.parse(bodyStr);
      processDeep(json, getConfig());
      $done({ body: JSON.stringify(json) });
    } else {
      $done({});
    }
  } catch (e) {
    console.log("[改色V6 Error] " + e);
    $done({});
  }
}
