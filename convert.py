import json
import os

# --- 核心修改：精准指向你的 emby.list 存放位置 ---
file_path = 'rule/surge/emby.list' 

# 诊断输出
if not os.path.exists(file_path):
    print(f"【致命错误】找不到文件: {file_path}")
    print("请确认 rule/surge 文件夹下是否确实存在 emby.list")
    exit(1)

print(f"【成功】已找到源文件: {file_path}")

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

rules = {
    "domain_suffix": [],
    "domain": [],
    "domain_keyword": [],
    "ip_cidr": []
}

# ... (后续转换逻辑保持不变) ...

# 确保输出目录存在 (输出到 rule/ 文件夹)
os.makedirs('rule', exist_ok=True)

with open('rule/emby.json', 'w', encoding='utf-8') as f:
    json.dump(payload, f, indent=2, ensure_ascii=False)

print("【成功】转换完成，已生成 rule/emby.json")
