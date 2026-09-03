#!/usr/bin/env node
// Overi, ze dvojice v pavuku stoja v poradi stromu: postupujuci z dvojice
// musi stat vedla zapasu, do ktoreho ide.
//
// Poradie zapasov v DB struktru stromu nenesie — v FIFA berie R16[1] vitazov
// z R32 #1 a #4. Preto sa vazba hlada podla timov a strom sa sklada od finale
// dozadu, rovnako ako v bracket.php.
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

const SUTAZE = {
    iihf2026: { schema: 'iihf2026', faza: 'phase', id: 'id',
                dom: 'team1', hos: 'team2', hs: 'score1', ag: 'score2',
                hf: 'final1', af: 'final2', fazy: ['QF', 'SF', 'GOLD'] },
    fifa2026: { schema: 'fifa2026', faza: 'game_type_code', id: 'game_id',
                dom: 'home_team_id', hos: 'away_team_id',
                hs: 'home_score_regular', ag: 'away_score_regular',
                hf: 'home_score_final', af: 'away_score_final',
                fazy: ['R32', 'R16', 'QF', 'SF', 'F'] },
};

const vitaz = r => r.hs === null ? null
    : (r.hf ?? r.hs) > (r.af ?? r.ag) ? r.dom
    : (r.hf ?? r.hs) < (r.af ?? r.ag) ? r.hos : null;
const timy = r => [r.dom, r.hos].filter(x => x !== null);

// Rovnaka logika ako $preusporiadaj v bracket.php.
const preusporiadaj = fazy => {
    for (let i = fazy.length - 1; i > 0; i--) {
        const zostava = [...fazy[i - 1].ties];
        const nove = [];
        for (const t of fazy[i].ties) {
            for (const tim of timy(t)) {
                const k = zostava.findIndex(x => timy(x).includes(tim));
                if (k !== -1) { nove.push(zostava[k]); zostava.splice(k, 1); }
            }
        }
        nove.push(...zostava);
        if (nove.length === fazy[i - 1].ties.length) fazy[i - 1].ties = nove;
    }
    return fazy;
};

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')}\n`);

    for (const [slug, S] of Object.entries(SUTAZE)) {
        const { rows } = await c.query(
            `SELECT ${S.id} AS id, ${S.faza} AS faza, ${S.dom} AS dom, ${S.hos} AS hos,` +
            ` ${S.hs} AS hs, ${S.ag} AS ag, ${S.hf} AS hf, ${S.af} AS af` +
            ` FROM "${S.schema}".games WHERE ${S.faza} = ANY($1) ORDER BY ${S.id}`, [S.fazy]);

        let fazy = S.fazy.map(f => ({ phase: f, ties: rows.filter(r => r.faza === f) }));
        fazy = fazy.filter(f => f.ties.length);
        fazy = preusporiadaj(fazy);

        console.log(`=== ${slug} ===`);

        // Kazdy postupujuci musi stat v riadku, ktory vedie do jeho dalsieho
        // zapasu: dvojice 2k-1 a 2k skorsej fazy krmia dvojicu k neskorsej.
        let chyb = 0;
        for (let i = 1; i < fazy.length; i++) {
            const pred = fazy[i - 1].ties;
            const po = fazy[i].ties;
            if (pred.length !== po.length * 2) continue;   // bronz a pod.
            po.forEach((z, k) => {
                const ocakavane = [pred[2 * k], pred[2 * k + 1]].map(vitaz).filter(x => x !== null);
                const skutocne = timy(z);
                const sedi = ocakavane.every(t => skutocne.includes(t));
                if (!sedi) {
                    chyb++;
                    console.log(`      ${fazy[i].phase}[${k + 1}]: čaká ${JSON.stringify(skutocne)},` +
                                ` z riadkov nad ním postupujú ${JSON.stringify(ocakavane)}`);
                }
            });
        }
        check(chyb === 0, `${slug}: postupujúci stojí vedľa svojho ďalšieho zápasu`);
        fazy.forEach(f => console.log(`    ${f.phase.padEnd(7)}${f.ties.length} dvojíc`));
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
