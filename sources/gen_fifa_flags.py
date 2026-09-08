from PIL import Image, ImageChops
import os

teams_ordered = [
    # Stlpec 0 (lavy)
    'ALG','ARG','AUS','AUT','BEL','BIH','BRA','CPV',
    'CAN','COL','COD','CIV','CRO','CUW','CZE','ECU',
    # Stlpec 1 (stredny)
    'EGY','ENG','FRA','GER','GHA','HAI','IRN','IRQ',
    'JPN','JOR','KOR','MEX','MAR','NED','NZL','NOR',
    # Stlpec 2 (pravy)
    'PAN','PAR','POR','QAT','KSA','SCO','SEN','RSA',
    'ESP','SWE','SUI','TUN','TUR','URU','USA','UZB',
]

img = Image.open(r'D:\AI\Claudecode\betclub\sources\fifa2026\fifa_2026_flags\fifa_2026_flags.png')
W, H = img.size

cols = 3
rows = 16
cell_w = W // cols
cell_h = H // rows

col_flag_x = [10, 32, 0]
flag_w = 26
flag_h = 18

out_dir     = r'D:\AI\Claudecode\dev_betclub\web\public\flags'
sources_dir = r'D:\AI\Claudecode\betclub\sources\fifa2026\flags'
os.makedirs(out_dir, exist_ok=True)
os.makedirs(sources_dir, exist_ok=True)

TARGET_W = 34
TARGET_H = 22

def crop_to_content(flag_img, threshold=235):
    rgb = flag_img.convert('RGB')
    px  = rgb.load()
    w, h = rgb.size
    first_row = last_row = first_col = last_col = None
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r < threshold or g < threshold or b < threshold:
                if first_row is None: first_row = y
                last_row = y
                if first_col is None or x < first_col: first_col = x
                if last_col is None or x > last_col: last_col = x
    if first_row is None:
        return flag_img
    return flag_img.crop((first_col, first_row, last_col + 1, last_row + 1))

idx = 0
for col in range(cols):
    for row in range(rows):
        code = teams_ordered[idx]
        x0 = col * cell_w + col_flag_x[col]
        y0 = row * cell_h + (cell_h - flag_h) // 2
        x1 = x0 + flag_w
        y1 = y0 + flag_h
        flag_raw = img.crop((x0, y0, x1, y1))

        # Orez bieleho okraja
        flag_cropped = crop_to_content(flag_raw)

        # Priamy resize na cielovu velkost — bez paddingu, ziadny biely okraj
        final = flag_cropped.resize((TARGET_W, TARGET_H), Image.LANCZOS).convert('RGB')
        out_path = os.path.join(out_dir, 'fifa_flag_' + code.lower() + '.png')
        src_path = os.path.join(sources_dir, 'fifa_flag_' + code.lower() + '.png')
        final.save(out_path)
        final.save(src_path)
        print(code + ' bbox:' + str(flag_cropped.size))
        idx += 1

print('\nHotovo: ' + str(idx) + ' vlajok')
