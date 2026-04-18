export interface Game {
  id: number;
  round: number;
  year: number;
  hometeam: string;
  awayteam: string;
  date: string;
  venue: string;
  winner: string | null;
  hscore: number | null;
  ascore: number | null;
  isFinished: boolean;
  isFirstInRound?: boolean;
  timestr?: string;
  complete?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'user';
  totalPoints: number;
  totalMargin: number;
  favoriteTeam?: string;
  prevRank?: number;
  form?: string[]; // Array of 'W', 'L', 'D'
  preferences?: {
    emailNotifications?: boolean;
    weeklySummary?: boolean;
    darkMode?: boolean;
  };
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  email?: string;
  role: 'admin' | 'user';
  totalPoints: number;
  totalMargin: number;
  favoriteTeam?: string;
  prevRank?: number;
  form?: string[];
}

export interface Tip {
  id?: string;
  uid: string;
  gameId: number;
  round: number;
  selectedTeam: string;
  margin?: number;
  updatedAt: string;
}

export interface RoundStatus {
  round: number;
  isLocked: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: 'News' | 'Analysis' | 'Injuries' | 'Tactics';
  date: string;
  image?: string;
  readTime?: string;
}
