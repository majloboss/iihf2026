<?php
// Skopíruj ako db.php a dopln skutočné hodnoty.
// POZOR: db.php je vynechaný z FTP deployu — GitHub Actions ho generuje automaticky
//        z GitHub Secrets (MAIN_* / DEV_* podľa vetvy).
//
// Lokálne testovanie: skopíruj ako db.php a nastav lokálne hodnoty.

// --- MAIN (produkcia) ---
// define('DB_HOST',    'db.r5.websupport.sk');
// define('DB_PORT',    '5432');
// define('DB_NAME',    'DB-BET');         // GitHub Secret: MAIN_DB_NAME
// define('DB_USER',    '...');            // GitHub Secret: MAIN_DB_USER
// define('DB_PASS',    '...');            // GitHub Secret: MAIN_DB_PASS
// define('JWT_SECRET', '...');            // GitHub Secret: MAIN_JWT_SECRET
// define('APP_URL',    'https://iihf2026.fellow.sk');
// define('CRON_SECRET','...');            // GitHub Secret: MAIN_CRON_SECRET

// --- DEV (develop vetva) ---
// define('DB_HOST',    'db.r5.websupport.sk');
// define('DB_PORT',    '5432');
// define('DB_NAME',    'DB-BET-DEV');     // GitHub Secret: DEV_DB_NAME
// define('DB_USER',    '...');            // GitHub Secret: DEV_DB_USER
// define('DB_PASS',    '...');            // GitHub Secret: DEV_DB_PASS
// define('JWT_SECRET', '...');            // GitHub Secret: DEV_JWT_SECRET
// define('APP_URL',    'https://dev_iihf2026.fellow.sk');
// define('CRON_SECRET','...');            // GitHub Secret: DEV_CRON_SECRET

define('DB_HOST',    'db.r5.websupport.sk');
define('DB_PORT',    '5432');
define('DB_NAME',    'YOUR_DB_NAME');
define('DB_USER',    'YOUR_DB_USER');
define('DB_PASS',    'YOUR_DB_PASS');
define('JWT_SECRET', 'your_random_secret_min_32_chars');
define('APP_URL',    'https://iihf2026.fellow.sk');
define('CRON_SECRET','your_cron_secret_token');
