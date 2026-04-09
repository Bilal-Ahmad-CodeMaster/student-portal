"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import api from "@/app/lib/axios";
import {
    MessageSquare, FileText, HelpCircle, Send, PlayCircle, Loader2,
    NotebookPen, CheckCircle2, History, TrendingUp, Clock
} from "lucide-react";
import toast from "react-hot-toast";

export default function LecturePage() {
    const { courseId, videoId } = useParams();
    const videoRef = useRef(null);
    const chatEndRef = useRef(null);

    // --- STATES ---
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState("notes");
    const [currentTime, setCurrentTime] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [chat, setChat] = useState([]);
    const [query, setQuery] = useState("");

    const [noteText, setNoteText] = useState("");
    const [quizData, setQuizData] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [scoreInfo, setScoreInfo] = useState(null);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [quizHistory, setQuizHistory] = useState([]);

    // --- DATA FETCHING ---
    const fetchData = useCallback(async () => {
        try {
            const [courseRes, historyRes] = await Promise.all([
                api.get(`/course/my-assigned`),
                api.get(`/ai/quiz-history/${videoId}`)
            ]);

            const currentCourse = courseRes.data.data.courses.find(c => c._id === courseId);
            const currentVideo = currentCourse?.videos.find(v => v._id === videoId);

            if (currentVideo) {
                setData({ ...currentVideo, courseTitle: currentCourse.title });
            } else {
                toast.error("Video not found");
            }
            setQuizHistory(historyRes.data.history || []);
        } catch (err) { toast.error("Sync Error"); }
    }, [courseId, videoId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    // --- TRANSCRIPT & VIDEO SYNC ---
    const transcriptSegments = useMemo(() => {
        if (!data?.transcript) return [];
        return data.transcript.split('\n').filter(l => l.trim()).map((line, i) => {
            const timeMatch = line.match(/\[(\d+:\d+)\]/);
            const timeStr = timeMatch ? timeMatch[1] : "0:00";
            const [m, s] = timeStr.split(':').map(Number);
            return {
                id: i,
                time: m * 60 + s,
                displayTime: timeStr,
                text: line.replace(/\[\d+:\d+\]/, '').trim(),
                isNote: line.includes("STUDENT NOTE")
            };
        });
    }, [data?.transcript]);

    const handleTimeUpdate = () => setCurrentTime(videoRef.current?.currentTime || 0);
    const seekTo = (time) => { if (videoRef.current) { videoRef.current.currentTime = time; videoRef.current.play(); } };

    // --- NOTES ---
    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        const timeLabel = `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;
        setData(prev => ({ ...prev, transcript: prev.transcript + `\n[${timeLabel}] STUDENT NOTE: ${noteText}` }));
        try {
            await api.post("/course/add-note", { courseId, videoId, note: noteText, timestamp: timeLabel });
            setNoteText("");
            toast.success("Note pinned");
        } catch (err) { toast.error("Sync failed"); }
    };

    // --- QUIZ ---
    const generateQuiz = async () => {
        setLoadingQuiz(true);
        try {
            const res = await api.post("/ai/generate-quiz", { videoId });
            setQuizData(res.data.quiz);
            setScoreInfo(null);
            setUserAnswers({});
        } catch (err) { toast.error("AI is busy"); }
        finally { setLoadingQuiz(false); }
    };

    const submitQuiz = async () => {
        const questions = quizData?.questions || [];
        if (Object.keys(userAnswers).length < questions.length) return toast.error("Finish all questions");
        const submission = questions.map((q, i) => ({ userAns: userAnswers[i], correct: q.correctAnswer }));
        try {
            const res = await api.post("/ai/submit-lecture-quiz", { videoId, answers: submission });
            setScoreInfo(res.data);
            fetchData();
            toast.success("Result Saved");
        } catch (err) { toast.error("Save failed"); }
    };

    const handleAskAI = async (e) => {
        e?.preventDefault();
        if (!query.trim() || isGenerating) return;

        const q = query;
        setQuery("");
        setIsGenerating(true);

        setChat(prev => [...prev,
        { role: "user", content: q },
        { role: "assistant", content: "", isLoading: true }
        ]);

        try {
            // USE NATIVE FETCH INSTEAD OF AXIOS FOR STREAMING
            const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:3000/api"}/ai/ask-tutor-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add your Auth token here if needed
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    videoId: videoId,
                    question: q,
                    chatHistory: chat.map(({ role, content }) => ({ role, content })).slice(-4)
                })
            });

            if (!response.ok) throw new Error("Server Error");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    // Groq/OpenAI stream format usually starts with "data: "
                    if (line.startsWith("data: ") && line !== "data: [DONE]") {
                        try {
                            const jsonStr = line.replace(/^data: /, "");
                            const parsed = JSON.parse(jsonStr);
                            const content = parsed.choices[0].delta?.content || "";
                            accumulatedText += content;

                            setChat(prev => {
                                let updatedChat = [...prev];
                                updatedChat[updatedChat.length - 1] = {
                                    role: "assistant",
                                    content: accumulatedText,
                                    isLoading: false
                                };
                                return updatedChat;
                            });
                        } catch (e) {
                            // Log error for debugging, but don't crash
                            console.error("Parsing error", e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Chat Error:", error);
            toast.error(error.message || "AI connection failed");
            setChat(prev => prev.slice(0, -1));
        } finally {
            setIsGenerating(false);
        }
    };

    if (!data) return <div className="h-screen bg-[#0a0f18] flex items-center justify-center text-blue-500 font-bold animate-pulse">LOADING ENVIRONMENT...</div>;

    return (
        <div className="min-h-screen bg-[#0a0f18] text-slate-200 p-6 flex flex-col gap-6 max-w-[1600px] mx-auto font-sans">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-900/50 p-5 rounded-[2rem] border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-4">
                    <PlayCircle className="text-blue-500" size={32} />
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">{data.courseTitle}</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{data.title}</p>
                    </div>
                </div>
                <div className="bg-blue-600/10 px-5 py-2.5 rounded-2xl border border-blue-500/20 text-blue-400 font-black text-sm">
                    Best: {quizHistory.length > 0 ? Math.max(...quizHistory.map(h => h.score)) : 0}/20
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8 flex-1">
                {/* Main Player & Tabs */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    <div className="aspect-video bg-black rounded-[3rem] overflow-hidden border border-slate-800 shadow-2xl relative ring-1 ring-white/10">
                        <video ref={videoRef} src={data.videoUrl} onTimeUpdate={handleTimeUpdate} controls className="w-full h-full object-contain" />
                    </div>

                    <div className="bg-[#111827] rounded-[2.5rem] border border-slate-800 flex flex-col flex-1 shadow-2xl overflow-hidden min-h-[500px]">
                        <div className="flex border-b border-slate-800 px-10 pt-6 gap-10 bg-slate-900/40">
                            {[{ id: 'notes', label: 'Notes', icon: NotebookPen }, { id: 'quiz', label: 'AI Quiz', icon: HelpCircle }, { id: 'history', label: 'Performance', icon: TrendingUp }].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${activeTab === tab.id ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent'}`}>
                                    <tab.icon size={14} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-10 overflow-y-auto h-[450px] custom-scrollbar">
                            {activeTab === 'notes' && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase"><Clock size={14} /> Tagging at {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</div>
                                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} className="w-full h-44 bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 text-slate-200 outline-none focus:border-blue-500/50 resize-none shadow-inner" placeholder="Your notes..." />
                                    <button onClick={handleAddNote} className="px-12 py-4 bg-blue-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all">Pin to Timeline</button>
                                </div>
                            )}

                            {activeTab === 'quiz' && (
                                <div className="space-y-6">
                                    {!quizData ? (
                                        <div className="py-16 text-center bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-800">
                                            <button onClick={generateQuiz} disabled={loadingQuiz} className="px-12 py-5 bg-indigo-600 rounded-[1.5rem] font-black uppercase text-xs tracking-widest">
                                                {loadingQuiz ? <Loader2 className="animate-spin" /> : "Generate 20-Question AI Quiz"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {quizData.questions.map((q, idx) => (
                                                <div key={idx} className="p-8 bg-slate-900/50 rounded-[2.5rem] border border-slate-800 shadow-lg">
                                                    <p className="font-bold text-lg mb-6 text-white leading-snug"><span className="text-blue-500 font-black mr-3">Q{idx + 1}.</span>{q.question}</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {q.options.map(opt => (
                                                            <button key={opt} onClick={() => setUserAnswers({ ...userAnswers, [idx]: opt })} className={`p-5 rounded-2xl border-2 text-left text-sm font-bold transition-all ${userAnswers[idx] === opt ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {!scoreInfo ? <button onClick={submitQuiz} className="w-full py-6 bg-green-600 rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:bg-green-500 transition-all">Submit Evaluation</button> :
                                                <div className="p-10 bg-blue-600/10 border-2 border-blue-600/20 rounded-[3rem] text-center">
                                                    <CheckCircle2 size={48} className="mx-auto text-blue-500 mb-4" />
                                                    <h4 className="text-4xl font-black mb-2">{scoreInfo.score} / {scoreInfo.total}</h4>
                                                    <button onClick={() => setQuizData(null)} className="mt-4 text-xs font-bold underline opacity-50 hover:opacity-100">Try new quiz</button>
                                                </div>
                                            }
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-4">
                                    {quizHistory.length > 0 ? quizHistory.map((item, i) => (
                                        <div key={i} className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 flex items-center justify-between hover:border-blue-500/30 transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-500"><TrendingUp size={20} /></div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">{new Date(item.lastAttempt).toLocaleDateString()}</p>
                                                    <p className="text-sm font-bold text-white">Attempt #{quizHistory.length - i}</p>
                                                </div>
                                            </div>
                                            <div className="text-right font-black text-2xl">{item.score}<span className="text-xs text-slate-600 ml-1">/ {item.totalQuestions}</span></div>
                                        </div>
                                    )) : <div className="py-20 text-center opacity-30"><p className="text-xs font-bold uppercase tracking-widest">No history found</p></div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 max-h-[calc(100vh-140px)]">
                    <div className="bg-[#111827] rounded-[2.5rem] border border-slate-800 p-8 flex flex-col h-[40%] shadow-xl ring-1 ring-white/5 overflow-hidden">
                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-6 flex items-center gap-2"><FileText size={14} className="text-blue-500" /> Lecture Timeline</h3>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                            {transcriptSegments.map((seg, i) => {
                                const isCurrent = currentTime >= seg.time && (currentTime < (transcriptSegments[i + 1]?.time || Infinity));
                                return (
                                    <div key={i} onClick={() => seekTo(seg.time)} className={`p-4 rounded-2xl cursor-pointer transition-all border ${isCurrent ? 'bg-blue-600/10 border-blue-500/40' : 'border-transparent hover:bg-slate-800/40'} ${seg.isNote ? 'border-l-4 border-l-blue-500 bg-blue-500/5' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-mono text-[10px] mt-1 ${isCurrent ? 'text-blue-400 font-black' : 'text-slate-600'}`}>[{seg.displayTime}]</span>
                                            <p className={`text-[13px] leading-relaxed font-medium ${isCurrent ? 'text-white font-bold' : 'text-slate-400'}`}>{seg.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-[#111827] rounded-[2.5rem] border border-slate-800 flex flex-col h-[60%] shadow-2xl overflow-hidden ring-1 ring-white/5">
                        <div className="p-6 bg-slate-900/40 border-b border-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg"><MessageSquare size={20} className="text-white" /></div>
                            <h3 className="text-sm font-black text-white tracking-tighter uppercase">Virtual Tutor</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            {chat.map((msg, i) => (
                                <div key={i} className={`p-5 rounded-[1.8rem] text-[13px] font-medium leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 ml-10 text-white shadow-xl' : 'bg-slate-800/80 border border-slate-700 mr-10 text-slate-200'}`}>
                                    {msg.isLoading ? <Loader2 size={16} className="animate-spin opacity-50" /> : msg.content}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleAskAI} className="p-4 bg-black/40 border-t border-slate-800 flex gap-3">
                            <input value={query} onChange={e => setQuery(e.target.value)} disabled={isGenerating} className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm outline-none focus:border-blue-600 transition-all font-medium" placeholder="Deep dive into this..." />
                            <button type="submit" disabled={isGenerating || !query.trim()} className="p-4 bg-blue-600 rounded-2xl hover:bg-blue-500 shadow-xl transition-all active:scale-90"><Send size={20} className="text-white" /></button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}