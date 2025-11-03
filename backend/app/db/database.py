import aiosqlite
import os
from pathlib import Path
from typing import Optional


class Database:
    """Database connection manager for SQLite/Cloudflare D1"""

    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv("DATABASE_URL", "./app/db/ffb_odds.db")
        self.connection: Optional[aiosqlite.Connection] = None

    async def connect(self):
        """Connect to the database"""
        # Ensure directory exists
        db_path = Path(self.database_url)
        db_path.parent.mkdir(parents=True, exist_ok=True)

        self.connection = await aiosqlite.connect(self.database_url)
        self.connection.row_factory = aiosqlite.Row

        # Enable foreign keys
        await self.connection.execute("PRAGMA foreign_keys = ON")
        await self.connection.commit()

    async def disconnect(self):
        """Close database connection"""
        if self.connection:
            await self.connection.close()
            self.connection = None

    async def initialize_schema(self):
        """Initialize database schema from SQL file"""
        schema_path = Path(__file__).parent.parent.parent.parent / "database" / "schema.sql"

        with open(schema_path, "r") as f:
            schema_sql = f.read()

        await self.connection.executescript(schema_sql)
        await self.connection.commit()

    async def execute(self, query: str, parameters: tuple = ()):
        """Execute a query"""
        cursor = await self.connection.execute(query, parameters)
        await self.connection.commit()
        return cursor

    async def fetch_one(self, query: str, parameters: tuple = ()):
        """Fetch one row"""
        cursor = await self.connection.execute(query, parameters)
        return await cursor.fetchone()

    async def fetch_all(self, query: str, parameters: tuple = ()):
        """Fetch all rows"""
        cursor = await self.connection.execute(query, parameters)
        return await cursor.fetchall()


# Global database instance
db = Database()
