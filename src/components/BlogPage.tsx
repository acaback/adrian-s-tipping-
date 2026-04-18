import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, User as UserIcon, ArrowLeft, Clock, Tag, ChevronRight, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogPost } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BlogPageProps {
  posts: BlogPost[];
  onNavigate?: (tab: 'dashboard' | 'war-room' | 'leaderboard' | 'standings' | 'results' | 'admin' | 'player-profile' | 'blog') => void;
}

const BlogPage: React.FC<BlogPageProps> = ({ posts, onNavigate }) => {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? post.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const selectedPost = posts.find(p => p.id === selectedPostId);

  const categories = Array.from(new Set(posts.map(p => p.category)));

  if (selectedPost) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={() => setSelectedPostId(null)}
          className="group flex items-center gap-2 text-stone-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Back to News</span>
        </button>

        <article>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                selectedPost.category === 'Analysis' ? 'bg-blue-500/20 text-blue-400' :
                selectedPost.category === 'Injuries' ? 'bg-red-500/20 text-red-400' :
                selectedPost.category === 'Tactics' ? 'bg-purple-500/20 text-purple-400' :
                'bg-afl-gold/20 text-afl-gold'
              }`}>
                {selectedPost.category}
              </span>
              <div className="h-1 w-1 rounded-full bg-stone-700" />
              <span className="text-[10px] text-stone-500 font-mono uppercase tracking-widest">
                {selectedPost.readTime || '5 min read'}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-serif italic text-white mb-6 leading-tight">
              {selectedPost.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-stone-400 border-y border-white/5 py-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-afl-navy flex items-center justify-center border border-white/10">
                  <UserIcon className="w-4 h-4 text-afl-gold" />
                </div>
                <span className="text-xs font-medium text-stone-300">{selectedPost.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-stone-500" />
                <span className="text-xs">{new Date(selectedPost.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {selectedPost.image && (
            <div className="relative aspect-video rounded-3xl overflow-hidden mb-12 border border-white/10 shadow-2xl">
              <img 
                src={selectedPost.image} 
                alt={selectedPost.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          <div className="prose prose-invert prose-stone max-w-none lg:prose-lg lg:leading-relaxed lg:tracking-wide">
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selectedPost.content}
              </ReactMarkdown>
            </div>
          </div>
        </article>

        <div className="mt-16 pt-8 border-t border-white/5">
          <h3 className="text-xl font-serif italic text-white mb-8">Related Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.filter(p => p.id !== selectedPost.id).slice(0, 2).map(post => (
              <button
                key={post.id}
                onClick={() => {
                  setSelectedPostId(post.id);
                  window.scrollTo(0, 0);
                }}
                className="group flex flex-col text-left p-6 bg-stone-900 border border-white/5 rounded-3xl hover:border-afl-gold/30 transition-all hover:shadow-xl"
              >
                <span className="text-[10px] font-bold text-afl-gold uppercase tracking-widest mb-3">{post.category}</span>
                <h4 className="text-lg font-serif italic text-white group-hover:text-afl-gold transition-colors line-clamp-2">
                  {post.title}
                </h4>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-afl-gold" />
          <h1 className="text-3xl font-serif italic text-white tracking-tight">Strategy & Analysis</h1>
        </div>
        <p className="text-stone-400 max-w-2xl leading-relaxed">
          Tactical breakdowns, injury updates, and data-driven insights to help you dominate the tipping ladder.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Featured Post */}
        <div className="lg:col-span-2 space-y-12">
          {filteredPosts.length > 0 ? (
            <>
              {filteredPosts.slice(0, 1).map(post => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedPostId(post.id)}
                >
                  <div className="relative aspect-[21/9] rounded-[2rem] overflow-hidden mb-8 border border-white/10 shadow-2xl transition-transform duration-500 group-hover:scale-[1.01]">
                    {post.image ? (
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-afl-navy to-stone-900 flex items-center justify-center">
                        <BookOpen className="w-20 h-20 text-white/5" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-8 left-8 right-8">
                       <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 rounded-full bg-afl-gold text-black text-[10px] font-black uppercase tracking-widest shadow-lg">
                          Featured
                        </span>
                        <span className="text-[10px] text-white/70 uppercase tracking-widest font-mono">
                          {post.readTime || '5 min read'}
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-serif italic text-white mb-4 leading-tight group-hover:text-afl-gold transition-colors">
                        {post.title}
                      </h2>
                    </div>
                  </div>
                  <p className="text-stone-400 text-lg leading-relaxed lg:tracking-wide mb-6 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between py-4 border-t border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center">
                          <UserIcon className="w-3 h-3 text-stone-400" />
                        </div>
                        <span className="text-xs text-stone-300">{post.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        <span className="text-xs text-stone-500">{new Date(post.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-afl-gold font-bold text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                      Read Full Story
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Regular Feed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                {filteredPosts.slice(1).map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (idx + 1) }}
                    className="group cursor-pointer bg-stone-900/40 p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all"
                    onClick={() => setSelectedPostId(post.id)}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${
                        post.category === 'Analysis' ? 'bg-blue-500/20 text-blue-400' :
                        post.category === 'Injuries' ? 'bg-red-500/20 text-red-400' :
                        post.category === 'Tactics' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-afl-gold/20 text-afl-gold'
                      }`}>
                        {post.category}
                      </span>
                      <span className="text-[9px] text-stone-500 font-mono italic">
                        {post.readTime || '3 min read'}
                      </span>
                    </div>
                    <h3 className="text-xl font-serif italic text-white mb-3 group-hover:text-afl-gold transition-colors leading-tight">
                      {post.title}
                    </h3>
                    <p className="text-stone-400 text-sm leading-relaxed lg:tracking-wide mb-6 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                      <span className="text-[10px] text-stone-500 uppercase font-mono">{new Date(post.date).toLocaleDateString()}</span>
                      <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-afl-gold group-hover:text-black transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center bg-stone-900/40 rounded-[2.5rem] border border-dashed border-white/10">
              <BookOpen className="w-12 h-12 text-stone-700 mx-auto mb-4 opacity-20" />
              <p className="text-stone-500 font-serif italic text-lg">No tactical reports found matching your criteria.</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
                className="mt-6 text-afl-gold font-bold text-xs uppercase tracking-[0.2em] hover:text-white transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-12">
          <div className="bg-stone-950/40 p-6 rounded-[2rem] border border-white/5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input 
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-stone-900 border border-white/5 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-afl-gold/50 placeholder:text-stone-600 transition-all"
              />
            </div>
          </div>
          
          <div className="bg-stone-950/40 p-8 rounded-[2rem] border border-white/5">
            <h4 className="text-xs font-black uppercase text-white tracking-[0.2em] mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-afl-gold" />
                Categories
              </div>
              {selectedCategory && (
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-[10px] text-stone-500 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </h4>
            <div className="space-y-4">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={cn(
                    "w-full flex items-center justify-between group py-2 px-3 rounded-xl transition-all",
                    selectedCategory === cat ? "bg-afl-gold/10 text-afl-gold" : "text-stone-400 hover:text-white"
                  )}
                >
                  <span className="font-medium">{cat}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded font-mono",
                    selectedCategory === cat ? "bg-afl-gold/20 text-afl-gold" : "bg-stone-900 text-stone-500"
                  )}>
                    {posts.filter(p => p.category === cat).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-afl-navy/50 to-stone-950 p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-afl-gold/10 blur-[60px] -mr-16 -mt-16" />
            <h4 className="text-white font-serif italic text-xl mb-4 relative z-10">AI Deployment</h4>
            <p className="text-stone-400 text-sm leading-relaxed mb-6 relative z-10">
              Need deeper insights for your tips? Our scouts are ready to analyze the latest matchups.
            </p>
            <button 
              onClick={() => onNavigate?.('war-room')}
              className="w-full py-4 bg-afl-gold text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-afl-gold/10"
            >
              Launch Command Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
