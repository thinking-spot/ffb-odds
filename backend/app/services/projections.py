from typing import Dict, List, Optional
from datetime import datetime
from ..models.projections import PlayerProjection, TeamProjection
from ..models.odds import PlayerOdds, TeamOdds
from ..models.league import Player, Team
from .nfl_api import NFLAPIService


class ProjectionEngine:
    """
    Hybrid projection engine that combines:
    1. Player prop O/U lines (passing yards, TDs, etc.) → fantasy points
    2. NFL team total Vegas odds × historical player share → player points
    """

    def __init__(self, nfl_api: NFLAPIService):
        self.nfl_api = nfl_api

        # Fantasy scoring settings (points per stat)
        self.SCORING = {
            "standard": {
                "pass_yd": 0.04,  # 1 point per 25 yards
                "pass_td": 4,
                "pass_int": -2,
                "rush_yd": 0.1,  # 1 point per 10 yards
                "rush_td": 6,
                "rec": 0,  # Standard scoring
                "rec_yd": 0.1,
                "rec_td": 6,
                "fg": 3,
                "xp": 1,
            },
            "ppr": {
                "pass_yd": 0.04,
                "pass_td": 4,
                "pass_int": -2,
                "rush_yd": 0.1,
                "rush_td": 6,
                "rec": 1,  # PPR scoring
                "rec_yd": 0.1,
                "rec_td": 6,
                "fg": 3,
                "xp": 1,
            },
            "half_ppr": {
                "pass_yd": 0.04,
                "pass_td": 4,
                "pass_int": -2,
                "rush_yd": 0.1,
                "rush_td": 6,
                "rec": 0.5,  # Half PPR scoring
                "rec_yd": 0.1,
                "rec_td": 6,
                "fg": 3,
                "xp": 1,
            }
        }

    async def project_player(
        self,
        player: Player,
        week: int,
        season: int,
        player_odds: Optional[PlayerOdds] = None,
        team_odds: Optional[TeamOdds] = None
    ) -> PlayerProjection:
        """
        Generate hybrid projection for a player
        """
        projection = PlayerProjection(
            player_id=player.player_id,
            player_name=player.name,
            position=player.position,
            nfl_team=player.nfl_team,
            week=week,
            season=season,
            updated_at=datetime.utcnow()
        )

        # Method 1: Use player props if available
        if player_odds:
            projection = await self._project_from_player_props(projection, player_odds)
            projection.used_player_props = True

        # Method 2: Use team totals + historical share if available
        if team_odds:
            team_projection = await self._project_from_team_total(player, team_odds, week, season)
            # Blend with player props or use as fallback
            if projection.used_player_props:
                projection = self._blend_projections(projection, team_projection)
            else:
                projection = team_projection
            projection.used_team_total = True
            projection.used_historical_share = True

        # Calculate fantasy points for different scoring formats
        projection = self._calculate_fantasy_points(projection)

        # Determine confidence level
        projection.confidence = self._determine_confidence(projection)

        return projection

    def _project_from_player_props(
        self,
        projection: PlayerProjection,
        player_odds: PlayerOdds
    ) -> PlayerProjection:
        """Use player prop O/U lines to project stats"""

        # Passing stats
        if player_odds.passing_yards_over_under:
            projection.passing_yards = player_odds.passing_yards_over_under
        if player_odds.passing_tds_over_under:
            projection.passing_tds = player_odds.passing_tds_over_under

        # Rushing stats
        if player_odds.rushing_yards_over_under:
            projection.rushing_yards = player_odds.rushing_yards_over_under
        if player_odds.rushing_tds_over_under:
            projection.rushing_tds = player_odds.rushing_tds_over_under

        # Receiving stats
        if player_odds.receiving_yards_over_under:
            projection.receiving_yards = player_odds.receiving_yards_over_under
        if player_odds.receptions_over_under:
            projection.receptions = player_odds.receptions_over_under
        if player_odds.receiving_tds_over_under:
            projection.receiving_tds = player_odds.receiving_tds_over_under

        # Kicking stats
        if player_odds.field_goals_over_under:
            projection.field_goals = player_odds.field_goals_over_under
        if player_odds.extra_points_over_under:
            projection.extra_points = player_odds.extra_points_over_under

        # Defense stats
        if player_odds.sacks_over_under:
            projection.sacks = player_odds.sacks_over_under

        return projection

    async def _project_from_team_total(
        self,
        player: Player,
        team_odds: TeamOdds,
        week: int,
        season: int
    ) -> PlayerProjection:
        """Use NFL team total + historical player share to project stats"""

        projection = PlayerProjection(
            player_id=player.player_id,
            player_name=player.name,
            position=player.position,
            nfl_team=player.nfl_team,
            week=week,
            season=season,
            updated_at=datetime.utcnow()
        )

        if not team_odds.team_total_over_under:
            return projection

        team_total = team_odds.team_total_over_under

        # Get player's historical share of team production
        player_share = await self.nfl_api.get_player_target_share(player.player_id, season)
        if not player_share:
            player_share = self._estimate_player_share(player.position)

        # Project stats based on position and team total
        if player.position == "QB":
            # QBs typically account for 250-300 passing yards per 24 team points
            yards_per_point = 250 / 24
            projection.passing_yards = team_total * yards_per_point * player_share
            projection.passing_tds = (team_total / 7) * player_share  # ~1 TD per 7 points
            projection.passing_interceptions = projection.passing_tds * 0.4  # INT rate

        elif player.position == "RB":
            # RBs get rushing + receiving
            rushing_share = player_share * 0.7  # 70% rushing
            receiving_share = player_share * 0.3  # 30% receiving

            projection.rushing_yards = team_total * 4 * rushing_share  # ~100 rush yds per 24 pts
            projection.rushing_tds = (team_total / 10) * rushing_share
            projection.receiving_yards = team_total * 2 * receiving_share
            projection.receptions = projection.receiving_yards / 8  # ~8 yards per reception
            projection.receiving_tds = (team_total / 15) * receiving_share

        elif player.position in ["WR", "TE"]:
            # WRs/TEs are receiving-focused
            projection.receiving_yards = team_total * 5 * player_share  # ~120 rec yds per 24 pts
            projection.receptions = projection.receiving_yards / 10  # ~10 yards per reception
            projection.receiving_tds = (team_total / 12) * player_share

        elif player.position == "K":
            # Kickers score based on team scoring
            projection.extra_points = team_total / 7  # ~1 XP per TD
            projection.field_goals = 1.5  # Average ~1-2 FGs per game

        elif player.position == "DEF":
            # Defense scores inversely to opponent team total
            opponent_total = 24 - team_total  # Rough estimate
            projection.points_allowed = opponent_total
            projection.sacks = 2.5  # Average
            projection.interceptions = 1.0  # Average

        return projection

    def _estimate_player_share(self, position: str) -> float:
        """Estimate player share when historical data not available"""
        estimates = {
            "QB": 0.95,  # Starting QB gets ~95% of passing
            "RB": 0.35,  # RB1 gets ~35% of team rushing/receiving
            "WR": 0.25,  # WR1 gets ~25% of team receiving
            "TE": 0.15,  # TE1 gets ~15% of team receiving
            "K": 1.0,    # Kicker gets 100% of kicking
            "DEF": 1.0   # Team defense
        }
        return estimates.get(position, 0.2)

    def _blend_projections(
        self,
        props_projection: PlayerProjection,
        team_projection: PlayerProjection
    ) -> PlayerProjection:
        """
        Blend two projections (70% props, 30% team total)
        Props are more specific so weighted higher
        """
        weight_props = 0.7
        weight_team = 0.3

        blended = props_projection.model_copy()

        # Blend each stat
        blended.passing_yards = (
            props_projection.passing_yards * weight_props +
            team_projection.passing_yards * weight_team
        )
        blended.passing_tds = (
            props_projection.passing_tds * weight_props +
            team_projection.passing_tds * weight_team
        )
        blended.rushing_yards = (
            props_projection.rushing_yards * weight_props +
            team_projection.rushing_yards * weight_team
        )
        blended.rushing_tds = (
            props_projection.rushing_tds * weight_props +
            team_projection.rushing_tds * weight_team
        )
        blended.receiving_yards = (
            props_projection.receiving_yards * weight_props +
            team_projection.receiving_yards * weight_team
        )
        blended.receptions = (
            props_projection.receptions * weight_props +
            team_projection.receptions * weight_team
        )
        blended.receiving_tds = (
            props_projection.receiving_tds * weight_props +
            team_projection.receiving_tds * weight_team
        )

        return blended

    def _calculate_fantasy_points(self, projection: PlayerProjection) -> PlayerProjection:
        """Calculate fantasy points for all scoring formats"""

        for scoring_type in ["standard", "ppr", "half_ppr"]:
            scoring = self.SCORING[scoring_type]

            points = 0.0

            # Passing
            points += projection.passing_yards * scoring["pass_yd"]
            points += projection.passing_tds * scoring["pass_td"]
            points += projection.passing_interceptions * scoring["pass_int"]

            # Rushing
            points += projection.rushing_yards * scoring["rush_yd"]
            points += projection.rushing_tds * scoring["rush_td"]

            # Receiving
            points += projection.receptions * scoring["rec"]
            points += projection.receiving_yards * scoring["rec_yd"]
            points += projection.receiving_tds * scoring["rec_td"]

            # Kicking
            points += projection.field_goals * scoring["fg"]
            points += projection.extra_points * scoring["xp"]

            # Defense (simplified - would need more complex scoring)
            if projection.position == "DEF":
                # Points allowed scoring (varies by league)
                if projection.points_allowed < 7:
                    points += 10
                elif projection.points_allowed < 14:
                    points += 7
                elif projection.points_allowed < 21:
                    points += 4
                elif projection.points_allowed < 28:
                    points += 1
                else:
                    points += 0

                points += projection.sacks * 1
                points += projection.interceptions * 2

            # Set the projection
            if scoring_type == "standard":
                projection.projected_points_standard = points
            elif scoring_type == "ppr":
                projection.projected_points_ppr = points
            elif scoring_type == "half_ppr":
                projection.projected_points_half_ppr = points

        return projection

    def _determine_confidence(self, projection: PlayerProjection) -> str:
        """Determine confidence level based on data sources"""
        if projection.used_player_props and projection.used_team_total:
            return "high"
        elif projection.used_player_props or projection.used_team_total:
            return "medium"
        else:
            return "low"

    async def project_team(
        self,
        team: Team,
        week: int,
        season: int,
        player_projections: List[PlayerProjection],
        scoring_type: str = "standard"
    ) -> TeamProjection:
        """
        Project total fantasy points for a team based on roster projections
        """
        team_projection = TeamProjection(
            team_id=team.team_id,
            league_id=team.league_id,
            week=week,
            season=season,
            player_projections=player_projections,
            updated_at=datetime.utcnow()
        )

        # Sum up starting lineup projections based on scoring type
        scoring_field = f"projected_points_{scoring_type}"

        for player_proj in player_projections:
            points = getattr(player_proj, scoring_field, 0)

            # Add to position totals (simplified - assumes optimal lineup)
            if player_proj.position == "QB":
                team_projection.starting_qb_points += points
            elif player_proj.position == "RB":
                team_projection.starting_rb_points += points
            elif player_proj.position == "WR":
                team_projection.starting_wr_points += points
            elif player_proj.position == "TE":
                team_projection.starting_te_points += points
            elif player_proj.position == "K":
                team_projection.starting_k_points += points
            elif player_proj.position == "DEF":
                team_projection.starting_def_points += points

        # Calculate total
        team_projection.total_projected_points = (
            team_projection.starting_qb_points +
            team_projection.starting_rb_points +
            team_projection.starting_wr_points +
            team_projection.starting_te_points +
            team_projection.starting_flex_points +
            team_projection.starting_k_points +
            team_projection.starting_def_points
        )

        # Calculate projection range (±15% for optimistic/pessimistic)
        variance = team_projection.total_projected_points * 0.15
        team_projection.optimistic_projection = team_projection.total_projected_points + variance
        team_projection.pessimistic_projection = team_projection.total_projected_points - variance

        # Overall confidence
        confidences = [p.confidence for p in player_projections]
        if all(c == "high" for c in confidences):
            team_projection.confidence = "high"
        elif all(c == "low" for c in confidences):
            team_projection.confidence = "low"
        else:
            team_projection.confidence = "medium"

        return team_projection
