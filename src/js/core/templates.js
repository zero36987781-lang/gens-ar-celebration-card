export const TEMPLATES = [
  {
    id: 'birthday',
    name: 'Birthday',
    title: 'Happy Birthday',
    subtitle: 'Wishing you a day as bright as you are.',
    frontColor: '#f472b6',
    accentColor: '#fb923c',
    frontGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 40%, #fff7ed 100%)',
    backGradient: 'linear-gradient(135deg, #fff7ed 0%, #fce7f3 100%)',
    message: 'Happy Birthday! Wishing you joy, laughter, and a beautiful year ahead.',
    backText: 'Every moment with you is a gift. Thank you for being you.',
    bannerText: 'Celebrate!'
  },
  {
    id: 'congrats',
    name: 'Congrats',
    title: 'You Did It',
    subtitle: 'A proud moment worth celebrating.',
    frontColor: '#34d399',
    accentColor: '#60a5fa',
    frontGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 40%, #eff6ff 100%)',
    backGradient: 'linear-gradient(135deg, #eff6ff 0%, #d1fae5 100%)',
    message: 'Congratulations! Your hard work and dedication have truly paid off.',
    backText: 'Keep shining. Your next chapter will be even more amazing.',
    bannerText: 'Congrats!'
  },
  {
    id: 'wedding',
    name: 'Wedding',
    title: 'Forever Starts Now',
    subtitle: 'Elegant, warm, and timeless.',
    frontColor: '#f9a8d4',
    accentColor: '#c4b5fd',
    frontGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 40%, #f5f3ff 100%)',
    backGradient: 'linear-gradient(135deg, #f5f3ff 0%, #fce7f3 100%)',
    message: 'Wishing you a joyful wedding day and a beautiful life together.',
    backText: 'May your love grow deeper and more beautiful with every passing year.',
    bannerText: 'Just Married'
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    title: 'Happy Anniversary',
    subtitle: 'A gentle and heartfelt celebration.',
    frontColor: '#60a5fa',
    accentColor: '#a78bfa',
    frontGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 40%, #f5f3ff 100%)',
    backGradient: 'linear-gradient(135deg, #f5f3ff 0%, #dbeafe 100%)',
    message: 'Happy Anniversary! Your love story is inspiring and truly beautiful.',
    backText: 'Here is to more laughter, love, and unforgettable days ahead.',
    bannerText: 'With Love'
  },
  {
    id: 'new-home',
    name: 'New Home',
    title: 'Welcome Home',
    subtitle: 'A fresh start in a wonderful new place.',
    frontColor: '#fb923c',
    accentColor: '#fbbf24',
    frontGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 40%, #fefce8 100%)',
    backGradient: 'linear-gradient(135deg, #fefce8 0%, #ffedd5 100%)',
    message: 'Congratulations on your new home! May it be filled with warmth and joy.',
    backText: 'Wishing you comfort, peace, and wonderful memories in your new space.',
    bannerText: 'New Home!'
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    title: 'Thank You',
    subtitle: 'Simple, warm, and sincere.',
    frontColor: '#a3e635',
    accentColor: '#34d399',
    frontGradient: 'linear-gradient(135deg, #f7fee7 0%, #ecfccb 40%, #ecfdf5 100%)',
    backGradient: 'linear-gradient(135deg, #ecfdf5 0%, #ecfccb 100%)',
    message: 'Thank you for your kindness, support, and all that you do.',
    backText: 'I am truly grateful for you, today and always.',
    bannerText: 'Thank You'
  }
];

export function getTemplateById(id) {
  return TEMPLATES.find((item) => item.id === id) || TEMPLATES[0];
}
