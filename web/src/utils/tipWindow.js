// Jednotné pravidlá tipovacieho okna pre všetky súťaže.
// Server (v1/*/tips.php) uzatvára tipovanie 5 minút pred začiatkom — rozhranie
// musí počítať rovnako, inak ponúkne políčka na zápas, ktorý sa už uložiť nedá.

export const TIP_LOCK_MS = 5 * 60 * 1000;

// start_time chodí z API ako naive UTC ("2026-09-08 21:00:00").
export const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
export const isValidDate = d => d instanceof Date && !Number.isNaN(d.getTime());

// Tipovať sa dá len zápas so známymi tímami, otvoreným tipovaním a pred uzáverom.
export function canTip(game, now = Date.now()) {
    if (!game?.tips_open) return false;
    if (!game.home_team_id || !game.away_team_id) return false;
    const start = asDate(game.start_time);
    if (!isValidDate(start)) return false;
    return start.getTime() - now > TIP_LOCK_MS;
}

// Zápas, ktorý sa dá tipovať a hráč ho ešte netipoval.
export const isUntipped = (game, now = Date.now()) =>
    canTip(game, now) && game.home_score_tip == null;
