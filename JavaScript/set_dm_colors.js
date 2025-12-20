/*
 * 🎨 弹幕改色 (V5 宽容适配版)
 * -------------------------------------------
 * 核心升级: 放宽数组检测逻辑，兼容 "字符串型数字"
 * 解决: 修复部分弹幕因数据类型不规范导致的改色失败
 * -------------------------------------------
 */

const STORE_KEY = "dm_color_config_v5";
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
    // 🚨 V5 核心改进: 宽容检测
    // 只要长度>=4，且前3位都能转成数字(无论是 '123' 还是 123)，就认定为弹幕数组
    if (obj.length >= 4 && !isNaN(obj[0]) && !isNaN(obj[1]) && !isNaN(obj[2])) {
        // 直接修改第 3 位 (索引2) 为新颜色
        obj[2] = getColor(cfg);
        return; // 处理完毕，不再递归
    }

    // 普通数组遍历
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

    // 情况 C: 对象型 { p: "..." }
    if (typeof obj.p === 'string') {
      obj.p = patchStringP(obj.p, cfg);
      modified = true;
    }

    // 情况 D: 显式 color 字段 (兼容 c / color / _color 等常见字段)
    // 很多非标准播放器会用简写 'c' 代表 color
    const colorKeys = ['color', 'c', 'colour', 'Color'];
    for (const key of colorKeys) {
        if (obj[key] !== undefined) {
             // 只要字段存在，不管原来是啥，强制覆盖
             if (typeof obj[key] === 'string' && !/^\d+$/.test(obj[key])) {
                 obj[key] = newColorInt; // 强转数字
             } else {
                 obj[key] = newColorInt;
             }
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
    title: `弹幕改色V5 (${cfg.mode})`,
    content: `宽容模式: 兼容字符串型数组\n颜色池: ${cfg.colors.length}个`,
    icon: "paintpalette.fill", "icon-color": "#ff6b6b"
  });
} else {
  try {
    if ($response.body) {
      // 增加容错: 某些接口返回并非纯 JSON，尝试修剪 (虽然极少见)
      let bodyStr = $response.body;
      let json = JSON.parse(bodyStr);
      processDeep(json, getConfig());
      $done({ body: JSON.stringify(json) });
    } else {
      $done({});
    }
  } catch (e) {
    console.log("[改色V5 Error] " + e);
    $done({});
  }
}
