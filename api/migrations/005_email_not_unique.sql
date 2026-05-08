-- Email nemusí byť unikátny — jeden hráč môže mať rovnaký email ako admin
ALTER TABLE admin.users DROP CONSTRAINT IF EXISTS users_email_key;
