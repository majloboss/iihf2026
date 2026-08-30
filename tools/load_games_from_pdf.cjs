#!/usr/bin/env node
// Nahra zapasy z referencnej tabulky "lm2026-27".games_pdf do "lm2026-27".games.
//
// games_pdf je baza: pocas testovania sa z nej zapasy nahravaju opakovane,
// preto sa games pred naplnenim vyprazdni. Na zapasoch mozu visiet tipy —
// tie by sa stratili, preto import bez prepinaca --force skonci chybou.
//
// Pouzitie:
//   node tools/load_games_from_pdf.cjs           kontrola, nic nezapisuje
//   node tools/load_games_from_pdf.cjs --write   naplni games (ak niet tipov)
//   node tools/load_games_from_pdf.cjs --write --force   zmaze aj tipy
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const args = process.argv.slice(2);
const write = args.includes('--write');
const force = args.includes('--force');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = key => {
    const m = conf.match(new RegExp("define\\('" + key + "'\\s*,\\s*'([^']*)'"));
    if (!m) throw new Error('V db.php chyba ' + key);
    return m[1];
};

// game_type_name musi sediet s tym, co cakaju UclGames a games.php:
// kolo sa z neho vytahuje regulárnym vyrazom '([0-9]+)\. kolo'.
const PHASE_NAME = {
    PO:  'Baráž o postup do play-off',
    R16: 'Osemfinále',
    QF:  'Štvrťfinále',
    SF:  'Semifinále',
    F:   'Finále',
};

(async () => {
    const client = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
        const { rows: pdf } = await client.query(
            'SELECT * FROM "lm2026-27".games_pdf ORDER BY game_number');
        if (!pdf.length) throw new Error('games_pdf je prazdna — najprv spusti migraciu 062');

        const tipy = Number((await client.query(
            'SELECT COUNT(*) FROM "lm2026-27".tips')).rows[0].count);

        console.log('games_pdf:', pdf.length, 'zapasov,',
                    pdf.filter(g => g.phase === 'LEAGUE').length, 'v ligovej faze');
        console.log('existujuce tipy:', tipy);

        if (!write) { console.log('Skusobny beh — nic sa nezapisalo. Spusti s --write.'); return; }
        if (tipy > 0 && !force) {
            throw new Error(`Na zapasoch visi ${tipy} tipov. Import by ich zmazal — pridaj --force.`);
        }

        await client.query('BEGIN');
        await client.query('DELETE FROM "lm2026-27".tips');
        await client.query('DELETE FROM "lm2026-27".games');

        const ins = `INSERT INTO "lm2026-27".games
            (game_id, home_team_id, away_team_id, start_time, venue,
             game_type_code, game_type_name, tie_id, leg, flashscore_url)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`;

        for (const g of pdf) {
            const name = g.phase === 'LEAGUE'
                ? `Ligová fáza — ${g.round_no}. kolo`
                : (PHASE_NAME[g.phase] || g.phase) +
                  (g.leg ? (g.leg === 1 ? ' — 1. zápas' : ' — odveta') : '');
            await client.query(ins, [
                g.game_number,
                g.home_team_id,
                g.away_team_id,
                g.starts_at, g.venue || '',
                g.phase, name, g.tie_id, g.leg, g.flashscore_url,
            ]);
        }
        await client.query('COMMIT');
        console.log('Nahranych zapasov:', pdf.length);
    } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
    } finally {
        await client.end();
    }
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
