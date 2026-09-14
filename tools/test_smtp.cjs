#!/usr/bin/env node
// Overi, ci SMTP server prijme prihlasenie a mail.
//
// Odosielanie mailov bezi cez vlastnu implementaciu SMTP v
// api/helpers/mailer.php. Ked maily "nechodia", treba rozlisit tri veci:
//   1. aplikacia sa o odoslanie ani nepokusila (v mail_log nic nepribudlo)
//   2. pokusila sa a SMTP ju odmietol (v mail_log je status 'failed')
//   3. odoslala a server prijal, ale sprava nedorazila (spam, filter)
//
// Tento nastroj overuje bod 2: spojenie, prihlasenie a pripadne aj realne
// odoslanie testovacieho mailu.
//
// Pouzitie:
//   node tools/test_smtp.cjs                  len spojenie a prihlasenie
//   node tools/test_smtp.cjs adresa@tam.sk    posle aj testovaci mail
const fs = require('fs');
const path = require('path');
const tls = require('tls');

const konfig = fs.readFileSync(path.join(__dirname, '../api/config/mail.php'), 'utf8');
const val = (kluc) => {
    const m = konfig.match(new RegExp("define\\('" + kluc + "'\\s*,\\s*'([^']*)'"));
    if (m) return m[1];
    const n = konfig.match(new RegExp("define\\('" + kluc + "'\\s*,\\s*(\\d+)"));
    return n ? n[1] : null;
};

const HOST = val('MAIL_HOST');
const PORT = Number(val('MAIL_PORT') || 465);
const USER = val('MAIL_USER');
const PASS = val('MAIL_PASS');
const FROM = val('MAIL_FROM');
const KOMU = process.argv[2];

console.log('SMTP %s:%d ako %s', HOST, PORT, USER);

const socket = tls.connect({ host: HOST, port: PORT, rejectUnauthorized: false });
socket.setEncoding('utf8');

let buf = '';
let krok = 0;
let prihlaseny = false;

const sprava = [
    'From: ' + FROM,
    'To: ' + KOMU,
    'Subject: BetClub - test SMTP',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    'Testovacia sprava z tools/test_smtp.cjs. Ked ti dosla, SMTP funguje.',
    '.',
].join('\r\n');

// Postupnost prikazov. Bez adresata sa po prihlaseni rovno konci — nema
// zmysel posielat mail nikam.
const kroky = KOMU
    ? ['EHLO fellow.sk', 'AUTH LOGIN',
       Buffer.from(USER).toString('base64'),
       Buffer.from(PASS).toString('base64'),
       'MAIL FROM:<' + FROM + '>', 'RCPT TO:<' + KOMU + '>', 'DATA', sprava, 'QUIT']
    : ['EHLO fellow.sk', 'AUTH LOGIN',
       Buffer.from(USER).toString('base64'),
       Buffer.from(PASS).toString('base64'), 'QUIT'];

// Co vypisat namiesto prikazu — heslo ani telo mailu do vystupu nepatria.
const popis = (i) => {
    const k = kroky[i];
    if (i === 2) return '(pouzivatel)';
    if (i === 3) return '(heslo)';
    if (k && k.includes('Subject:')) return '(telo spravy)';
    return k;
};

socket.on('data', (d) => {
    buf += d;
    // Odpoved je uplna, ked posledny riadok ma na 4. pozicii medzeru
    // (viacriadkove odpovede maju pomlcku).
    const riadky = buf.trim().split('\n');
    const posledny = riadky[riadky.length - 1];
    if (!posledny || posledny[3] === '-') return;

    if (krok > 0) {
        console.log('  %-16s -> %s', popis(krok - 1), posledny.trim().slice(0, 62));
        if (krok === 4 && posledny.startsWith('235')) prihlaseny = true;
    }
    buf = '';

    if (krok < kroky.length) socket.write(kroky[krok++] + '\r\n');
    else socket.end();
});

socket.on('error', (e) => {
    console.log('CHYBA spojenia: %s', e.message);
    process.exit(1);
});

socket.on('close', () => {
    console.log('\nPrihlasenie: %s', prihlaseny ? 'OK' : 'ZLYHALO');
    if (!KOMU) console.log('Testovaci mail poslat: node tools/test_smtp.cjs adresa@tam.sk');
    process.exit(prihlaseny ? 0 : 1);
});

setTimeout(() => { console.log('Timeout.'); process.exit(1); }, 30000);
