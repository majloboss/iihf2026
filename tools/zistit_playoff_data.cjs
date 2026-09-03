#!/usr/bin/env node
// Zisti, ake data o vyradovacej casti maju FIFA a IIHF — ci sa da pavuk
// postavit rovnakym sposobom ako v UCL (dvojzapasy cez tie_id + leg).
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    for (const [schema, meno] of [['iihf2026', 'IIHF'], ['fifa2026', 'FIFA'], ['lm2026-27', 'UCL']]) {
        console.log(`\n===== ${meno}  (schéma ${schema}) =====`);

        const { rows: st } = await c.query(
            'SELECT column_name FROM information_schema.columns' +
            ' WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position', [schema, 'games']);
        const ma = n => st.some(r => r.column_name === n);
        console.log(`  tie_id: ${ma('tie_id')}   leg: ${ma('leg')}   ` +
                    `game_type_code: ${ma('game_type_code')}   phase: ${ma('phase')}`);

        // Ako sa v tejto sutazi vola stlpec s fazou a casom.
        const faza = ma('game_type_code') ? 'game_type_code' : 'phase';
        const cas  = ma('start_time') ? 'start_time' : 'starts_at';
        const idc  = ma('game_id') ? 'game_id' : 'id';

        const { rows } = await c.query(
            `SELECT "${faza}" AS faza, COUNT(*)::int n,` +
            (ma('tie_id') ? ' COUNT(tie_id)::int s_tie,' : ' 0 AS s_tie,') +
            (ma('leg') ? ' COUNT(leg)::int s_leg' : ' 0 AS s_leg') +
            ` FROM "${schema}".games` +
            ` WHERE "${faza}" NOT IN ('LEAGUE') AND "${faza}" NOT LIKE 'GROUP%'` +
            ` AND "${faza}" !~ '^[A-L]$'` +
            ' GROUP BY 1 ORDER BY 1');

        if (!rows.length) { console.log('  (žiadne vyraďovacie zápasy)'); continue; }
        rows.forEach(r => console.log(
            `    ${String(r.faza).padEnd(8)}${String(r.n).padStart(3)} zápasov` +
            `   tie_id: ${r.s_tie}   leg: ${r.s_leg}`));

        // Stlpce so skore sa medzi sutazami volaju inak.
        const skore = ['home_score', 'home_goals', 'score_home']
            .find(n => ma(n)) || null;
        console.log(`  skóre v stĺpci: ${skore || '(nenájdené)'}`);
        console.log(`  všetky stĺpce: ${st.map(r => r.column_name).join(', ')}`);
        if (skore) {
            const { rows: v } = await c.query(
                `SELECT COUNT(*)::int spolu, COUNT("${skore}")::int s_vysledkom` +
                ` FROM "${schema}".games` +
                ` WHERE "${faza}" NOT IN ('LEAGUE') AND "${faza}" NOT LIKE 'GROUP%'` +
                ` AND "${faza}" !~ '^[A-L]$'`);
            console.log(`  výsledky: ${v[0].s_vysledkom} z ${v[0].spolu}`);
        }
        void cas; void idc;
    }

    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
