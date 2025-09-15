/*
 Surge v5 TikTok 检测脚本 (改进版)
 - 检测 www.tiktok.com 和 api.tiktokv.com
 - 更好地区识别
 - 仅在状态变化时通知
*/

const urls = [
  "https://www.tiktok.com/",
  "https://api.tiktokv.com/aweme/v1/passport/web/status/"
];

const STORE_KEY = "tiktok_status";

function notify(title, subtitle, body) {
  $notification.post(title, subtitle, body);
}

function httpGet(url) {
  return new Promise(resolve => {
    $httpClient.get({ url, timeout: 8000 }, (err, resp, data) => {
      if (err) return resolve({ url, ok: false, reason: err.error || err });
      const status = resp.status || resp.statusCode;
      const headers = resp.headers || {};
      let region = headers["x-region"] || headers["x-country"] || headers["location"] || "";

      if ([200, 301, 302].includes(status)) {
        // 如果是 HTML，尝试从 <html lang="xx-XX"> 提取地区
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

  const currentStatus = ok ? "unlocked" : "locked";
  const region = ok ? (ok.region || "未知") : "";
  const detail = results.map(r => `${r.url} → ${r.ok ? "可用" : "不可用"} (${r.status || r.reason})`).join("\n");

  const lastStatus = $persistentStore.read(STORE_KEY);

  if (lastStatus !== currentStatus) {
    if (ok) {
      notify("TikTok 检测结果 ✅", `已解锁，地区: ${region}`, detail);
    } else {
      notify("TikTok 检测结果 ❌", "无法访问 TikTok", detail);
    }
    $persistentStore.write(currentStatus, STORE_KEY);
  } else {
    console.log(`[TikTokCheck] 状态无变化: ${currentStatus}`);
  }

  $done();
})();
