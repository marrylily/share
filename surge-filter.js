// 文件名: surge_filter.js
module.exports = (proxies) => {
  return proxies.filter(p => {
    // 1. 定义支持的协议
    const supported = ['ss', 'ssr', 'vmess', 'trojan', 'http', 'socks5', 'snell', 'hysteria2', 'tuic', 'wireguard'];
    const type = (p.type || '').toLowerCase();
    
    // 2. 第一轮过滤：剔除不支持的协议 (如 vless)
    if (!supported.includes(type)) return false;

    // 3. 第二轮过滤：剔除 VMess 中不支持的传输方式 (如 http/h2)
    if (type === 'vmess') {
      const network = (p.network || 'tcp').toLowerCase();
      // 只保留 tcp, ws, grpc
      return ['tcp', 'ws', 'grpc'].includes(network);
    }

    return true;
  });
};
