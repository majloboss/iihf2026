import { Component } from 'react';

// Bez záchytného bodu zhodí ktorákoľvek chyba pri vykresľovaní celú aplikáciu
// na bielu obrazovku bez akejkoľvek stopy. Toto namiesto toho ukáže, čo sa stalo.
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // Nech zostane stopa v konzole aj pre nahlásenie.
        console.error('Chyba pri vykresľovaní:', error, info?.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div style={{ padding: 24, maxWidth: 640, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
                <h2 style={{ color: '#c0392b', marginTop: 0 }}>Niečo sa pokazilo</h2>
                <p style={{ color: '#555' }}>
                    Stránku sa nepodarilo zobraziť. Skús ju obnoviť — ak chyba pretrváva, pošli nám text nižšie.
                </p>
                <pre style={{
                    background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8,
                    padding: 12, fontSize: '0.78rem', overflowX: 'auto', color: '#333',
                }}>
                    {String(this.state.error?.message || this.state.error)}
                </pre>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => window.location.reload()}
                            style={{ padding: '8px 16px', cursor: 'pointer' }}>
                        Obnoviť stránku
                    </button>
                    <button onClick={() => { this.setState({ error: null }); window.location.assign('/dashboard'); }}
                            style={{ padding: '8px 16px', cursor: 'pointer' }}>
                        Späť na prehľad
                    </button>
                </div>
            </div>
        );
    }
}
