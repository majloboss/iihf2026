#!/usr/bin/env node
// Overi, ze nasadeny tim stoji v strome vedla dvojice, z ktorej mu pride super.
//
// Vitaz baraze PO-i hra v osemfinale proti nasadenemu (9-i), takze nasadeny
// (9-i) musi byt v zozname tesne PRED PO-i. Inak sa neda vycitat, na koho caka
// — presne to bola nevyhoda zoznamu "prvych osem" nad barazou.
//
// Skript iba cita a rata rovnako ako api/v1/ucl/bracket.php.
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

    const { rows: nas } = await c.query(`
        SELECT s.rank, c.club_name
          FROM ${S}.group_standings s
          JOIN admin.uefa_clubs c ON c.club_id = s.team_id
         WHERE s.phase = 'LEAGUE' AND s.rank BETWEEN 1 AND 8
         ORDER BY s.rank`);
    const nasadeny = new Map(nas.map(r => [r.rank, r.club_name]));

    const { rows: po } = await c.query(`
        SELECT DISTINCT g.tie_id FROM ${S}.games g
         WHERE g.game_type_code = 'PO' AND g.tie_id IS NOT NULL
         ORDER BY g.tie_id`);
    const cislo = t => parseInt(String(t).split('-').pop(), 10);
    const dvojice = po.map(r => r.tie_id).sort((a, b) => cislo(a) - cislo(b));

    // Zoznam tak, ako ho poskladá API: pred každou dvojicou jej nasadený.
    // Baráž ide zostupne (PO-8 hore), aby jej nasadený 1. sedel s R16-1.
    dvojice.reverse();

    const zoznam = [];
    dvojice.forEach(t => {
        const rank = 9 - cislo(t);
        if (nasadeny.has(rank)) zoznam.push({ seeded: true, rank, name: nasadeny.get(rank) });
        zoznam.push({ seeded: false, tie: t });
    });

    check(zoznam.length === dvojice.length + nasadeny.size,
          `zoznam má ${zoznam.length} riadkov (${nasadeny.size} nasadených + ${dvojice.length} dvojíc)`);

    // Nasadený musí stáť tesne pred dvojicou, ktorej víťaz je jeho súper.
    dvojice.forEach(t => {
        const i = zoznam.findIndex(x => !x.seeded && x.tie === t);
        const pred = zoznam[i - 1];
        const rank = 9 - cislo(t);
        check(pred && pred.seeded && pred.rank === rank,
              `${t} má nad sebou ${rank}. ${nasadeny.get(rank) ?? '?'}` +
              (pred && pred.seeded && pred.rank === rank ? '' : ' — ale je tam niečo iné'));
    });

    // Nasadení musia ísť 1., 2., ... 8. — inak by prvý stĺpec začínal 8. miestom,
    // kým osemfinále začína prvým, a stĺpce by si nesedeli.
    const poradie = zoznam.filter(x => x.seeded).map(x => x.rank);
    check(poradie.join(',') === [...poradie].sort((a, b) => a - b).join(','),
          `nasadení idú zhora nadol: ${poradie.join(', ')}`);

    // To podstatné: n-tá dvojica osemfinále musí vychádzať z n-tého riadku baráže.
    const { rows: r16 } = await c.query(`
        SELECT DISTINCT g.tie_id FROM ${S}.games g
         WHERE g.game_type_code = 'R16' AND g.tie_id IS NOT NULL
         ORDER BY g.tie_id`);
    r16.map(r => r.tie_id).sort((a, b) => cislo(a) - cislo(b)).forEach((t, i) => {
        const nad = zoznam[i * 2];        // párne indexy sú nasadení
        check(nad && nad.seeded && nad.rank === cislo(t),
              `${t} je v rovnakom riadku ako nasadený ${cislo(t)}. ${nasadeny.get(cislo(t)) ?? '?'}`);
    });

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
