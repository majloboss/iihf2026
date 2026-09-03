#!/usr/bin/env node
// Overi, co endpoint /v1/phases posle do prehliadaca — najma `title`,
// z ktoreho sa robi tooltip nad tlacidlom filtra.
//
// Zostavuje tu istu odpoved ako phases.php, priamo z DB. Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    for (const [id, meno] of [[1, 'IIHF'], [2, 'FIFA'], [3, 'UCL']]) {
        const { rows } = await c.query(
            'SELECT phase_code, phase_name, match_stat_code, match_stat_desc,' +
            ' color_code, group_code FROM admin.competition_phases' +
            ' WHERE competition_id = $1 AND is_active ORDER BY sort_order, match_stat_code', [id]);

        // Presne to, co posle phases.php.
        const odpoved = rows.map(r => ({
            phase_name: r.phase_name,
            code: r.match_stat_code,
            label: r.match_stat_code,
            title: r.match_stat_desc,
            color: r.color_code,
            group: r.group_code,
        }));

        console.log(`\n=== ${meno} ===`);
        const bezTitle = odpoved.filter(f => !f.title || !String(f.title).trim());
        const bezNazvu = odpoved.filter(f => f.group && (!f.phase_name || !String(f.phase_name).trim()));

        odpoved.slice(0, 3).forEach(f => console.log(
            `  ${f.label.padEnd(7)}title="${f.title}"`));
        if (odpoved.length > 3) console.log(`  … ${odpoved.length - 3} ďalších`);

        check(bezTitle.length === 0,
              `${meno}: každá fáza má tooltip${bezTitle.length ? ' — chýba: ' + bezTitle.map(f => f.code).join(', ') : ''}`);
        check(bezNazvu.length === 0,
              `${meno}: každá zbalená fáza má názov pre tooltip skupiny${bezNazvu.length ? ' — chýba: ' + bezNazvu.map(f => f.code).join(', ') : ''}`);
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
