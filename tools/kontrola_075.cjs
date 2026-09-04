#!/usr/bin/env node
// Skontroluje, ako dopadla migracia 075: kolko zapasov ma phase_id a ci
// naviazana faza sedi s tym, co appka dopocitava zo starych stlpcov.
//
// Skript iba cita. Prepinac --prod cita produkciu namiesto DEV.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const prod = process.argv.includes('--prod');
const conf = fs.readFileSync(path.join(__dirname,
    prod ? '../../betclub/api/config/db.php' : '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')}\n`);

    const { rows: v } = await c.query('SELECT version FROM admin.schema_versions WHERE version = 75');
    console.log(`migrácia 075: ${v.length ? 'zapísaná' : 'NIE JE zapísaná'}\n`);

    for (const [schema, meno] of [['iihf2026', 'IIHF'], ['fifa2026', 'FIFA'], ['lm2026-27', 'UCL']]) {
        const { rows: st } = await c.query(
            "SELECT 1 FROM information_schema.columns" +
            " WHERE table_schema=$1 AND table_name='games' AND column_name='phase_id'", [schema]);
        if (!st.length) { check(false, `${meno}: stĺpec phase_id neexistuje`); continue; }

        const { rows: n } = await c.query(
            `SELECT COUNT(*)::int spolu, COUNT(phase_id)::int s_fazou FROM "${schema}".games`);
        console.log(`  ${meno.padEnd(6)}${n[0].s_fazou}/${n[0].spolu} zápasov má phase_id`);
        check(n[0].s_fazou === n[0].spolu, `${meno}: všetky zápasy naviazané`);

        // Ktore kody zostali bez fazy — to ukaze, co v ciselniku chyba.
        if (n[0].s_fazou !== n[0].spolu) {
            const kod = schema === 'iihf2026' ? 'phase' : 'game_type_code';
            const { rows: ch } = await c.query(
                `SELECT "${kod}" AS kod, COUNT(*)::int n FROM "${schema}".games` +
                ' WHERE phase_id IS NULL GROUP BY 1 ORDER BY 1');
            ch.forEach(r => console.log(`      bez fázy: ${String(r.kod).padEnd(10)}${r.n}x`));
        }
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
