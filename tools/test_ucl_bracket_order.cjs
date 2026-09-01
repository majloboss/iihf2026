#!/usr/bin/env node
// Overi, ze vysledky oboch zapasov su v pavuku v poradi dvojice.
//
// Pavuk zobrazuje hore tim A, ktory bol v prvom zapase HOSTOM. Skore prveho
// zapasu sa preto musi otocit — inak dvojica 3:2 vyzera ako 2:3 a sucet nad
// nou nesedi s vysledkami pod nou.
//
// Kontroluje sa to, co uzivatel naozaj vidi: sucet zobrazenych zapasov sa musi
// rovnat zobrazenemu suctu dvojice. Skript iba cita.
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
        SELECT g.tie_id, g.leg,
               g.home_score_regular AS hs, g.away_score_regular AS ag,
               g.home_score_final   AS hf, g.away_score_final   AS af,
               hc.club_name AS home_name, ac.club_name AS away_name
          FROM ${S}.games g
          LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
          LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
         WHERE g.tie_id IS NOT NULL AND g.home_score_regular IS NOT NULL
         ORDER BY g.tie_id, g.leg`);

    const tie = new Map();
    rows.forEach(r => {
        if (!tie.has(r.tie_id)) tie.set(r.tie_id, []);
        tie.get(r.tie_id).push(r);
    });

    // Rovnaka transformacia ako v api/v1/ucl/bracket.php.
    const naVystup = (z, otocit) => !z ? null : {
        home_name: otocit ? z.away_name : z.home_name,
        away_name: otocit ? z.home_name : z.away_name,
        hs: otocit ? z.ag : z.hs, ag: otocit ? z.hs : z.ag,
        hf: otocit ? z.af : z.hf, af: otocit ? z.hf : z.af,
    };
    const kon = z => [z.hf !== null ? z.hf : z.hs, z.af !== null ? z.af : z.ag];

    let n = 0;
    for (const [, z] of tie) {
        if (z.length !== 2 || z[1].hs === null) continue;
        n++;

        const prvy   = naVystup(z[0], true);    // otoceny do poradia dvojice
        const odveta = naVystup(z[1], false);

        // Tim A je domacim odvety a po otoceni aj "domacim" prveho zapasu.
        const menoA = odveta.home_name, menoB = odveta.away_name;

        check(prvy.home_name === menoA && prvy.away_name === menoB,
              `${menoA} — ${menoB}: obidva zapasy su v rovnakom poradi`);

        // To podstatne: sucet zobrazenych cisel musi sediet so suctom dvojice.
        const [p1, p2] = kon(prvy);
        const [o1, o2] = kon(odveta);
        const golyA = z[0].ag + (z[1].hf !== null ? z[1].hf : z[1].hs);
        const golyB = z[0].hs + (z[1].af !== null ? z[1].af : z[1].ag);

        check(p1 + o1 === golyA && p2 + o2 === golyB,
              `   zobrazene ${p1}:${p2} + ${o1}:${o2} = ${golyA}:${golyB}`);
    }

    console.log(`\nskontrolovanych dvojic: ${n}`);
    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
