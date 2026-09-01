#!/usr/bin/env node
// Vygeneruje SQL migraciu s rozpisom ligovej fazy LM z CSV.
//
// Pouzitie: node tools/import_ucl_league.cjs <csv> <vystupny.sql> [verzia]
//
// CSV (oddelovac ;, kodovanie UTF-8, prvy riadok je hlavicka):
//   kolo;datum;cas;domaci;hostia;stadion
//   1;2026-09-08;21:00;RMA;BAY;Santiago Bernabeu
//
// - kolo    1-8
// - datum   YYYY-MM-DD
// - cas     HH:MM v MIESTNOM case (prepocita sa na UTC, ktore drzi DB)
// - domaci  kod klubu z admin.uefa_clubs (club_code)
// - hostia  kod klubu
// - stadion volitelne
//
// Skript CSV zvaliduje: 144 zapasov, kazdy klub 8 zapasov (4 doma, 4 vonku),
// ziadna dvojica dvakrat, kazde kolo 18 zapasov. Pri chybe migraciu nevytvori.

const fs = require('fs');

const [csvPath, outPath, versionArg] = process.argv.slice(2);
if (!csvPath || !outPath) {
    console.error('Pouzitie: node tools/import_ucl_league.cjs <csv> <vystupny.sql> [verzia]');
    process.exit(1);
}
const version = Number(versionArg || 60);

// Posun miestneho casu voci UTC. Leto +2 (CEST), zima +1 (CET).
// Ligova faza sa hra od septembra do decembra, preto sa pocita podla datumu.
function toUtc(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    // Date s explicitnym offsetom podla toho, ci je letny cas.
    const local = new Date(Date.UTC(y, m - 1, d, hh, mm));
    // Posledna nedela v oktobri = koniec letneho casu.
    const lastSundayOct = (year) => {
        const dt = new Date(Date.UTC(year, 9, 31));
        dt.setUTCDate(31 - dt.getUTCDay());
        return dt;
    };
    const lastSundayMar = (year) => {
        const dt = new Date(Date.UTC(year, 2, 31));
        dt.setUTCDate(31 - dt.getUTCDay());
        return dt;
    };
    const isSummer = local >= lastSundayMar(y) && local < lastSundayOct(y);
    const offset = isSummer ? 2 : 1;
    const utc = new Date(local.getTime() - offset * 3600000);
    const p = n => String(n).padStart(2, '0');
    return `${utc.getUTCFullYear()}-${p(utc.getUTCMonth() + 1)}-${p(utc.getUTCDate())} `
         + `${p(utc.getUTCHours())}:${p(utc.getUTCMinutes())}:00`;
}

const rows = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '')
    .split(/\r?\n/).slice(1).filter(l => l.trim())
    .map(l => l.split(';').map(x => x.replace(/^"|"$/g, '').trim()));

const problems = [];
const games = [];
const played = {}, atHome = {}, pairs = new Set(), byRound = {};

rows.forEach((r, i) => {
    const line = i + 2;
    const [round, date, time, home, away, venue] = r;

    if (!/^[1-8]$/.test(round)) { problems.push(`riadok ${line}: kolo musí byť 1-8, je "${round}"`); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { problems.push(`riadok ${line}: neplatný dátum "${date}"`); return; }
    if (!/^\d{1,2}:\d{2}$/.test(time)) { problems.push(`riadok ${line}: neplatný čas "${time}"`); return; }
    if (!home || !away) { problems.push(`riadok ${line}: chýba domáci alebo hosťujúci klub`); return; }
    if (home === away) { problems.push(`riadok ${line}: klub ${home} hrá sám proti sebe`); return; }

    const key = [home, away].sort().join('-');
    if (pairs.has(key)) { problems.push(`riadok ${line}: dvojica ${home}-${away} sa opakuje`); return; }
    pairs.add(key);

    played[home] = (played[home] || 0) + 1;
    played[away] = (played[away] || 0) + 1;
    atHome[home] = (atHome[home] || 0) + 1;
    byRound[round] = (byRound[round] || 0) + 1;

    games.push({ round: Number(round), start: toUtc(date, time), home, away, venue: venue || '' });
});

// Kontroly formatu sutaze
if (games.length !== 144) problems.push(`zápasov je ${games.length}, očakávaných 144`);
for (const [r, n] of Object.entries(byRound)) {
    if (n !== 18) problems.push(`kolo ${r} má ${n} zápasov, očakávaných 18`);
}
const clubs = Object.keys(played);
if (clubs.length !== 36) problems.push(`klubov je ${clubs.length}, očakávaných 36`);
for (const c of clubs) {
    if (played[c] !== 8) problems.push(`${c} má ${played[c]} zápasov, očakávaných 8`);
    if ((atHome[c] || 0) !== 4) problems.push(`${c} má ${atHome[c] || 0} domácich, očakávané 4`);
}

if (problems.length) {
    console.error('CSV obsahuje chyby, migrácia sa nevygenerovala:\n  ' + problems.slice(0, 30).join('\n  '));
    if (problems.length > 30) console.error(`  … a ďalších ${problems.length - 30}`);
    process.exit(1);
}

const q = v => (v === null || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const values = games.map((g, i) => '    (' + [
    i + 1, q(g.home), q(g.away), q(g.start), q(g.venue), g.round,
].join(', ') + ')').join(',\n');

const sql = `-- Migration ${version}: rozpis ligovej fazy LM 2026/27
-- Vygenerovane: tools/import_ucl_league.cjs
-- Zdroj: ${csvPath.split(/[\\/]/).pop()} (${games.length} zapasov)
--
-- Casy su prepocitane z miestneho casu na UTC, ktore drzi DB.
-- Kluby sa parvaju podla club_code z admin.uefa_clubs.
--
-- Playoff zapasy zostavaju nedotknute — dopĺňa ich admin po zrebe.

BEGIN;

CREATE TEMP TABLE ucl_rozpis (
    poradie   INT,
    home_code VARCHAR(20),
    away_code VARCHAR(20),
    start_utc TIMESTAMP,
    venue     VARCHAR(100),
    kolo      INT
) ON COMMIT DROP;

INSERT INTO ucl_rozpis (poradie, home_code, away_code, start_utc, venue, kolo) VALUES
${values};

-- Kontrola: vsetky kody klubov musia existovat v ciselniku.
DO $$
DECLARE chybne TEXT;
BEGIN
    SELECT string_agg(DISTINCT kod, ', ') INTO chybne
      FROM (
          SELECT home_code AS kod FROM ucl_rozpis
          UNION SELECT away_code FROM ucl_rozpis
      ) x
     WHERE NOT EXISTS (SELECT 1 FROM admin.uefa_clubs c WHERE c.club_code = x.kod);
    IF chybne IS NOT NULL THEN
        RAISE EXCEPTION 'Neznáme kódy klubov: %', chybne;
    END IF;
END $$;

-- Prepis ligovej fazy. Tipy na tieto zapasy sa zmazu.
DELETE FROM "lm2026-27".tips
 WHERE game_id IN (SELECT game_id FROM "lm2026-27".games WHERE game_type_code = 'LEAGUE');
DELETE FROM "lm2026-27".games WHERE game_type_code = 'LEAGUE';

INSERT INTO "lm2026-27".games
    (game_id, home_team_id, away_team_id, start_time, venue, game_type_code, game_type_name)
SELECT r.poradie,
       hc.club_id,
       ac.club_id,
       r.start_utc,
       r.venue,
       'LEAGUE',
       'Ligová fáza — ' || r.kolo || '. kolo'
  FROM ucl_rozpis r
  JOIN admin.uefa_clubs hc ON hc.club_code = r.home_code
  JOIN admin.uefa_clubs ac ON ac.club_code = r.away_code;

-- Kontrola: kazdy klub musi mat 8 zapasov, z toho 4 doma.
DO $$
DECLARE zle INTEGER;
BEGIN
    SELECT COUNT(*) INTO zle FROM (
        SELECT c.club_id
          FROM admin.uefa_clubs c
          JOIN "lm2026-27".games g
            ON (g.home_team_id = c.club_id OR g.away_team_id = c.club_id)
         WHERE g.game_type_code = 'LEAGUE'
         GROUP BY c.club_id
        HAVING COUNT(*) <> 8
            OR COUNT(*) FILTER (WHERE g.home_team_id = c.club_id) <> 4
    ) x;
    IF zle > 0 THEN
        RAISE EXCEPTION 'Rozpis je nekonzistentný: % klubov nemá 8 zápasov alebo 4 domáce', zle;
    END IF;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (${version}, 'Rozpis ligovej fazy LM 2026/27 (${games.length} zapasov)')
ON CONFLICT (version) DO NOTHING;

COMMIT;
`;

fs.writeFileSync(outPath, sql, 'utf8');
console.log(`OK: ${games.length} zápasov -> ${outPath}`);
console.log(`    kolá: ${Object.keys(byRound).sort().join(', ')}`);
console.log(`    klubov: ${clubs.length}, každý 8 zápasov (4 doma)`);
