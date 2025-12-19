return proxies.filter(p => {

  // --- 1. 基础协议白名单 ---

  const type = p.type.toLowerCase();

  // Surge 支持的基础协议

  const supportedProtocols = ['ss', 'ssr', 'vmess', 'trojan', 'http', 'socks5', 'snell', 'hysteria2', 'tuic', 'wireguard'];

  

  // 如果连基础协议都不支持（比如 vless），直接剔除

  if (!supportedProtocols.includes(type)) {

    return false;

  }



  // --- 2. 针对 VMess 的深度检查 ---

  if (type === 'vmess') {

    // 获取传输方式，如果没有定义 network 字段，默认为 'tcp'

    // 常见的 network 值: 'ws', 'tcp', 'http', 'h2', 'grpc'

    const network = (p.network || 'tcp').toLowerCase();



    // 【关键配置】在这里定义你希望 VMess 保留的传输方式

    // 你提到：支持 ws，不支持 http

    // 通常建议保留 tcp 和 ws (以及 grpc，因为 Surge 较新版本也支持 grpc)

    const allowedNetworks = ['ws', 'tcp', 'grpc'];



    // 检查当前节点的传输方式是否在允许列表中

    // 如果是 'http' 或 'h2'，就会因为不在列表中而被剔除

    return allowedNetworks.includes(network);

  }



  // --- 3. 其他协议（如 SS/Trojan）默认放行 ---

  // 如果你也想过滤 Trojan 的传输方式（如剔除 Trojan-gRPC），可以在这里加类似的判断

  return true;

});
