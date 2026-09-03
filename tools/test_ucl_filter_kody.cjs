#!/usr/bin/env node
// Overi, ze kazdy UCL zapas dostane skratku kola, ktora existuje v ciselniku.
// Rovnaka logika ako statKod() v UclGames.jsx a ako migracia 075 — ak sa
// rozidu, filter by tichu stratil zapasy.
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

const statKod = g => g.game_type_code === 'LEAGUE' ? `LF${g.round_no}`
    : g.leg ? `${g.game_type_code === 'PO' ? 'BAR' : g.game_type_code}-${g.leg}`
    : g.game_type_code;

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    const { rows: comp } = await c.query("SELECT id FROM admin.competitions WHERE slug = 'ucl2026'");
    check(comp.length === 1, 'súťaž ucl2026 nájdená');
    if (!comp.length) { await c.end(); process.exit(1); }

    const { rows: kat } = await c.query(
        'SELECT match_stat_code m FROM admin.competition_phases WHERE competition_id = $1 AND is_active',
        [comp[0].id]);
    const platne = new Set(kat.map(r => r.m));

    const { rows: g } = await c.query(
        'SELECT game_type_code, game_type_name, leg,' +
        " substring(game_type_name from '([0-9]+)\\. kolo')::int AS round_no" +
        ' FROM "lm2026-27".games');

    const pocty = new Map();
    g.forEach(x => { const k = statKod(x); pocty.set(k, (pocty.get(k) || 0) + 1); });

    [...pocty.entries()].sort().forEach(([k, n]) => console.log(
        `  ${k.padEnd(7)}${String(n).padStart(3)} zápasov${platne.has(k) ? '' : '   ← nie je v číselníku'}`));

    const chybne = [...pocty.keys()].filter(k => !platne.has(k));
    check(chybne.length === 0, `všetkých ${g.length} zápasov má kód z číselníka`);

    // Kod bez zapasov je v poriadku (kolo sa este nehralo), ale zapas bez kodu nie.
    check(!pocty.has('null') && ![...pocty.keys()].some(k => k.includes('null') || k === 'undefined'),
          'žiadny zápas nemá prázdnu skratku');

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
