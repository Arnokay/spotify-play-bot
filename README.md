# Spotify Play Bot
## Getting started:

### ENV variables needed:
- ``SPOTIFY_CLIENT_ID`` - Spotify client id.
- ``SPOTIFY_CLIENT_SECRET`` - Spotify client secret.
- ``TELEGRAM_BOT_TOKEN`` - Telegram bot Token.
- ``DEV_SERVER_PATH`` - Path to localhost with port.
- ``PROD_SERVER_PATH`` - Path to prod.
- ``TELEGRAM_BOT_PATH`` - Link to bot.
- ``PORT`` - Port for http server.
#### For proper work of spotify, you need specify callback url in spotify dashboard.
#### Example:
#### ```http://localhost:8888/callback```
### Then run command in root project directory:
```
npm install
npm run dev 
```
#### Then go to bot and write ``/login``.
#### Go to link that you received, authorize using spotify.
#### Congratulations!  Now you can control your music from telegram bot.

## Commands:

- ### ``/login``
- ### For playing a song just send link to song to bot.
- ### ``/volume 0-100``
- ### ``/next``
- ### ``/prev``
- ### ``/play``
- ### ``/pause``
