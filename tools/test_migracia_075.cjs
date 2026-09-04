#!/usr/bin/env node
// Overi, ze migracia 075 naviaze zapasy na spravne fazy.
//
// `ALTER TABLE` spustit nevieme (appka nie je vlastnikom tabulky), preto sa
// overuje samotne priradenie: pre kazdy zapas sa dohlada faza rovnakym
// sposobom ako v migracii a porovna sa s tym, co dnes dopocitava appka.
// Ak by sa rozisli, po prepise by filtre prestali najst zapasy.
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

// To iste, co dnes robi statKod() v UclGames.jsx.
const statKod = g => g.game_type_code === 'LEAGUE' ? `LF${g.round_no}`
    : g.leg ? `${g.game_type_code === 'PO' ? 'BAR' : g.game_type_code}-${g.leg}`
    : g.game_type_code;

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    // ── UCL ──────────────────────────────────────────────────────────────────
    // Rovnake priradenie ako v migracii: ligova faza podla cisla kola,
    // dvojzapasy podla `leg`, ostatne podla kodu.
    const { rows: ucl } = await c.query(`
        SELECT g.game_type_code, g.leg, p.match_stat_code AS kod,
               substring(g.game_type_name from '([0-9]+)\\. kolo')::int AS round_no
          FROM "lm2026-27".games g
          LEFT JOIN admin.competition_phases p
                 ON p.competition_id = (SELECT id FROM admin.competitions WHERE slug = 'ucl2026')
                AND p.match_stat_code = CASE
                        WHEN g.game_type_code = 'LEAGUE'
                            THEN 'LF' || substring(g.game_type_name from '([0-9]+)\\. kolo')
                        WHEN g.leg IS NOT NULL
                            THEN (CASE g.game_type_code WHEN 'PO' THEN 'BAR'
                                  ELSE g.game_type_code END) || '-' || g.leg
                        ELSE g.game_type_code END`);

    const bezFazy = ucl.filter(r => !r.kod);
    check(bezFazy.length === 0,
          `UCL: každý z ${ucl.length} zápasov nájde svoju fázu` +
          (bezFazy.length ? ` — ${bezFazy.length} bez fázy` : ''));

    const nesedi = ucl.filter(r => r.kod && statKod(r) !== r.kod);
    check(nesedi.length === 0,
          'UCL: priradenie sedí s tým, čo dnes počíta appka' +
          (nesedi.length ? ` — nesedí ${nesedi.length}` : ''));
    nesedi.slice(0, 5).forEach(r => console.log(
        `      ${r.game_type_code}/leg=${r.leg}: appka ${statKod(r)}, migrácia ${r.kod}`));

    // ── FIFA ─────────────────────────────────────────────────────────────────
    const { rows: fifa } = await c.query(`
        SELECT COUNT(*)::int spolu, COUNT(p.id)::int s_fazou
          FROM fifa2026.games g
          LEFT JOIN admin.competition_phases p
                 ON p.competition_id = (SELECT id FROM admin.competitions WHERE slug = 'fifa2026')
                AND ((g.game_type_code LIKE 'GROUP\\_%'
                      AND p.phase_code = replace(g.game_type_code, 'GROUP_', '')
                      AND p.group_code = 'GRP')
                  OR (g.game_type_code NOT LIKE 'GROUP\\_%'
                      AND p.match_stat_code = CASE g.game_type_code
                              WHEN 'BM' THEN 'BR'     -- Bronze Medal
                              WHEN 'F'  THEN 'FIN'    -- finále, nie skupina F
                              ELSE g.game_type_code END))`);
    check(fifa[0].s_fazou === fifa[0].spolu,
          `FIFA: ${fifa[0].s_fazou}/${fifa[0].spolu} zápasov nájde svoju fázu`);

    // ── IIHF ─────────────────────────────────────────────────────────────────
    // Kody sa v admine premenovali (BRONZE -> BR, GOLD -> F), preto aj cez popis.
    const { rows: iihf } = await c.query(`
        SELECT COUNT(*)::int spolu, COUNT(p.id)::int s_fazou
          FROM iihf2026.games g
          LEFT JOIN admin.competition_phases p
                 ON p.competition_id = (SELECT id FROM admin.competitions WHERE slug = 'iihf2026')
                AND (p.match_stat_code = g.phase
                     OR (g.phase = 'BRONZE' AND p.match_stat_desc ILIKE '%bronz%')
                     OR (g.phase = 'GOLD'   AND p.match_stat_desc ILIKE '%finále%'))`);
    check(iihf[0].s_fazou === iihf[0].spolu,
          `IIHF: ${iihf[0].s_fazou}/${iihf[0].spolu} zápasov nájde svoju fázu`);

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
