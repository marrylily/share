/**
 * Surge 协议清洗 (带参数版)
 * * 默认行为：只保留 Surge 当前版本稳定支持的协议和传输方式。
 * 自定义行为：通过 Sub-Store 界面传入 args 参数覆盖默认设置。
 * * 参数说明 (在 Sub-Store 界面填写):
 * proto: 允许的协议类型，用逗号分隔。例如: ss,vmess,trojan
 * network: (仅针对VMess) 允许的传输方式。例如: ws,tcp
 */

module.exports = (proxies, target, args) => {
  // --- 1. 定义默认配置 (如果未传入参数，则使用这些默认值) ---
  const defaultProtos = ['ss', 'ssr', 'vmess', 'trojan', 'http', 'socks5', 'snell', 'hysteria2', 'tuic', 'wireguard', 'ponie'];
  const defaultVmessNet = ['tcp', 'ws', 'grpc']; // 默认只保留 TCP, WebSocket, gRPC

  // --- 2. 解析用户传入的参数 (Args) ---
  // 处理协议白名单
  let allowedProtos = defaultProtos;
  if (args && args.proto) {
    // 将用户输入的 "ss,vmess" 这种字符串切割成数组，并去除空格转小写
    allowedProtos = args.proto.split(',').map(i => i.trim().toLowerCase());
  }

  // 处理 VMess 传输方式白名单
  let allowedVmessNet = defaultVmessNet;
  if (args && args.network) {
    allowedVmessNet = args.network.split(',').map(i => i.trim().toLowerCase());
  }

  // --- 3. 开始过滤 ---
  return proxies.filter(p => {
    const type = p.type.toLowerCase();

    // 检查协议是否在白名单中
    if (!allowedProtos.includes(type)) {
      return false; // 协议不支持，剔除
    }

    // 特殊处理 VMess 的传输层
    if (type === 'vmess') {
      const network = (p.network || 'tcp').toLowerCase();
      // 检查传输方式是否在白名单中
      return allowedVmessNet.includes(network);
    }

    // 其他协议默认放行
    return true;
  });
};
