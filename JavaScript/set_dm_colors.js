/*
 * 🎨 弹幕改色 (强力修正版)
 * 适配域名: dm.87445211.xyz
 * 功能: 递归查找所有弹幕对象，强制修改 p 属性和 color 属性
 */

const STORE_KEY = "dm_color_config_v1";

// === 配置读取逻辑 ===
const DEFAULT_MODE = "cycle";
// 预设五色: 淡灰蓝, 雾霾灰, 米白灰, 浅卡其, 莫兰迪粉
const DEFAULT_COLORS = [11193542, 11513775, 14474460, 12632297, 13484213];

const Storage = {
    read(k) { try { return $persistentStore.read(k); } catch { return null; } },
    write(k, v) { try { return $persistentStore.write(String(v), k); } catch { return false; } }
};

function parseArgs(str) {
    if (!str) return {};
    return Object.fromEntries(str.split(/&|,/).map(s => s.split(/=|:/).map(x => decodeURIComponent(x.trim()))).filter(x => x.length === 2));
}

function getConfig() {
    let raw = typeof $argument !== "undefined" ? $argument : "";
    let cfg = parseArgs(raw);
    if (!cfg.mode) {
        try { Object.assign(cfg, JSON.parse(Storage.read(STORE_KEY) || "{}")); } catch {}
    }
    const colors = (cfg.colors || "").replace(/%2C/gi, "|").split(/[\|,;]+/).map(Number).filter(n => !isNaN(n));
    return {
        mode: cfg.mode || DEFAULT_MODE,
        colors: colors.length ? colors : DEFAULT_COLORS
    };
}

// === 颜色生成逻辑 ===
let ptr = 0;
function getColor(cfg) {
    if (cfg.mode === "fixed") return cfg.colors[0];
    if (cfg.mode === "random") return Math.floor(Math.random() * 0xFFFFFF);
    // cycle
    const c = cfg.colors[ptr % cfg.colors.length];
    ptr++;
    return c;
}

// === 核心处理逻辑 (修正版) ===
function processDeep(obj, cfg) {
    // 1. 如果是数组，遍历数组
    if (Array.isArray(obj)) {
        for (let item of obj) {
            processDeep(item, cfg);
        }
        return;
    }

    // 2. 如果是对象，检查是否是弹幕节点
    if (obj && typeof obj === 'object') {
        let modified = false;
        const newColorInt = getColor(cfg);
        const newColorStr = String(newColorInt);

        // 修正情况 A: 存在 p 属性 (DPlayer 标准格式: "时间,类型,颜色,作者,时间戳")
        if (typeof obj.p === 'string') {
            const parts = obj.p.split(',');
            if (parts.length >= 3) {
                parts[2] = newColorStr; // 强制替换颜色位
                obj.p = parts.join(',');
                modified = true;
            }
        }

        // 修正情况 B: 存在独立 color 属性 (某些非标准接口)
        if (obj.color !== undefined) {
            // 无论是数字还是字符串，统一覆盖
            obj.color = newColorInt;
            modified = true;
        }

        // 如果不是弹幕节点，继续递归查找它的属性 (例如 obj.data 或 obj.comments)
        if (!modified) {
            for (let key in obj) {
                if (Array.isArray(obj[key]) || typeof obj[key] === 'object') {
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
        title: `弹幕改色: ${cfg.mode}`,
        content: `颜色组: ${cfg.colors.length}个\n(重启视频生效)`,
        icon: "paintpalette.fill",
        "icon-color": "#ff6b6b"
    });
} else {
    // 响应模式
    try {
        const bodyStr = $response.body;
        if (bodyStr) {
            let json = JSON.parse(bodyStr);
            const cfg = getConfig();
            
            // 直接从根节点开始递归，不再局限于 body.comments
            processDeep(json, cfg);

            $done({ body: JSON.stringify(json) });
        } else {
            $done({});
        }
    } catch (e) {
        console.log("[弹幕改色] Error: " + e);
        $done({});
    }
}
