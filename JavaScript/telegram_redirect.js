/**
 * Surge Script: Telegram External Link Redirect
 * 功能：将 t.me 链接重定向至第三方客户端 (Swiftgram, Turrit等)
 */

//在此处修改目标客户端协议
// Swiftgram iOS: "swiftgram://"
// Official/Turrit/Generic: "tg://"
const TARGET_SCHEME = "swiftgram://"; 

let url = $request.url;
const regex = /https?:\/\/(?:www\.)?(?:t|telegram)\.me\/(.+)/;
const match = url.match(regex);

if (match) {
    let path = match[1];
    let newUrl = "";

    // 情况1: 私有群邀请链接 (t.me/joinchat/ABCD 或 t.me/+ABCD)
    if (path.startsWith("joinchat/")) {
        let code = path.replace("joinchat/", "");
        newUrl = `${TARGET_SCHEME}join?invite=${code}`;
    } 
    else if (path.startsWith("+")) {
        let code = path.replace("+", "");
        newUrl = `${TARGET_SCHEME}join?invite=${code}`;
    }
    // 情况2: 贴纸包 (t.me/addstickers/Name)
    else if (path.startsWith("addstickers/")) {
        let name = path.replace("addstickers/", "");
        newUrl = `${TARGET_SCHEME}addstickers?set=${name}`;
    }
    // 情况3: 代理链接 (t.me/proxy?server=...)
    else if (path.startsWith("proxy")) {
        // 直接替换协议头即可
        newUrl = url.replace(/https?:\/\/(?:www\.)?(?:t|telegram)\.me\//, TARGET_SCHEME);
    }
    // 情况4: 常规 用户/频道/群组 (t.me/username) 及 消息 (t.me/username/123)
    else {
        // 移除可能存在的查询参数 (?Start=xxx)
        let cleanPath = path.split("?")[0];
        let parts = cleanPath.split("/");
        
        if (parts.length > 1 && /^\d+$/.test(parts[1])) {
            // 包含消息ID: domain=xx&post=xx
            newUrl = `${TARGET_SCHEME}resolve?domain=${parts[0]}&post=${parts[1]}`;
        } else {
            // 纯用户名/频道名
            newUrl = `${TARGET_SCHEME}resolve?domain=${parts[0]}`;
        }
        
        // 补回查询参数 (如 ?start=)
        if (path.includes("?")) {
            let query = path.split("?")[1];
            newUrl += `&${query}`;
        }
    }

    console.log(`[TgRedirect] Redirecting to: ${newUrl}`);
    
    $done({
        response: {
            status: 302,
            headers: {
                Location: newUrl
            }
        }
    });
} else {
    $done({});
}
