import discord
from discord import app_commands, ui
import asyncio
import os
import aiohttp # CRITICAL: For making async HTTP requests
from uuid import uuid4
from typing import Dict, Any

from dotenv import load_dotenv
load_dotenv()

# --- CONFIGURATION ---
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN", "YOUR_DISCORD_BOT_TOKEN") 
# The local address of your FastAPI server
FASTAPI_BASE_URL = 'http://localhost:8000'

# Global Session ID Storage (Optional, for advanced multi-user state)
# For this example, the session_id is handled by the View instance.

# --- CLIENT AND UTILITIES ---

class MovieClient(discord.Client):
    def __init__(self, *, intents: discord.Intents):
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)
        self.http_session = None # Will store the aiohttp ClientSession

    async def on_ready(self):
        # Create an aiohttp session when the bot starts
        self.http_session = aiohttp.ClientSession()
        print(f'Logged in as {self.user} (ID: {self.user.id})')
        await self.tree.sync() # Sync slash commands
        print("Commands synced.")

    async def on_disconnect(self):
        # Close the aiohttp session when the bot shuts down
        if self.http_session:
            await self.http_session.close()

# =========================================================================
# --- VIEWS (INTERACTIVE BUTTONS) ---
# =========================================================================

class ConversationalView(ui.View):
    def __init__(self, client: MovieClient, user_id: int, session_id: str, timeout=120):
        super().__init__(timeout=timeout)
        self.client = client # Access to the HTTP session
        self.user_id = user_id
        self.session_id = session_id # Unique ID for the FastAPI Agent
        self.prompt = "" # The current accumulated query string

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        """Ensures only the original user can interact."""
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("This interaction is private to you.", ephemeral=True)
            return False
        return True

    async def send_request_to_fastapi(self, user_message: str):
        """Builds the URL and makes the async GET request to the local server."""
        
        # Build the final query string for the FastAPI server
        # Example: http://localhost:8000/api/chat?message=...&session_id=...
        url = f"{FASTAPI_BASE_URL}/api/chat?message={user_message}&session_id={self.session_id}"

        try:
            # CRITICAL: Use the client's reusable aiohttp session
            async with self.client.http_session.get(url) as response:
                if response.status != 200:
                    error_text = await response.text()
                    return f"**FastAPI Error:** Server returned status {response.status}. Details: {error_text[:200]}..."
                
                data = await response.json()
                
                # FastAPI returns {"response": "...", "success": true}
                return data.get("response", "No 'response' key found in FastAPI output.")

        except aiohttp.ClientConnectorError:
            return "**Connection Error:** Could not connect to the FastAPI Agent at `localhost:8000`. Is the server running?"
        except Exception as e:
            return f"**Unknown Error:** An unexpected error occurred: {e}"

    # Button handler for a Mood choice (Example)
    @ui.button(label="Adventurous Mood", style=discord.ButtonStyle.blurple, custom_id="mood_1")
    @ui.button(label="Thoughtful Mood", style=discord.ButtonStyle.blurple, custom_id="mood_2")
    async def handle_mood_choice(self, interaction: discord.Interaction, button: ui.Button):
        await interaction.response.edit_message(content="⏳ Searching for results. This may take a moment...", view=None) 
        
        self.prompt = f"{button.label} movie"
        
        # Call the Agent using the choice
        agent_response_text = await self.send_request_to_fastapi(self.prompt)
        
        # Send the final response
        await interaction.edit_original_response(content=agent_response_text)
        self.stop() # End the interaction

# =========================================================================
# --- COMMAND LOGIC ---
# =========================================================================

# Ensure the client instance is created so the CommandTree can be defined
client = MovieClient(intents=intents)

@app_commands.default_permissions(administrator=True) 
@client.tree.command(name="choose_movie", description="Start a private, guided movie recommendation session.")
async def choose_movie_command(interaction: discord.Interaction):
    
    # 1. Defer the response to prevent timeout, showing "Bot is thinking..."
    await interaction.response.defer(thinking=True, ephemeral=True) 
    
    # 2. Generate a unique session ID for this conversation
    session_id = str(uuid4())
    
    # 3. Create the custom view tied to this user and session
    view = ConversationalView(client, interaction.user.id, session_id)
    
    # 4. Send the first message with the interactive view
    await interaction.followup.send(
        f"👋 **Hello {interaction.user.display_name}!** Let's find your movie. What is your **mood** right now? (Choose one or describe your request)",
        view=view,
        ephemeral=True
    )


if __name__ == "__main__":
    # Ensure your DISCORD_TOKEN is set in your environment or replace the placeholder
    client.run(DISCORD_TOKEN)