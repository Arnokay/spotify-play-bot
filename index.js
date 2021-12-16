require("dotenv").config();
const querystring = require("querystring");
const express = require("express");
const axios = require("axios");

const bot = require("./bot.js");
const SpotifyApi = require("./spotify-api.js");

const userAuthMap = require("./userAuthMap.js");
const userMap = require("./userMap.js");

const REDIRECT_URI = `http://${process.env.HOST}:${process.env.PORT}/callback`;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const app = express();

app.get("/login", (req, res) => {
  if (!req.query.uid) {
    return res.status(400).send('Query "uid" is required');
  }
  const uid = Number(req.query.uid);
  const state = Math.random().toString(36).substr(2, 5);
  userAuthMap.set(state, uid);
  const scope =
    "ugc-image-upload user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-private user-read-email user-follow-modify user-follow-read user-library-modify user-library-read streaming app-remote-control user-read-playback-position user-top-read user-read-recently-played playlist-modify-private playlist-read-collaborative playlist-read-private playlist-modify-public";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        state: state,
      })
  );
});

app.get("/callback", async (req, res) => {
  if (!req.query.state) {
    return res.sendStatus(401);
  }
  const accessData = await axios
    .post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        code: req.query.code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          Authorization: `Basic ${new Buffer(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )
    .catch((err) => {
      console.log("Ошибка:", err);
    });
  if (userAuthMap.has(req.query.state)) {
    const user = userMap.get(userAuthMap.get(req.query.state));
    user.selectedId = user.id;
    user.refreshToken = accessData.data.refresh_token;
    user.instanceApi = new SpotifyApi(
      user.refreshToken,
      accessData.data.access_token
    );
    userAuthMap.delete(accessData.data.scope);
    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
});

app.listen(process.env.PORT ?? 8888);
bot.launch().then(() => console.log("bot started"));
console.log("server started");
