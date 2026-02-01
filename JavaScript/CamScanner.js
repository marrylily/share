// 文件名建议保存为: CamScanner.js

let obj = JSON.parse($response.body);

// 修改响应数据，强制设置 SVIP 属性和过期时间
// 注意：具体的字段路径 data.psnl_vip_property 可能随 App 版本更新而变化
if (obj && obj.data) {
    obj.data.psnl_vip_property = {
        "expiry": 4102415999, // 设置一个遥远的过期时间
        "svip": 1,            // 开启 SVIP 标识
        "nxt_renew_tm": 4102415999,
        "level_info": {
            "level": 100,
            "days": 9999,
            "end_days": 30
        }
    };
}

$done({body: JSON.stringify(obj)});
