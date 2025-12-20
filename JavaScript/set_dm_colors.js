/*
 * 🎨 弹幕改色 (全形态覆盖版)
 * 适配: 对象型弹幕 {p: "..."} 和 字符串型弹幕 ["...", "..."]
 * 修复: 彻底解决默认白色无法修改的问题
 */

const STORE_KEY = "dm_color_config_v3";
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

// === 核心逻辑: 字符串处理 ===
// 输入: "时间,类型,颜色,..." 或 "时间,类型"
// 输出: "时间,类型,新颜色,..."
function patchStringP(str, cfg) {
    // 简单判断是否像弹幕格式 (以数字开头)
    if (!/^\d+(\.\d+)?/.test(str)) return str;

    let parts = str.split(',');
    // 强制补全: 如果长度小于3 (缺颜色)，补齐
    while (parts.length < 3) parts.push('0');
    
    // 强制替换: 第3位 (索引2) 改为新颜色
    parts[2] = String(getColor(cfg));
    
    return parts.join(',');
}

// === 核心逻辑: 递归遍历 ===
function processDeep(obj, cfg) {
  // 1. 处理数组 (关键修复：使用索引遍历，以便修改字符串元素)
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      // 情况 A: 数组里直接就是字符串 ["3.5,1,16777215", ...]
      if (typeof item === 'string') {
        obj[i] = patchStringP(item, cfg);
      } 
      // 情况 B: 数组里是对象，递归进去
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

    // 情况 C: 对象有 p 属性 { "p": "3.5,1,16777215" }
    if (typeof obj.p === 'string') {
      obj.p = patchStringP(obj.p, cfg);
      modified = true;
    }

    // 情况 D: 对象有 color 属性 (数字/字符串)
    if (obj.color !== undefined) {
      // 暴力覆盖所有 color 字段，转为 Int
      // 注意：有些播放器只认数字类型的 color
      if (typeof obj.color === 'string' && !/^\d+$/.test(obj.color)) {
         // 如果原本是Hex字符串，这里也不管了，直接给它数字试试，DPlayer通常兼容
         obj.color = newColorInt;
      } else {
         obj.color = newColorInt;
      }
      modified = true;
    }

    // 递归查找子属性 (如 data, comments, list)
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
    title: `弹幕改色Pro (${cfg.mode})`,
    content: `全覆盖模式 | 颜色: ${cfg.colors.length}个`,
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
