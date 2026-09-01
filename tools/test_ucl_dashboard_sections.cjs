#!/usr/bin/env node
// Overi, ze ziadny zapas nevypadne zo vsetkych sekcii prehladu.
//
// Tipovanie sa zatvara 5 minut pred vykopom. Zapas v tomto okne uz nebol
// tipovatelny, ale este nezacal — nepatril teda ani medzi prebiehajuce, ani
// medzi najblizsie, a z prehladu na par minut zmizol.
//
// Skript iba cita a rata rovnako ako web/src/pages/user/UclDashboard.jsx.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
const TIP_LOCK_MS = 5 * 60 * 1000;
let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

const asDate = s => (s instanceof Date
    ? new Date(s.toISOString().slice(0, 19) + 'Z')
    : new Date(String(s).replace(' ', 'T') + 'Z'));

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    const { rows: games } = await c.query(`
        SELECT game_id, game_type_code, start_time, tips_open,
               home_team_id, away_team_id, result_approved
          FROM ${S}.games
         WHERE start_time IS NOT NULL`);

    // Rozdelenie do sekcii pre lubovolny okamih — presne ako v prehlade.
    const sekcie = (now) => {
        const canTip = g => g.tips_open && g.home_team_id && g.away_team_id
            && asDate(g.start_time).getTime() - now > TIP_LOCK_MS;

        const live = games.filter(g => g.home_team_id && g.away_team_id && !g.result_approved
            && asDate(g.start_time).getTime() - now <= TIP_LOCK_MS);

        const tipovatelne = games.filter(canTip);

        // Ked sa nic tipovat neda, sekcia ukaze aspon najblizsie terminy.
        const najblizsie = tipovatelne.length ? tipovatelne : games.filter(g =>
            !g.result_approved && asDate(g.start_time).getTime() - now > TIP_LOCK_MS);

        return { live, najblizsie };
    };

    // Kazdy neschvaleny zapas musi byt v niektorej sekcii — v lubovolnom case.
    const kluc = new Set();
    games.forEach(g => {
        const t = asDate(g.start_time).getTime();
        // Okamihy tesne okolo uzavretia tipovania a vykopu.
        [t - TIP_LOCK_MS - 1000, t - TIP_LOCK_MS + 1000, t - 1000, t + 1000].forEach(x => kluc.add(x));
    });

    let diery = 0;
    let prvaDiera = null;
    for (const now of kluc) {
        const { live, najblizsie } = sekcie(now);
        const vidno = new Set([...live, ...najblizsie].map(g => g.game_id));
        for (const g of games) {
            if (g.result_approved) continue;
            if (!g.home_team_id || !g.away_team_id) continue;
            if (asDate(g.start_time).getTime() < now) continue;   // už odohraté
            if (!vidno.has(g.game_id)) {
                diery++;
                if (!prvaDiera) prvaDiera = { g, now };
            }
        }
    }

    check(diery === 0, `žiadny zápas nevypadne zo všetkých sekcií (${kluc.size} skúmaných okamihov)`
          + (prvaDiera ? ` — napr. #${prvaDiera.g.game_id} ${prvaDiera.g.game_type_code}` : ''));

    // Kontrolne: v case tesne pred vykopom musi byt zapas medzi prebiehajucimi.
    const finale = games.find(g => g.game_type_code === 'F' && g.home_team_id);
    if (finale) {
        const tesnePred = asDate(finale.start_time).getTime() - 60 * 1000;
        const { live } = sekcie(tesnePred);
        check(live.some(g => g.game_id === finale.game_id),
              'finále je minútu pred výkopom medzi prebiehajúcimi');
    } else {
        console.log('      (finále zatiaľ nemá tímy, kontrola preskočená)');
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
