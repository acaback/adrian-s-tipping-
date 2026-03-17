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
  getDocs
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
  Lock, 
  Unlock, 
  Settings,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Download,
  Dices,
  Zap,
  Moon,
  Sun
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AWST_TIMEZONE = 'Australia/Perth';

const ADMIN_EMAIL = "acaback@gmail.com";

interface LeaderboardItem extends UserProfile {
  calculatedPoints: number;
  calculatedMargin: number;
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
  const [activeTab, setActiveTab] = useState<'war-room' | 'leaderboard' | 'results' | 'admin'>('war-room');
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string>('');
  const [adminSelectedRound, setAdminSelectedRound] = useState<number>(currentRound);
  const [warRoomUserId, setWarRoomUserId] = useState<string>('');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Email/Password Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dark Mode Effect
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
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        displayName: customDisplayName || firebaseUser.displayName || 'Anonymous',
        email: firebaseUser.email || '',
        role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'user',
        totalPoints: 0,
        totalMargin: 0,
        unlockedRounds: []
      };
      await setDoc(userRef, newProfile);
      setProfile(newProfile);
    } else {
      setProfile(userSnap.data() as UserProfile);
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
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch("https://api.squiggle.com.au/?q=games&year=2026");
        const data = await res.json();
        const rawGames: any[] = data.games;
        
        // Process games and identify first game of each round
        const processedGames: Game[] = rawGames.map(g => ({
          id: g.id,
          round: g.round,
          year: g.year,
          hometeam: g.hteam,
          awayteam: g.ateam,
          date: g.date,
          venue: g.venue,
          winner: g.winner,
          hscore: g.hscore,
          ascore: g.ascore,
          isFinished: g.complete === 100
        }));

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

        // Determine current round based on date
        const now = new Date();
        const upcomingGame = finalGames.find(g => new Date(g.date) > now);
        if (upcomingGame) {
          setCurrentRound(upcomingGame.round);
        } else {
          setCurrentRound(Math.max(...finalGames.map(g => g.round)));
        }
      } catch (err) {
        console.error("Failed to fetch games:", err);
        setError("Could not load AFL games. Please try again later.");
      }
    };

    fetchGames();
  }, []);

  // Listen for Tips
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tips'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userTips = snapshot.docs.map(doc => doc.data() as Tip);
      setTips(userTips);
    });
    return unsubscribe;
  }, [user]);

  // Listen for All Users and All Tips (for Leaderboard)
  useEffect(() => {
    if (!user) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
    const unsubTips = onSnapshot(collection(db, 'tips'), (snapshot) => {
      setAllTips(snapshot.docs.map(doc => doc.data() as Tip));
    });
    return () => {
      unsubUsers();
      unsubTips();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please try again.");
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
      setError("This game is already locked!");
      return;
    }

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

    return data.sort((a, b) => {
      if (b.calculatedPoints !== a.calculatedPoints) {
        return b.calculatedPoints - a.calculatedPoints;
      }
      return a.calculatedMargin - b.calculatedMargin;
    });
  }, [allUsers, allTips, games]);

  const userResults = useMemo(() => {
    if (!user) return [];
    
    const roundsList = Array.from(new Set(games.map(g => g.round))).sort((a: any, b: any) => a - b);
    
    return roundsList.map(r => {
      const roundGames = games.filter(g => g.round === r && g.isFinished);
      const roundTips = tips.filter(t => t.round === r);
      
      let correct = 0;
      let points = 0;
      let marginError = 0;
      
      roundGames.forEach(game => {
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
        totalGames: roundGames.length
      };
    }).filter(r => r.totalGames > 0);
  }, [user, games, tips]);

  const exportToCSV = () => {
    if (!userResults.length) return;
    
    const headers = ['Round', 'Correct Tips', 'Total Points', 'Margin Error'];
    const rows = userResults.map(r => [
      r.round,
      r.correct,
      r.points,
      r.marginError
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tipping_results_${user?.displayName || 'user'}.csv`);
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
    }
  };

  const handleAdminTipUpdate = async (gameId: number, selectedTeam: string, margin?: number) => {
    if (!adminSelectedUserId) return;
    
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const tipId = `${adminSelectedUserId}_${gameId}`;
    const tipData: Tip = {
      uid: adminSelectedUserId,
      gameId: gameId,
      round: game.round,
      selectedTeam: selectedTeam,
      updatedAt: new Date().toISOString()
    };
    if (margin !== undefined) tipData.margin = margin;

    try {
      await setDoc(doc(db, 'tips', tipId), tipData);
    } catch (err) {
      console.error("Admin tip update failed:", err);
      setError("Failed to update player tip.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-black/5">
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 text-emerald-600 mx-auto mb-6" />
            <h1 className="text-4xl font-serif italic mb-2">Adrian's Tipping Page</h1>
            <p className="text-stone-500 font-sans">AFL 2026 Season • Family & Friends</p>
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
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
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
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
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
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
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
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-400 font-mono">Or continue with</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-black text-white rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-3"
          >
            <User className="w-5 h-5" />
            Sign in with Google
          </button>
          
          <button 
            onClick={() => {
              setIsSignUpMode(!isSignUpMode);
              setAuthError(null);
            }}
            className="w-full mt-6 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            {isSignUpMode ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    );
  }

  const roundGames = games.filter(g => g.round === currentRound);
  const warRoomTips = allTips.filter(t => t.uid === warRoomUserId);
  const rounds = Array.from(new Set(games.map(g => g.round))).sort((a: any, b: any) => a - b);

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            <span className="font-serif italic text-xl font-bold tracking-tight">Adrian's Tipping</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('war-room')}
              className={cn("text-sm font-medium transition-colors", activeTab === 'war-room' ? "text-emerald-600 dark:text-emerald-500" : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100")}
            >
              The War Room
            </button>
            <button 
              onClick={() => setActiveTab('leaderboard')}
              className={cn("text-sm font-medium transition-colors", activeTab === 'leaderboard' ? "text-emerald-600 dark:text-emerald-500" : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100")}
            >
              Leaderboard
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={cn("text-sm font-medium transition-colors", activeTab === 'results' ? "text-emerald-600 dark:text-emerald-500" : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100")}
            >
              Results
            </button>
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={cn("text-sm font-medium transition-colors", activeTab === 'admin' ? "text-emerald-600 dark:text-emerald-500" : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100")}
              >
                Admin
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{profile?.displayName}</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-tighter">{profile?.role}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
              <LogOut className="w-5 h-5 text-stone-400" />
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
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
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto font-bold">✕</button>
          </div>
        )}

        {activeTab === 'war-room' && (
          <div className="space-y-8">
            {/* The War Room Header & Sliding Bar */}
            <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Zap className="w-32 h-32 text-emerald-500" />
              </div>
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                  <div>
                    <h2 className="text-4xl font-serif italic text-emerald-400">The War Room</h2>
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
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all group"
                    >
                      <Dices className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
                      Randomise
                    </button>
                    
                    <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                      <button 
                      disabled={currentRound === 1}
                      onClick={() => setCurrentRound(prev => prev - 1)}
                      className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-20"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-4 text-center min-w-[100px]">
                      <span className="text-sm font-mono font-bold">R{currentRound}</span>
                    </div>
                    <button 
                      disabled={currentRound === Math.max(...(rounds as number[]), 0)}
                      onClick={() => setCurrentRound(prev => prev + 1)}
                      className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-20"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
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
                            ? "bg-emerald-500/10 border-emerald-500/30" 
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                        onClick={() => setExpandedGameId(expandedGameId === game.id ? null : game.id)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-mono text-stone-500 uppercase">{formatInTimeZone(parseISO(game.date), AWST_TIMEZONE, 'EEE h:mm a')}</span>
                          {gameTip && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        </div>
                        <div className="space-y-1">
                          <div className={cn("text-xs font-bold truncate", gameTip?.selectedTeam === game.hometeam && "text-emerald-400")}>
                            {game.hometeam}
                          </div>
                          <div className={cn("text-xs font-bold truncate", gameTip?.selectedTeam === game.awayteam && "text-emerald-400")}>
                            {game.awayteam}
                          </div>
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
                const isFinished = game.isFinished;
                const isExpanded = expandedGameId === game.id;

                return (
                  <div 
                    key={game.id} 
                    className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                  >
                    <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-stone-400" />
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                          {formatInTimeZone(parseISO(game.date), AWST_TIMEZONE, 'EEE d MMM, h:mm a')} AWST • {game.venue}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {isLocked ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-200 dark:bg-stone-800 rounded text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase">
                            <Lock className="w-3 h-3" /> Locked
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                            <Unlock className="w-3 h-3" /> Open
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                      </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                      {/* Home Team */}
                      <button 
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          saveTip(game.id, game.round, game.hometeam, gameTip?.margin);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-4 p-4 rounded-xl transition-all border-2",
                          gameTip?.selectedTeam === game.hometeam 
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-inner" 
                            : "bg-white dark:bg-stone-800 border-transparent hover:border-stone-200 dark:hover:border-stone-700",
                          isLocked && "cursor-default opacity-80"
                        )}
                      >
                        <span className="text-xl font-bold dark:text-stone-100">{game.hometeam}</span>
                        {isFinished && (
                          <span className="text-3xl font-serif italic text-stone-400 dark:text-stone-500">{game.hscore}</span>
                        )}
                      </button>

                      {/* VS / Margin */}
                      <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-mono text-stone-300 uppercase tracking-widest">VS</span>
                        
                        {game.isFirstInRound && (
                          <div className="w-full max-w-[120px]">
                            <label className="block text-[10px] text-center uppercase font-bold text-stone-400 mb-2">Winning Margin</label>
                            <input 
                              type="number"
                              disabled={isLocked}
                              placeholder="Pts"
                              value={gameTip?.margin || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const valStr = e.target.value;
                                const val = parseInt(valStr);
                                saveTip(game.id, game.round, gameTip?.selectedTeam || '', isNaN(val) ? 0 : (val as number));
                              }}
                              className="w-full text-center py-2 border-b-2 border-stone-200 dark:border-stone-800 focus:border-emerald-500 outline-none font-serif text-xl bg-transparent dark:text-stone-100 transition-colors disabled:opacity-50"
                            />
                            <p className="text-[10px] text-center text-emerald-600 mt-2 font-medium italic">Bonus Point Game!</p>
                          </div>
                        )}

                        {isFinished && game.winner && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-stone-900 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Winner: {game.winner}
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <button 
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          saveTip(game.id, game.round, game.awayteam, gameTip?.margin);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-4 p-4 rounded-xl transition-all border-2",
                          gameTip?.selectedTeam === game.awayteam 
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-inner" 
                            : "bg-white dark:bg-stone-800 border-transparent hover:border-stone-200 dark:hover:border-stone-700",
                          isLocked && "cursor-default opacity-80"
                        )}
                      >
                        <span className="text-xl font-bold dark:text-stone-100">{game.awayteam}</span>
                        {isFinished && (
                          <span className="text-3xl font-serif italic text-stone-400 dark:text-stone-500">{game.ascore}</span>
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-6 py-6 bg-stone-50 dark:bg-stone-900/50 border-t border-stone-100 dark:border-stone-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Game Status</p>
                            <p className="text-sm font-medium dark:text-stone-200">
                              {isFinished ? (
                                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
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
                            <p className="text-sm font-medium dark:text-stone-200">{game.venue}</p>
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
                                <p className="text-lg font-serif italic font-bold text-emerald-700 dark:text-emerald-500">
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
                                    <p>Error: <span className="font-bold text-emerald-600">{Math.abs(gameTip.margin - Math.abs((game.hscore || 0) - (game.ascore || 0)))} pts</span></p>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden transition-colors">
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
              <h2 className="text-3xl font-serif italic dark:text-stone-100">The Ladder</h2>
              <p className="text-xs text-stone-400 uppercase tracking-widest font-mono mt-1">2026 Season Standings</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                    <th className="px-8 py-4 font-medium">Pos</th>
                    <th className="px-8 py-4 font-medium">Player</th>
                    <th className="px-8 py-4 font-medium text-center">Points</th>
                    <th className="px-8 py-4 font-medium text-center">Margin Error</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((u, idx) => (
                    <tr key={u.uid} className={cn("border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors", u.uid === user?.uid && "bg-emerald-50/30 dark:bg-emerald-900/10")}>
                      <td className="px-8 py-6 font-serif italic text-xl text-stone-300 dark:text-stone-700">
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 dark:text-stone-100">{u.displayName}</p>
                            <p className="text-[10px] text-stone-400 uppercase tracking-tighter">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-500">{u.calculatedPoints}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-lg font-mono text-stone-500 dark:text-stone-400">{u.calculatedMargin}</span>
                      </td>
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
                <h2 className="text-3xl font-serif italic dark:text-stone-100">Your Results</h2>
                <p className="text-xs text-stone-400 uppercase tracking-widest font-mono mt-1">Season Performance Breakdown</p>
              </div>
              <button 
                onClick={exportToCSV}
                disabled={userResults.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50 disabled:shadow-none"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export to CSV
              </button>
            </div>
            
            {userResults.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-stone-200 dark:text-stone-800 mx-auto mb-4" />
                <p className="text-stone-500 dark:text-stone-400 font-serif italic">No completed rounds yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-stone-400 font-mono border-b border-stone-100 dark:border-stone-800">
                      <th className="px-8 py-4 font-medium">Round</th>
                      <th className="px-8 py-4 font-medium text-center">Correct Tips</th>
                      <th className="px-8 py-4 font-medium text-center">Total Points</th>
                      <th className="px-8 py-4 font-medium text-center">Margin Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userResults.map((r) => (
                      <tr key={r.round} className="border-b border-stone-50 dark:border-stone-800 hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                        <td className="px-8 py-6 font-serif italic text-xl text-stone-300 dark:text-stone-700">
                          Round {r.round < 10 ? `0${r.round}` : r.round}
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-bold text-stone-900 dark:text-stone-100">{r.correct} / {r.totalGames}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-500">{r.points}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-mono text-stone-500 dark:text-stone-400">{r.marginError}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-stone-900 dark:bg-stone-950 text-white">
                      <td className="px-8 py-6 font-serif italic text-xl">Season Total</td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-lg font-bold">{userResults.reduce((acc, r) => acc + r.correct, 0)}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-2xl font-serif font-bold text-emerald-400">{userResults.reduce((acc, r) => acc + r.points, 0)}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-lg font-mono">{userResults.reduce((acc, r) => acc + r.marginError, 0)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl transition-colors">
              <div className="flex items-center gap-3 mb-8">
                <Settings className="w-8 h-8 text-stone-900 dark:text-stone-100" />
                <h2 className="text-3xl font-serif italic text-stone-900 dark:text-stone-100">Admin Controls</h2>
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
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors"
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
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-stone-900 dark:text-stone-100"
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
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-stone-900 dark:text-stone-100"
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
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold transition-colors",
                                  playerTip?.selectedTeam === game.hometeam ? "bg-emerald-600 text-white" : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
                                )}
                              >
                                {game.hometeam}
                              </button>
                              <button 
                                onClick={() => handleAdminTipUpdate(game.id, game.awayteam, playerTip?.margin)}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold transition-colors",
                                  playerTip?.selectedTeam === game.awayteam ? "bg-emerald-600 text-white" : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
                                )}
                              >
                                {game.awayteam}
                              </button>
                            </div>

                            {game.isFirstInRound && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-stone-400 uppercase">Margin:</span>
                                <input 
                                  type="number"
                                  value={playerTip?.margin || ''}
                                  onChange={(e) => handleAdminTipUpdate(game.id, playerTip?.selectedTeam || game.hometeam, Number(e.target.value))}
                                  placeholder="Pts"
                                  className="w-16 p-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-stone-900 dark:text-stone-100"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Live Data from Squiggle API
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
