export const withLang = (path, lang) => {
  return lang && lang !== "pt" ? `/${lang}${path}` : path;
};