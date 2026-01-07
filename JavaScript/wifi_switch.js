/*
 * Surge 出站模式自动切换 (GitHub 通用版)
 * * 核心逻辑：
 * 1. 从外部 Argument 获取目标 Wi-Fi 列表 (逗号分隔)
 * 2. 匹配当前 SSID，命中则切直连，否则切规则
 *
 * 托管方式：建议上传至 Gist 或 GitHub Repo
 */

// ✅ 读取外部传入的参数 (在 Surge 配置文件中填写)
let targetSSIDs = [];
if (typeof $argument !== "undefined") {
    // 处理参数，支持中文逗号和英文逗号，去除空格
    targetSSIDs = $argument.split(/,|，/).map(s => s.trim());
} else {
    // 如果没传参数，给个默认值防止报错
    targetSSIDs = ["MyHomeWiFi"]; 
}

const currentSSID = $network.wifi.ssid;
const currentMode = $surge.outboundMode;

// 只有连接了 Wi-Fi 且能读到 SSID 时才运行逻辑
if (currentSSID) {
    if (targetSSIDs.includes(currentSSID)) {
        // 🎯 命中：切换至直连
        if (currentMode !== "direct") {
            $surge.setOutboundMode("direct");
            $notification.post("出站模式切换", `已连接: ${currentSSID}`, "根据配置自动切换为【直连模式】");
        }
    } else {
        // 🎯 未命中：切换回规则
        // 如果你平时用全局代理，请将 "rule" 改为 "global-proxy"
        if (currentMode !== "rule") {
            $surge.setOutboundMode("rule");
            $notification.post("出站模式切换", "环境变化", "已自动切换为【规则模式】");
        }
    }
} else {
    // 🎯 非 Wi-Fi 环境 (如 5G)：切换回规则
    if (currentMode !== "rule") {
        $surge.setOutboundMode("rule");
    }
}

$done();
