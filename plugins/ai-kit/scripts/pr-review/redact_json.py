import json
import re
import sys

SENSITIVE = re.compile(r"authori[sz]ation|cookie|token|passw(or)?d|secret|api[-_ ]?key|credential", re.I)
MASK = "***"
PAYLOAD = re.compile(r"^(body|stream|responseBody|requestBody|raw|formdata|urlencoded)$", re.I)
OMITTED = "<omitted>"


def redact(node):
    if isinstance(node, dict):
        node = {k: OMITTED if PAYLOAD.match(k) else v for k, v in node.items()}
        name = node.get("key") if isinstance(node.get("key"), str) else node.get("name")
        if isinstance(name, str) and SENSITIVE.search(name) and "value" in node:
            node = dict(node, value=MASK)
        return {k: MASK if SENSITIVE.search(k) and not isinstance(v, (dict, list)) else redact(v)
                for k, v in node.items()}
    if isinstance(node, list):
        return [redact(item) for item in node]
    if isinstance(node, str) and re.match(r"(?i)^(bearer|basic)\s+\S+", node):
        return MASK
    return node


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: redact_json.py <in.json> <out.json>")
    with open(sys.argv[1], encoding="utf-8") as src:
        data = json.load(src)
    with open(sys.argv[2], "w", encoding="utf-8") as dst:
        json.dump(redact(data), dst, indent=2)
    print(f"REDACTED_FILE={sys.argv[2]}")


if __name__ == "__main__":
    main()
