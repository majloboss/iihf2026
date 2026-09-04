#!/usr/bin/env node
// Overi, ze filter kol v Skupinach najde body.
//
// Filter posiela skratku z ciselnika (R32, QF…), endpoint podla nej vybera
// zapasy cez phase_id. Predtym sa porovnaval nazov fazy s `game_type_name`
// v zapase — po prechode na ciselnik sa nazvy nezhodovali a vsetky kola
// okrem ALL ukazovali nuly.
//
// Skript iba cita. Prepinac --prod cita produkciu namiesto DEV.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const prod = process.argv.includes('--prod');
const conf = fs.readFileSync(path.join(__dirname,
    prod ? '../../betclub/api/config/db.php' : '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')}\n`);

    for (const [slug, schema, kluc, body] of [
        ['iihf2026', 'iihf2026', 'g.id', 'points'],
        ['fifa2026', 'fifa2026', 'g.game_id', 'points_earned'],
        ['ucl2026', '"lm2026-27"', 'g.game_id', 'points_earned'],
    ]) {
        // Skratky, ktore filter ponuka.
        const { rows: kody } = await c.query(
            'SELECT DISTINCT ph.match_stat_code kod, ph.sort_order' +
            ` FROM ${schema}.games g` +
            ' JOIN admin.competition_phases ph ON ph.id = g.phase_id' +
            ` JOIN ${schema}.tips t ON ${kluc} = t.game_id AND t.${body} IS NOT NULL` +
            ' ORDER BY ph.sort_order');

        // Pre kazdu skratku: kolko bodov najde rovnaky dopyt ako standings.php.
        const prazdne = [];
        let celkom = 0;
        for (const k of kody) {
            const { rows } = await c.query(
                `SELECT COALESCE(SUM(t.${body}), 0)::int b FROM ${schema}.tips t` +
                ` WHERE t.${body} IS NOT NULL AND EXISTS (` +
                `   SELECT 1 FROM ${schema}.games g` +
                '   JOIN admin.competition_phases ph ON ph.id = g.phase_id' +
                `   WHERE ${kluc} = t.game_id AND ph.match_stat_code = $1)`, [k.kod]);
            celkom += rows[0].b;
            if (rows[0].b === 0) prazdne.push(k.kod);
        }

        console.log(`${slug.padEnd(10)}${kody.length} kôl, spolu ${celkom} bodov`);

        // Sutaz bez odohranych zapasov nema co filtrovat — nie je to chyba.
        if (!kody.length) {
            console.log(`      (žiadny vyhodnotený tip — súťaž sa ešte nehrá)`);
            continue;
        }
        check(celkom > 0, `${slug}: filter podľa kola nájde body`);
        check(prazdne.length === 0,
              `${slug}: žiadne kolo nie je prázdne` +
              (prazdne.length ? ` — ${prazdne.join(', ')}` : ''));
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
