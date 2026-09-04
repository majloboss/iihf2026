<?php
// Overi, ze wp_load_vapid() vrati kluce aj pri opakovanom volani.
//
// `require` vrati obsah suboru iba prvykrat; potom uz len TRUE. Notifikacne
// skripty sa nacitavaju za sebou do rovnakeho behu, takze druhy a dalsi by
// dostali TRUE namiesto pola a push by ticho vypadol — mail by prisiel,
// notifikacia nie.
//
// Skript nic nemeni ani neposiela.

require_once __DIR__ . '/../api/helpers/webpush.php';

$zlyhalo = 0;
function kontrola(bool $ok, string $popis): void {
    global $zlyhalo;
    echo ($ok ? 'OK    ' : 'CHYBA ') . $popis . PHP_EOL;
    if (!$ok) $zlyhalo = 1;
}

$prve = wp_load_vapid();

if ($prve === false) {
    echo 'Konfiguracia vapid.php tu nie je (lokalne prostredie) — ';
    echo 'kontroluje sa aspon, ze opakovane volanie vrati to iste.' . PHP_EOL;
    kontrola(wp_load_vapid() === false, 'opakovane volanie vrati rovnako false');
} else {
    kontrola(is_array($prve), 'prve volanie vrati pole s klucmi');
    for ($i = 2; $i <= 5; $i++) {
        $dalsie = wp_load_vapid();
        kontrola(is_array($dalsie), "$i. volanie vrati pole, nie TRUE");
        kontrola($dalsie === $prve, "$i. volanie vrati tie iste kluce");
    }
    kontrola(isset($prve['subject'], $prve['public_key'], $prve['private_key_pem']),
             'pole obsahuje subject, public_key aj private_key_pem');
}

echo PHP_EOL . ($zlyhalo ? 'NIEKTORE KONTROLY ZLYHALI' : 'Vsetky kontroly presli') . PHP_EOL;
exit($zlyhalo);
