import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getCompetitions, setActiveCompetition } from '../api/competitions';

const CompetitionContext = createContext(null);

const SPORT_EMOJI = { hockey: '🏒', football: '⚽' };

export function CompetitionProvider({ children }) {
    const [competitions, setCompetitions]       = useState([]);
    const [activeCompetition, setActive]        = useState(null);
    const [loading, setLoading]                 = useState(true);

    // Zoznam sutazi drzany aj v ref, aby ho switchCompetition videl vzdy
    // aktualny. Bez toho by callback pracoval so zoznamom z renderu, v ktorom
    // vznikol.
    const competitionsRef = useRef([]);
    competitionsRef.current = competitions;

    useEffect(() => {
        getCompetitions()
            .then(data => {
                setCompetitions(data);
                setActive(data.find(c => c.is_selected) ?? data[0] ?? null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const switchCompetition = useCallback(async (id) => {
        await setActiveCompetition(id);

        // Sutaz sa hlada cez competitionsRef, teda v prave platnom zozname.
        // Povodne sa hladalo v zozname zachytenom pri vytvoreni callbacku;
        // ked sa sutaz nenasla, nastavil sa null a routing spadol na
        // predvolenu vetvu — pouzivatel tak videl hokej namiesto UCL.
        //
        // Porovnava sa cez Number(): id z <select> chodi ako retazec.
        const cislo = Number(id);

        setCompetitions(prev => prev
            .map(c => ({ ...c, is_selected: Number(c.id) === cislo }))
            .sort((a, b) => b.is_selected - a.is_selected));

        // setActive dostane vlastny updater, aby sa nemuselo siahat na
        // zastaraly zoznam. Ked sutaz nie je znama, aktivna zostava tak, ako
        // bola — nikdy sa nenastavi null.
        setActive(prev => {
            const zoznam = competitionsRef.current;
            const najdena = zoznam.find(c => Number(c.id) === cislo);
            return najdena ? { ...najdena, is_selected: true } : prev;
        });
    }, []);

    const competitionEmoji = activeCompetition
        ? (SPORT_EMOJI[activeCompetition.sport] ?? '🏆')
        : '🏆';

    return (
        <CompetitionContext.Provider value={{ competitions, activeCompetition, switchCompetition, loading, competitionEmoji }}>
            {children}
        </CompetitionContext.Provider>
    );
}

export const useCompetition = () => useContext(CompetitionContext);
