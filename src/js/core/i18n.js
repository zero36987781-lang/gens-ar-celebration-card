export const SUPPORTED_LANGUAGES = ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de'];

const KO_MESSAGES = {
  common: {
    appName: 'CHARIEL',
    sender: '보내는 사람',
    receiver: '받는 사람',
    messagePlaceholder: '메시지를 입력하세요',
    backMessagePlaceholder: '뒷면 메시지를 입력하세요'
  }
};

const EN_MESSAGES = {
  common: {
    appName: 'CHARIEL',
    sender: 'Sender',
    receiver: 'Receiver',
    messagePlaceholder: 'Type your message',
    backMessagePlaceholder: 'Type the back message'
  }
};

export function getPreferredLanguage() {
  const preferred = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
  const base = preferred.startsWith('zh') ? 'zh' : preferred.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : 'en';
}

export function getMessages(lang = getPreferredLanguage()) {
  if (lang === 'ko') return KO_MESSAGES;
  return EN_MESSAGES;
}

export function t(path, lang = getPreferredLanguage()) {
  const messages = getMessages(lang);
  return path.split('.').reduce((acc, key) => acc?.[key], messages) || path;
}

export function applyPageLanguage(root = document.documentElement) {
  const lang = getPreferredLanguage();
  if (root) root.lang = lang;
  return lang;
}
