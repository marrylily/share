# 🚫 禁止广告与埋点上报流量
DOMAIN-KEYWORD,ad.,REJECT
DOMAIN-KEYWORD,ads.,REJECT
DOMAIN-KEYWORD,log.,REJECT
DOMAIN-KEYWORD,track,REJECT
DOMAIN-KEYWORD,stat,REJECT
DOMAIN-KEYWORD,monitor,REJECT
DOMAIN-SUFFIX,appsflyer.com,REJECT
DOMAIN-SUFFIX,umeng.com,REJECT
DOMAIN-SUFFIX,bugly.qq.com,REJECT
DOMAIN-SUFFIX,talkingdata.net,REJECT
DOMAIN-SUFFIX,adjust.com,REJECT
DOMAIN-SUFFIX,crashlytics.com,REJECT
# 抖音非免流域名拦截（减少计费）
DOMAIN-KEYWORD,ad.douyin,REJECT
DOMAIN-KEYWORD,ads.douyin,REJECT
DOMAIN-KEYWORD,log.snssdk,REJECT
DOMAIN-KEYWORD,mon.snssdk,REJECT
DOMAIN-KEYWORD,track.snssdk,REJECT
DOMAIN-KEYWORD,abtest.snssdk,REJECT
DOMAIN-KEYWORD,feedback.snssdk,REJECT
DOMAIN-KEYWORD,app-measurement,REJECT
DOMAIN-SUFFIX,google-analytics.com,REJECT
DOMAIN-SUFFIX,appsflyer.com,REJECT
DOMAIN-SUFFIX,byteoversea.com,REJECT
# Apple 后台诊断/日志收集
DOMAIN-SUFFIX,analytics.icloud.com,REJECT
DOMAIN-SUFFIX,analytics.apple.com,REJECT
DOMAIN-SUFFIX,configuration.apple.com,REJECT
DOMAIN-SUFFIX,gsp-ssl.ls.apple.com,REJECT
DOMAIN-SUFFIX,umeng.com,REJECT