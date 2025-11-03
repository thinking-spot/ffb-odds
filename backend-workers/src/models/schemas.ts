import { z } from 'zod';

// ===== Player Schemas =====
export const PlayerSchema = z.object({
  player_id: z.string(),
  name: z.string(),
  position: z.string(),
  nfl_team: z.string(),
  yahoo_player_id: z.string().optional(),
});

export type Player = z.infer<typeof PlayerSchema>;

// ===== Team Schemas =====
export const TeamSchema = z.object({
  team_id: z.string(),
  league_id: z.string(),
  name: z.string(),
  manager_name: z.string(),
  roster: z.array(PlayerSchema).default([]),
  wins: z.number().default(0),
  losses: z.number().default(0),
  ties: z.number().default(0),
  points_for: z.number().default(0),
  points_against: z.number().default(0),
});

export type Team = z.infer<typeof TeamSchema>;

// ===== League Schemas =====
export const LeagueSchema = z.object({
  league_id: z.string(),
  name: z.string(),
  platform: z.string().default('yahoo'),
  season: z.number(),
  current_week: z.number(),
  num_teams: z.number(),
  scoring_type: z.string().default('standard'),
  teams: z.array(TeamSchema).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type League = z.infer<typeof LeagueSchema>;

// ===== Matchup Schemas =====
export const MatchupSchema = z.object({
  matchup_id: z.string(),
  league_id: z.string(),
  week: z.number(),
  season: z.number(),
  team1_id: z.string(),
  team2_id: z.string(),
  team1_score: z.number().optional(),
  team2_score: z.number().optional(),
  is_completed: z.boolean().default(false),
  game_date: z.string().optional(),
});

export type Matchup = z.infer<typeof MatchupSchema>;

// ===== Odds Schemas =====
export const PlayerOddsSchema = z.object({
  player_id: z.string(),
  player_name: z.string(),
  nfl_team: z.string(),
  position: z.string(),
  week: z.number(),
  season: z.number(),
  passing_yards_over_under: z.number().optional(),
  passing_tds_over_under: z.number().optional(),
  rushing_yards_over_under: z.number().optional(),
  rushing_tds_over_under: z.number().optional(),
  receiving_yards_over_under: z.number().optional(),
  receptions_over_under: z.number().optional(),
  receiving_tds_over_under: z.number().optional(),
  field_goals_over_under: z.number().optional(),
  extra_points_over_under: z.number().optional(),
  points_allowed_over_under: z.number().optional(),
  sacks_over_under: z.number().optional(),
  updated_at: z.string(),
});

export type PlayerOdds = z.infer<typeof PlayerOddsSchema>;

export const TeamOddsSchema = z.object({
  nfl_team: z.string(),
  opponent: z.string(),
  week: z.number(),
  season: z.number(),
  team_total_over_under: z.number().optional(),
  spread: z.number().optional(),
  moneyline: z.number().optional(),
  win_probability: z.number().optional(),
  game_time: z.string(),
  updated_at: z.string(),
});

export type TeamOdds = z.infer<typeof TeamOddsSchema>;

export const MatchupOddsSchema = z.object({
  matchup_id: z.string(),
  league_id: z.string(),
  week: z.number(),
  season: z.number(),
  team1_id: z.string(),
  team1_name: z.string(),
  team1_projected_points: z.number(),
  team1_moneyline: z.number(),
  team1_win_probability: z.number(),
  team2_id: z.string(),
  team2_name: z.string(),
  team2_projected_points: z.number(),
  team2_moneyline: z.number(),
  team2_win_probability: z.number(),
  projected_spread: z.number(),
  confidence_level: z.string().default('medium'),
  updated_at: z.string(),
});

export type MatchupOdds = z.infer<typeof MatchupOddsSchema>;

// ===== Projection Schemas =====
export const PlayerProjectionSchema = z.object({
  player_id: z.string(),
  player_name: z.string(),
  position: z.string(),
  nfl_team: z.string(),
  week: z.number(),
  season: z.number(),
  passing_yards: z.number().default(0),
  passing_tds: z.number().default(0),
  passing_interceptions: z.number().default(0),
  rushing_yards: z.number().default(0),
  rushing_tds: z.number().default(0),
  receiving_yards: z.number().default(0),
  receptions: z.number().default(0),
  receiving_tds: z.number().default(0),
  field_goals: z.number().default(0),
  extra_points: z.number().default(0),
  points_allowed: z.number().default(0),
  sacks: z.number().default(0),
  projected_points_standard: z.number().default(0),
  projected_points_ppr: z.number().default(0),
  projected_points_half_ppr: z.number().default(0),
  confidence: z.string().default('medium'),
  used_player_props: z.boolean().default(false),
  used_team_total: z.boolean().default(false),
  used_historical_share: z.boolean().default(false),
  updated_at: z.string(),
});

export type PlayerProjection = z.infer<typeof PlayerProjectionSchema>;

export const TeamProjectionSchema = z.object({
  team_id: z.string(),
  league_id: z.string(),
  week: z.number(),
  season: z.number(),
  player_projections: z.array(PlayerProjectionSchema).default([]),
  starting_qb_points: z.number().default(0),
  starting_rb_points: z.number().default(0),
  starting_wr_points: z.number().default(0),
  starting_te_points: z.number().default(0),
  starting_flex_points: z.number().default(0),
  starting_k_points: z.number().default(0),
  starting_def_points: z.number().default(0),
  total_projected_points: z.number().default(0),
  optimistic_projection: z.number().default(0),
  pessimistic_projection: z.number().default(0),
  confidence: z.string().default('medium'),
  updated_at: z.string(),
});

export type TeamProjection = z.infer<typeof TeamProjectionSchema>;

// ===== Efficiency Schemas =====
export const TeamEfficiencySchema = z.object({
  team_id: z.string(),
  league_id: z.string(),
  season: z.number(),
  week: z.number(),
  wins: z.number().default(0),
  losses: z.number().default(0),
  ties: z.number().default(0),
  win_percentage: z.number().default(0),
  points_for: z.number().default(0),
  points_against: z.number().default(0),
  points_differential: z.number().default(0),
  avg_points_for: z.number().default(0),
  avg_points_against: z.number().default(0),
  expected_wins: z.number().default(0),
  expected_losses: z.number().default(0),
  expected_win_percentage: z.number().default(0),
  luck_factor: z.number().default(0),
  efficiency_rating: z.number().default(100),
  strength_of_schedule: z.number().default(0),
  power_rank: z.number(),
  record_rank: z.number(),
  points_for_rank: z.number(),
  points_against_rank: z.number(),
  playoff_probability: z.number().default(0),
  updated_at: z.string(),
});

export type TeamEfficiency = z.infer<typeof TeamEfficiencySchema>;

// ===== Environment Bindings =====
export interface Env {
  // Database
  DB: D1Database;

  // KV Cache
  CACHE: KVNamespace;

  // Secrets
  ODDS_API_KEY: string;
  NFL_API_KEY: string;
  NFL_API_HOST: string;
  YAHOO_CLIENT_ID: string;
  YAHOO_CLIENT_SECRET: string;

  // Variables
  ENVIRONMENT: string;
  CURRENT_SEASON: string;
  DEFAULT_WEEK: string;
  FRONTEND_URL: string;
}
