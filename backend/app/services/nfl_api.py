import httpx
import os
from typing import Dict, List, Optional
from datetime import datetime


class NFLAPIService:
    """
    Service for fetching NFL player data from RapidAPI
    API: https://rapidapi.com/Creativesdev/api/nfl-api-data
    """

    BASE_URL = "https://nfl-api-data.p.rapidapi.com"

    def __init__(self, api_key: Optional[str] = None, api_host: Optional[str] = None):
        self.api_key = api_key or os.getenv("NFL_API_KEY")
        self.api_host = api_host or os.getenv("NFL_API_HOST", "nfl-api-data.p.rapidapi.com")
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for RapidAPI requests"""
        return {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": self.api_host
        }

    async def get_player_info(self, player_name: str) -> Optional[Dict]:
        """Get player information by name"""
        if not self.api_key:
            print("NFL_API_KEY not configured")
            return None

        try:
            url = f"{self.BASE_URL}/nfl-player-search"
            params = {"name": player_name}
            response = await self.client.get(url, headers=self._get_headers(), params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching player info for {player_name}: {str(e)}")
            return None

    async def get_player_stats(self, player_id: str, season: int = 2024) -> Optional[Dict]:
        """Get player stats for a season"""
        if not self.api_key:
            print("NFL_API_KEY not configured")
            return None

        try:
            url = f"{self.BASE_URL}/nfl-player-stats/{player_id}"
            params = {"season": season}
            response = await self.client.get(url, headers=self._get_headers(), params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching player stats for {player_id}: {str(e)}")
            return None

    async def get_team_roster(self, team_abbr: str, season: int = 2024) -> List[Dict]:
        """Get team roster"""
        if not self.api_key:
            print("NFL_API_KEY not configured")
            return []

        try:
            url = f"{self.BASE_URL}/nfl-team-roster/{team_abbr}"
            params = {"season": season}
            response = await self.client.get(url, headers=self._get_headers(), params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching team roster for {team_abbr}: {str(e)}")
            return []

    async def get_player_target_share(self, player_id: str, season: int = 2024) -> Optional[float]:
        """
        Calculate player's historical share of team production
        Used for projecting player points from team totals
        """
        stats = await self.get_player_stats(player_id, season)
        if not stats:
            return None

        try:
            # This would calculate the player's % share of team stats
            # Example: WR's % of team receiving yards, RB's % of team rushing yards
            # This is a simplified version - would need more complex logic
            position = stats.get("position")

            if position in ["WR", "TE"]:
                # Receiving share
                player_rec_yards = stats.get("receiving_yards", 0)
                team_rec_yards = stats.get("team_receiving_yards", 1)  # Would need team totals
                return player_rec_yards / team_rec_yards if team_rec_yards > 0 else 0.0

            elif position == "RB":
                # Rushing + receiving share
                player_rush_yards = stats.get("rushing_yards", 0)
                player_rec_yards = stats.get("receiving_yards", 0)
                team_rush_yards = stats.get("team_rushing_yards", 1)
                return (player_rush_yards + player_rec_yards) / team_rush_yards if team_rush_yards > 0 else 0.0

            elif position == "QB":
                # Passing share (typically close to 1.0 for starter)
                return stats.get("games_started", 0) / stats.get("team_games", 17)

            return 0.0

        except Exception as e:
            print(f"Error calculating target share: {str(e)}")
            return 0.0

    async def get_week_schedule(self, week: int, season: int = 2024) -> List[Dict]:
        """Get games scheduled for a specific week"""
        if not self.api_key:
            print("NFL_API_KEY not configured")
            return []

        try:
            url = f"{self.BASE_URL}/nfl-schedule"
            params = {"week": week, "season": season}
            response = await self.client.get(url, headers=self._get_headers(), params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching week {week} schedule: {str(e)}")
            return []


# NFL team abbreviations mapping
NFL_TEAMS = {
    "ARI": "Arizona Cardinals",
    "ATL": "Atlanta Falcons",
    "BAL": "Baltimore Ravens",
    "BUF": "Buffalo Bills",
    "CAR": "Carolina Panthers",
    "CHI": "Chicago Bears",
    "CIN": "Cincinnati Bengals",
    "CLE": "Cleveland Browns",
    "DAL": "Dallas Cowboys",
    "DEN": "Denver Broncos",
    "DET": "Detroit Lions",
    "GB": "Green Bay Packers",
    "HOU": "Houston Texans",
    "IND": "Indianapolis Colts",
    "JAX": "Jacksonville Jaguars",
    "KC": "Kansas City Chiefs",
    "LAC": "Los Angeles Chargers",
    "LAR": "Los Angeles Rams",
    "LV": "Las Vegas Raiders",
    "MIA": "Miami Dolphins",
    "MIN": "Minnesota Vikings",
    "NE": "New England Patriots",
    "NO": "New Orleans Saints",
    "NYG": "New York Giants",
    "NYJ": "New York Jets",
    "PHI": "Philadelphia Eagles",
    "PIT": "Pittsburgh Steelers",
    "SEA": "Seattle Seahawks",
    "SF": "San Francisco 49ers",
    "TB": "Tampa Bay Buccaneers",
    "TEN": "Tennessee Titans",
    "WAS": "Washington Commanders",
}
