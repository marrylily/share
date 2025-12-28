/*
  Surge 脚本：Telegram 跳转重定向
  功能：将 t.me 链接重定向到第三方客户端（Swiftgram/Turrit/Nicegram）
*/

// --- 配置区域 ---
// 你想跳转到的 App URL Scheme
// Swiftgram 通常支持: swiftgram://
// Turrit 通常支持: turrit:// 
// 如果不确定，也可以填 tg:// (前提是你把官方客户端删了，只留了第三方)
const targetScheme = "swiftgram://"; 
// ----------------

let url = $request.url;
let path = "";

// 处理 t.me 链接逻辑
if (url.indexOf("t.me/") !== -1) {
    // 提取 t.me/ 后面的部分
    // 比如 https://t.me/google_news -> google_news
    path = url.split("t.me/")[1];
}

if (path) {
    // 构造新的跳转链接
    // 第三方客户端通常兼容官方的参数格式，但也可能有变种
    // 最通用的方式是将 https://t.me/xxx 转换为 scheme://resolve?domain=xxx
    
    let newUrl = "";
    
    // 情况 A: 邀请链接 (joinchat 或 +)
    if (path.startsWith("joinchat/") || path.startsWith("+")) {
        let inviteCode = path.replace("joinchat/", "").replace("+", "");
        newUrl = `${targetScheme}join?invite=${inviteCode}`;
    } 
    // 情况 B: 普通用户名或频道
    else {
        newUrl = `${targetScheme}resolve?domain=${path}`;
    }

    // 告诉 Surge：不要访问 t.me 了，直接重定向到新 APP
    $done({
        response: {
            status: 307,
            headers: { Location: newUrl }
        }
    });
} else {
    $done({});
}
