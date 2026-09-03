#!/usr/bin/env node
// Overi, ze pavuk sa da postavit pre vsetky tri sutaze — teda ze mapovanie
// stlpcov v bracket.php sedi so skutocnymi schemami.
//
// Zopakuje dopyt endpointu a skontroluje, ze vrati zapasy, mena timov a pri
// odohranych aj vitaza. Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

// Rovnake mapovanie ako $SUTAZE v api/v1/bracket.php.
const SUTAZE = {
    iihf2026: {
        schema: 'iihf2026', faza: 'phase', id: 'id', cas: 'starts_at',
        domaci: 'team1', hostia: 'team2', sh: 'score1', sa: 'score2',
        fh: 'final1', fa: 'final2', schvalene: null, twoLegs: false,
        teams: { t: 'iihf2026.teams', k: 'code', n: 'name', l: null,
                 sport: 'sport_code_iihf' },
        fazy: ['QF', 'SF', 'BRONZE', 'GOLD'],
    },
    fifa2026: {
        schema: 'fifa2026', faza: 'game_type_code', id: 'game_id', cas: 'start_time',
        domaci: 'home_team_id', hostia: 'away_team_id',
        sh: 'home_score_regular', sa: 'away_score_regular',
        fh: 'home_score_final', fa: 'away_score_final',
        schvalene: 'result_approved', twoLegs: false,
        teams: { t: 'fifa2026.teams', k: 'team_id', n: 'team_name', l: null,
                 sport: 'sport_code_fifa', kod: 'team_code' },
        fazy: ['R32', 'R16', 'QF', 'SF', 'BM', 'F'],
    },
    ucl2026: {
        schema: 'lm2026-27', faza: 'game_type_code', id: 'game_id', cas: 'start_time',
        domaci: 'home_team_id', hostia: 'away_team_id',
        sh: 'home_score_regular', sa: 'away_score_regular',
        fh: 'home_score_final', fa: 'away_score_final',
        schvalene: 'result_approved', twoLegs: true,
        teams: { t: 'admin.uefa_clubs', k: 'club_id', n: 'club_name', l: 'logo_file' },
        fazy: ['PO', 'R16', 'QF', 'SF', 'F'],
    },
};

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    for (const [slug, S] of Object.entries(SUTAZE)) {
        const T = S.teams;
        const schval = S.schvalene ? `g.${S.schvalene}` : 'TRUE';
        const tie = S.twoLegs ? 'g.tie_id, g.leg,' : 'NULL AS tie_id, NULL AS leg,';
        // Klub ma logo pri sebe, reprezentacia ma vlajku v admin.countries
        // pod sportovym kodom — rovnako ako v bracket.php.
        let logoH = `h.${T.l}`, logoA = `a.${T.l}`, joinVlajky = '';
        if (T.l === null) {
            const kod = T.kod || T.k;
            logoH = 'kh.flag_file'; logoA = 'ka.flag_file';
            joinVlajky =
                ` LEFT JOIN admin.countries kh ON kh.${T.sport} = h.${kod}` +
                ` LEFT JOIN admin.countries ka ON ka.${T.sport} = a.${kod}`;
        }

        const sql =
            `SELECT g.${S.id} AS game_id, g.${S.faza} AS faza, ${tie}` +
            ` g.${S.cas} AS start_time,` +
            ` g.${S.sh} AS hs, g.${S.sa} AS ag, g.${S.fh} AS hf, g.${S.fa} AS af,` +
            ` ${schval} AS result_approved,` +
            ` g.${S.domaci} AS home_team_id, g.${S.hostia} AS away_team_id,` +
            ` h.${T.n} AS home_name, ${logoH} AS home_logo,` +
            ` a.${T.n} AS away_name, ${logoA} AS away_logo` +
            ` FROM "${S.schema}".games g` +
            ` LEFT JOIN ${T.t} h ON h.${T.k} = g.${S.domaci}` +
            ` LEFT JOIN ${T.t} a ON a.${T.k} = g.${S.hostia}` + joinVlajky +
            ` WHERE g.${S.faza} = ANY($1)` +
            ` ORDER BY g.${S.faza}, ${S.twoLegs ? 'g.tie_id, g.leg, ' : ''}g.${S.id}`;

        let rows;
        try {
            rows = (await c.query(sql, [S.fazy])).rows;
        } catch (e) {
            check(false, `${slug}: dopyt zlyhal — ${e.message}`);
            continue;
        }

        console.log(`\n=== ${slug} ===`);
        check(rows.length > 0, `${slug}: pavúk má z čoho stavať (${rows.length} zápasov)`);

        // Mena timov musia byt dohladane — inak by v pavuku boli prazdne boxy.
        const sTimom = rows.filter(r => r.home_team_id !== null);
        const bezMena = sTimom.filter(r => !r.home_name);
        const bezVlajky = sTimom.filter(r => !r.home_logo);
        check(bezMena.length === 0,
              `${slug}: každý určený tím má názov (${sTimom.length} zápasov s tímami)` +
              (bezMena.length ? ` — chýba pri ${bezMena.length}` : ''));
        if (bezVlajky.length) console.log(
            `      (bez vlajky: ${bezVlajky.length} — pavúk ich zobrazí bez obrázka)`);

        // Prehlad po fazach.
        const podla = {};
        rows.forEach(r => { podla[r.faza] = (podla[r.faza] || 0) + 1; });
        S.fazy.forEach(f => {
            const n = podla[f] || 0;
            const sTim = rows.filter(r => r.faza === f && r.home_team_id !== null).length;
            const sVys = rows.filter(r => r.faza === f && r.hs !== null).length;
            console.log(`    ${f.padEnd(7)}${String(n).padStart(3)} zápasov` +
                        `   s tímami: ${sTim}   odohrané: ${sVys}`);
        });
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
