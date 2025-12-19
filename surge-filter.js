/**
 * Surge 协议自主管理脚本 (可编辑版)
 * * 使用说明：
 * 1. 想要开启某个协议？在 ALLOWED_TYPES 列表里加上它的名字。
 * 2. 想要关闭某个协议？在列表里删掉它，或者在前面加 // 注释掉。
 */

// ================= 配置区域 (请在此处修改) =================

// 1. 【协议白名单】
// 只有在这个列表里的协议会被保留。
// 如果 Surge 以后支持了 vless，你只需在这里面加上 'vless' 即可。
const ALLOWED_TYPES = [
  'ss',          // Shadowsocks
  'ssr',         // ShadowsocksR
  'vmess',       // VMess
  'trojan',      // Trojan
  'http',        // HTTP Proxy
  'https',       // HTTPS Proxy
  'socks5',      // Socks5
  'snell',       // Surge 专属协议
  'hysteria2',   // Hy2
  'tuic',        // Tuic
  'wireguard',   // WireGuard
  'ponie'        // Ponie
  // 'vless'     <-- 以后如果要支持 VLESS，把前面的 // 去掉，或者自己手写一行
];

// 2. 【VMess 传输方式白名单】
// 即使是 VMess，Surge 也不支持所有模式。
// 通常保留 tcp, ws, grpc 即可。绝对不要加 http 或 h2。
const ALLOWED_VMESS_NETWORKS = [
  'tcp',
  'ws',   // WebSocket
  'grpc'  // gRPC
];

// ================= 核心逻辑区域 (通常无需修改) =================

function userFilter(proxies) {
  return proxies.filter(node => {
    // 0. 数据预处理
    const type = (node.type || '').toLowerCase();
    const network = (node.network || 'tcp').toLowerCase();

    // 1. 检查协议是否在【协议白名单】中
    if (!ALLOWED_TYPES.includes(type)) {
      return false; // 不支持的协议，直接剔除
    }

    // 2. 如果是 VMess，额外检查传输方式
    if (type === 'vmess') {
      if (!ALLOWED_VMESS_NETWORKS.includes(network)) {
        return false; // 不支持的 VMess 传输方式 (如 http/h2)，剔除
      }
    }

    // 3. (可选) Trojan 额外检查：剔除 shadow-tls
    if (type === 'trojan' && node['shadow-tls-password']) {
      return false;
    }

    return true; // 通过检查
  });
}

// ================= 环境兼容层 (防报错) =================
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = userFilter;
} else {
  userFilter;
}
