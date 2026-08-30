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

// Priebežné body počas zápasu — rovnaký vzorec ako serverový prepočet
// (api/helpers/ucl_recalc_fn.php). V ligovej fáze 3 body za výsledok, v play-off 5.
export function calcLiveUclPoints(tip1, tip2, game) {
    const s1 = game.home_score_regular ?? game.ls_home;
    const s2 = game.away_score_regular ?? game.ls_away;
    if (s1 == null || s2 == null || tip1 == null || tip2 == null) return null;
    const winPts = game.game_type_code === 'LEAGUE' ? 3 : 5;
    const sign = (a, b) => (a > b ? 1 : a < b ? -1 : 0);
    return (sign(tip1, tip2) === sign(s1, s2) ? winPts : 0)
        + (tip1 === s1 ? 1 : 0)
        + (tip2 === s2 ? 1 : 0);
}

// Skóre zápasu ako text: "2 : 1", po predĺžení "2 : 1 (4:3 pp)".
// Kým výsledok nie je zadaný, berie sa priebežné skóre z livescore — inak by
// hráč počas zápasu videl iba "vs". Vráti null, keď nie je čo zobraziť.
export function uclScoreText(g) {
    const h = g.home_score_regular ?? g.ls_home;
    const a = g.away_score_regular ?? g.ls_away;
    if (h === null || h === undefined || a === null || a === undefined) return null;

    const base = `${h} : ${a}`;
    if (g.home_score_final !== null && g.home_score_final !== undefined
        && g.away_score_final !== null && g.away_score_final !== undefined) {
        return `${base} (${g.home_score_final}:${g.away_score_final} pp)`;
    }

    // Polčasové skóre poteší, kým zápas beží.
    const ht = g.home_score_halftime !== null && g.home_score_halftime !== undefined
            && g.away_score_halftime !== null && g.away_score_halftime !== undefined;
    return ht && !g.result_approved ? `${base} (${g.home_score_halftime}:${g.away_score_halftime})` : base;
}
