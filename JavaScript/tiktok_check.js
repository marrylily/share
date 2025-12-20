/*
 * TikTok Plus Panel (JS)
 * ----------------------------------------
 * 功能：
 * 1. 地区解锁检测 (基于 IP 归属地)
 * 2. 自动显示国旗 Emoji (🇺🇸/🇯🇵)
 * 3. 显示具体城市 (Los Angeles)
 * 4. 显示运营商 ISP (判断是否为原生 IP 的关键)
 * ----------------------------------------
 */

const BLOCKED_REGIONS = ['CN', 'HK', 'MO', 'IN', 'RU'];
const GEO_URL = 'http://ip-api.com/json/?fields=status,country,countryCode,city,isp';

(async () => {
    let panel = {
        title: 'TikTok 检测',
        icon: 'bolt.horizontal.circle',
        'icon-color': '#808080'
    };

    try {
        const data = await getRegion();
        // 解构数据，设置默认值防止 API 偶尔缺字段
        const { countryCode = 'Unknown', city = 'Unknown', isp = 'Unknown' } = data;
        
        // 1. 生成国旗
        const flag = getFlagEmoji(countryCode);
        
        // 2. 简化 ISP 名称 (太长会撑爆面板)
        // 移除常见的后缀如 "Limited", "Corporation", "LLC" 等，让显示更清爽
        let shortIsp = isp
            .replace(/,? (Inc\.?|L\.?L\.?C\.?|Ltd\.?|Corporation|Corp\.?|Limited)$/i, "")
            .substring(0, 18); // 强制截断

        // 3. 判定逻辑
        if (BLOCKED_REGIONS.includes(countryCode)) {
            // ❌ 不支持
            panel.title = `TikTok: ❌ ${countryCode} ${flag}`;
            panel.content = `不支持此区域\n运营商: ${shortIsp}`;
            panel['icon-color'] = '#d9534f'; // 红色
        } else {
            // ✅ 支持
            panel.title = `TikTok: ✅ ${countryCode} ${flag}`;
            panel.content = `地区: ${city}\nISP: ${shortIsp}`;
            panel['icon-color'] = '#5eb95e'; // 绿色
        }

    } catch (err) {
        console.log("TikTok Check Error: " + err);
        panel.content = "检测失败\n网络或接口异常";
        panel['icon-color'] = '#f0ad4e'; // 橙色
    }

    $done(panel);
})();

function getRegion() {
    return new Promise((resolve, reject) => {
        $httpClient.get({ url: GEO_URL, timeout: 5000 }, (err, resp, data) => {
            if (err) reject(err);
            else {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject("JSON Parse Error");
                }
            }
        });
    });
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🏳️';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char =>  127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}
