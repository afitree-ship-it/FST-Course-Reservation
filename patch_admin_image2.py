import re

with open('src/components/AdminSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's check if there are any other places with "High quality screenshots verification tool"
pattern = re.compile(r'High quality screenshots verification tool', re.IGNORECASE)
matches = pattern.findall(content)
print(f"Found {len(matches)} matches in AdminSection.tsx")
