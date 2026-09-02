// Klub v karte zápasu: logo, názov a pod ním štát s vlajkou.
//
// Rovnaké zobrazenie používa prehľad, zoznam zápasov aj admin — preto žije
// mimo obrazoviek. Predtým existovalo v troch kópiách, ktoré sa rozchádzali.

function ClubText({ name, country, countryCode, flag, right }) {
    return (
        // Dve pásma nad sebou: názov sa centruje vo svojom (nech má jeden či tri
        // riadky), štát stojí v spodnom. Pásma majú v rámci karty rovnakú výšku,
        // takže štáty oboch klubov vyjdú do jednej roviny a text je zároveň
        // vycentrovaný voči logu.
        <span style={{ display: 'grid', gridTemplateRows: '1fr auto', minWidth: 0,
                       height: '100%',
                       justifyItems: right ? 'end' : 'start' }}>
            <span style={{ display: 'flex', alignItems: 'center',
                           fontWeight: 500, lineHeight: 1.2, fontSize: '0.7em',
                           minWidth: 0, overflowWrap: 'anywhere',
                           textAlign: right ? 'right' : 'left' }}>{name}</span>
            {(country || countryCode) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4,
                               fontSize: '0.72rem', color: '#888', lineHeight: 1.3 }}>
                    {flag && <img src={`/flags/${flag}`} alt=""
                                  style={{ width: 14, height: 10, objectFit: 'cover', flexShrink: 0 }}
                                  onError={e => { e.currentTarget.style.display = 'none'; }} />}
                    <span>{country || countryCode}</span>
                </span>
            )}
        </span>
    );
}

/**
 * @param align  'right' pre domáceho — názov je vľavo od loga, aby dvojica
 *               smerovala k skóre uprostred.
 * @param size   veľkosť loga v px (prehľad má menšie karty ako zápasy)
 */
export default function UclClub({ name, logo, country, countryCode, flag, align, size = 28 }) {
    if (!name) return <span style={{ color: '#999', fontSize: '0.85rem' }}>zatiaľ neurčený</span>;
    const right = align === 'right';
    return (
        // minWidth: 0 drží klub v šírke stĺpca — bez neho by dlhý názov stĺpec
        // roztiahol a stred mriežky by sa posunul.
        <span style={{ display: 'flex', alignItems: 'stretch', gap: 5, height: '100%',
                       minWidth: 0,
                       justifyContent: right ? 'flex-end' : 'flex-start' }}>
            {right && <ClubText name={name} country={country} countryCode={countryCode} flag={flag} right />}
            {logo
                ? <img src={`/logos/ucl2026/${logo}`} alt=""
                       style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0,
                                alignSelf: 'center' }}
                       onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                : <span style={{ width: size, flexShrink: 0 }} />}
            {!right && <ClubText name={name} country={country} countryCode={countryCode} flag={flag} />}
        </span>
    );
}

/** Štadión a odkaz na FlashScore — spoločný riadok pod dvojicou. */
export function UclVenue({ game, order }) {
    if (!game.venue && !game.flashscore_url) return null;
    return (
        // Vlastný riadok v strede karty — vedľa tipu bral šírku a na mobile
        // sa oboje nezmestilo.
        <div style={{ width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6,
                      fontSize: '0.75rem', color: '#999',
                      ...(order ? { order } : {}) }}>
            {game.venue && (
                <span>
                    {game.venue}
                    {/* Klub nemusí hrať doma na svojom štadióne. */}
                    {game.home_club_venue && game.venue !== game.home_club_venue && (
                        <span style={{ color: '#c0392b' }}> (iný štadión)</span>
                    )}
                </span>
            )}
            {game.flashscore_url && (
                <a href={game.flashscore_url} target="_blank" rel="noopener noreferrer"
                   title="Sledovať na FlashScore" style={{ display: 'flex', alignItems: 'center' }}>
                    <img src="/flashscore.png" alt="FlashScore" style={{ width: 18, height: 18 }} />
                </a>
            )}
        </div>
    );
}
