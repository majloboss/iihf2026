-- Migration 043: admin.messages — podpora obrázka v správe
--   image_url: URL nahratého obrázka (NULL ak len text). body môže byť prázdne ak je obrázok.
ALTER TABLE admin.messages ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

-- body už nemusí byť NOT NULL (správa môže obsahovať len obrázok)
ALTER TABLE admin.messages ALTER COLUMN body DROP NOT NULL;

INSERT INTO admin.schema_versions (version, description)
VALUES (43, 'admin.messages.image_url + body nullable: obrázky v správach')
ON CONFLICT (version) DO NOTHING;
