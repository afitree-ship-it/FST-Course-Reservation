import re

with open('src/components/FormSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the weird import line: import { CloudUpload, motion } from 'motion/react';
# and import { CloudUpload,   User, ...
content = content.replace("import { CloudUpload, motion } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';")

with open('src/components/FormSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
