<?php
// Stopa po behu cron skriptu.
//
// Ked skript nema co robit, skonci ticho a nikde nezostane zaznam. Nedalo sa
// tak odlisit "hosting cron vobec nevola" od "cron bezi, len nie je co robit"
// — prave na tom livescore cely vecer stroskotalo.
//
// Jeden riadok na skript, prepisuje sa. Historia netreba, staci posledny beh.

function cron_beh(string $skript, string $vysledok = ''): void {
    try {
        // Cas ide ako parameter, nie cez NOW() v dotaze: stlpec je 'timestamp
        // without time zone' a server bezi na CEST, takze NOW() by ulozil
        // miestny cas, kym zvysok aplikacie v takych stlpcoch drzi UTC.
        // Zapis cez parameter navyse nepotrebuje v dotaze ziadne apostrofy.
        $teraz = gmdate('Y-m-d H:i:s');

        db()->prepare(
            'INSERT INTO admin.cron_heartbeat (skript, posledny, vysledok, behov_dnes, den)
             VALUES (?, ?, ?, 1, CURRENT_DATE)
             ON CONFLICT (skript) DO UPDATE
                SET posledny   = EXCLUDED.posledny,
                    vysledok   = EXCLUDED.vysledok,
                    -- Pocitadlo sa cez polnoc zacina odznova, aby sa dalo
                    -- povedat "dnes zabehol N-krat" bez pocitania historie.
                    behov_dnes = CASE WHEN admin.cron_heartbeat.den = CURRENT_DATE
                                      THEN admin.cron_heartbeat.behov_dnes + 1 ELSE 1 END,
                    den        = CURRENT_DATE')
          ->execute([$skript, $teraz, mb_substr($vysledok, 0, 200)]);
    } catch (Throwable $e) {
        // Zlyhanie zapisu nesmie zhodit samotny cron — je to len stopa.
    }
}
