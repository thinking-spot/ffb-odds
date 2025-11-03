import { Player, PlayerProjection, TeamProjection, PlayerOdds, TeamOdds, Team } from '../models/schemas';
import { NFLAPIService } from './nflApi';

type ScoringType = 'standard' | 'ppr' | 'half_ppr';

export class ProjectionEngine {
  private nflApi: NFLAPIService;

  private SCORING = {
    standard: {
      pass_yd: 0.04,
      pass_td: 4,
      pass_int: -2,
      rush_yd: 0.1,
      rush_td: 6,
      rec: 0,
      rec_yd: 0.1,
      rec_td: 6,
      fg: 3,
      xp: 1,
    },
    ppr: {
      pass_yd: 0.04,
      pass_td: 4,
      pass_int: -2,
      rush_yd: 0.1,
      rush_td: 6,
      rec: 1,
      rec_yd: 0.1,
      rec_td: 6,
      fg: 3,
      xp: 1,
    },
    half_ppr: {
      pass_yd: 0.04,
      pass_td: 4,
      pass_int: -2,
      rush_yd: 0.1,
      rush_td: 6,
      rec: 0.5,
      rec_yd: 0.1,
      rec_td: 6,
      fg: 3,
      xp: 1,
    },
  };

  constructor(nflApi: NFLAPIService) {
    this.nflApi = nflApi;
  }

  async projectPlayer(
    player: Player,
    week: number,
    season: number,
    playerOdds?: PlayerOdds,
    teamOdds?: TeamOdds
  ): Promise<PlayerProjection> {
    let projection: PlayerProjection = {
      player_id: player.player_id,
      player_name: player.name,
      position: player.position,
      nfl_team: player.nfl_team,
      week,
      season,
      passing_yards: 0,
      passing_tds: 0,
      passing_interceptions: 0,
      rushing_yards: 0,
      rushing_tds: 0,
      receiving_yards: 0,
      receptions: 0,
      receiving_tds: 0,
      field_goals: 0,
      extra_points: 0,
      points_allowed: 0,
      sacks: 0,
      projected_points_standard: 0,
      projected_points_ppr: 0,
      projected_points_half_ppr: 0,
      confidence: 'medium',
      used_player_props: false,
      used_team_total: false,
      used_historical_share: false,
      updated_at: new Date().toISOString(),
    };

    // Method 1: Player props
    if (playerOdds) {
      projection = this.projectFromPlayerProps(projection, playerOdds);
      projection.used_player_props = true;
    }

    // Method 2: Team totals + historical share
    if (teamOdds) {
      const teamProjection = await this.projectFromTeamTotal(player, teamOdds, week, season);
      if (projection.used_player_props) {
        projection = this.blendProjections(projection, teamProjection);
      } else {
        projection = teamProjection;
      }
      projection.used_team_total = true;
      projection.used_historical_share = true;
    }

    // Calculate fantasy points
    projection = this.calculateFantasyPoints(projection);

    // Determine confidence
    projection.confidence = this.determineConfidence(projection);

    return projection;
  }

  private projectFromPlayerProps(projection: PlayerProjection, playerOdds: PlayerOdds): PlayerProjection {
    if (playerOdds.passing_yards_over_under) projection.passing_yards = playerOdds.passing_yards_over_under;
    if (playerOdds.passing_tds_over_under) projection.passing_tds = playerOdds.passing_tds_over_under;
    if (playerOdds.rushing_yards_over_under) projection.rushing_yards = playerOdds.rushing_yards_over_under;
    if (playerOdds.rushing_tds_over_under) projection.rushing_tds = playerOdds.rushing_tds_over_under;
    if (playerOdds.receiving_yards_over_under) projection.receiving_yards = playerOdds.receiving_yards_over_under;
    if (playerOdds.receptions_over_under) projection.receptions = playerOdds.receptions_over_under;
    if (playerOdds.receiving_tds_over_under) projection.receiving_tds = playerOdds.receiving_tds_over_under;
    if (playerOdds.field_goals_over_under) projection.field_goals = playerOdds.field_goals_over_under;
    if (playerOdds.extra_points_over_under) projection.extra_points = playerOdds.extra_points_over_under;
    if (playerOdds.sacks_over_under) projection.sacks = playerOdds.sacks_over_under;

    return projection;
  }

  private async projectFromTeamTotal(
    player: Player,
    teamOdds: TeamOdds,
    week: number,
    season: number
  ): Promise<PlayerProjection> {
    const projection: PlayerProjection = {
      player_id: player.player_id,
      player_name: player.name,
      position: player.position,
      nfl_team: player.nfl_team,
      week,
      season,
      passing_yards: 0,
      passing_tds: 0,
      passing_interceptions: 0,
      rushing_yards: 0,
      rushing_tds: 0,
      receiving_yards: 0,
      receptions: 0,
      receiving_tds: 0,
      field_goals: 0,
      extra_points: 0,
      points_allowed: 0,
      sacks: 0,
      projected_points_standard: 0,
      projected_points_ppr: 0,
      projected_points_half_ppr: 0,
      confidence: 'medium',
      used_player_props: false,
      used_team_total: false,
      used_historical_share: false,
      updated_at: new Date().toISOString(),
    };

    if (!teamOdds.team_total_over_under) return projection;

    const teamTotal = teamOdds.team_total_over_under;
    const playerShare = await this.nflApi.getPlayerTargetShare(player.player_id, season);

    const position = player.position;

    if (position === 'QB') {
      const yardsPerPoint = 250 / 24;
      projection.passing_yards = teamTotal * yardsPerPoint * playerShare;
      projection.passing_tds = (teamTotal / 7) * playerShare;
      projection.passing_interceptions = projection.passing_tds * 0.4;
    } else if (position === 'RB') {
      const rushingShare = playerShare * 0.7;
      const receivingShare = playerShare * 0.3;
      projection.rushing_yards = teamTotal * 4 * rushingShare;
      projection.rushing_tds = (teamTotal / 10) * rushingShare;
      projection.receiving_yards = teamTotal * 2 * receivingShare;
      projection.receptions = projection.receiving_yards / 8;
      projection.receiving_tds = (teamTotal / 15) * receivingShare;
    } else if (position === 'WR' || position === 'TE') {
      projection.receiving_yards = teamTotal * 5 * playerShare;
      projection.receptions = projection.receiving_yards / 10;
      projection.receiving_tds = (teamTotal / 12) * playerShare;
    } else if (position === 'K') {
      projection.extra_points = teamTotal / 7;
      projection.field_goals = 1.5;
    } else if (position === 'DEF') {
      const opponentTotal = 24 - teamTotal;
      projection.points_allowed = opponentTotal;
      projection.sacks = 2.5;
    }

    return projection;
  }

  private blendProjections(props: PlayerProjection, team: PlayerProjection): PlayerProjection {
    const weightProps = 0.7;
    const weightTeam = 0.3;

    const blended = { ...props };

    blended.passing_yards = props.passing_yards * weightProps + team.passing_yards * weightTeam;
    blended.passing_tds = props.passing_tds * weightProps + team.passing_tds * weightTeam;
    blended.rushing_yards = props.rushing_yards * weightProps + team.rushing_yards * weightTeam;
    blended.rushing_tds = props.rushing_tds * weightProps + team.rushing_tds * weightTeam;
    blended.receiving_yards = props.receiving_yards * weightProps + team.receiving_yards * weightTeam;
    blended.receptions = props.receptions * weightProps + team.receptions * weightTeam;
    blended.receiving_tds = props.receiving_tds * weightProps + team.receiving_tds * weightTeam;

    return blended;
  }

  private calculateFantasyPoints(projection: PlayerProjection): PlayerProjection {
    for (const scoringType of ['standard', 'ppr', 'half_ppr'] as ScoringType[]) {
      const scoring = this.SCORING[scoringType];
      let points = 0;

      points += projection.passing_yards * scoring.pass_yd;
      points += projection.passing_tds * scoring.pass_td;
      points += projection.passing_interceptions * scoring.pass_int;
      points += projection.rushing_yards * scoring.rush_yd;
      points += projection.rushing_tds * scoring.rush_td;
      points += projection.receptions * scoring.rec;
      points += projection.receiving_yards * scoring.rec_yd;
      points += projection.receiving_tds * scoring.rec_td;
      points += projection.field_goals * scoring.fg;
      points += projection.extra_points * scoring.xp;

      if (projection.position === 'DEF') {
        if (projection.points_allowed < 7) points += 10;
        else if (projection.points_allowed < 14) points += 7;
        else if (projection.points_allowed < 21) points += 4;
        else if (projection.points_allowed < 28) points += 1;

        points += projection.sacks * 1;
      }

      if (scoringType === 'standard') projection.projected_points_standard = points;
      else if (scoringType === 'ppr') projection.projected_points_ppr = points;
      else if (scoringType === 'half_ppr') projection.projected_points_half_ppr = points;
    }

    return projection;
  }

  private determineConfidence(projection: PlayerProjection): string {
    if (projection.used_player_props && projection.used_team_total) return 'high';
    if (projection.used_player_props || projection.used_team_total) return 'medium';
    return 'low';
  }

  async projectTeam(
    team: Team,
    week: number,
    season: number,
    playerProjections: PlayerProjection[],
    scoringType: ScoringType = 'standard'
  ): Promise<TeamProjection> {
    const teamProjection: TeamProjection = {
      team_id: team.team_id,
      league_id: team.league_id,
      week,
      season,
      player_projections: playerProjections,
      starting_qb_points: 0,
      starting_rb_points: 0,
      starting_wr_points: 0,
      starting_te_points: 0,
      starting_flex_points: 0,
      starting_k_points: 0,
      starting_def_points: 0,
      total_projected_points: 0,
      optimistic_projection: 0,
      pessimistic_projection: 0,
      confidence: 'medium',
      updated_at: new Date().toISOString(),
    };

    const scoringField = `projected_points_${scoringType}` as keyof PlayerProjection;

    for (const playerProj of playerProjections) {
      const points = playerProj[scoringField] as number;

      if (playerProj.position === 'QB') teamProjection.starting_qb_points += points;
      else if (playerProj.position === 'RB') teamProjection.starting_rb_points += points;
      else if (playerProj.position === 'WR') teamProjection.starting_wr_points += points;
      else if (playerProj.position === 'TE') teamProjection.starting_te_points += points;
      else if (playerProj.position === 'K') teamProjection.starting_k_points += points;
      else if (playerProj.position === 'DEF') teamProjection.starting_def_points += points;
    }

    teamProjection.total_projected_points =
      teamProjection.starting_qb_points +
      teamProjection.starting_rb_points +
      teamProjection.starting_wr_points +
      teamProjection.starting_te_points +
      teamProjection.starting_flex_points +
      teamProjection.starting_k_points +
      teamProjection.starting_def_points;

    const variance = teamProjection.total_projected_points * 0.15;
    teamProjection.optimistic_projection = teamProjection.total_projected_points + variance;
    teamProjection.pessimistic_projection = teamProjection.total_projected_points - variance;

    const confidences = playerProjections.map((p) => p.confidence);
    if (confidences.every((c) => c === 'high')) teamProjection.confidence = 'high';
    else if (confidences.every((c) => c === 'low')) teamProjection.confidence = 'low';
    else teamProjection.confidence = 'medium';

    return teamProjection;
  }
}
