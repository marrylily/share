/*
 * Surge & Egern 出站模式自动切换（多端侦测修复版）
 */

const isEgern = typeof $egern !== "undefined" || (typeof $environment !== "undefined" && $environment["surge-version"] === undefined);
const isSurge = typeof $surge !== "undefined";

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
    let executed = false;
    if (isSurge && typeof $surge.setOutboundMode === "function") {
      $surge.setOutboundMode(mode);
      executed = true;
    } else if (isEgern && typeof $egern !== "undefined" && typeof $egern.setOutboundMode === "function") {
      $egern.setOutboundMode(mode);
      executed = true;
    } else if (isEgern && typeof $surge !== "undefined" && typeof $surge.setOutboundMode === "function") {
      $surge.setOutboundMode(mode);
      executed = true;
    }
    return executed;
  }
};

const DEBUG = false; // 改为 true 可开启弹窗排错
const MODE_HIT = "direct";
const MODE_MISS = "rule";
const MODE_NO_WIFI = "rule";

function cleanStr(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[\r\n\t]/g, "").replace(/^["'`]+|["'`]+$/g, "").trim();
}

// 1. 获取目标 SSID
let targetSSIDs = [];
const rawArg = (typeof $argument !== "undefined") ? $argument : "";
const cleanedArg = cleanStr(rawArg);
if (cleanedArg) {
  targetSSIDs = cleanedArg.split(/,|，/).map(cleanStr).filter(Boolean);
} else {
  targetSSIDs = ["5Gmin"]; // 默认 WiFi 名称
}

// 2. 同步获取当前网络状态
let currentSSID = "";
if (typeof $network !== "undefined" && $network.wifi && $network.wifi.ssid) {
  currentSSID = cleanStr($network.wifi.ssid);
}

// 3. 读取上次保存的 SSID 并更新记录
const lastSSIDKey = "ssid_last_connected_wifi";
const lastSSID = Tool.read(lastSSIDKey) || "";
Tool.write(currentSSID, lastSSIDKey);

// 4. 判断是否命中目标 WiFi
const isCurrentTarget = currentSSID ? targetSSIDs.map(x => x.toLowerCase()).includes(currentSSID.toLowerCase()) : false;
const wasLastTarget = lastSSID ? targetSSIDs.map(x => x.toLowerCase()).includes(lastSSID.toLowerCase()) : false;

let targetMode = null;

if (isCurrentTarget) {
  targetMode = MODE_HIT;
} else if (wasLastTarget && !isCurrentTarget) {
  targetMode = currentSSID ? MODE_MISS : MODE_NO_WIFI;
} else {
  if (DEBUG) Tool.notify("脚本调试", "网络变动被忽略", `当前连接: ${currentSSID || "蜂窝数据"}`);
  $done();
}

// 仅当计算出需要切换模式时，才继续执行
if (targetMode) {
  // 5. 判断当前软件实际的出站模式（避免重复切换和弹窗）
  let currentAppMode = null;
  if (isSurge && $surge.outboundMode) currentAppMode = $surge.outboundMode;
  if (isEgern && typeof $egern !== "undefined" && $egern.outboundMode) currentAppMode = $egern.outboundMode;
  
  const lastTargetKey = "ssid_last_target_mode";
  const lastTargetMode = Tool.read(lastTargetKey);

  // 如果软件当前已经是目标模式，或者软件 API 获取不到但上次已成功切换过，则直接结束
  if ((currentAppMode && currentAppMode === targetMode) || (!currentAppMode && lastTargetMode === targetMode)) {
    if (DEBUG) Tool.notify("脚本调试", "模式无需改变", `已经是: ${targetMode}`);
    $done();
  } else {
    // 6. 执行切换
    const apiSuccess = Tool.setMode(targetMode);

    if (!apiSuccess) {
      Tool.notify(
        "⚠️ 兼容性限制",
        "切换失败：当前软件暂未开放相关 API",
        `已识别到 ${currentSSID || "网络"}，但不支持通过脚本修改出站模式。`
      );
    } else {
      Tool.write(targetMode, lastTargetKey);
      Tool.notify(
        "出站模式自动切换",
        `${isCurrentTarget ? "🏠 已连接目标 WiFi" : "🚶 已断开目标 WiFi"} (${currentSSID || "蜂窝数据"})`,
        `✅ 已切换为【${targetMode === "direct" ? "直连模式" : targetMode === "rule" ? "规则模式" : targetMode}】`
      );
    }
    $done();
  }
}
