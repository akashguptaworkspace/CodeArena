"""
Generates public/og-image.png: the preview card LinkedIn, WhatsApp, X and Slack show
when someone shares the site link. 1200 x 627 is LinkedIn's recommended size.

Uses the app's own OFL-licensed fonts from @fontsource (npm dev dependencies).
Run:  python3 scripts/og-image.py
"""
import random
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 627
FONTS = "node_modules/@fontsource"
BG, SURFACE, INK, MUTED, LINE = "#0d1117", "#141b24", "#e7ecf2", "#93a0ae", "#243040"
ACCENT, EASY, MEDIUM, HARD = "#8098ff", "#4cc38a", "#e5aa4c", "#f07373"


def font(family, weight, size):
    return ImageFont.truetype(f"{FONTS}/{family}/files/{family}-latin-{weight}-normal.woff", size)


display = lambda s: font("bricolage-grotesque", 800, s)
display_bold = lambda s: font("bricolage-grotesque", 700, s)
body = lambda s: font("figtree", 500, s)
body_semi = lambda s: font("figtree", 600, s)
mono = lambda s: font("jetbrains-mono", 600, s)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
PAD = 64

# Brand
d.rounded_rectangle((PAD, PAD, PAD + 44, PAD + 44), radius=10, fill=ACCENT)
d.text((PAD + 22, PAD + 22), "CA", font=display(18), fill=BG, anchor="mm")
d.text((PAD + 60, PAD + 22), "CodeArena", font=display_bold(26), fill=INK, anchor="lm")

# Headline
d.text((PAD, 150), "DSA 200", font=display(112), fill=INK)
d.text((PAD, 282), "The 200 LeetCode problems that", font=body_semi(34), fill=INK)
d.text((PAD, 326), "crack Tier 2 coding rounds", font=body_semi(34), fill=INK)

# Companies
d.text((PAD, 398), "PATTERNS ASKED AT", font=mono(15), fill=ACCENT)
d.text((PAD, 424), "Swiggy · Flipkart · Razorpay · Zomato · PhonePe · CRED", font=body(24), fill=MUTED)

# Feature chips
x = PAD
for label in ["17 patterns", "96 Core first", "Daily streak", "Free"]:
    f = body_semi(20)
    w = d.textlength(label, font=f)
    d.rounded_rectangle((x, 500, x + w + 32, 544), radius=22, fill=SURFACE, outline=LINE, width=2)
    d.text((x + 16, 522), label, font=f, fill=INK, anchor="lm")
    x += w + 44

# Visual: 200 problems as a 10 x 20 grid, partly solved (Easy / Medium / Hard colours)
random.seed(7)
cell, gap = 20, 7
cols, rows = 10, 20
gx = W - PAD - cols * cell - (cols - 1) * gap
gy = (H - (rows * cell + (rows - 1) * gap)) // 2
for r in range(rows):
    for c in range(cols):
        i = r * cols + c
        solved = i < 118 and random.random() < 0.85
        colour = (EASY if i < 44 else MEDIUM if i < 183 else HARD) if solved else SURFACE
        x0, y0 = gx + c * (cell + gap), gy + r * (cell + gap)
        d.rounded_rectangle((x0, y0, x0 + cell, y0 + cell), radius=5, fill=colour,
                            outline=None if solved else LINE, width=1)

img.save("public/og-image.png", optimize=True)
print("wrote public/og-image.png", img.size)
