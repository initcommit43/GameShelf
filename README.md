> ### ⚠️ Discontinued — superseded by Nexus Media Tracker
>
> **GameShelf is no longer in development.** It was my bootcamp capstone project,
> and it's kept public and unchanged as a record of that work.
>
> The concept lives on in **[Nexus Media Tracker](https://github.com/initcommit43/NexusMediaTracker)**,
> a general media tracker covering games, films, series, and books rather than
> games alone. Everything here is being rebuilt there properly — that's the
> project to look at for current work.

---

# 🎮 GameShelf

> Log, rate, and archive your games.

GameShelf is a full-stack game collection tracker and discovery platform. Search the IGDB catalog, log games to your shelf, rate and review them, get personalized recommendations, and track live prices, all in a single app.

![GameShelf hero](docs/hero.png)

---

## 🧠 Why I Built It

I track everything: movies, shows, books, and games. With games spread across Steam, GOG, Xbox, and various other launchers, I wanted one place to log and rate it all without juggling five different apps.

Tools like this already exist, but I kept bouncing off them. The UIs feel overloaded: dense stat panels, cluttered navigation, and a first-time experience that dumps you in without much direction. I wanted something that stays out of your way, clean enough that logging a game takes a few clicks and no tutorial.

---

## 🆚 What Makes It Different

Most trackers are built around the catalog first, the user second. GameShelf flips that:

- **Clean onboarding** — register, search a game, add it to your shelf. That's the whole flow. No configuration required.
- **Live store prices** — compare current prices across Steam, GOG, Humble, GreenManGaming and more directly on the game page, so you know whether to buy now or wait.
- **Recommendations from your shelf** — suggestions are based on what you've actually logged, not global trending lists.

---

## 📦 Technologies

**Frontend**
- React 19 + React Router DOM 7
- Vite
- No state library (hooks + localStorage)

**Backend**
- Java 17, Spring Boot
- Spring Security + JWT authentication
- PostgreSQL + Flyway migrations
- Maven

**External APIs**
- IGDB via Twitch OAuth (game data)
- Steam Store + CheapShark (live per-store pricing), GG.deals (optional market summary)
- RSS feeds (gaming news aggregation)

---

## ✨ Features

- **Shelf tracking** — log games as Playing, Completed, Backlog, Wishlist, or Dropped
- **Rate & review** — 1-10 ratings, written reviews, and a spoiler flag
- **Search & browse** — full IGDB catalog search, or filter by genre, platform, year, and rating
- **Recommendations** — personalized picks based on your shelf history
- **Gaming news** — RSS-aggregated articles, filterable by source
- **Live pricing** — store-by-store price comparison on every game detail page, sorted cheapest first
- **Rate limiting** — 10 req/min per IP on auth routes via Bucket4j

<table><tr><td><img src="docs/shelf.png" alt="Shelf view"></td><td><img src="docs/browse.png" alt="Browse view"></td></tr></table>

---

## 🚦 Running the Project

### Prerequisites

- [Java 17+](https://adoptium.net/)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 14+](https://www.postgresql.org/)
- An [IGDB API key](https://api-docs.igdb.com/#getting-started) (free via Twitch Developer)

### 1. Clone the repo

```bash
git clone https://github.com/initcommit43/gameshelf.git
cd gameshelf
```

### 2. Create the database

```bash
createdb gameshelf
```

### 3. Configure the backend

```bash
cd gameshelf
cp local.properties.example local.properties
```

Open `local.properties` and fill in your values:

```properties
JWT_SECRET=           # min 32 characters, generate with: openssl rand -hex 32
IGDB_CLIENT_ID=       # from dev.twitch.tv
IGDB_CLIENT_SECRET=   # from dev.twitch.tv
GGDEALS_API_KEY=      # optional, adds the market-summary rows only; per-store prices need no key
```

### 4. Start the backend

```bash
# macOS / Linux
./mvnw spring-boot:run

# Windows
mvnw.cmd spring-boot:run
```

Flyway runs all database migrations automatically on startup. The API will be available at `http://localhost:8080`.

### 5. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Getting IGDB Credentials

1. Go to [dev.twitch.tv](https://dev.twitch.tv) and register a new application
2. Set the OAuth redirect URL to `http://localhost`
3. Copy your **Client ID** and **Client Secret** into `local.properties`

GameShelf handles the Twitch token exchange automatically. You only need the two credential values.

---

## 🏗️ How It Works

A few decisions worth noting:

- **JWT revocation via DB blocklist** — on logout the token is stored in `blocked_tokens` until it naturally expires. Real logout without sessions.
- **Flyway + `ddl-auto=validate`** — every schema change is an explicit versioned SQL file. No silent drift.
- **In-memory price cache (6h)** — avoids hammering the Steam, CheapShark and GG.deals APIs without needing Redis. Responses missing a provider are cached for 10min instead, so an outage clears quickly rather than sticking for 6h.
- **No frontend state library** — hooks + localStorage is sufficient at this scale. Redux would have been overhead without payoff.

---

## 📄 License

Copyright (c) 2026 initcommit43

GameShelf is licensed under the [GNU Affero General Public License v3.0](LICENSE).

In short: you are free to use, modify, and share this code, but any modified version
you distribute **or run as a network service** must also be released under the AGPL
with its source made available to users.
