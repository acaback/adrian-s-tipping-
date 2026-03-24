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
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'user';
  totalPoints: number;
  totalMargin: number;
  unlockedRounds?: number[];
  favoriteTeam?: string;
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

export interface Team {
  id: number;
  name: string;
  abbrev: string;
  logo?: string;
}

export interface RoundStatus {
  round: number;
  isLocked: boolean;
}
