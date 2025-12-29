/**
 * Surge Script: Telegram HTML Redirect
 * 解决 302 跳转失败问题，通过模拟网页点击强制唤起 Swiftgram/Turrit
 */

// --- 配置区域 ---
// Swiftgram 用户使用: "swiftgram://"
// Turrit/官方 用户使用: "tg://"
const TARGET_SCHEME = "swiftgram://"; 
// ----------------

const url = $request.url;
// 简单的正则匹配 t.me/xxx
const regex = /https?:\/\/(?:www\.)?(?:t|telegram)\.me\/(.+)/;
const match = url.match(regex);

if (match) {
    let path = match[1];
    let appUrl = "";

    // 逻辑处理：提取用户名或参数
    // 1. 私有群 (joinchat 或 +)
    if (path.startsWith("joinchat/") || path.startsWith("+")) {
        let code = path.replace(/^(joinchat\/|\+)/, "");
        appUrl = `${TARGET_SCHEME}join?invite=${code}`;
    }
    // 2. 贴纸
    else if (path.startsWith("addstickers/")) {
        let name = path.replace("addstickers/", "");
        appUrl = `${TARGET_SCHEME}addstickers?set=${name}`;
    }
    // 3. 常规 (t.me/user 或 t.me/user/123)
    else {
        // 清理一下可能的 ?start= 参数
        let cleanPath = path; 
        // 简单处理: 将 / 转为参数
        let parts = cleanPath.split("?")[0].split("/");
        
        if (parts.length > 1 && /^\d+$/.test(parts[1])) {
            // 包含消息ID
            appUrl = `${TARGET_SCHEME}resolve?domain=${parts[0]}&post=${parts[1]}`;
        } else {
            // 纯用户/Bot
            appUrl = `${TARGET_SCHEME}resolve?domain=${parts[0]}`;
        }
        
        // 如果原链接带有参数 (如 bot start 参数)，补回去
        if (url.includes("?")) {
            let query = url.split("?")[1];
            // 某些客户端可能需要把 start 参数拼接到 url 后面
            if(appUrl.includes("?")) {
                appUrl += `&${query}`;
            } else {
                appUrl += `?${query}`;
            }
        }
    }

    // 生成一个简单的 HTML 页面
    const htmlBody = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>正在跳转...</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; text-align: center; padding-top: 50px; }
            .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px; }
            .btn { display: inline-block; background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
            p { color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>正在前往 Swiftgram</h2>
            <p>如果未自动跳转，请点击下方按钮</p>
            <a href="${appUrl}" class="btn">点击打开</a>
            <p style="font-size:12px; margin-top:15px; color:#999;">原始链接: ${path}</p>
        </div>
        <script>
            // 自动尝试跳转
            window.location.href = "${appUrl}";
        </script>
    </body>
    </html>
    `;

    console.log(`[TgRedirect] Hiding 302, serving HTML for: ${appUrl}`);

    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "text/html;charset=UTF-8"
            },
            body: htmlBody
        }
    });

} else {
    $done({});
}
