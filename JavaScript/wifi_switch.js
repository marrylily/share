/*
 * Surge 自动直连 (增强容错版)
 */

// 1. 读取参数
let targetArgs = [];
if (typeof $argument !== "undefined") {
    // 按照逗号分割，并强制去除每个名字前后的空格
    targetArgs = $argument.split(/,|，/).map(s => s.trim().replace(/^"|"$/g, '')); 
} else {
    targetArgs = ["5G"]; // 默认值
}

const currentSSID = $network.wifi.ssid;
const currentMode = $surge.outboundMode;

// 打印日志：这步最关键，如果有问题，去日志里能看到系统到底读到了什么
console.log(`[自动切换] 目标列表: ${JSON.stringify(targetArgs)} | 当前Wi-Fi: ${currentSSID}`);

if (currentSSID) {
    // 🔥 核心修改：使用 .some() 进行匹配
    // 只要当前 Wi-Fi 名字（如 5G）等于列表里的名字，或者被包含在列表里
    const isMatch = targetArgs.some(target => currentSSID === target || currentSSID.includes(target));

    if (isMatch) {
        // 🎯 命中目标 -> 切直连
        if (currentMode !== "direct") {
            $surge.setOutboundMode("direct");
            $notification.post("Surge 模式切换", `连接到: ${currentSSID}`, "✅ 已切换为【直连模式】");
        }
    } else {
        // 🎯 未命中 -> 切规则
        if (currentMode !== "rule") {
            $surge.setOutboundMode("rule");
            $notification.post("Surge 模式切换", `连接到: ${currentSSID}`, "🔄 已切换为【规则模式】");
        }
    }
} else {
    // 非 Wi-Fi 环境
    if (currentMode !== "rule") {
        $surge.setOutboundMode("rule");
    }
}

$done();
