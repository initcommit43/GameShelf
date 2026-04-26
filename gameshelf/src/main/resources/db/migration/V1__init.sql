-- Users

CREATE TABLE users (
    id            BIGSERIAL    PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email    UNIQUE (email)
);

-- Games

CREATE TABLE games (
    id           BIGSERIAL        PRIMARY KEY,
    igdb_id      INTEGER,
    title        VARCHAR(255)     NOT NULL,
    cover_url    VARCHAR(512),
    release_year VARCHAR(4),
    igdb_rating  DOUBLE PRECISION,
    created_at   TIMESTAMP        NOT NULL,
    CONSTRAINT uq_games_igdb_id UNIQUE (igdb_id)
);

-- Game logs
-- status uses VARCHAR + CHECK rather than a PostgreSQL enum so that
-- Hibernate's ddl-auto=validate (which expects varchar for @Enumerated(STRING))
-- does not raise a type mismatch on startup.

CREATE TABLE game_logs (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id),
    game_id    BIGINT      NOT NULL REFERENCES games(id),
    status     VARCHAR(20) NOT NULL
                 CONSTRAINT chk_game_logs_status
                 CHECK (status IN ('PLAYING', 'COMPLETED', 'DROPPED', 'BACKLOG', 'WISHLIST')),
    rating     INTEGER,
    created_at TIMESTAMP   NOT NULL
);

CREATE INDEX idx_game_logs_user_id ON game_logs(user_id);
CREATE INDEX idx_game_logs_status  ON game_logs(status);

-- Reviews

CREATE TABLE reviews (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT    NOT NULL REFERENCES users(id),
    game_id     BIGINT    NOT NULL REFERENCES games(id),
    rating      INTEGER   NOT NULL,
    review_text TEXT,
    spoiler     BOOLEAN   NOT NULL,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP,
    CONSTRAINT uq_reviews_user_game UNIQUE (user_id, game_id)
);

CREATE INDEX idx_reviews_game_id     ON reviews(game_id);
CREATE INDEX idx_reviews_user_id     ON reviews(user_id);
CREATE INDEX idx_reviews_game_rating ON reviews(game_id, rating);

-- Blocked tokens (JWT logout blocklist)
-- token is TEXT because JWT strings exceed 255 chars.
-- The UNIQUE constraint on token also serves as the lookup index.

CREATE TABLE blocked_tokens (
    id         BIGSERIAL   PRIMARY KEY,
    token      TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_blocked_token UNIQUE (token)
);

CREATE INDEX idx_blocked_token_expires_at ON blocked_tokens(expires_at);

-- News articles

CREATE TABLE news_articles (
    id           BIGSERIAL     PRIMARY KEY,
    title        VARCHAR(512)  NOT NULL,
    source       VARCHAR(100)  NOT NULL,
    url          VARCHAR(1024) NOT NULL,
    description  TEXT,
    image_url    VARCHAR(1024),
    published_at TIMESTAMPTZ   NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_news_url UNIQUE (url)
);

CREATE INDEX idx_news_published_at ON news_articles(published_at);
