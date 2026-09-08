from PIL import Image

img = Image.open(r'D:\AI\Claudecode\betclub\sources\fifa2026\fifa_2026_flags\fifa_2026_flags.png')
px = img.load()
W, H = img.size

cols = 3
rows = 16
cell_w = W // cols   # 258
cell_h = H // rows   # 48

def is_white_or_near(r, g, b, thresh=230):
    return r > thresh and g > thresh and b > thresh

# Pre kazdy stlpec a riadok najdi prvy non-white x
for col in range(cols):
    print('=== STLPEC', col, '(x start:', col*cell_w, ') ===')
    for row in range(rows):
        y_mid = row * cell_h + cell_h // 2
        x_start = col * cell_w
        x_end = x_start + cell_w
        # Najdi prvy non-white pixel v tomto riadku
        first_x = None
        last_x  = None
        for x in range(x_start, min(x_start + 60, x_end)):
            r, g, b = px[x, y_mid]
            if not is_white_or_near(r, g, b):
                if first_x is None:
                    first_x = x - x_start  # relativne k stlpcu
                last_x = x - x_start
        print('  row', row, '-> first_x:', first_x, 'last_x:', last_x)
    print()
