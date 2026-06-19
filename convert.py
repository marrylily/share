import json
import os

# --- 1. 定义源文件路径 ---
file_path = 'rule/surge/emby.list'

# --- 2. 检查源文件 ---
if not os.path.exists(file_path):
    print(f"【严重错误】找不到文件: {file_path}")
    exit(1)

print(f"【成功】已找到源文件: {file_path}")

# --- 3. 读取和解析 ---
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

rules = {
    "domain_suffix": [],
    "domain": [],
    "domain_keyword": [],
    "ip_cidr": []
}

for line in lines:
    line = line.strip()
    if not line or line.startswith('#') or line.startswith('//'):
        continue
    
    parts = line.split(',')
    if len(parts) >= 2:
        rule_type = parts[0].strip().upper()
        value = parts[1].strip()
        if rule_type == 'DOMAIN-SUFFIX': rules['domain_suffix'].append(value)
        elif rule_type == 'DOMAIN': rules['domain'].append(value)
        elif rule_type == 'DOMAIN-KEYWORD': rules['domain_keyword'].append(value)
        elif rule_type == 'IP-CIDR': rules['ip_cidr'].append(value.split(',')[0])

# --- 4. 组装 payload (关键修复点) ---
# 这里一定要确保 payload 被定义，哪怕规则为空
final_rules = {k: v for k, v in rules.items() if v}
payload = {
    "version": 1,
    "rules": [final_rules]
}

# --- 5. 确保输出目录存在并保存 ---
os.makedirs('rule', exist_ok=True)
with open('rule/emby.json', 'w', encoding='utf-8') as f:
    json.dump(payload, f, indent=2, ensure_ascii=False)

print("【成功】转换完成，已生成 rule/emby.json")
