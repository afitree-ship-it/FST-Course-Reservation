import re

with open('src/components/FormSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

overlay = """
      {/* 🚀 Submission Progress Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-mangosteen/10 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 border-4 border-mangosteen/30 rounded-full border-t-mangosteen animate-spin"></div>
                <CloudUpload className="w-8 h-8 text-mangosteen relative z-10 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 font-sans mb-2">
                {isTh ? 'กำลังอัปโหลดคำร้องของคุณ' : 'Submitting Your Request'}
              </h3>
              <p className="text-slate-500 font-sans text-sm mb-6">
                {isTh ? 'กรุณารอสักครู่ ระบบกำลังเข้ารหัสและบันทึกข้อมูลอย่างปลอดภัย (ประมาณ 1-3 วินาที)...' : 'Please wait securely saving your request (approx. 1-3 seconds)...'}
              </p>
              
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '90%' }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="absolute top-0 left-0 h-full bg-mangosteen rounded-full"
                ></motion.div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-3 font-medium uppercase tracking-widest animate-pulse">CONNECTING TO GOOGLE SHEETS...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
"""

# We need to add CloudUpload icon from lucide-react if not present
if 'CloudUpload' not in content:
    content = content.replace("import { ", "import { CloudUpload, ")

# Inject the overlay
pattern = re.compile(r'(<div className="bg-white/85 backdrop-blur-2xl rounded-2xl shadow-\[0_25px_60px_-15px_rgba\(0,0,0,0\.15\),_0_15px_30px_-15px_rgba\(0,0,0,0\.1\)\] overflow-hidden border border-white/90 transition-all duration-300">)')
match = pattern.search(content)
if match:
    new_content = content[:match.start()] + overlay + "\n      " + match.group(1) + content[match.end():]
    with open('src/components/FormSection.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched submit overlay.")
else:
    print("Regex did not match.")
