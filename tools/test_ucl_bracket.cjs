#!/usr/bin/env node
// Overi zostavovanie dvojic playoff rovnakou logikou, aku ma endpoint
// ucl_build_bracket. Bezi v transakcii, ktora sa na konci vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Vitazi dvojic — domaci prveho zapasu je v odvete hostom, goly sa scitavaju krizom.
async function vitazi(c, phase) {
    const { rows } = await c.query(`
        SELECT tie_id, leg, home_team_id, away_team_id,
               home_score_regular AS hs, away_score_regular AS asc,
               home_score_final AS hf, away_score_final AS af, result_approved
          FROM ${S}.games WHERE game_type_code = $1 AND tie_id IS NOT NULL
         ORDER BY tie_id, leg`, [phase]);

    const dvojice = {};
    for (const g of rows) (dvojice[g.tie_id] = dvojice[g.tie_id] || {})[g.leg] = g;

    const out = {};
    for (const [tieId, z] of Object.entries(dvojice)) {
        const prvy = z[1], odveta = z[2];
        if (!prvy || !odveta || !prvy.result_approved || !odveta.result_approved) continue;
        if (prvy.hs === null || odveta.hs === null) continue;
        const golyA = prvy.hs + odveta.asc;
        const golyB = prvy.asc + odveta.hs;
        if (golyA !== golyB) { out[tieId] = golyA > golyB ? prvy.home_team_id : prvy.away_team_id; continue; }
        if (odveta.hf !== null && odveta.af !== null && odveta.hf !== odveta.af) {
            out[tieId] = odveta.hf > odveta.af ? odveta.home_team_id : odveta.away_team_id;
        }
    }
    return out;
}

// Dvojice: najlepsi s najhorsim, lepsie umiestneny hra odvetu doma.
const zparuj = ucastnici => {
    const pary = [];
    const n = ucastnici.length;
    for (let i = 0; i < n / 2; i++) {
        pary.push({ home: ucastnici[n - 1 - i], away: ucastnici[i] });
    }
    return pary;
};

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');
    try {
        // --- Tabulka musi byt kompletna ---
        const { rows: tab } = await c.query(
            `SELECT rank, team_id FROM ${S}.group_standings WHERE phase='LEAGUE' ORDER BY rank`);
        check(tab.length === 36, `ligova tabulka ma ${tab.length} klubov`);

        // --- Baraz: miesta 9-24 ---
        const doBaraze = tab.filter(r => r.rank >= 9 && r.rank <= 24).map(r => r.team_id);
        check(doBaraze.length === 16, `do baraze postupuje ${doBaraze.length} klubov`);

        const paryPO = zparuj(doBaraze);
        check(paryPO.length === 8, `baraz ma ${paryPO.length} dvojic`);
        // 9. (najlepsi) proti 24. (najhorsiemu) — 9. hra odvetu doma, teda je hostom.
        check(paryPO[0].away === tab[8].team_id && paryPO[0].home === tab[23].team_id,
              '1. dvojica: 9. proti 24., lepsie umiestneny je hostom prveho zapasu');
        check(paryPO[7].away === tab[15].team_id && paryPO[7].home === tab[16].team_id,
              '8. dvojica: 16. proti 17.');

        // Kazdy klub prave raz.
        const vsetky = paryPO.flatMap(p => [p.home, p.away]);
        check(new Set(vsetky).size === 16, 'kazdy klub je prave v jednej dvojici');

        // --- Zapis do DB ---
        for (let i = 0; i < paryPO.length; i++) {
            const tieId = `PO-${i + 1}`;
            await c.query(`UPDATE ${S}.games SET home_team_id=$1, away_team_id=$2, tips_open=TRUE
                            WHERE tie_id=$3 AND leg=1`, [paryPO[i].home, paryPO[i].away, tieId]);
            await c.query(`UPDATE ${S}.games SET home_team_id=$1, away_team_id=$2, tips_open=TRUE
                            WHERE tie_id=$3 AND leg=2`, [paryPO[i].away, paryPO[i].home, tieId]);
        }
        const { rows: obsadene } = await c.query(
            `SELECT COUNT(*) AS n FROM ${S}.games WHERE game_type_code='PO' AND home_team_id IS NOT NULL`);
        check(Number(obsadene[0].n) === 16, `zapisanych ${obsadene[0].n} zapasov baraze`);

        // Odveta ma obratenych domacich.
        const { rows: kontrola } = await c.query(`
            SELECT p.home_team_id AS p_home, p.away_team_id AS p_away,
                   o.home_team_id AS o_home, o.away_team_id AS o_away
              FROM ${S}.games p JOIN ${S}.games o ON o.tie_id = p.tie_id AND o.leg = 2
             WHERE p.tie_id = 'PO-1' AND p.leg = 1`);
        const k = kontrola[0];
        check(k.p_home === k.o_away && k.p_away === k.o_home, 'v odvete su domaci obrateni');

        // --- Vitazi: doplnime vysledky a overime sucet ---
        for (let i = 0; i < paryPO.length; i++) {
            const tieId = `PO-${i + 1}`;
            // Prvy zapas 0:1, odveta 0:0 -> postupuje hostujuci z prveho, teda lepsie umiestneny.
            await c.query(`UPDATE ${S}.games SET home_score_regular=0, away_score_regular=1,
                             result_approved=TRUE WHERE tie_id=$1 AND leg=1`, [tieId]);
            await c.query(`UPDATE ${S}.games SET home_score_regular=0, away_score_regular=0,
                             result_approved=TRUE WHERE tie_id=$1 AND leg=2`, [tieId]);
        }
        const v = await vitazi(c, 'PO');
        check(Object.keys(v).length === 8, `urcenych ${Object.keys(v).length} vitazov baraze`);
        check(v['PO-1'] === paryPO[0].away, 'vitazom je tim, ktory vyhral na sucet golov');

        // --- Osemfinale: prvych 8 + vitazi baraze ---
        const priami = tab.filter(r => r.rank <= 8).map(r => r.team_id);
        const ucastniciR16 = [...priami, ...Object.keys(v).sort().map(t => v[t])];
        check(ucastniciR16.length === 16, `do osemfinale postupuje ${ucastniciR16.length} klubov`);
        check(new Set(ucastniciR16).size === 16, 'ziadny klub sa neopakuje');

        const paryR16 = zparuj(ucastniciR16);
        check(paryR16[0].away === tab[0].team_id, 'najlepsi z tabulky je nasadeny v 1. dvojici R16');

        // --- Remiza na sucet: rozhodne predlzenie v odvete ---
        await c.query(`UPDATE ${S}.games SET home_score_regular=1, away_score_regular=1,
                         home_score_final=NULL, away_score_final=NULL
                        WHERE tie_id='PO-1' AND leg=1`);
        await c.query(`UPDATE ${S}.games SET home_score_regular=1, away_score_regular=1,
                         home_score_final=3, away_score_final=2
                        WHERE tie_id='PO-1' AND leg=2`);
        const v2 = await vitazi(c, 'PO');
        check(v2['PO-1'] === paryPO[0].away,
              'pri rovnakom sucte rozhodne predlzenie v odvete');

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
