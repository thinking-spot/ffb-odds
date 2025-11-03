import httpx
from typing import Dict, List, Optional
from datetime import datetime
from ..models.league import League, Team, Player, Matchup


class YahooFantasyService:
    """
    Service for fetching Yahoo Fantasy Football data
    Uses Yahoo's public API (no OAuth required for public leagues)
    """

    BASE_URL = "https://fantasysports.yahooapis.com/fantasy/v2"

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

    async def get_league(self, league_id: str, season: int = 2024) -> Optional[League]:
        """
        Fetch league data from Yahoo
        League ID format: nfl.l.{league_key}
        """
        try:
            # Yahoo Fantasy API endpoint for public league
            # Note: This is a simplified implementation. Yahoo's actual API requires OAuth.
            # For public leagues, we'd need to use their public endpoints or scraping.
            # This is a placeholder implementation showing the structure.

            # In production, you'd either:
            # 1. Use OAuth flow for authenticated access
            # 2. Use Yahoo's public league pages (requires scraping)
            # 3. Have users manually input their league data via CSV/JSON

            # For now, returning a mock structure to show data flow
            league_data = await self._fetch_league_metadata(league_id, season)
            teams_data = await self._fetch_teams(league_id, season)
            matchups_data = await self._fetch_matchups(league_id, season)

            league = League(
                league_id=league_id,
                name=league_data.get("name", "Fantasy League"),
                platform="yahoo",
                season=season,
                current_week=league_data.get("current_week", 1),
                num_teams=league_data.get("num_teams", 12),
                scoring_type=league_data.get("scoring_type", "standard"),
                teams=teams_data
            )

            return league

        except Exception as e:
            print(f"Error fetching Yahoo league {league_id}: {str(e)}")
            return None

    async def _fetch_league_metadata(self, league_id: str, season: int) -> Dict:
        """Fetch league metadata"""
        # Placeholder - would make actual Yahoo API call
        # URL: f"{self.BASE_URL}/league/nfl.l.{league_id}"
        return {
            "name": "My Fantasy League",
            "current_week": 10,
            "num_teams": 12,
            "scoring_type": "ppr"
        }

    async def _fetch_teams(self, league_id: str, season: int) -> List[Team]:
        """Fetch all teams in league"""
        # Placeholder - would make actual Yahoo API call
        # URL: f"{self.BASE_URL}/league/nfl.l.{league_id}/teams"
        teams = []

        # Mock data for demonstration
        for i in range(1, 13):
            team = Team(
                team_id=f"{league_id}_team_{i}",
                league_id=league_id,
                name=f"Team {i}",
                manager_name=f"Manager {i}",
                wins=0,
                losses=0,
                ties=0,
                points_for=0.0,
                points_against=0.0,
                roster=[]
            )
            teams.append(team)

        return teams

    async def _fetch_matchups(self, league_id: str, season: int, week: Optional[int] = None) -> List[Matchup]:
        """Fetch matchups for a specific week"""
        # Placeholder - would make actual Yahoo API call
        # URL: f"{self.BASE_URL}/league/nfl.l.{league_id}/scoreboard;week={week}"
        matchups = []
        return matchups

    async def get_team_roster(self, team_id: str, week: int, season: int) -> List[Player]:
        """Fetch roster for a specific team and week"""
        # Placeholder - would make actual Yahoo API call
        # URL: f"{self.BASE_URL}/team/{team_id}/roster;week={week}"
        roster = []
        return roster

    async def get_player_stats(self, player_id: str, week: int, season: int) -> Dict:
        """Fetch player stats for a specific week"""
        # Placeholder - would make actual Yahoo API call
        stats = {}
        return stats


# Utility functions for Yahoo league ID parsing
def parse_yahoo_league_id(league_key: str) -> tuple[str, int]:
    """
    Parse Yahoo league key
    Format: {game_key}.l.{league_id}
    Example: 423.l.123456 (423 = NFL 2024 season)
    Returns: (league_id, season)
    """
    parts = league_key.split(".")
    if len(parts) >= 3 and parts[1] == "l":
        game_key = int(parts[0])
        league_id = parts[2]

        # Yahoo game keys map to seasons
        # 423 = 2024, 414 = 2023, etc.
        # Rough approximation: 2024 - (423 - game_key)
        season = 2024 - (423 - game_key)

        return league_id, season

    return league_key, 2024


def format_yahoo_league_key(league_id: str, season: int) -> str:
    """
    Format league key for Yahoo API
    Returns: {game_key}.l.{league_id}
    """
    # Map season to game key (approximate)
    game_key = 423 + (season - 2024)
    return f"{game_key}.l.{league_id}"
