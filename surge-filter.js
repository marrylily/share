/**
 * Surge 协议清洗 (带参数版)
 * * 默认行为：只保留 Surge 当前版本稳定支持的协议和传输方式。
 * 自定义行为：通过 Sub-Store 界面传入 args 参数覆盖默认设置。
 * * 参数说明 (在 Sub-Store 界面填写):
 * proto: 允许的协议类型，用逗号分隔。例如: ss,vmess,trojan
 * network: (仅针对VMess) 允许的传输方式。例如: ws,tcp
 */
/**
 * Surge 协议清洗 (防崩溃改良版)
 */
module.exports = (proxies, target, args) => {
  // --- 安全检查：如果输入不是数组，直接返回空 ---
  if (!Array.isArray(proxies)) return [];

  // --- 1. 定义默认配置 ---
  const defaultProtos = ['ss', 'ssr', 'vmess', 'trojan', 'http', 'https', 'socks5', 'snell', 'hysteria2', 'tuic', 'wireguard', 'ponie'];
  const defaultVmessNet = ['tcp', 'ws', 'grpc'];

  // --- 2. 解析用户传入的参数 ---
  let allowedProtos = defaultProtos;
  if (args && args.proto) {
    allowedProtos = args.proto.split(',').map(i => i.trim().toLowerCase());
  }

  let allowedVmessNet = defaultVmessNet;
  if (args && args.network) {
    allowedVmessNet = args.network.split(',').map(i => i.trim().toLowerCase());
  }

  // --- 3. 开始过滤 ---
  return proxies.filter(p => {
    // [关键修复] 检查 p 是否存在以及是否有 type 字段，防止报错
    if (!p || !p.type) return false;

    const type = p.type.toLowerCase();

    // 检查协议是否在白名单中
    if (!allowedProtos.includes(type)) {
      return false;
    }

    // 特殊处理 VMess 的传输层
    if (type === 'vmess') {
      // [关键修复] 同样给 network 加默认值防止报错
      const network = (p.network || 'tcp').toLowerCase();
      return allowedVmessNet.includes(network);
    }

    return true;
  });
};
