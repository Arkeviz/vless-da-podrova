# @vdp/extension

WXT + Vue 3 + TypeScript. Структура по FEOD:

```
src/
  app/        entrypoints WXT (background, popup) и глобальные стили — только запуск
  pages/      экраны: popup
  modules/    servers — хранение и выбор серверов
              connection — хелпер, ядро, настройки прокси браузера (фон) и панель статуса
  common/     i18n (строки интерфейса), storage (реактивная обёртка над WXT storage)
```

Вариация проекта:

- уровни `app / pages / modules / common`; entrypoints WXT лежат в `app/entrypoints`;
- модули в kebab-case, доступ извне только через `index.ts`;
- в `common` нет index-файлов, импорт по прямому пути;
- межуровневые импорты через `@/`.

Состояние живёт в `storage.local`: popup пишет желаемое (`proxyEnabled`, выбранный сервер),
фоновый сервис приводит к нему фактическое и пишет `connectionStatus`.
