CREATE TABLE IF NOT EXISTS iihf2026.group_standings (
    phase       VARCHAR(2)   NOT NULL,
    team        VARCHAR(3)   NOT NULL,
    rank        INT          NOT NULL DEFAULT 0,
    gp          INT          NOT NULL DEFAULT 0,
    w           INT          NOT NULL DEFAULT 0,
    d           INT          NOT NULL DEFAULT 0,
    l           INT          NOT NULL DEFAULT 0,
    gf          INT          NOT NULL DEFAULT 0,
    ga          INT          NOT NULL DEFAULT 0,
    pts         INT          NOT NULL DEFAULT 0,
    finalized   BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (phase, team)
);
