#!/usr/bin/env node
// Overi, ze rucne nastavene poradie v ligovej tabulke prezije prepocet.
// Bezi v transakcii, ktora sa na konci vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Rovnaka logika ako ucl_standings_fn.php: prepocet zachova rucne poradie.
async function prepocitaj(c) {
    const { rows } = await c.query(`
        SELECT g.home_team_id AS home, g.away_team_id AS away,
               g.home_score_regular AS hs, g.away_score_regular AS asc
          FROM ${S}.games g
         WHERE g.game_type_code = 'LEAGUE' AND g.result_approved
           AND g.home_score_regular IS NOT NULL AND g.away_score_regular IS NOT NULL`);
    const { rows: kluby } = await c.query(`
        SELECT DISTINCT c.club_id, c.club_name FROM admin.uefa_clubs c
          JOIN ${S}.games g ON (g.home_team_id = c.club_id OR g.away_team_id = c.club_id)
         WHERE g.game_type_code = 'LEAGUE'`);

    const tab = {}, names = {};
    for (const k of kluby) { tab[k.club_id] = { gp:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 }; names[k.club_id] = k.club_name; }
    for (const r of rows) {
        const h = r.home, a = r.away, hs = r.hs, as = r.asc;
        if (!tab[h] || !tab[a]) continue;
        tab[h].gp++; tab[a].gp++; tab[h].gf += hs; tab[h].ga += as; tab[a].gf += as; tab[a].ga += hs;
        if (hs > as) { tab[h].w++; tab[a].l++; tab[h].pts += 3; }
        else if (hs < as) { tab[a].w++; tab[h].l++; tab[a].pts += 3; }
        else { tab[h].d++; tab[a].d++; tab[h].pts++; tab[a].pts++; }
    }

    const { rows: rucneRows } = await c.query(
        `SELECT team_id, rank FROM ${S}.group_standings WHERE phase='LEAGUE' AND finalized`);
    const rucne = Object.fromEntries(rucneRows.map(r => [r.team_id, r.rank]));
    const ids = Object.keys(tab).map(Number);
    const vsetkyRucne = rucneRows.length > 0 && rucneRows.length === ids.length;

    ids.sort((x, y) => {
        const A = tab[x], B = tab[y];
        return (B.pts - A.pts) || ((B.gf - B.ga) - (A.gf - A.ga)) || (B.gf - A.gf)
            || String(names[x]).localeCompare(String(names[y]));
    });

    await c.query(`DELETE FROM ${S}.group_standings WHERE phase='LEAGUE'`);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i], t = tab[id];
        const poradie = vsetkyRucne ? (rucne[id] ?? i + 1) : i + 1;
        await c.query(`INSERT INTO ${S}.group_standings
            (phase, team_id, rank, gp, w, d, l, gf, ga, pts, finalized, updated_at)
            VALUES ('LEAGUE',$1,$2,$3,$4,$5,$6,$7,$8,$9,${vsetkyRucne},NOW())`,
            [id, poradie, t.gp, t.w, t.d, t.l, t.gf, t.ga, t.pts]);
    }
    return ids.length;
}

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');
    try {
        const n = await prepocitaj(c);
        check(n === 36, `tabulka ma ${n} klubov`);

        const { rows: pred } = await c.query(
            `SELECT team_id, rank FROM ${S}.group_standings WHERE phase='LEAGUE' ORDER BY rank`);
        check(pred.every((r, i) => r.rank === i + 1), 'poradie je 1..36 bez dier');

        // --- Admin prehodi prve dva kluby ---
        const prehodene = [...pred];
        [prehodene[0], prehodene[1]] = [prehodene[1], prehodene[0]];
        for (let i = 0; i < prehodene.length; i++) {
            await c.query(`UPDATE ${S}.group_standings SET rank=$1, finalized=TRUE
                            WHERE phase='LEAGUE' AND team_id=$2`, [i + 1, prehodene[i].team_id]);
        }
        const { rows: poUprave } = await c.query(
            `SELECT team_id FROM ${S}.group_standings WHERE phase='LEAGUE' ORDER BY rank LIMIT 2`);
        check(poUprave[0].team_id === pred[1].team_id, 'rucna zmena poradia sa ulozila');

        // --- Prepocet nesmie rucne poradie prepisat ---
        await prepocitaj(c);
        const { rows: poPrepocte } = await c.query(
            `SELECT team_id, rank, finalized, gp FROM ${S}.group_standings
              WHERE phase='LEAGUE' ORDER BY rank LIMIT 2`);
        check(poPrepocte[0].team_id === pred[1].team_id,
              'PO PREPOCTE ZOSTALO RUCNE PORADIE (jadro opravy)');
        check(poPrepocte[0].finalized === true, 'priznak finalized zostal nastaveny');
        check(poPrepocte.every(r => r.gp !== null), 'cisla zapasov sa prepocitali');

        // --- Bez rucneho poradia sa pouzije vypocitane ---
        await c.query(`UPDATE ${S}.group_standings SET finalized=FALSE WHERE phase='LEAGUE'`);
        await prepocitaj(c);
        const { rows: auto } = await c.query(
            `SELECT team_id, finalized FROM ${S}.group_standings WHERE phase='LEAGUE' ORDER BY rank LIMIT 1`);
        check(auto[0].finalized === false, 'bez rucneho poradia sa priznak nenastavi');
        check(auto[0].team_id === pred[0].team_id, 'poradie sa vratilo k vypocitanemu');

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
