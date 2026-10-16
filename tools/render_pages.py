import fitz, sys, os, glob
pdf = r'现代汉语方言大词典 苏州方言词典 (叶祥苓) (z-library.sk, 1lib.sk, z-lib.sk).pdf'
outdir = r'C:/Users/WILLIAMYANG/AppData/Local/Temp/chatbox-sandbox/015809d4-5a26-48b9-adb9-db056778a2db/pages'
os.makedirs(outdir, exist_ok=True)
doc = fitz.open(pdf)
from_, to = int(sys.argv[1]), int(sys.argv[2])
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 1.6
mat = fitz.Matrix(scale, scale)
for i in range(from_, to + 1):
    p = doc[i - 1]  # 1-based pdf page number
    out = os.path.join(outdir, f'p{i:04d}.jpg')
    if os.path.exists(out): continue
    pix = p.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
    pix.save(out, jpg_quality=92)
print('rendered', from_, to, 'scale', scale)
