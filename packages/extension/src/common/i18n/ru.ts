/** Все строки интерфейса. Когда понадобится i18n — этот объект станет одним из словарей. */
export const ru = {
  appName: 'vless-da-podrova',
  connection: {
    state: {
      off: 'Выключено',
      connecting: 'Подключение…',
      on: 'Подключено',
      error: 'Ошибка',
    },
    enable: 'Включить',
    disable: 'Выключить',
    reconnect: 'Переподключить',
    noServer: 'Добавьте и выберите сервер',
    via: 'через',
    core: 'ядро',
  },
  servers: {
    title: 'Серверы',
    empty: 'Серверов пока нет',
    addPlaceholder: 'Вставьте одну или несколько ссылок vless://',
    add: 'Добавить',
    remove: 'Удалить',
    added: (count: number) => `Добавлено серверов: ${count}`,
    duplicate: 'Такой сервер уже есть',
  },
  errors: {
    helperNotInstalled:
      'Хелпер не установлен или не зарегистрирован. Запустите scripts\install.ps1 и перезапустите браузер.',
    helperDisconnected: 'Связь с хелпером потеряна',
    helperOutdated: 'Версия хелпера не совпадает с расширением — переустановите его',
    coreMissing: 'sing-box не найден рядом с хелпером — переустановите его',
    coreExited: 'Ядро неожиданно завершилось',
    proxyControlledByOther: 'Настройками прокси управляет другое расширение — отключите его',
    timeout: 'Хелпер не ответил вовремя',
  },
} as const
