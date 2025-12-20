/*
 Surge v5 TikTok 检测脚本 (面板版)
 - 手动点击面板按钮运行
 - 检测 www.tiktok.com 和 api.tiktokv.com
 - 直接在面板显示结果
*/

const urls = [
  "https://www.tiktok.com/",
  "https://api.tiktokv.com/aweme/v1/passport/web/status/"
];

function httpGet(url) {
  return new Promise(resolve => {
    $httpClient.get({ url, timeout: 8000 }, (err, resp, data) => {
      if (err) return resolve({ url, ok: false, reason: err.error || err });
      const status = resp.status || resp.statusCode;
      const headers = resp.headers || {};
      let region = headers["x-region"] || headers["x-country"] || headers["location"] || "";

      if ([200, 301, 302].includes(status)) {
        if (!region && data && data.includes("<html")) {
          const m = data.match(/lang="([a-zA-Z-]+)"/);
          if (m) region = m[1];
        }
        resolve({ url, ok: true, status, region });
      } else {
        resolve({ url, ok: false, status });
      }
    });
  });
}

(async () => {
  const results = await Promise.all(urls.map(httpGet));
  const ok = results.find(r => r.ok);

  const statusText = ok ? `✅ 已解锁，地区: ${ok.region || "未知"}` : `❌ 无法访问 TikTok`;
  const detail = results.map(r => `${r.ok ? "✅" : "❌"} ${r.url} → ${r.status || r.reason}`).join("\n");

  $done({
    title: "TikTok 检测结果",
    content: `${statusText}\n\n${detail}`,
    icon: "airplane.circle.fill",
    "icon-color": ok ? "#00CC66" : "#FF0033"
  });
})();
