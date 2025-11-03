-- Fantasy Football Vegas Odds Database Schema
-- Compatible with SQLite / Cloudflare D1

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
    league_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT DEFAULT 'yahoo',
    season INTEGER NOT NULL,
    current_week INTEGER NOT NULL,
    num_teams INTEGER NOT NULL,
    scoring_type TEXT DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    team_id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL,
    name TEXT NOT NULL,
    manager_name TEXT NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ties INTEGER DEFAULT 0,
    points_for REAL DEFAULT 0.0,
    points_against REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES leagues(league_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    player_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    nfl_team TEXT NOT NULL,
    yahoo_player_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_nfl_team ON players(nfl_team);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);

-- Team rosters (many-to-many)
CREATE TABLE IF NOT EXISTS team_rosters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    is_starter BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    UNIQUE(team_id, player_id, week, season)
);

CREATE INDEX IF NOT EXISTS idx_rosters_team_week ON team_rosters(team_id, week, season);

-- Matchups table
CREATE TABLE IF NOT EXISTS matchups (
    matchup_id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL,
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    team1_id TEXT NOT NULL,
    team2_id TEXT NOT NULL,
    team1_score REAL,
    team2_score REAL,
    is_completed BOOLEAN DEFAULT FALSE,
    game_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES leagues(league_id) ON DELETE CASCADE,
    FOREIGN KEY (team1_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(team_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_matchups_league_week ON matchups(league_id, week, season);

-- Player odds from Vegas
CREATE TABLE IF NOT EXISTS player_odds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    passing_yards_ou REAL,
    passing_tds_ou REAL,
    rushing_yards_ou REAL,
    rushing_tds_ou REAL,
    receiving_yards_ou REAL,
    receptions_ou REAL,
    receiving_tds_ou REAL,
    field_goals_ou REAL,
    extra_points_ou REAL,
    points_allowed_ou REAL,
    sacks_ou REAL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    UNIQUE(player_id, week, season)
);

CREATE INDEX IF NOT EXISTS idx_player_odds_week ON player_odds(week, season);

-- NFL team odds from Vegas
CREATE TABLE IF NOT EXISTS team_odds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nfl_team TEXT NOT NULL,
    opponent TEXT NOT NULL,
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    team_total_ou REAL,
    spread REAL,
    moneyline INTEGER,
    win_probability REAL,
    game_time TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nfl_team, week, season)
);

CREATE INDEX IF NOT EXISTS idx_team_odds_week ON team_odds(week, season);

-- Player projections
CREATE TABLE IF NOT EXISTS player_projections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    passing_yards REAL DEFAULT 0,
    passing_tds REAL DEFAULT 0,
    passing_interceptions REAL DEFAULT 0,
    rushing_yards REAL DEFAULT 0,
    rushing_tds REAL DEFAULT 0,
    receiving_yards REAL DEFAULT 0,
    receptions REAL DEFAULT 0,
    receiving_tds REAL DEFAULT 0,
    field_goals REAL DEFAULT 0,
    extra_points REAL DEFAULT 0,
    points_allowed REAL DEFAULT 0,
    sacks REAL DEFAULT 0,
    projected_points_standard REAL DEFAULT 0,
    projected_points_ppr REAL DEFAULT 0,
    projected_points_half_ppr REAL DEFAULT 0,
    confidence TEXT DEFAULT 'medium',
    used_player_props BOOLEAN DEFAULT FALSE,
    used_team_total BOOLEAN DEFAULT FALSE,
    used_historical_share BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    UNIQUE(player_id, week, season)
);

CREATE INDEX IF NOT EXISTS idx_projections_week ON player_projections(week, season);

-- Team projections
CREATE TABLE IF NOT EXISTS team_projections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    league_id TEXT NOT NULL,
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    total_projected_points REAL DEFAULT 0,
    optimistic_projection REAL DEFAULT 0,
    pessimistic_projection REAL DEFAULT 0,
    confidence TEXT DEFAULT 'medium',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (league_id) REFERENCES leagues(league_id) ON DELETE CASCADE,
    UNIQUE(team_id, week, season)
);

CREATE INDEX IF NOT EXISTS idx_team_projections_league_week ON team_projections(league_id, week, season);

-- Matchup odds
CREATE TABLE IF NOT EXISTS matchup_odds (
    matchup_id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL,
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    team1_id TEXT NOT NULL,
    team1_projected_points REAL NOT NULL,
    team1_moneyline INTEGER NOT NULL,
    team1_win_probability REAL NOT NULL,
    team2_id TEXT NOT NULL,
    team2_projected_points REAL NOT NULL,
    team2_moneyline INTEGER NOT NULL,
    team2_win_probability REAL NOT NULL,
    projected_spread REAL NOT NULL,
    confidence_level TEXT DEFAULT 'medium',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (matchup_id) REFERENCES matchups(matchup_id) ON DELETE CASCADE,
    FOREIGN KEY (league_id) REFERENCES leagues(league_id) ON DELETE CASCADE,
    FOREIGN KEY (team1_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(team_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_matchup_odds_league_week ON matchup_odds(league_id, week, season);

-- Team efficiency metrics
CREATE TABLE IF NOT EXISTS team_efficiency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    league_id TEXT NOT NULL,
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ties INTEGER DEFAULT 0,
    win_percentage REAL DEFAULT 0,
    points_for REAL DEFAULT 0,
    points_against REAL DEFAULT 0,
    points_differential REAL DEFAULT 0,
    avg_points_for REAL DEFAULT 0,
    avg_points_against REAL DEFAULT 0,
    expected_wins REAL DEFAULT 0,
    expected_losses REAL DEFAULT 0,
    expected_win_percentage REAL DEFAULT 0,
    luck_factor REAL DEFAULT 0,
    efficiency_rating REAL DEFAULT 100,
    strength_of_schedule REAL DEFAULT 0,
    power_rank INTEGER,
    record_rank INTEGER,
    points_for_rank INTEGER,
    points_against_rank INTEGER,
    playoff_probability REAL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (league_id) REFERENCES leagues(league_id) ON DELETE CASCADE,
    UNIQUE(team_id, week, season)
);

CREATE INDEX IF NOT EXISTS idx_efficiency_league_week ON team_efficiency(league_id, week, season);

-- Update triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_leagues_timestamp
AFTER UPDATE ON leagues
BEGIN
    UPDATE leagues SET updated_at = CURRENT_TIMESTAMP WHERE league_id = NEW.league_id;
END;

CREATE TRIGGER IF NOT EXISTS update_teams_timestamp
AFTER UPDATE ON teams
BEGIN
    UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE team_id = NEW.team_id;
END;

CREATE TRIGGER IF NOT EXISTS update_matchups_timestamp
AFTER UPDATE ON matchups
BEGIN
    UPDATE matchups SET updated_at = CURRENT_TIMESTAMP WHERE matchup_id = NEW.matchup_id;
END;
