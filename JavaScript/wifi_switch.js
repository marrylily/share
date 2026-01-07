let targetSSIDs = [];
if (typeof $argument !== "undefined" && $argument.trim() !== "") {
  targetSSIDs = $argument.split(/,|，/).map(s => s.trim()).filter(Boolean);
} else {
  targetSSIDs = ["MyHomeWiFi"];
}

// 延迟一下，防止网络切换瞬间 SSID 还没刷新
setTimeout(() => {
  const currentSSID = $network.wifi.ssid;
  const currentMode = $surge.outboundMode;

  // 调试：显示 Surge 实际读到的 SSID 和参数
  $notification.post(
    "SSID 调试",
    `当前SSID: ${currentSSID || "null"}`,
    `目标列表: ${targetSSIDs.join(" | ")}`
  );

  if (currentSSID) {
    const hit = targetSSIDs.map(x => x.toLowerCase()).includes(currentSSID.toLowerCase());

    if (hit) {
      if (currentMode !== "direct") {
        $surge.setOutboundMode("direct");
        $notification.post("出站模式切换", `已连接: ${currentSSID}`, "✅ 切换为【直连模式】");
      }
    } else {
      if (currentMode !== "rule") {
        $surge.setOutboundMode("rule");
        $notification.post("出站模式切换", `当前: ${currentSSID}`, "↩️ 切换为【规则模式】");
      }
    }
  } else {
    if (currentMode !== "rule") $surge.setOutboundMode("rule");
  }

  $done();
}, 1000);