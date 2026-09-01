#!/usr/bin/env node
// Spusti SQL dopyty zapisane v PHP subore proti databaze.
//
// Kontrola parovania uvodzoviek povie, ze retazec je uzavrety, nie ze SQL v nom
// dava zmysel. PHP CLI tu nie je, takze chyba by sa inak ukazala az v
// prehliadaci. Skript iba cita.
//
// Pouzitie: node check_php_sql.cjs ../api/v1/ucl/bracket.php
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const subor = process.argv[2];
if (!subor) { console.error('chyba argument: cesta k .php'); process.exit(1); }

const php = fs.readFileSync(subor, 'utf8');

// Retazce v jednoduchych uvodzovkach, ktore zacinaju SELECT/UPDATE/INSERT.
// PHP escape \' sa prevedie spat na apostrof — presne to dostane databaza.
const dopyty = [...php.matchAll(/'((?:SELECT|UPDATE|INSERT|DELETE)[\s\S]*?[^\\])'/g)]
    .map(m => m[1].replace(/\\'/g, "'"));

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');   // nic sa nezapise

    let fail = false;
    for (const q of dopyty) {
        const popis = q.replace(/\s+/g, ' ').slice(0, 70);
        try {
            // Placeholdery ? nahradime NULL, aby sa dopyt dal spustit naprazdno.
            await c.query(q.replace(/\?/g, 'NULL'));
            console.log('OK    ' + popis);
        } catch (e) {
            console.log('CHYBA ' + e.message);
            console.log('      ' + popis);
            fail = true;
        }
    }

    await c.query('ROLLBACK');
    await c.end();
    console.log(`\ndopytov: ${dopyty.length}` + (fail ? ' — NIEKTORE ZLYHALI' : ' — vsetky presli'));
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
