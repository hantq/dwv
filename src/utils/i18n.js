import i18next from 'i18next';
import Backend from 'i18next-xhr-backend';

/**
 * Initialize i18n.
 * @param {String} language The language to translate to, values are 'en' or 'zh'. Defaults to 'en'.
 * @param {String} localesPath Path to the locales directory.
 * @external i18next
 */
export const i18nInitialize = function(language = 'en', localesPath = '../..') {
  const options = {
    lng: language,
    fallbackLng: 'en',
    load: 'languageOnly',
    backend: {
      loadPath: `${localesPath}/locales/{{lng}}/{{ns}}.json`,
    },
  };

  i18next
    .use(Backend)
    .init(options);
};

/**
 * Get the translated text.
 * @param {String} key The key to the text entry.
 * @param {Object} options The translation options such as plural, context...
 * @external i18next
 */
export const i18n = function(key, options) {
  return i18next.t(key, options);
};

/**
 * Check the existence of a translation.
 * @param {String} key The key to the text entry.
 * @param {Object} options The translation options such as plural, context...
 * @external i18next
 */
export const i18nExists = function(key, options) {
  return i18next.exists(key, options);
};
