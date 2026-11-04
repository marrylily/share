/*
 * Surge & Egern 出站模式自动切换（多端侦测 + 状态防抖修复版）
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
    if (typeof $persistentStore !== "undefined") return $persistentStore.write(String(val), key);
    if (typeof $prefs !== "undefined") return $prefs.setValueForKey(String(val), key);
  },
  notify(title, subtitle, body) {
    if (typeof $notification !== "undefined") $notification.post(title, subtitle, body);
  },
  setMode(mode) {
    let executed = false;
    if (isSurge && typeof $surge.setOutboundMode === "function") {
      executed = $surge.setOutboundMode(mode);
    } else if (isEgern && typeof $egern !== "undefined" && typeof $egern.setOutboundMode === "function") {
      $egern.setOutboundMode(mode);
      executed = true;
    } else if (isEgern && typeof $surge !== "undefined" && typeof $surge.setOutboundMode === "function") {
      executed = $surge.setOutboundMode(mode);
    }
    if (executed) {
      this.write(mode, "ssid_last_outbound_mode");
    }
    return executed;
  },
  getMode() {
    if (isEgern && typeof $egern !== "undefined" && $egern.outboundMode) return $egern.outboundMode;
    if (isSurge && typeof $surge !== "undefined" && $surge.outboundMode) return $surge.outboundMode;
    // Surge 无原生读取属性时，回退读取持久化记录的真实出站模式
    return this.read("ssid_last_outbound_mode");
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

// 2. 获取当前 WiFi SSID
let currentSSID = "";
if (typeof $network !== "undefined" && $network.wifi && $network.wifi.ssid) {
  currentSSID = cleanStr($network.wifi.ssid);
}

// 3. 读取上次保存的 SSID 与模式
const lastSSIDKey = "ssid_last_connected_wifi";
const lastSSID = Tool.read(lastSSIDKey) || "";
const currentAppMode = Tool.getMode();

// 4. 判定目标模式：只要连着目标 WiFi 就是 direct，否则一律是 rule（防止断网抖动后卡死在 direct）
const isCurrentTarget = currentSSID
  ? targetSSIDs.map(x => x.toLowerCase()).includes(currentSSID.toLowerCase())
  : false;

const targetMode = isCurrentTarget ? MODE_HIT : (currentSSID ? MODE_MISS : MODE_NO_WIFI);

// 5. 更新上次 SSID 记录
const ssidChanged = currentSSID !== lastSSID;
if (ssidChanged) {
  Tool.write(currentSSID, lastSSIDKey);
}

// 6. 如果当前已经是目标模式，则无需重复切换和弹窗
if (currentAppMode === targetMode) {
  if (DEBUG) Tool.notify("脚本调试", "模式无需改变", `当前网络: ${currentSSID || "蜂窝数据"} | 模式: ${targetMode}`);
  $done();
} else {
  const apiSuccess = Tool.setMode(targetMode);
  if (!apiSuccess) {
    Tool.notify(
      "⚠️ 兼容性限制",
      "切换失败：当前软件暂未开放相关 API",
      `已识别到 ${currentSSID || "蜂窝数据"}，但不支持通过脚本修改出站模式。`
    );
  } else {
    Tool.notify(
      "出站模式自动切换",
      `${isCurrentTarget ? "🏠 已连接目标 WiFi" : "🚶 非目标 WiFi / 蜂窝网"} (${currentSSID || "蜂窝数据"})`,
      `✅ 已切换为【${targetMode === "direct" ? "直连模式" : "规则模式"}】`
    );
  }
  $done();
}
