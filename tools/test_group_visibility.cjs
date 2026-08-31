#!/usr/bin/env node
// Overi viditelnost skupin rovnakym dopytom, aky pouziva v1/groups.php.
// Bezi v transakcii, ktora sa na konci vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Rovnaka podmienka ako v groups.php.
const VIDITELNOST = `(fg.visibility = 'public'
                      OR fg.created_by = $1
                      OR EXISTS (SELECT 1 FROM group_members gmv
                                  WHERE gmv.group_id = fg.id AND gmv.user_id = $1))`;

const vidi = async (c, uid) => {
    const { rows } = await c.query(
        `SELECT fg.id FROM friend_groups fg WHERE ${VIDITELNOST}`, [uid]);
    return new Set(rows.map(r => r.id));
};

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');
    try {
        // Migracia 068 sa este nespustila a ALTER TABLE na admin.friend_groups
        // vyzaduje vlastnika. Logika sa preto overi na docasnych kopiach —
        // dopyt je rovnaky, len nad inymi tabulkami.
        await c.query(`CREATE TEMP TABLE friend_groups AS
            SELECT id, name, created_by, competition_id,
                   'public'::varchar(10) AS visibility
              FROM admin.friend_groups WITH NO DATA`);
        await c.query(`CREATE TEMP TABLE group_members AS
            SELECT group_id, user_id, status FROM admin.group_members WITH NO DATA`);

        // Traja pouzivatelia: zakladatel, pozvany a cudzi.
        const { rows: users } = await c.query(
            'SELECT id FROM admin.users WHERE is_active ORDER BY id LIMIT 3');
        check(users.length === 3, 'na test su k dispozicii traja pouzivatelia');
        const [zakladatel, pozvany, cudzi] = users.map(u => u.id);

        const cid = (await c.query(
            "SELECT id FROM admin.competitions WHERE slug='ucl2026'")).rows[0].id;

        // --- Verejna skupina (A) ---
        const a = (await c.query(
            `INSERT INTO friend_groups (id, name, created_by, competition_id, visibility)
             VALUES (901, 'TEST verejna', $1, $2, 'public') RETURNING id`, [zakladatel, cid])).rows[0].id;

        // --- Skryta skupina (B) s jednym pozvanym ---
        const b = (await c.query(
            `INSERT INTO friend_groups (id, name, created_by, competition_id, visibility)
             VALUES (902, 'TEST skryta', $1, $2, 'invite') RETURNING id`, [zakladatel, cid])).rows[0].id;
        await c.query(`INSERT INTO group_members (group_id, user_id, status) VALUES ($1, $2, 'invited')`, [b, pozvany]);

        const vidiCudzi = await vidi(c, cudzi);
        check(vidiCudzi.has(a), 'cudzi vidi verejnu skupinu');
        check(!vidiCudzi.has(b), 'CUDZI NEVIDI SKRYTU SKUPINU (jadro riesenia)');

        const vidiPozvany = await vidi(c, pozvany);
        check(vidiPozvany.has(b), 'pozvany vidi skrytu skupinu');

        const vidiZakladatel = await vidi(c, zakladatel);
        check(vidiZakladatel.has(b), 'zakladatel vidi svoju skrytu skupinu');

        // --- Prepnutie verejnej na skrytu: clenovia musia zostat ---
        await c.query(`INSERT INTO group_members (group_id, user_id, status) VALUES ($1, $2, 'accepted')`, [a, pozvany]);
        await c.query(`INSERT INTO group_members (group_id, user_id, status) VALUES ($1, $2, 'pending')`, [a, cudzi]);

        await c.query(`UPDATE friend_groups SET visibility='invite' WHERE id=$1`, [a]);

        const poPrepnuti = await vidi(c, pozvany);
        check(poPrepnuti.has(a), 'PRIJATY CLEN VIDI SKUPINU AJ PO PREPNUTI NA SKRYTU');

        const cudziPoPrepnuti = await vidi(c, cudzi);
        check(cudziPoPrepnuti.has(a), 'kto caka na schvalenie, skupinu vidi dalej');

        // Nikto iny uz nie.
        const { rows: iny } = await c.query(
            `SELECT id FROM admin.users WHERE is_active AND id NOT IN ($1,$2,$3) LIMIT 1`,
            [zakladatel, pozvany, cudzi]);
        if (iny.length) {
            const vidiIny = await vidi(c, iny[0].id);
            check(!vidiIny.has(a), 'nezucastneny uz prepnutu skupinu nevidi');
        }

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
