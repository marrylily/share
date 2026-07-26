/*
 * Surge & Egern 出站模式自动切换（远程托管+多端兼容版）
 * - 从 argument 获取 SSID 列表（逗号分隔）
 * - 命中 → direct
 * - 未命中 → rule
 * - 自动清洗 argument：去引号/空格/换行/不可见字符
 * - 防抖 + 延迟，避免 iOS network-changed 连续触发
 */

// ===== 客户端兼容层 =====
const Tool = {
  getMode() {
    if (typeof $surge !== "undefined" && $surge.outboundMode) return $surge.outboundMode;
    if (typeof $egern !== "undefined" && $egern.outboundMode) return $egern.outboundMode;
    return null;
  },
  setMode(mode) {
    if (typeof $surge !== "undefined" && $surge.setOutboundMode) {
      $surge.setOutboundMode(mode);
    } else if (typeof $egern !== "undefined" && $egern.setOutboundMode) {
      $egern.setOutboundMode(mode);
    }
  },
  read(key) {
    if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
    if (typeof $prefs !== "undefined") return $prefs.valueForKey(key); // 兼容其它软件
    return null;
  },
  write(val, key) {
    if (typeof $persistentStore !== "undefined") return $persistentStore.write(val, key);
    if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
  },
  notify(title, subtitle, body) {
    if (typeof $notification !== "undefined") $notification.post(title, subtitle, body);
  }
};

// ===== 可配置项 =====
const DEBUG = false;          // true：每次都弹调试信息；false：仅切换时通知
const DELAY_MS = 1000;        // 网络变化后延迟执行（等待 SSID 稳定）
const DEBOUNCE_MS = 2500;     // 防抖时间：避免 2 次触发
const MODE_HIT = "direct";    // 命中 SSID 时使用的出站模式
const MODE_MISS = "rule";     // 未命中 SSID 时使用的出站模式
const MODE_NO_WIFI = "rule";  // SSID 读不到（蜂窝/未知）时使用的出站模式

// ===== 工具函数：强制清洗字符串 =====
function cleanStr(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // 去掉零宽字符
    .replace(/[\r\n\t]/g, "")             // 去掉回车/换行/tab
    .replace(/^["'`]+|["'`]+$/g, "")      // 去掉首尾引号
    .trim();
}

// ===== 解析 argument 为 SSID 列表 =====
let targetSSIDs = [];
const rawArg = (typeof $argument !== "undefined") ? $argument : "";
const cleanedArg = cleanStr(rawArg);

if (cleanedArg) {
  targetSSIDs = cleanedArg.split(/,|，/).map(cleanStr).filter(Boolean);
} else {
  targetSSIDs = ["MyHomeWiFi"]; // 没传参时的兜底
}

// ===== 防抖：短时间内只执行一次 =====
const key = "ssid_switch_last_run";
const now = Date.now();
const lastRun = Tool.read(key);
if (lastRun && now - parseInt(lastRun, 10) < DEBOUNCE_MS) {
  $done();
}
Tool.write(String(now), key);

// ===== 延迟执行：避免 SSID 还没刷新 =====
setTimeout(() => {
  const currentSSID = typeof $network !== "undefined" && $network.wifi ? cleanStr($network.wifi.ssid) : "";
  const currentMode = Tool.getMode();

  const hit = currentSSID
    ? targetSSIDs.map(x => x.toLowerCase()).includes(currentSSID.toLowerCase())
    : false;

  let targetMode = null;
  if (currentSSID) {
    targetMode = hit ? MODE_HIT : MODE_MISS;
  } else {
    targetMode = MODE_NO_WIFI; 
  }

  // 调试输出
  if (DEBUG) {
    Tool.notify(
      "SSID 调试",
      `SSID: [${currentSSID || "null"}]  HIT: ${hit}`,
      `ARG: [${cleanedArg}]\nMODE: ${currentMode} -> ${targetMode}`
    );
  }

  // 环境不支持切换或模式未定义则退出
  if (!targetMode || !currentMode) {
    $done();
    return;
  }

  // 只有模式变化才切换
  if (currentMode !== targetMode) {
    Tool.setMode(targetMode);
    Tool.notify(
      "出站模式切换",
      `网络: ${currentSSID || "蜂窝/未知"}`,
      `✅ 已自动切换为【${targetMode === "direct" ? "直连模式" : targetMode === "rule" ? "规则模式" : targetMode}】`
    );
  }

  $done();
}, DELAY_MS);
