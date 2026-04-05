/*
通用 P2P 拦截脚本 - 覆盖网易、字节、B站等
*/

const url = $request.url;
let body = { "code": 0, "message": "success", "data": { "enable": false, "p2p": false } };

// 针对不同厂商的特殊返回结构进行微调
if (url.indexOf("tianwenca.com") !== -1) {
    // 网易系
    body = { "code": 200, "data": { "enable": false, "p2p": false, "cdn_only": true } };
} else if (url.indexOf("bytep2p") !== -1 || url.indexOf("volces.com") !== -1) {
    // 字节系 (抖音/西瓜/头条)
    body = { "code": 0, "data": { "p2p_all_enable": 0, "p2p_sd_enable": 0 } };
} else if (url.indexOf("biliapi") !== -1) {
    // B站
    body = { "code": 0, "data": { "mcdn_enable": false, "p2p_enable": false } };
}

console.log(`已拦截 P2P 调度: ${url}`);

$done({
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body)
});
