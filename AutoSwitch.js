/**
 * Surge 自动切换节点脚本
 * 参数说明：在 Argument 中填写 node=你要切换的节点名称
 */

// ⚠️ 这里填你 Surge 主界面那个策略组的名字
// 通常叫 "Proxy" 或者 "Select Group"，请看你主界面第一个大按钮的名字
const groupName = "EMBY"; 

// 获取参数
const targetNode = $script.params['node'];

if (targetNode) {
    // 执行切换
    const success = $surge.setSelectGroupPolicy(groupName, targetNode);

    if (success) {
        $notification.post("⏰ 节点定时切换", `策略组: ${groupName}`, `已切换至: ${targetNode}`);
        console.log(`[自动切换] 成功切换 ${groupName} -> ${targetNode}`);
    } else {
        $notification.post("❌ 切换失败", "找不到节点或策略组", `请检查名称是否完全一致：${targetNode}`);
        console.log(`[自动切换] 失败，未找到节点: ${targetNode}`);
    }
} else {
    $notification.post("⚠️ 配置错误", "未填写参数", "请在 Argument 中填写 node=节点名称");
}

$done();
