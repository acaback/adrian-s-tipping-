import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  deleteDoc,
  getDocFromServer,
  addDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';
import { Game, UserProfile, Tip, Message, PollVote } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  Trophy, 
  Calendar, 
  User, 
  LogOut, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  History,
  Lock, 
  Unlock, 
  Settings,
  BarChart3,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MapPin,
  FileSpreadsheet,
  Download,
  Dices,
  Zap,
  Moon,
  Sun,
  Mail,
  X,
  XCircle,
  Trash2,
  Edit3,
  Star,
  LayoutGrid,
  Shield,
  BookOpen,
  Plus,
  Minus,
  Copy,
  Check,
  Loader2,
  Printer,
  Menu,
  Info,
  ExternalLink,
  MessageSquare,
  Send,
  Heart,
  TrendingUp,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const safeFormatInTimeZone = (dateStr: string | undefined | null, timezone: string, formatStr: string) => {
  if (!dateStr) return 'TBA';
  try {
    return formatInTimeZone(parseISO(dateStr), timezone, formatStr);
  } catch (e) {
    return 'Invalid Date';
  }
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-stone-200 dark:bg-stone-800 rounded-lg", className)} />
);

const AWST_TIMEZONE = 'Australia/Perth';

const AFL_TEAMS = [
  'Adelaide Crows', 'Brisbane Lions', 'Carlton Blues', 'Collingwood Magpies',
  'Essendon Bombers', 'Fremantle Dockers', 'Geelong Cats', 'Gold Coast Suns',
  'GWS Giants', 'Hawthorn Hawks', 'Melbourne Demons', 'North Melbourne Kangaroos',
  'Port Adelaide Power', 'Richmond Tigers', 'St Kilda Saints', 'Sydney Swans',
  'West Coast Eagles', 'Western Bulldogs'
];

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return format(date, 'MMM d, h:mm a');
};

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        const difference = parseISO(targetDate).getTime() - new Date().getTime();
        
        if (difference > 0) {
          setTimeLeft({
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
          });
        } else {
          setTimeLeft(null);
        }
      } catch (err) {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
          <span className="text-xl font-mono font-bold leading-none">{timeLeft.days}</span>
        </div>
        <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold mt-1">Days</span>
      </div>
      <span className="text-stone-700 text-lg font-bold pb-4">:</span>
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
          <span className="text-xl font-mono font-bold leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
        </div>
        <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold mt-1">Hrs</span>
      </div>
      <span className="text-stone-700 text-lg font-bold pb-4">:</span>
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
          <span className="text-xl font-mono font-bold leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        </div>
        <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold mt-1">Min</span>
      </div>
      <span className="text-stone-700 text-lg font-bold pb-4">:</span>
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 bg-white/5 border border-stone-100/20 rounded-lg flex items-center justify-center">
          <span className="text-xl font-mono font-bold leading-none text-afl-gold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        </div>
        <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold mt-1">Sec</span>
      </div>
    </div>
  );
};

const GamePoll = ({ game, pollVotes, onVote, currentUserUid }: { game: Game, pollVotes: PollVote[], onVote: (v: 'home' | 'away') => void, currentUserUid?: string }) => {
  const homeVotes = pollVotes.filter(v => v.gameId === game.id && v.vote === 'home').length;
  const awayVotes = pollVotes.filter(v => v.gameId === game.id && v.vote === 'away').length;
  const total = homeVotes + awayVotes;
  const myVote = pollVotes.find(v => v.gameId === game.id && v.uid === currentUserUid)?.vote;

  const homePercent = total > 0 ? Math.round((homeVotes / total) * 100) : 50;
  const awayPercent = total > 0 ? Math.round((awayVotes / total) * 100) : 50;

  if (game.isFinished) {
    return (
      <div className="mt-4 p-3 bg-stone-100/50 dark:bg-stone-800/50 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[8px] font-bold uppercase tracking-widest text-stone-400">Final Community Poll</span>
          <span className="text-[10px] font-mono font-bold text-stone-500">{total} votes</span>
        </div>
        <div className="flex items-center gap-2 h-2 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-afl-navy" style={{ width: `${homePercent}%` }} />
          <div className="h-full bg-afl-accent" style={{ width: `${awayPercent}%` }} />
        </div>
        <div className="flex justify-between text-[9px] font-bold uppercase">
          <span className={cn(game.winner === game.hometeam && "text-emerald-500")}>{game.hometeam} {homePercent}%</span>
          <span className={cn(game.winner === game.awayteam && "text-emerald-500")}>{awayPercent}% {game.awayteam}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-bold uppercase tracking-widest text-stone-400">Community Choice</span>
        <span className="text-[10px] font-mono font-bold text-stone-500">{total} {total === 1 ? 'vote' : 'votes'} cast</span>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => onVote('home')}
          className={cn(
            "flex-1 p-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1",
            myVote === 'home' 
              ? "bg-afl-navy border-afl-navy text-white shadow-md shadow-afl-navy/20" 
              : "bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700"
          )}
        >
          <span>{game.hometeam}</span>
          {total > 0 && <span className="opacity-60">{homePercent}%</span>}
        </button>
        <button 
          onClick={() => onVote('away')}
          className={cn(
            "flex-1 p-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1",
            myVote === 'away' 
              ? "bg-afl-navy border-afl-navy text-white shadow-md shadow-afl-navy/20" 
              : "bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700"
          )}
        >
          <span>{game.awayteam}</span>
          {total > 0 && <span className="opacity-60">{awayPercent}%</span>}
        </button>
      </div>
      {total > 0 && (
        <div className="w-full h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div className="h-full bg-afl-navy" style={{ width: `${homePercent}%` }} />
        </div>
      )}
    </div>
  );
};

const AFL_TEAM_COLORS: Record<string, string> = {
  'Adelaide': '#002B5C',
  'Adelaide Crows': '#002B5C',
  'Brisbane': '#730040',
  'Brisbane Lions': '#730040',
  'Carlton': '#031A29',
  'Carlton Blues': '#031A29',
  'Collingwood': '#000000',
  'Collingwood Magpies': '#000000',
  'Essendon': '#CC2031',
  'Essendon Bombers': '#CC2031',
  'Fremantle': '#2A0D54',
  'Fremantle Dockers': '#2A0D54',
  'Geelong': '#1C3C63',
  'Geelong Cats': '#1C3C63',
  'Gold Coast': '#E11B05',
  'Gold Coast Suns': '#E11B05',
  'GWS': '#F15C22',
  'GWS Giants': '#F15C22',
  'Greater Western Sydney': '#F15C22',
  'Hawthorn': '#4D2004',
  'Hawthorn Hawks': '#4D2004',
  'Melbourne': '#0F1131',
  'Melbourne Demons': '#0F1131',
  'North Melbourne': '#003690',
  'North Melbourne Kangaroos': '#003690',
  'Port Adelaide': '#008AAB',
  'Port Adelaide Power': '#008AAB',
  'Richmond': '#FFCC33',
  'Richmond Tigers': '#FFCC33',
  'St Kilda': '#ED0F05',
  'St Kilda Saints': '#ED0F05',
  'Sydney': '#ED171F',
  'Sydney Swans': '#ED171F',
  'West Coast': '#002C73',
  'West Coast Eagles': '#002C73',
  'Western Bulldogs': '#014896',
  'Western Bulldogs Bulldogs': '#014896'
};

const TEAM_GRADIENTS: Record<string, string> = {
  'Adelaide': 'from-[#002B5C] via-[#E21E31] to-[#FFB800]',
  'Brisbane': 'from-[#730040] via-[#FFB800] to-[#0055A3]',
  'Carlton': 'from-[#0E1E2D] to-[#1a2b3c]',
  'Collingwood': 'from-black via-stone-800 to-black',
  'Essendon': 'from-[#CC2031] to-black',
  'Fremantle': 'from-[#201647] via-[#FFFFFF] to-[#201647]',
  'Geelong': 'from-[#1C3C63] via-[#FFFFFF] to-[#1C3C63]',
  'Gold Coast': 'from-[#E11C22] via-[#FFD200] to-[#E11C22]',
  'GWS': 'from-[#F15C22] via-[#333333] to-[#F15C22]',
  'Hawthorn': 'from-[#4D2004] via-[#FFD200] to-[#4D2004]',
  'Melbourne': 'from-[#0F1131] via-[#CC2031] to-[#0F1131]',
  'North Melbourne': 'from-[#013B9F] via-[#FFFFFF] to-[#013B9F]',
  'Port Adelaide': 'from-black via-[#008AAB] to-[#FFFFFF]',
  'Richmond': 'from-black via-[#FFD200] to-black',
  'St Kilda': 'from-[#ED0F05] via-black to-[#FFFFFF]',
  'Sydney': 'from-[#ED171F] via-[#FFFFFF] to-[#ED171F]',
  'West Coast': 'from-[#002C73] via-[#FFD200] to-[#002C73]',
  'Western Bulldogs': 'from-[#014896] via-[#ED171F] to-[#FFFFFF]'
};

const AIScout = ({ game, standings }: { game: Game, standings: any[] }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const getInsight = async () => {
    console.log("AI Scout: Deploying for", game.hometeam, "vs", game.awayteam);
    setLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined in the environment.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const hTeamStanding = standings.find(s => s.name === game.hometeam);
      const aTeamStanding = standings.find(s => s.name === game.awayteam);

      const prompt = `As an expert AFL analyst for the "War Room", provide a brief (max 60 words) tactical preview for ${game.hometeam} vs ${game.awayteam}. 
      Context: ${game.hometeam} is rank ${hTeamStanding?.rank || 'N/A'}, ${game.awayteam} is rank ${aTeamStanding?.rank || 'N/A'}. 
      Venue: ${game.venue}. 
      Be bold, use footy slang, and suggest a winner.`;

      console.log("AI Scout: Sending prompt...");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      console.log("AI Scout: Received response", response);
      const text = response.text || "Scout is speechless. Try again!";
      setInsight(text);
      setShowModal(true);
    } catch (error) {
      console.error("AI Scout failed:", error);
      setInsight("Scout is currently unavailable. Trust your gut!");
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mt-4 p-4 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-afl-accent">
            <Zap className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Let AI Help Pick Your Tips</span>
          </div>
          {!loading && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (insight) {
                  setShowModal(true);
                } else {
                  getInsight();
                }
              }}
              className="text-[12px] font-bold text-red-500 hover:text-red-400 transition-colors"
            >
              {insight ? 'View Report' : 'Deploy'}
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-white/40 text-[10px] italic">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analyzing matchups...
          </div>
        ) : (
          <p className="text-[10px] text-white/40 italic">
            {insight ? 'Report ready. Click view to read.' : 'Click deploy to get tactical insights for this matchup.'}
          </p>
        )}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowModal(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-stone-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-afl-navy to-stone-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-afl-accent/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-afl-accent fill-current" />
                  </div>
                  <div>
                    <h3 className="text-white font-serif italic text-xl">Let AI Help Pick Your Tips</h3>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">{game.hometeam} v {game.awayteam}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-stone-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-8 bg-stone-900/50">
              <div className="relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-afl-accent rounded-full opacity-50" />
                <p 
                  className="text-white leading-relaxed italic"
                  style={{ 
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '12px'
                  }}
                >
                  "{insight}"
                </p>
              </div>
            </div>

            <div className="p-6 bg-stone-900 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-afl-accent text-afl-navy font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-afl-accent/90 transition-all active:scale-95"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};

const ADMIN_EMAIL = "acaback@gmail.com";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorJson);
  throw new Error(errorJson);
}

interface LeaderboardItem extends UserProfile {
  calculatedPoints: number;
  calculatedMargin: number;
}

interface StandingsItem {
  rank: number;
  name: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pts: number;
  percentage: number;
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTips, setAllTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'war-room' | 'leaderboard' | 'standings' | 'results' | 'admin' | 'player-profile' | 'message-board' | 'fixtures'>('dashboard');
  const [lastViewedMessages, setLastViewedMessages] = useState<number>(() => {
    return Number(localStorage.getItem('lastViewedMessages')) || 0;
  });

  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [profileSourceTab, setProfileSourceTab] = useState<'leaderboard' | 'results' | 'admin'>('leaderboard');
  const [standings, setStandings] = useState<StandingsItem[]>([]);
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string>('');
  const [adminSelectedRound, setAdminSelectedRound] = useState<number>(currentRound);
  const [warRoomUserId, setWarRoomUserId] = useState<string>('');
  const [resultsUserId, setResultsUserId] = useState<string>('');
  const [resultsSubTab, setResultsSubTab] = useState<'individual' | 'round-summary'>('individual');
  const [resultsChartRange, setResultsChartRange] = useState<'all' | '5' | '10'>('all');
  const [showMatchWinners, setShowMatchWinners] = useState<boolean>(true);
  const [leaderboardSubTab, setLeaderboardSubTab] = useState<'ladder' | 'recap'>('ladder');
  const [resultsSelectedRound, setResultsSelectedRound] = useState<number>(currentRound);
  const [fixturesSelectedRound, setFixturesSelectedRound] = useState<number>(currentRound);
  const [expandedResultsRound, setExpandedResultsRound] = useState<number | null>(null);
  const [hoveredGameId, setHoveredGameId] = useState<number | null>(null);
  
  // Sorting State
  const [leaderboardSort, setLeaderboardSort] = useState<{ key: string; direction: 'asc' | 'desc' }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leaderboardSort');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore error
        }
      }
    }
    return { key: 'points', direction: 'desc' };
  });

  const [resultsIndividualSort, setResultsIndividualSort] = useState<{ key: string; direction: 'asc' | 'desc' }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resultsIndividualSort');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore error
        }
      }
    }
    return { key: 'round', direction: 'desc' };
  });

  const [resultsRoundSummarySort, setResultsRoundSummarySort] = useState<{ key: string; direction: 'asc' | 'desc' }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resultsRoundSummarySort');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore error
        }
      }
    }
    return { key: 'points', direction: 'desc' };
  });

  // Admin User Management State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserFavoriteTeam, setEditingUserFavoriteTeam] = useState('');
  const [editingUserRole, setEditingUserRole] = useState<'user' | 'admin'>('user');
  const [isFetchingTips, setIsFetchingTips] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [isEditingSelf, setIsEditingSelf] = useState(false);
  const [selfDisplayName, setSelfDisplayName] = useState('');
  const [selfFavoriteTeam, setSelfFavoriteTeam] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return true; // Default to night mode
    }
    return true;
  });

  const [profileNewMessage, setProfileNewMessage] = useState('');
  const [isSendingProfileMessage, setIsSendingProfileMessage] = useState(false);
  const [directMessageNotification, setDirectMessageNotification] = useState<{ id: string; sender: string; text: string } | null>(null);

  // Email/Password Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savingTipId, setSavingTipId] = useState<number | null>(null);
  const [pendingTips, setPendingTips] = useState<Record<number, Tip>>({});
  const [isConfirmingPost, setIsConfirmingPost] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isFetchingGames, setIsFetchingGames] = useState(true);
  const [isFetchingStandings, setIsFetchingStandings] = useState(true);
  const [apiStatus, setApiStatus] = useState<{
    games: 'success' | 'fallback' | 'cache' | 'error' | 'loading';
    standings: 'success' | 'fallback' | 'cache' | 'error' | 'loading';
    firestore: 'success' | 'error' | 'loading';
  }>({
    games: 'loading',
    standings: 'loading',
    firestore: 'loading'
  });

  const [isRoundRecapOpen, setIsRoundRecapOpen] = useState(false);
  const [recapRound, setRecapRound] = useState<number>(currentRound);
  const [isCopied, setIsCopied] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [roundOutlook, setRoundOutlook] = useState<string | null>(null);
  const [isOutlookLoading, setIsOutlookLoading] = useState(false);

  const hasNewMessages = useMemo(() => {
    if (messages.length === 0 || activeTab === 'message-board') return false;
    const latestMessageTime = new Date(messages[0].createdAt).getTime();
    return latestMessageTime > lastViewedMessages;
  }, [messages, lastViewedMessages, activeTab]);

  const generateRoundRecap = (round: number) => {
    const roundGames = games.filter(g => g.round === round && g.isFinished);
    if (roundGames.length === 0) return "No finished games for this round yet.";
    
    const roundTips = allTips.filter(t => {
      const g = games.find(game => game.id === t.gameId);
      return g && g.round === round;
    });

    const roundStats = allUsers.map(user => {
      const userTips = roundTips.filter(t => t.uid === user.uid);
      let correct = 0;
      let points = 0;
      let marginError = 0;

      // Draw points - Every player gets 1 point for every finished draw in the round
      const drawnGamesInRound = roundGames.filter(g => g.hscore !== null && g.ascore !== null && g.hscore === g.ascore);
      points += drawnGamesInRound.length;

      roundGames.forEach(game => {
        const tip = userTips.find(t => t.gameId === game.id);
        if (game) {
          const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
          const isDraw = game.hscore === game.ascore;

          if (isDraw) return;

          if (tip) {
            if (game.winner === tip.selectedTeam) {
              correct += 1;
              points += 1;
              if (game.isFirstInRound && tip.margin !== undefined) {
                if (tip.margin === actualMargin) points += 1;
                marginError += Math.abs(tip.margin - actualMargin);
              }
            } else if (game.isFirstInRound && tip.margin !== undefined) {
              marginError += Math.abs(tip.margin - actualMargin);
            }
          } else if (game.isFinished) {
            // Missing tip: Point for away team win
            if (game.winner === game.awayteam) {
              points += 1;
            }
          }
        }
      });

      return { ...user, correct, points, marginError };
    }).sort((a, b) => b.points - a.points || a.marginError - b.marginError);

    if (roundStats.length === 0) return "No player data available for this round.";

    const winners = roundGames.map(g => {
      if (g.hscore === g.ascore) {
        return `• ${g.hometeam} (${g.hscore}) drew with ${g.awayteam} (${g.ascore})`;
      }
      const winnerName = g.winner === g.hometeam ? g.hometeam : g.awayteam;
      const winnerScore = g.winner === g.hometeam ? g.hscore : g.ascore;
      const loserName = g.winner === g.hometeam ? g.awayteam : g.hometeam;
      const loserScore = g.winner === g.hometeam ? g.ascore : g.hscore;
      const margin = (winnerScore || 0) - (loserScore || 0);
      return `• ${winnerName} (${winnerScore}) def. ${loserName} (${loserScore}) by ${margin}`;
    }).join('\n');

    const allPerformers = roundStats.map((u, i) => 
      `${i + 1}. ${u.displayName} - ${u.points} pts (${u.correct} correct)`
    ).join('\n');

    const closestGame = roundGames.reduce((prev, curr) => {
      if (!prev) return curr;
      const prevMargin = Math.abs((prev.hscore || 0) - (prev.ascore || 0));
      const currMargin = Math.abs((curr.hscore || 0) - (curr.ascore || 0));
      return currMargin < prevMargin ? curr : prev;
    }, roundGames[0]);

    const biggestWin = roundGames.reduce((prev, curr) => {
      if (!prev) return curr;
      const prevMargin = Math.abs((prev.hscore || 0) - (prev.ascore || 0));
      const currMargin = Math.abs((curr.hscore || 0) - (curr.ascore || 0));
      return currMargin > prevMargin ? curr : prev;
    }, roundGames[0]);

    const lastPlace = roundStats[roundStats.length - 1];
    const woodenSpooners = lastPlace ? roundStats.filter(u => u.points === lastPlace.points && u.marginError === lastPlace.marginError) : [];
    const woodenSpoonNames = woodenSpooners.map(u => u.displayName).join(', ') || 'None';

    const funnyAnecdotes = [
      "Better luck next time! Maybe try flipping a coin?",
      "Is the ladder upside down? Because you're on top of that one!",
      "A bold strategy, Cotton. Let's see if it pays off for them next round.",
      "You're just giving everyone else a head start, right?",
      "The only way is up from here! (Hopefully)",
      "Maybe stick to watching the Auskick at halftime?",
      "Your tips were as accurate as a full-back taking a shot from 50m out on the boundary.",
      "Did you let your pet goldfish pick these?",
      "Consistency is key, and you're consistently... well, you know.",
      "At least you're consistent! Consistently wrong, but consistent nonetheless."
    ];
    const anecdote = funnyAnecdotes[Math.floor(Math.random() * funnyAnecdotes.length)];

    return `🏆 ROUND ${round} RECAP 🏆

🔥 RESULTS:
${winners}

📊 PLAYER STANDINGS:
${allPerformers}

🎯 MARGIN MASTER:
${[...roundStats].sort((a, b) => a.marginError - b.marginError)[0]?.displayName || 'N/A'} (Error: ${[...roundStats].sort((a, b) => a.marginError - b.marginError)[0]?.marginError ?? 'N/A'})

⚡️ HIGHLIGHTS:
• Closest Game: ${closestGame.hometeam} vs ${closestGame.awayteam} (${Math.abs((closestGame.hscore || 0) - (closestGame.ascore || 0))} pts)
• Biggest Win: ${biggestWin.winner} (+${Math.abs((biggestWin.hscore || 0) - (biggestWin.ascore || 0))} pts)

🥄 WOODEN SPOON:
${woodenSpoonNames}
"${anecdote}"

Good luck in Round ${round + 1}! 🍀`;
  };

  const generateOverallRecap = () => {
    if (leaderboardData.length === 0) return "No season data available yet.";

    const topPositions = leaderboardData.slice(0, 15).map((u, i) => 
      `${i + 1}. ${u.displayName} - ${u.calculatedPoints} pts (Err: ${u.calculatedMargin})`
    ).join('\n');

    const totalRounds = new Set(games.filter(g => g.isFinished).map(g => g.round)).size;
    const marginMaster = [...leaderboardData].sort((a, b) => a.calculatedMargin - b.calculatedMargin)[0];

    return `🏆 AFL 2026 SEASON STANDINGS 🏆
(After ${totalRounds} Rounds)

🌟 SEASON LEADERBOARD (TOP 15):
${topPositions}

🎯 MARGIN MASTER (SEASON):
${marginMaster?.displayName || 'N/A'} (Total Error: ${marginMaster?.calculatedMargin ?? 'N/A'})

🥄 THE WOODEN SPOON:
${lastPlace?.displayName || 'N/A'} (${lastPlace?.calculatedPoints ?? 0} pts)

🔥 TOP OF THE TABLE:
${leader?.displayName || 'N/A'} - Setting the pace with ${leader?.calculatedPoints ?? 0} points!

Good luck everyone! 🍀`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    if (profile) {
      setSelfDisplayName(profile.displayName || '');
      setSelfFavoriteTeam(profile.favoriteTeam || '');
    }
  }, [profile]);

  // Dark Mode Effect
  useEffect(() => {
    if (profile?.preferences?.darkMode !== undefined) {
      setDarkMode(profile.preferences.darkMode);
    }
  }, [profile?.preferences?.darkMode]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncUserProfile(firebaseUser);
        setWarRoomUserId(firebaseUser.uid);
        setResultsUserId(firebaseUser.uid);
      } else {
        setProfile(null);
        setWarRoomUserId('');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sync User Profile
  const syncUserProfile = async (firebaseUser: FirebaseUser, customDisplayName?: string) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const publicRef = doc(db, 'public_profiles', firebaseUser.uid);
    
    try {
      const userSnap = await getDoc(userRef);

      let currentProfile: UserProfile;

      if (!userSnap.exists()) {
        // Check if a manual user with the same email already exists
        let existingManualProfile: UserProfile | null = null;
        let manualDocId: string | null = null;

        try {
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email?.toLowerCase()));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            // Find the first manual user if any
            const manualDoc = querySnap.docs.find(d => d.id.startsWith('manual_'));
            if (manualDoc) {
              existingManualProfile = manualDoc.data() as UserProfile;
              manualDocId = manualDoc.id;
            }
          }
        } catch (err) {
          // This might fail if the user is not an admin, which is expected for new signups
          console.warn("Could not check for manual profile (normal for non-admins):", err);
        }

        if (existingManualProfile && manualDocId) {
          // Adopt the manual profile
          currentProfile = {
            ...existingManualProfile,
            uid: firebaseUser.uid,
            displayName: customDisplayName || firebaseUser.displayName || existingManualProfile.displayName || 'Anonymous',
            email: firebaseUser.email || existingManualProfile.email
          };
          await setDoc(userRef, currentProfile);
          await deleteDoc(doc(db, 'users', manualDocId));
        } else {
          // Create new profile
          currentProfile = {
            uid: firebaseUser.uid,
            displayName: customDisplayName || firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'user',
            totalPoints: 0,
            totalMargin: 0,
            preferences: {
              emailNotifications: true,
              weeklySummary: true,
              darkMode: true
            }
          };
          await setDoc(userRef, currentProfile);
        }
      } else {
        currentProfile = userSnap.data() as UserProfile;
        // Ensure role is set and admin role is correct for designated email
        let needsUpdate = false;
        if (firebaseUser.email === ADMIN_EMAIL && currentProfile.role !== 'admin') {
          currentProfile.role = 'admin';
          needsUpdate = true;
        } else if (!currentProfile.role) {
          currentProfile.role = 'user';
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await updateDoc(userRef, { role: currentProfile.role });
        }
      }

      // Always update public profile
      const publicProfile = {
        uid: currentProfile.uid,
        displayName: currentProfile.displayName,
        email: currentProfile.email,
        role: currentProfile.role,
        totalPoints: currentProfile.totalPoints,
        totalMargin: currentProfile.totalMargin,
        favoriteTeam: currentProfile.favoriteTeam || ''
      };
      await setDoc(publicRef, publicProfile);
      setProfile(currentProfile);

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
      setError("Failed to sync user profile. Please try again.");
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !authDisplayName) {
      setAuthError("Please fill in all fields.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: authDisplayName });
      await syncUserProfile(userCredential.user, authDisplayName);
    } catch (err: any) {
      console.error("Sign up error:", err);
      let message = "Failed to create account.";
      if (err.code === 'auth/email-already-in-use') {
        message = "An account already exists with this email.";
      } else if (err.code === 'auth/invalid-email') {
        message = "Invalid email address.";
      } else if (err.code === 'auth/weak-password') {
        message = "Password should be at least 6 characters.";
      } else if (err.code === 'auth/operation-not-allowed') {
        message = "Email/password accounts are not enabled.";
      } else if (err.message) {
        message = err.message;
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Please fill in all fields.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Sign in error:", err);
      let message = "Failed to sign in.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = "Invalid email or password.";
      } else if (err.code === 'auth/invalid-email') {
        message = "Invalid email address.";
      } else if (err.code === 'auth/user-disabled') {
        message = "This account has been disabled.";
      } else if (err.message) {
        message = err.message;
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch Games from Squiggle
  const fetchGames = async (isInitial = true, retryCount = 0) => {
    if (isInitial) setIsFetchingGames(true);
    try {
      console.log(`Fetching AFL games... (Attempt ${retryCount + 1})`);
      let data: any = null;
      let rawGames: any[] = [];
      let isFallback = false;
      let isCache = false;

      try {
        const res = await fetch("/api/games?year=2026");
        
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }
        
        data = await res.json();
        if (!data || typeof data !== 'object' || !Array.isArray(data.games)) {
          throw new Error("Invalid API response format");
        }
        rawGames = data.games || [];
        isFallback = data.source === 'fallback' || (data.games && data.games.length > 0 && data.games[0].year && data.games[0].year !== 2026);
        isCache = data.source === 'cache';
        console.log(`Fetched ${rawGames.length} raw games from backend API`);
      } catch (apiErr) {
        console.warn("Backend API games fetch failed, trying direct Squiggle API fetch from browser...", apiErr);
        // Direct browser fetch from Squiggle API
        try {
          const res = await fetch("https://api.squiggle.com.au/?q=games&year=2026");
          if (!res.ok) throw new Error(`Squiggle returned ${res.status}`);
          data = await res.json();
          rawGames = data.games || [];
          isFallback = false;
          isCache = false;
          console.log(`Fetched ${rawGames.length} raw games directly from Squiggle API`);
          
          // If no 2026 games, try 2025 as fallback
          if (rawGames.length === 0) {
            console.log("No 2026 games found on public Squiggle API, trying 2025...");
            const res25 = await fetch("https://api.squiggle.com.au/?q=games&year=2025");
            if (res25.ok) {
              data = await res25.json();
              rawGames = data.games || [];
              isFallback = true;
              console.log(`Fallback: Loaded ${rawGames.length} games for year 2025 from Squiggle API`);
            }
          }
        } catch (squiggleErr) {
          console.error("Direct Squiggle API fetch failed as well:", squiggleErr);
          throw apiErr; // rethrow the original backend API error to be caught by outer try-catch
        }
      }
      
      const sourceInfo = isCache ? 'cache' : (isFallback ? 'fallback' : 'success');
      setApiStatus(prev => ({ ...prev, games: sourceInfo }));
      
      if (rawGames.length === 0 && isInitial) {
        console.warn("No AFL games found in response.");
        setError("No AFL games found for 2026. Please check back later.");
        return;
      }
      
      // Clear error if we successfully got games
      setError(null);
      
      // Process games and identify first game of each round
      const processedGames: Game[] = rawGames
        .filter(g => g.unixtime && !isNaN(Number(g.unixtime)))
        .map(g => ({
          id: g.id,
          round: g.round,
          year: g.year,
          hometeam: g.hteam,
          awayteam: g.ateam,
          date: new Date(Number(g.unixtime) * 1000).toISOString(),
          venue: g.venue,
          winner: g.winner,
          hscore: g.hscore,
          ascore: g.ascore,
          isFinished: g.complete === 100,
          timestr: g.timestr,
          complete: g.complete
        }));

      if (processedGames.length === 0 && isInitial) {
        console.warn("No valid AFL games after processing.");
        setError("No valid AFL games found. Please check back later.");
        return;
      }

      // Sort by date to find first game of round
      processedGames.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const roundFirstGames = new Map<number, number>();
      processedGames.forEach(g => {
        if (!roundFirstGames.has(g.round)) {
          roundFirstGames.set(g.round, g.id);
        }
      });

      const finalGames = processedGames.map(g => ({
        ...g,
        isFirstInRound: roundFirstGames.get(g.round) === g.id
      }));

      setGames(finalGames);
      console.log(`Successfully set ${finalGames.length} games.`);

      // Determine current round based on date (only on initial fetch)
      if (isInitial && finalGames.length > 0) {
        const now = new Date();
        const upcomingGame = finalGames.find(g => g.date && new Date(g.date) > now);
        if (upcomingGame) {
          setCurrentRound(upcomingGame.round);
          setAdminSelectedRound(upcomingGame.round);
          setResultsSelectedRound(upcomingGame.round);
          setFixturesSelectedRound(upcomingGame.round);
          setRecapRound(upcomingGame.round);
        } else {
          const maxRound = Math.max(...finalGames.map(g => g.round), 0);
          if (isFinite(maxRound) && maxRound > 0) {
            setCurrentRound(maxRound);
            setAdminSelectedRound(maxRound);
            setResultsSelectedRound(maxRound);
            setFixturesSelectedRound(maxRound);
            setRecapRound(maxRound);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch games:", err);
      
      // Retry logic for "Failed to fetch" (network errors)
      if (retryCount < 3 && (err instanceof Error && err.message === "Failed to fetch")) {
        console.log(`Retrying fetchGames in 2s... (${retryCount + 1}/3)`);
        setTimeout(() => fetchGames(isInitial, retryCount + 1), 2000);
        return;
      }

      setApiStatus(prev => ({ ...prev, games: 'error' }));
      if (isInitial) setError(`Could not load AFL games: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      if (isInitial) setIsFetchingGames(false);
    }
  };

  // Auto-refresh scores if games are live
  useEffect(() => {
    const hasLiveGames = games.some(g => {
      const now = new Date();
      const gameDate = new Date(g.date);
      return now > gameDate && !g.isFinished;
    });

    if (hasLiveGames) {
      console.log("Live games detected. Starting auto-refresh (60s)...");
      const interval = setInterval(() => {
        fetchGames(false);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [games]);

  const fetchStandings = async (retryCount = 0) => {
    setIsFetchingStandings(true);
    try {
      console.log(`Fetching AFL standings... (Attempt ${retryCount + 1})`);
      let data: any = null;
      let rawStandings: any[] = [];
      let isFallback = false;
      let isCache = false;

      try {
        const res = await fetch("/api/standings?year=2026");
        
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }
        
        data = await res.json();
        if (!data || typeof data !== 'object' || !Array.isArray(data.standings)) {
          throw new Error("Invalid API response format");
        }
        rawStandings = data.standings || [];
        isFallback = data.source === 'fallback';
        isCache = data.source === 'cache';
        console.log(`Fetched ${rawStandings.length} raw standings from backend API`);
      } catch (apiErr) {
        console.warn("Backend API standings fetch failed, trying direct Squiggle API fetch from browser...", apiErr);
        // Direct browser fetch from Squiggle API
        try {
          const res = await fetch("https://api.squiggle.com.au/?q=standings&year=2026");
          if (!res.ok) throw new Error(`Squiggle returned ${res.status}`);
          data = await res.json();
          rawStandings = data.standings || [];
          isFallback = false;
          isCache = false;
          console.log(`Fetched ${rawStandings.length} raw standings directly from Squiggle API`);
          
          // If no 2026 standings, try 2025 as fallback
          if (rawStandings.length === 0) {
            console.log("No 2026 standings found on public Squiggle API, trying 2025...");
            const res25 = await fetch("https://api.squiggle.com.au/?q=standings&year=2025");
            if (res25.ok) {
              data = await res25.json();
              rawStandings = data.standings || [];
              isFallback = true;
              console.log(`Fallback: Loaded ${rawStandings.length} standings for year 2025 from Squiggle API`);
            }
          }
        } catch (squiggleErr) {
          console.error("Direct Squiggle standings fetch failed:", squiggleErr);
          throw apiErr; // rethrow the original backend API error to be caught by outer try-catch
        }
      }
      
      const sourceInfo = isCache ? 'cache' : (isFallback ? 'fallback' : 'success');
      setApiStatus(prev => ({ ...prev, standings: sourceInfo }));
      
      const processedStandings: StandingsItem[] = rawStandings.map(s => ({
        rank: s.rank,
        name: s.name,
        played: s.played,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        pts: s.pts,
        percentage: s.percentage
      }));

      setStandings(processedStandings);
      console.log(`Successfully set ${processedStandings.length} standings.`);
    } catch (err) {
      console.error("Failed to fetch standings:", err);
      
      // Retry logic for "Failed to fetch" (network errors)
      if (retryCount < 3 && (err instanceof Error && err.message === "Failed to fetch")) {
        console.log(`Retrying fetchStandings in 2s... (${retryCount + 1}/3)`);
        setTimeout(() => fetchStandings(retryCount + 1), 2000);
        return;
      }

      setApiStatus(prev => ({ ...prev, standings: 'error' }));
    } finally {
      setIsFetchingStandings(false);
    }
  };

  useEffect(() => {
    fetchGames(true);
    fetchStandings();

    // Poll for score updates every 60 seconds
    const intervalId = setInterval(() => {
      fetchGames(false);
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Listen for Profile Updates
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
    return unsubscribe;
  }, [user]);

  // Listen for Tips
  useEffect(() => {
    if (!user) return;
    const path = 'tips';
    const q = query(collection(db, path), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userTips = snapshot.docs.map(doc => doc.data() as Tip);
      setTips(userTips);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return unsubscribe;
  }, [user]);

  // Listen for All Users and All Tips (for Leaderboard)
  useEffect(() => {
    if (!user || !profile) return;
    
    setIsFetchingUsers(true);
    setIsFetchingTips(true);
    
    // Admins can see full user profiles, others see public profiles
    const usersPath = profile.role === 'admin' ? 'users' : 'public_profiles';
    const unsubUsers = onSnapshot(collection(db, usersPath), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      console.log(`Fetched ${users.length} users from ${usersPath}`);
      setAllUsers(users.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')));
      setIsFetchingUsers(false);
    }, (error) => {
      console.error(`Failed to fetch users from ${usersPath}:`, error);
      setIsFetchingUsers(false);
      handleFirestoreError(error, OperationType.LIST, usersPath);
    });

    const tipsPath = 'tips';
    const unsubTips = onSnapshot(collection(db, tipsPath), (snapshot) => {
      setAllTips(snapshot.docs.map(doc => doc.data() as Tip));
      setIsFetchingTips(false);
    }, (error) => {
      setIsFetchingTips(false);
      handleFirestoreError(error, OperationType.LIST, tipsPath);
    });

    return () => {
      unsubUsers();
      unsubTips();
    };
  }, [user, profile]);

  // Listen for Messages
  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Message);
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });
    return unsubscribe;
  }, []);

  // Check for new direct messages posted to me on login/active refresh
  useEffect(() => {
    if (!user || messages.length === 0) {
      setDirectMessageNotification(null);
      return;
    }
    
    const myDMs = messages.filter(m => m.toUid === user.uid && m.uid !== user.uid);
    if (myDMs.length === 0) {
      setDirectMessageNotification(null);
      return;
    }

    const sortedDMs = [...myDMs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestMsg = sortedDMs[0];

    const seenMapKey = `seen_dm_${user.uid}`;
    const seenIds = JSON.parse(localStorage.getItem(seenMapKey) || '[]');
    
    if (!seenIds.includes(latestMsg.id)) {
      setDirectMessageNotification({
        id: latestMsg.id,
        sender: latestMsg.displayName,
        text: latestMsg.text
      });
    } else {
      setDirectMessageNotification(null);
    }
  }, [user, messages]);

  // Listen for Poll Votes
  useEffect(() => {
    const q = query(collection(db, 'poll_votes'), where('round', '==', currentRound));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const votes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PollVote);
      setPollVotes(votes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'poll_votes');
    });
    return unsubscribe;
  }, [currentRound]);

  // Validate Connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client appears to be offline.");
        }
      }
    }
    testConnection();
  }, []);

  // Monitor Firestore Connectivity
  useEffect(() => {
    if (!db) return;
    setApiStatus(prev => ({ ...prev, firestore: 'success' }));
  }, [db]);

  useEffect(() => {
    setPendingTips({});
  }, [warRoomUserId, currentRound]);

  useEffect(() => {
    if (activeTab === 'fixtures') {
      const element = document.getElementById(`fixture-round-btn-${fixturesSelectedRound}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [fixturesSelectedRound, activeTab]);

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/invalid-credential') {
        setError("Firebase Configuration Error: 'auth/invalid-credential'. This usually means the API key is restricted or the domain is not authorized. Please try running the Firebase setup again.");
      } else {
        setError(`Login failed: ${err.message || "Please try again."}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const saveTip = async (gameId: number, round: number, team: string, margin?: number) => {
    if (!user) return;
    
    if (warRoomUserId !== user.uid && profile?.role !== 'admin') {
      setError("You are not authorized to edit this player's tips.");
      return;
    }

    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Check if locked
    const isLocked = new Date() > new Date(game.date);
    if (isLocked && profile?.role !== 'admin') {
      setError("This game has already started and tips are locked.");
      return;
    }

    setSavingTipId(gameId);
    const tipId = `${warRoomUserId}_${gameId}`;
    const tipData: Tip = {
      uid: warRoomUserId,
      gameId,
      round,
      selectedTeam: team,
      updatedAt: new Date().toISOString()
    };
    if (margin !== undefined) tipData.margin = margin;

    try {
      await setDoc(doc(db, 'tips', tipId), tipData);
    } catch (err) {
      console.error("Failed to save tip:", err);
      setError("Failed to save tip. Check your connection.");
    } finally {
      setSavingTipId(null);
    }
  };

  const stageTip = (gameId: number, round: number, team: string, margin?: number) => {
    if (!user) return;
    
    if (warRoomUserId !== user.uid && profile?.role !== 'admin') {
      setError("You are not authorized to edit this player's tips.");
      return;
    }

    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Check if locked
    const isLocked = new Date() > new Date(game.date);
    if (isLocked && profile?.role !== 'admin') {
      setError("This game has already started and tips are locked.");
      return;
    }

    const tipData: Tip = {
      uid: warRoomUserId,
      gameId,
      round,
      selectedTeam: team,
      updatedAt: new Date().toISOString()
    };
    if (margin !== undefined) tipData.margin = margin;

    setPendingTips(prev => ({
      ...prev,
      [gameId]: tipData
    }));
  };

  const postPendingTips = () => {
    if (Object.keys(pendingTips).length === 0) return;
    setIsConfirmingPost(true);
  };

  const handlePrint = () => {
    console.log("Print initiated. allGamesTipped:", allGamesTipped);
    if (!allGamesTipped) {
      console.warn("Print blocked: Not all games tipped.");
      return;
    }

    try {
      // Ensure the window has focus before printing
      window.focus();
      window.print();
    } catch (err) {
      console.error("Print failed:", err);
      setError("Printing failed. This might be due to browser security settings in the preview. Try opening the app in a new tab to print.");
    }
  };

  const finalizePostTips = async () => {
    const tipsToPost = Object.values(pendingTips) as Tip[];
    if (tipsToPost.length === 0) return;
    
    setIsActionLoading(true);
    try {
      const batch = tipsToPost.map(tipData => {
        const tipId = `${tipData.uid}_${tipData.gameId}`;
        return setDoc(doc(db, 'tips', tipId), tipData);
      });
      await Promise.all(batch);
      setPendingTips({});
      setIsConfirmingPost(false);
    } catch (err) {
      console.error("Failed to post tips:", err);
      setError("Failed to save tips. Check your connection.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const downloadTipsCSV = () => {
    const headers = ['Round', 'Player', 'Email', 'Game', 'Selected Team', 'Margin', 'Updated At'];
    const rows = allTips.map(tip => {
      const user = allUsers.find(u => u.uid === tip.uid);
      const game = games.find(g => g.id === tip.gameId);
      return [
        tip.round,
        user?.displayName || 'Unknown',
        user?.email || 'Unknown',
        game ? `${game.hometeam} v ${game.awayteam}` : 'Unknown',
        tip.selectedTeam,
        tip.margin !== undefined ? tip.margin : '',
        tip.updatedAt
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `afl_tips_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cancelPendingTips = () => {
    setPendingTips({});
    setIsConfirmingPost(false);
  };

  const postMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !newMessage.trim()) return;

    setIsSendingMessage(true);
    try {
      const messageData = {
        uid: user.uid,
        displayName: profile.displayName || 'Anonymous',
        text: newMessage.trim(),
        createdAt: new Date().toISOString(),
        likes: []
      };
      await addDoc(collection(db, 'messages'), messageData);
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const toggleLike = async (messageId: string, likes: string[] = []) => {
    if (!user) return;
    const isLiked = likes.includes(user.uid);
    const newLikes = isLiked 
      ? likes.filter(uid => uid !== user.uid)
      : [...likes, user.uid];
    
    try {
      await updateDoc(doc(db, 'messages', messageId), { likes: newLikes });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `messages/${messageId}`);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `messages/${messageId}`);
    }
  };

  const postProfileMessage = async (e: React.FormEvent, recipientUid: string, recipientName: string) => {
    e.preventDefault();
    if (!user || !profile || !profileNewMessage.trim()) return;

    setIsSendingProfileMessage(true);
    try {
      const messageData = {
        uid: user.uid,
        displayName: profile.displayName || 'Anonymous',
        text: profileNewMessage.trim(),
        createdAt: new Date().toISOString(),
        likes: [],
        toUid: recipientUid,
        toDisplayName: recipientName
      };
      await addDoc(collection(db, 'messages'), messageData);
      setProfileNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    } finally {
      setIsSendingProfileMessage(false);
    }
  };

  const markMessageAsRead = (msgId: string) => {
    if (!user) return;
    const seenMapKey = `seen_dm_${user.uid}`;
    const seenIds = JSON.parse(localStorage.getItem(seenMapKey) || '[]');
    if (!seenIds.includes(msgId)) {
      seenIds.push(msgId);
      localStorage.setItem(seenMapKey, JSON.stringify(seenIds));
    }
    setDirectMessageNotification(null);
  };

  const castPollVote = async (gameId: number, vote: 'home' | 'away', gameRound: number) => {
    if (!user) return;
    
    // Check if user already voted for this game
    const existingVote = pollVotes.find(v => v.gameId === gameId && v.uid === user.uid);
    if (existingVote) {
      if (existingVote.vote === vote) {
        // Toggle off
        try {
          await deleteDoc(doc(db, 'poll_votes', existingVote.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `poll_votes/${existingVote.id}`);
        }
      } else {
        // Switch vote
        try {
          await updateDoc(doc(db, 'poll_votes', existingVote.id), { vote, createdAt: new Date().toISOString() });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `poll_votes/${existingVote.id}`);
        }
      }
    } else {
      // New vote
      try {
        await addDoc(collection(db, 'poll_votes'), {
          gameId,
          uid: user.uid,
          vote,
          round: gameRound,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'poll_votes');
      }
    }
  };

  const getRoundOutlook = async () => {
    if (roundOutlook) return; // Only fetch once per session or when round changes

    setIsOutlookLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      const roundGamesList = games.filter(g => g.round === currentRound);
      
      const prompt = `As the AFL "War Room" Strategist, provide a punchy high-level outlook for Round ${currentRound} of the 2026 Season. 
      Analyze these matches: ${roundGamesList.map(g => `${g.hometeam} vs ${g.awayteam}`).join(', ')}.
      Who are the "Lock of the Week" and the "Danger Game"? (Total 80 words max). Use Aussie footy slang.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setRoundOutlook(response.text || "Outlook unclear. Play hard!");
    } catch (err) {
      console.error("Outlook failed:", err);
      setRoundOutlook("Scout is recalibrating sensors for the round. Check back soon!");
    } finally {
      setIsOutlookLoading(false);
    }
  };

  const leaderboardData = useMemo(() => {
    // Calculate previous ranks first
    const finishedRounds = games.filter(g => g.isFinished).map(g => g.round);
    const latestFinishedRound = finishedRounds.length > 0 ? Math.max(...finishedRounds) : 0;
    
    const prevRanksMap: Record<string, number> = {};
    if (latestFinishedRound > 0) {
      const prevGames = games.filter(g => g.isFinished && g.round < latestFinishedRound);
      if (prevGames.length > 0) {
        const prevData = allUsers.map(u => {
          const userTips = allTips.filter(t => t.uid === u.uid);
          let prevPoints = 0;
          let prevMarginError = 0;

          // Draw points - Every player gets 1 point for every finished draw in these previous games
          const drawnPrevGames = prevGames.filter(g => g.hscore !== null && g.ascore !== null && g.hscore === g.ascore).length;
          prevPoints += drawnPrevGames;

          prevGames.forEach(game => {
            const tip = userTips.find(t => t.gameId === game.id);
            const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
            if (game.hscore === game.ascore) return;

            if (tip) {
              if (game.winner === tip.selectedTeam) {
                prevPoints += 1;
                if (game.isFirstInRound && tip.margin !== undefined) {
                  if (tip.margin === actualMargin) {
                    prevPoints += 1;
                  }
                  prevMarginError += Math.abs(tip.margin - actualMargin);
                }
              } else if (game.isFirstInRound && tip.margin !== undefined) {
                prevMarginError += Math.abs(tip.margin - actualMargin);
              }
            } else {
              if (game.winner === game.awayteam) {
                prevPoints += 1;
              }
            }
          });

          return {
            uid: u.uid,
            prevPoints,
            prevMarginError
          };
        });

        const prevRanked = [...prevData].sort((a, b) => {
          if (b.prevPoints !== a.prevPoints) {
            return b.prevPoints - a.prevPoints;
          }
          return a.prevMarginError - b.prevMarginError;
        });

        prevRanked.forEach((item, index) => {
          prevRanksMap[item.uid] = index + 1;
        });
      }
    }

    const data = allUsers.map(u => {
      const userTips = allTips.filter(t => t.uid === u.uid);
      let points = 0;
      let marginError = 0;

      // Draw points - Every player gets 1 point for every finished draw in the season
      const drawnGamesCount = games.filter(g => g.isFinished && g.hscore !== null && g.ascore !== null && g.hscore === g.ascore).length;
      points += drawnGamesCount;

      games.filter(g => g.isFinished).forEach(game => {
        const tip = userTips.find(t => t.gameId === game.id);
        const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
        const isDraw = game.hscore === game.ascore;

        if (isDraw) return;

        if (tip) {
          // Correct tip
          if (game.winner === tip.selectedTeam) {
            points += 1;
            
            // Bonus point for margin on first game
            if (game.isFirstInRound && tip.margin !== undefined) {
              if (tip.margin === actualMargin) {
                points += 1; // Perfect margin bonus
              }
              marginError += Math.abs(tip.margin - actualMargin);
            }
          } else if (game.isFirstInRound && tip.margin !== undefined) {
            marginError += Math.abs(tip.margin - actualMargin);
          }
        } else {
          // Missing tip: Point for away team win
          if (game.winner === game.awayteam) {
            points += 1;
          }
        }
      });

      // Calculate Form (Last 5 finished games)
      const finishedGamesWithTips = games
        .filter(g => g.isFinished)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      
      const form = finishedGamesWithTips.map(game => {
        const tip = userTips.find(t => t.gameId === game.id);
        if (game.hscore === game.ascore) return 'D';
        if (!tip) {
          // No tip: Win if away team won
          return game.winner === game.awayteam ? 'W' : 'L';
        }
        return game.winner === tip.selectedTeam ? 'W' : 'L';
      }).reverse();

      return {
        ...u,
        calculatedPoints: points,
        calculatedMargin: marginError,
        form: form,
        prevRank: prevRanksMap[u.uid]
      } as LeaderboardItem;
    });

    // First, sort by default rank to assign ranks
    const rankedData = [...data].sort((a, b) => {
      if (b.calculatedPoints !== a.calculatedPoints) {
        return b.calculatedPoints - a.calculatedPoints;
      }
      return a.calculatedMargin - b.calculatedMargin;
    }).map((item, index) => ({ ...item, rank: index + 1 }));

    // Apply sorting
    return rankedData.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (leaderboardSort.key) {
        case 'displayName':
          valA = a.displayName.toLowerCase();
          valB = b.displayName.toLowerCase();
          break;
        case 'points':
          valA = a.calculatedPoints;
          valB = b.calculatedPoints;
          break;
        case 'marginError':
          valA = a.calculatedMargin;
          valB = b.calculatedMargin;
          break;
        case 'rank':
        default:
          valA = a.rank;
          valB = b.rank;
          break;
      }

      if (valA < valB) return leaderboardSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return leaderboardSort.direction === 'asc' ? 1 : -1;
      
      // Secondary sort for stability
      if (leaderboardSort.key !== 'points') {
        if (a.calculatedPoints !== b.calculatedPoints) return b.calculatedPoints - a.calculatedPoints;
      }
      return a.calculatedMargin - b.calculatedMargin;
    });
  }, [allUsers, allTips, games, leaderboardSort]);

  const leader = useMemo(() => leaderboardData.find(u => u.rank === 1), [leaderboardData]);
  const lastPlace = useMemo(() => {
    if (leaderboardData.length === 0) return null;
    const maxRank = Math.max(...leaderboardData.map(u => u.rank), 0);
    return leaderboardData.find(u => u.rank === maxRank);
  }, [leaderboardData]);
  const nextGame = useMemo(() => {
    const now = new Date();
    return games.find(g => new Date(g.date) > now);
  }, [games]);

  const roundSummaryData = useMemo(() => {
    const data = allUsers.map(u => {
      const userTips = allTips.filter(t => t.uid === u.uid && t.round === resultsSelectedRound);
      let correct = 0;
      let points = 0;
      let marginError = 0;

      // Draw points - Every player gets 1 point for every finished draw in the selected round
      const drawnGamesInRound = games.filter(g => g.round === resultsSelectedRound && g.isFinished && g.hscore !== null && g.ascore !== null && g.hscore === g.ascore);
      points += drawnGamesInRound.length;

      games.filter(g => g.round === resultsSelectedRound && g.isFinished).forEach(game => {
        const tip = userTips.find(t => t.gameId === game.id);
        const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
        const isDraw = game.hscore === game.ascore;

        if (isDraw) return;

        if (tip) {
          if (game.winner === tip.selectedTeam) {
            correct += 1;
            points += 1;
            if (game.isFirstInRound && tip.margin !== undefined) {
              if (tip.margin === actualMargin) points += 1;
              marginError += Math.abs(tip.margin - actualMargin);
            }
          } else if (game.isFirstInRound && tip.margin !== undefined) {
            marginError += Math.abs(tip.margin - actualMargin);
          }
        } else {
          // Missing tip: Point for away team win
          if (game.winner === game.awayteam) {
            points += 1;
          }
        }
      });

      return {
        ...u,
        correct,
        points,
        marginError
      };
    });

    // First, sort by default rank to assign ranks
    const rankedData = [...data].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.marginError - b.marginError;
    }).map((item, index) => ({ ...item, rank: index + 1 }));

    // Apply sorting
    return rankedData.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (resultsRoundSummarySort.key) {
        case 'displayName':
          valA = a.displayName.toLowerCase();
          valB = b.displayName.toLowerCase();
          break;
        case 'correct':
          valA = a.correct;
          valB = b.correct;
          break;
        case 'points':
          valA = a.points;
          valB = b.points;
          break;
        case 'marginError':
          valA = a.marginError;
          valB = b.marginError;
          break;
        case 'rank':
        default:
          valA = a.rank;
          valB = b.rank;
          break;
      }

      if (valA < valB) return resultsRoundSummarySort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return resultsRoundSummarySort.direction === 'asc' ? 1 : -1;
      
      if (resultsRoundSummarySort.key !== 'points') {
        if (a.points !== b.points) return b.points - a.points;
      }
      return a.marginError - b.marginError;
    });
  }, [allUsers, allTips, games, resultsSelectedRound, resultsRoundSummarySort]);

  const userResults = useMemo(() => {
    const targetUserId = resultsUserId || user?.uid;
    if (!targetUserId) return [];
    
    const roundsList = Array.from(new Set(games.map(g => g.round))).sort((a: any, b: any) => a - b);
    const targetUserTips = allTips.filter(t => t.uid === targetUserId);
    
    const data = roundsList.map(r => {
      const allRoundGames = games.filter(g => g.round === r);
      const finishedRoundGames = allRoundGames.filter(g => g.isFinished);
      const roundTips = targetUserTips.filter(t => t.round === r);
      
      let correct = 0;
      let points = 0;
      let marginError = 0;
      
      finishedRoundGames.forEach(game => {
        const tip = roundTips.find(t => t.gameId === game.id);
        const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
        
        if (game.hscore === game.ascore) return;

        if (tip) {
          if (game.winner === tip.selectedTeam) {
            correct += 1;
            points += 1;
            if (game.isFirstInRound && tip.margin !== undefined) {
              if (tip.margin === actualMargin) points += 1;
              marginError += Math.abs(tip.margin - actualMargin);
            }
          } else if (game.isFirstInRound && tip.margin !== undefined) {
            marginError += Math.abs(tip.margin - actualMargin);
          }
        } else {
          // Missing tip: Point for away team win
          if (game.winner === game.awayteam) {
            points += 1;
          }
        }
      });
      
      return {
        round: r,
        correct,
        points,
        marginError,
        totalGames: allRoundGames.length,
        finishedGames: finishedRoundGames.length
      };
    }).filter(r => r.totalGames > 0);

    // Apply sorting
    return [...data].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (resultsIndividualSort.key) {
        case 'round':
          valA = a.round;
          valB = b.round;
          break;
        case 'correct':
          valA = a.correct;
          valB = b.correct;
          break;
        case 'points':
          valA = a.points;
          valB = b.points;
          break;
        case 'marginError':
          valA = a.marginError;
          valB = b.marginError;
          break;
        default:
          valA = a.round;
          valB = b.round;
      }

      if (valA < valB) return resultsIndividualSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return resultsIndividualSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [resultsUserId, user, games, allTips, resultsIndividualSort]);

  const resultsChartData = useMemo(() => {
    const fullData = [...userResults]
      .filter(r => r.finishedGames > 0)
      .sort((a, b) => a.round - b.round);

    const mapped = fullData.map((r, idx) => {
      const prevRoundData = idx > 0 ? fullData[idx - 1] : null;
      const change = prevRoundData !== null ? r.correct - prevRoundData.correct : null;
      return {
        name: r.round === 0 ? "Opening" : `Round ${r.round}`,
        "Correct Tips": r.correct,
        "Total Games": r.totalGames,
        "Points": r.points,
        "Margin": r.marginError,
        "Change": change
      };
    });

    if (resultsChartRange === '5') {
      return mapped.slice(-5);
    } else if (resultsChartRange === '10') {
      return mapped.slice(-10);
    }
    return mapped;
  }, [userResults, resultsChartRange]);

  const handleSort = (section: 'leaderboard' | 'individual' | 'summary', key: string) => {
    if (section === 'leaderboard') {
      setLeaderboardSort(prev => {
        const next: { key: string; direction: 'asc' | 'desc' } = {
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        };
        localStorage.setItem('leaderboardSort', JSON.stringify(next));
        return next;
      });
    } else if (section === 'individual') {
      setResultsIndividualSort(prev => {
        const next: { key: string; direction: 'asc' | 'desc' } = {
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        };
        localStorage.setItem('resultsIndividualSort', JSON.stringify(next));
        return next;
      });
    } else if (section === 'summary') {
      setResultsRoundSummarySort(prev => {
        const next: { key: string; direction: 'asc' | 'desc' } = {
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        };
        localStorage.setItem('resultsRoundSummarySort', JSON.stringify(next));
        return next;
      });
    }
  };

  const exportToCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let fileName = 'tipping_results.csv';
    const targetUser = allUsers.find(u => u.uid === (resultsUserId || user?.uid));

    if (resultsSubTab === 'individual') {
      if (!userResults.length) return;
      headers = ['Round', 'Correct Tips', 'Total Points', 'Margin Error'];
      rows = userResults.map(r => [r.round, r.correct, r.points, r.marginError]);
      fileName = `tipping_results_${targetUser?.displayName || 'user'}_2026.csv`;
    } else if (resultsSubTab === 'round-summary') {
      if (!roundSummaryData.length) return;
      headers = ['Pos', 'Player', 'Correct', 'Points', 'Margin Error'];
      rows = roundSummaryData.map((u, idx) => [idx + 1, u.displayName, u.correct, u.points, u.marginError]);
      fileName = `round_${resultsSelectedRound}_summary.csv`;
    }
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPlayerSelectionsCSV = () => {
    if (!games.length || !rounds.length) return;
    
    const roundsList = rounds;
    const maxGamesPerRound = Math.max(...roundsList.map((r: any) => games.filter(g => g.round === r).length), 0);
    
    // Header
    let csvContent = "Player,Email";
    roundsList.forEach(r => {
      const label = getRoundLabel(r as number);
      csvContent += `,"${label} Points"`;
    });
    csvContent += "\n";

    // Data
    allUsers.forEach(u => {
      let row = `"${(u.displayName || '').replace(/"/g, '""')}","${(u.email || '').replace(/"/g, '""')}"`;
      roundsList.forEach(r => {
        const roundGames = games.filter(g => g.round === r);
        const userTips = allTips.filter(t => t.uid === u.uid);
        
        const roundTips = userTips.filter(t => roundGames.some(g => g.id === t.gameId));
        const correctTips = roundTips.filter(tip => {
          const game = games.find(g => g.id === tip.gameId);
          return game && game.isFinished && game.winner === tip.selectedTeam;
        }).length;

        row += `,${correctTips}`;
      });
      csvContent += row + "\n";
    });

    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `afl_tipping_selections_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const randomiseRound = () => {
    if (!user || !roundGames.length) return;
    
    if (warRoomUserId !== user.uid && profile?.role !== 'admin') {
      setError("You are not authorized to edit this player's tips.");
      return;
    }

    const newPending: Record<number, Tip> = { ...pendingTips };
    roundGames.forEach(game => {
      const isLocked = new Date() > new Date(game.date);
      if (isLocked && profile?.role !== 'admin') return;

      const randomWinner = Math.random() > 0.5 ? game.hometeam : game.awayteam;
      const randomMargin = game.isFirstInRound ? Math.floor(Math.random() * 40) + 1 : undefined;
      
      const tipData: Tip = {
        uid: warRoomUserId,
        gameId: game.id,
        round: game.round,
        selectedTeam: randomWinner,
        updatedAt: new Date().toISOString()
      };
      if (randomMargin !== undefined) tipData.margin = randomMargin;
      
      newPending[game.id] = tipData;
    });

    setPendingTips(newPending);
  };

  const handleAdminTipUpdate = async (gameId: number, selectedTeam: string, margin?: number) => {
    if (profile?.role !== 'admin' || !adminSelectedUserId) {
      setError("Admin authorization required and a user must be selected.");
      return;
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    setIsActionLoading(true);
    const tipId = `${adminSelectedUserId}_${gameId}`;
    const tipData: any = {
      uid: adminSelectedUserId,
      gameId: gameId,
      round: game.round,
      selectedTeam: selectedTeam,
      updatedAt: new Date().toISOString()
    };
    if (margin !== undefined) tipData.margin = margin;

    try {
      await setDoc(doc(db, 'tips', tipId), tipData, { merge: true });
    } catch (err) {
      console.error("Admin tip update failed:", err);
      setError("Failed to update player tip.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAdminDeleteTip = async (gameId: number) => {
    if (!adminSelectedUserId) return;
    const tipId = `${adminSelectedUserId}_${gameId}`;
    setIsActionLoading(true);
    try {
      await deleteDoc(doc(db, 'tips', tipId));
    } catch (err) {
      console.error("Admin tip delete failed:", err);
      setError("Failed to delete player tip.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleCreateUser called", { newUserName, newUserEmail, newUserRole });
    
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setError("Please provide both a name and an email.");
      return;
    }

    // Check if user already exists
    const existingUser = allUsers.find(u => u.email.toLowerCase() === newUserEmail.trim().toLowerCase());
    if (existingUser) {
      console.log("User already exists", existingUser);
      setError("A user with this email already exists.");
      return;
    }

    setIsActionLoading(true);
    setError(null);
    const tempUid = `manual_${Date.now()}`;
    console.log("Creating user with tempUid:", tempUid);
    
    const newProfile: UserProfile = {
      uid: tempUid,
      displayName: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      totalPoints: 0,
      totalMargin: 0
    };

    try {
      console.log("Writing to users collection...");
      await setDoc(doc(db, 'users', tempUid), newProfile);
      
      console.log("Writing to public_profiles collection...");
      // Also create public profile for manual users
      await setDoc(doc(db, 'public_profiles', tempUid), {
        uid: tempUid,
        displayName: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        role: newUserRole,
        totalPoints: 0,
        totalMargin: 0,
        favoriteTeam: ''
      });
      
      console.log("User created successfully");
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('user');
    } catch (err) {
      console.error("Failed to create user:", err);
      handleFirestoreError(err, OperationType.WRITE, `users/${tempUid}`);
      setError("Failed to create user profile. Check your permissions.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsActionLoading(true);
    try {
      // 1. Delete user profile
      await deleteDoc(doc(db, 'users', userId));
      // 2. Delete public profile
      await deleteDoc(doc(db, 'public_profiles', userId));
      
      // 3. Delete user tips
      const userTipsQuery = query(collection(db, 'tips'), where('uid', '==', userId));
      const tipsSnapshot = await getDocs(userTipsQuery);
      const deletePromises = tipsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      
      if (adminSelectedUserId === userId) setAdminSelectedUserId('');
      setUserToDelete(null);
    } catch (err) {
      console.error("Failed to delete user:", err);
      setError("Failed to delete user data.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateUsername = async (userId: string) => {
    if (!editingUserName.trim()) return;

    setIsActionLoading(true);
    setError(null);
    try {
      const updates = {
        displayName: editingUserName.trim(),
        favoriteTeam: editingUserFavoriteTeam,
        role: editingUserRole
      };
      await updateDoc(doc(db, 'users', userId), updates);
      // Use setDoc with merge: true to ensure public profile exists
      await setDoc(doc(db, 'public_profiles', userId), updates, { merge: true });
      setEditingUserId(null);
      setEditingUserName('');
      setEditingUserFavoriteTeam('');
      setEditingUserRole('user');
    } catch (err) {
      console.error("Failed to update user:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      setError("Failed to update user profile.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateSelfName = async () => {
    if (!user || !selfDisplayName.trim()) return;

    setIsActionLoading(true);
    try {
      const updates = {
        displayName: selfDisplayName.trim(),
        favoriteTeam: selfFavoriteTeam
      };
      await updateDoc(doc(db, 'users', user.uid), updates);
      // Use setDoc with merge: true to ensure public profile exists
      await setDoc(doc(db, 'public_profiles', user.uid), updates, { merge: true });
      setIsEditingSelf(false);
    } catch (err) {
      console.error("Failed to update self name:", err);
      setError("Failed to update your display name.");
    } finally {
      setIsActionLoading(false);
    }
  };


  const roundGames = games.filter(g => g.round === currentRound);
  const activeGameId = useMemo(() => {
    const now = new Date();
    // 1. Check for live games
    const liveGame = roundGames.find(g => !g.isFinished && new Date(g.date) <= now);
    if (liveGame) return liveGame.id;
    
    // 2. Otherwise find the next upcoming game
    const nextGame = [...roundGames]
      .filter(g => !g.isFinished && new Date(g.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    return nextGame?.id || null;
  }, [roundGames]);

  const warRoomTips = useMemo(() => {
    // Use the more reactive 'tips' state if we're looking at the current user's tips
    const baseTips = warRoomUserId === user?.uid 
      ? tips 
      : allTips.filter(t => t.uid === warRoomUserId);
    
    // Merge with pending tips
    const mergedTips = [...baseTips];
    (Object.values(pendingTips) as Tip[]).forEach(pendingTip => {
      if (pendingTip.uid === warRoomUserId) {
        const index = mergedTips.findIndex(t => t.gameId === pendingTip.gameId);
        if (index !== -1) {
          mergedTips[index] = pendingTip;
        } else {
          mergedTips.push(pendingTip);
        }
      }
    });
    return mergedTips;
  }, [allTips, tips, warRoomUserId, user?.uid, pendingTips]);

  const allGamesTipped = useMemo(() => {
    if (roundGames.length === 0) return false;
    const tippedCount = roundGames.filter(game => warRoomTips.some(t => t.gameId === game.id)).length;
    console.log(`Tipping progress: ${tippedCount}/${roundGames.length}`);
    return tippedCount === roundGames.length;
  }, [roundGames, warRoomTips]);

  const tippedCount = useMemo(() => {
    return roundGames.filter(game => warRoomTips.some(t => t.gameId === game.id)).length;
  }, [roundGames, warRoomTips]);
  
  const accentColor = useMemo(() => {
    if (profile?.favoriteTeam && AFL_TEAM_COLORS[profile.favoriteTeam]) {
      return AFL_TEAM_COLORS[profile.favoriteTeam];
    }
    return '#10b981'; // Default Emerald Green
  }, [profile]);

  const rounds = useMemo(() => {
    const rSet = new Set(games.map(g => g.round));
    return Array.from(rSet).sort((a: any, b: any) => a - b);
  }, [games]);

  const getRoundLabel = (r: number) => {
    if (r === 0) return "Opening Round";
    if (r === 25) return "Finals Week 1";
    if (r === 26) return "Semi Finals";
    if (r === 27) return "Preliminary Finals";
    if (r === 28) return "Grand Final";
    return `Round ${r}`;
  };

  if (loading || isFetchingGames || isFetchingStandings) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex items-center justify-center relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ 
            background: `radial-gradient(circle at center, ${accentColor} 0%, transparent 70%)`
          }}
        />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: accentColor }}
          ></div>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-mono animate-pulse">
            {loading ? "Authenticating..." : "Loading AFL Data..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] dark:bg-stone-950 flex flex-col items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ 
            background: `radial-gradient(circle at top right, ${accentColor} 0%, transparent 40%), radial-gradient(circle at bottom left, #FFCC33 0%, transparent 40%)`
          }}
        />
        <div className="max-w-md w-full bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-xl border border-black/5 dark:border-white/5 transition-colors relative z-10">
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 text-afl-gold mx-auto mb-6" />
            <h1 className="text-4xl font-serif italic mb-2 text-stone-900 dark:text-stone-100">Family and Friends AFL Tipping</h1>
            <p className="text-stone-500 dark:text-stone-400 font-sans">AFL 2026 Season • Family & Friends</p>
          </div>

          <form onSubmit={isSignUpMode ? handleEmailSignUp : handleEmailSignIn} className="space-y-4 mb-6">
            {isSignUpMode && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Display Name</label>
                <input 
                  type="text"
                  value={authDisplayName}
                  onChange={(e) => setAuthDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                  required
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Email Address</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                required
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-afl-navy text-white rounded-xl font-bold hover:bg-afl-navy/90 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {authLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                isSignUpMode ? "Create Account" : "Sign In"
              )}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200 dark:border-stone-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-stone-900 px-2 text-stone-400 font-mono">Or continue with</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogin}
            disabled={authLoading}
            className="w-full py-4 bg-black dark:bg-stone-100 dark:text-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {authLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
            ) : (
              <>
                <User className="w-5 h-5" />
                Sign in with Google
              </>
            )}
          </button>
          
          <button 
            onClick={() => {
              setIsSignUpMode(!isSignUpMode);
              setAuthError(null);
            }}
            className="w-full mt-6 text-sm font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            {isSignUpMode ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300">
      <div className="print:hidden flex flex-col min-h-screen">
        {/* Header */}
      <header className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-b border-stone-200 dark:border-stone-800 sticky top-0 z-50 transition-colors duration-300 w-full">
        <div className="px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6 text-stone-600 dark:text-stone-400" />
            </button>
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all"
              style={{ 
                backgroundColor: accentColor,
                boxShadow: `0 8px 16px ${accentColor}40`
              }}
            >
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif italic tracking-tight dark:text-stone-100">Family and Friends AFL Tipping</h1>
                <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-md shadow-sm">v6.0 Live</span>
                <span className="px-1.5 py-0.5 bg-stone-700 text-stone-300 text-[8px] font-black uppercase rounded-md shadow-sm ml-1">
                  {typeof window !== 'undefined' && window.location.hostname.includes('-pre-') ? 'Shared Snapshot' : 'Live Dev'}
                </span>
              </div>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">2026 Season • Build 0152</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              {isEditingSelf ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={selfDisplayName}
                    onChange={(e) => setSelfDisplayName(e.target.value)}
                    className="p-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-[10px] font-bold outline-none focus:ring-1 focus:ring-afl-accent text-stone-900 dark:text-stone-100 w-24"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateSelfName()}
                  />
                  <select 
                    value={selfFavoriteTeam}
                    onChange={(e) => setSelfFavoriteTeam(e.target.value)}
                    className="p-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-[10px] font-bold outline-none focus:ring-1 focus:ring-afl-accent text-stone-900 dark:text-stone-100"
                  >
                    <option value="">No Team</option>
                    {AFL_TEAMS.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleUpdateSelfName} 
                    disabled={isActionLoading}
                    className="text-afl-accent disabled:opacity-50"
                  >
                    {isActionLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-afl-accent"></div>
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                  </button>
                  <button 
                    onClick={() => setIsEditingSelf(false)} 
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-end group">
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      {profile?.displayName}
                    </p>
                    <p className="text-[10px] text-stone-400 uppercase tracking-tighter">{profile?.role}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsEditingSelf(true);
                      setSelfDisplayName(profile?.displayName || '');
                      setSelfFavoriteTeam(profile?.favoriteTeam || '');
                    }}
                    className="p-1 text-stone-300 hover:text-stone-600 dark:hover:text-stone-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
              <LogOut className="w-5 h-5 text-stone-400" />
            </button>
            <button 
              onClick={() => {
                const newDarkMode = !darkMode;
                setDarkMode(newDarkMode);
                if (user) {
                  updateDoc(doc(db, 'users', user.uid), {
                    'preferences.darkMode': newDarkMode
                  }).catch(err => console.error("Failed to update dark mode preference:", err));
                }
              }} 
              className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-stone-400" />
              ) : (
                <Moon className="w-5 h-5 text-stone-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Mobile Backdrop */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={cn(
          "w-60 bg-afl-navy text-white flex flex-col fixed lg:sticky top-0 lg:top-20 h-screen lg:h-[calc(100vh-5rem)] z-[60] lg:z-40 border-r border-white/10 transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="lg:hidden p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-afl-accent" />
              <span className="font-serif italic text-base">Menu</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1.5 p-4">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em] mb-3 ml-3">Command Center</p>
            {[
              { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
              { id: 'war-room', label: 'Tips', icon: Calendar },
              { id: 'fixtures', label: 'AFL Fixtures', icon: FileSpreadsheet },
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              { id: 'standings', label: 'AFL Ladder', icon: BarChart3 },
              { id: 'results', label: 'Results', icon: CheckCircle2 },
              { id: 'message-board', label: 'Message Board', icon: MessageSquare },
            ].map((tab) => {
              const hasLiveGames = tab.id === 'war-room' && games.some(g => new Date() > new Date(g.date) && !g.isFinished);
              const showDot = (tab.id === 'war-room' && hasLiveGames) || (tab.id === 'message-board' && hasNewMessages);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsMobileMenuOpen(false);
                    if (tab.id === 'message-board') {
                      const now = Date.now();
                      setLastViewedMessages(now);
                      localStorage.setItem('lastViewedMessages', now.toString());
                    }
                  }}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-3 relative overflow-hidden group",
                    activeTab === tab.id 
                      ? "text-white shadow-lg" 
                      : "text-stone-400 hover:text-white hover:bg-white/5"
                  )}
                  style={activeTab === tab.id ? { 
                    backgroundColor: accentColor,
                    boxShadow: `0 8px 20px ${accentColor}30`
                  } : {}}
                >
                  <tab.icon className={cn("w-5 h-5 transition-colors", activeTab === tab.id ? "text-white" : "text-stone-500 group-hover:text-stone-300")} />
                  {tab.label}
                  {showDot && (
                    <span className={cn(
                      "absolute top-4 right-4 w-2 h-2 rounded-full animate-pulse",
                      tab.id === 'war-room' ? "bg-red-500" : "bg-afl-gold shadow-[0_0_8px_rgba(255,193,7,0.8)]"
                    )} />
                  )}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-white/5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                </button>
              );
            })}
            
            {profile?.role === 'admin' && (
              <>
                <div className="h-px bg-white/10 my-3 mx-3" />
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em] mb-3 ml-3">Administration</p>
                <button 
                  onClick={() => {
                    setActiveTab('admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-3 relative overflow-hidden group",
                    activeTab === 'admin' 
                      ? "text-white shadow-lg" 
                      : "text-stone-400 hover:text-white hover:bg-white/5"
                  )}
                  style={activeTab === 'admin' ? { 
                    backgroundColor: accentColor,
                    boxShadow: `0 8px 20px ${accentColor}30`
                  } : {}}
                >
                  <Shield className={cn("w-5 h-5 transition-colors", activeTab === 'admin' ? "text-white" : "text-stone-500 group-hover:text-stone-300")} />
                  Admin Controls
                </button>
              </>
            )}
            

          </nav>
          
          <div className="mt-auto p-4 border-t border-white/5">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">System Status</p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-stone-300 font-mono">Cloud Sync Active</span>
                </div>
                <span className="text-[8px] text-stone-600 font-mono mt-1">Build: 2026.04.12.0152</span>
                <span className="text-[8px] text-stone-700 font-mono">Host: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="px-6 py-8 flex-1">
            {/* Direct Message Notification Bar */}
            {directMessageNotification && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-3xl flex items-center justify-between gap-4 text-emerald-800 dark:text-emerald-300 text-sm animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">New message received!</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <span className="font-semibold">{directMessageNotification.sender}</span> left a note on your wall: <span className="italic">"{directMessageNotification.text}"</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setActiveTab('player-profile');
                      setSelectedProfileUserId(user?.uid || null);
                      markMessageAsRead(directMessageNotification.id);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap"
                  >
                    View My Wall
                  </button>
                  <button 
                    onClick={() => markMessageAsRead(directMessageNotification.id)}
                    className="p-1 px-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 flex items-center justify-between gap-4">
              <p>{error}</p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setError(null);
                    fetchGames(true);
                    fetchStandings();
                  }} 
                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-xs"
                >
                  Retry
                </button>
                <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-4xl font-serif italic text-stone-900 dark:text-stone-100">
                  Welcome back, {profile?.displayName?.split(' ')[0] || 'Player'}
                </h2>
                <p className="text-stone-500 dark:text-stone-400 font-mono text-xs uppercase tracking-[0.3em] mt-1">Season 2026 Overview</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-stone-900 px-6 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Current Round</p>
                  <p className="text-xl font-serif font-bold text-afl-accent">Round {currentRound}</p>
                </div>
              </div>
            </div>

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {/* Round Outlook Card */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="lg:col-span-4 bg-gradient-to-r from-afl-navy to-stone-900 rounded-3xl border border-white/10 p-8 shadow-xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Star className="w-24 h-24 text-afl-accent" />
                </div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-afl-accent/20 rounded-xl text-afl-accent">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">Round {currentRound} Outlook</h3>
                        <p className="text-[10px] font-mono text-stone-400">Provided by War Room Intelligence</p>
                      </div>
                    </div>
                    {!roundOutlook && !isOutlookLoading && (
                      <button 
                        onClick={getRoundOutlook}
                        className="px-6 py-2.5 bg-afl-accent text-afl-navy rounded-xl text-[10px] font-bold uppercase tracking-widest hover:shadow-[0_0_15px_rgba(255,193,7,0.5)] transition-all"
                      >
                        Generate Outlook
                      </button>
                    )}
                  </div>
                  
                  {isOutlookLoading ? (
                    <div className="flex items-center gap-3 py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-afl-accent" />
                      <p className="text-sm font-serif italic text-stone-300">Scouting the grounds...</p>
                    </div>
                  ) : roundOutlook ? (
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 relative">
                      <p className="text-sm text-stone-100 leading-relaxed font-serif italic animate-in fade-in slide-in-from-left-4">
                        "{roundOutlook}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400 font-serif italic">Get the latest tactical intel for the upcoming round.</p>
                  )}
                </div>
              </motion.div>
              {/* Tipping Progress */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Calendar className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-6">Round {currentRound} Progress</h3>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <span className="text-5xl font-serif font-bold text-stone-900 dark:text-stone-100">{tippedCount}</span>
                      <span className="text-xl text-stone-400 ml-2">/ {roundGames.length} Tips</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-stone-500 uppercase">Completion</p>
                      <p className="text-lg font-mono font-bold text-afl-accent">
                        {roundGames.length > 0 ? Math.round((tippedCount / roundGames.length) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${roundGames.length > 0 ? (tippedCount / roundGames.length) * 100 : 0}%` }}
                      className="h-full bg-afl-accent shadow-[0_0_15px_rgba(255,193,7,0.4)]"
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <button 
                    onClick={() => setActiveTab('war-room')}
                    className="mt-8 w-full py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl text-sm font-bold hover:bg-stone-800 dark:hover:bg-white transition-all flex items-center justify-center gap-2 group"
                  >
                    Enter Your Tips <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>

              {/* Next Game Card */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="lg:col-span-2 bg-afl-navy text-white rounded-3xl border border-white/10 p-8 shadow-xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-afl-navy via-stone-900 to-black opacity-50" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Up Next</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-bold uppercase animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Live Soon
                    </div>
                  </div>
                  
                  {nextGame ? (
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="text-center flex-1">
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-3 border border-white/10">
                            <span className="text-2xl font-black">{nextGame.hometeam.charAt(0)}</span>
                          </div>
                          <p className="text-sm font-bold truncate">{nextGame.hometeam}</p>
                        </div>
                        <div className="text-center px-4">
                          <p className="text-2xl font-serif italic text-stone-500">vs</p>
                        </div>
                        <div className="text-center flex-1">
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-3 border border-white/10">
                            <span className="text-2xl font-black">{nextGame.awayteam.charAt(0)}</span>
                          </div>
                          <p className="text-sm font-bold truncate">{nextGame.awayteam}</p>
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-afl-gold uppercase tracking-widest">{nextGame.venue}</p>
                        <p className="text-xl font-mono font-bold">{safeFormatInTimeZone(nextGame.date, AWST_TIMEZONE, 'EEE d MMM, h:mm a')}</p>
                        <CountdownTimer targetDate={nextGame.date} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-stone-500 italic font-serif">
                      No upcoming games scheduled.
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Leaderboard Snapshot */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Leaderboard Top 3</h3>
                  <button onClick={() => setActiveTab('leaderboard')} className="text-[10px] font-bold text-afl-accent uppercase hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {leaderboardData.slice(0, 3).map((u, i) => (
                    <div key={u.uid} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800 group hover:border-afl-accent/30 transition-all">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-serif italic text-stone-300 dark:text-stone-700">0{i + 1}</span>
                        <div>
                          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{u.displayName}</p>
                          <p className="text-[10px] text-stone-400 uppercase">{u.favoriteTeam || 'No Team'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-serif font-bold text-afl-accent">{u.calculatedPoints}</p>
                        <p className="text-[8px] text-stone-400 uppercase font-bold">Points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* AFL Ladder Snapshot */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">AFL Top 4</h3>
                  <button onClick={() => setActiveTab('standings')} className="text-[10px] font-bold text-afl-accent uppercase hover:underline">Full Ladder</button>
                </div>
                <div className="space-y-4">
                  {standings.slice(0, 4).map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-serif italic text-stone-300 dark:text-stone-700">0{i + 1}</span>
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{s.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-stone-600 dark:text-stone-400">{s.pts}</p>
                        <p className="text-[8px] text-stone-400 uppercase font-bold">Pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}

        {activeTab === 'war-room' && (
          <div className="space-y-8">
            {/* War Room Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Select Round</span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {rounds.map((r) => (
                    <button
                      key={r}
                      onClick={() => setCurrentRound(r)}
                      className={cn(
                        "flex-shrink-0 px-6 py-2.5 rounded-xl text-xs font-bold transition-all border",
                        currentRound === r
                          ? "text-white border-transparent shadow-lg"
                          : "bg-white dark:bg-stone-900 text-stone-500 border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700"
                      )}
                      style={currentRound === r ? { 
                        backgroundColor: accentColor,
                        boxShadow: `0 4px 12px ${accentColor}40`
                      } : {}}
                    >
                      {getRoundLabel(r)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 pb-2">
                <div className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl px-3 py-2.5 shadow-sm">
                  <User className="w-4 h-4 text-stone-400" />
                  <select 
                    value={warRoomUserId}
                    onChange={(e) => setWarRoomUserId(e.target.value)}
                    className="bg-transparent text-sm font-bold outline-none cursor-pointer text-stone-900 dark:text-stone-100"
                  >
                    {allUsers.map(u => {
                      const userRoundTips = allTips.filter(t => t.uid === u.uid && t.round === currentRound);
                      const tipCount = userRoundTips.length;
                      const totalGamesInRound = roundGames.length;
                      
                      return (
                        <option key={u.uid} value={u.uid} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                          {u.displayName} {u.uid === user?.uid ? '(You)' : ''} — {tipCount}/{totalGamesInRound} Tips
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button 
                  onClick={randomiseRound}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-100 dark:border-stone-800 rounded-xl text-sm font-bold transition-all group disabled:opacity-50 shadow-sm"
                >
                  {isActionLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-afl-accent"></div>
                  ) : (
                    <Dices className="w-4 h-4 text-afl-accent group-hover:rotate-12 transition-transform" />
                  )}
                  <span className="text-stone-900 dark:text-stone-100">Randomise</span>
                </button>
              </div>
            </div>

            {(isFetchingTips || isFetchingUsers || isFetchingGames || isActionLoading) && (
              <div className="flex items-center justify-center gap-3 p-4 bg-stone-900/40 backdrop-blur-md border border-white/10 rounded-2xl animate-pulse">
                <Loader2 className="w-5 h-5 text-afl-accent animate-spin" />
                <span className="text-sm font-medium text-stone-400">Syncing tactical data...</span>
              </div>
            )}
            {/* Main Game Cards */}
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6"
            >
              {roundGames.map(game => {
                const gameTip = warRoomTips.find(t => t.gameId === game.id);
                const isLocked = new Date() > new Date(game.date);
                const hasStarted = new Date() > new Date(game.date);
                const isFinished = game.isFinished;
                const isOngoing = hasStarted && !isFinished;
                const isExpanded = expandedGameId === game.id;
                const isActive = activeGameId === game.id;

                return (
                  <motion.div 
                    layout
                    key={game.id} 
                    id={`game-${game.id}`}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ y: -4 }}
                    className={cn(
                      "relative bg-afl-navy text-white rounded-3xl border border-white overflow-hidden shadow-sm transition-all cursor-pointer",
                      isActive && "ring-2 ring-afl-accent ring-offset-4 dark:ring-offset-stone-950 border-transparent shadow-xl shadow-afl-accent/10"
                    )}
                    style={{
                      boxShadow: hoveredGameId === game.id 
                        ? `0 25px 50px -12px ${AFL_TEAM_COLORS[game.hometeam] || '#ccc'}30, 0 10px 20px -10px ${AFL_TEAM_COLORS[game.awayteam] || '#ccc'}30`
                        : undefined
                    }}
                    onMouseEnter={() => setHoveredGameId(game.id)}
                    onMouseLeave={() => setHoveredGameId(null)}
                    onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                  >
                    {/* Team Specific Gradient Background */}
                    <div className={cn(
                      "absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-br",
                      TEAM_GRADIENTS[game.hometeam.split(' ')[0]] || TEAM_GRADIENTS[game.hometeam] || "from-stone-800 to-stone-900"
                    )} />
                    
                    {/* Stadium Grass Texture */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-field-grass" />

                    {/* Hover Details Tooltip */}
                    <AnimatePresence>
                      {hoveredGameId === game.id && !isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-[60] pointer-events-none"
                        >
                          <div className="bg-stone-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl min-w-[240px]">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                                <Trophy className="w-4 h-4 text-afl-gold" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Match Details</span>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-afl-accent" />
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-stone-400 uppercase font-bold tracking-tighter">Venue</p>
                                    <p className="text-xs font-bold text-white">{game.venue}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-afl-accent" />
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-stone-400 uppercase font-bold tracking-tighter">Kick-off (AWST)</p>
                                    <p className="text-xs font-bold text-white">
                                      {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'h:mm a')}
                                    </p>
                                    <p className="text-[9px] text-stone-500">
                                      {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'EEEE, d MMM')}
                                    </p>
                                  </div>
                                </div>

                                {isFinished && (
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div>
                                      <p className="text-[8px] text-stone-400 uppercase font-bold tracking-tighter">Final Result</p>
                                      <p className="text-xs font-bold text-white">{game.hscore} - {game.ascore}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Tooltip Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 bg-stone-900/95 border-r border-b border-white/20 rotate-45 -mt-2" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Team Color Accent Background */}
                    <div 
                      className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-0"
                      style={{ 
                        opacity: hoveredGameId === game.id ? 0.03 : 0,
                        background: `linear-gradient(135deg, ${AFL_TEAM_COLORS[game.hometeam]} 0%, ${AFL_TEAM_COLORS[game.awayteam]} 100%)`
                      }}
                    />

                    {/* Team Color Border Highlight */}
                    <div 
                      className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0"
                      style={{ 
                        opacity: hoveredGameId === game.id ? 1 : 0,
                        padding: '1.5px',
                        background: `linear-gradient(135deg, ${AFL_TEAM_COLORS[game.hometeam] || '#ccc'} 0%, ${AFL_TEAM_COLORS[game.awayteam] || '#ccc'} 100%)`,
                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        maskComposite: 'exclude',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        borderRadius: '1.5rem'
                      }}
                    />

                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 relative z-10">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-stone-400" />
                        <span className="text-xs font-medium text-stone-300">
                          {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'EEE d MMM, h:mm a')} AWST • {game.venue}
                        </span>
                        
                        {/* Status Badges */}
                        <div className="flex items-center gap-2">
                          {isFinished ? (
                            <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded text-[8px] font-black uppercase tracking-tighter border border-stone-200 dark:border-stone-700 shadow-sm">
                              Completed
                            </span>
                          ) : isOngoing ? (
                            <div className="flex items-center gap-2">
                              <span 
                                className="flex items-center gap-1 px-2 py-0.5 text-white rounded text-[8px] font-black uppercase tracking-tighter animate-pulse shadow-sm"
                                style={{ 
                                  background: `linear-gradient(90deg, ${accentColor}, #FF4444)`
                                }}
                              >
                                <Zap className="w-2 h-2 fill-white" /> In Progress
                              </span>
                              <span className="text-[10px] font-black text-afl-gold uppercase tracking-widest bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                                {game.timestr || 'Ongoing'} • {game.complete}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[8px] font-black uppercase tracking-tighter border border-blue-500/20">
                                Upcoming
                              </span>
                              {isActive && (
                                <span 
                                  className="flex items-center gap-1 px-2 py-0.5 text-white rounded text-[8px] font-black uppercase tracking-tighter shadow-sm"
                                  style={{ backgroundColor: accentColor }}
                                >
                                  Next Up
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {game.isFirstInRound && (
                          <div 
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black uppercase animate-pulse border shadow-sm"
                            style={{ 
                              backgroundColor: `${AFL_TEAM_COLORS['Richmond Tigers']}20`,
                              borderColor: `${AFL_TEAM_COLORS['Richmond Tigers']}40`,
                              color: AFL_TEAM_COLORS['Richmond Tigers']
                            }}
                          >
                            <Star className="w-3 h-3 fill-current" /> Bonus Game
                          </div>
                        )}
                        {isLocked ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded text-[10px] font-bold text-stone-300 uppercase">
                            <Lock className="w-3 h-3" /> Locked
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-afl-gold/20 rounded text-[10px] font-bold text-afl-gold uppercase">
                            <Unlock className="w-3 h-3" /> Open
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center relative z-10">
                      {/* Home Team */}
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={savingTipId === game.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          stageTip(game.id, game.round, game.hometeam, gameTip?.margin);
                        }}
                        style={{ 
                          borderTopColor: gameTip?.selectedTeam === game.hometeam ? AFL_TEAM_COLORS[game.hometeam] : 'transparent',
                          borderRightColor: gameTip?.selectedTeam === game.hometeam ? AFL_TEAM_COLORS[game.hometeam] : 'transparent',
                          borderBottomColor: gameTip?.selectedTeam === game.hometeam ? AFL_TEAM_COLORS[game.hometeam] : 'transparent',
                          borderLeftColor: AFL_TEAM_COLORS[game.hometeam],
                          borderLeftWidth: '6px'
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2 relative overflow-hidden group/team",
                          gameTip?.selectedTeam === game.hometeam 
                            ? "bg-white/20 border-white shadow-lg" 
                            : "bg-white/5 border-white/10 hover:bg-white/10",
                          savingTipId === game.id && "opacity-50"
                        )}
                      >
                        {/* Selected Indicator Background */}
                        {gameTip?.selectedTeam === game.hometeam && (
                          <motion.div 
                            layoutId={`selected-bg-${game.id}`}
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{ backgroundColor: AFL_TEAM_COLORS[game.hometeam] }}
                          />
                        )}

                        {savingTipId === game.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-black/10 rounded-xl z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-afl-accent"></div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 relative z-10">
                          <span 
                            className="text-sm font-bold tracking-tight group-hover/team:scale-110 transition-transform text-black dark:text-white"
                            style={{ fontFamily: 'Arial, sans-serif' }}
                          >
                            {game.hometeam}
                          </span>
                          {gameTip?.selectedTeam === game.hometeam && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="bg-emerald-500 rounded-full p-1 shadow-lg"
                            >
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </div>
                        {hasStarted && (
                          <div className="flex flex-col items-center gap-1 relative z-10">
                            <span className={cn(
                              "text-4xl font-mono font-black",
                              isOngoing ? "animate-pulse" : "text-stone-400 dark:text-stone-500"
                            )}
                            style={{ color: isOngoing ? accentColor : undefined }}
                            >
                              {game.hscore}
                            </span>
                            {isFinished && game.winner === game.hometeam && (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 animate-in zoom-in duration-500">
                              </div>
                            )}
                          </div>
                        )}
                      </motion.button>

                      {/* VS / Margin */}
                      <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full scale-150 opacity-20" />
                          <span className="text-sm font-black text-stone-300 dark:text-stone-700 uppercase tracking-[0.5em] relative z-10">VS</span>
                        </div>
                        
                        {game.isFirstInRound && (
                          <AnimatePresence mode="wait">
                            {gameTip || isFinished ? (
                              <motion.div 
                                key="margin-input"
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="w-full max-w-[180px] p-4 rounded-3xl bg-afl-gold/10 border-2 border-afl-gold/30 relative group/margin shadow-md"
                              >
                                <label className="block text-[11px] text-center uppercase font-black text-stone-500 mb-3 tracking-widest flex items-center justify-center gap-1 group/label">
                                  {isFinished ? 'Actual Margin' : 'Winning Margin'}
                                  {!isFinished && (
                                    <div className="relative">
                                      <Info className="w-3.5 h-3.5 text-stone-500 hover:text-afl-gold cursor-help transition-colors" />
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-stone-800 text-[9px] text-white rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-white/10 normal-case font-medium">
                                        <p className="font-bold text-afl-gold mb-1">Bonus Point System:</p>
                                        <p>Get the margin exactly right for 1 bonus point!</p>
                                        <p className="mt-1 text-stone-400 italic">Example: Tip 12 pts, result is 12 pts = +1 bonus pt.</p>
                                      </div>
                                    </div>
                                  )}
                                </label>
                                <div className="flex items-center gap-2">
                                  {!isFinished && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const current = gameTip?.margin || 0;
                                        stageTip(game.id, game.round, gameTip?.selectedTeam || '', Math.max(0, current - 10));
                                      }}
                                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 text-stone-600 hover:text-afl-accent transition-all text-[11px] font-black shadow-sm hover:shadow-md active:scale-90"
                                      title="Decrease by 10"
                                    >
                                      -10
                                    </button>
                                  )}
                                  <div className="relative flex-1">
                                    <input 
                                      type="number"
                                      placeholder="0"
                                      value={isFinished ? Math.abs((game.hscore || 0) - (game.ascore || 0)) : (gameTip?.margin || '')}
                                      readOnly={isFinished}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        if (isFinished) return;
                                        const valStr = e.target.value;
                                        const val = parseInt(valStr);
                                        stageTip(game.id, game.round, gameTip?.selectedTeam || '', isNaN(val) ? 0 : (val as number));
                                      }}
                                      className="w-full text-center py-1 border-b-2 border-afl-gold/50 focus:border-afl-gold outline-none font-mono text-[14px] font-black bg-transparent dark:text-stone-100 transition-all disabled:opacity-50"
                                    />
                                  </div>
                                  {!isFinished && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const current = gameTip?.margin || 0;
                                        stageTip(game.id, game.round, gameTip?.selectedTeam || '', current + 10);
                                      }}
                                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 text-stone-600 hover:text-afl-accent transition-all text-[11px] font-black shadow-sm hover:shadow-md active:scale-90"
                                      title="Increase by 10"
                                    >
                                      +10
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-center text-afl-gold mt-2 font-bold italic leading-tight opacity-80">
                                  {isFinished ? 'Final Result' : 'Predict the exact margin!'}
                                </p>
                              </motion.div>
                            ) : (
                              <motion.div 
                                key="margin-placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full max-w-[180px] p-3 rounded-2xl border-2 border-dashed border-stone-100 dark:border-stone-800 flex flex-col items-center justify-center gap-2 opacity-40"
                              >
                                <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                                  <Trophy className="w-4 h-4 text-stone-400" />
                                </div>
                                <span className="text-[9px] font-black uppercase text-stone-400 tracking-widest text-center">
                                  Select a team to enter margin
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}

                        {/* Winner Badge Removed */}
                      </div>

                      {/* Away Team */}
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={savingTipId === game.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          stageTip(game.id, game.round, game.awayteam, gameTip?.margin);
                        }}
                        style={{ 
                          borderTopColor: gameTip?.selectedTeam === game.awayteam ? AFL_TEAM_COLORS[game.awayteam] : 'transparent',
                          borderLeftColor: gameTip?.selectedTeam === game.awayteam ? AFL_TEAM_COLORS[game.awayteam] : 'transparent',
                          borderBottomColor: gameTip?.selectedTeam === game.awayteam ? AFL_TEAM_COLORS[game.awayteam] : 'transparent',
                          borderRightColor: AFL_TEAM_COLORS[game.awayteam],
                          borderRightWidth: '6px'
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2 relative overflow-hidden group/team",
                          gameTip?.selectedTeam === game.awayteam 
                            ? "bg-white/20 border-white shadow-lg" 
                            : "bg-white/5 border-white/10 hover:bg-white/10",
                          savingTipId === game.id && "opacity-50"
                        )}
                      >
                        {/* Selected Indicator Background */}
                        {gameTip?.selectedTeam === game.awayteam && (
                          <motion.div 
                            layoutId={`selected-bg-${game.id}`}
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{ backgroundColor: AFL_TEAM_COLORS[game.awayteam] }}
                          />
                        )}

                        {savingTipId === game.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-black/10 rounded-xl z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-afl-accent"></div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 relative z-10">
                          <span 
                            className="text-sm font-bold tracking-tight group-hover/team:scale-110 transition-transform text-black dark:text-white"
                            style={{ fontFamily: 'Arial, sans-serif' }}
                          >
                            {game.awayteam}
                          </span>
                          {gameTip?.selectedTeam === game.awayteam && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="bg-emerald-500 rounded-full p-1 shadow-lg"
                            >
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </div>
                        {hasStarted && (
                          <div className="flex flex-col items-center gap-1 relative z-10">
                            <span className={cn(
                              "text-4xl font-mono font-black",
                              isOngoing ? "animate-pulse" : "text-stone-400 dark:text-stone-500"
                            )}
                            style={{ color: isOngoing ? accentColor : undefined }}
                            >
                              {game.ascore}
                            </span>
                            {isFinished && game.winner === game.awayteam && (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 animate-in zoom-in duration-500">
                              </div>
                            )}
                          </div>
                        )}
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 py-6 bg-stone-50 dark:bg-stone-900/50 border-t border-stone-100 dark:border-stone-800">
                            <AIScout game={game} standings={standings} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                              <div className="space-y-1">
                                <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Game Status</p>
                                <p className="text-sm font-medium dark:text-stone-200">
                                  {isFinished ? (
                                    <span className="flex items-center gap-2 text-afl-accent">
                                      <CheckCircle2 className="w-4 h-4" /> Completed
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                                      <Clock className="w-4 h-4" /> {new Date() > new Date(game.date) ? 'In Progress' : 'Upcoming'}
                                    </span>
                                  )}
                                </p>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Venue</p>
                                <p className="text-sm font-medium dark:text-stone-200 flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-afl-accent" /> {game.venue}
                                </p>
                              </div>
    
                              <div className="space-y-1">
                                <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Kick-off (AWST)</p>
                                <p className="text-sm font-medium dark:text-stone-200 flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-afl-accent" /> {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'EEEE, d MMMM yyyy')}
                                </p>
                                <p className="text-sm font-medium dark:text-stone-200 flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-afl-accent" /> {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'h:mm a')}
                                </p>
                              </div>
    
                              {isFinished && (
                                <>
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Final Score</p>
                                    <p className="text-lg font-mono font-bold dark:text-stone-100">
                                      {game.hscore} - {game.ascore}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Winner</p>
                                    <p className="text-lg font-serif italic font-bold text-afl-gold">
                                      {game.winner || 'Draw'}
                                    </p>
                                  </div>
                                </>
                              )}
    
                              {game.isFirstInRound && isFinished && (
                                <div className="col-span-1 sm:col-span-2 pt-4 border-t border-stone-200">
                                  <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-2">Margin Analysis</p>
                                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                    <p>Actual Margin: <span className="font-bold">{Math.abs((game.hscore || 0) - (game.ascore || 0))} pts</span></p>
                                    {gameTip?.margin !== undefined && (
                                      <>
                                        <p>Your Tip: <span className="font-bold">{gameTip.margin} pts</span></p>
                                        <p>Error: <span className="font-bold text-afl-gold">{Math.abs(gameTip.margin - Math.abs((game.hscore || 0) - (game.ascore || 0)))} pts</span></p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="px-4 pb-4 mt-auto">
                      <GamePoll 
                        game={game} 
                        pollVotes={pollVotes} 
                        onVote={(vote) => castPollVote(game.id, vote, game.round)} 
                        currentUserUid={user?.uid} 
                      />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden transition-colors">
            <div className="px-8 py-5 border-b border-stone-100 dark:border-stone-800 bg-gradient-to-br from-afl-navy to-stone-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Trophy className="w-48 h-48 text-white" />
              </div>
              <div className="relative z-10">
                <h2 className="text-4xl font-serif italic text-white">Competition Central</h2>
                <p className="text-afl-gold/60 text-xs uppercase tracking-[0.3em] font-mono mt-1">2026 Season Leaderboard & Analysis</p>
              </div>
              
              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setLeaderboardSubTab('ladder')}
                      className={cn(
                        "px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                        leaderboardSubTab === 'ladder' 
                          ? "text-white shadow-lg" 
                          : "text-white/40 hover:text-white/60"
                      )}
                      style={leaderboardSubTab === 'ladder' ? { backgroundColor: accentColor } : {}}
                    >
                      Ladder
                    </button>
                    <button 
                      onClick={() => setLeaderboardSubTab('recap')}
                      className={cn(
                        "px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                        leaderboardSubTab === 'recap' 
                          ? "text-white shadow-lg" 
                          : "text-white/40 hover:text-white/60"
                      )}
                      style={leaderboardSubTab === 'recap' ? { backgroundColor: accentColor } : {}}
                    >
                      Season Summary
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {leaderboardSubTab === 'ladder' ? (
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-white dark:bg-stone-900 shadow-sm">
                  <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                    <th className="px-8 py-3 font-medium cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('leaderboard', 'rank')}>
                      <div className="flex items-center gap-1">
                        Pos {leaderboardSort.key === 'rank' && (leaderboardSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-8 py-3 font-medium cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('leaderboard', 'displayName')}>
                      <div className="flex items-center gap-1">
                        Player {leaderboardSort.key === 'displayName' && (leaderboardSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-8 py-3 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('leaderboard', 'points')}>
                      <div className="flex items-center justify-center gap-1">
                        Points {leaderboardSort.key === 'points' && (leaderboardSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-8 py-3 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('leaderboard', 'marginError')}>
                      <div className="flex items-center justify-center gap-1">
                        Margin Error {leaderboardSort.key === 'marginError' && (leaderboardSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-8 py-3 font-medium text-center">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((u) => {
                    const isExpanded = expandedUserId === u.uid;
                    const userTips = allTips.filter(t => t.uid === u.uid);
                    
                    return (
                      <React.Fragment key={u.uid}>
                        <tr 
                          onClick={() => setExpandedUserId(isExpanded ? null : u.uid)}
                          className={cn(
                            "border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer relative group", 
                            u.uid === user?.uid && "bg-stone-50 dark:bg-stone-800/50",
                            isExpanded && "bg-stone-100 dark:bg-stone-800/80"
                          )}
                        >
                          <td className="px-8 py-3 font-serif italic text-xl text-stone-300 dark:text-stone-700 relative">
                            {u.favoriteTeam && (
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-1 opacity-60 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: AFL_TEAM_COLORS[u.favoriteTeam] }}
                              />
                            )}
                            <div className="flex items-center gap-2">
                              <span>{u.rank < 10 ? `0${u.rank}` : u.rank}</span>
                              {u.prevRank && u.prevRank !== u.rank && (
                                <div className={cn(
                                  "flex items-center text-[10px] font-bold",
                                  u.prevRank > u.rank ? "text-emerald-500" : "text-rose-500"
                                )}>
                                  {u.prevRank > u.rank ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  {Math.abs(u.prevRank - u.rank)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all relative overflow-hidden"
                                style={{ 
                                  backgroundColor: u.favoriteTeam ? AFL_TEAM_COLORS[u.favoriteTeam] : '#141414',
                                  boxShadow: u.favoriteTeam ? `0 0 10px ${AFL_TEAM_COLORS[u.favoriteTeam]}40` : 'none'
                                }}
                              >
                                {u.displayName.charAt(0).toUpperCase()}
                                <div className="absolute inset-0 bg-black/10 z-0" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-stone-900 dark:text-stone-100">{u.displayName}</p>
                                  {isExpanded ? <ChevronUp className="w-3 h-3 text-stone-400" /> : <ChevronDown className="w-3 h-3 text-stone-400" />}
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-stone-400 uppercase tracking-tighter">{u.email}</p>
                                  {u.favoriteTeam && (
                                    <div className="flex items-center gap-1.5">
                                      <span 
                                        className="text-[8px] px-1.5 py-0.5 rounded text-white font-bold uppercase"
                                        style={{ backgroundColor: AFL_TEAM_COLORS[u.favoriteTeam] }}
                                      >
                                        {u.favoriteTeam}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-3 text-center">
                            <span 
                              className="inline-flex items-center justify-center bg-stone-950 dark:bg-stone-800 text-white font-bold text-base px-3 py-1 rounded-xl shadow-md border border-stone-800 dark:border-stone-700 min-w-[40px]"
                              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                            >
                              {u.calculatedPoints}
                            </span>
                          </td>
                          <td className="px-8 py-3 text-center">
                            <span className="text-lg font-mono text-stone-500 dark:text-stone-400">{u.calculatedMargin}</span>
                          </td>
                          <td className="px-8 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {u.form?.map((result, idx) => (
                                <div 
                                  key={idx}
                                  className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white",
                                    result === 'W' ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"
                                  )}
                                >
                                  {result}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-stone-50/30 dark:bg-stone-900/30 border-b border-stone-100 dark:border-stone-800">
                            <td colSpan={5} className="px-8 py-8">
                              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Historical Tipping Log</h4>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProfileUserId(u.uid);
                                        setProfileSourceTab('leaderboard');
                                        setActiveTab('player-profile');
                                      }}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-afl-navy text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-afl-navy/90 transition-all"
                                    >
                                      <User className="w-3 h-3" /> View Full Profile
                                    </button>
                                  </div>
                                  <span className="text-[10px] font-mono text-stone-400">{userTips.length} Tips Recorded</span>
                                </div>
                                
                                {userTips.length === 0 ? (
                                  <p className="text-sm text-stone-500 dark:text-stone-400 italic font-serif">No tips recorded for this player yet.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Array.from(new Set(userTips.map(t => t.round))).sort((a: any, b: any) => b - a).map(round => (
                                      <div key={round} className="space-y-3">
                                        <h5 className="text-[10px] font-bold text-afl-accent uppercase tracking-wider border-b border-afl-navy/10 pb-1">Round {round}</h5>
                                        <div className="space-y-2">
                                          {userTips.filter(t => t.round === round).map(tip => {
                                            const game = games.find(g => g.id === tip.gameId);
                                            if (!game) return null;
                                            const isCorrect = game.isFinished && game.winner === tip.selectedTeam;
                                            const actualMargin = game.isFinished ? Math.abs((game.hscore || 0) - (game.ascore || 0)) : null;
                                            
                                            return (
                                              <div key={tip.gameId} className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                  <p className="text-[10px] font-bold text-black dark:text-white uppercase tracking-tighter" style={{ fontFamily: 'Arial, sans-serif' }}>
                                                    {game.hometeam} v {game.awayteam}
                                                  </p>
                                                  {game.isFinished && (
                                                    <span className={cn(
                                                      "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase",
                                                      isCorrect 
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    )}>
                                                      {isCorrect ? 'Correct' : 'Incorrect'}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <p className={cn(
                                                    "text-sm font-bold",
                                                    game.isFinished 
                                                      ? (isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")
                                                      : "text-black dark:text-white"
                                                  )} style={{ fontFamily: 'Arial, sans-serif' }}>
                                                    {tip.selectedTeam}
                                                  </p>
                                                  {game.isFirstInRound && tip.margin !== undefined && (
                                                    <div className="text-right">
                                                      <p className="text-[10px] text-stone-400 uppercase font-bold">Margin</p>
                                                      <p className="text-xs font-mono font-bold text-stone-600 dark:text-stone-300">
                                                        {tip.margin} pts
                                                        {actualMargin !== null && (
                                                          <span className="text-[10px] ml-1 font-normal opacity-60">
                                                            (Err: {Math.abs(tip.margin - actualMargin)})
                                                          </span>
                                                        )}
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            ) : (
              <div className="p-8 min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100">Season Summary</h3>
                    <p className="text-xs text-stone-500 uppercase tracking-widest font-mono mt-1">Official Tactical Intelligence Summary</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => copyToClipboard(generateOverallRecap())}
                      className="flex items-center gap-2 px-6 py-3 bg-afl-navy text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-afl-navy/20 whitespace-nowrap"
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {isCopied ? 'Copied' : 'Copy Season Standing'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-stone-50 dark:bg-stone-800/30 rounded-2xl border border-stone-100 dark:border-stone-700/50 p-8 font-mono text-sm overflow-y-auto max-h-[500px]">
                  <pre className="whitespace-pre-wrap leading-relaxed text-stone-700 dark:text-stone-300">
                    {generateOverallRecap()}
                  </pre>
                </div>
                
                <div className="mt-6 flex items-center justify-center gap-8 py-6 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-stone-400 uppercase font-black mb-1">Rounds Finished</span>
                    <span className="text-xl font-serif italic text-stone-900 dark:text-stone-100">
                      {new Set(games.filter(g => g.isFinished).map(g => g.round)).size}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-stone-100 dark:bg-stone-800" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-stone-400 uppercase font-black mb-1">Total Players</span>
                    <span className="text-xl font-serif italic text-stone-900 dark:text-stone-100">{allUsers.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fixtures' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-serif italic dark:text-stone-100 text-stone-900">2026 Season Fixtures</h2>
                      <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] font-mono mt-1">Official AFL Schedule & Match Details</p>
                    </div>
                  </div>
                  
                  {/* Horizontal Round Slider */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 scroll-smooth">
                    {Array.from({ length: 24 }, (_, i) => i + 1).map(r => (
                      <button
                        key={r}
                        id={`fixture-round-btn-${r}`}
                        onClick={() => setFixturesSelectedRound(r)}
                        className={cn(
                          "flex-none px-5 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap",
                          fixturesSelectedRound === r
                            ? "bg-afl-navy border-afl-navy text-white shadow-lg shadow-afl-navy/20 scale-105"
                            : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500 hover:border-stone-300 dark:hover:border-stone-700"
                        )}
                      >
                        Round {r}
                      </button>
                    ))}
                  </div>

                  {/* Range Slider for quick navigation */}
                  <div className="pt-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="24" 
                      value={fixturesSelectedRound} 
                      onChange={(e) => setFixturesSelectedRound(parseInt(e.target.value))}
                      className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-afl-navy dark:accent-afl-gold"
                    />
                    <div className="flex justify-between mt-2 text-[9px] font-mono text-stone-400 font-bold uppercase tracking-widest px-1">
                      <span>R1</span>
                      <span className="text-afl-navy dark:text-afl-gold">Round {fixturesSelectedRound}</span>
                      <span>R24</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 gap-2">
                  {games.filter(g => g.round === fixturesSelectedRound).length === 0 ? (
                    <div className="py-20 text-center">
                      <Calendar className="w-12 h-12 text-stone-200 dark:text-stone-800 mx-auto mb-4" />
                      <p className="text-stone-400 italic">No matches scheduled for Round {fixturesSelectedRound} yet.</p>
                    </div>
                  ) : (
                    games.filter(g => g.round === fixturesSelectedRound).map((game) => {
                      const isLive = new Date() > new Date(game.date) && !game.isFinished;
                      const hasStarted = new Date() > new Date(game.date);
                      
                      return (
                        <div 
                          key={game.id} 
                          className={cn(
                            "group p-3 rounded-2xl border transition-all duration-300",
                            isLive 
                              ? "bg-red-50/30 dark:bg-red-950/20 border-red-100 dark:border-red-900/50 shadow-lg shadow-red-500/5" 
                              : "bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 hover:border-afl-accent/30 hover:shadow-xl hover:shadow-stone-200/50 dark:hover:shadow-none"
                          )}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                              {/* Meta Info */}
                              <div className="flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-0 sm:w-28">
                                <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                                  {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'EEE d MMM')}
                                </p>
                                <p className="text-[10px] sm:text-[11px] text-stone-500 font-mono">
                                  {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'h:mm a')} AWST
                                </p>
                                <div className="flex items-center gap-1 text-[9px] text-stone-400">
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span className="truncate">{game.venue}</span>
                                </div>
                              </div>

                              {/* Matchup */}
                              <div className="flex-1 flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
                                <div className="flex flex-col items-end sm:items-center gap-1 sm:w-32 text-right sm:text-center">
                                  <div 
                                    className="w-24 h-8 sm:w-28 sm:h-10 rounded-xl shadow-sm flex items-center justify-center px-2 text-white font-bold text-[8px] sm:text-[10px] text-center leading-tight transition-transform group-hover:scale-105"
                                    style={{ backgroundColor: AFL_TEAM_COLORS[game.hometeam] || '#ccc' }}
                                  >
                                    {game.hometeam}
                                  </div>
                                  {hasStarted && (
                                    <span className="text-xl font-serif italic text-stone-900 dark:text-stone-100">{game.hscore ?? '-'}</span>
                                  )}
                                </div>

                                <div className="flex flex-col items-center">
                                   <div className={cn(
                                     "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                     isLive ? "bg-red-500 text-white animate-pulse" : "bg-stone-100 dark:bg-stone-800 text-stone-400"
                                   )}>
                                     {game.isFinished ? 'Final' : isLive ? 'Live' : 'VS'}
                                   </div>
                                </div>

                                <div className="flex flex-col items-start sm:items-center gap-1 sm:w-32 text-left sm:text-center">
                                  <div 
                                    className="w-24 h-8 sm:w-28 sm:h-10 rounded-xl shadow-sm flex items-center justify-center px-2 text-white font-bold text-[8px] sm:text-[10px] text-center leading-tight transition-transform group-hover:scale-105"
                                    style={{ backgroundColor: AFL_TEAM_COLORS[game.awayteam] || '#ccc' }}
                                  >
                                    {game.awayteam}
                                  </div>
                                  {hasStarted && (
                                    <span className="text-xl font-serif italic text-stone-900 dark:text-stone-100">{game.ascore ?? '-'}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions / Status */}
                            <div className="flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-2 border-t lg:border-t-0 lg:border-l border-stone-100 dark:border-stone-800 pt-2 lg:pt-0 lg:pl-6">
                               {game.isFinished ? (
                                 <div className="flex flex-col items-end lg:items-center">
                                   <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest leading-tight">Winner</span>
                                   <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{game.winner || 'Draw'}</span>
                                 </div>
                               ) : (
                                 <button 
                                   onClick={() => setActiveTab('war-room')}
                                   className="px-4 py-1.5 bg-afl-navy text-white text-[9px] font-bold uppercase tracking-widest rounded-lg hover:bg-afl-navy/90 transition-all shadow-md active:scale-95"
                                 >
                                   Tip Now
                                 </button>
                               )}
                               
                               <div className="flex items-center gap-2">
                                 <div className="flex flex-col items-center">
                                   <span className="text-[7px] text-stone-400 uppercase font-black leading-none">Ref</span>
                                   <span className="text-[9px] font-mono text-stone-500">#{game.id}</span>
                                 </div>
                               </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'standings' && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden transition-colors">
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
              <h2 className="text-3xl font-serif italic dark:text-stone-100">AFL Premiership Ladder</h2>
              <p className="text-xs text-stone-400 uppercase tracking-widest font-mono mt-1">Live AFL Ladder - 2026 Season</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-white dark:bg-stone-900 shadow-sm">
                  <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                    <th className="px-8 py-3 font-medium">Pos</th>
                    <th className="px-8 py-3 font-medium">Team</th>
                    <th className="px-8 py-3 font-medium text-center">P</th>
                    <th className="px-8 py-3 font-medium text-center">W</th>
                    <th className="px-8 py-3 font-medium text-center">L</th>
                    <th className="px-8 py-3 font-medium text-center">D</th>
                    <th className="px-8 py-3 font-medium text-center">Pts</th>
                    <th className="px-8 py-3 font-medium text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s) => (
                    <tr key={s.name} className="border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                      <td className="px-8 py-3 font-serif italic text-xl text-stone-300 dark:text-stone-700">
                        {s.rank < 10 ? `0${s.rank}` : s.rank}
                      </td>
                      <td className="px-8 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-black dark:text-white" style={{ fontFamily: 'Arial, sans-serif' }}>{s.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-3 text-center font-mono text-stone-600 dark:text-stone-400">{s.played}</td>
                      <td className="px-8 py-3 text-center font-mono text-stone-600 dark:text-stone-400">{s.wins}</td>
                      <td className="px-8 py-3 text-center font-mono text-stone-600 dark:text-stone-400">{s.losses}</td>
                      <td className="px-8 py-3 text-center font-mono text-stone-600 dark:text-stone-400">{s.draws}</td>
                      <td className="px-8 py-3 text-center font-serif font-bold text-xl text-black dark:text-white">{s.pts}</td>
                      <td className="px-8 py-3 text-center font-mono text-stone-500 dark:text-stone-500">{(s.percentage || 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden transition-colors">
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 bg-gradient-to-br from-afl-navy to-stone-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <BarChart3 className="w-48 h-48 text-white" />
              </div>
              <div className="relative z-10">
                <h2 className="text-4xl font-serif italic text-white">Results Analysis</h2>
                <p className="text-afl-gold/60 text-xs uppercase tracking-[0.3em] font-mono mt-1">Season Performance Breakdown</p>
              </div>
              
              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setResultsSubTab('individual')}
                      className={cn(
                        "px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                        resultsSubTab === 'individual' 
                          ? "text-white shadow-lg" 
                          : "text-white/40 hover:text-white/60"
                      )}
                      style={resultsSubTab === 'individual' ? { backgroundColor: accentColor } : {}}
                    >
                      Individual
                    </button>
                    <button 
                      onClick={() => setResultsSubTab('round-summary')}
                      className={cn(
                        "px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                        resultsSubTab === 'round-summary' 
                          ? "text-white shadow-lg" 
                          : "text-white/40 hover:text-white/60"
                      )}
                      style={resultsSubTab === 'round-summary' ? { backgroundColor: accentColor } : {}}
                    >
                      Round Summary
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 shadow-sm">
                    <User className="w-4 h-4 text-afl-gold" />
                    <select 
                      value={resultsUserId}
                      onChange={(e) => setResultsUserId(e.target.value)}
                      className="bg-transparent text-sm font-bold outline-none cursor-pointer text-white"
                    >
                      {resultsSubTab === 'round-summary' && (
                        <option value="" className="bg-stone-900 text-white">Highlight Player...</option>
                      )}
                      {allUsers.map(u => (
                        <option key={u.uid} value={u.uid} className="bg-stone-900 text-white">
                          {u.displayName} {u.uid === user?.uid && resultsSubTab === 'individual' ? '(You)' : ''}
                        </option>
                      ))}
                    </select>
                    {resultsSubTab === 'round-summary' && resultsUserId && (
                      <button 
                        onClick={() => {
                          setSelectedProfileUserId(resultsUserId);
                          setProfileSourceTab('results');
                          setActiveTab('player-profile');
                        }}
                        className="ml-2 p-1 text-afl-gold hover:text-white transition-colors"
                        title="View Full Profile"
                      >
                        <User className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={() => setShowMatchWinners(prev => !prev)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm",
                      showMatchWinners 
                        ? "bg-white/5 text-white/90 border-white/10 hover:border-white/20" 
                        : "bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30"
                    )}
                  >
                    {showMatchWinners ? (
                      <>
                        <Eye className="w-4 h-4 text-emerald-400" />
                        <span>Winners Shown</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 text-amber-400" />
                        <span>Self-Test Active</span>
                      </>
                    )}
                  </button>

                  {resultsSubTab === 'round-summary' && (
                    <button 
                      onClick={() => {
                        setRecapRound(resultsSelectedRound);
                        setIsRoundRecapOpen(true);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-afl-accent text-white rounded-2xl text-sm font-bold hover:bg-afl-accent/90 transition-all shadow-lg shadow-afl-accent/20"
                    >
                      <Zap className="w-4 h-4" />
                      Round Recap
                    </button>
                  )}
                </div>

                {resultsSubTab === 'round-summary' && (
                  <div className="relative">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
                      {rounds.map((r) => (
                        <button
                          key={r}
                          onClick={() => setResultsSelectedRound(r)}
                          className={cn(
                            "flex-shrink-0 px-6 py-2.5 rounded-xl text-xs font-bold transition-all border",
                            resultsSelectedRound === r
                              ? "text-white border-transparent shadow-lg"
                              : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
                          )}
                          style={resultsSelectedRound === r ? { 
                            backgroundColor: accentColor,
                            boxShadow: `0 4px 12px ${accentColor}40`
                          } : {}}
                        >
                          {getRoundLabel(r)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {resultsSubTab === 'individual' ? (
              userResults.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 text-stone-200 dark:text-stone-800 mx-auto mb-4" />
                  <p className="text-stone-500 dark:text-stone-400 font-serif italic">No completed rounds yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {resultsChartData.length > 0 && (
                    <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800 p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700/80 text-afl-accent shadow-sm">
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">
                              Tipping Performance
                            </h3>
                            <p className="text-lg font-serif italic text-stone-900 dark:text-stone-100">
                              Success Trajectory Over Rounds
                            </p>
                          </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="flex items-center gap-6 self-start sm:self-center">
                          <div className="text-left">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">Avg Correct</span>
                            <span className="text-lg font-bold text-stone-900 dark:text-stone-100 font-mono">
                              {(resultsChartData.reduce((acc, curr) => acc + curr["Correct Tips"], 0) / (resultsChartData.length || 1)).toFixed(1)}
                            </span>
                          </div>
                          <div className="text-left border-l border-stone-100 dark:border-stone-800 pl-6">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">Best Round</span>
                            <span className="text-lg font-bold text-emerald-500 font-mono">
                              {Math.max(...resultsChartData.map(d => d["Correct Tips"]), 0)}
                            </span>
                          </div>
                          <div className="text-left border-l border-stone-100 dark:border-stone-800 pl-6">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">Total Matches</span>
                            <span className="text-lg font-bold text-stone-500 font-mono font-bold">
                              {resultsChartData.reduce((acc, curr) => acc + (curr["Total Games"] || 0), 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Line Chart Range Selector */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-stone-100 dark:border-stone-800/60 pt-4 mb-6 gap-3">
                        <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Select chart range:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex bg-stone-100 dark:bg-stone-800/80 p-1 rounded-2xl border border-stone-200/40 dark:border-stone-800/65 shadow-inner">
                            <button
                              onClick={() => setResultsChartRange('5')}
                              className={cn(
                                "px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all",
                                resultsChartRange === '5'
                                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
                              )}
                            >
                              Last 5 Rounds
                            </button>
                            <button
                              onClick={() => setResultsChartRange('10')}
                              className={cn(
                                "px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all",
                                resultsChartRange === '10'
                                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
                              )}
                            >
                              Last 10 Rounds
                            </button>
                            <button
                              onClick={() => setResultsChartRange('all')}
                              className={cn(
                                "px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all",
                                resultsChartRange === 'all'
                                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
                              )}
                            >
                              All Rounds
                            </button>
                          </div>

                          {resultsChartRange !== 'all' && (
                            <button
                              onClick={() => setResultsChartRange('all')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-[11px] font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 border border-stone-200/60 dark:border-stone-800/80 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/50 shadow-sm transition-all"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reset Zoom
                            </button>
                          )}
                        </div>
                      </div>

                      {!showMatchWinners ? (
                          <div className="w-full h-[280px] bg-stone-50/50 dark:bg-stone-900/10 rounded-3xl border border-stone-100/80 dark:border-stone-800/60 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                            <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mb-3 border border-amber-500/25 shadow-sm">
                              <EyeOff className="w-5 h-5" />
                            </div>
                            <h4 className="font-serif italic text-lg text-stone-900 dark:text-stone-100">Performance Chart Hidden</h4>
                            <p className="text-xs text-stone-550 dark:text-stone-400 mt-1 max-w-sm">
                              Trajectory totals are hidden in Self-Test Mode to prevent giveaways. Click "Self-Test Active" in the tab header to reveal your performance trajectory!
                            </p>
                          </div>
                        ) : (
                          <div className="w-full h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                key={resultsUserId || 'me'}
                                data={resultsChartData}
                                margin={{ top: 24, right: 15, left: -25, bottom: 0 }}
                              >
                                  <CartesianGrid 
                                    strokeDasharray="3 3" 
                                    vertical={false} 
                                    stroke="rgba(120, 110, 100, 0.08)" 
                                  />
                                  <XAxis 
                                    dataKey="name" 
                                    stroke="#a8a29e" 
                                    fontSize={10} 
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                  />
                                  <YAxis 
                                    stroke="#a8a29e" 
                                    fontSize={10} 
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                    domain={[0, 'auto']}
                                  />
                                  <RechartsTooltip 
                                    content={({ active, payload, label }: any) => {
                                      if (active && payload && payload.length) {
                                        const change = payload[0].payload["Change"];
                                        return (
                                          <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800/80 p-4 rounded-2xl shadow-xl space-y-1.5 backdrop-blur-md text-left z-30">
                                            <p className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest">{label}</p>
                                            <div className="flex items-center justify-between gap-6 py-0.5">
                                              <p className="text-sm font-bold text-stone-950 dark:text-stone-50 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: accentColor }} />
                                                <span>Correct:</span>
                                                <span className="font-mono text-emerald-500">{payload[0].value} / {payload[0].payload["Total Games"]}</span>
                                              </p>
                                              {change !== null && (
                                                <span className={cn(
                                                  "text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shadow-sm",
                                                  change > 0 && "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30",
                                                  change < 0 && "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30 border border-rose-100/50 dark:border-rose-900/30",
                                                  change === 0 && "text-stone-600 bg-stone-50 dark:text-stone-450 dark:bg-stone-800/60 border border-stone-200/50 dark:border-stone-700/50"
                                                )}>
                                                  {change > 0 && <ChevronUp className="w-3 h-3 stroke-[3.5]" />}
                                                  {change < 0 && <ChevronDown className="w-3 h-3 stroke-[3.5]" />}
                                                  {change === 0 && <span className="text-[8px] font-bold tracking-tight px-0.5">—</span>}
                                                  {change !== 0 && (change > 0 ? `+${change}` : change)}
                                                </span>
                                              )}
                                            </div>
                                            <div className="pt-1.5 border-t border-stone-100 dark:border-stone-855 text-[10px] text-stone-400 font-mono flex gap-4 justify-between">
                                              <span>Points: <span className="font-bold text-stone-600 dark:text-stone-300">{payload[0].payload["Points"]}</span></span>
                                              <span>Margin Error: <span className="font-bold text-stone-600 dark:text-stone-300">{payload[0].payload["Margin"]}</span></span>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="Correct Tips"
                                    stroke={accentColor}
                                    strokeWidth={3}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: accentColor }}
                                    dot={{ r: 4, strokeWidth: 2, stroke: accentColor, fill: '#ffffff' }}
                                    label={{ position: 'top', offset: 10, fill: accentColor, fontSize: 11, fontWeight: 'bold' }}
                                    isAnimationActive={true}
                                    animationDuration={1200}
                                    animationEasing="ease-out"
                                  />
                                </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                    </div>
                  )}

                  <div className="overflow-x-auto shadow-sm rounded-3xl border border-stone-100 dark:border-stone-800">
                    <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                        <th className="px-8 py-4 font-medium cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('individual', 'round')}>
                          <div className="flex items-center gap-1">
                            Round {resultsIndividualSort.key === 'round' && (resultsIndividualSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="px-8 py-4 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('individual', 'correct')}>
                          <div className="flex items-center justify-center gap-1">
                            Correct Tips {resultsIndividualSort.key === 'correct' && (resultsIndividualSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="px-8 py-4 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('individual', 'points')}>
                          <div className="flex items-center justify-center gap-1">
                            Total Points {resultsIndividualSort.key === 'points' && (resultsIndividualSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="px-8 py-4 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('individual', 'marginError')}>
                          <div className="flex items-center justify-center gap-1">
                            Margin Error {resultsIndividualSort.key === 'marginError' && (resultsIndividualSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {userResults.map((r) => {
                        const isExpanded = expandedResultsRound === r.round;
                        const roundGames = games.filter(g => g.round === r.round);
                        const targetUserId = resultsUserId || user?.uid;
                        const roundTips = allTips.filter(t => t.uid === targetUserId && t.round === r.round);

                        return (
                          <React.Fragment key={r.round}>
                            <tr 
                              onClick={() => setExpandedResultsRound(isExpanded ? null : r.round)}
                              className={cn(
                                "border-b border-stone-50 dark:border-stone-800 transition-all cursor-pointer group relative",
                                isExpanded ? "bg-stone-50 dark:bg-stone-800/50" : "hover:bg-stone-50/80 dark:hover:bg-stone-800/30"
                              )}
                            >
                              <td className="px-8 py-6 relative">
                                {isExpanded && (
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 w-1"
                                    style={{ backgroundColor: accentColor }}
                                  />
                                )}
                                <div className="flex items-center gap-3">
                                  <div 
                                    className={cn(
                                      "p-2 rounded-lg transition-colors",
                                      isExpanded ? "bg-white dark:bg-stone-700 shadow-sm" : "bg-stone-100 dark:bg-stone-800 group-hover:bg-white dark:group-hover:bg-stone-700"
                                    )}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-afl-accent" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-afl-accent" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-stone-900 dark:text-stone-100">{getRoundLabel(r.round)}</p>
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        r.finishedGames === r.totalGames ? "bg-emerald-500" : r.finishedGames > 0 ? "bg-afl-gold animate-pulse" : "bg-stone-300"
                                      )} />
                                      <p className="text-[10px] text-stone-400 uppercase tracking-tighter">
                                        {r.finishedGames === r.totalGames ? 'Completed' : r.finishedGames > 0 ? 'In Progress' : 'Upcoming'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-lg font-bold text-stone-900 dark:text-stone-100">{r.correct} / {r.totalGames}</span>
                                  <div className="w-12 h-1 bg-stone-100 dark:bg-stone-800 rounded-full mt-1 overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 transition-all duration-1000"
                                      style={{ width: `${(r.correct / r.totalGames) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center bg-stone-50/30 dark:bg-stone-900/30">
                                <span className="text-3xl font-serif font-bold text-afl-accent drop-shadow-sm">{r.points}</span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className="text-lg font-mono text-stone-500 dark:text-stone-400">{r.marginError}</span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={4} className="px-8 py-0 bg-stone-50/30 dark:bg-stone-900/30 border-b border-stone-100 dark:border-stone-800">
                                  <div className="py-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {roundGames.map(game => {
                                          const tip = roundTips.find(t => t.gameId === game.id);
                                          const isCorrect = tip && game.winner === tip.selectedTeam;
                                          const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
                                          const isUpcoming = !game.isFinished && new Date(game.date) > new Date();
                                          const isInProgress = !game.isFinished && new Date(game.date) <= new Date();
                                          
                                          return (
                                            <div key={game.id} className="bg-afl-navy text-white border border-white rounded-2xl p-4 shadow-sm">
                                              <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] uppercase tracking-widest text-stone-300 font-mono">
                                                  {game.venue} • {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'EEE h:mm a')}
                                                </span>
                                                {game.isFinished ? (
                                                  tip ? (
                                                    !showMatchWinners ? (
                                                      <div className="flex items-center gap-1 text-amber-500/80 text-[10px] font-bold uppercase tracking-tighter" title="Results masked under Self-Test Mode">
                                                        <EyeOff className="w-3 h-3 text-amber-400" /> Masked (Self-Test)
                                                      </div>
                                                    ) : isCorrect ? (
                                                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-tighter">
                                                        <CheckCircle2 className="w-3 h-3" /> Correct
                                                      </div>
                                                    ) : (
                                                      <div className="flex items-center gap-1 text-afl-accent text-[10px] font-bold uppercase tracking-tighter">
                                                        <XCircle className="w-3 h-3" /> Incorrect
                                                      </div>
                                                    )
                                                  ) : (
                                                    <span className="text-stone-300 dark:text-stone-600 text-[10px] font-bold uppercase tracking-tighter">No Tip</span>
                                                  )
                                                ) : (
                                                  <span className={cn(
                                                    "text-[10px] font-bold uppercase tracking-tighter",
                                                    isInProgress ? "text-afl-gold animate-pulse" : "text-stone-400"
                                                  )}>
                                                    {isInProgress ? "In Progress" : "Upcoming"}
                                                  </span>
                                                )}
                                              </div>
                                              
                                              <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 space-y-2">
                                                  <div className={`flex items-center justify-between p-2 rounded-lg ${tip?.selectedTeam === game.hometeam ? 'bg-white/20 border border-white' : ''}`}>
                                                    <div className="flex items-center gap-2">
                                                      <span className={`text-xs font-bold ${(!showMatchWinners) ? 'text-white font-bold' : (game.winner === game.hometeam ? 'text-white underline decoration-afl-gold underline-offset-4' : 'text-stone-300')}`} style={{ fontFamily: 'Arial, sans-serif' }}>
                                                        {game.hometeam}
                                                      </span>
                                                    </div>
                                                    {(game.isFinished || isInProgress) && (
                                                      <span className="text-sm font-mono font-bold text-white">
                                                        {showMatchWinners ? game.hscore : '?'}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className={`flex items-center justify-between p-2 rounded-lg ${tip?.selectedTeam === game.awayteam ? 'bg-white/20 border border-white' : ''}`}>
                                                    <div className="flex items-center gap-2">
                                                      <span className={`text-xs font-bold ${(!showMatchWinners) ? 'text-white font-bold' : (game.winner === game.awayteam ? 'text-white underline decoration-afl-gold underline-offset-4' : 'text-stone-300')}`} style={{ fontFamily: 'Arial, sans-serif' }}>
                                                        {game.awayteam}
                                                      </span>
                                                    </div>
                                                    {(game.isFinished || isInProgress) && (
                                                      <span className="text-sm font-mono font-bold text-white">
                                                        {showMatchWinners ? game.ascore : '?'}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                
                                                <div className="text-right border-l border-white/10 pl-4 min-w-[80px]">
                                                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-mono mb-1">Tip</p>
                                                  <p className="text-xs font-bold text-white truncate max-w-[100px]" style={{ fontFamily: 'Arial, sans-serif' }}>
                                                    {tip?.selectedTeam || '—'}
                                                  </p>
                                                  {game.isFirstInRound && tip?.margin !== undefined && (
                                                    <div className="mt-2 pt-2 border-t border-white/10">
                                                      <p className="text-[10px] uppercase tracking-widest text-stone-400 font-mono mb-1">Margin</p>
                                                      <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-white" style={{ fontFamily: 'Arial, sans-serif' }}>Tip: {tip.margin}</span>
                                                        {game.isFinished && <span className="text-[10px] text-stone-300">Actual: {actualMargin}</span>}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      <tr className="bg-stone-900 dark:bg-stone-950 text-white">
                        <td className="px-8 py-6 font-serif italic text-xl">Season Total</td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-bold">{userResults.reduce((acc, r) => acc + r.correct, 0)}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-2xl font-serif font-bold text-afl-accent">{userResults.reduce((acc, r) => acc + r.points, 0)}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-mono">{userResults.reduce((acc, r) => acc + r.marginError, 0)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                        <th className="px-8 py-4 font-medium cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('summary', 'rank')}>
                          <div className="flex items-center gap-1">
                            Pos {resultsRoundSummarySort.key === 'rank' && (resultsRoundSummarySort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="px-8 py-4 font-medium cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('summary', 'displayName')}>
                          <div className="flex items-center gap-1">
                            Player {resultsRoundSummarySort.key === 'displayName' && (resultsRoundSummarySort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="px-8 py-4 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('summary', 'correct')}>
                          <div className="flex items-center justify-center gap-1">
                            Correct {resultsRoundSummarySort.key === 'correct' && (resultsRoundSummarySort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="px-8 py-4 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('summary', 'points')}>
                          <div className="flex items-center justify-center gap-1">
                            Points {resultsRoundSummarySort.key === 'points' && (resultsRoundSummarySort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="px-8 py-4 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('summary', 'marginError')}>
                          <div className="flex items-center justify-center gap-1">
                            Margin Error {resultsRoundSummarySort.key === 'marginError' && (resultsRoundSummarySort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundSummaryData.map((u) => (
                        <tr 
                          key={u.uid}
                          className={cn(
                            "border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-all group relative",
                            u.uid === resultsUserId && "bg-afl-navy/5 dark:bg-afl-navy/10"
                          )}
                        >
                          <td className="px-8 py-6 font-serif italic text-xl text-stone-300 dark:text-stone-700 relative">
                            {u.uid === resultsUserId && (
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-1"
                                style={{ backgroundColor: accentColor }}
                              />
                            )}
                            {u.rank < 10 ? `0${u.rank}` : u.rank}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all relative overflow-hidden shadow-lg"
                                style={{ 
                                  backgroundColor: u.favoriteTeam ? AFL_TEAM_COLORS[u.favoriteTeam] : '#141414',
                                  boxShadow: u.favoriteTeam ? `0 4px 12px ${AFL_TEAM_COLORS[u.favoriteTeam]}40` : 'none'
                                }}
                              >
                                {u.favoriteTeam && (
                                  <div className="absolute inset-0 bg-white opacity-10" />
                                )}
                                <span className="relative z-10">{u.displayName.charAt(0).toUpperCase()}</span>
                                <div className="absolute inset-0 bg-black/10 z-0" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-stone-900 dark:text-stone-100">{u.displayName}</p>
                                  {u.favoriteTeam && (
                                    <span 
                                      className="text-[8px] px-1.5 py-0.5 rounded text-white font-bold uppercase"
                                      style={{ backgroundColor: AFL_TEAM_COLORS[u.favoriteTeam] }}
                                    >
                                      {u.favoriteTeam}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-stone-400 uppercase tracking-tighter">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
                              {showMatchWinners ? u.correct : '?'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-center bg-stone-50/30 dark:bg-stone-900/30">
                            <span className="text-3xl font-serif font-bold text-afl-accent drop-shadow-sm">
                              {showMatchWinners ? u.points : '?'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-lg font-mono text-stone-500 dark:text-stone-400">
                              {showMatchWinners ? u.marginError : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {activeTab === 'message-board' && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-serif italic dark:text-stone-100">Community Message Board</h2>
                <p className="text-xs text-stone-400 uppercase tracking-widest font-mono mt-1">Chat with other players about the game</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-stone-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth bg-stone-50/20 dark:bg-stone-900/20">
              {messages.filter(m => !m.toUid).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-stone-400 space-y-4">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p className="font-serif italic">No messages yet. Be the first to post!</p>
                </div>
              ) : (
                messages.filter(m => !m.toUid).map((msg) => {
                  const isMine = msg.uid === user?.uid;
                  const profileUser = allUsers.find(u => u.uid === msg.uid);
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id} 
                      className={cn(
                        "flex gap-3 max-w-[80%]",
                        isMine ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold shadow-sm"
                        style={{ backgroundColor: profileUser?.favoriteTeam && AFL_TEAM_COLORS[profileUser.favoriteTeam] ? AFL_TEAM_COLORS[profileUser.favoriteTeam] : '#141414' }}
                      >
                        {msg.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className={cn(
                          "flex items-center gap-2 px-1",
                          isMine ? "justify-end" : "justify-start"
                        )}>
                          <span className="text-[10px] font-bold text-stone-900 dark:text-stone-100">{msg.displayName}</span>
                          <span className="text-[8px] font-mono text-stone-400">{formatRelativeTime(msg.createdAt)}</span>
                        </div>
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm shadow-sm border",
                          isMine 
                            ? "bg-afl-navy text-white border-white/10" 
                            : "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-stone-100 dark:border-stone-700"
                        )}>
                          {msg.text}
                        </div>
                        <div className={cn(
                          "flex items-center gap-3 px-1",
                          isMine ? "justify-end" : "justify-start"
                        )}>
                          <button 
                            onClick={() => toggleLike(msg.id, msg.likes)}
                            className={cn(
                              "flex items-center gap-1 text-[9px] font-bold transition-colors",
                              msg.likes?.includes(user?.uid || '') 
                                ? "text-red-500" 
                                : "text-stone-400 hover:text-red-400"
                            )}
                          >
                            <Heart className={cn("w-3 h-3", msg.likes?.includes(user?.uid || '') && "fill-current")} />
                            {msg.likes?.length || 0}
                          </button>
                          {(isMine || profile?.role === 'admin') && (
                            <button 
                              onClick={() => deleteMessage(msg.id)}
                              className="text-[9px] font-bold text-stone-400 hover:text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <form onSubmit={postMessage} className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
              <div className="flex items-center gap-3 bg-white dark:bg-stone-800 p-2 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-inner group focus-within:ring-2 focus-within:ring-afl-accent transition-all">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Say something about the game..."
                  className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-stone-900 dark:text-stone-100"
                  disabled={isSendingMessage}
                />
                <button 
                  type="submit"
                  disabled={isSendingMessage || !newMessage.trim()}
                  className="p-3 bg-afl-navy text-white rounded-xl shadow-lg hover:shadow-afl-navy/20 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'player-profile' && selectedProfileUserId && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setActiveTab(profileSourceTab)}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-bold uppercase tracking-widest">Back to {profileSourceTab.charAt(0).toUpperCase() + profileSourceTab.slice(1)}</span>
              </button>
            </div>

            {(() => {
              const profileUser = allUsers.find(u => u.uid === selectedProfileUserId);
              if (!profileUser) return <p className="text-stone-500 italic">User not found.</p>;
              
              const userTips = allTips.filter(t => t.uid === profileUser.uid);
              const finishedGames = games.filter(g => g.isFinished);
              
              let points = 0;
              let marginError = 0;
              let correctTips = 0;
              
              finishedGames.forEach(game => {
                const tip = userTips.find(t => t.gameId === game.id);
                const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
                const isDraw = game.hscore === game.ascore;

                if (isDraw) return;

                if (tip) {
                  if (game.winner === tip.selectedTeam) {
                    points += 1;
                    correctTips += 1;
                    if (game.isFirstInRound && tip.margin !== undefined) {
                      if (tip.margin === actualMargin) points += 1;
                      marginError += Math.abs(tip.margin - actualMargin);
                    }
                  } else if (game.isFirstInRound && tip.margin !== undefined) {
                    marginError += Math.abs(tip.margin - actualMargin);
                  }
                } else {
                  // Missing tip: Point for away team win
                  if (game.winner === game.awayteam) {
                    points += 1;
                    correctTips += 1;
                  }
                }
              });

              const winRate = finishedGames.length > 0 ? (correctTips / finishedGames.length) * 100 : 0;
              const losses = finishedGames.length - correctTips;
              
              // Recent performance (last 5 games)
              const recentGames = [...finishedGames].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
              const recentTips = recentGames.map(g => {
                const tip = userTips.find(t => t.gameId === g.id);
                const isCorrect = tip ? g.winner === tip.selectedTeam : g.winner === g.awayteam;
                return { game: g, tip, isCorrect };
              });

              return (
                <div className="space-y-8">
                  {/* Profile Header */}
                  <div 
                    className="bg-white dark:bg-stone-900 p-8 rounded-3xl border shadow-xl relative overflow-hidden"
                    style={{ 
                      borderColor: profileUser.favoriteTeam ? `${AFL_TEAM_COLORS[profileUser.favoriteTeam]}40` : 'rgb(231, 229, 228)' // stone-200
                    }}
                  >
                    <div 
                      className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none"
                      style={{ 
                        background: profileUser.favoriteTeam ? `radial-gradient(circle at center, ${AFL_TEAM_COLORS[profileUser.favoriteTeam]} 0%, transparent 70%)` : 'none'
                      }}
                    />
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                      <div 
                        className="w-32 h-32 rounded-full flex items-center justify-center text-4xl text-white font-bold shadow-2xl relative overflow-hidden"
                        style={{ backgroundColor: profileUser.favoriteTeam ? AFL_TEAM_COLORS[profileUser.favoriteTeam] : '#141414' }}
                      >
                        {profileUser.favoriteTeam && (
                        <div className="absolute inset-0 bg-stone-100 dark:bg-stone-800 opacity-10" />
                        )}
                        <span className="relative z-10">{profileUser.displayName.charAt(0).toUpperCase()}</span>
                        <div className="absolute inset-0 bg-black/10 z-0" />
                      </div>
                      
                      <div className="text-center md:text-left space-y-2">
                        {isEditingSelf && profileUser.uid === user?.uid ? (
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Display Name</label>
                              <input 
                                type="text"
                                value={selfDisplayName}
                                onChange={(e) => setSelfDisplayName(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                                placeholder="Display Name"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Favorite Team</label>
                              <select 
                                value={selfFavoriteTeam}
                                onChange={(e) => setSelfFavoriteTeam(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                              >
                                <option value="">No Favorite Team</option>
                                {AFL_TEAMS.map(team => (
                                  <option key={team} value={team}>{team}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={handleUpdateSelfName}
                                disabled={isActionLoading}
                                className="px-6 py-2 bg-afl-navy text-white rounded-xl text-xs font-bold hover:bg-afl-navy/90 transition-colors shadow-lg shadow-afl-navy/20 disabled:opacity-50"
                              >
                                {isActionLoading ? "Saving..." : "Save Changes"}
                              </button>
                              <button 
                                onClick={() => setIsEditingSelf(false)}
                                className="px-6 py-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-center md:justify-start gap-4">
                              <h2 className="text-4xl font-serif italic text-stone-900 dark:text-stone-100">{profileUser.displayName}</h2>
                              {profileUser.uid === user?.uid && (
                                <button 
                                  onClick={() => {
                                    setIsEditingSelf(true);
                                    setSelfDisplayName(profileUser.displayName);
                                    setSelfFavoriteTeam(profileUser.favoriteTeam || '');
                                  }}
                                  className="p-2 text-stone-300 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
                                  title="Edit Profile"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                              <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">{profileUser.email}</span>
                              {profileUser.favoriteTeam && (
                                <div 
                                  className="flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-sm border"
                                  style={{ 
                                    backgroundColor: `${AFL_TEAM_COLORS[profileUser.favoriteTeam]}20`,
                                    borderColor: `${AFL_TEAM_COLORS[profileUser.favoriteTeam]}40`
                                  }}
                                >
                                  <span 
                                    className="text-[10px] font-bold uppercase tracking-widest"
                                    style={{ color: AFL_TEAM_COLORS[profileUser.favoriteTeam], fontFamily: 'Arial, sans-serif' }}
                                  >
                                    {profileUser.favoriteTeam} Fan
                                  </span>
                                </div>
                              )}
                              <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-full text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                                {profileUser.role}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-12">
                      <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Total Points</p>
                        <p className="text-4xl font-serif font-bold text-afl-accent">{points}</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Correct Tips</p>
                        <p className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100">{correctTips}</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Win/Loss</p>
                        <p className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100">
                          {correctTips}<span className="text-stone-300 mx-1">-</span>{losses}
                        </p>
                      </div>
                      <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Win Rate</p>
                        <p className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100">{(winRate || 0).toFixed(1)}%</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Avg Margin Err</p>
                        <p className="text-4xl font-serif font-bold text-stone-500 dark:text-stone-400">
                          {userTips.filter(t => t.margin !== undefined).length > 0 
                            ? ((marginError || 0) / userTips.filter(t => t.margin !== undefined).length).toFixed(1) 
                            : '0.0'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Round-by-Round Summary */}
                    <div className="lg:col-span-3 space-y-6">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-afl-accent" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">Round-by-Round Performance</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(() => {
                          const roundsList = Array.from(new Set(games.map(g => g.round))).sort((a: any, b: any) => b - a);
                          return roundsList.map(r => {
                            const roundGames = games.filter(g => g.round === r);
                            const finishedRoundGames = roundGames.filter(g => g.isFinished);
                            const roundTips = userTips.filter(t => t.round === r);
                            
                            let roundCorrect = 0;
                            let roundPoints = 0;
                            let roundMarginErr = 0;
                            
                            finishedRoundGames.forEach(game => {
                              const tip = roundTips.find(t => t.gameId === game.id);
                              if (tip) {
                                const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
                                if (game.winner === tip.selectedTeam) {
                                  roundCorrect += 1;
                                  roundPoints += 1;
                                  if (game.isFirstInRound && tip.margin !== undefined) {
                                    if (tip.margin === actualMargin) roundPoints += 1;
                                    roundMarginErr += Math.abs(tip.margin - actualMargin);
                                  }
                                } else if (game.isFirstInRound && tip.margin !== undefined) {
                                  roundMarginErr += Math.abs(tip.margin - actualMargin);
                                }
                              }
                            });

                            if (roundTips.length === 0 && finishedRoundGames.length === 0) return null;

                            return (
                              <div key={r} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                  <h4 className="text-xs font-black text-stone-900 dark:text-stone-100 uppercase tracking-widest">Round {r}</h4>
                                  <span className="text-[10px] font-mono text-stone-400">{roundTips.length}/{roundGames.length} Tips</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[8px] font-bold text-stone-400 uppercase mb-1">Correct</p>
                                    <p className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">{roundCorrect}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-bold text-stone-400 uppercase mb-1">Points</p>
                                    <p className="text-xl font-serif font-bold text-afl-accent">{roundPoints}</p>
                                  </div>
                                </div>
                                {finishedRoundGames.some(g => g.isFirstInRound) && (
                                  <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                                    <p className="text-[8px] font-bold text-stone-400 uppercase mb-1">Margin Error</p>
                                    <p className="text-sm font-mono font-bold text-stone-600 dark:text-stone-400">{roundMarginErr} pts</p>
                                  </div>
                                )}
                              </div>
                            );
                          }).filter(Boolean);
                        })()}
                      </div>
                    </div>

                    {/* Recent Performance */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-afl-accent" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">Recent Performance</h3>
                      </div>
                      
                      <div className="space-y-3">
                        {recentTips.length === 0 ? (
                          <p className="text-sm text-stone-500 italic font-serif">No recent games completed.</p>
                        ) : (
                          recentTips.map(({ game, tip, isCorrect }) => (
                            <div key={game.id} className="bg-afl-navy text-white p-4 rounded-2xl border border-white flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                  isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                                )}>
                                  {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold text-white" style={{ fontFamily: 'Arial, sans-serif' }}>{game.hometeam}</span>
                                    </div>
                                    <span className="text-[10px] text-stone-400">v</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold text-white" style={{ fontFamily: 'Arial, sans-serif' }}>{game.awayteam}</span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-stone-300 uppercase">Round {game.round}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-mono text-stone-400 uppercase">Tip</p>
                                <p className="text-xs font-bold text-white" style={{ fontFamily: 'Arial, sans-serif' }}>{tip?.selectedTeam || '—'}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Full Tipping History */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-stone-400" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">Full Tipping History</h3>
                      </div>

                      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                                <th className="px-6 py-4 font-medium">Round</th>
                                <th className="px-6 py-4 font-medium">Game</th>
                                <th className="px-6 py-4 font-medium text-center">Tip</th>
                                <th className="px-6 py-4 font-medium text-center">Result</th>
                                <th className="px-6 py-4 font-medium text-center">Points</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...userTips].sort((a, b) => {
                                if (b.round !== a.round) return b.round - a.round;
                                return b.gameId - a.gameId;
                              }).map(tip => {
                                const game = games.find(g => g.id === tip.gameId);
                                if (!game) return null;
                                const isCorrect = game.isFinished && game.winner === tip.selectedTeam;
                                
                                return (
                                  <tr key={tip.gameId} className="border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-mono text-stone-400">R{game.round}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-bold text-black dark:text-white" style={{ fontFamily: 'Arial, sans-serif' }}>{game.hometeam}</span>
                                        </div>
                                        <span className="text-[10px] text-stone-400">v</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-bold text-black dark:text-white" style={{ fontFamily: 'Arial, sans-serif' }}>{game.awayteam}</span>
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-stone-400 uppercase">{format(parseISO(game.date), 'MMM d')}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-xs font-bold text-black dark:text-white" style={{ fontFamily: 'Arial, sans-serif' }}>{tip.selectedTeam}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      {game.isFinished ? (
                                        <span className={cn(
                                          "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase",
                                          isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                        )}>
                                          {isCorrect ? 'Correct' : 'Incorrect'}
                                        </span>
                                      ) : (
                                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-400 font-bold uppercase">Pending</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-sm font-serif font-bold text-afl-accent">
                                        {game.isFinished ? (isCorrect ? '1' : '0') : '—'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Player Message Wall */}
                  <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-afl-accent" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">
                        {profileUser.uid === user?.uid ? "Your Player Wall" : `${profileUser.displayName}'s Player Wall`}
                      </h3>
                    </div>

                    {/* Messages List */}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {messages.filter(m => m.toUid === profileUser.uid).length === 0 ? (
                        <p className="text-sm text-stone-500 italic font-serif py-2">No messages posted on this wall yet.</p>
                      ) : (
                        messages.filter(m => m.toUid === profileUser.uid).map((msg) => {
                          const isMine = msg.uid === user?.uid;
                          const senderProfile = allUsers.find(u => u.uid === msg.uid);
                          return (
                            <div key={msg.id} className="flex gap-3 text-left">
                              <div 
                                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold shadow-sm"
                                style={{ backgroundColor: senderProfile?.favoriteTeam && AFL_TEAM_COLORS[senderProfile.favoriteTeam] ? AFL_TEAM_COLORS[senderProfile.favoriteTeam] : '#141414' }}
                              >
                                {msg.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{msg.displayName}</span>
                                  <span className="text-[10px] font-mono text-stone-400">{formatRelativeTime(msg.createdAt)}</span>
                                </div>
                                <div className="px-4 py-2.5 rounded-2xl text-xs shadow-sm border bg-stone-50/50 dark:bg-stone-800/50 border-stone-150 dark:border-stone-800/80 text-stone-900 dark:text-stone-100">
                                  {msg.text}
                                </div>
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => toggleLike(msg.id, msg.likes)}
                                    className={cn(
                                      "flex items-center gap-1 text-[9px] font-bold transition-colors",
                                      msg.likes?.includes(user?.uid || '') 
                                        ? "text-red-500" 
                                        : "text-stone-400 hover:text-red-400"
                                    )}
                                  >
                                    <Heart className={cn("w-3 h-3", msg.likes?.includes(user?.uid || '') && "fill-current")} />
                                    {msg.likes?.length || 0}
                                  </button>
                                  {(isMine || profileUser.uid === user?.uid || profile?.role === 'admin') && (
                                    <button 
                                      onClick={() => deleteMessage(msg.id)}
                                      className="text-[9px] font-bold text-stone-400 hover:text-red-500 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Send Message Form */}
                    <form onSubmit={(e) => postProfileMessage(e, profileUser.uid, profileUser.displayName)} className="pt-4 border-t border-stone-100 dark:border-stone-800 flex gap-3">
                      <input 
                        type="text" 
                        value={profileNewMessage}
                        onChange={(e) => setProfileNewMessage(e.target.value)}
                        placeholder={profileUser.uid === user?.uid ? "Write something on your own wall..." : `Say something to ${profileUser.displayName}...`}
                        className="flex-1 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 p-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-afl-accent text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
                        disabled={isSendingProfileMessage}
                      />
                      <button 
                        type="submit"
                        disabled={isSendingProfileMessage || !profileNewMessage.trim()}
                        className="px-6 py-3 bg-afl-navy text-white rounded-2xl text-xs font-bold hover:bg-afl-navy/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {isSendingProfileMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Post</span>
                      </button>
                    </form>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl transition-colors">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Settings className="w-8 h-8 text-stone-900 dark:text-stone-100" />
                  <h2 className="text-3xl font-serif italic text-stone-900 dark:text-stone-100">Admin Controls</h2>
                </div>
                <button 
                  onClick={downloadTipsCSV}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" /> Export All Tips (CSV)
                </button>
              </div>

              {/* User Management Section */}
              <div className="space-y-6 mb-12 pb-8 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">User Management</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase">
                    <User className="w-3 h-3" />
                    {allUsers.length} Players
                  </div>
                </div>

                {/* Add User Form */}
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Name</label>
                    <input 
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Player Name"
                      className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Email</label>
                    <input 
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Role</label>
                    <select 
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
                      className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="submit"
                      disabled={isActionLoading}
                      className="w-full py-2.5 bg-afl-navy text-white rounded-xl text-sm font-bold hover:bg-afl-navy/90 transition-colors shadow-lg shadow-afl-navy/20 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isActionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        "Add Player"
                      )}
                    </button>
                  </div>
                </form>

                {/* User List */}
                <div className="grid gap-3">
                  {[...allUsers].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')).map(u => (
                    <div key={u.uid} className="flex items-center justify-between p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700 transition-all">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          {editingUserId === u.uid ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <input 
                              type="text"
                              value={editingUserName}
                              onChange={(e) => setEditingUserName(e.target.value)}
                              className="p-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                              autoFocus
                            />
                            <select 
                              value={editingUserFavoriteTeam}
                              onChange={(e) => setEditingUserFavoriteTeam(e.target.value)}
                              className="p-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                            >
                              <option value="">No Favorite Team</option>
                              {AFL_TEAMS.map(team => (
                                <option key={team} value={team}>{team}</option>
                              ))}
                            </select>
                            <select 
                              value={editingUserRole}
                              onChange={(e) => setEditingUserRole(e.target.value as 'user' | 'admin')}
                              className="p-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleUpdateUsername(u.uid)}
                                disabled={isActionLoading}
                                className="p-1.5 bg-afl-navy text-white rounded-lg hover:bg-afl-navy/90 disabled:opacity-50"
                              >
                                {isActionLoading ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                              </button>
                              <button 
                                onClick={() => setEditingUserId(null)}
                                disabled={isActionLoading}
                                className="p-1.5 bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-stone-900 dark:text-stone-100">{u.displayName}</p>
                            {u.favoriteTeam && (
                              <div className="flex items-center gap-1">
                                <span 
                                  className="text-[8px] px-1.5 py-0.5 rounded text-white font-bold uppercase"
                                  style={{ backgroundColor: AFL_TEAM_COLORS[u.favoriteTeam], fontFamily: 'Arial, sans-serif' }}
                                >
                                  {u.favoriteTeam}
                                </span>
                              </div>
                            )}
                            <button 
                              onClick={() => {
                                setEditingUserId(u.uid);
                                setEditingUserName(u.displayName);
                                setEditingUserFavoriteTeam(u.favoriteTeam || '');
                                setEditingUserRole(u.role || 'user');
                              }}
                              className="p-1 text-stone-300 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
                            >
                              <Settings className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] text-stone-400 uppercase font-mono">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setAdminSelectedUserId(u.uid);
                            const element = document.getElementById('admin-tip-editor');
                            if (element) element.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="p-2 text-stone-300 hover:text-afl-accent transition-colors"
                          title="Edit Player Tips"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProfileUserId(u.uid);
                            setProfileSourceTab('admin');
                            setActiveTab('player-profile');
                          }}
                          className="p-2 text-stone-300 hover:text-afl-navy transition-colors"
                          title="View Profile"
                        >
                          <User className="w-5 h-5" />
                        </button>
                        {u.uid !== user?.uid && (
                          <button 
                            onClick={() => setUserToDelete(u)}
                            className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div id="admin-tip-editor" className="space-y-6 pt-8 border-t border-stone-100">
                <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">Edit Player Tips</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Select Player</label>
                    <select 
                      value={adminSelectedUserId}
                      onChange={(e) => setAdminSelectedUserId(e.target.value)}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                    >
                      <option value="" className="text-stone-900 dark:text-stone-100 dark:bg-stone-900">-- Choose Player --</option>
                      {allUsers.map(u => (
                        <option key={u.uid} value={u.uid} className="text-stone-900 dark:text-stone-100 dark:bg-stone-900">{u.displayName} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Select Round</label>
                    <div className="relative">
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
                        {rounds.map((r) => (
                          <button
                            key={r}
                            onClick={() => setAdminSelectedRound(r)}
                            className={cn(
                              "flex-shrink-0 px-6 py-2.5 rounded-xl text-xs font-bold transition-all border",
                              adminSelectedRound === r
                                ? "text-white border-transparent shadow-lg"
                                : "bg-white dark:bg-stone-900 text-stone-500 border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700"
                            )}
                            style={adminSelectedRound === r ? { 
                              backgroundColor: accentColor,
                              boxShadow: `0 4px 12px ${accentColor}40`
                            } : {}}
                          >
                            {getRoundLabel(r)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {adminSelectedUserId && (
                  <div className="mt-6 space-y-4">
                    {games.filter(g => g.round === adminSelectedRound).map(game => {
                      const playerTip = allTips.find(t => t.uid === adminSelectedUserId && t.gameId === game.id);
                      
                      return (
                        <div key={game.id} className="p-4 bg-afl-navy text-white rounded-2xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-white">{game.hometeam} vs {game.awayteam}</p>
                            <p className="text-[10px] text-stone-300 uppercase">{safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'EEE MMM d, h:mm a')} AWST</p>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                              <button 
                                onClick={() => handleAdminTipUpdate(game.id, game.hometeam, playerTip?.margin)}
                                disabled={isActionLoading}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2",
                                  playerTip?.selectedTeam === game.hometeam ? "bg-white/20 text-white" : "text-stone-300 hover:bg-white/10"
                                )}
                              >
                                {game.hometeam}
                              </button>
                              <button 
                                onClick={() => handleAdminTipUpdate(game.id, game.awayteam, playerTip?.margin)}
                                disabled={isActionLoading}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2",
                                  playerTip?.selectedTeam === game.awayteam ? "bg-white/20 text-white" : "text-stone-300 hover:bg-white/10"
                                )}
                              >
                                {game.awayteam}
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-stone-400 uppercase">Margin:</span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    const current = playerTip?.margin || 0;
                                    handleAdminTipUpdate(game.id, playerTip?.selectedTeam || game.hometeam, Math.max(0, current - 10));
                                  }}
                                  disabled={isActionLoading}
                                  className="p-1 rounded bg-white/10 text-stone-300 hover:text-afl-accent transition-colors disabled:opacity-50"
                                  title="Decrease by 10"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input 
                                  type="number"
                                  disabled={isActionLoading}
                                  value={playerTip?.margin !== undefined ? playerTip.margin : ''}
                                  onChange={(e) => handleAdminTipUpdate(game.id, playerTip?.selectedTeam || game.hometeam, Number(e.target.value))}
                                  placeholder="Pts"
                                  className="w-16 p-1.5 bg-transparent border border-white/20 rounded-lg text-xs font-bold focus:ring-2 focus:ring-afl-accent outline-none text-white disabled:opacity-50 text-center"
                                />
                                <button 
                                  onClick={() => {
                                    const current = playerTip?.margin || 0;
                                    handleAdminTipUpdate(game.id, playerTip?.selectedTeam || game.hometeam, current + 10);
                                  }}
                                  disabled={isActionLoading}
                                  className="p-1 rounded bg-white/10 text-stone-300 hover:text-afl-accent transition-colors disabled:opacity-50"
                                  title="Increase by 10"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <button 
                                onClick={() => handleAdminDeleteTip(game.id)}
                                disabled={isActionLoading}
                                className="p-1.5 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                title="Clear Tip"
                              >
                                {isActionLoading ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-stone-400"></div>
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-8 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">Missing Tips Report</h3>
                    <p className="text-[10px] text-stone-500 mt-1">Players who haven't completed their tips for Round {currentRound}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold border border-amber-100 dark:border-amber-900/30">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {allUsers.filter(u => {
                      const roundGames = games.filter(g => g.round === currentRound);
                      const userTips = allTips.filter(t => t.uid === u.uid && roundGames.some(g => g.id === t.gameId));
                      return userTips.length < roundGames.length;
                    }).length} Pending
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allUsers.filter(u => {
                    const roundGames = games.filter(g => g.round === currentRound);
                    const userTips = allTips.filter(t => t.uid === u.uid && roundGames.some(g => g.id === t.gameId));
                    return userTips.length < roundGames.length;
                  }).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')).map(u => {
                    const roundGames = games.filter(g => g.round === currentRound);
                    const userTips = allTips.filter(t => t.uid === u.uid && roundGames.some(g => g.id === t.gameId));
                    const missingCount = roundGames.length - userTips.length;
                    
                    return (
                      <div key={u.uid} className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between group hover:border-amber-200 dark:hover:border-amber-900/50 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 group-hover:text-amber-500 transition-colors">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{u.displayName}</p>
                            <p className="text-[10px] text-stone-400 uppercase font-mono">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-amber-600 dark:text-amber-400">{missingCount}</p>
                          <p className="text-[8px] text-stone-400 uppercase font-bold">Missing</p>
                        </div>
                      </div>
                    );
                  })}
                  {allUsers.filter(u => {
                    const roundGames = games.filter(g => g.round === currentRound);
                    const userTips = allTips.filter(t => t.uid === u.uid && roundGames.some(g => g.id === t.gameId));
                    return userTips.length < roundGames.length;
                  }).length === 0 && (
                    <div className="col-span-full py-12 text-center bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-dashed border-stone-200 dark:border-stone-800">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">All players have tipped!</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6 pt-8 border-t border-stone-100 dark:border-stone-800">
              </div>
            </div>

            <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-2xl space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif italic">System Status & Debug</h3>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    apiStatus.firestore === 'success' ? "bg-emerald-500" : "bg-red-500"
                  )}></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    {apiStatus.firestore === 'success' ? "Database Connected" : "Connection Error"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* API Status Cards */}
                <div className="p-4 bg-stone-800/50 rounded-2xl border border-stone-800">
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-3">Squiggle API: Games</p>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded",
                      apiStatus.games === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                      apiStatus.games === 'fallback' ? "bg-amber-500/10 text-amber-500" :
                      apiStatus.games === 'cache' ? "bg-blue-500/10 text-blue-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {apiStatus.games.toUpperCase()}
                    </span>
                    <Clock className="w-4 h-4 text-stone-600" />
                  </div>
                </div>

                <div className="p-4 bg-stone-800/50 rounded-2xl border border-stone-800">
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-3">Squiggle API: Standings</p>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded",
                      apiStatus.standings === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                      apiStatus.standings === 'fallback' ? "bg-amber-500/10 text-amber-500" :
                      apiStatus.standings === 'cache' ? "bg-blue-500/10 text-blue-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {apiStatus.standings.toUpperCase()}
                    </span>
                    <BarChart3 className="w-4 h-4 text-stone-600" />
                  </div>
                </div>

                <div className="p-4 bg-stone-800/50 rounded-2xl border border-stone-800">
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-3">Firestore Sync</p>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded",
                      apiStatus.firestore === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {apiStatus.firestore.toUpperCase()}
                    </span>
                    <Zap className="w-4 h-4 text-stone-600" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-stone-800">
                {/* Auth & Session Info */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Auth Session</h4>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between py-1 border-b border-stone-800">
                      <span className="text-stone-500">Project ID</span>
                      <span className="text-stone-300">{firebaseConfig.projectId}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800">
                      <span className="text-stone-500">Auth Domain</span>
                      <span className="text-stone-300">{firebaseConfig.authDomain}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800">
                      <span className="text-stone-500">User ID</span>
                      <span className="text-stone-300">{user?.uid || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800">
                      <span className="text-stone-500">Email</span>
                      <span className="text-stone-300">{user?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800">
                      <span className="text-stone-500">Role</span>
                      <span className="text-stone-300 uppercase">{profile?.role || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800">
                      <span className="text-stone-500">Provider</span>
                      <span className="text-stone-300">{user?.providerData[0]?.providerId || 'password'}</span>
                    </div>
                  </div>
                </div>

                {/* Database Stats */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Database Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-stone-800/30 rounded-xl border border-stone-800/50">
                      <p className="text-[9px] text-stone-500 uppercase mb-1">Total Games</p>
                      <p className="text-xl font-mono">{games.length}</p>
                    </div>
                    <div className="p-3 bg-stone-800/30 rounded-xl border border-stone-800/50">
                      <p className="text-[9px] text-stone-500 uppercase mb-1">Total Tips</p>
                      <p className="text-xl font-mono">{allTips.length}</p>
                    </div>
                    <div className="p-3 bg-stone-800/30 rounded-xl border border-stone-800/50">
                      <p className="text-[9px] text-stone-500 uppercase mb-1">Total Players</p>
                      <p className="text-xl font-mono">{allUsers.length}</p>
                    </div>
                    <div className="p-3 bg-stone-800/30 rounded-xl border border-stone-800/50">
                      <p className="text-[9px] text-stone-500 uppercase mb-1">Current Round</p>
                      <p className="text-xl font-mono">{currentRound}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  onClick={() => {
                    fetchGames(true);
                    fetchStandings();
                  }}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <Zap className="w-3 h-3" /> Force Refresh API
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3 h-3" /> Reload Session
                </button>
              </div>
            </div>
          </div>
        )}
          </main>

          {/* Footer */}
          <footer className="px-6 py-12 border-t border-stone-200 dark:border-stone-800 mt-12 bg-white/30 dark:bg-stone-900/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <p className="text-sm font-serif italic font-bold">Family and Friends AFL Tipping</p>
                <div className="flex flex-col sm:flex-row items-center md:items-start gap-1 sm:gap-4 mt-1">
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest">Built for the 2026 AFL Season</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-afl-accent animate-pulse"></div>
                  Live Data from Squiggle API
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Round Recap Modal */}
      {isRoundRecapOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-afl-accent/10 rounded-2xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-afl-accent" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100">Round {recapRound} Recap</h3>
                    <p className="text-xs text-stone-400 uppercase tracking-widest">Generated Summary for Players</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRoundRecapOpen(false)}
                  className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-stone-400" />
                </button>
              </div>

              {/* Round Selector in Modal */}
              <div className="mb-6 relative">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
                  {rounds.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRecapRound(r)}
                      className={cn(
                        "flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold transition-all border",
                        recapRound === r
                          ? "text-white border-transparent shadow-lg"
                          : "bg-white dark:bg-stone-900 text-stone-500 border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700"
                      )}
                      style={recapRound === r ? { 
                        backgroundColor: accentColor,
                        boxShadow: `0 4px 12px ${accentColor}40`
                      } : {}}
                    >
                      {getRoundLabel(r)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800 mb-8 font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                {generateRoundRecap(recapRound)}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setIsRoundRecapOpen(false)}
                  className="flex-1 py-4 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-2xl text-sm font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => copyToClipboard(generateRoundRecap(recapRound))}
                  className="flex-1 py-4 bg-afl-navy text-white rounded-2xl text-sm font-bold hover:bg-afl-navy/90 transition-all shadow-lg shadow-afl-navy/20 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      
      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-2xl font-serif italic mb-2 text-stone-900 dark:text-stone-100">Delete Player?</h3>
              <p className="text-stone-500 dark:text-stone-400 text-sm mb-8">
                Are you sure you want to delete <span className="font-bold text-stone-900 dark:text-stone-100">{userToDelete.displayName}</span>? 
                This will permanently remove their profile and all their tipping history. This action cannot be undone.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setUserToDelete(null)}
                  disabled={isActionLoading}
                  className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl text-sm font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteUser(userToDelete.uid)}
                  disabled={isActionLoading}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isActionLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    "Delete Permanently"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Tips Confirmation Bar */}
      <AnimatePresence>
        {Object.keys(pendingTips).length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] w-full max-w-2xl px-4"
          >
            <div className="bg-stone-900 dark:bg-stone-800 text-white p-4 rounded-3xl shadow-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-afl-accent/20 rounded-2xl flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-afl-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold">Unposted Selections</p>
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest">
                    {Object.keys(pendingTips).length} tips ready for Round {currentRound}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={cancelPendingTips}
                  disabled={isActionLoading}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-white/5 hover:bg-white/10 text-stone-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={postPendingTips}
                  disabled={isActionLoading}
                  className="flex-1 sm:flex-none px-8 py-2.5 bg-afl-navy text-white rounded-xl text-xs font-bold hover:bg-afl-navy/90 transition-all shadow-lg shadow-afl-navy/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isActionLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Confirm & Post
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Tips Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingPost && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-stone-900 w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100">Review Your Tips</h3>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono mt-1">Round {currentRound} Selection Summary</p>
                  </div>
                  <button 
                    onClick={() => setIsConfirmingPost(false)}
                    className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-800">
                  {(Object.values(pendingTips) as Tip[]).sort((a, b) => a.gameId - b.gameId).map(tip => {
                    const game = games.find(g => g.id === tip.gameId);
                    if (!game) return null;
                    return (
                      <div key={tip.gameId} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                        <div className="flex-1">
                          <p className="text-[9px] text-stone-400 uppercase font-bold mb-1">
                            {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'EEE h:mm a')}
                          </p>
                          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {game.hometeam} vs {game.awayteam}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-afl-accent uppercase font-black mb-1">Selection</p>
                          <p 
                            className="text-sm font-bold text-black dark:text-white"
                            style={{ fontFamily: 'Arial, sans-serif' }}
                          >
                            {tip.selectedTeam}
                            {tip.margin !== undefined && (
                              <span className="ml-2 text-stone-400 font-mono not-italic text-xs">
                                ({tip.margin} pts)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={handlePrint}
                    disabled={!allGamesTipped || isActionLoading}
                    className={cn(
                      "flex-1 py-4 rounded-2xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2",
                      allGamesTipped 
                        ? "bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white hover:bg-stone-800 dark:hover:bg-white" 
                        : "bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed"
                    )}
                    title={!allGamesTipped ? `Select all teams (${tippedCount}/${roundGames.length}) to enable printing` : "Print your selections"}
                  >
                    <Printer className="w-4 h-4" /> Print Selections
                  </button>
                  <button 
                    onClick={() => setIsConfirmingPost(false)}
                    disabled={isActionLoading}
                    className="flex-1 py-4 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-2xl text-sm font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
                  >
                    Back to Editing
                  </button>
                  <button 
                    onClick={finalizePostTips}
                    disabled={isActionLoading}
                    className="flex-1 py-4 bg-afl-navy text-white rounded-2xl text-sm font-bold hover:bg-afl-navy/90 transition-all shadow-lg shadow-afl-navy/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isActionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Finalize & Post Tips
                      </>
                    )}
                  </button>
                </div>
                
                <p className="text-[10px] text-center text-stone-400 mt-4 uppercase tracking-widest font-bold opacity-60">
                  Once posted, tips are locked after game kick-off
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>

      {/* Hidden Print Section */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 text-stone-900">
        <div className="max-w-2xl mx-auto">
          <div className="border-b-4 border-stone-900 pb-6 mb-8">
            <h1 className="text-4xl font-serif italic text-stone-900">Round {currentRound} Selections</h1>
            <div className="mt-4 flex justify-between text-sm font-bold uppercase tracking-widest text-stone-500">
              <span>Player: {allUsers.find(u => u.uid === warRoomUserId)?.displayName}</span>
              <span>Date: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
          <div className="space-y-6">
            {roundGames.map(game => {
              const tip = warRoomTips.find(t => t.gameId === game.id);
              return (
                <div key={game.id} className="flex justify-between items-center border-b border-stone-100 pb-4">
                  <div>
                    <p className="text-xs text-stone-400 font-bold uppercase mb-1">
                      {safeFormatInTimeZone(game.date, AWST_TIMEZONE, 'EEE d MMM, h:mm a')}
                    </p>
                    <p className="text-lg font-bold text-stone-900">{game.hometeam} vs {game.awayteam}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-stone-900">{tip?.selectedTeam || 'NO SELECTION'}</p>
                    {tip?.margin !== undefined && (
                      <p className="text-sm font-bold text-stone-500">Margin: {tip.margin}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-12 pt-8 border-t border-stone-100 text-center">
            <p className="text-[10px] text-stone-400 uppercase tracking-[0.3em] font-bold">AFL Tipping 2026 • Tactical Command Summary</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
