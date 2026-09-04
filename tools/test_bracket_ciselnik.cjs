#!/usr/bin/env node
// Overi, ze pavuk postaveny z ciselnika obsahuje tie iste fazy ako predtym,
// ked ich mal vymenovane v kode.
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

// Co pavuk zobrazoval, kym mal fazy v kode.
const POVODNE = {
    iihf2026: ['QF', 'SF', 'BRONZE', 'GOLD'],
    fifa2026: ['R32', 'R16', 'QF', 'SF', 'BM', 'F'],
    ucl2026:  ['PO', 'R16', 'QF', 'SF', 'F'],
};

// Kody sa v ciselniku premenovali.
// Kody sa v ciselniku premenovali; kluc je sutaz + povodny kod, lebo to iste
// 'F' znamena vo FIFA finale (-> FIN) a v IIHF ostava 'F'.
const PREMENOVANE = {
    'iihf2026:BRONZE': 'BR', 'iihf2026:GOLD': 'F',
    'fifa2026:BM': 'BR', 'fifa2026:F': 'FIN',
    'ucl2026:PO': 'BAR',
};

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')}\n`);

    for (const [slug, povodne] of Object.entries(POVODNE)) {
        // To iste, co robi bracket.php: vyradovacie fazy v poradi stromu.
        const { rows } = await c.query(`
            SELECT DISTINCT ON (phase_code) phase_code, phase_name, sort_order
              FROM (SELECT p.phase_code, p.phase_name, p.sort_order
                      FROM admin.competition_phases p
                      JOIN admin.competitions k ON k.id = p.competition_id
                     WHERE k.slug = $1 AND p.is_active
                       AND p.color_code <> 'GROUP') x
             ORDER BY phase_code, sort_order`, [slug]);
        rows.sort((a, b) => a.sort_order - b.sort_order);

        const kody = rows.map(r => r.phase_code);
        console.log(`${slug.padEnd(10)}${kody.join(' → ')}`);

        // Kazda povodna faza musi mat v ciselniku svoj protajsok.
        const ocakavane = povodne.map(k => PREMENOVANE[`${slug}:${k}`] ?? k);
        const chyba = ocakavane.filter(k => !kody.includes(k));
        check(chyba.length === 0,
              `${slug}: všetky pôvodné fázy sú v číselníku` +
              (chyba.length ? ` — chýba ${chyba.join(', ')}` : ''));

        // Skupinova cast do pavuka nepatri.
        const { rows: grp } = await c.query(`
            SELECT COUNT(*)::int n FROM admin.competition_phases p
              JOIN admin.competitions k ON k.id = p.competition_id
             WHERE k.slug = $1 AND p.color_code = 'GROUP'`, [slug]);
        // Kód nestačí — vo FIFA je 'F' aj skupina, aj finále. Rozhoduje názov.
        const nazvy = rows.map(r => r.phase_name);
        const { rows: prienik } = await c.query(`
            SELECT COUNT(DISTINCT p.phase_name)::int n
              FROM admin.competition_phases p
              JOIN admin.competitions k ON k.id = p.competition_id
             WHERE k.slug = $1 AND p.color_code = 'GROUP'
               AND p.phase_name = ANY($2)`, [slug, nazvy]);
        check(prienik[0].n === 0,
              `${slug}: skupinová časť sa do pavúka nedostala (${grp[0].n} fáz vynechaných)` +
              (prienik[0].n ? ` — ${prienik[0].n} skupín preniklo` : ''));
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
