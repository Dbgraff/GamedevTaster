import { defineConfig } from "vite";

// ВАЖНО: если деплоишь на GitHub Pages как project site
// (https://<username>.github.io/<repo-name>/), base ДОЛЖЕН совпадать
// с именем репозитория — иначе после деплоя не подгрузятся JS/CSS.
//
// Если вместо этого деплоишь как user/org site (репозиторий вида
// <username>.github.io) — поставь base: "/".
export default defineConfig({
  base: "/GamedevTaster/",
});
