const querystring = require("querystring");
const axios = require("axios");

class SpotifyApi {
  constructor(refreshToken) {
    if (!refreshToken) {
      throw new Error("refresh token required");
    }
    this._refreshToken = refreshToken;
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.accessToken = null;
    this.apiUrl = "https://api.spotify.com/v1";
    this.accountsApiUrl = "https://accounts.spotify.com/api";
    this.accountsApi = axios.create({
      baseURL: `${this.accountsApiUrl}`,
      headers: this.accountsApiHeaders,
    });
    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: this.apiHeaders,
    });
  }

  async addToQueue(songId) {
    await this.get({
      url: "/me/player/queue",
      query: {
        uri: `spotify:track:${songId}`,
      },
    });
  }

  async nextSong() {
    await this.post({ url: "/me/player/next" });
  }

  async previousSong() {
    await this.post({ url: "/me/player/previous" });
  }

  async play() {
    await this.put({ url: "/me/player/play" });
  }

  async pause() {
    await this.put({ url: "/me/player/pause" });
  }

  async volume(percent) {
    await this.put({
      url: "/me/player/volume",
      query: { volume_percent: percent },
    });
  }

  async refreshAccessToken() {
    try {
      const data = await this.accountsApi.post(
        "/token",
        querystring.stringify({
          grant_type: "refresh_token",
          refresh_token: this._refreshToken,
        })
      );
      this.accessToken = data.data.access_token;
      this.api = axios.create({
        baseURL: this.apiUrl,
        headers: this.apiHeaders,
      });
    } catch (error) {
      throw new Error("REFRESH_EXPIRED");
    }
  }

  async get(data, isReconnect) {
    const { url, query } = data;
    try {
      const data = await this.api.get(url, {
        params: query,
      });

      return data.data;
    } catch (error) {
      if (error.response.status === 401 && !isReconnect) {
        await this.refreshAccessToken();
        return this.get(data, true);
      } else {
        throw new Error("INTERNAL_SERVER_ERROR");
      }
    }
  }

  async put(data, isReconnect) {
    const { url, data, query } = data;
    try {
      const data = await this.api.put(url, data, {
        params: query,
      });

      return data.data;
    } catch (error) {
      if (error.response.status === 401 && !isReconnect) {
        await this.refreshAccessToken();
        return this.put(data, true);
      } else {
        throw new Error("INTERNAL_SERVER_ERROR");
      }
    }
  }

  async post(data, isReconnect) {
    const { url, data, query } = data;
    try {
      const data = await this.api.post(url, data, {
        params: query,
      });

      return data.data;
    } catch (error) {
      if (error.response.status === 401 && !isReconnect) {
        await this.refreshAccessToken();
        return this.post(data, true);
      } else {
        throw new Error("INTERNAL_SERVER_ERROR");
      }
    }
  }

  get apiHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
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

module.exports = SpotifyApi;
