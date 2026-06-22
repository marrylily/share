import json
from pathlib import Path


SOURCE_PATH = Path("rule/surge/emby.list")
OUTPUT_PATH = Path("rule/emby.json")

RULE_TYPE_MAP = {
    "DOMAIN": "domain",
    "DOMAIN-SUFFIX": "domain_suffix",
    "DOMAIN-KEYWORD": "domain_keyword",
    "IP-CIDR": "ip_cidr",
    "IP-CIDR6": "ip_cidr",
}


def parse_surge_rules(source_path: Path) -> dict[str, list[str]]:
    rules: dict[str, list[str]] = {
        "domain": [],
        "domain_suffix": [],
        "domain_keyword": [],
        "ip_cidr": [],
    }

    for line_number, raw_line in enumerate(
        source_path.read_text(encoding="utf-8").splitlines(),
        start=1,
    ):
        line = raw_line.strip()
        if not line or line.startswith(("#", "//")):
            continue

        rule_type, separator, rest = line.partition(",")
        if not separator:
            print(f"Skip line {line_number}: missing comma")
            continue

        key = RULE_TYPE_MAP.get(rule_type.strip().upper())
        if key is None:
            print(f"Skip line {line_number}: unsupported rule type {rule_type}")
            continue

        value = rest.split(",", 1)[0].strip()
        if value and value not in rules[key]:
            rules[key].append(value)

    return {key: values for key, values in rules.items() if values}


def main() -> None:
    if not SOURCE_PATH.exists():
        raise FileNotFoundError(f"Source rule file not found: {SOURCE_PATH}")

    rule = parse_surge_rules(SOURCE_PATH)
    if not rule:
        raise ValueError(f"No supported rules found in {SOURCE_PATH}")

    payload = {
        "version": 1,
        "rules": [rule],
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    total = sum(len(values) for values in rule.values())
    print(f"Generated {OUTPUT_PATH} from {SOURCE_PATH} ({total} rules)")


if __name__ == "__main__":
    main()
