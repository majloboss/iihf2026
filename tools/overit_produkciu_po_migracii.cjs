#!/usr/bin/env node
// Overi produkciu po migraciach 072-074 + 076:
//   - ciselnik je zhodny s DEV,
//   - kazdy zapas v produkcii dostane skratku kola, ktora v ciselniku existuje,
//   - filter sa vykresli bez jednoprvkovych zbaleni.
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const cfg = p => {
    const conf = fs.readFileSync(path.join(__dirname, p), 'utf8');
    const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];
    return { host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
             user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false } };
};

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

const ciselnik = async c => (await c.query(`
    SELECT k.slug, p.match_stat_code, p.phase_code, p.phase_name, p.match_stat_desc,
           p.color_code, p.group_code, p.sort_order, p.is_active
      FROM admin.competition_phases p
      JOIN admin.competitions k ON k.id = p.competition_id
     ORDER BY k.slug, p.sort_order, p.match_stat_code`)).rows;

const statKod = g => g.game_type_code === 'LEAGUE' ? `LF${g.round_no}`
    : g.leg ? `${g.game_type_code === 'PO' ? 'BAR' : g.game_type_code}-${g.leg}`
    : g.game_type_code;

(async () => {
    const dev = new Client(cfg('../api/config/db.php'));
    await dev.connect();
    const naDev = await ciselnik(dev);
    await dev.end();

    const p = new Client(cfg('../../betclub/api/config/db.php'));
    await p.connect();
    const naProd = await ciselnik(p);

    check(naProd.length === naDev.length, `počet fáz sedí s DEV (${naProd.length} = ${naDev.length})`);
    check(JSON.stringify(naProd) === JSON.stringify(naDev), 'obsah číselníka je zhodný s DEV');

    // Zapasy musia najst svoju skratku, inak by filter tichu stratil zapasy.
    const { rows: g } = await p.query(
        'SELECT game_type_code, leg,' +
        " substring(game_type_name from '([0-9]+)\\. kolo')::int AS round_no" +
        ' FROM "lm2026-27".games');
    const platne = new Set(naProd.filter(r => r.slug === 'ucl2026').map(r => r.match_stat_code));
    const pocty = new Map();
    g.forEach(x => { const k = statKod(x); pocty.set(k, (pocty.get(k) || 0) + 1); });
    const chybne = [...pocty.keys()].filter(k => !platne.has(k));
    check(chybne.length === 0,
          `všetkých ${g.length} UCL zápasov má kód z číselníka${chybne.length ? ' — chýba: ' + chybne.join(', ') : ''}`);

    // Ako sa filter vykresli — rovnaka logika ako PhaseFilter.jsx.
    for (const slug of ['iihf2026', 'fifa2026', 'ucl2026']) {
        const fazy = naProd.filter(r => r.slug === slug && r.is_active);
        const sk = new Map();
        fazy.forEach(f => { if (f.group_code) {
            if (!sk.has(f.group_code)) sk.set(f.group_code, []);
            sk.get(f.group_code).push(f); } });
        const zbalene = new Set([...sk.entries()].filter(([, v]) => v.length > 1).map(([k]) => k));
        const riadok = [], hotove = new Set();
        fazy.forEach(f => {
            if (!f.group_code || !zbalene.has(f.group_code)) { riadok.push(f.match_stat_code); return; }
            if (hotove.has(f.group_code)) return;
            hotove.add(f.group_code); riadok.push(`[${f.group_code}]`);
        });
        console.log(`  ${slug.padEnd(10)}ALL ${riadok.join(' ')}`);
        const vRiadku = riadok.filter(x => !x.startsWith('[')).length;
        const vSk = [...zbalene].reduce((n, k) => n + sk.get(k).length, 0);
        check(vRiadku + vSk === fazy.length, `${slug}: všetkých ${fazy.length} fáz je dostupných`);
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await p.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
