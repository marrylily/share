/*
 * AutoSwitch.js
 * 自动切换策略组节点
 * Author: Gemini
 */

const $ = new API();

(async () => {
    try {
        const args = $.getArgs();
        
        // 获取策略组和节点名称，如果没有传 group 参数，默认使用 "EMBY"
        const groupName = args.group || "EMBY";
        const targetNode = args.node;

        if (!targetNode) {
            throw new Error("未指定目标节点 (node 参数缺失)");
        }

        // 执行切换
        if (typeof $surge !== "undefined") {
            // Surge
            $surge.setSelectGroupPolicy(groupName, targetNode);
        } else if (typeof $loon !== "undefined") {
            // Loon
            $config.setSelectGroupPolicy(groupName, targetNode);
        } else {
            throw new Error("非 Surge/Loon 环境");
        }

        $.notify("Emby 节点自动切换 ✅", `策略组: ${groupName}`, `当前节点: ${targetNode}`);
        console.log(`[AutoSwitch] 切换成功: ${groupName} -> ${targetNode}`);
        
    } catch (e) {
        $.notify("自动切换失败 ❌", "请检查脚本参数", e.message);
        console.log(`[AutoSwitch] Error: ${e.message}`);
    } finally {
        $done();
    }
})();

// 辅助工具类
function API() {
    this.isSurge = typeof $surge !== "undefined";
    this.isLoon = typeof $loon !== "undefined";

    this.getArgs = () => {
        if (typeof $argument === "undefined") return {};
        const args = {};
        $argument.split("&").forEach(pair => {
            const [key, ...valueParts] = pair.split("=");
            if (key && valueParts.length > 0) {
                args[key.trim()] = valueParts.join("=").trim();
            }
        });
        return args;
    };

    this.notify = (title, subtitle, body) => {
        if (this.isSurge) $notification.post(title, subtitle, body);
        if (this.isLoon) $notification.post(title, subtitle, body);
    };
}
