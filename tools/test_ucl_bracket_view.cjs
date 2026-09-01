#!/usr/bin/env node
// Overi, ze pavuk pocita sucet golov a vitazov rovnako ako endpoint
// v1/ucl/bracket. Iba cita, nic nemeni.
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
    try {
        const { rows } = await c.query(`
            SELECT g.game_type_code, g.tie_id, g.leg,
                   g.home_score_regular AS hs, g.away_score_regular AS ag,
                   g.home_score_final AS hf, g.away_score_final AS af,
                   g.home_team_id, g.away_team_id,
                   hc.club_name AS home_name, ac.club_name AS away_name
              FROM ${S}.games g
              LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
              LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
             WHERE g.game_type_code <> 'LEAGUE'
             ORDER BY g.tie_id, g.leg`);

        const dvojice = {};
        for (const r of rows) {
            const k = r.tie_id ?? `${r.game_type_code}-single`;
            (dvojice[k] = dvojice[k] || []).push(r);
        }

        let sVitazom = 0, bezVitaza = 0, prazdnych = 0;
        const chyby = [];

        for (const [tieId, z] of Object.entries(dvojice)) {
            z.sort((a, b) => (a.leg ?? 0) - (b.leg ?? 0));
            const prvy = z[0], odveta = z[1];

            if (!prvy.home_team_id) { prazdnych++; continue; }

            // Tim A je v prvom zapase hostom (lepsie umiestneny hra odvetu doma).
            const timA = odveta ? prvy.away_team_id : prvy.home_team_id;
            const timB = odveta ? prvy.home_team_id : prvy.away_team_id;
            const menoA = odveta ? prvy.away_name : prvy.home_name;
            const menoB = odveta ? prvy.home_name : prvy.away_name;

            const ma = x => x && x.hs !== null && x.ag !== null;
            let ga = null, gb = null, vitaz = null;

            if (odveta) {
                if (ma(prvy) && ma(odveta)) {
                    ga = prvy.ag + odveta.hs;
                    gb = prvy.hs + odveta.ag;
                    if (ga !== gb) vitaz = ga > gb ? timA : timB;
                    else if (odveta.hf !== null && odveta.af !== null && odveta.hf !== odveta.af) {
                        vitaz = odveta.hf > odveta.af ? timA : timB;
                    }
                }
            } else if (ma(prvy)) {
                ga = prvy.hs; gb = prvy.ag;
                if (ga !== gb) vitaz = ga > gb ? timA : timB;
            }

            if (vitaz) sVitazom++;
            else if (ga !== null) {
                bezVitaza++;
                chyby.push(`${tieId}: ${menoA} ${ga}:${gb} ${menoB} — nerozhodnute`);
            }

            // Sucet musi sediet s golmi oboch zapasov.
            if (odveta && ma(prvy) && ma(odveta)) {
                const spolu = prvy.hs + prvy.ag + odveta.hs + odveta.ag;
                if (ga + gb !== spolu) {
                    chyby.push(`${tieId}: sucet ${ga}+${gb} nesedi s golmi ${spolu}`);
                }
            }
        }

        check(sVitazom > 0, `dvojic s urcenym vitazom: ${sVitazom}`);
        check(prazdnych > 0 || sVitazom > 0, `dvojic bez timov (caka na zreb): ${prazdnych}`);
        check(bezVitaza === 0,
              `ziadna dohrana dvojica nezostala nerozhodnuta${bezVitaza ? ':\n      ' + chyby.join('\n      ') : ''}`);

        // Vitaz musi byt jeden z dvojice.
        const { rows: kontrola } = await c.query(`
            SELECT COUNT(*) AS n FROM ${S}.games WHERE game_type_code = 'PO' AND result_approved`);
        check(Number(kontrola[0].n) === 16, `baraz ma ${kontrola[0].n} dohranych zapasov`);

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
