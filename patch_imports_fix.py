import re

with open('src/components/FormSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { CloudUpload, YEARS", "import { YEARS")
content = content.replace("import { CloudUpload, submitRequest", "import { submitRequest")
content = content.replace("import { CloudUpload, useTranslation", "import { useTranslation")
content = content.replace("import { CloudUpload, Calendar, Bell, Lock, ShieldAlert } from 'lucide-react';", "import { Calendar, Bell, Lock, ShieldAlert } from 'lucide-react';")

with open('src/components/FormSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
