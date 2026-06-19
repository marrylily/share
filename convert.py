import json
import os

# 1. 读取 surge 文件夹下的 list 源文件
with open('surge/emby.list', 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

rules = {
    "domain_suffix": [],
    "domain": [],
    "domain_keyword": [],
    "ip_cidr": []
}

# 2. 解析文本
for line in lines:
    line = line.strip()
    if not line or line.startswith('#') or line.startswith('//'):
        continue

    parts = line.split(',')
    if len(parts) >= 2:
        rule_type = parts[0].strip().upper()
        value = parts[1].strip()

        if rule_type == 'DOMAIN-SUFFIX':
            rules['domain_suffix'].append(value)
        elif rule_type == 'DOMAIN':
            rules['domain'].append(value)
        elif rule_type == 'DOMAIN-KEYWORD':
            rules['domain_keyword'].append(value)
        elif rule_type == 'IP-CIDR':
            rules['ip_cidr'].append(value.split(',')[0])

final_rules = {k: v for k, v in rules.items() if v}
payload = {
    "version": 1,
    "rules": [final_rules]
}

# 3. 确保 rule 文件夹存在
os.makedirs('rule', exist_ok=True)

# 4. 将生成的 json 文件保存到 rule 文件夹下
with open('rule/emby.json', 'w', encoding='utf-8') as f:
    json.dump(payload, f, indent=2, ensure_ascii=False)
