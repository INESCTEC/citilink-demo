/**
 * Translation helper utilities for consistent multilingual support
 */

/**
 * Get localized topic name based on current language
 * @param {Object} topico - Topic object with title/name and title_en/name_en fields
 * @param {string} language - Current language ('en' or 'pt')
 * @returns {string} Localized topic name
 */
export const getLocalizedTopicName = (topico, language) => {
  if (!topico) return '';
  
  // Handle both title_en/name_en formats for English
  if (language === 'en') {
    if (topico.title_en) return topico.title_en;
    if (topico.name_en) return topico.name_en;
  }
  
  // Fallback to Portuguese or any available field
  return topico.title || topico.name || topico.title_en || topico.name_en || '';
};

/**
 * Get localized municipality name based on current language
 * @param {Object} municipio - Municipality object with name and name_en fields
 * @param {string} language - Current language ('en' or 'pt')
 * @returns {string} Localized municipality name
 */
export const getLocalizedMunicipioName = (municipio, language) => {
  if (!municipio) return '';
  
  if (language === 'en' && municipio.name_en) {
    return municipio.name_en;
  }
  return municipio.name || municipio.name_en || ''; // Fallback to name or name_en if name is missing
};

/**
 * Get localized participant name (participants don't have translation fields currently)
 * @param {Object} participante - Participant object with name field
 * @param {string} language - Current language ('en' or 'pt')
 * @returns {string} Participant name
 */
export const getLocalizedParticipantName = (participante, language) => {
  if (!participante) return '';
  return participante.name || '';
};

/**
 * Get localized ata title based on current language
 * @param {Object} ata - Ata object with title and title_en fields
 * @param {string} language - Current language ('en' or 'pt')
 * @returns {string} Localized ata title
 */
export const getLocalizedAtaTitle = (ata, language) => {
  if (!ata) return '';
  
  if (language === 'en' && ata.title_en) {
    return ata.title_en;
  }
  return ata.title || ata.title_en || ''; // Fallback to title or title_en if title is missing
};

/**
 * Get localized assunto title based on current language
 * @param {Object} assunto - Assunto object with title and title_en fields
 * @param {string} language - Current language ('en' or 'pt')
 * @returns {string} Localized assunto title  
 */
export const getLocalizedAssuntoTitle = (assunto, language) => {
  if (!assunto) return '';
  
  if (language === 'en' && assunto.title_en) {
    return assunto.title_en;
  }
  return assunto.title || assunto.title_en || ''; // Fallback to title or title_en if title is missing
};

/**
 * Translate a list of objects with localized names
 * @param {Array} items - Array of objects to translate
 * @param {string} language - Current language
 * @param {Function} getLocalizedName - Function to get localized name for each item
 * @returns {Array} Array of objects with localized names
 */
export const translateItemList = (items, language, getLocalizedName) => {
  if (!Array.isArray(items)) return [];
  
  return items.map(item => ({
    ...item,
    localizedName: getLocalizedName(item, language)
  }));
};