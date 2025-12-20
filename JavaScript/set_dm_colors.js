/*
 * 🎨 弹幕改色 (Yu9191 修改版)
 * 原作者: Yu9191
 * 修改: 适配 dm.87445211.xyz 并增加暴力补全修复
 */

const STORE_KEY = "dm_color_config_yu9191_mod";

// 默认五色循环 (莫兰迪色系)
const DEFAULT_MODE = "cycle";
const DEFAULT_COLORS = [
  11193542,  // 淡灰蓝
  11513775,  // 雾霾灰
  14474460,  // 米白灰
  12632297,  // 浅卡其
  13484213   // 莫兰迪粉
];

// === 基础工具 ===
const Storage = {
  read(k) { try { return $persistentStore.read(k); } catch { return null; } },
  write(k, v) { try { return $persistentStore.write(String(v), k); } catch { return false; } }
};

function parseArgs(str) {
  if (!str) return {};
  const pairs = str.split(/&|,/).map(s => s.trim());
  const out = {};
  pairs.forEach(p => {
    const [k, v] = p.split(/=|:/).map(x => decodeURIComponent(x ? x.trim() : ""));
    if (k && v) out[k] = v;
  });
  return out;
}

function getConfig() {
  const rawArg = typeof $argument !== "undefined" ? String($argument) : "";
  let cfg = parseArgs(rawArg);
  
  // 如果没有参数，尝试读取本地存储
  if (!cfg.mode) {
    try { 
      const stored = JSON.parse(Storage.read(STORE_KEY) || "{}");
      Object.assign(cfg, stored); 
    } catch {}
  }

  const mode = cfg.mode || DEFAULT_MODE;
  const colorStr = cfg.colors || "";
  // 兼容 %2C 和 | 分隔符
  const colors = colorStr.replace(/%2C/gi, "|").split(/[\|,;]+/).map(Number).filter(n => !isNaN(n));
  
  // 保存配置
  const finalCfg = { mode, colors: colors.length ? colors : DEFAULT_COLORS };
  Storage.write(STORE_KEY, JSON.stringify(finalCfg));
  return finalCfg;
}

// === 颜色生成 ===
let ptr = 0;
function getColor(cfg) {
  if (cfg.mode === "fixed") return cfg.colors[0];
  if (cfg.mode === "random") {
    let n;
    do { n = Math.floor(Math.random() * 0x1000000); } while (n === 0xFFFFFF);
    return n;
  }
  // cycle
  const c = cfg.colors[ptr % cfg.colors.length];
  ptr++;
  return c;
}

// === 核心逻辑 (补全修复版) ===
function processDeep(obj, cfg) {
  if (Array.isArray(obj)) {
    for (const item of obj) processDeep(item, cfg);
    return;
  }

  if (obj && typeof obj === 'object') {
    let modified = false;
    const newColorInt = getColor(cfg);
    const newColorStr = String(newColorInt);

    // 1. 处理 p 属性 (字符串: "时间,类型,颜色...")
    if (typeof obj.p === 'string') {
      let parts = obj.p.split(',');
      
      // 🚨 核心修复：如果长度不足3（缺失颜色位），强制补全
      while (parts.length < 3) {
        parts.push('0');
      }
      
      parts[2] = newColorStr; // 覆盖颜色
      obj.p = parts.join(',');
      modified = true;
    }

    // 2. 处理 color 属性 (数字/字符串)
    if (obj.color !== undefined) {
      if (typeof obj.color === 'number') {
        obj.color = newColorInt;
        modified = true;
      } else if (typeof obj.color === 'string') {
         // 如果是纯数字字符串就直接改，如果是Hex就需要转换(这里简化处理)
         if (/^\d+$/.test(obj.color)) obj.color = newColorStr;
         else obj.color = newColorInt; // 暴力覆盖
         modified = true;
      }
    }

    // 递归查找
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
  // 面板模式
  const cfg = getConfig();
  $done({
    title: `弹幕改色 (${cfg.mode})`,
    content: `当前预设: ${cfg.colors.length}色循环\n点击配置参数`,
    icon: "paintpalette.fill",
    "icon-color": "#ff6b6b"
  });
} else {
  // 响应模式
  try {
    if ($response.body) {
      let body = JSON.parse($response.body);
      const cfg = getConfig();
      processDeep(body, cfg);
      $done({ body: JSON.stringify(body) });
    } else {
      $done({});
    }
  } catch (e) {
    console.log("[DanmuColor] Error: " + e);
    $done({});
  }
}
