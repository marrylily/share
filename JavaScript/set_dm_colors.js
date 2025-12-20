/*
 * 🎨 弹幕改色 (V7 核弹版 - 修正版)
 * - 同一条弹幕对象/数组：统一颜色，避免 p 和 color 不一致
 * - 白色识别更全：16777215 / "16777215" / #FFFFFF / 0xFFFFFF / FFFFFF / #FFFFFFFF / rgb(255,255,255)
 * - JSON 解析失败：原样放行（不吞响应体）
 */

const STORE_KEY = "dm_color_config_v7";
const DEFAULT_MODE = "cycle";
const DEFAULT_COLORS = [11193542, 11513775, 14474460, 12632297, 13484213];

// 是否无条件修改所有“看起来像颜色键名”的字段（更核弹，误伤更大）
const FORCE_COLOR_KEYS = true;

// === 基础配置读取 ===
const Storage = {
  read(k) { try { return $persistentStore.read(k); } catch { return null; } },
  write(k, v) { try { return $persistentStore.write(String(v), k); } catch { return false; } }
};

function getConfig() {
  const rawArg = typeof $argument !== "undefined" ? String($argument).trim() : "";

  // 先读存储，再用参数覆盖（避免“只传 colors 却被存储覆盖掉”的坑）
  let stored = {};
  try { stored = JSON.parse(Storage.read(STORE_KEY) || "{}"); } catch {}

  let argCfg = {};
  if (rawArg) {
    // 如果有 &，只按 & 分隔，避免把 colors=1,2,3 里的逗号拆没了
    const pairs = rawArg.includes("&") ? rawArg.split("&") : rawArg.split(",");
    pairs.map(s => s.trim()).forEach(p => {
      const [k, v] = p.split(/=|:/).map(x => decodeURIComponent(x ? x.trim() : ""));
      if (k && v !== undefined && v !== "") argCfg[k] = v;
    });
  }

  const cfg = Object.assign({}, stored, argCfg);

  const colorRaw = Array.isArray(cfg.colors) ? cfg.colors.join("|") : String(cfg.colors || "");
  const colors = colorRaw
    .replace(/%2C/gi, "|")
    .split(/[\|,;]+/)
    .map(Number)
    .filter(n => !isNaN(n));

  return {
    mode: cfg.mode || DEFAULT_MODE,
    colors: colors.length ? colors : DEFAULT_COLORS
  };
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

// === 核弹：白色识别（更全）===
function isWhite(v) {
  if (v === 16777215) return true;
  if (typeof v === "number") return Math.floor(v) === 16777215;

  if (typeof v !== "string") return false;
  const s = v.trim();

  if (s === "16777215") return true;
  if (/^0x0*ffffff$/i.test(s)) return true;          // 0xFFFFFF
  if (/^#?0*ffffff$/i.test(s)) return true;          // FFFFFF 或 #FFFFFF
  if (/^#?0*ffffffff$/i.test(s)) return true;        // #FFFFFFFF
  if (/^rgba?\(\s*255\s*,\s*255\s*,\s*255(?:\s*,\s*(1|1\.0+))?\s*\)$/i.test(s)) return true;

  return false;
}

function looksLikeColorKey(key) {
  const k = String(key).toLowerCase();
  return k.includes("color") || k === "c" || k === "hex" || k.includes("colour");
}

function looksLikeColorValue(val) {
  if (typeof val === "number") return val >= 0 && val <= 0xFFFFFF;
  if (typeof val !== "string") return false;
  const s = val.trim();
  return /^#?[0-9a-f]{6,8}$/i.test(s) || /^0x[0-9a-f]{6}$/i.test(s) || /^\d{1,8}$/.test(s);
}

// === 字符串弹幕修正：支持 forcedColor，保证同条一致 ===
function patchStringP(str, cfg, forcedColor) {
  if (typeof str !== "string") return str;
  const s = str.trim();
  if (!/^\d+(\.\d+)?/.test(s)) return str;

  let parts = s.split(",");
  while (parts.length < 3) parts.push("0");
  parts[2] = String(forcedColor ?? getColor(cfg));
  return parts.join(",");
}

// === 核心逻辑 ===
function processDeep(obj, cfg) {
  // 1) 数组
  if (Array.isArray(obj)) {
    let colorForThisArray = null;

    // 标准弹幕数组：前两位数字 + len>=3 => 索引2是颜色位
    if (obj.length >= 3 && !isNaN(obj[0]) && !isNaN(obj[1])) {
      colorForThisArray = getColor(cfg);
      obj[2] = colorForThisArray;
    }

    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];

      // 全球通缉：叶子白色值
      if (isWhite(item)) {
        obj[i] = colorForThisArray ?? getColor(cfg);
        continue;
      }

      // 字符串弹幕 "12.5,1,16777215"
      if (typeof item === "string") {
        const t = item.trim();
        if (/^\d+\.?\d*,\d+,/.test(t)) {
          obj[i] = patchStringP(item, cfg, getColor(cfg));
          continue;
        }
      }

      if (item && typeof item === "object") {
        processDeep(item, cfg);
      }
    }
    return;
  }

  // 2) 对象
  if (obj && typeof obj === "object") {
    const colorForThisObj = getColor(cfg);

    // 标准 p 字段
    if (typeof obj.p === "string") {
      obj.p = patchStringP(obj.p, cfg, colorForThisObj);
    }

    for (const key in obj) {
      const val = obj[key];

      // 先递归（避免把对象/数组误覆盖成数字）
      if (val && typeof val === "object") {
        processDeep(val, cfg);
        continue;
      }

      // 叶子节点：白色值通缉
      if (isWhite(val)) {
        obj[key] = colorForThisObj;
        continue;
      }

      // 叶子节点：看起来是弹幕格式字符串，也顺手改
      if (typeof val === "string" && /^\d+\.?\d*,\d+,/.test(val.trim())) {
        obj[key] = patchStringP(val, cfg, colorForThisObj);
        continue;
      }

      // 颜色键名处理
      if (looksLikeColorKey(key)) {
        if (FORCE_COLOR_KEYS) {
          // 核弹：只要是颜色键名就改（但仅限叶子节点）
          obj[key] = colorForThisObj;
        } else {
          // 稳一点：只有值看起来像颜色，才改
          if (looksLikeColorValue(val)) obj[key] = colorForThisObj;
        }
      }
    }
  }
}

// === 入口 ===
if (typeof $request === "undefined") {
  const cfg = getConfig();
  $done({
    title: `弹幕改色V7 (${cfg.mode})`,
    content: `核弹模式: 通缉白色 + 结构化改色\n颜色池: ${cfg.colors.length}个`,
    icon: "paintpalette.fill",
    "icon-color": "#ff6b6b"
  });
} else {
  try {
    if ($response.body) {
      const json = JSON.parse($response.body);
      processDeep(json, getConfig());
      $done({ body: JSON.stringify(json) });
    } else {
      $done({});
    }
  } catch (e) {
    console.log("[改色V7 Error] " + e);
    // 失败原样放行，别吞 body
    $done({ body: $response.body });
  }
}
