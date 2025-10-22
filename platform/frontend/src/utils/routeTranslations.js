// Route translation mappings
export const routeTranslations = {
  pt: {
    municipalities: "municipios",
    search: "pesquisa", 
    about: "sobre",
    media: "media",
    newsletter: "newsletter",
    minutes: "atas",
    subjects: "assuntos",
    participants: "participante",
    privacypolicy: "politicadeprivacidade"
  },
  en: {
    municipios: "municipalities",
    pesquisa: "search",
    sobre: "about", 
    media: "media",
    newsletter: "newsletter",
    atas: "minutes",
    assuntos: "subjects",
    participante: "participants",
    politicadeprivacidade: "privacypolicy"
  }
};

// Helper function to translate a path segment
export const translatePathSegment = (segment, fromLang, toLang) => {
  if (!segment || segment.startsWith(':')) return segment; // Skip params
  
  const translations = routeTranslations[toLang];

  if (fromLang === 'pt' && toLang === 'en') {
    const result = translations[segment] || segment;
    return result;
  } else if (fromLang === 'en' && toLang === 'pt') {
    const result = translations[segment] || segment;
    return result;
  }
  return segment;
};

// Helper function to translate entire path
export const translatePath = (path, fromLang, toLang) => {
  if (!path || path === '/') return '/';
  
  // Split path and query parameters
  const [pathPart, queryPart] = path.split('?');
  
  // Remove leading slash and split into segments
  const segments = pathPart.replace(/^\//, '').split('/');
  
  // Translate each segment
  const translatedSegments = segments.map(segment => {
    // Skip parameter segments (those starting with ':' or being actual IDs)
    if (segment.startsWith(':') || /^[a-f0-9]{24}$/.test(segment)) {
      return segment;
    }
    return translatePathSegment(segment, fromLang, toLang);
  });
  
  const translatedPath = '/' + translatedSegments.join('/');
  return queryPart ? `${translatedPath}?${queryPart}` : translatedPath;
};

// Get language-aware route
export const getLocalizedRoute = (route, lang) => {
  
  if (lang === 'en') {
    const translatedPath = translatePath(route, 'pt', 'en');
   
    const result = `/en${translatedPath}`;
  
    return result;
  }

  return route;
};
