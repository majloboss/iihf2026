// Prehľad dvojice pri odvete: výsledok prvého zápasu a priebežný súčet.
//
// Bez toho nie je pri odvete vidieť, čo sa vlastne hrá — o postupe rozhoduje
// súčet gólov z oboch zápasov, nie výsledok jedného.
//
// Góly prvého zápasu prichádzajú už prehodené (`first_leg_home` patrí domácemu
// tímu odvety), takže sa dajú rovno spočítať s aktuálnym skóre.

export default function UclTieSummary({ game, small = false }) {
    // Týka sa iba odviet, ktoré poznajú výsledok prvého zápasu.
    if (Number(game.leg) !== 2) return null;
    if (game.first_leg_home === null || game.first_leg_home === undefined) return null;

    const prvyH = Number(game.first_leg_home);
    const prvyA = Number(game.first_leg_away);

    // Do súčtu ide zadaný výsledok, a kým nie je, priebežné skóre z livescore.
    const terazH = game.home_score_regular ?? game.ls_home;
    const terazA = game.away_score_regular ?? game.ls_away;
    const maSucet = terazH !== null && terazH !== undefined
                 && terazA !== null && terazA !== undefined;

    const sucetH = maSucet ? prvyH + Number(terazH) : null;
    const sucetA = maSucet ? prvyA + Number(terazA) : null;

    // Predĺženie v odvete rozhodne dvojicu bez ohľadu na súčet.
    const maPredlzenie = game.home_score_final !== null && game.home_score_final !== undefined
                      && game.away_score_final !== null && game.away_score_final !== undefined;

    const stav = !maSucet ? null
        : maPredlzenie
            ? (game.home_score_final > game.away_score_final ? 'domáci' : 'hostia')
            : sucetH > sucetA ? 'domáci'
            : sucetH < sucetA ? 'hostia'
            : 'remíza';

    return (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 10, flexWrap: 'wrap',
                      fontSize: small ? '0.72rem' : '0.78rem', color: '#666',
                      background: '#f8f9fa', borderRadius: 6, padding: '4px 8px' }}>
            <span>
                1. zápas <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{prvyH}:{prvyA}</strong>
            </span>
            {maSucet && (
                <span>
                    súčet <strong style={{ fontVariantNumeric: 'tabular-nums', color: '#1a3a6b' }}>
                        {sucetH}:{sucetA}
                    </strong>
                </span>
            )}
            {stav === 'remíza' && !maPredlzenie && (
                <span style={{ color: '#dc3545' }}>rozhodne predĺženie</span>
            )}
            {stav && stav !== 'remíza' && (
                <span style={{ color: '#1a7f37' }}>
                    postupujú {stav}
                    {maPredlzenie && ' po predĺžení'}
                </span>
            )}
        </div>
    );
}
