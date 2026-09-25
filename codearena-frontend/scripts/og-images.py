"""
Generates the link-preview cards (1200 x 627, LinkedIn's recommended size) for every module except DSA,
which has its own design in scripts/og-image.py. Output: public/og/<module>.png, referenced from the
`share.image` field in src/config/modules.js.

Uses the app's own OFL-licensed fonts from @fontsource (npm dev dependencies) and Pillow.
Run from codearena-frontend/:  python3 scripts/og-images.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 627
PAD = 64
FONTS = "node_modules/@fontsource"
BG, SURFACE, INK, MUTED, LINE = "#0d1117", "#141b24", "#e7ecf2", "#93a0ae", "#243040"
ACCENT, GREEN, AMBER, RED, TEAL = "#8098ff", "#4cc38a", "#e5aa4c", "#f07373", "#4fc1d6"
OUT = Path("public/og")


def font(family, weight, size):
    return ImageFont.truetype(f"{FONTS}/{family}/files/{family}-latin-{weight}-normal.woff", size)


display = lambda s: font("bricolage-grotesque", 800, s)
display_bold = lambda s: font("bricolage-grotesque", 700, s)
body = lambda s: font("figtree", 500, s)
body_semi = lambda s: font("figtree", 600, s)
mono = lambda s: font("jetbrains-mono", 600, s)


def base(eyebrow, title_lines, sub_lines, chips):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # Brand
    d.rounded_rectangle((PAD, PAD, PAD + 44, PAD + 44), radius=10, fill=ACCENT)
    d.text((PAD + 22, PAD + 22), "CA", font=display(18), fill=BG, anchor="mm")
    d.text((PAD + 60, PAD + 22), "CodeArena", font=display_bold(26), fill=INK, anchor="lm")
    # Eyebrow + headline + subtitle
    d.text((PAD, 142), eyebrow, font=mono(17), fill=ACCENT)
    y = 172
    size = 92 if len(title_lines) == 1 else 78
    for line in title_lines:
        d.text((PAD, y), line, font=display(size), fill=INK)
        y += size + 6
    y += 18
    for line in sub_lines:
        d.text((PAD, y), line, font=body_semi(30), fill=INK)
        y += 42
    # Feature chips
    x = PAD
    for label in chips:
        f = body_semi(20)
        w = d.textlength(label, font=f)
        d.rounded_rectangle((x, 520, x + w + 32, 564), radius=22, fill=SURFACE, outline=LINE, width=2)
        d.text((x + 16, 542), label, font=f, fill=INK, anchor="lm")
        x += w + 44
    return img, d


def genai():
    img, d = base("FOR JAVASCRIPT DEVELOPERS", ["GenAI 20-Day", "Sprint"],
                  ["From MERN developer to", "GenAI developer"],
                  ["Python for JS devs", "RAG from scratch", "Agents + MCP"])
    # 20 days as 4 phases x 5 days
    phases = [("Foundations", ACCENT), ("RAG", GREEN), ("Agents & MCP", AMBER), ("Deploy", TEAL)]
    cell, gap = 38, 12
    gx, gy = W - PAD - (5 * cell + 4 * gap), 150
    for r, (name, colour) in enumerate(phases):
        y = gy + r * 92
        d.text((gx, y), name.upper(), font=mono(14), fill=MUTED)
        for c in range(5):
            x0 = gx + c * (cell + gap)
            filled = r < 2 or (r == 2 and c < 2)
            d.rounded_rectangle((x0, y + 24, x0 + cell, y + 24 + cell), radius=9,
                                fill=colour if filled else SURFACE, outline=None if filled else LINE, width=2)
            d.text((x0 + cell / 2, y + 24 + cell / 2), str(r * 5 + c + 1), font=mono(15),
                   fill=BG if filled else MUTED, anchor="mm")
    return img


def system_design():
    img, d = base("TIER 2 DESIGN ROUNDS", ["System Design"],
                  ["100 HLD and LLD questions,", "with the follow-ups they add"],
                  ["50 HLD", "50 LLD / machine coding", "10-week plan"])

    def box(x, y, w, h, label, colour):
        d.rounded_rectangle((x, y, x + w, y + h), radius=12, fill=SURFACE, outline=colour, width=3)
        d.text((x + w / 2, y + h / 2), label, font=body_semi(20), fill=INK, anchor="mm")

    def arrow(x1, y1, x2, y2):
        d.line((x1, y1, x2, y2), fill=MUTED, width=3)
        d.polygon([(x2, y2), (x2 - 10, y2 - 6), (x2 - 10, y2 + 6)], fill=MUTED)

    box(790, 150, 150, 56, "Client", ACCENT)
    box(990, 150, 150, 56, "CDN", ACCENT)
    arrow(940, 178, 988, 178)
    box(790, 262, 350, 56, "Load balancer", AMBER)
    d.line((865, 206, 865, 260), fill=MUTED, width=3)
    for i, x in enumerate((790, 910, 1030)):
        box(x, 374, 110, 56, f"API {i + 1}", GREEN)
        d.line((965, 318, x + 55, 372), fill=MUTED, width=2)
    box(790, 486, 160, 56, "Cache", RED)
    box(980, 486, 160, 56, "Database", TEAL)
    d.line((845, 430, 870, 484), fill=MUTED, width=2)
    d.line((1085, 430, 1060, 484), fill=MUTED, width=2)
    return img


def nodejs():
    img, d = base("TIER 2 BACKEND ROUNDS", ["Node.js 100"],
                  ["The backend interview questions", "asked most, with model answers"],
                  ["Event loop", "Streams + scaling", "Security + production"])
    # 100 questions as a 10 x 10 grid, partly practised
    cell, gap = 26, 8
    gx, gy = W - PAD - 10 * cell - 9 * gap, 150
    colours = [GREEN, GREEN, GREEN, AMBER, ACCENT]
    for r in range(10):
        for c in range(10):
            i = r * 10 + c
            done = (i * 37) % 100 < 58
            x0, y0 = gx + c * (cell + gap), gy + r * (cell + gap)
            d.rounded_rectangle((x0, y0, x0 + cell, y0 + cell), radius=6,
                                fill=colours[i % 5] if done else SURFACE, outline=None if done else LINE, width=1)
    return img


def sql():
    img, d = base("TIER 2 BACKEND ROUNDS", ["SQL"],
                  ["Write-the-query questions and", "the MySQL concepts interviewers ask"],
                  ["60 query questions", "72 concepts", "Window functions"])
    x0, y0 = 760, 140
    code = ["SELECT city,", "       COUNT(*) AS orders,", "       RANK() OVER (", "         ORDER BY COUNT(*) DESC)",
            "FROM orders", "GROUP BY city;"]
    d.rounded_rectangle((x0, y0, W - PAD, y0 + 206), radius=14, fill=SURFACE, outline=LINE, width=2)
    for i, line in enumerate(code):
        colour = ACCENT if line.strip().split(" ")[0] in {"SELECT", "FROM", "GROUP"} else INK
        d.text((x0 + 22, y0 + 20 + i * 29), line, font=mono(18), fill=colour)
    # result table
    ty = y0 + 232
    rows = [("city", "orders", "rank"), ("Bengaluru", "1,284", "1"), ("Pune", "976", "2"), ("Delhi", "941", "3")]
    col_x = [x0, x0 + 170, x0 + 290]
    for r, row in enumerate(rows):
        y = ty + r * 44
        d.rounded_rectangle((x0, y, W - PAD, y + 38), radius=8,
                            fill=SURFACE if r else "#1b2433", outline=LINE, width=1)
        for c, cell in enumerate(row):
            d.text((col_x[c] + 16, y + 19), cell, font=(mono(16) if r == 0 else body_semi(19)),
                   fill=MUTED if r == 0 else (GREEN if c == 2 else INK), anchor="lm")
    return img


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, make in {"genai": genai, "system-design": system_design, "nodejs": nodejs, "sql": sql}.items():
        path = OUT / f"{name}.png"
        make().save(path, optimize=True)
        print("wrote", path)
