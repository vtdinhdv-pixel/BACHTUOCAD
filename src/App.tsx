/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Send, 
  HelpCircle,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
  Share2,
  Moon,
  Sun,
  Trash2,
  FileText,
  Smile,
  Zap,
  BookOpen,
  Infinity,
  Menu,
  X,
  MessageSquarePlus,
  Copy,
  Check,
  Paperclip
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Swal from 'sweetalert2';

import { AppData } from './types';
import { DEMO_SUBJECTS, DEMO_QUESTIONS, AI_MODELS } from './constants';
import { callGeminiAI, generateMathHintPrompt, generateMathSolutionPrompt } from './services/geminiService';

// --- Types for messages ---
interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

// --- Components ---

const OctopusADAvatar = () => (
  <div className="relative w-40 h-40 mx-auto mb-6">
    <div className="absolute inset-0 bg-yellow-400 rounded-full border-4 border-yellow-500 shadow-inner"></div>
    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
      {/* Hat */}
      <div className="absolute -top-4 w-24 h-12 bg-slate-800 rounded-t-full border-2 border-slate-700">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-xs">AD</div>
      </div>
      <div className="absolute top-6 w-32 h-4 bg-slate-800 rounded-full border-2 border-slate-700"></div>
      {/* Face */}
      <div className="mt-8 flex gap-4">
        <div className="w-3 h-3 bg-black rounded-full"></div>
        <div className="w-3 h-3 bg-black rounded-full"></div>
      </div>
      <div className="mt-2 w-6 h-3 border-b-2 border-black rounded-full"></div>
      {/* Tentacles (simplified) */}
      <div className="absolute -bottom-2 flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="w-4 h-8 bg-yellow-400 rounded-full border-2 border-yellow-500"></div>
        ))}
      </div>
    </div>
  </div>
);

const SidebarInfoItem = ({ icon: Icon, title, content }: { icon: any, title: string, content: string }) => (
  <div className="flex gap-3 items-start">
    <div className="mt-1 p-1 bg-yellow-100 rounded-full">
      <Icon className="w-4 h-4 text-yellow-600" />
    </div>
    <div>
      <p className="text-sm font-bold text-slate-700"><span className="dark:text-slate-300">{title}</span>: <span className="font-normal text-slate-600 dark:text-slate-400">{content}</span></p>
    </div>
  </div>
);

// --- Main App ---

const WELCOME_MESSAGE: ChatMessage = {
  role: 'ai',
  content: 'Chào bạn! Mình là Bạch Tuộc AD vừa trồi lên từ đại dương tri thức đây! 🐙🌊 Bạn đang gặp "sóng gió" với bài tập Toán hay có tâm sự gì muốn trút bỏ không? Đừng để kiến thức trôi dạt nhé, hãy gửi ngay vào đây, mình sẽ dùng 8 vòi giải quyết giúp bạn trong một nốt nhạc! 🌊✨',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function App() {
  // --- State ---
  const [view, setView] = useState<'chat' | 'settings'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('octopus_chat_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [WELCOME_MESSAGE];
  });
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeAction, setActiveAction] = useState<'hint' | 'detail' | 'similar'>('detail');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- App Data State ---
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('octopus_math_data');
    if (saved) return JSON.parse(saved);
    return {
      subjects: DEMO_SUBJECTS,
      questions: DEMO_QUESTIONS,
      sessions: [],
      progress: {
        totalAttempts: 0,
        averageScore: 0,
        streakDays: 1,
        weakTopics: []
      },
      settings: {
        theme: 'light',
        soundEnabled: true,
        autoSave: true,
        apiKey: '',
        model: 'gemini-3-flash-preview'
      }
    };
  });

  // Persist data
  useEffect(() => {
    localStorage.setItem('octopus_math_data', JSON.stringify(data));
  }, [data]);

  // Persist chat messages
  useEffect(() => {
    localStorage.setItem('octopus_chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Apply dark mode
  useEffect(() => {
    if (data.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [data.settings.theme]);

  // --- Handlers ---
  const toggleDarkMode = () => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, theme: prev.settings.theme === 'dark' ? 'light' : 'dark' }
    }));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

    if (!data.settings.apiKey) {
      Swal.fire('Thiếu API Key', 'Vui lòng nhập API Key trong phần Cài đặt!', 'warning');
      setView('settings');
      return;
    }

    setIsAiLoading(true);
    try {
      let prompt = userMsg;
      if (activeAction === 'hint') prompt = generateMathHintPrompt(userMsg);
      else if (activeAction === 'detail') prompt = generateMathSolutionPrompt(userMsg);
      else prompt = `Hãy tìm một bài tập tương tự với bài toán sau và hướng dẫn cách giải: "${userMsg}"`;

      const response = await callGeminiAI(prompt, data.settings.apiKey, data.settings.model);
      setMessages(prev => [...prev, { role: 'ai', content: response || 'Xin lỗi, mình không thể trả lời lúc này.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (error: any) {
      Swal.fire('Lỗi AI', error.message || 'Không thể kết nối với Gemini AI', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDeleteChat = () => {
    Swal.fire({
      title: 'Xóa cuộc trò chuyện?',
      text: 'Bạn có chắc muốn xóa toàn bộ tin nhắn? Hành động này không thể hoàn tác.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Xóa hết',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        setMessages([WELCOME_MESSAGE]);
        Swal.fire('Đã xóa!', 'Cuộc trò chuyện đã được xóa.', 'success');
      }
    });
  };

  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  const handleExportChat = () => {
    if (messages.length <= 1) {
      Swal.fire('Trống', 'Chưa có tin nhắn nào để xuất.', 'info');
      return;
    }
    const text = messages.map(msg => {
      const role = msg.role === 'ai' ? '🐙 Bạch Tuộc AD' : '👤 Bạn';
      return `[${msg.timestamp}] ${role}:\n${msg.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bach-tuoc-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    Swal.fire('Đã xuất!', 'Lịch sử chat đã được tải về.', 'success');
  };

  const handleShareChat = async () => {
    if (messages.length <= 1) {
      Swal.fire('Trống', 'Chưa có tin nhắn nào để chia sẻ.', 'info');
      return;
    }

    const text = messages.slice(-3).map(msg => {
      const role = msg.role === 'ai' ? '🐙 Bạch Tuộc AD' : '👤 Bạn';
      return `${role}: ${msg.content}`;
    }).join('\n\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Bạch Tuộc AD - Trò chuyện', text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      Swal.fire('Đã sao chép!', 'Nội dung chat đã được sao chép vào clipboard.', 'success');
    }
  };

  const handleCopyMessage = async (content: string, idx: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // --- Sidebar Content ---
  const SidebarContent = () => (
    <div className="glass-card flex-grow p-8 flex flex-col items-center text-center">
      <OctopusADAvatar />
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Bạch Tuộc Toán vui nhộn</h1>
      <p className="text-emerald-500 font-medium mb-8">đến từ đại dương xanh</p>
      
      <div className="w-full space-y-6 text-left">
        <SidebarInfoItem 
          icon={Smile} 
          title="Vai trò" 
          content="Phù thủy toán học hải hước" 
        />
        <SidebarInfoItem 
          icon={Zap} 
          title="Phong cách" 
          content="Vui vẻ, sáng tạo, giải đố thông minh" 
        />
        <SidebarInfoItem 
          icon={Infinity} 
          title="Hỗ trợ" 
          content="24/7 tìm kiếm cách giải thú vị" 
        />
      </div>

      <button
        onClick={handleNewChat}
        className="mt-8 w-full flex items-center justify-center gap-2 py-3 bg-octopus-primary text-white font-bold rounded-xl shadow-md hover:bg-opacity-90 transition-all"
      >
        <MessageSquarePlus className="w-5 h-5" /> Cuộc trò chuyện mới
      </button>
    </div>
  );

  return (
    <div className={`h-screen flex flex-col md:flex-row p-3 md:p-6 gap-3 md:gap-6 overflow-hidden`}>
      {/* Mobile Header */}
      <div className="mobile-header flex items-center justify-between px-2 py-2">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
          <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">🐙</span>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Bạch Tuộc AD</h2>
        </div>
        <button onClick={toggleDarkMode} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
          {data.settings.theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-500" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="mobile-sidebar-overlay fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="relative z-10 w-80 max-w-[85vw] animate-slide-in">
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 z-20 p-1 rounded-full bg-slate-200 dark:bg-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <div className="sidebar-desktop w-80 flex-shrink-0 flex flex-col gap-6">
        <SidebarContent />
      </div>

      {/* Main Chat Area */}
      <div className="flex-grow flex flex-col gap-4 min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-xl shadow-sm">🐙</div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 leading-none">Bạch Tuộc AD</h2>
              <span className="text-xs text-emerald-500 font-medium">Đang hoạt động</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 text-slate-400">
            <button onClick={handleExportChat} title="Xuất lịch sử chat" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Download className="w-5 h-5 cursor-pointer hover:text-octopus-primary" />
            </button>
            <button onClick={handleShareChat} title="Chia sẻ" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Share2 className="w-5 h-5 cursor-pointer hover:text-octopus-primary" />
            </button>
            <button onClick={() => setView(view === 'settings' ? 'chat' : 'settings')} title="Cài đặt" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <SettingsIcon className="w-5 h-5 cursor-pointer hover:text-octopus-primary" />
            </button>
            <button onClick={toggleDarkMode} title="Chế độ tối/sáng" className="hidden md:block p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              {data.settings.theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400 cursor-pointer" /> : <Moon className="w-5 h-5 cursor-pointer hover:text-octopus-primary" />}
            </button>
            <button onClick={handleDeleteChat} title="Xóa toàn bộ chat" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Trash2 className="w-5 h-5 cursor-pointer hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {view === 'settings' ? (
            <div className="glass-card flex-grow p-6 md:p-8 overflow-y-auto animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">Cài đặt</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Gemini API Key</label>
                  <p className="text-xs text-red-500 mb-1">
                    👉 <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-600">Lấy API key miễn phí tại đây</a>
                  </p>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={data.settings.apiKey}
                      onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, apiKey: e.target.value } }))}
                      placeholder="Nhập API Key của bạn..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 focus:border-octopus-primary focus:outline-none transition-all pr-12 dark:bg-slate-700 dark:text-slate-100"
                    />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Mô hình AI</label>
                  <select
                    value={data.settings.model}
                    onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, model: e.target.value } }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 focus:border-octopus-primary focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-100"
                  >
                    {AI_MODELS.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Giao diện</label>
                  <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-600 transition-all hover:border-octopus-primary"
                  >
                    <span className="flex items-center gap-2">
                      {data.settings.theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                      <span className="dark:text-slate-200">{data.settings.theme === 'dark' ? 'Chế độ tối' : 'Chế độ sáng'}</span>
                    </span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">
                      {data.settings.theme === 'dark' ? '🌙' : '☀️'}
                    </span>
                  </button>
                </div>
                <button 
                  onClick={() => setView('chat')}
                  className="w-full py-3 bg-octopus-primary text-white font-bold rounded-xl shadow-md hover:bg-opacity-90 transition-all"
                >
                  Lưu & Quay lại
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col gap-4 overflow-hidden">
              {/* Chat Header Card */}
              <div className="bg-white dark:bg-slate-800 rounded-[2rem] md:rounded-[3rem] p-4 md:p-6 flex items-center justify-between shadow-sm border border-white dark:border-slate-700">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base md:text-lg">BẠCH TUỘC TOÁN HỌC</h3>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 md:px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-bold rounded-lg">TOÁN 6-9</span>
                  <span className="hidden sm:inline px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg">NHIỆT TÌNH</span>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-grow overflow-y-auto px-2 md:px-4 space-y-4 md:space-y-6 py-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'ai' && (
                      <div className="octopus-avatar flex-shrink-0">
                        <div className="text-xl">🐙</div>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 group">
                      <div className={`chat-bubble ${msg.role === 'user' ? 'bg-octopus-primary text-white ml-auto' : ''}`}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                        {msg.role === 'ai' && (
                          <button 
                            onClick={() => handleCopyMessage(msg.content, idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Sao chép"
                          >
                            {copiedIdx === idx ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex gap-3">
                    <div className="octopus-avatar flex-shrink-0">
                      <div className="text-xl animate-bounce">🐙</div>
                    </div>
                    <div className="chat-bubble bg-slate-50 dark:bg-slate-700 italic text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>Bạch Tuộc đang suy nghĩ</span>
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Action Buttons & Input Area */}
              <div className="p-2 md:p-4 space-y-3 md:space-y-4">
                <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
                  <button 
                    onClick={() => setActiveAction('hint')}
                    className={`action-btn text-xs md:text-sm ${activeAction === 'hint' ? 'active' : ''}`}
                  >
                    <HelpCircle className="w-4 h-4" /> Gợi ý nhẹ
                  </button>
                  <button 
                    onClick={() => setActiveAction('detail')}
                    className={`action-btn text-xs md:text-sm ${activeAction === 'detail' ? 'active' : ''}`}
                  >
                    <FileText className="w-4 h-4" /> Hướng dẫn chi tiết
                  </button>
                  <button 
                    onClick={() => setActiveAction('similar')}
                    className={`action-btn text-xs md:text-sm ${activeAction === 'similar' ? 'active' : ''}`}
                  >
                    <RefreshCw className="w-4 h-4" /> Bài tập tương tự
                  </button>
                </div>

                <div className="relative flex items-center gap-2 md:gap-3">
                  <button 
                    onClick={() => Swal.fire('Đang phát triển', 'Tính năng tải tài liệu sẽ sớm ra mắt!', 'info')}
                    className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-700 text-teal-600 dark:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full transition-colors"
                  >
                    <Paperclip className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <div className="flex-grow relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Nhập câu hỏi hoặc bài toán..."
                      className="w-full pl-4 pr-4 py-3 md:py-4 bg-slate-50 dark:bg-slate-700 rounded-full border-none focus:ring-2 focus:ring-octopus-primary outline-none text-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
                    />
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    disabled={isAiLoading || !inputText.trim()}
                    className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-octopus-primary hover:text-white transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="text-center">
                  <span className="text-[10px] md:text-xs text-slate-400">
                    Trợ lý ảo có thể mắc lỗi. Hãy luôn kiểm tra lại kết quả.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
