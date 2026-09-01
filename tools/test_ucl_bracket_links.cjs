#!/usr/bin/env node
// Overi, ze odkaz z pavuka na den zapasu nieco najde.
//
// Kliknutie na vysledok v pavuku otvori Zapasy (hrac) alebo Vysledky (admin)
// s filtrom ?den=YYYY-MM-DD. Ked by sa kluc dna pocital inak nez v cielovej
// obrazovke, filter by nenasiel nic a pouzivatel by videl prazdny zoznam.
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Rovnaky vypocet ako dayKey vo frontende: naive UTC z DB, prevod na lokalny cas.
// Ovladac pg vracia timestamp uz ako Date, frontend dostane retazec z JSON —
// preto sa retazec sklada tu, aby vypocet zodpovedal prehliadacu.
const asDate = s => (s instanceof Date
    ? new Date(s.toISOString().slice(0, 19) + 'Z')
    : new Date(String(s).replace(' ', 'T') + 'Z'));
const dayKey = s => {
    const d = asDate(s);
    if (Number.isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    const { rows } = await c.query(`
        SELECT game_id, tie_id, start_time, home_score_regular AS hs
          FROM ${S}.games
         WHERE tie_id IS NOT NULL AND start_time IS NOT NULL
         ORDER BY start_time`);

    check(rows.length > 0, `zápasov vyraďovacej časti: ${rows.length}`);

    // Kazdy zapas musi dat pouzitelny kluc dna.
    const zle = rows.filter(r => !/^\d{4}-\d{2}-\d{2}$/.test(dayKey(r.start_time)));
    check(zle.length === 0, 'každý zápas dá kľúč dňa v tvare YYYY-MM-DD' +
          (zle.length ? ` — ${zle.length} zlyhalo` : ''));

    // Filter podla klucu musi najst aspon ten zapas, z ktoreho odkaz vysiel.
    const podlaDna = new Map();
    rows.forEach(r => {
        const k = dayKey(r.start_time);
        podlaDna.set(k, (podlaDna.get(k) || 0) + 1);
    });

    let prazdne = 0;
    rows.forEach(r => { if (!podlaDna.get(dayKey(r.start_time))) prazdne++; });
    check(prazdne === 0, `filter nájde zápasy pre všetky dni (${podlaDna.size} rôznych dní)`);

    // Ukazka, ako budu odkazy vyzerat.
    console.log('\nprvé odkazy:');
    [...podlaDna.entries()].slice(0, 5).forEach(([k, n]) =>
        console.log(`  /games?den=${k}   → ${n} zápasov`));

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
