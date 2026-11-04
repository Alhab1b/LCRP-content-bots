const locales = { en: require("./locales/en"), ar: require("./locales/ar") };
module.exports = (lang) => locales[lang] || locales.en;
