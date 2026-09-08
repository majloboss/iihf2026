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
        db()->prepare(
            'INSERT INTO admin.cron_heartbeat (skript, posledny, vysledok, behov_dnes, den)
             VALUES (?, (NOW() AT TIME ZONE 'UTC'), ?, 1, CURRENT_DATE)
             ON CONFLICT (skript) DO UPDATE
                SET posledny   = (NOW() AT TIME ZONE 'UTC'),
                    vysledok   = EXCLUDED.vysledok,
                    -- Pocitadlo sa cez polnoc zacina odznova, aby sa dalo
                    -- povedat "dnes zabehol N-krat" bez pocitania historie.
                    behov_dnes = CASE WHEN admin.cron_heartbeat.den = CURRENT_DATE
                                      THEN admin.cron_heartbeat.behov_dnes + 1 ELSE 1 END,
                    den        = CURRENT_DATE')
          ->execute([$skript, mb_substr($vysledok, 0, 200)]);
    } catch (Throwable $e) {
        // Zlyhanie zapisu nesmie zhodit samotny cron — je to len stopa.
    }
}
