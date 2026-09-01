#!/usr/bin/env node
// Overi, ze generator dvojic nezostavi zapas timu proti sebe samemu.
//
// Chyba zo semifinale: vitaz sa urcoval zo skore po 90 minutach a predlzenie sa
// bralo do uvahy az pri remizovom sucte. Dvojica rozhodnuta v predlzeni pri
// NEremizovom sucte tak vitaza nemala, ucastnikov ostalo neparne mnozstvo a
// cyklus sparoval prostredny tim so sebou samym.
//
// Skript iba cita a rata rovnako ako api/v1/admin/ucl_build_bracket.php.
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
        SELECT g.game_type_code AS faza, g.tie_id, g.leg,
               g.home_team_id AS hid, g.away_team_id AS aid,
               g.home_score_regular AS hs, g.away_score_regular AS ag,
               g.home_score_final   AS hf, g.away_score_final   AS af,
               g.result_approved AS ok,
               hc.club_name AS h, ac.club_name AS a
          FROM ${S}.games g
          LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
          LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
         WHERE g.tie_id IS NOT NULL
         ORDER BY g.tie_id, g.leg`);

    const tie = new Map();
    rows.forEach(r => {
        if (!tie.has(r.tie_id)) tie.set(r.tie_id, { faza: r.faza, z: [] });
        tie.get(r.tie_id).z.push(r);
    });

    // Rovnaky vypocet ako v generatore po oprave.
    const kon = (z, pole) => (pole === 'h'
        ? (z.hf !== null ? z.hf : z.hs)
        : (z.af !== null ? z.af : z.ag));

    const vitaz = z => {
        if (z.length !== 2) return null;
        const [p, o] = z;
        if (!p.ok || !o.ok || p.hs === null || o.hs === null) return null;
        const gA = kon(p, 'h') + kon(o, 'a');    // domáci prvého zápasu
        const gB = kon(p, 'a') + kon(o, 'h');
        return gA === gB ? null : (gA > gB ? p.hid : p.aid);
    };

    const cislo = t => parseInt(String(t).split('-').pop(), 10);

    for (const faza of ['PO', 'R16', 'QF']) {
        const dvojice = [...tie.entries()].filter(([, v]) => v.faza === faza)
                                          .sort((x, y) => cislo(x[0]) - cislo(y[0]));
        if (!dvojice.length) continue;

        const vitazi = dvojice.map(([id, v]) => ({ id, w: vitaz(v.z), z: v.z }));
        const bezVitaza = vitazi.filter(v => v.w === null);

        check(bezVitaza.length === 0,
              `${faza}: víťaz je určený vo všetkých ${dvojice.length} dvojiciach` +
              (bezVitaza.length ? ` — chýba v ${bezVitaza.map(v => v.id).join(', ')}` : ''));

        const zoznam = vitazi.filter(v => v.w !== null).map(v => v.w);

        // Bez tejto poistky by nepárny počet sparoval prostredný tím so sebou.
        if (zoznam.length % 2 !== 0) {
            check(false, `${faza}: účastníkov ďalšej fázy je ${zoznam.length} — nepárne, ` +
                         'generátor by vytvoril zápas tímu proti sebe');
            continue;
        }

        // Párovanie najlepší s najhorším nesmie dať dvakrát ten istý tím.
        let dupl = 0;
        for (let i = 0; i < zoznam.length / 2; i++) {
            if (zoznam[i] === zoznam[zoznam.length - 1 - i]) dupl++;
        }
        check(dupl === 0, `${faza}: žiadna dvojica nemá rovnaký tím na oboch stranách`);
    }

    // Uz zostavene dvojice v DB nesmu mat tim proti sebe.
    for (const [id, v] of tie) {
        const zle = v.z.find(z => z.hid !== null && z.hid === z.aid);
        if (zle) check(false, `${id}: v DB je zápas ${zle.h} proti sebe samému`);
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
