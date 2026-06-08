import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCompetitions, setActiveCompetition } from '../api/competitions';

const CompetitionContext = createContext(null);

const SPORT_EMOJI = { hockey: '🏒', football: '⚽' };

export function CompetitionProvider({ children }) {
    const [competitions, setCompetitions]       = useState([]);
    const [activeCompetition, setActive]        = useState(null);
    const [loading, setLoading]                 = useState(true);

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
        setCompetitions(prev => {
            const updated = prev.map(c => ({ ...c, is_selected: c.id === id }));
            return updated.sort((a, b) => b.is_selected - a.is_selected);
        });
        setActive(competitions.find(c => c.id === id) ?? null);
    }, [competitions]);

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
