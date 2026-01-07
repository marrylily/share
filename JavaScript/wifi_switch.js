/*
 * Surge 出站模式自动切换（完整版）
 * 命中指定 Wi-Fi SSID → direct
 * 未命中 → rule
 *
 * 用法：
 * [Script]
 * Auto_Switch = type=event,event-name=network-changed,script-path=你的脚本地址,argument=5Gmin,HomeWiFi,OfficeWiFi,timeout=5
 */

const DEBUG = false;              // ✅ 调试模式：true 会每次都弹调试通知，false 更安静
const DELAY_MS = 1000;            // ✅ 延迟执行：等待网络切换稳定
const DEBOUNCE_MS = 2500;         // ✅ 防抖：避免 iOS 连续触发两次
const MODE_HIT = "direct";        // ✅ 命中 SSID 时的出站模式：direct
const MODE_MISS = "rule";         // ✅ 未命中 SSID 时的出站模式：rule
const MODE_NO_WIFI = "rule";      // ✅ 读不到 SSID（比如蜂窝/5G）时要切的模式（不想处理可设为 null）

/* 解析 argument 作为目标 SSID 列表 */
let targetSSIDs = [];
if (typeof $argument !== "undefined" && $argument.trim() !== "") {
  targetSSIDs = $argument
    .split(/,|，/)
    .map(s => s.trim())
    .filter(Boolean);
} else {
  targetSSIDs = ["MyHomeWiFi"]; // 防止没传参时报错
}

/* 防抖：短时间内只执行一次 */
const key = "ssid_switch_last_run";
const now = Date.now();
const lastRun = $persistentStore.read(key);
if (lastRun && now - parseInt(lastRun, 10) < DEBOUNCE_MS) {
  $done();
}
$persistentStore.write(String(now), key);

/* 延迟执行：避免刚切换时 SSID 还是旧值/null */
setTimeout(() => {
  const currentSSID = $network.wifi.ssid;
  const currentMode = $surge.outboundMode;

  // 统一小写用于比较（避免大小写导致命中失败）
  const lowerList = targetSSIDs.map(x => x.toLowerCase());
  const hit = currentSSID ? lowerList.includes(currentSSID.toLowerCase()) : false;

  // 计算应该切到哪个模式
  let targetMode = null;
  if (currentSSID) {
    targetMode = hit ? MODE_HIT : MODE_MISS;
  } else {
    targetMode = MODE_NO_WIFI; // 可能为 null
  }

  // 调试输出
  if (DEBUG) {
    $notification.post(
      "SSID 调试",
      `SSID: [${currentSSID || "null"}]  HIT: ${hit}`,
      `ARG: [${typeof $argument !== "undefined" ? $argument : "undefined"}]\nLIST: [${targetSSIDs.join(" | ")}]\nMODE: ${currentMode} -> ${targetMode}`
    );
  }

  // 目标模式为空：不处理
  if (!targetMode) {
    $done();
    return;
  }

  // 只有模式变化才切换
  if (currentMode !== targetMode) {
    $surge.setOutboundMode(targetMode);

    // 通知（只在变化时弹）
    $notification.post(
      "出站模式切换",
      `SSID: ${currentSSID || "蜂窝/未知"}`,
      `✅ 已切换为【${targetMode === "direct" ? "直连模式" : targetMode === "rule" ? "规则模式" : targetMode}】`
    );
  }

  $done();
}, DELAY_MS);