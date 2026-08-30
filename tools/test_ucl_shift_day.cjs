#!/usr/bin/env node
// Overi logiku presunu hracieho dna rovnakymi dopytmi, ake pouziva
// endpoint ucl_shift_day. Bezi v transakcii, ktora sa na konci vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
const MIESTNY = `(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bratislava')`;

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Rovnaky vypocet offsetu ako v PHP: leto +2, zima +1.
const poslednaNedela = (rok, mesiac) => {
    const d = new Date(Date.UTC(rok, mesiac, 0));           // posledny den mesiaca
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.toISOString().slice(0, 10);
};
const offset = datum => {
    const rok = Number(datum.slice(0, 4));
    return (datum >= poslednaNedela(rok, 3) && datum < poslednaNedela(rok, 10)) ? 2 : 1;
};

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');
    try {
        // --- Zoznam hracich dni ---
        const { rows: dni } = await c.query(`
            SELECT ${MIESTNY}::date AS den, COUNT(*) AS zapasov
              FROM ${S}.games GROUP BY 1 ORDER BY 1`);
        check(dni.length > 0, `najdenych ${dni.length} hracich dni`);

        const spolu = dni.reduce((s, d) => s + Number(d.zapasov), 0);
        check(spolu === 189, `dni pokryvaju vsetkych ${spolu} zapasov`);

        // --- Presun dna ---
        // Berie sa prvy den, ktory ma aspon dva zapasy, aby sa dali overit rozostupy.
        const { rows: kandidat } = await c.query(`
            SELECT to_char(${MIESTNY}, 'YYYY-MM-DD') AS den, COUNT(*) AS n
              FROM ${S}.games GROUP BY 1 HAVING COUNT(*) > 1 ORDER BY 1 LIMIT 1`);
        check(kandidat.length === 1, `na test sa pouzije den ${kandidat[0]?.den} (${kandidat[0]?.n} zapasov)`);
        const den = kandidat[0].den;
        const novyDen = '2026-08-31';
        const cas = '14:00';
        const krok = 15;

        const { rows: pred } = await c.query(`
            SELECT game_id FROM ${S}.games
             WHERE ${MIESTNY}::date = $1 ORDER BY start_time, game_id`, [den]);
        check(pred.length > 0, `den ${den} ma ${pred.length} zapasov`);

        const off = offset(novyDen);
        check(off === 2, `pre ${novyDen} plati letny cas (+${off}h)`);

        // start_time je naive UTC, takze miestny cas minus offset.
        const zaciatokUtc = new Date(`${novyDen}T${cas}:00Z`);
        zaciatokUtc.setUTCHours(zaciatokUtc.getUTCHours() - off);

        for (let i = 0; i < pred.length; i++) {
            const t = new Date(zaciatokUtc.getTime() + i * krok * 60000);
            await c.query(`UPDATE ${S}.games SET start_time = $1 WHERE game_id = $2`,
                [t.toISOString().slice(0, 19).replace('T', ' '), pred[i].game_id]);
        }

        // --- Kontrola vysledku ---
        const { rows: po } = await c.query(`
            SELECT game_id,
                   to_char(${MIESTNY}, 'YYYY-MM-DD HH24:MI') AS miestny
              FROM ${S}.games WHERE game_id = ANY($1) ORDER BY start_time, game_id`,
            [pred.map(g => g.game_id)]);

        check(po.length === pred.length, `presunutych ${po.length} zapasov`);

        // Poradie zapasov sa nesmie zmenit.
        const rovnake = po.every((g, i) => g.game_id === pred[i].game_id);
        check(rovnake, 'poradie zapasov zostalo zachovane');

        const naMinuty = s => {
            const [h, m] = s.slice(11).split(':').map(Number);
            return h * 60 + m;
        };
        const prvyCas = po[0].miestny.slice(11);
        check(prvyCas === cas, `prvy zapas zacina o ${prvyCas} (cakam ${cas})`);

        // Kazdy dalsi presne o krok neskor.
        let zleRozostupy = 0;
        for (let i = 1; i < po.length; i++) {
            if (naMinuty(po[i].miestny) - naMinuty(po[i - 1].miestny) !== krok) zleRozostupy++;
        }
        check(zleRozostupy === 0, `rozostupy su presne ${krok} minut`);

        const poslednyCas = po[po.length - 1].miestny.slice(11);
        const ocakavany = (() => {
            const min = 14 * 60 + (po.length - 1) * krok;
            return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
        })();
        check(poslednyCas === ocakavany, `posledny zapas o ${poslednyCas} (cakam ${ocakavany})`);

        // Vsetky zapasy musia byt v novom dni.
        const { rows: kontrolaDna } = await c.query(`
            SELECT COUNT(*) AS n FROM ${S}.games
             WHERE game_id = ANY($1) AND ${MIESTNY}::date <> $2`,
            [pred.map(g => g.game_id), novyDen]);
        check(Number(kontrolaDna[0].n) === 0, `vsetky zapasy su v dni ${novyDen}`);

        // Povodny den uz nesmie mat zapasy.
        const { rows: staryDen } = await c.query(`
            SELECT COUNT(*) AS n FROM ${S}.games WHERE ${MIESTNY}::date = $1`, [den]);
        check(Number(staryDen[0].n) === 0, `povodny den ${den} je prazdny`);

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
