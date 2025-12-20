/*
 * Surge TikTok Unlock Check (Panel)
 * 功能：
 * 1. 检测 Web 和 API 连通性
 * 2. 查询当前节点落地地区 (IP-API)
 * 3. 按照指定格式输出结果
 */

const URLS = [
    { name: 'Web', url: 'http://www.tiktok.com' },
    { name: 'API', url: 'http://api.tiktokv.com' }
];

const REGION_URL = 'http://ip-api.com/json/?fields=countryCode';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
};

(async () => {
    let panel = {
        title: 'TikTok 检测',
        icon: 'bolt.horizontal.circle',
        'icon-color': '#808080',
    };

    try {
        // 1. 并行执行所有检测 (Web + API + 地区查询)
        // 这里的 results 对应你代码里的 results 数组
        const results = await Promise.all(URLS.map(u => checkUrl(u)));
        const regionInfo = await checkRegion();

        // 2. 统计是否全部解锁
        // 只要有一个不通 (ok=false)，就视为未完全解锁
        const allOk = results.every(r => r.ok);
        
        // 3. 构建 ok 对象，用于你的模板变量
        const ok = {
            region: regionInfo // 这里会是 "US", "JP", "HK" 或 "未知"
        };

        // ---------------------------------------------------------
        // 这里是你要求的代码逻辑核心
        // ---------------------------------------------------------
        
        // 标题行
        const titleLine = allOk 
            ? `✅ 已解锁，地区: ${ok.region || "未知"}` 
            : `❌ 无法访问 TikTok`;

        // 详情行 (使用你提供的 map 逻辑，并稍微优化显示格式)
        const detailLines = results.map(r => {
            // 你的需求: "✅ url → status"
            return `${r.ok ? "✅" : "❌"} ${r.name} → ${r.status} (${r.latency})`;
        }).join("\n");

        panel.content = `${titleLine}\n${detailLines}`;

        // ---------------------------------------------------------

        // 4. 设置图标颜色
        if (allOk) {
            panel['icon-color'] = '#5eb95e'; // 绿色
        } else if (results.some(r => r.ok)) {
            panel['icon-color'] = '#f0ad4e'; // 橙色 (部分通)
        } else {
            panel['icon-color'] = '#d9534f'; // 红色 (全挂)
        }

    } catch (err) {
        panel.content = "运行报错: " + err;
        panel['icon-color'] = '#d9534f';
    }

    $done(panel);
})();

// 检测 URL 状态和延迟
function checkUrl(item) {
    return new Promise((resolve) => {
        let startTime = Date.now();
        
        $httpClient.head({ url: item.url, headers: HEADERS, timeout: 5 }, (error, response, data) => {
            let endTime = Date.now();
            let cost = endTime - startTime;
            
            // 构建返回对象 r
            let result = {
                name: item.name,   // Web 或 API
                url: item.url,
                latency: cost + 'ms',
                ok: false,
                status: 'Fail'
            };

            if (error) {
                result.status = 'Timeout';
                resolve(result);
                return;
            }

            // 状态码判断
            if (response.status === 200 || response.status === 301 || response.status === 302) {
                result.ok = true;
                result.status = response.status;
            } else if (response.status === 403) {
                result.status = '403';
            } else {
                result.status = response.status;
            }

            resolve(result);
        });
    });
}

// 查询落地地区
function checkRegion() {
    return new Promise((resolve) => {
        $httpClient.get({ url: REGION_URL, timeout: 5 }, (error, response, data) => {
            if (error || !data) {
                resolve("未知");
                return;
            }
            try {
                // 解析 JSON 获取 countryCode
                let obj = JSON.parse(data);
                resolve(obj.countryCode || "未知");
            } catch (e) {
                resolve("Err");
            }
        });
    });
}
