/**
 * Demo personas — the 30 seeded profiles exposed as a quick-pick list
 * on the login screen in demo mode. The list is curated to surface
 * interesting role types first (founder, engineer, designer, marketer).
 */

export interface DemoPersona {
  email: string;
  username: string;
  displayName: string;
  headline: string;
  userType: string;
  emoji: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  { email: 'defne@builderclans.dev', username: 'defne', displayName: 'Defne Yıldırım', headline: 'Founder • Product • Looking for CTO', userType: 'Founder', emoji: '🌱' },
  { email: 'kayra@builderclans.dev', username: 'kayra', displayName: 'Kayra Demir', headline: 'ML engineer • Agentic AI', userType: 'Engineer', emoji: '🧠' },
  { email: 'ada@builderclans.dev', username: 'ada', displayName: 'Ada Korkmaz', headline: 'Full-stack engineer', userType: 'Engineer', emoji: '💻' },
  { email: 'pelin@builderclans.dev', username: 'pelin', displayName: 'Pelin Aksoy', headline: 'Senior product designer', userType: 'Designer', emoji: '🎨' },
  { email: 'sila@builderclans.dev', username: 'sila', displayName: 'Sıla Aydın', headline: 'Growth & marketing', userType: 'Marketer', emoji: '📈' },
  { email: 'kaan@builderclans.dev', username: 'kaan', displayName: 'Kaan Polat', headline: 'Backend engineer', userType: 'Engineer', emoji: '⚙️' },
  { email: 'zeynep@builderclans.dev', username: 'zeynep', displayName: 'Zeynep Çelik', headline: 'Robotics engineer', userType: 'Engineer', emoji: '🤖' },
  { email: 'mert@builderclans.dev', username: 'mert', displayName: 'Mert Aslan', headline: 'Designer • Hardware curious', userType: 'Designer', emoji: '🛠️' },
  { email: 'arda@builderclans.dev', username: 'arda', displayName: 'Arda Şen', headline: 'Senior PM', userType: 'Founder', emoji: '🧭' },
  { email: 'duygu@builderclans.dev', username: 'duygu', displayName: 'Duygu Akın', headline: 'MD • Builder', userType: 'Researcher', emoji: '🩺' },
];
