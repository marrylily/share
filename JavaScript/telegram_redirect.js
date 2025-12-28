// Surge 脚本：强制 Telegram 网页跳转到 Swiftgram 或 Turrit
const swiftgramUrl = "https://swiftgram.app"; // Swiftgram 的网站或下载链接
const turritUrl = "https://turrit.app"; // Turrit 的网站或下载链接

if ($request.url.indexOf("t.me") !== -1) {
  if ($request.url.indexOf("swiftgram") !== -1) {
    // 如果是 Swiftgram 的链接，跳转到 Swiftgram
    $done({ response: { status: 302, headers: { Location: swiftgramUrl } } });
  } else if ($request.url.indexOf("turrit") !== -1) {
    // 如果是 Turrit 的链接，跳转到 Turrit
    $done({ response: { status: 302, headers: { Location: turritUrl } } });
  } else {
    // 默认情况下跳转到 Swiftgram 或 Turrit
    $done({ response: { status: 302, headers: { Location: swiftgramUrl } } });
  }
} else {
  $done();
}