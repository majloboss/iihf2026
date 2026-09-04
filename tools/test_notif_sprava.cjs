#!/usr/bin/env node
// Overi, ze upozornenie na spravu od organizatora odchadza z jedineho miesta.
//
// Pocas testovania prisli styri maily na jednu spravu: posielal ich cron
// aj helper notify_user_new_message. Cron sa zrusil, zostal helper — odpoved
// ma prist obratom, nie s odstupom az piatich minut.
//
// Skript iba cita zdrojove subory.
const fs = require('fs');
const path = require('path');

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

const api = path.join(__dirname, '../api');
const subory = [];
(function zbier(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) zbier(p);
        else if (f.name.endsWith('.php')) subory.push(p);
    }
})(api);

// Ziadny cron uz spravy neposiela.
check(!fs.existsSync(path.join(api, 'cron/send_notifications_message.php')),
      'duplicitny cron je odstraneny');
check(!fs.readFileSync(path.join(api, 'cron/run.php'), 'utf8').includes('send_notifications_message'),
      'run.php ho uz nespusta');

// Upozornenie posiela jedine notify_user_new_message.
const posielajuce = subory.filter(p => {
    const t = fs.readFileSync(p, 'utf8');
    return /admin_message|nová správa od admina/i.test(t)
        && /send_mail|send_push_to_user/.test(t);
}).map(p => path.relative(api, p));
console.log('  posiela:', posielajuce.join(', ') || '(nikto)');
check(posielajuce.length === 1, 'upozornenie posiela prave jedno miesto');

// Push potrebuje pole z wp_load_vapid, nie konstanty.
const helper = fs.readFileSync(path.join(api, 'helpers/notify_user_message.php'), 'utf8');
check(helper.includes('wp_load_vapid()'), 'push berie kluce z wp_load_vapid()');
const bezKomentarov = helper.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
check(!/defined\('VAPID_PUBLIC'\)|VAPID_PUBLIC(?!\s)/.test(bezKomentarov),
      'nepouziva neexistujuce konstanty VAPID_PUBLIC/PRIVATE');
check(!/' – BetClub'/.test(helper), 'predmet nema pripojene " – BetClub"');

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
process.exit(fail ? 1 : 0);
