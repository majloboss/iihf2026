import UclClub, { UclVenue } from './UclClub';
import UclTieSummary from './UclTieSummary';

// Karta zápasu: termín vľavo, dvojica v strede, akcia vpravo.
//
// Tri zóny, lebo termín ani tlačidlo nesmú byť súčasťou strednej mriežky —
// uberali by jej šírku a stred dvojice by sa posunul. Stredná mriežka má päť
// stĺpcov s rovnako širokými krajmi, takže `vs`, dvojbodka medzi tipmi aj
// štadión stoja presne nad sebou.
//
// `termin` je obsah ľavého pásu (v prehľade dátum a fáza, v zozname zápasov
// zoskupenom po dňoch stačí čas), `stred` je to medzi klubmi (vs, skóre,
// odznak LIVE), `akcia` je tlačidlo vpravo a `children` sú políčka tipu —
// tie sa umiestňujú do stĺpcov 2 až 4.
export default function UclZapas({ g, termin, stred, akcia, children, size = 24 }) {
    return (
        <div className="uclZapas" style={{ display: 'flex', alignItems: 'stretch' }}>
            <div className="uclZapasTermin"
                 style={{ flexShrink: 0, alignSelf: 'center',
                          fontSize: '0.78rem', color: '#666', lineHeight: 1.35 }}>
                {termin}
            </div>

            {/* Štyri stĺpce: domáci, stred, hostia, akcia. Kluby si delia voľné
                miesto rovným dielom, takže `vs` zostáva medzi nimi a tlačidlo
                stojí hneď za tipom — prázdny pás vľavo by len ukrajoval šírku. */}
            <div className="uclZapasMriezka"
                 style={{ flex: 1, minWidth: 0, display: 'grid',
                          gridTemplateColumns: 'var(--ucl-klub) auto var(--ucl-klub) var(--ucl-akcia)',
                          alignItems: 'stretch', columnGap: 8, rowGap: 6 }}>
                <span style={{ gridColumn: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <UclClub name={g.home_name} logo={g.home_logo} country={g.home_country}
                             countryCode={g.home_country_code} flag={g.home_flag} align="right" size={size} />
                </span>
                <span style={{ gridColumn: 2, alignSelf: 'center', textAlign: 'center' }}>{stred}</span>
                <span style={{ gridColumn: 3 }}>
                    <UclClub name={g.away_name} logo={g.away_logo} country={g.away_country}
                             countryCode={g.away_country_code} flag={g.away_flag} size={size} />
                </span>

                {/* Pri odvete rozhoduje súčet za dvojicu. */}
                <div style={{ gridColumn: '1 / 4' }}>
                    <UclTieSummary game={g} small />
                </div>

                {children}

                {/* Tlačidlo hneď za políčkom hostí, zvisle na jeho úrovni. */}
                {akcia && (
                    <span style={{ gridColumn: 4, alignSelf: 'center', justifySelf: 'start' }}>
                        {akcia}
                    </span>
                )}

                <div style={{ gridColumn: '1 / 4' }}>
                    <UclVenue game={g} />
                </div>
            </div>
        </div>
    );
}
