/*
 * TikTok Region Eligibility Check
 * 逻辑：不连接 TikTok，而是检测节点 IP 地区。
 * 只要地区在支持列表，就显示“✅ 支持”，避免因分流规则导致的检测失败。
 */

// TikTok 禁止或受限的地区代码 (黑名单)
// CN: 中国, HK: 香港, MO: 澳门, IN: 印度
const BLOCKED_REGIONS = ['CN', 'HK', 'MO', 'IN', 'RU'];

const GEO_URL = 'http://ip-api.com/json/?fields=countryCode,country';

(async () => {
    let panel = {
        title: 'TikTok 节点检测',
        icon: 'bolt.horizontal.circle',
        'icon-color': '#808080'
    };

    try {
        const regionData = await getRegion();
        const code = regionData.countryCode;     // 例如 "US"
        const name = regionData.country;         // 例如 "United States"

        // 判断逻辑：如果不在黑名单里，就认为支持
        if (BLOCKED_REGIONS.includes(code)) {
            // 不支持的地区
            panel.content = `❌ 节点不支持\n地区: ${name} (${code})`;
            panel['icon-color'] = '#d9534f'; // 红色
        } else {
            // 支持的地区
            panel.content = `✅ 节点支持\n地区: ${name} (${code})`;
            panel['icon-color'] = '#5eb95e'; // 绿色
        }

    } catch (err) {
        panel.content = "检测失败\n网络超时或无网络";
        panel['icon-color'] = '#f0ad4e'; // 橙色
    }

    $done(panel);
})();

function getRegion() {
    return new Promise((resolve, reject) => {
        // timeout 设置短一点，因为查 IP 很快
        $httpClient.get({ url: GEO_URL, timeout: 5000 }, (error, response, data) => {
            if (error) {
                reject(error);
                return;
            }
            try {
                const obj = JSON.parse(data);
                resolve(obj);
            } catch (e) {
                reject(e);
            }
        });
    });
}
