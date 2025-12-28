/*
  Surge 脚本：强制重定向 t.me 到 Swiftgram/Turrit
  原理：伪造 HTML 响应，通过 window.location 唤起 App
*/

// --- 自定义设置 ---
// 如果是 Turrit，尝试改成: turrit:// (如果不行则只能用 tg://)
// 如果是 Swiftgram: swiftgram://
const targetScheme = "swiftgram://"; 
// ----------------

const url = $request.url;
let jumpUrl = "";

// 提取 URL 中的核心部分
// 例子: https://t.me/zhousanwan_bot?start=123
// 目标: swiftgram://resolve?domain=zhousanwan_bot&start=123

// 1. 获取路径 (去掉 https://t.me/)
let path = url.replace(/https?:\/\/(www\.)?t\.me\//, "");

// 2. 处理参数 (?start=xxx)
let query = "";
if (path.indexOf("?") !== -1) {
    let parts = path.split("?");
    path = parts[0]; // 只要 bot 名字
    query = "&" + parts[1]; // 把 ?start=123 变成 &start=123 (因为前面我们要拼接 resolve?domain=)
}

// 3. 生成跳转链接
if (path.startsWith("joinchat/") || path.startsWith("+")) {
    // 进群链接
    let code = path.replace("joinchat/", "").replace("+", "");
    jumpUrl = `${targetScheme}join?invite=${code}`;
} else {
    // 个人、频道、机器人
    jumpUrl = `${targetScheme}resolve?domain=${path}${query}`;
}

// 4. 返回 HTML 页面 (暴力跳转)
const htmlBody = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Opening Swiftgram...</title>
<style>
body { font-family: -apple-system, sans-serif; text-align: center; padding-top: 50px; background: #f5f5f5; }
.btn { display: inline-block; padding: 10px 20px; background: #007aff; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px;}
</style>
</head>
<body>
    <h1>正在跳转 Swiftgram...</h1>
    <p>如果未自动跳转，请点击下方按钮</p>
    <a href="${jumpUrl}" class="btn">手动打开</a>
    <script>
        // 自动执行跳转
        window.location.href = "${jumpUrl}";
    </script>
</body>
</html>
`;

$done({
    body: htmlBody,
    headers: {
        "Content-Type": "text/html;charset=UTF-8"
    }
});
