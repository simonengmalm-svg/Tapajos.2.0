// Spelversion – använd t.ex. '1.2' eller en "arena" som 'Balder'
export const GAME_VERSION = '1.2';

// OBS: Dessa IDs/URL ska peka på din sheet/proxy/form
export const SHEET_CSV_URL = 'https://score-proxy.vercel.app/api/sheet';

export const FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSek9RtCyZUpHmAgBm8L0ymRtJIqZ7Qxm-yZpU9BGQM5LMoOMA/formResponse';

// Google Forms entry IDs (bekräftade)
export const HS_FIELDS = {
  name:   'entry.1521025478',   // Namn
  company:'entry.78399675',     // Företag
  worth:  'entry.1264246447',   // Nettoförmögenhet
  props:  'entry.1926418411',   // Fastigheter
  avgSat: 'entry.1041530574',   // Snittnöjdhet
  year:   'entry.1154333964',   // År
  ver:    'entry.143904483',    // Version
};

// LocalStorage-nycklar
export const HS_KEY     = (window.HS_KEY || 'tapajos-highscores-v1');
export const HS_RAW_KEY = 'tapajos-highscores-raw-v1';