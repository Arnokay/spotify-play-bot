require("dotenv").config();
const { Telegraf } = require("telegraf");
const querystring = require("querystring");
const express = require("express");
const axios = require("axios");
const fs = require("fs");

let accessToken;
let refreshToken;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `http://${process.env.HOST}:${process.env.PORT}/callback`;

if (fs.existsSync("accessToken")) {
  accessToken = fs.readFileSync("accessToken").toString();
}
if (fs.existsSync("refreshToken")) {
  refreshToken = fs.readFileSync("refreshToken").toString();
}

const app = express();

app.get("/login", (req, res) => {
  const state = "asdqwezxcrtyfghv";
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
      console.log(err);
    });
  fs.writeFile("accessToken", accessData.data.access_token, (err) => {
    if (err) {
      console.log("Err when write access token. Error:");
      console.log(err);
    }
  });
  fs.writeFile("refreshToken", accessData.data.refresh_token, (err) => {
    if (err) {
      console.log("Err when write refresh token. Error:");
      console.log(err);
    }
  });
  res.sendStatus(200);
});

class SpotifyApi {
  constructor(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) {
    if (!SPOTIFY_CLIENT_SECRET || !SPOTIFY_CLIENT_ID) {
      throw new Error("Credentials need to be provided");
    }
    this.clientId = SPOTIFY_CLIENT_ID;
    this.clientSecret = SPOTIFY_CLIENT_SECRET;
    this.apiUrl = "https://api.spotify.com/v1";
    this.accountsApiUrl = "https://accounts.spotify.com/api";
    this.accountsApi = axios.create({
      baseURL: `${this.accountsApiUrl}`,
      headers: this.accountsApiHeaders,
    });
    this.api = axios.create({
      baseURL: `${this.apiUrl}`,
      headers: this.apiHeaders,
    });
  }

  async refreshAccessToken() {
    const data = await this.accountsApi
      .post(
        "/token",
        querystring.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        {
          headers: this.accountsApiHeaders,
        }
      )
      .then((data) => {
        fs.writeFileSync("accessToken", data.data.access_token);
        accessToken = data.data.access_token;
        this.api = axios.create({
          baseURL: `${this.apiUrl}`,
          headers: this.apiHeaders,
        });
        return true;
      })
      .catch((error) => {
        console.log("Cannot refresh token, error: ");
        console.error(error);
        return false;
      });

    return data;
  }

  async addToQueue(songId, isReconnect) {
    try {
      await this.api.post("/me/player/queue", null, {
        params: {
          uri: `spotify:track:${songId}`,
        },
      });
    } catch (error) {
      if (error.response.status === 401 && !isReconnect) {
        const isRefreshedToken = await this.refreshAccessToken();
        if (isRefreshedToken) {
          return this.addToQueue(songId, true);
        }
      } else {
        return false;
      }
    }
    return true;
  }

  async nextSong(isReconnect) {
    try {
      await this.api.post("/me/player/next");
    } catch (error) {
      if (error.response.status === 401 && !isReconnect) {
        const isRefreshedToken = await this.refreshAccessToken();
        if (isRefreshedToken) {
          return this.nextSong(true);
        }
      } else {
        console.log(error.response.data);
        return false;
      }
    }
    return true;
  }

  async prevSong(isReconnect) {
    try {
      await this.api.post("/me/player/previous");
    } catch (error) {
      if (error.response.status === 401 && !isReconnect) {
        const isRefreshedToken = await this.refreshAccessToken();
        if (isRefreshedToken) {
          return this.nextSong(true);
        }
      } else {
        return false;
      }
    }
    return true;
  }

  async play(isReconnect) {
    try {
      await this.api.put("/me/player/play");
    } catch (error) {
      if (error.response.status === 401 && !isReconnect) {
        const isRefreshedToken = await this.refreshAccessToken();
        if (isRefreshedToken) {
          return this.play(true);
        }
      } else {
        return false;
      }
    }
    return true;
  }

  async pause(isReconnect) {
    try {
      await this.api.put("/me/player/pause");
    } catch (error) {
      if (error.response.status === 401 && !isReconnect) {
        const isRefreshedToken = await this.refreshAccessToken();
        if (isRefreshedToken) {
          return this.pause(true);
        }
      } else {
        return false;
      }
    }
    return true;
  }

  async volume(percent, isReconnect) {
    try {
      await this.api.put("/me/player/volume", null, {
        params: {
          volume_percent: percent,
        },
      });
    } catch (error) {
      if (error.response.status === 401 && !isReconnect) {
        const isRefreshedToken = await this.refreshAccessToken();
        if (isRefreshedToken) {
          return this.volume(percent, true);
        }
      } else {
        return false;
      }
    }
    return true;
  }

  get apiHeaders() {
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }
  get accountsApiHeaders() {
    return {
      Authorization: `Basic ${new Buffer(
        `${this.clientId}:${this.clientSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }
}

const spotifyApi = new SpotifyApi(
  process.env.SPOTIFY_CLIENT_ID,
  process.env.SPOTIFY_CLIENT_SECRET
);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.command("add", async (ctx) => {
  console.log(
    `Запрос queue от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
  );
  const linkEntity = ctx.message.entities.find(
    (entity) => entity.type === "url"
  );
  if (!linkEntity) {
    return ctx.reply("Не смог найти ссылку на трек.");
  }
  const link = ctx.message.text.slice(linkEntity.offset, linkEntity.length);
  const regex = /(?<=track\/).+/;
  const rawIdOfSong = link.match(regex);
  if (rawIdOfSong.length === 0) {
    return ctx.reply("Не смог найти id трека.");
  }
  const songId = rawIdOfSong[0].slice(0, 22);
  console.log("songId: ", songId);
  const isAddedToQueue = await spotifyApi.addToQueue(songId);
  if (isAddedToQueue) {
    ctx.reply("Добавлено в очередь.");
  } else {
    ctx.reply("Произошла ошибка, гг.");
  }
});

bot.command("next", async (ctx) => {
  console.log(
    `Запрос next от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
  );
  const isSkipToNext = await spotifyApi.nextSong();
  if (isSkipToNext) {
    ctx.reply("Переключил.");
  } else {
    ctx.reply("Прошизошла ошибка, гг.");
  }
});
bot.command("prev", async (ctx) => {
  console.log(
    `Запрос previous от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
  );
  const isReturnToPrev = await spotifyApi.prevSong();
  if (isReturnToPrev) {
    ctx.reply("Переключил.");
  } else {
    ctx.reply("Произошла ошибка, гг.");
  }
});
bot.command("volume", async (ctx) => {
  console.log(
    `Запрос volume от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
  );
  const requestText = ctx.message.text.replace(/\s+/g, " ").trim();
  const percent = Number(requestText.split(" ")[1]);
  const isVolumeSet = await spotifyApi.volume(percent);

  if (isVolumeSet) {
    ctx.reply(`Теперь громкость равна: ${percent}`);
  } else {
    ctx.reply("Произошла ошибка, гг.");
  }
});

bot.command("play", async (ctx) => {
  console.log(
    `Запрос start от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
  );
  const isVolumeSet = await spotifyApi.play();

  if (isVolumeSet) {
    ctx.reply(`Включил музыку.`);
  } else {
    ctx.reply("Произошла ошибка, гг.");
  }
});

bot.command("pause", async (ctx) => {
  console.log(
    `Запрос start от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
  );
  const isVolumeSet = await spotifyApi.pause();

  if (isVolumeSet) {
    ctx.reply(`Поставил на паузу.`);
  } else {
    ctx.reply("Произошла ошибка, гг.");
  }
});

bot.launch().then(() => {
  console.log("bot started");
});

app.listen(process.env.PORT ?? 8888);
console.log("server started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
