#!/usr/bin/env node
// Overi, co vrati filter kol nad tabulkami skupin (standings_phases).
//
// Skratky maju byt z ciselnika (A, B, R32…), nie stare kody z game_type_code
// (SKA, SKB…), a poradie ma urcovat sort_order, nie regularny vyraz z nazvu.
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

    for (const [slug, schema, kluc, body] of [
        ['iihf2026', 'iihf2026', 'g.id', 'points'],
        ['fifa2026', 'fifa2026', 'g.game_id', 'points_earned'],
        ['ucl2026', '"lm2026-27"', 'g.game_id', 'points_earned'],
    ]) {
        // Rovnaky dopyt ako v standings_phases.php.
        const { rows } = await c.query(
            'SELECT ph.match_stat_desc AS phase, ph.match_stat_code AS code,' +
            ' ph.color_code, ph.group_code, COUNT(DISTINCT t.game_id)::int games' +
            ` FROM ${schema}.games g` +
            ' JOIN admin.competition_phases ph ON ph.id = g.phase_id' +
            ` JOIN ${schema}.tips t ON ${kluc} = t.game_id AND t.${body} IS NOT NULL` +
            ' GROUP BY ph.match_stat_desc, ph.match_stat_code, ph.color_code,' +
            ' ph.group_code, ph.sort_order ORDER BY ph.sort_order');

        console.log(`${slug.padEnd(10)}${rows.map(r => r.code).join(' ')}`);

        // Stare kody (SKA, SKB, GROUP_A) sa uz nesmu objavit.
        const stare = rows.filter(r => /^SK[A-L]$|^GROUP_/.test(r.code));
        check(stare.length === 0,
              `${slug}: žiadne staré kódy` + (stare.length ? ` — ${stare.map(r => r.code).join(', ')}` : ''));

        // Kazda faza s odohranymi tipmi ma mat farbu, inak by tlacidlo splynulo.
        const bezFarby = rows.filter(r => !r.color_code);
        check(bezFarby.length === 0, `${slug}: každá fáza má farbu`);

        // Vyradovacia cast sa nesmie stratit — pri starom dopyte chybala.
        if (rows.length) {
            const maPlayoff = rows.some(r => ['PLAYOFF', 'GOLD', 'BRONZE', 'PLAYIN'].includes(r.color_code));
            const { rows: hrane } = await c.query(
                `SELECT COUNT(*)::int n FROM ${schema}.games g` +
                ' JOIN admin.competition_phases ph ON ph.id = g.phase_id' +
                ` JOIN ${schema}.tips t ON ${kluc} = t.game_id AND t.${body} IS NOT NULL` +
                " WHERE ph.color_code IN ('PLAYOFF','GOLD','BRONZE','PLAYIN')");
            check(hrane[0].n === 0 || maPlayoff,
                  `${slug}: vyraďovacia časť sa vo filtri objaví (${hrane[0].n} bodovaných tipov)`);
        }
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
