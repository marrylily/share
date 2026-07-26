/*
 * Surge & Egern 出站模式自动切换（精准记忆追踪版）
 * - 特性：只有“连上目标 WiFi”或“从目标 WiFi 断开”时才执行切换。
 * - 连接其他无关 WiFi 或在无关 WiFi/蜂窝间切换时，完全不干预当前模式。
 */

const Tool = {
  read(key) {
    if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
    if (typeof $prefs !== "undefined") return $prefs.valueForKey(key);
    return null;
  },
  write(val, key) {
    if (typeof $persistentStore !== "undefined") return $persistentStore.write(val, key);
    if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
  },
  notify(title, subtitle, body) {
    if (typeof $notification !== "undefined") $notification.post(title, subtitle, body);
  },
  setMode(mode) {
    if (typeof $surge !== "undefined") $surge.setOutboundMode(mode);
    if (typeof $egern !== "undefined") $egern.setOutboundMode(mode);
  }
};

// ===== 可配置项 =====
const DEBUG = false;          
const DELAY_MS = 1000;        
const DEBOUNCE_MS = 2500;     
const MODE_HIT = "direct";    // 连上家里 WiFi：直连模式
const MODE_MISS = "rule";     // 离开家里 WiFi (连其他WiFi)：规则模式
const MODE_NO_WIFI = "rule";  // 离开家里 WiFi (变蜂窝)：规则模式

// ===== 强制清洗字符串 =====
function cleanStr(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t]/g, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

// ===== 解析 argument =====
let targetSSIDs = [];
const rawArg = (typeof $argument !== "undefined") ? $argument : "";
const cleanedArg = cleanStr(rawArg);

if (cleanedArg) {
  targetSSIDs = cleanedArg.split(/,|，/).map(cleanStr).filter(Boolean);
} else {
  targetSSIDs = ["MyHomeWiFi"];
}

// ===== 防抖：短时间内只执行一次 =====
const key = "ssid_switch_last_run";
const now = Date.now();
const lastRun = Tool.read(key);
if (lastRun && now - parseInt(lastRun, 10) < DEBOUNCE_MS) {
  $done();
  return; 
}
Tool.write(String(now), key);

// ===== 延迟执行：等待网络状态稳定 =====
setTimeout(() => {
  let currentSSID = "";
  if (typeof $network !== "undefined" && $network.wifi && $network.wifi.ssid) {
    currentSSID = cleanStr($network.wifi.ssid);
  }

  // 读取上一次记录的 WiFi
  const lastSSIDKey = "ssid_last_connected_wifi";
  const lastSSID = Tool.read(lastSSIDKey) || "";

  // 无论如何，更新当前 WiFi 记录，供下一次判断使用
  Tool.write(currentSSID, lastSSIDKey);

  // 判断当前和上一次是否是“目标 WiFi（家）”
  const isCurrentTarget = currentSSID ? targetSSIDs.map(x => x.toLowerCase()).includes(currentSSID.toLowerCase()) : false;
  const wasLastTarget = lastSSID ? targetSSIDs.map(x => x.toLowerCase()).includes(lastSSID.toLowerCase()) : false;

  let targetMode = null;

  // 【核心逻辑】精准判断是否需要操作
  if (isCurrentTarget) {
    // 动作 1：刚刚连入目标 WiFi
    targetMode = MODE_HIT;
  } else if (wasLastTarget && !isCurrentTarget) {
    // 动作 2：刚刚从目标 WiFi 断开（无论是切到了蜂窝，还是连了路人 WiFi）
    targetMode = currentSSID ? MODE_MISS : MODE_NO_WIFI;
  } else {
    // 动作 3：与目标 WiFi 无关的变化（比如 5G 连星巴克，或者星巴克切 5G），【直接忽略，不打扰】
    if (DEBUG) {
      Tool.notify("自动切换已忽略", "与目标 WiFi 无关", `当前: ${currentSSID || "蜂窝"}, 上次: ${lastSSID || "蜂窝"}`);
    }
    $done();
    return;
  }

  // 尝试读取客户端当前模式
  let currentMode = null;
  if (typeof $surge !== "undefined" && $surge.outboundMode) currentMode = $surge.outboundMode;
  if (typeof $egern !== "undefined" && $egern.outboundMode) currentMode = $egern.outboundMode;

  // 避免重复切换
  if (currentMode && currentMode === targetMode) {
    $done();
    return;
  }

  // 强制下发切换命令
  Tool.setMode(targetMode);

  // 利用本地存储防止同一状态重复弹窗
  const lastTargetKey = "ssid_last_target_mode";
  const lastTargetMode = Tool.read(lastTargetKey);

  if (!currentMode && lastTargetMode === targetMode) {
    $done();
    return;
  }

  Tool.write(targetMode, lastTargetKey);
  Tool.notify(
    "出站模式自动切换",
    `${isCurrentTarget ? "🏠 已连接家庭网络" : "🚶 已离开家庭网络"} (${currentSSID || "蜂窝数据"})`,
    `✅ 模式已切换为【${targetMode === "direct" ? "直连模式" : targetMode === "rule" ? "规则模式" : targetMode}】`
  );

  $done();
}, DELAY_MS);
