import React, { useState, useEffect, useMemo } from 'react';
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
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Game, UserProfile, Tip } from './types';
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
  Star,
  LayoutGrid,
  Shield,
  Plus,
  Minus,
  Copy,
  Check
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AWST_TIMEZONE = 'Australia/Perth';

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
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the whole app, but we could.
  return errInfo;
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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTips, setAllTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [activeTab, setActiveTab] = useState<'war-room' | 'leaderboard' | 'standings' | 'results' | 'admin' | 'player-profile'>('war-room');
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
  const [resultsSelectedRound, setResultsSelectedRound] = useState<number>(currentRound);
  const [expandedResultsRound, setExpandedResultsRound] = useState<number | null>(null);
  const [hoveredGameId, setHoveredGameId] = useState<number | null>(null);
  
  // Sorting State
  const [leaderboardSort, setLeaderboardSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'points', direction: 'desc' });
  const [resultsIndividualSort, setResultsIndividualSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'round', direction: 'desc' });
  const [resultsRoundSummarySort, setResultsRoundSummarySort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'points', direction: 'desc' });

  // Admin User Management State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserFavoriteTeam, setEditingUserFavoriteTeam] = useState('');
  const [editingUserRole, setEditingUserRole] = useState<'user' | 'admin'>('user');
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

  // Email/Password Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savingTipId, setSavingTipId] = useState<number | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isFetchingGames, setIsFetchingGames] = useState(true);
  const [isFetchingStandings, setIsFetchingStandings] = useState(true);

  const [isRoundRecapOpen, setIsRoundRecapOpen] = useState(false);
  const [recapRound, setRecapRound] = useState<number>(currentRound);
  const [isCopied, setIsCopied] = useState(false);

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

      userTips.forEach(tip => {
        const game = roundGames.find(g => g.id === tip.gameId);
        if (game) {
          const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
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
        }
      });

      return { ...user, correct, points, marginError };
    }).sort((a, b) => b.points - a.points || a.marginError - b.marginError);

    const winners = roundGames.map(g => {
      const winnerName = g.winner === g.hometeam ? g.hometeam : g.awayteam;
      const winnerScore = g.winner === g.hometeam ? g.hscore : g.ascore;
      const loserName = g.winner === g.hometeam ? g.awayteam : g.hometeam;
      const loserScore = g.winner === g.hometeam ? g.ascore : g.hscore;
      const margin = (winnerScore || 0) - (loserScore || 0);
      return `• ${winnerName} (${winnerScore}) def. ${loserName} (${loserScore}) by ${margin}`;
    }).join('\n');

    const topPerformers = roundStats.slice(0, 3).map((u, i) => 
      `${i + 1}. ${u.displayName} - ${u.points} pts (${u.correct} correct)`
    ).join('\n');

    const closestGame = roundGames.reduce((prev, curr) => {
      const prevMargin = Math.abs((prev.hscore || 0) - (prev.ascore || 0));
      const currMargin = Math.abs((curr.hscore || 0) - (curr.ascore || 0));
      return currMargin < prevMargin ? curr : prev;
    });

    const biggestWin = roundGames.reduce((prev, curr) => {
      const prevMargin = Math.abs((prev.hscore || 0) - (prev.ascore || 0));
      const currMargin = Math.abs((curr.hscore || 0) - (curr.ascore || 0));
      return currMargin > prevMargin ? curr : prev;
    });

    const lastPlace = roundStats[roundStats.length - 1];
    const woodenSpooners = roundStats.filter(u => u.points === lastPlace.points && u.marginError === lastPlace.marginError);
    const woodenSpoonNames = woodenSpooners.map(u => u.displayName).join(', ');

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

🌟 TOP PERFORMERS:
${topPerformers}

🎯 MARGIN MASTER:
${roundStats.sort((a, b) => a.marginError - b.marginError)[0]?.displayName} (Error: ${roundStats.sort((a, b) => a.marginError - b.marginError)[0]?.marginError})

⚡️ HIGHLIGHTS:
• Closest Game: ${closestGame.hometeam} vs ${closestGame.awayteam} (${Math.abs((closestGame.hscore || 0) - (closestGame.ascore || 0))} pts)
• Biggest Win: ${biggestWin.winner} (+${Math.abs((biggestWin.hscore || 0) - (biggestWin.ascore || 0))} pts)

🥄 WOODEN SPOON:
${woodenSpoonNames}
"${anecdote}"

Good luck in Round ${round + 1}! 🍀`;
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
            unlockedRounds: [],
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
      setAuthError(err.message || "Failed to create account.");
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
      setAuthError(err.message || "Failed to sign in.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch Games from Squiggle
  const fetchGames = async (isInitial = true) => {
    if (isInitial) setIsFetchingGames(true);
    try {
      console.log("Fetching AFL games for 2026...");
      const res = await fetch("/api/games?year=2026");
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status: ${res.status}`);
      }
      
      const data = await res.json();
      const rawGames: any[] = data.games || [];
      console.log(`Fetched ${rawGames.length} raw games.`);
      
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
      if (isInitial) {
        const now = new Date();
        const upcomingGame = finalGames.find(g => new Date(g.date) > now);
        if (upcomingGame) {
          setCurrentRound(upcomingGame.round);
        } else {
          setCurrentRound(Math.max(...finalGames.map(g => g.round)));
        }
      }
    } catch (err) {
      console.error("Failed to fetch games:", err);
      if (isInitial) setError(`Could not load AFL games: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      if (isInitial) setIsFetchingGames(false);
    }
  };

  const fetchStandings = async () => {
    setIsFetchingStandings(true);
    try {
      console.log("Fetching AFL standings for 2026...");
      const res = await fetch("/api/standings?year=2026");
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status: ${res.status}`);
      }
      
      const data = await res.json();
      const rawStandings: any[] = data.standings || [];
      console.log(`Fetched ${rawStandings.length} raw standings.`);
      
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
    
    // Admins can see full user profiles, others see public profiles
    const usersPath = profile.role === 'admin' ? 'users' : 'public_profiles';
    const unsubUsers = onSnapshot(collection(db, usersPath), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      console.log(`Fetched ${users.length} users from ${usersPath}`);
      setAllUsers(users.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')));
    }, (error) => {
      console.error(`Failed to fetch users from ${usersPath}:`, error);
      handleFirestoreError(error, OperationType.LIST, usersPath);
    });

    const tipsPath = 'tips';
    const unsubTips = onSnapshot(collection(db, tipsPath), (snapshot) => {
      setAllTips(snapshot.docs.map(doc => doc.data() as Tip));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, tipsPath);
    });

    return () => {
      unsubUsers();
      unsubTips();
    };
  }, [user, profile]);

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

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please try again.");
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
    const isLocked = new Date() > new Date(game.date) && !profile?.unlockedRounds?.includes(round);
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

  const leaderboardData = useMemo(() => {
    const data = allUsers.map(u => {
      const userTips = allTips.filter(t => t.uid === u.uid);
      let points = 0;
      let marginError = 0;

      userTips.forEach(tip => {
        const game = games.find(g => g.id === tip.gameId);
        if (game && game.isFinished) {
          const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
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
        }
      });

      return {
        ...u,
        calculatedPoints: points,
        calculatedMargin: marginError
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

  const roundSummaryData = useMemo(() => {
    const data = allUsers.map(u => {
      const userTips = allTips.filter(t => t.uid === u.uid && t.round === resultsSelectedRound);
      let correct = 0;
      let points = 0;
      let marginError = 0;

      userTips.forEach(tip => {
        const game = games.find(g => g.id === tip.gameId);
        if (game && game.isFinished) {
          const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
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
        if (tip) {
          const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
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

  const handleSort = (section: 'leaderboard' | 'individual' | 'summary', key: string) => {
    if (section === 'leaderboard') {
      setLeaderboardSort(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
    } else if (section === 'individual') {
      setResultsIndividualSort(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
    } else if (section === 'summary') {
      setResultsRoundSummarySort(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
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

  const randomiseRound = async () => {
    if (!user || !roundGames.length) return;
    
    if (warRoomUserId !== user.uid && profile?.role !== 'admin') {
      setError("You are not authorized to edit this player's tips.");
      return;
    }

    setIsActionLoading(true);
    const batch = roundGames.map(game => {
      const isLocked = new Date() > new Date(game.date) && !profile?.unlockedRounds?.includes(game.round);
      if (isLocked && profile?.role !== 'admin') return null;

      const randomWinner = Math.random() > 0.5 ? game.hometeam : game.awayteam;
      const randomMargin = game.isFirstInRound ? Math.floor(Math.random() * 40) + 1 : undefined;
      
      const tipId = `${warRoomUserId}_${game.id}`;
      const tipData: Tip = {
        uid: warRoomUserId,
        gameId: game.id,
        round: game.round,
        selectedTeam: randomWinner,
        updatedAt: new Date().toISOString()
      };
      if (randomMargin !== undefined) tipData.margin = randomMargin;
      
      return setDoc(doc(db, 'tips', tipId), tipData);
    }).filter(Boolean);

    try {
      await Promise.all(batch);
    } catch (err) {
      console.error("Randomise failed:", err);
      setError("Failed to randomise tips.");
    } finally {
      setIsActionLoading(false);
    }
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
      totalMargin: 0,
      unlockedRounds: []
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

  const warRoomTips = allTips.filter(t => t.uid === warRoomUserId);
  
  const accentColor = useMemo(() => {
    if (profile?.favoriteTeam && AFL_TEAM_COLORS[profile.favoriteTeam]) {
      return AFL_TEAM_COLORS[profile.favoriteTeam];
    }
    return '#002B5C'; // Default AFL Navy
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
            <h1 className="text-4xl font-serif italic mb-2 text-stone-900 dark:text-stone-100">Adrian's Tipping Page</h1>
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
      {/* Header */}
      <header className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-b border-stone-200 dark:border-stone-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
              <h1 className="text-xl font-serif italic tracking-tight dark:text-stone-100">Adrian's Tipping</h1>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">2026 Season</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 bg-stone-100 dark:bg-stone-800/50 p-1 rounded-2xl">
            {[
              { id: 'war-room', label: 'Tips', icon: Calendar },
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              { id: 'standings', label: 'AFL Ladder', icon: LayoutGrid },
              { id: 'results', label: 'Results', icon: CheckCircle2 },
            ].map((tab) => {
              const hasLiveGames = tab.id === 'war-room' && games.some(g => new Date() > new Date(g.date) && !g.isFinished);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 relative overflow-hidden",
                    activeTab === tab.id 
                      ? "text-white shadow-md" 
                      : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-800"
                  )}
                  style={activeTab === tab.id ? { 
                    backgroundColor: accentColor,
                    boxShadow: `0 4px 12px ${accentColor}40`
                  } : {}}
                >
                  <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-white" : "text-stone-400")} />
                  {tab.label}
                  {hasLiveGames && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  )}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="nav-glow"
                      className="absolute inset-0 bg-white/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </button>
              );
            })}
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 relative overflow-hidden",
                  activeTab === 'admin' 
                    ? "text-white shadow-md" 
                    : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-800"
                )}
                style={activeTab === 'admin' ? { 
                  backgroundColor: accentColor,
                  boxShadow: `0 4px 12px ${accentColor}40`
                } : {}}
              >
                <Shield className={cn("w-4 h-4", activeTab === 'admin' ? "text-white" : "text-stone-400")} />
                Admin
              </button>
            )}
          </nav>

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
                    {Object.keys(AFL_TEAM_COLORS).map(team => (
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

      <main className="max-w-5xl mx-auto px-4 py-8">
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

        {activeTab === 'war-room' && (
          <div className="space-y-8">
            {/* Live Scores Ticker */}
            {games.filter(g => new Date() > new Date(g.date) && !g.isFinished).length > 0 && (
              <div className="relative overflow-hidden bg-stone-900/40 dark:bg-stone-900/60 backdrop-blur-md rounded-3xl border border-white/5 p-4 shadow-xl">
                <div className="flex items-center gap-3 mb-3 px-2">
                  <div className="flex items-center gap-2 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Live Scores</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
                  {games
                    .filter(g => new Date() > new Date(g.date) && !g.isFinished)
                    .map(g => (
                      <div 
                        key={g.id}
                        className="flex-shrink-0 min-w-[200px] bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-2 hover:bg-white/10 transition-all cursor-pointer group"
                        onClick={() => {
                          setCurrentRound(g.round);
                          setExpandedGameId(g.id);
                          const el = document.getElementById(`game-${g.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          <span>{g.timestr || 'Live'}</span>
                          <span className="text-afl-gold">{g.complete}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-1 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold truncate" style={{ color: AFL_TEAM_COLORS[g.hometeam] }}>{g.hometeam}</span>
                              <span className="text-sm font-serif italic text-white">{g.hscore}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold truncate" style={{ color: AFL_TEAM_COLORS[g.awayteam] }}>{g.awayteam}</span>
                              <span className="text-sm font-serif italic text-white">{g.ascore}</span>
                            </div>
                          </div>
                          <div className="w-px h-8 bg-white/10" />
                          <div className="flex flex-col items-center justify-center min-w-[40px]">
                            <span className="text-[10px] font-black text-afl-gold">
                              {Math.abs((g.hscore || 0) - (g.ascore || 0))}
                            </span>
                            <span className="text-[8px] font-bold text-stone-500 uppercase">Diff</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Enter Your Tips Header & Sliding Bar */}
            <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Zap className="w-32 h-32 text-afl-gold" />
              </div>
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                  <div>
                    <h2 className="text-4xl font-serif italic text-afl-navy dark:text-afl-gold">Enter Your Tips</h2>
                    <p className="text-stone-400 text-xs uppercase tracking-[0.3em] font-mono mt-1">Tactical Selection Command</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                      <User className="w-4 h-4 text-stone-400" />
                      <select 
                        value={warRoomUserId}
                        onChange={(e) => setWarRoomUserId(e.target.value)}
                        className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                      >
                        {allUsers.map(u => (
                          <option key={u.uid} value={u.uid} className="bg-stone-900 text-white">
                            {u.displayName} {u.uid === user?.uid ? '(You)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button 
                      onClick={randomiseRound}
                      disabled={isActionLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all group disabled:opacity-50"
                    >
                      {isActionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-afl-accent"></div>
                      ) : (
                        <Dices className="w-4 h-4 text-afl-accent group-hover:rotate-12 transition-transform" />
                      )}
                      Randomise
                    </button>
                  </div>
                </div>

                {/* Round Selection Slider */}
                <div className="mb-8">
                  <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                    {rounds.map(r => (
                      <button
                        key={r}
                        onClick={() => setCurrentRound(r)}
                        className={cn(
                          "flex-shrink-0 min-w-[70px] h-16 rounded-2xl flex flex-col items-center justify-center transition-all border",
                          currentRound === r 
                            ? "bg-afl-accent text-white border-afl-accent shadow-[0_0_20px_rgba(0,138,171,0.4)]" 
                            : "bg-white/5 text-stone-400 border-white/10 hover:border-white/20"
                        )}
                      >
                        <span className="text-[9px] uppercase tracking-wider font-mono opacity-60">
                          {r === 0 ? 'Open' : r >= 25 ? 'Final' : 'Round'}
                        </span>
                        <span className="text-lg font-bold">
                          {r === 0 ? 'OR' : r === 25 ? 'F1' : r === 26 ? 'SF' : r === 27 ? 'PF' : r === 28 ? 'GF' : r}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliding Selections Bar */}
              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide mask-fade-right">
                  {roundGames.map(game => {
                    const gameTip = warRoomTips.find(t => t.gameId === game.id);
                    const isLocked = new Date() > new Date(game.date) && !profile?.unlockedRounds?.includes(game.round);
                    
                    return (
                      <div 
                        key={game.id}
                        className={cn(
                          "flex-shrink-0 w-48 p-3 rounded-2xl border transition-all cursor-pointer",
                          gameTip 
                            ? "bg-afl-navy/20 border-afl-accent/40" 
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                        onClick={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-mono text-stone-500 uppercase">{formatInTimeZone(parseISO(game.date), AWST_TIMEZONE, 'EEE h:mm a')}</span>
                          {gameTip && <CheckCircle2 className="w-3 h-3 text-afl-accent" />}
                        </div>
                        <div className="space-y-1">
                          <div 
                            className={cn("text-xs font-bold truncate")}
                            style={{ color: gameTip?.selectedTeam === game.hometeam ? AFL_TEAM_COLORS[game.hometeam] : undefined }}
                          >
                            {game.hometeam}
                          </div>
                          <div 
                            className={cn("text-xs font-bold truncate")}
                            style={{ color: gameTip?.selectedTeam === game.awayteam ? AFL_TEAM_COLORS[game.awayteam] : undefined }}
                          >
                            {game.awayteam}
                          </div>
                          {game.isFirstInRound && (
                            <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[8px] font-black uppercase text-afl-gold">Margin</span>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const current = gameTip?.margin || 0;
                                      saveTip(game.id, game.round, gameTip?.selectedTeam || '', Math.max(0, current - 10));
                                    }}
                                    className="p-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-afl-accent transition-colors"
                                    title="Decrease by 10"
                                  >
                                    <Minus className="w-2 h-2" />
                                  </button>
                                  <input 
                                    type="number"
                                    placeholder="Pts"
                                    value={gameTip?.margin || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                      const val = parseInt(e.target.value);
                                      saveTip(game.id, game.round, gameTip?.selectedTeam || '', isNaN(val) ? 0 : val);
                                    }}
                                    className="w-12 text-center text-[10px] font-bold bg-transparent outline-none border-b border-stone-200 focus:border-afl-accent"
                                  />
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const current = gameTip?.margin || 0;
                                      saveTip(game.id, game.round, gameTip?.selectedTeam || '', current + 10);
                                    }}
                                    className="p-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-afl-accent transition-colors"
                                    title="Increase by 10"
                                  >
                                    <Plus className="w-2 h-2" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Game Cards */}
            <div className="grid gap-6">
              {roundGames.map(game => {
                const gameTip = warRoomTips.find(t => t.gameId === game.id);
                const isLocked = new Date() > new Date(game.date) && !profile?.unlockedRounds?.includes(game.round);
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    className={cn(
                      "relative bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm transition-all cursor-pointer",
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

                    <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/30 dark:bg-stone-900/30 relative z-10">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-stone-400" />
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                          {formatInTimeZone(parseISO(game.date), AWST_TIMEZONE, 'EEE d MMM, h:mm a')} AWST • {game.venue}
                        </span>
                        {isOngoing && (
                          <div className="flex items-center gap-2">
                            <span 
                              className="flex items-center gap-1 px-2 py-0.5 text-white rounded text-[8px] font-black uppercase tracking-tighter animate-pulse shadow-sm"
                              style={{ 
                                background: `linear-gradient(90deg, ${accentColor}, #FF4444)`
                              }}
                            >
                              <Zap className="w-2 h-2 fill-white" /> Live Now
                            </span>
                            <span className="text-[10px] font-black text-afl-gold uppercase tracking-widest bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                              {game.timestr || 'Ongoing'} • {game.complete}%
                            </span>
                          </div>
                        )}
                        {isActive && !isOngoing && !isFinished && (
                          <span 
                            className="flex items-center gap-1 px-2 py-0.5 text-white rounded text-[8px] font-black uppercase tracking-tighter shadow-sm"
                            style={{ backgroundColor: accentColor }}
                          >
                            Next Up
                          </span>
                        )}
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
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-200 dark:bg-stone-800 rounded text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase">
                            <Lock className="w-3 h-3" /> Locked
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-afl-navy/10 dark:bg-afl-navy/30 rounded text-[10px] font-bold text-afl-navy dark:text-afl-gold uppercase">
                            <Unlock className="w-3 h-3" /> Open
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                      </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center relative z-10">
                      {/* Home Team */}
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={savingTipId === game.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          saveTip(game.id, game.round, game.hometeam, gameTip?.margin);
                        }}
                        style={{ 
                          borderTopColor: gameTip?.selectedTeam === game.hometeam ? AFL_TEAM_COLORS[game.hometeam] : 'transparent',
                          borderRightColor: gameTip?.selectedTeam === game.hometeam ? AFL_TEAM_COLORS[game.hometeam] : 'transparent',
                          borderBottomColor: gameTip?.selectedTeam === game.hometeam ? AFL_TEAM_COLORS[game.hometeam] : 'transparent',
                          borderLeftColor: AFL_TEAM_COLORS[game.hometeam],
                          borderLeftWidth: '6px'
                        }}
                        className={cn(
                          "flex flex-col items-center gap-4 p-6 rounded-2xl transition-all border-2 relative overflow-hidden group/team",
                          gameTip?.selectedTeam === game.hometeam 
                            ? "bg-stone-50 dark:bg-stone-800/80 shadow-inner" 
                            : "bg-white dark:bg-stone-800/40 border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60",
                          savingTipId === game.id && "opacity-50"
                        )}
                      >
                        {/* Selected Indicator Background */}
                        {gameTip?.selectedTeam === game.hometeam && (
                          <div 
                            className="absolute inset-0 opacity-5 pointer-events-none"
                            style={{ backgroundColor: AFL_TEAM_COLORS[game.hometeam] }}
                          />
                        )}

                        {savingTipId === game.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-black/10 rounded-xl z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-afl-accent"></div>
                          </div>
                        )}
                        <span 
                          className="text-xl font-serif italic font-black tracking-tight group-hover/team:scale-110 transition-transform"
                          style={{ color: AFL_TEAM_COLORS[game.hometeam] }}
                        >
                          {game.hometeam}
                        </span>
                        {hasStarted && (
                          <div className="flex flex-col items-center gap-1">
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
                                <CheckCircle2 className="w-4 h-4" />
                                <Trophy className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        )}
                      </motion.button>

                      {/* VS / Margin */}
                      <div className="flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full scale-150 opacity-20" />
                          <span className="text-sm font-black text-stone-300 dark:text-stone-700 uppercase tracking-[0.5em] relative z-10">VS</span>
                        </div>
                        
                        {game.isFirstInRound && (
                          <div className="w-full max-w-[220px] p-5 rounded-3xl bg-afl-gold/5 border border-afl-gold/20 relative group/margin shadow-sm">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-afl-gold text-white text-[9px] font-black uppercase rounded-full shadow-lg tracking-widest">
                              Bonus Point
                            </div>
                            <label className="block text-[10px] text-center uppercase font-black text-stone-400 mb-3 tracking-widest">Winning Margin</label>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = gameTip?.margin || 0;
                                  saveTip(game.id, game.round, gameTip?.selectedTeam || '', Math.max(0, current - 10));
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-stone-800 text-stone-500 hover:text-afl-accent transition-all text-[10px] font-black shadow-sm hover:shadow-md active:scale-90"
                                title="Decrease by 10"
                              >
                                -10
                              </button>
                              <div className="relative flex-1">
                                <input 
                                  type="number"
                                  placeholder="0"
                                  value={gameTip?.margin || ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const valStr = e.target.value;
                                    const val = parseInt(valStr);
                                    saveTip(game.id, game.round, gameTip?.selectedTeam || '', isNaN(val) ? 0 : (val as number));
                                  }}
                                  className="w-full text-center py-2 border-b-2 border-afl-gold/30 focus:border-afl-gold outline-none font-mono text-4xl font-black bg-transparent dark:text-stone-100 transition-all disabled:opacity-50"
                                />
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = gameTip?.margin || 0;
                                  saveTip(game.id, game.round, gameTip?.selectedTeam || '', current + 10);
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-stone-800 text-stone-500 hover:text-afl-accent transition-all text-[10px] font-black shadow-sm hover:shadow-md active:scale-90"
                                title="Increase by 10"
                              >
                                +10
                              </button>
                            </div>
                            <p className="text-[10px] text-center text-afl-gold mt-4 font-bold italic leading-tight opacity-80">
                              Predict the exact margin!
                            </p>
                          </div>
                        )}

                        {isFinished && game.winner && (
                          <div className="flex items-center gap-2 px-4 py-1.5 bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                            Winner: {game.winner}
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={savingTipId === game.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          saveTip(game.id, game.round, game.awayteam, gameTip?.margin);
                        }}
                        style={{ 
                          borderTopColor: gameTip?.selectedTeam === game.awayteam ? AFL_TEAM_COLORS[game.awayteam] : 'transparent',
                          borderLeftColor: gameTip?.selectedTeam === game.awayteam ? AFL_TEAM_COLORS[game.awayteam] : 'transparent',
                          borderBottomColor: gameTip?.selectedTeam === game.awayteam ? AFL_TEAM_COLORS[game.awayteam] : 'transparent',
                          borderRightColor: AFL_TEAM_COLORS[game.awayteam],
                          borderRightWidth: '6px'
                        }}
                        className={cn(
                          "flex flex-col items-center gap-4 p-6 rounded-2xl transition-all border-2 relative overflow-hidden group/team",
                          gameTip?.selectedTeam === game.awayteam 
                            ? "bg-stone-50 dark:bg-stone-800/80 shadow-inner" 
                            : "bg-white dark:bg-stone-800/40 border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60",
                          savingTipId === game.id && "opacity-50"
                        )}
                      >
                        {/* Selected Indicator Background */}
                        {gameTip?.selectedTeam === game.awayteam && (
                          <div 
                            className="absolute inset-0 opacity-5 pointer-events-none"
                            style={{ backgroundColor: AFL_TEAM_COLORS[game.awayteam] }}
                          />
                        )}

                        {savingTipId === game.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-black/10 rounded-xl z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-afl-accent"></div>
                          </div>
                        )}
                        <span 
                          className="text-xl font-serif italic font-black tracking-tight group-hover/team:scale-110 transition-transform"
                          style={{ color: AFL_TEAM_COLORS[game.awayteam] }}
                        >
                          {game.awayteam}
                        </span>
                        {hasStarted && (
                          <div className="flex flex-col items-center gap-1">
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
                                <CheckCircle2 className="w-4 h-4" />
                                <Trophy className="w-4 h-4" />
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                  <Calendar className="w-4 h-4 text-afl-accent" /> {formatInTimeZone(parseISO(game.date), AWST_TIMEZONE, 'EEEE, d MMMM yyyy')}
                                </p>
                                <p className="text-sm font-medium dark:text-stone-200 flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-afl-accent" /> {formatInTimeZone(parseISO(game.date), AWST_TIMEZONE, 'h:mm a')}
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
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden transition-colors">
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
              <h2 className="text-3xl font-serif italic dark:text-stone-100">The Ladder</h2>
              <p className="text-xs text-stone-400 uppercase tracking-widest font-mono mt-1">2026 Season Ladder</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                    <th className="px-8 py-4 font-medium cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('leaderboard', 'rank')}>
                      <div className="flex items-center gap-1">
                        Pos {leaderboardSort.key === 'rank' && (leaderboardSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-8 py-4 font-medium cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('leaderboard', 'displayName')}>
                      <div className="flex items-center gap-1">
                        Player {leaderboardSort.key === 'displayName' && (leaderboardSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-8 py-4 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('leaderboard', 'points')}>
                      <div className="flex items-center justify-center gap-1">
                        Points {leaderboardSort.key === 'points' && (leaderboardSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-8 py-4 font-medium text-center cursor-pointer hover:text-afl-accent transition-colors" onClick={() => handleSort('leaderboard', 'marginError')}>
                      <div className="flex items-center justify-center gap-1">
                        Margin Error {leaderboardSort.key === 'marginError' && (leaderboardSort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
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
                          <td className="px-8 py-6 font-serif italic text-xl text-stone-300 dark:text-stone-700 relative">
                            {u.favoriteTeam && (
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-1 opacity-60 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: AFL_TEAM_COLORS[u.favoriteTeam] }}
                              />
                            )}
                            {u.rank < 10 ? `0${u.rank}` : u.rank}
                          </td>
                          <td className="px-8 py-6">
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
                          <td className="px-8 py-6 text-center">
                            <span 
                              className="text-2xl font-serif font-bold"
                              style={{ color: accentColor }}
                            >
                              {u.calculatedPoints}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-lg font-mono text-stone-500 dark:text-stone-400">{u.calculatedMargin}</span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-stone-50/30 dark:bg-stone-900/30 border-b border-stone-100 dark:border-stone-800">
                            <td colSpan={4} className="px-8 py-8">
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
                                                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
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
                                                      : "text-stone-900 dark:text-stone-100"
                                                  )}>
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
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                    <th className="px-8 py-4 font-medium">Pos</th>
                    <th className="px-8 py-4 font-medium">Team</th>
                    <th className="px-8 py-4 font-medium text-center">P</th>
                    <th className="px-8 py-4 font-medium text-center">W</th>
                    <th className="px-8 py-4 font-medium text-center">L</th>
                    <th className="px-8 py-4 font-medium text-center">D</th>
                    <th className="px-8 py-4 font-medium text-center">Pts</th>
                    <th className="px-8 py-4 font-medium text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s) => (
                    <tr key={s.name} className="border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                      <td className="px-8 py-6 font-serif italic text-xl text-stone-300 dark:text-stone-700">
                        {s.rank < 10 ? `0${s.rank}` : s.rank}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-2 h-6 rounded-full"
                            style={{ backgroundColor: AFL_TEAM_COLORS[s.name] || '#ccc' }}
                          />
                          <span className="font-bold text-stone-900 dark:text-stone-100">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center font-mono text-stone-600 dark:text-stone-400">{s.played}</td>
                      <td className="px-8 py-6 text-center font-mono text-stone-600 dark:text-stone-400">{s.wins}</td>
                      <td className="px-8 py-6 text-center font-mono text-stone-600 dark:text-stone-400">{s.losses}</td>
                      <td className="px-8 py-6 text-center font-mono text-stone-600 dark:text-stone-400">{s.draws}</td>
                      <td className="px-8 py-6 text-center font-serif font-bold text-xl" style={{ color: accentColor }}>{s.pts}</td>
                      <td className="px-8 py-6 text-center font-mono text-stone-500 dark:text-stone-500">{(s.percentage || 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden transition-colors">
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-serif italic dark:text-stone-100">Results Analysis</h2>
                <p className="text-xs text-stone-400 uppercase tracking-widest font-mono mt-1">Season Performance Breakdown</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
                  <button 
                    onClick={() => setResultsSubTab('individual')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                      resultsSubTab === 'individual' 
                        ? "bg-white dark:bg-stone-700 text-afl-accent shadow-sm" 
                        : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    )}
                  >
                    Individual
                  </button>
                  <button 
                    onClick={() => setResultsSubTab('round-summary')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                      resultsSubTab === 'round-summary' 
                        ? "bg-white dark:bg-stone-700 text-afl-accent shadow-sm" 
                        : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    )}
                  >
                    Round Summary All Players
                  </button>
                </div>

                {resultsSubTab === 'individual' ? (
                  <div className="flex items-center gap-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 shadow-sm">
                    <User className="w-4 h-4 text-stone-400" />
                    <select 
                      value={resultsUserId}
                      onChange={(e) => setResultsUserId(e.target.value)}
                      className="bg-transparent text-sm font-bold outline-none cursor-pointer text-stone-900 dark:text-stone-100"
                    >
                      {allUsers.map(u => (
                        <option key={u.uid} value={u.uid} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                          {u.displayName} {u.uid === user?.uid ? '(You)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 shadow-sm">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <select 
                        value={resultsSelectedRound}
                        onChange={(e) => setResultsSelectedRound(Number(e.target.value))}
                        className="bg-transparent text-sm font-bold outline-none cursor-pointer text-stone-900 dark:text-stone-100"
                      >
                        {rounds.map(r => (
                          <option key={r} value={r} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                            {getRoundLabel(r as number)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 shadow-sm">
                      <User className="w-4 h-4 text-stone-400" />
                      <select 
                        value={resultsUserId}
                        onChange={(e) => setResultsUserId(e.target.value)}
                        className="bg-transparent text-sm font-bold outline-none cursor-pointer text-stone-900 dark:text-stone-100"
                      >
                        <option value="" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">Highlight Player...</option>
                        {allUsers.map(u => (
                          <option key={u.uid} value={u.uid} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                            {u.displayName}
                          </option>
                        ))}
                      </select>
                      {resultsUserId && (
                        <button 
                          onClick={() => {
                            setSelectedProfileUserId(resultsUserId);
                            setProfileSourceTab('results');
                            setActiveTab('player-profile');
                          }}
                          className="ml-2 p-1 text-afl-navy hover:text-afl-accent transition-colors"
                          title="View Full Profile"
                        >
                          <User className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button 
                  onClick={exportToCSV}
                  disabled={resultsSubTab === 'individual' ? userResults.length === 0 : roundSummaryData.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-afl-navy text-white rounded-2xl text-sm font-bold hover:bg-afl-navy/90 transition-all shadow-lg shadow-afl-navy/20 dark:shadow-none disabled:opacity-50 disabled:shadow-none"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export to CSV
                </button>

                {resultsSubTab === 'round-summary' && (
                  <button 
                    onClick={() => {
                      setRecapRound(resultsSelectedRound);
                      setIsRoundRecapOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-afl-accent text-white rounded-2xl text-sm font-bold hover:bg-afl-accent/90 transition-all shadow-lg shadow-afl-accent/20 dark:shadow-none"
                  >
                    <Zap className="w-4 h-4" />
                    Round Recap
                  </button>
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
                <div className="overflow-x-auto">
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
                              className="border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer group"
                            >
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-stone-300 group-hover:text-afl-accent transition-colors" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-stone-300 group-hover:text-afl-accent transition-colors" />
                                  )}
                                  <div>
                                    <p className="font-bold text-stone-900 dark:text-stone-100">{getRoundLabel(r.round)}</p>
                                    <p className="text-[10px] text-stone-400 uppercase tracking-tighter">
                                      {r.finishedGames === r.totalGames ? 'Completed' : r.finishedGames > 0 ? 'In Progress' : 'Upcoming'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className="text-lg font-bold text-stone-900 dark:text-stone-100">{r.correct} / {r.totalGames}</span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className="text-2xl font-serif font-bold text-afl-accent">{r.points}</span>
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
                                            <div key={game.id} className="bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl p-4 shadow-sm">
                                              <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-mono">
                                                  {game.venue} • {formatInTimeZone(parseISO(game.date), AWST_TIMEZONE, 'EEE h:mm a')}
                                                </span>
                                                {game.isFinished ? (
                                                  tip ? (
                                                    isCorrect ? (
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
                                                  <div className={`flex items-center justify-between p-2 rounded-lg ${tip?.selectedTeam === game.hteam ? 'bg-stone-50 dark:bg-stone-700/50 border border-stone-100 dark:border-stone-600' : ''}`}>
                                                    <div className="flex items-center gap-2">
                                                      <span className={`text-sm font-bold ${game.winner === game.hteam ? 'text-stone-900 dark:text-stone-100 underline decoration-afl-accent underline-offset-4' : 'text-stone-500 dark:text-stone-400'}`}>
                                                        {game.hteam}
                                                      </span>
                                                    </div>
                                                    {(game.isFinished || isInProgress) && <span className="text-sm font-mono font-bold">{game.hscore}</span>}
                                                  </div>
                                                  <div className={`flex items-center justify-between p-2 rounded-lg ${tip?.selectedTeam === game.ateam ? 'bg-stone-50 dark:bg-stone-700/50 border border-stone-100 dark:border-stone-600' : ''}`}>
                                                    <div className="flex items-center gap-2">
                                                      <span className={`text-sm font-bold ${game.winner === game.ateam ? 'text-stone-900 dark:text-stone-100 underline decoration-afl-accent underline-offset-4' : 'text-stone-500 dark:text-stone-400'}`}>
                                                        {game.ateam}
                                                      </span>
                                                    </div>
                                                    {(game.isFinished || isInProgress) && <span className="text-sm font-mono font-bold">{game.ascore}</span>}
                                                  </div>
                                                </div>
                                                
                                                <div className="text-right border-l border-stone-100 dark:border-stone-700 pl-4 min-w-[80px]">
                                                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-mono mb-1">Tip</p>
                                                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate max-w-[100px]">
                                                    {tip?.selectedTeam || '—'}
                                                  </p>
                                                  {game.isFirstInRound && tip?.margin !== undefined && (
                                                    <div className="mt-2 pt-2 border-t border-stone-50 dark:border-stone-700">
                                                      <p className="text-[10px] uppercase tracking-widest text-stone-400 font-mono mb-1">Margin</p>
                                                      <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">Tip: {tip.margin}</span>
                                                        {game.isFinished && <span className="text-[10px] text-stone-500 dark:text-stone-400">Actual: {actualMargin}</span>}
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
                            "border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors",
                            u.uid === resultsUserId && "bg-afl-navy/10 dark:bg-afl-navy/20"
                          )}
                        >
                          <td className="px-8 py-6 font-serif italic text-xl text-stone-300 dark:text-stone-700">
                            {u.rank < 10 ? `0${u.rank}` : u.rank}
                          </td>
                          <td className="px-8 py-6">
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
                                <p className="font-bold text-stone-900 dark:text-stone-100">{u.displayName}</p>
                                <p className="text-[10px] text-stone-400 uppercase tracking-tighter">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-lg font-bold text-stone-900 dark:text-stone-100">{u.correct}</span>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-2xl font-serif font-bold text-afl-accent">{u.points}</span>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-lg font-mono text-stone-500 dark:text-stone-400">{u.marginError}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
              
              userTips.forEach(tip => {
                const game = games.find(g => g.id === tip.gameId);
                if (game && game.isFinished) {
                  const actualMargin = Math.abs((game.hscore || 0) - (game.ascore || 0));
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
                }
              });

              const winRate = finishedGames.length > 0 ? (correctTips / finishedGames.length) * 100 : 0;
              const losses = finishedGames.length - correctTips;
              
              // Recent performance (last 5 games)
              const recentGames = [...finishedGames].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
              const recentTips = recentGames.map(g => {
                const tip = userTips.find(t => t.gameId === g.id);
                return { game: g, tip, isCorrect: tip && g.winner === tip.selectedTeam };
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
                        {profileUser.displayName.charAt(0).toUpperCase()}
                        <div className="absolute inset-0 bg-black/10 z-0" />
                      </div>
                      
                      <div className="text-center md:text-left space-y-2">
                        <h2 className="text-4xl font-serif italic text-stone-900 dark:text-stone-100">{profileUser.displayName}</h2>
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
                                style={{ color: AFL_TEAM_COLORS[profileUser.favoriteTeam] }}
                              >
                                {profileUser.favoriteTeam} Fan
                              </span>
                            </div>
                          )}
                          <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-full text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                            {profileUser.role}
                          </span>
                        </div>
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
                            <div key={game.id} className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                  isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                )}>
                                  {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{game.hometeam} v {game.awayteam}</p>
                                  <p className="text-[10px] text-stone-400 uppercase">Round {game.round}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-mono text-stone-400 uppercase">Tip</p>
                                <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{tip?.selectedTeam || '—'}</p>
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
                                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{game.hometeam} v {game.awayteam}</p>
                                      <p className="text-[10px] text-stone-400 uppercase">{format(parseISO(game.date), 'MMM d')}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{tip.selectedTeam}</span>
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
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl transition-colors">
              <div className="flex items-center gap-3 mb-8">
                <Settings className="w-8 h-8 text-stone-900 dark:text-stone-100" />
                <h2 className="text-3xl font-serif italic text-stone-900 dark:text-stone-100">Admin Controls</h2>
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
                              {Object.keys(AFL_TEAM_COLORS).map(team => (
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
                                  style={{ backgroundColor: AFL_TEAM_COLORS[u.favoriteTeam] }}
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

                      <div className="flex items-center gap-3">
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

              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">Unlock Rounds for Players</h3>
                
                <div className="grid gap-4">
                  {allUsers.filter(u => u.uid !== user?.uid).map(u => (
                    <div key={u.uid} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700">
                      <div>
                        <p className="font-bold text-stone-900 dark:text-stone-100">{u.displayName}</p>
                        <p className="text-xs text-stone-400">{u.email}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-stone-400 uppercase mr-2">Round {currentRound}:</span>
                        {u.unlockedRounds?.includes(currentRound) ? (
                          <button 
                            onClick={async () => {
                              await updateDoc(doc(db, 'users', u.uid), {
                                unlockedRounds: arrayRemove(currentRound)
                              });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors"
                          >
                            <Lock className="w-4 h-4" /> Lock Round
                          </button>
                        ) : (
                          <button 
                            onClick={async () => {
                              await updateDoc(doc(db, 'users', u.uid), {
                                unlockedRounds: arrayUnion(currentRound)
                              });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-afl-navy text-white rounded-xl text-xs font-bold hover:bg-afl-navy/90 transition-colors"
                          >
                            <Unlock className="w-4 h-4" /> Unlock Round
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-8 border-t border-stone-100">
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
                    <select 
                      value={adminSelectedRound}
                      onChange={(e) => setAdminSelectedRound(Number(e.target.value))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100"
                    >
                      {rounds.map(r => (
                        <option key={r} value={r} className="text-stone-900 dark:text-stone-100 dark:bg-stone-900">Round {r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {adminSelectedUserId && (
                  <div className="mt-6 space-y-4">
                    {games.filter(g => g.round === adminSelectedRound).map(game => {
                      const playerTip = allTips.find(t => t.uid === adminSelectedUserId && t.gameId === game.id);
                      
                      return (
                        <div key={game.id} className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{game.hometeam} vs {game.awayteam}</p>
                            <p className="text-[10px] text-stone-400 uppercase">{formatInTimeZone(parseISO(game.date), AWST_TIMEZONE, 'EEE MMM d, h:mm a')} AWST</p>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                              <button 
                                onClick={() => handleAdminTipUpdate(game.id, game.hometeam, playerTip?.margin)}
                                disabled={isActionLoading}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50",
                                  playerTip?.selectedTeam === game.hometeam ? "bg-afl-navy text-white" : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
                                )}
                              >
                                {game.hometeam}
                              </button>
                              <button 
                                onClick={() => handleAdminTipUpdate(game.id, game.awayteam, playerTip?.margin)}
                                disabled={isActionLoading}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50",
                                  playerTip?.selectedTeam === game.awayteam ? "bg-afl-navy text-white" : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
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
                                  className="p-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-afl-accent transition-colors disabled:opacity-50"
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
                                  className="w-16 p-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-afl-accent outline-none text-stone-900 dark:text-stone-100 disabled:opacity-50 text-center"
                                />
                                <button 
                                  onClick={() => {
                                    const current = playerTip?.margin || 0;
                                    handleAdminTipUpdate(game.id, playerTip?.selectedTeam || game.hometeam, current + 10);
                                  }}
                                  disabled={isActionLoading}
                                  className="p-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-afl-accent transition-colors disabled:opacity-50"
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
                  <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">Player Selections Report</h3>
                  <button 
                    onClick={downloadPlayerSelectionsCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
                
                <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                          <th className="px-6 py-4 font-medium sticky left-0 bg-white dark:bg-stone-900 z-10">Player</th>
                          {rounds.map(r => (
                            <th key={r} className="px-6 py-4 font-medium text-center border-l border-stone-100 dark:border-stone-800">
                              {getRoundLabel(r as number)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map(u => (
                          <tr key={u.uid} className="border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4 sticky left-0 bg-white dark:bg-stone-900 z-10 border-r border-stone-100 dark:border-stone-800">
                              <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate max-w-[120px]">{u.displayName}</p>
                              <p className="text-[8px] text-stone-400 uppercase truncate max-w-[120px]">{u.email}</p>
                            </td>
                            {rounds.map(r => {
                              const roundGames = games.filter(g => g.round === r);
                              const userTips = allTips.filter(t => t.uid === u.uid);
                              
                              const roundTips = userTips.filter(t => roundGames.some(g => g.id === t.gameId));
                              const correctTips = roundTips.filter(tip => {
                                const game = games.find(g => g.id === tip.gameId);
                                return game && game.isFinished && game.winner === tip.selectedTeam;
                              }).length;
                              
                              return (
                                <td key={r} className="px-4 py-4 text-center border-l border-stone-100 dark:border-stone-800">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                      {correctTips}
                                    </span>
                                    <span className="text-[8px] text-stone-400 uppercase">
                                      /{roundGames.length}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-2xl">
              <h3 className="text-xl font-serif italic mb-4">System Info</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Total Games</p>
                  <p className="text-2xl font-mono">{games.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Total Tips</p>
                  <p className="text-2xl font-mono">{allTips.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Total Players</p>
                  <p className="text-2xl font-mono">{allUsers.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Current Round</p>
                  <p className="text-2xl font-mono">{currentRound}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-stone-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm font-serif italic font-bold">Adrian's Tipping Page</p>
            <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">Built for the 2026 AFL Season</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-afl-accent animate-pulse"></div>
              Live Data from Squiggle API
            </div>
          </div>
        </div>
      </footer>

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
    </div>
  );
}
