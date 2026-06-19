import json
import os

# --- 诊断模块：打印当前环境信息 ---
print("--- [诊断开始] ---")
print(f"当前脚本运行的路径: {os.getcwd()}")
print("当前目录下的文件和文件夹列表:")
for item in os.listdir('.'):
    print(f" - {item}")

# 检查 surge 文件夹是否存在
if os.path.exists('surge'):
    print("已检测到 'surge' 文件夹，内容如下:")
    for item in os.listdir('surge'):
        print(f"   -> {item}")
else:
    print("错误: 未找到 'surge' 文件夹！请检查你的仓库是否确实有名为 surge 的文件夹。")
    exit(1)

# --- 转换逻辑模块 ---
file_path = 'surge/emby.list'
if not os.path.exists(file_path):
    print(f"错误: 找不到文件 {file_path}")
    exit(1)

print(f"正在读取文件: {file_path}")

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
    # 跳过空行和注释
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

# 确保 rule 文件夹存在
os.makedirs('rule', exist_ok=True)

# 输出
with open('rule/emby.json', 'w', encoding='utf-8') as f:
    json.dump(payload, f, indent=2, ensure_ascii=False)

print("--- [转换成功] ---")
