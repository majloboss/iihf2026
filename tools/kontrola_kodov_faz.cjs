#!/usr/bin/env node
// Overi, ze kody faz su v ramci sutaze jednoznacne.
//
// `phase_code` zoskupuje kola do fazy (LF1..LF8 -> LF) a pouziva ho pavuk.
// Ked ho maju dve rozne fazy rovnaky — napr. skupina F a finale F — pavuk
// nevie, ktoru ma vziat.
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

    // Jeden kod fazy nesmie patrit dvom roznym fazam.
    const { rows: kolizie } = await c.query(`
        SELECT k.slug, p.phase_code, COUNT(DISTINCT p.phase_name)::int n,
               string_agg(DISTINCT p.phase_name, ' / ') AS nazvy
          FROM admin.competition_phases p
          JOIN admin.competitions k ON k.id = p.competition_id
         WHERE p.is_active
         GROUP BY k.slug, p.phase_code
        HAVING COUNT(DISTINCT p.phase_name) > 1
         ORDER BY k.slug, p.phase_code`);

    kolizie.forEach(r => console.log(
        `  ${r.slug.padEnd(10)}${r.phase_code.padEnd(6)}→ ${r.nazvy}`));
    check(kolizie.length === 0, 'každý kód fázy patrí jedinej fáze');

    // Skratka zapasu musi byt v sutazi jedinecna — filtre podla nej vyberaju.
    const { rows: dupl } = await c.query(`
        SELECT k.slug, p.match_stat_code, COUNT(*)::int n
          FROM admin.competition_phases p
          JOIN admin.competitions k ON k.id = p.competition_id
         WHERE p.is_active
         GROUP BY k.slug, p.match_stat_code
        HAVING COUNT(*) > 1`);
    check(dupl.length === 0, 'každá skratka kola je v súťaži jedinečná');

    // Ako pavuk uvidi vyradovacie fazy po pripadnej zmene.
    for (const slug of ['iihf2026', 'fifa2026', 'ucl2026']) {
        const { rows } = await c.query(`
            SELECT DISTINCT ON (phase_code) phase_code, phase_name, sort_order
              FROM (SELECT p.phase_code, p.phase_name, p.sort_order
                      FROM admin.competition_phases p
                      JOIN admin.competitions k ON k.id = p.competition_id
                     WHERE k.slug = $1 AND p.is_active
                       AND p.color_code <> 'GROUP') x
             ORDER BY phase_code, sort_order`, [slug]);
        rows.sort((a, b) => a.sort_order - b.sort_order);
        console.log(`  pavúk ${slug.padEnd(10)}${rows.map(r => r.phase_code).join(' → ')}`);
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
