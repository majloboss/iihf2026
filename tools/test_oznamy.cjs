#!/usr/bin/env node
// Overi, ze zobrazenie oznamu na Prehlade a v historii su nezavisle.
//
// Ked su odskrtnute obe, oznam nie je vidiet nikde — tak sa stiahne chybne
// napisana sprava. Nic sa nemaze, takze sa da kedykolvek zapnut spat.
//
// Skript nic nemeni — pisuce casti bezia v transakcii, ktora sa vrati.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const prod = process.argv.includes('--prod');
const conf = fs.readFileSync(path.join(__dirname,
    prod ? '../../betclub/api/config/db.php' : '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

// Presne to, co vracaju endpointy.
const NA_PREHLADE = 'SELECT id FROM admin.announcements WHERE show_dashboard = TRUE';
const V_HISTORII  = 'SELECT id FROM admin.announcements WHERE is_active = TRUE';

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')}\n`);

    const { rows: st } = await c.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema='admin'" +
        " AND table_name='announcements' AND column_name='show_dashboard'");
    check(st.length > 0, 'stĺpec show_dashboard existuje (migrácia 077)');
    if (!st.length) { await c.end(); process.exit(1); }

    const { rows: p } = await c.query(NA_PREHLADE);
    const { rows: h } = await c.query(V_HISTORII);
    console.log(`  na Prehľade: ${p.map(r => '#' + r.id).join(', ') || 'žiadny'}`);
    console.log(`  v histórii:  ${h.map(r => '#' + r.id).join(', ') || 'žiadny'}\n`);

    // Historia ma zmysel len ked v nej nieco je. Ked ju cely archiv opusti,
    // je to priznak, ze `is_active` zmenilo vyznam pod rukami — presne to sa
    // stalo, ked historia zacala tento priznak respektovat.
    const { rows: pocty } = await c.query(
        'SELECT COUNT(*)::int spolu, COUNT(*) FILTER (WHERE is_active)::int historia' +
        ' FROM admin.announcements');
    check(pocty[0].spolu === 0 || pocty[0].historia > 1,
          `história nie je prázdna (${pocty[0].historia} z ${pocty[0].spolu} oznamov)`);

    await c.query('BEGIN');
    try {
        const { rows: novy } = await c.query(
            "INSERT INTO admin.announcements (body, is_active, show_dashboard)" +
            " VALUES ('skúšobný oznam', TRUE, TRUE) RETURNING id");
        const id = novy[0].id;

        const je = async (dopyt) => (await c.query(dopyt)).rows.some(r => r.id === id);

        check(await je(NA_PREHLADE) && await je(V_HISTORII),
              'obe zaškrtnuté: oznam je na Prehľade aj v histórii');

        // Len historia — napr. starsi oznam, ktory uz netreba mat hore.
        await c.query('UPDATE admin.announcements SET show_dashboard = FALSE WHERE id = $1', [id]);
        check(!await je(NA_PREHLADE) && await je(V_HISTORII),
              'len história: z Prehľadu zmizne, v histórii zostáva');

        // Len prehlad — nezvycajne, ale musi fungovat nezavisle.
        await c.query('UPDATE admin.announcements SET show_dashboard = TRUE, is_active = FALSE WHERE id = $1', [id]);
        check(await je(NA_PREHLADE) && !await je(V_HISTORII),
              'len Prehľad: v histórii nie je, na Prehľade áno');

        // Obe odskrtnute — chybna sprava zmizne uplne.
        await c.query('UPDATE admin.announcements SET show_dashboard = FALSE, is_active = FALSE WHERE id = $1', [id]);
        check(!await je(NA_PREHLADE) && !await je(V_HISTORII),
              'obe odškrtnuté: oznam nie je vidieť nikde');

        // Nic sa nemaze, takze sa da vratit spat.
        const { rows: stale } = await c.query(
            'SELECT id FROM admin.announcements WHERE id = $1', [id]);
        check(stale.length === 1, 'oznam zostáva v databáze — dá sa zapnúť späť');
    } finally {
        await c.query('ROLLBACK');
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli (zmeny vratene)');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
