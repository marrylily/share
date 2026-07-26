/*
 * Surge & Egern 出站模式自动切换（多端侦测版）
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
  // 核心修改：增加返回状态，判断是否真的执行成功了
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

const DEBUG = false;
const DELAY_MS = 1500;
const DEBOUNCE_MS = 3000;
const MODE_HIT = "direct";
const MODE_MISS = "rule";
const MODE_NO_WIFI = "rule";

function cleanStr(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[\r\n\t]/g, "").replace(/^["'`]+|["'`]+$/g, "").trim();
}

let targetSSIDs = [];
const rawArg = (typeof $argument !== "undefined") ? $argument : "";
const cleanedArg = cleanStr(rawArg);
if (cleanedArg) {
  targetSSIDs = cleanedArg.split(/,|，/).map(cleanStr).filter(Boolean);
} else {
  targetSSIDs = ["5Gmin"];
}

const key = "ssid_switch_last_run";
const now = Date.now();
const lastRun = Tool.read(key);
if (lastRun && now - parseInt(lastRun, 10) < DEBOUNCE_MS) {
  $done();
} else {
  Tool.write(String(now), key);

  // 将核心逻辑封装，方便区分 Surge 和 Egern 的执行方式
  const mainLogic = () => {
    let currentSSID = "";
    if (typeof $network !== "undefined" && $network.wifi && $network.wifi.ssid) {
      currentSSID = cleanStr($network.wifi.ssid);
    }

    const lastSSIDKey = "ssid_last_connected_wifi";
    const lastSSID = Tool.read(lastSSIDKey) || "";
    Tool.write(currentSSID, lastSSIDKey);

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
      return;
    }

    // 执行切换
    const apiSuccess = Tool.setMode(targetMode);

    // 如果 API 执行失败（说明 Egern 不支持此功能）
    if (!apiSuccess) {
      Tool.notify(
        "⚠️ Egern 兼容性限制",
        "切换失败：Egern 暂未开放相关 API",
        `虽然已识别到 ${currentSSID || "网络"}，但当前软件版本不支持通过脚本修改“全局出站模式”。`
      );
      $done();
      return;
    }

    // 防止重复弹窗的逻辑
    let currentMode = null;
    if (isSurge && $surge.outboundMode) currentMode = $surge.outboundMode;
    if (isEgern && typeof $egern !== "undefined" && $egern.outboundMode) currentMode = $egern.outboundMode;
    
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
  };

  // 针对环境分流：Egern 立即执行防止失效，Surge 延迟 1.5 秒等待网络稳定
  if (isEgern) {
    mainLogic();
  } else {
    setTimeout(mainLogic, DELAY_MS);
  }
}
