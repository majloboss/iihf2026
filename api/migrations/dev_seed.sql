-- IIHF2026 — Dev seed: prvý admin účet
-- Spusti PO full_schema.sql na novej dev databáze.
--
-- Vygeneruj bcrypt hash hesla (spusti lokálne):
--   php -r "echo password_hash('AdminDev@2026', PASSWORD_BCRYPT) . PHP_EOL;"
--
-- Potom nahraď BCRYPT_HASH_TU nižšie a spusti:
--   psql -h <host> -p 5432 -U <user> -d <devdbname> -f dev_seed.sql

INSERT INTO admin.users (username, password, username_changed, role, is_active)
VALUES ('admin', 'BCRYPT_HASH_TU', TRUE, 'admin', TRUE)
ON CONFLICT (username) DO NOTHING;
