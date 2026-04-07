export const TEMPLATES = [
  {
    id: 'birthday',
    name: 'Birthday',
    title: 'Happy Birthday',
    subtitle: 'May this day sparkle with everything you love.',
    frontColor: '#f472b6',
    accentColor: '#fb923c',
    frontGradient: 'linear-gradient(160deg, #fdf2f8 0%, #fce7f3 45%, #fff7ed 100%)',
    backGradient: 'linear-gradient(160deg, #fff7ed 0%, #fce7f3 100%)',
    bgImage: 'https://images.unsplash.com/photo-1490750967868-88df5691cc9a?w=600&auto=format&fit=crop&q=80',
    message: 'Another year of you is the best gift of all. Wishing you pure joy today.',
    backText: 'Every moment with you is one I treasure forever. Happy Birthday, always.',
    bannerText: 'Celebrate!'
  },
  {
    id: 'congrats',
    name: 'Congrats',
    title: 'You Did It',
    subtitle: 'This moment belongs entirely to you.',
    frontColor: '#34d399',
    accentColor: '#60a5fa',
    frontGradient: 'linear-gradient(160deg, #ecfdf5 0%, #d1fae5 45%, #eff6ff 100%)',
    backGradient: 'linear-gradient(160deg, #eff6ff 0%, #d1fae5 100%)',
    bgImage: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&auto=format&fit=crop&q=80',
    message: 'All those quiet mornings, late nights, and brave steps — they led right here.',
    backText: 'The world is wider now because you dared to reach. So proud of you.',
    bannerText: 'Congrats!'
  },
  {
    id: 'wedding',
    name: 'Wedding',
    title: 'Forever Starts Now',
    subtitle: 'Two souls, one beautiful beginning.',
    frontColor: '#f9a8d4',
    accentColor: '#c4b5fd',
    frontGradient: 'linear-gradient(160deg, #fdf2f8 0%, #fce7f3 45%, #f5f3ff 100%)',
    backGradient: 'linear-gradient(160deg, #f5f3ff 0%, #fce7f3 100%)',
    bgImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=80',
    message: 'May your love be a shelter, a laughter, and a quiet home you always return to.',
    backText: 'What a privilege it is to witness your love story unfold so beautifully.',
    bannerText: 'Just Married'
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    title: 'Happy Anniversary',
    subtitle: 'Still choosing each other, every single day.',
    frontColor: '#60a5fa',
    accentColor: '#a78bfa',
    frontGradient: 'linear-gradient(160deg, #eff6ff 0%, #dbeafe 45%, #f5f3ff 100%)',
    backGradient: 'linear-gradient(160deg, #f5f3ff 0%, #dbeafe 100%)',
    bgImage: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop&q=80',
    message: 'Love that deepens with every season — that is what you have built.',
    backText: 'Here is to the years that made you both even more beautiful together.',
    bannerText: 'With Love'
  },
  {
    id: 'new-home',
    name: 'New Home',
    title: 'Welcome Home',
    subtitle: 'A new door opens to a whole new life.',
    frontColor: '#fb923c',
    accentColor: '#fbbf24',
    frontGradient: 'linear-gradient(160deg, #fff7ed 0%, #ffedd5 45%, #fefce8 100%)',
    backGradient: 'linear-gradient(160deg, #fefce8 0%, #ffedd5 100%)',
    bgImage: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&auto=format&fit=crop&q=80',
    message: 'May every room hold warm memories in the making, and every window face the light.',
    backText: 'Home is where your story begins. May this one be your most beautiful chapter yet.',
    bannerText: 'New Home!'
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    title: 'Thank You',
    subtitle: 'Some words are felt before they are said.',
    frontColor: '#86efac',
    accentColor: '#34d399',
    frontGradient: 'linear-gradient(160deg, #f7fee7 0%, #ecfccb 45%, #ecfdf5 100%)',
    backGradient: 'linear-gradient(160deg, #ecfdf5 0%, #ecfccb 100%)',
    bgImage: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80',
    message: 'Your kindness landed exactly when it was needed. Thank you, from the heart.',
    backText: 'Gratitude this deep does not fit neatly into words — but I hope you feel it.',
    bannerText: 'Thank You'
  }
];

export function getTemplateById(id) {
  return TEMPLATES.find((item) => item.id === id) || TEMPLATES[0];
}
