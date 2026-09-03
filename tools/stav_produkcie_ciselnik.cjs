#!/usr/bin/env node
// Zisti, co z ciselnika faz v produkcii uz existuje a ktore migracie chybaju.
//
// Cita produkcnu konfiguraciu z worktree betclub\. Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../../betclub/api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')} @ ${val('DB_HOST')}\n`);

    const { rows: t } = await c.query(`
        SELECT to_regclass('admin.competition_phases') IS NOT NULL AS je`);
    console.log(`tabuľka admin.competition_phases: ${t[0].je ? 'existuje' : 'NEEXISTUJE'}`);

    if (t[0].je) {
        const { rows: s } = await c.query(`
            SELECT column_name FROM information_schema.columns
             WHERE table_schema='admin' AND table_name='competition_phases'
             ORDER BY ordinal_position`);
        console.log(`  stĺpce: ${s.map(r => r.column_name).join(', ')}`);
        const { rows: n } = await c.query(`
            SELECT k.slug, COUNT(*)::int n FROM admin.competition_phases p
              JOIN admin.competitions k ON k.id = p.competition_id GROUP BY 1 ORDER BY 1`);
        console.log(n.length ? '  obsah:' : '  obsah: prázdny');
        n.forEach(r => console.log(`    ${r.slug.padEnd(12)}${r.n}`));
    }

    const { rows: v } = await c.query(
        'SELECT version, description FROM admin.schema_versions WHERE version >= 70 ORDER BY version');
    console.log('\nspustené migrácie od 70:');
    v.forEach(r => console.log(`  ${r.version}  ${r.description}`));
    const su = new Set(v.map(r => r.version));
    const chybaju = [72, 73, 74, 76].filter(x => !su.has(x));
    console.log(`\nchýba spustiť: ${chybaju.length ? chybaju.join(', ') : 'nič'}`);

    const { rows: k } = await c.query('SELECT id, slug FROM admin.competitions ORDER BY id');
    console.log('\nsúťaže v produkcii:');
    k.forEach(r => console.log(`  ${String(r.id).padStart(3)}  ${r.slug}`));

    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
