#!/usr/bin/env node
// Porovna naviazanu fazu (phase_id) s tou, ktoru appka dopocitavala zo starych
// stlpcov — to iste, co v tabulke ukazuju stlpce FAZA a FAZA OLD.
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

    // UCL: stara skratka sa odvodzovala z cisla kola alebo z `leg`.
    const { rows: ucl } = await c.query(`
        SELECT p.match_stat_code AS nova,
               CASE
                   WHEN g.game_type_code = 'LEAGUE'
                       THEN 'LF' || substring(g.game_type_name from '([0-9]+)\\. kolo')
                   WHEN g.leg IS NOT NULL
                       THEN (CASE g.game_type_code WHEN 'PO' THEN 'BAR'
                             ELSE g.game_type_code END) || '-' || g.leg
                   ELSE g.game_type_code
               END AS stara,
               COUNT(*)::int n
          FROM "lm2026-27".games g
          JOIN admin.competition_phases p ON p.id = g.phase_id
         GROUP BY 1, 2 ORDER BY 2`);
    console.log('UCL   nová = stará');
    ucl.forEach(r => console.log(
        `  ${String(r.stara).padEnd(8)}${r.nova === r.stara ? '=' : '≠'}  ${String(r.nova).padEnd(8)}${r.n}x`));
    check(ucl.every(r => r.nova === r.stara), 'UCL: naviazaná fáza sedí s pôvodným výpočtom');

    // FIFA a IIHF: kody sa v ciselniku premenovali, preto sa porovnava dvojica.
    for (const [schema, meno, stlpec] of [
        ['fifa2026', 'FIFA', 'game_type_code'], ['iihf2026', 'IIHF', 'phase']]) {
        const { rows } = await c.query(
            `SELECT g."${stlpec}" AS stara, p.match_stat_code AS nova, COUNT(*)::int n` +
            ` FROM "${schema}".games g` +
            ' JOIN admin.competition_phases p ON p.id = g.phase_id' +
            ' GROUP BY 1, 2 ORDER BY 1');
        console.log(`\n${meno}  v zápase → číselník`);
        rows.forEach(r => console.log(
            `  ${String(r.stara).padEnd(10)}→ ${String(r.nova).padEnd(6)}${r.n}x`));

        // Kazdy stary kod smie ukazovat najviac na jednu fazu, inak sa zapasy
        // rozdelili medzi dve kola.
        const podla = {};
        rows.forEach(r => { (podla[r.stara] = podla[r.stara] || []).push(r.nova); });
        const rozdvojene = Object.entries(podla).filter(([, v]) => v.length > 1);
        check(rozdvojene.length === 0,
              `${meno}: každý pôvodný kód smeruje na jedinú fázu` +
              (rozdvojene.length ? ` — ${rozdvojene.map(([k, v]) => k + '→' + v.join('/')).join(', ')}` : ''));
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
