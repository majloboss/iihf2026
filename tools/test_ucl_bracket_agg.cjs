#!/usr/bin/env node
// Overi sucty dvojic v pavuku proti realnym datam v DB.
//
// Do suctu musi ist KONECNY vysledok zapasu: ked sa hralo predlzenie alebo
// penalty, plati skore po nich. Inak dvojica rozhodnuta v predlzeni vyzera
// ako nerozhodna — prvy zapas 0:2, odveta 2:2 po predlzeni dava 2:4, nie 2:2.
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    const { rows } = await c.query(`
        SELECT g.tie_id, g.leg, g.game_type_code,
               g.home_score_regular AS hs, g.away_score_regular AS ag,
               g.home_score_final   AS hf, g.away_score_final   AS af,
               hc.club_name AS home_name, ac.club_name AS away_name
          FROM ${S}.games g
          LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
          LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
         WHERE g.tie_id IS NOT NULL AND g.home_score_regular IS NOT NULL
         ORDER BY g.tie_id, g.leg`);

    // Rovnaky vypocet ako api/v1/ucl/bracket.php.
    const kon = (z, pole) => (pole === 'h'
        ? (z.hf !== null ? z.hf : z.hs)
        : (z.af !== null ? z.af : z.ag));

    const tie = new Map();
    rows.forEach(r => {
        if (!tie.has(r.tie_id)) tie.set(r.tie_id, []);
        tie.get(r.tie_id).push(r);
    });

    let hotovych = 0, sPredlzenim = 0;
    // Nerozhodny sucet po predlzeni je neplatny zaznam, nie chyba vypoctu:
    // ulozila ho stara validacia, ktora pozerala na vysledok odvety namiesto
    // suctu za dvojicu. Nova ho uz neprijme.
    const neplatne = [];
    for (const [id, z] of tie) {
        if (z.length !== 2) continue;
        const [prvy, odveta] = z;
        if (odveta.hs === null) continue;
        hotovych++;

        // Tim A je v prvom zapase hostom, v odvete domacim.
        const golyA = kon(prvy, 'a') + kon(odveta, 'h');
        const golyB = kon(prvy, 'h') + kon(odveta, 'a');
        const menoA = odveta.home_name, menoB = odveta.away_name;

        const maET = odveta.hf !== null && odveta.af !== null;
        if (maET) sPredlzenim++;

        // Sucet po 90 minutach — takto to pocital pavuk predtym.
        const staryA = prvy.ag + odveta.hs;
        const staryB = prvy.hs + odveta.ag;

        const popis = `${menoA} ${golyA}:${golyB} ${menoB}` + (maET ? '  [predlzenie]' : '');

        if (maET) {
            if (golyA === golyB) {
                neplatne.push(popis + '  (odveta ' + odveta.hf + ':' + odveta.af + ' po ET)');
            } else {
                check(true, popis + ' — dvojica je ROZHODNUTA');
            }
            if (staryA === staryB) {
                console.log('      povodne by pavuk ukazal ' + staryA + ':' + staryB
                            + ' a tvaril sa, ze dvojica nie je rozhodnuta');
            }
        } else {
            check(golyA === staryA && golyB === staryB,
                  popis + ' — bez predlzenia sa sucet nemeni');
        }
    }

    console.log(`\ndvojic s odohratou odvetou: ${hotovych}, z toho s predlzenim: ${sPredlzenim}`);
    if (neplatne.length) {
        console.log('\nNEPLATNE ZAZNAMY v DB (' + neplatne.length + ') — ulozila ich stara');
        console.log('validacia, dvojica zostala nerozhodnuta. Oprav vysledok odvety v admine:');
        neplatne.forEach(t => console.log('  ' + t));
    }
    if (!sPredlzenim) console.log('POZOR: ziadna dvojica s predlzenim, oprava nie je overena na datach');
    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
