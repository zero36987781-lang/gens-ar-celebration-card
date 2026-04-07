export const TEMPLATES = [
  {
    id: 'birthday',
    name: 'Birthday',
    title: 'Happy Birthday',
    subtitle: 'A bright surprise for your special day.',
    frontColor: '#7c3aed',
    accentColor: '#f59e0b',
    message: 'Happy Birthday! Wishing you joy, laughter, and a beautiful year ahead.',
    backText: 'Thank you for being such a special part of my life.',
    bannerText: 'Celebrate!'
  },
  {
    id: 'congrats',
    name: 'Congrats',
    title: 'You did it',
    subtitle: 'A proud moment worth celebrating.',
    frontColor: '#0f766e',
    accentColor: '#22c55e',
    message: 'Congratulations! I knew you could do it. Enjoy this moment.',
    backText: 'Keep going. Your next chapter will be even better.',
    bannerText: 'Congrats!'
  },
  {
    id: 'wedding',
    name: 'Wedding',
    title: 'Forever starts now',
    subtitle: 'Elegant, warm, and timeless.',
    frontColor: '#be185d',
    accentColor: '#f9a8d4',
    message: 'Wishing you a joyful wedding day and a beautiful life together.',
    backText: 'May your love grow deeper with every year.',
    bannerText: 'Just Married'
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    title: 'Happy Anniversary',
    subtitle: 'A gentle and heartfelt celebration.',
    frontColor: '#1d4ed8',
    accentColor: '#93c5fd',
    message: 'Happy Anniversary! Your love story is inspiring and beautiful.',
    backText: 'Here is to more laughter, love, and unforgettable days.',
    bannerText: 'With Love'
  },
  {
    id: 'new-home',
    name: 'New Home',
    title: 'Welcome Home',
    subtitle: 'A fresh start in a new place.',
    frontColor: '#7c2d12',
    accentColor: '#fb923c',
    message: 'Congratulations on your new home! May it be filled with warmth and happiness.',
    backText: 'Wishing you comfort, peace, and wonderful memories.',
    bannerText: 'New Home!'
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    title: 'Thank you',
    subtitle: 'Simple, warm, and sincere.',
    frontColor: '#374151',
    accentColor: '#facc15',
    message: 'Thank you for your kindness, support, and care.',
    backText: 'I am grateful for you, today and always.',
    bannerText: 'Thank You'
  }
];

export function getTemplateById(id) {
  return TEMPLATES.find((item) => item.id === id) || TEMPLATES[0];
}
