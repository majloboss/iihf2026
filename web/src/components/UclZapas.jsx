import UclClub, { UclVenue } from './UclClub';
import UclTieSummary from './UclTieSummary';
import { asDate, isValidDate } from '../utils/tipWindow';

const weekdayFmt = new Intl.DateTimeFormat('sk-SK', { weekday: 'long' });
const dateFmt = new Intl.DateTimeFormat('sk-SK', {
    day: 'numeric', month: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('sk-SK', { hour: '2-digit', minute: '2-digit' });

// Karta zápasu: termín v ľavom pevnom páse, dvojica v strede, akcia vpravo.
//
// Tri zóny, lebo termín ani tlačidlo nesmú byť súčasťou strednej mriežky —
// uberali by jej šírku a stred dvojice by sa posunul. Stredná mriežka má päť
// stĺpcov s rovnako širokými krajmi, takže `vs`, dvojbodka medzi tipmi aj
// štadión stoja presne nad sebou.
//
// `stred` je to medzi klubmi (vs, skóre,
// odznak LIVE), `akcia` je tlačidlo vpravo, `children` sú políčka tipu a
// `footer` je obsah pod zápasom, napríklad rozbalené tipy skupín.
export default function UclZapas({ g, stred, akcia, children, footer, size = 24 }) {
    const start = asDate(g.start_time);
    const maTermin = isValidDate(start);

    return (
        <div className="uclGameCard">
            <div className="uclZapas">
                <div className="uclZapasTermin">
                    <span>{g.match_stat_code ?? g.navrh_kolo ?? ''}</span>
                    {maTermin && (
                        <>
                            <span>{weekdayFmt.format(start)}</span>
                            <span>{dateFmt.format(start)}</span>
                            <span>{timeFmt.format(start)}</span>
                        </>
                    )}
                </div>

                {/* Štyri stĺpce: domáci, stred, hostia, akcia. Kluby si delia voľné
                    miesto rovným dielom, takže `vs`, dvojbodka medzi tipmi aj štadión
                    stoja presne nad sebou. */}
                <div className="uclZapasMriezka"
                     style={{ flex: 1, minWidth: 0, display: 'grid',
                              gridTemplateColumns: 'var(--ucl-klub) auto var(--ucl-klub) var(--ucl-akcia)',
                              alignItems: 'stretch', columnGap: 8, rowGap: 6 }}>
                    <span style={{ gridColumn: 1, display: 'flex', width: '100%', minWidth: 0,
                                    justifyContent: 'flex-end' }}>
                        <UclClub name={g.home_name} logo={g.home_logo} country={g.home_country}
                                 countryCode={g.home_country_code} flag={g.home_flag} align="right" size={size} />
                    </span>
                    <span style={{ gridColumn: 2, alignSelf: 'center', textAlign: 'center' }}>{stred}</span>
                    <span style={{ gridColumn: 3, width: '100%', minWidth: 0 }}>
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
            {footer && <div className="uclZapasFooter">{footer}</div>}
        </div>
    );
}
