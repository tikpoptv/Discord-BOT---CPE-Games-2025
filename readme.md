# CPE GAME 2025 Registration Bot

This is a **Discord Bot** developed to assist with managing activities for **CPE GAME 2025**. The bot provides convenient tools for registration, role assignment, nickname updates, and managing ranks related to the event.

## Features

- **User Registration**: Allows participants to register their details (name, year, and role).
- **Automatic Role Assignment**: Automatically assigns roles and ranks based on user selection.
- **Nickname Management**: Updates user nicknames based on the provided details.
- **Log System**: Keeps track of all important actions and errors in a designated log channel.

## Purpose

This bot was created to streamline activities and automate processes for **CPE GAME 2025**, ensuring smooth management of participant data and role distribution. It supports:
- Efficient participant registration.
- Clear role and rank assignment for activities.
- Flexibility in choosing different versions of the bot for specific tasks.

## Multiple Versions

The bot is designed to be flexible and offers multiple versions to suit different use cases:
- `index.js`: The main version with full features including logging and registration.
- `indexnolog.js`: A version without logging.
- `indexnotjson.js`: A version without requiring a `config.json`.
- `notready.js`: A draft or testing version for future improvements.

## File Structure

- `index.js`: The primary bot script.
- `backup.js`: Backup for additional utilities or future extensions.
- `config.json`: Configuration file for roles and years.
- `.env`: Environment variables (e.g., bot token, client ID, guild ID).
- `example.env`: Example `.env` file for reference.
- `package.json`: Dependencies and scripts.

## Prerequisites

1. **Node.js** v16.6.0 or newer.
2. A `.env` file containing:
   ```env
   DISCORD_TOKEN=your-bot-token
   CLIENT_ID=your-client-id
   GUILD_ID=your-guild-id

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

