#!/usr/bin/env node
// Overi, ako sa filter faz vykresli pre kazdu sutaz.
//
// Rovnaka logika ako PhaseFilter.jsx: fazy s rovnakym group_code sa zbalia za
// jedno tlacidlo, ale iba ked ich je viac nez jedna — inak by tlacidlo po
// kliknuti ukazalo samo seba.
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    for (const [cid, slug] of [[1, 'iihf2026'], [2, 'fifa2026'], [3, 'ucl2026']]) {
        const { rows: fazy } = await c.query(`
            SELECT match_stat_code AS code, color_code AS color, group_code AS grp
              FROM admin.competition_phases
             WHERE competition_id = $1 AND is_active
             ORDER BY sort_order, match_stat_code`, [cid]);

        // Zoskupenie ako v komponente.
        const skupiny = new Map();
        fazy.forEach(f => {
            if (!f.grp) return;
            if (!skupiny.has(f.grp)) skupiny.set(f.grp, []);
            skupiny.get(f.grp).push(f);
        });
        const zbalene = new Set([...skupiny.entries()]
            .filter(([, v]) => v.length > 1).map(([k]) => k));

        const riadok = [];
        const hotove = new Set();
        fazy.forEach(f => {
            if (!f.grp || !zbalene.has(f.grp)) { riadok.push(f.code); return; }
            if (hotove.has(f.grp)) return;
            hotove.add(f.grp);
            riadok.push(`[${f.grp}]`);
        });

        console.log(`\n${slug}`);
        console.log(`  filter:  ALL ${riadok.join(' ')}`);
        zbalene.forEach(g => {
            console.log(`  [${g}] →  ${skupiny.get(g).map(f => f.code).join(' ')}`);
        });

        // Zbalene tlacidlo musi mat vzdy aspon dve polozky.
        const zle = [...skupiny.entries()].filter(([k, v]) => zbalene.has(k) && v.length < 2);
        check(zle.length === 0, `${slug}: žiadne jednoprvkové zbalenie`);

        // Kazda faza sa musi objavit prave raz — v riadku alebo v rozbalení.
        const vRiadku = riadok.filter(x => !x.startsWith('[')).length;
        const vSkupinach = [...zbalene].reduce((n, g) => n + skupiny.get(g).length, 0);
        check(vRiadku + vSkupinach === fazy.length,
              `${slug}: všetkých ${fazy.length} fáz je dostupných (${vRiadku} priamo, ${vSkupinach} v skupinách)`);
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
