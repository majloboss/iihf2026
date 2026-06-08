-- Migration 031: fifa2026.games_pdf — referenčná master kópia rozpisu zápasov
-- Analógia k iihf2026.games_pdf. Skopíruje AKTUÁLNY stav fifa2026.games
-- (vrátane chronologického prečíslovania z 030 a manuálne doplnených flashscore_url).
-- Slúži ako zdroj pre obnovu rozpisu / spustenie súťaže.

CREATE TABLE IF NOT EXISTS fifa2026.games_pdf (
    game_id        INT PRIMARY KEY,
    game_type_code VARCHAR(10)  NOT NULL,
    game_type_name VARCHAR(50)  NOT NULL,
    home_team_id   INT,
    away_team_id   INT,
    start_time     TIMESTAMP    NOT NULL,
    venue          VARCHAR(100) NOT NULL DEFAULT '',
    flashscore_url VARCHAR(255)
);

INSERT INTO fifa2026.games_pdf
    (game_id, game_type_code, game_type_name, home_team_id, away_team_id, start_time, venue, flashscore_url)
SELECT game_id, game_type_code, game_type_name, home_team_id, away_team_id, start_time, venue, flashscore_url
FROM fifa2026.games
ON CONFLICT (game_id) DO NOTHING;

INSERT INTO admin.schema_versions (version, description)
VALUES (31, 'FIFA: games_pdf master kopia rozpisu')
ON CONFLICT (version) DO NOTHING;
