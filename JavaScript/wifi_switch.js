/*
 * Surge & Egern 出站模式自动切换（终极修复·5Gmin 专属版）
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

// ===== 核心配置 =====
const DEBUG = false;          // 如果依然不生效，请把这里改成 true 来排查问题
const DELAY_MS = 1500;        // 延长到1.5秒，确保系统彻底获取到 WiFi 名称
const DEBOUNCE_MS = 3000;     // 3秒内防止重复触发
const MODE_HIT = "direct";    // 连上 5Gmin：切直连
const MODE_MISS = "rule";     // 离开 5Gmin：切规则
const MODE_NO_WIFI = "rule";  // 断开 WiFi 变蜂窝：切规则

function cleanStr(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[\r\n\t]/g, "").replace(/^["'`]+|["'`]+$/g, "").trim();
}

// 获取配置的 WiFi 名字（即使没配置参数，也会默认保底使用 5Gmin）
let targetSSIDs = [];
const rawArg = (typeof $argument !== "undefined") ? $argument : "";
const cleanedArg = cleanStr(rawArg);

if (cleanedArg) {
  targetSSIDs = cleanedArg.split(/,|，/).map(cleanStr).filter(Boolean);
} else {
  targetSSIDs = ["5Gmin"]; 
}

// 防抖拦截
const key = "ssid_switch_last_run";
const now = Date.now();
const lastRun = Tool.read(key);
if (lastRun && now - parseInt(lastRun, 10) < DEBOUNCE_MS) {
  $done();
} else {
  Tool.write(String(now), key);

  // 延迟执行
  setTimeout(() => {
    let currentSSID = "";
    if (typeof $network !== "undefined" && $network.wifi && $network.wifi.ssid) {
      currentSSID = cleanStr($network.wifi.ssid);
    }

    const lastSSIDKey = "ssid_last_connected_wifi";
    const lastSSID = Tool.read(lastSSIDKey) || "";
    Tool.write(currentSSID, lastSSIDKey);

    // 判断逻辑
    const isCurrentTarget = currentSSID ? targetSSIDs.map(x => x.toLowerCase()).includes(currentSSID.toLowerCase()) : false;
    const wasLastTarget = lastSSID ? targetSSIDs.map(x => x.toLowerCase()).includes(lastSSID.toLowerCase()) : false;

    let targetMode = null;

    if (isCurrentTarget) {
      targetMode = MODE_HIT; // 连上了
    } else if (wasLastTarget && !isCurrentTarget) {
      targetMode = currentSSID ? MODE_MISS : MODE_NO_WIFI; // 离开了
    } else {
      if (DEBUG) Tool.notify("脚本调试", "网络变动被忽略", `当前连接: ${currentSSID || "蜂窝数据"}`);
      $done();
      return;
    }

    // 模式切换执行
    let currentMode = null;
    if (typeof $surge !== "undefined" && $surge.outboundMode) currentMode = $surge.outboundMode;
    if (typeof $egern !== "undefined" && $egern.outboundMode) currentMode = $egern.outboundMode;

    if (currentMode && currentMode === targetMode) {
      $done();
      return;
    }

    Tool.setMode(targetMode);

    const lastTargetKey = "ssid_last_target_mode";
    const lastTargetMode = Tool.read(lastTargetKey);

    if (!currentMode && lastTargetMode === targetMode) {
      $done();
      return;
    }

    Tool.write(targetMode, lastTargetKey);
    Tool.notify(
      "出站模式自动切换",
      `${isCurrentTarget ? "🏠 已连接 5Gmin" : "🚶 已断开 5Gmin"} (${currentSSID || "蜂窝数据"})`,
      `✅ 已切换为【${targetMode === "direct" ? "直连模式" : targetMode === "rule" ? "规则模式" : targetMode}】`
    );

    $done();
  }, DELAY_MS);
}
