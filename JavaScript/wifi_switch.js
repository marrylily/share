let targetSSIDs = [];
if (typeof $argument !== "undefined" && $argument.trim() !== "") {
  targetSSIDs = $argument.split(/,|，/).map(s => s.trim()).filter(Boolean);
} else {
  targetSSIDs = ["MyHomeWiFi"];
}

// 防抖：2 秒内只执行一次（避免 iOS 触发两次）
const key = "ssid_switch_last_run";
const now = Date.now();
const lastRun = $persistentStore.read(key);
if (lastRun && now - parseInt(lastRun, 10) < 2000) {
  $done();
}
$persistentStore.write(now.toString(), key);

setTimeout(() => {
  const currentSSID = $network.wifi.ssid;
  const currentMode = $surge.outboundMode;

  // 调试（确认稳定后可删）
  $notification.post(
    "SSID 调试",
    `当前SSID: ${currentSSID || "null"}`,
    `目标列表: ${targetSSIDs.join(" | ")}`
  );

  if (currentSSID) {
    const hit = targetSSIDs.map(x => x.toLowerCase()).includes(currentSSID.toLowerCase());
    const targetMode = hit ? "direct" : "rule";

    // 只有模式变化才切换 & 通知
    if (currentMode !== targetMode) {
      $surge.setOutboundMode(targetMode);
      $notification.post(
        "出站模式切换",
        `SSID: ${currentSSID}`,
        `✅ 已切换为【${targetMode === "direct" ? "直连" : "规则"}模式】`
      );
    }
  } else {
    // SSID 读不到时不要急着切规则，可以选择不处理
    // 如果你一定要 5G/蜂窝走规则，保留下面：
    if (currentMode !== "rule") $surge.setOutboundMode("rule");
  }

  $done();
}, 1000);