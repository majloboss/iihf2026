#!/usr/bin/env node
// Porovna skutocnu strukturu produkcnej a vyvojovej databazy.
//
// Evidencia v schema_versions je na produkcii nespolahliva (cast migracii
// bezala pod nazvami run_0XX), preto sa porovnava, co v DB naozaj je.
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const load = rel => {
    const conf = fs.readFileSync(path.join(__dirname, rel), 'utf8');
    const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];
    return { host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
             user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false } };
};

const SQL = `
    SELECT table_schema || '.' || table_name || '.' || column_name AS k
      FROM information_schema.columns
     WHERE table_schema IN ('admin', 'lm2026-27', 'fifa2026', 'iihf2026')
     ORDER BY 1`;

(async () => {
    const prod = new Client(load('../../betclub/api/config/db.php'));
    const dev  = new Client(load('../api/config/db.php'));
    await prod.connect(); await dev.connect();

    const p = new Set((await prod.query(SQL)).rows.map(r => r.k));
    const d = new Set((await dev.query(SQL)).rows.map(r => r.k));

    const chyba = [...d].filter(k => !p.has(k));
    const navyse = [...p].filter(k => !d.has(k));

    // Zoskupene po tabulkach, aby sa dal prehlad precitat.
    const podlaTab = arr => {
        const m = new Map();
        arr.forEach(k => {
            const t = k.split('.').slice(0, 2).join('.');
            if (!m.has(t)) m.set(t, []);
            m.get(t).push(k.split('.')[2]);
        });
        return m;
    };

    const schemyProd = new Set([...p].map(k => k.split('.')[0]));
    console.log('schemy na produkcii:', [...schemyProd].join(', ') || '(ziadne)');

    console.log('\n=== CHYBA na produkcii (' + chyba.length + ' stlpcov) ===');
    for (const [t, cols] of podlaTab(chyba)) {
        const celaTabulka = ![...p].some(k => k.startsWith(t + '.'));
        console.log('  ' + t + (celaTabulka ? '  << CELA TABULKA CHYBA'
                                            : '  -> ' + cols.join(', ')));
    }

    console.log('\n=== navyse na produkcii (' + navyse.length + ') ===');
    for (const [t, cols] of podlaTab(navyse)) console.log('  ' + t + ' -> ' + cols.join(', '));

    await prod.end(); await dev.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
