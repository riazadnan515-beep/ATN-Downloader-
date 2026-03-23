/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Link as LinkIcon, 
  History, 
  Trash2, 
  Share2, 
  Moon, 
  Sun, 
  Clipboard, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Music,
  User,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  authorAvatar: string;
  videoUrl: string;
  noWatermarkUrl: string;
  music?: {
    title: string;
    author: string;
    cover: string;
  };
  timestamp: number;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VideoData[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load history and theme from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('tiktok_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('tiktok_history', JSON.stringify(history));
  }, [history]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setVideoData(null);

    try {
      const isNetlify = window.location.hostname.includes('netlify.app');
      const apiBase = isNetlify ? '/.netlify/functions' : '/api';
      
      const response = await fetch(`${apiBase}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch video');
      }

      const newVideo: VideoData = {
        ...data,
        timestamp: Date.now(),
      };

      setVideoData(newVideo);
      
      // Add to history if not already there
      setHistory(prev => {
        const filtered = prev.filter(v => v.id !== newVideo.id);
        return [newVideo, ...filtered].slice(0, 20); // Keep last 20
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (videoUrl: string, type: 'watermark' | 'no-watermark') => {
    if (!videoData) return;
    
    const filename = `KTN_${videoData.author}_${videoData.id}_${type}.mp4`;
    
    // Check if we're on Netlify or local
    const isNetlify = window.location.hostname.includes('netlify.app');
    const apiBase = isNetlify ? '/.netlify/functions' : '/api';
    const downloadUrl = `${apiBase}/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}`;
    
    // Method 1: Open in new tab
    window.open(downloadUrl, '_blank');
    
    // Method 2: Fallback link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to read clipboard');
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('tiktok_history');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const shareVideo = async (video: VideoData) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Check out this TikTok video by ${video.author}`,
          url: `https://www.tiktok.com/@${video.author}/video/${video.id}`,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(`https://www.tiktok.com/@${video.author}/video/${video.id}`);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      darkMode ? "bg-[#0F0F0F] text-white" : "bg-gray-50 text-gray-900"
    )}>
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between",
        darkMode ? "bg-[#0F0F0F]/80 border-white/10" : "bg-white/80 border-gray-200"
      )}>
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-[#FE2C55] to-[#25F4EE] p-1.5 rounded-lg">
            <Play className="w-5 h-5 text-white fill-current" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">KTN Downloader</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "p-2 rounded-full transition-colors",
              darkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
            )}
          >
            <History className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "p-2 rounded-full transition-colors",
              darkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
            )}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 space-y-8">
        {/* Input Section */}
        <section className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight">Download TikTok Videos</h2>
            <p className={cn(
              "text-sm",
              darkMode ? "text-gray-400" : "text-gray-500"
            )}>Paste the link below to get your video without watermark</p>
          </div>

          <form onSubmit={handleFetch} className="relative group">
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-2xl border transition-all duration-300",
              darkMode 
                ? "bg-[#1A1A1A] border-white/10 focus-within:border-[#FE2C55]/50" 
                : "bg-white border-gray-200 focus-within:border-[#FE2C55]/50 shadow-sm"
            )}>
              <div className="pl-2">
                <LinkIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Paste TikTok link here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none py-2 text-sm"
              />
              <button 
                type="button"
                onClick={handlePaste}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  darkMode ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                )}
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Clipboard className="w-5 h-5" />}
              </button>
            </div>

            <button 
              type="submit"
              disabled={loading || !url.trim()}
              className={cn(
                "w-full mt-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95",
                loading 
                  ? "bg-gray-600 cursor-not-allowed" 
                  : "bg-gradient-to-r from-[#FE2C55] to-[#FF4D6D] hover:shadow-lg hover:shadow-[#FE2C55]/20 text-white"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Fetching Video...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Get Video
                </>
              )}
            </button>
          </form>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}
        </section>

        {/* Result Section */}
        <AnimatePresence mode="wait">
          {videoData && (
            <motion.section
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "rounded-3xl overflow-hidden border",
                darkMode ? "bg-[#1A1A1A] border-white/10" : "bg-white border-gray-200 shadow-xl"
              )}
            >
              <div className="relative aspect-[9/16] max-h-[400px] overflow-hidden">
                <img 
                  src={videoData.thumbnail} 
                  alt="Thumbnail" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-4 left-4 right-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <img 
                      src={videoData.authorAvatar} 
                      alt={videoData.author} 
                      className="w-8 h-8 rounded-full border border-white/20"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-semibold text-white text-sm">@{videoData.author}</span>
                  </div>
                  <p className="text-white text-sm line-clamp-2 leading-relaxed">
                    {videoData.title}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {videoData.music && (
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-xl",
                    darkMode ? "bg-white/5" : "bg-gray-50"
                  )}>
                    <Music className="w-4 h-4 text-[#FE2C55]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{videoData.music.title}</p>
                      <p className="text-[10px] opacity-50 truncate">{videoData.music.author}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => handleDownload(videoData.noWatermarkUrl, 'no-watermark')}
                    disabled={downloading}
                    className="w-full py-3 rounded-xl bg-[#FE2C55] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#E62A4E] transition-colors disabled:opacity-50"
                  >
                    {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    Download (No Watermark)
                  </button>
                  <button 
                    onClick={() => handleDownload(videoData.videoUrl, 'watermark')}
                    disabled={downloading}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 border",
                      darkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                    )}
                  >
                    <Download className="w-5 h-5" />
                    Download (With Watermark)
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button 
                    onClick={() => shareVideo(videoData)}
                    className="flex items-center gap-2 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Video
                  </button>
                  <a 
                    href={`https://www.tiktok.com/@${videoData.author}/video/${videoData.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on TikTok
                  </a>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Features Info */}
        {!videoData && !loading && (
          <section className="grid grid-cols-2 gap-4">
            {[
              { icon: <Download className="w-5 h-5" />, title: "No Watermark", desc: "High quality MP4" },
              { icon: <User className="w-5 h-5" />, title: "No Login", desc: "Fast & Anonymous" },
              { icon: <History className="w-5 h-5" />, title: "History", desc: "Save your downloads" },
              { icon: <Share2 className="w-5 h-5" />, title: "Easy Share", desc: "Share with friends" },
            ].map((feature, i) => (
              <div key={i} className={cn(
                "p-4 rounded-2xl border flex flex-col items-center text-center gap-2",
                darkMode ? "bg-[#1A1A1A] border-white/5" : "bg-white border-gray-100 shadow-sm"
              )}>
                <div className="p-2 rounded-full bg-[#FE2C55]/10 text-[#FE2C55]">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-bold">{feature.title}</h3>
                <p className="text-[10px] opacity-50">{feature.desc}</p>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "fixed bottom-0 left-0 right-0 z-[70] rounded-t-[32px] max-h-[80vh] overflow-hidden flex flex-col",
                darkMode ? "bg-[#1A1A1A]" : "bg-white"
              )}
            >
              <div className="w-12 h-1.5 bg-gray-500/20 rounded-full mx-auto mt-4 mb-2" />
              
              <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                <h3 className="text-xl font-bold">Download History</h3>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-xs font-medium text-red-500 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="py-12 text-center space-y-2 opacity-40">
                    <History className="w-12 h-12 mx-auto" />
                    <p className="text-sm font-medium">No history yet</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      className={cn(
                        "flex gap-3 p-3 rounded-2xl border group relative",
                        darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
                      )}
                    >
                      <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0">
                        <img 
                          src={item.thumbnail} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold truncate">@{item.author}</p>
                          <p className="text-[10px] opacity-60 line-clamp-2">{item.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setVideoData(item);
                              setShowHistory(false);
                            }}
                            className="text-[10px] font-bold text-[#FE2C55] hover:underline"
                          >
                            Redownload
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={cn(
        "max-w-md mx-auto px-4 py-8 text-center space-y-4",
        darkMode ? "text-gray-500" : "text-gray-400"
      )}>
        <p className="text-[10px] leading-relaxed">
          TikSaver is not affiliated with TikTok. We do not host any videos on our servers. 
          All downloaded content is served directly from TikTok's CDN. 
          Please respect the copyright of the content creators.
        </p>
        <div className="flex items-center justify-center gap-4 text-[10px] font-medium">
          <a href="#" className="hover:text-[#FE2C55]">Terms</a>
          <a href="#" className="hover:text-[#FE2C55]">Privacy</a>
          <a href="#" className="hover:text-[#FE2C55]">Contact</a>
        </div>
      </footer>
    </div>
  );
}
