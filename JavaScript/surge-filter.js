return proxies.filter(p => {
  // 1. 获取基础信息 (全部转小写，防止匹配失败)
  const type = (p.type || '').toLowerCase();
  const network = (p.network || 'tcp').toLowerCase();
  const obfs = (p.obfs || '').toLowerCase();

  // 2. 定义支持的协议白名单 (Surge 支持的协议)
  const supported = ['ss', 'ssr', 'vmess', 'trojan', 'http', 'socks5', 'snell', 'hysteria2', 'tuic', 'wireguard', 'ponie'];

  // 3. 第一轮筛选：如果协议不在白名单 (比如 vless)，直接剔除
  if (!supported.includes(type)) {
    return false;
  }

  // 4. 第二轮筛选：如果是 VMess，必须检查是否“带毒”
  if (type === 'vmess') {
    // 检查 A: 传输方式必须是 tcp, ws 或 grpc。如果是 http 或 h2，剔除！
    if (!['tcp', 'ws', 'grpc'].includes(network)) {
      return false;
    }
    // 检查 B: 混淆不能是 http。Surge 不支持 VMess 的 HTTP 混淆
    if (obfs.includes('http')) {
      return false;
    }
  }

  // 5. 剩下的都是干净的，放行
  return true;
});
