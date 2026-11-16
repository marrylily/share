function operator(proxies = []) {
  const _ = lodash

  const host = _.get($arguments, 'host')
  const hostPrefix = _.get($arguments, 'hostPrefix')
  const hostSuffix = _.get($arguments, 'hostSuffix')
  const port = _.get($arguments, 'port')
  const portPrefix = _.get($arguments, 'portPrefix')
  const portSuffix = _.get($arguments, 'portSuffix')
  const defaultPath = _.get($arguments, 'defaultPath') || '/'
  const argPath = _.get($arguments, 'path')
  const pathPrefix = _.get($arguments, 'pathPrefix')
  const pathSuffix = _.get($arguments, 'pathSuffix')
  const defaultMethod = _.get($arguments, 'defaultMethod') || 'GET'
  const argMethod = _.get($arguments, 'method')
  const array = _.get($arguments, 'array')
  const defaultNetwork = _.get($arguments, 'defaultNetwork') || 'http'

  return proxies.map((p = {}) => {
    const type = _.get(p, 'type')
    let path = argPath
    let method = argMethod

    // 1. 通用端口修改（适用于所有需要改端口的协议）
    if (port && _.includes(['vmess', 'vless', 'trojan', 'ss', 'ssr', 'snell'], type)) {
      _.set(p, 'port', Number(port) || port)
      if (portPrefix) _.set(p, 'name', `${portPrefix}${p.name}`)
      if (portSuffix) _.set(p, 'name', `${p.name}${portSuffix}`)
    }

    // 2. 处理 vmess / vless / trojan
    if (_.includes(['vmess', 'vless', 'trojan'], type)) {
      let network = _.get(p, 'network')
      const isReality = _.get(p, 'reality-opts')

      if (!network && !isReality) {
        network = defaultNetwork
        _.set(p, 'network', defaultNetwork)
      }

      if (host) {
        if (hostPrefix) _.set(p, 'name', `${hostPrefix}${p.name}`)
        if (hostSuffix) _.set(p, 'name', `${p.name}${hostSuffix}`)

        _.set(p, 'servername', host)
        if (_.get(p, 'tls')) {
          _.set(p, 'skip-cert-verify', true)
          _.set(p, 'sni', host)
        }

        if (!isReality) {
          if (network === 'ws') {
            _.set(p, 'ws-opts.headers.Host', host)
          } else if (network === 'h2') {
            _.set(p, 'h2-opts.host', array ? [host] : host)
          } else if (network === 'http') {
            _.set(p, 'http-opts.headers.Host', array ? [host] : host)
          } else if (network) {
            _.set(p, `${network}-opts.headers.Host`, host)
          }
        }
      }

      if (network === 'http') {
        const curMethod = _.get(p, 'http-opts.method')
        if (!curMethod && !method) {
          method = defaultMethod
        }
        if (method) {
          _.set(p, 'http-opts.method', method)
        }
      }

      if (!isReality) {
        if (network === 'http') {
          let currentPath = _.get(p, 'http-opts.path')
          if (_.isArray(currentPath)) {
            currentPath = _.find(currentPath, i => _.startsWith(i, '/'))
          } else if (!path) {
            path = currentPath
          }
          if (!_.startsWith(currentPath, '/') && !path) {
            path = defaultPath
          }
        }
        if (path) {
          if (pathPrefix) _.set(p, 'name', `${pathPrefix}${p.name}`)
          if (pathSuffix) _.set(p, 'name', `${p.name}${pathSuffix}`)

          if (network === 'ws') {
            _.set(p, 'ws-opts.path', path)
          } else if (network === 'h2') {
            _.set(p, 'h2-opts.path', path)
          } else if (network === 'http') {
            _.set(p, 'http-opts.path', array ? [path] : path)
          } else if (network) {
            _.set(p, `${network}-opts.path`, path)
          }
        }
      }
    }

    // 3. 处理 Shadowsocks (ss) - 支持 obfs (simple-obfs) 与 v2ray-plugin
    else if (type === 'ss') {
      const plugin = _.get(p, 'plugin')

      // 如果原本没有配置插件，默认初始化为 obfs (simple-obfs) 的 http 混淆
      if (!plugin) {
        _.set(p, 'plugin', 'obfs')
        _.set(p, 'plugin-opts.mode', defaultNetwork === 'tls' ? 'tls' : 'http')
      } else if (plugin === 'obfs' && !_.get(p, 'plugin-opts.mode')) {
        _.set(p, 'plugin-opts.mode', 'http')
      }

      if (host) {
        if (hostPrefix) _.set(p, 'name', `${hostPrefix}${p.name}`)
        if (hostSuffix) _.set(p, 'name', `${p.name}${hostSuffix}`)
        // obfs 和 v2ray-plugin 的混淆域名统一在 plugin-opts.host
        _.set(p, 'plugin-opts.host', host)
        // 兼容部分解析器直接读取根属性 obfs-host
        if (_.get(p, 'obfs')) {
          _.set(p, 'obfs-host', host)
        }
      }

      if (path) {
        if (pathPrefix) _.set(p, 'name', `${pathPrefix}${p.name}`)
        if (pathSuffix) _.set(p, 'name', `${p.name}${pathSuffix}`)
        // 路径对 v2ray-plugin (websocket) 或支持 path 的插件生效
        _.set(p, 'plugin-opts.path', path)
      }
    }

    // 4. 处理 Snell - 支持 obfs-opts (http / tls)
    else if (type === 'snell') {
      if (!_.get(p, 'obfs-opts.mode')) {
        _.set(p, 'obfs-opts.mode', defaultNetwork === 'tls' ? 'tls' : 'http')
      }

      if (host) {
        if (hostPrefix) _.set(p, 'name', `${hostPrefix}${p.name}`)
        if (hostSuffix) _.set(p, 'name', `${p.name}${hostSuffix}`)
        _.set(p, 'obfs-opts.host', host)
      }
    }

    return p
  })
}
