const { Telegraf } = require("telegraf");

const userMap = require("./userMap.js");

const SERVER_PATH = `${
  process.env.NODE_ENV === "production"
    ? process.env.PROD_SERVER_PATH
    : process.env.DEV_SERVER_PATH
}`;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.use((ctx, next) => {
  const user = userMap.get(ctx.message.chat.id);
  if (user) {
    if (userMap.has(user.selectedId)) {
      ctx.selectedId = user.selectedId;
      return next();
    } else {
      if (user.refresh_token) {
        user.selectedId = user.id;
        ctx.selectedId = user.id;
      } else {
        userMap.delete(ctx.message.chat.id);
        return ctx.reply(
          "Аккаунт, которым вы управляли больше не числится в системе."
        );
      }
    }
  }
  return next();
});

bot.command("login", (ctx) => {
  console.log(
    `Запрос login от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
  );
  userMap.set(ctx.message.chat.id, {
    firstName: ctx.message.chat.first_name,
    lastName: ctx.message.chat.last_name,
    username: ctx.message.chat.username,
    id: ctx.message.chat.id,
  });
  const replyMessage = `Для логина перейдите по ссылке: ${SERVER_PATH}/login?uid=${ctx.message.chat.id}`;
  ctx.reply(replyMessage);
});

bot.command("invite", (ctx) => {
  console.log(
    `Запрос invite от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
  );
  const link = `/join_${ctx.message.chat.id}`;
  ctx.reply(
    `Чтобы другой человек мог управлять вашей музыкой, пусть выполнит эту команду боту: \n ${link}`
  );
});

bot.on("message", async (ctx) => {
  //JOIN HANDLER
  if (ctx.message.text.startsWith("/join")) {
    const id = Number(ctx.message.text.split("_")[1]);
    if (userMap.has(id)) {
      const selectedUser = userMap.get(id);
      const user = userMap.get(ctx.message.chat.id);
      if (!selectedUser.refreshToken) {
        return ctx.reply("Юзер не залогинен.");
      }
      if (!user) {
        userMap.set(ctx.message.chat.id, {
          selectedId: id,
        });
      } else {
        user.selectedId = id;
      }
      return ctx.reply("Успешно подключено к управлению музыкой.");
    } else {
      return ctx.reply("Юзер не найден.");
    }
  }

  try {
    //LINK HANDLER
    const linkEntity = ctx.message?.entities?.find(
      (entity) => entity.type === "url"
    );
    if (linkEntity) {
      const link = ctx.message.text.slice(linkEntity.offset, linkEntity.length);
      const regex = /(?<=track\/).+/;
      const rawIdOfSong = link.match(regex);
      if (rawIdOfSong.length !== 0) {
        const songId = rawIdOfSong[0].slice(0, 22);
        if (userMap.has(ctx.selectedId)) {
          await userMap.get(ctx.selectedId).instanceApi.addToQueue(songId);
          ctx.reply("Добавил в очередь");
        } else {
          ctx.reply("Сначала залогинься или подпишись");
        }
      }
    }

    if (ctx.message.text.startsWith("/next")) {
      console.log(
        `Запрос next от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
      );
      if (userMap.has(ctx.selectedId)) {
        await userMap.get(ctx.selectedId).instanceApi.nextSong();
        ctx.reply("Проматал на следующую песню.");
      } else {
        ctx.reply("Сначала залогинься или подпишись");
      }
    }

    if (ctx.message.text.startsWith("/prev")) {
      console.log(
        `Запрос previous от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
      );
      if (userMap.has(ctx.selectedId)) {
        await userMap.get(ctx.selectedId).instanceApi.previousSong();
        ctx.reply("Отматал на прошлую песню.");
      } else {
        ctx.reply("Сначала залогинься или подпишись");
      }
    }

    if (ctx.message.text.startsWith("/volume")) {
      console.log(
        `Запрос volume от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
      );
      if (userMap.has(ctx.selectedId)) {
        const requestText = ctx.message.text.replace(/\s+/g, " ").trim();
        const percent = Number(requestText.split(" ")[1]);
        await userMap.get(ctx.selectedId).instanceApi.volume(percent);
        ctx.reply(`Громкость теперь: ${percent}%`);
      } else {
        ctx.reply("Сначала залогинься или подпишись");
      }
    }

    if (ctx.message.text.startsWith("/play")) {
      console.log(
        `Запрос start от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
      );
      if (userMap.has(ctx.selectedId)) {
        await userMap.get(ctx.selectedId).instanceApi.play();
        ctx.reply("Включил музыку.");
      } else {
        ctx.reply("Сначала залогинься или подпишись");
      }
    }

    if (ctx.message.text.startsWith("/pause")) {
      console.log(
        `Запрос start от: ${ctx.message.chat.first_name} ${ctx.message.chat.last_name} (${ctx.message.chat.username})`
      );
      if (userMap.has(ctx.selectedId)) {
        await userMap.get(ctx.selectedId).instanceApi.pause();
        ctx.reply("Поставил на паузу.");
      } else {
        ctx.reply("Сначала залогинься или подпишись");
      }
    }
  } catch (error) {
    console.log(error);
    if (error.name === "REFRESH_EXPIRED") {
      console.log(error);
      ctx.reply("Нужно перелогиниться.");
    } else {
      console.log(error);
      ctx.reply("Ошибка, ебать.");
    }
  }
});

module.exports = bot;
