#!/usr/bin/env node
// Overi, ze sa z pavuka da vycitat cesta timu: kto postupil priamo, kto z
// ktorej dvojice a ci dvojice dalsej fazy naozaj vznikli z tych predoslych.
//
// Kluc nasadzovania (ucl_build_bracket.php):
//   baraz PO   — miesta 9-24, dvojice 9-24, 10-23, ... 16-17
//   osemfinale — miesta 1-8 a vitazi baraze PO-1..PO-8; 1. vs posledny atd.
//   dalej      — vitazi predoslej fazy v poradi cisla dvojice
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

const cislo = t => (t ? parseInt(String(t).split('-').pop(), 10) : 0);

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    const { rows: tab } = await c.query(`
        SELECT s.rank, s.team_id, c.club_name
          FROM ${S}.group_standings s
          JOIN admin.uefa_clubs c ON c.club_id = s.team_id
         WHERE s.phase = 'LEAGUE' AND s.team_id IS NOT NULL
         ORDER BY s.rank`);
    const menoId = new Map(tab.map(r => [r.team_id, r.club_name]));
    const rankId = new Map(tab.map(r => [r.team_id, r.rank]));

    const { rows } = await c.query(`
        SELECT g.game_type_code AS faza, g.tie_id, g.leg,
               g.home_team_id AS h, g.away_team_id AS a,
               g.home_score_regular AS hs, g.away_score_regular AS ag,
               g.home_score_final   AS hf, g.away_score_final   AS af
          FROM ${S}.games g
         WHERE g.tie_id IS NOT NULL
         ORDER BY g.tie_id, g.leg`);

    const tie = new Map();
    rows.forEach(r => {
        if (!tie.has(r.tie_id)) tie.set(r.tie_id, []);
        tie.get(r.tie_id).push(r);
    });

    // Vitaz dvojice zo suctu konecnych vysledkov.
    const vitaz = z => {
        if (z.length !== 2) return null;
        const [p, o] = z;
        if (p.hs === null || o.hs === null) return null;
        const kh = x => (x.hf !== null ? x.hf : x.hs);
        const ka = x => (x.af !== null ? x.af : x.ag);
        const gA = ka(p) + kh(o);          // tim A: host prveho, domaci odvety
        const gB = kh(p) + ka(o);
        return gA === gB ? null : (gA > gB ? o.h : o.a);
    };

    // --- Baraz: dvojice 9-24, 10-23, ... ---
    const po = [...tie.keys()].filter(t => t.startsWith('PO-')).sort((x, y) => cislo(x) - cislo(y));
    po.forEach(t => {
        const o = tie.get(t)[1];
        if (!o) return;
        const r = [rankId.get(o.h), rankId.get(o.a)].sort((x, y) => x - y);
        const i = cislo(t);
        check(r[0] === 8 + i && r[1] === 25 - i,
              `${t}: ${r[0]}. vs ${r[1]}. v tabuľke (čaká sa ${8 + i}. a ${25 - i}.)`);
    });

    // --- Osemfinale: nasadeny 1-8 proti vitazom baraze v opacnom poradi ---
    const r16 = [...tie.keys()].filter(t => t.startsWith('R16-')).sort((x, y) => cislo(x) - cislo(y));
    r16.forEach(t => {
        const o = tie.get(t)[1];
        if (!o || o.h === null) return;
        const i = cislo(t);
        const nasadeny = [o.h, o.a].find(id => (rankId.get(id) ?? 99) <= 8);
        const zBaraze  = [o.h, o.a].find(id => id !== nasadeny);
        const zdroj    = vitaz(tie.get('PO-' + (9 - i)) ?? []);

        check(rankId.get(nasadeny) === i,
              `${t}: nasadený je ${rankId.get(nasadeny)}. (čaká sa ${i}.)`);
        check(zdroj === null || zdroj === zBaraze,
              `      súper prišiel z PO-${9 - i}` +
              (zdroj !== zBaraze ? ` — ale tam vyhral ${menoId.get(zdroj)}` : ''));
    });

    // --- Dalsie fazy: vitazi predoslej v poradi cisla dvojice ---
    for (const [faza, pred] of [['QF', 'R16'], ['SF', 'QF']]) {
        const zoznam = [...tie.keys()].filter(t => t.startsWith(faza + '-'))
                                      .sort((x, y) => cislo(x) - cislo(y));
        const vitazi = [...tie.keys()].filter(t => t.startsWith(pred + '-'))
                                      .sort((x, y) => cislo(x) - cislo(y))
                                      .map(t => vitaz(tie.get(t)));
        const n = vitazi.length;
        zoznam.forEach(t => {
            const o = tie.get(t)[1];
            if (!o || o.h === null) return;
            const i = cislo(t);
            // Dvojica i spaja vitazov i-teho a (n+1-i)-teho zapasu predoslej fazy.
            const caka = [vitazi[i - 1], vitazi[n - i]].filter(Boolean).sort();
            const je = [o.h, o.a].sort();
            check(caka.length < 2 || (caka[0] === je[0] && caka[1] === je[1]),
                  `${t}: víťazi ${pred}-${i} a ${pred}-${n + 1 - i}` +
                  (caka.length === 2 && (caka[0] !== je[0] || caka[1] !== je[1])
                      ? ` — ale hrajú ${menoId.get(o.h)} a ${menoId.get(o.a)}` : ''));
        });
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
