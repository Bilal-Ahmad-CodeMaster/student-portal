"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/app/lib/axios";
import {
    MessageSquare, FileText, HelpCircle, Send,
    PlayCircle, Loader2, NotebookPen, CheckCircle2, History, TrendingUp
} from "lucide-react";
import toast from "react-hot-toast";

export default function LecturePage() {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState("notes");
    const [data, setData] = useState(null);
    const [chat, setChat] = useState([]);
    const [query, setQuery] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Feature States
    const [noteText, setNoteText] = useState("");
    const [quizData, setQuizData] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [scoreInfo, setScoreInfo] = useState(null);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [quizHistory, setQuizHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const chatEndRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Fetch Base Data
    const fetchLecture = useCallback(async () => {
        try {
            const res = await api.get(`/course/lecture/${id}`);
            setData(res.data.data);
        } catch (err) { toast.error("Resource fetch failed"); }
    }, [id]);

    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await api.get(`/ai/quiz-history/${id}`);
            setQuizHistory(res.data.history || []);
        } catch (err) { console.error("Performance sync failed"); }
        finally { setLoadingHistory(false); }
    }, [id]);

    useEffect(() => {
        fetchLecture();
        fetchHistory();
        return () => abortControllerRef.current?.abort();
    }, [fetchLecture, fetchHistory]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    // Handle Note Integration
    const handleAddNoteToTranscript = () => {
        if (!noteText.trim()) return;
        setData(prev => ({
            ...prev,
            transcript: prev.transcript + `\n[STUDENT NOTE]: ${noteText}`
        }));
        setNoteText("");
        toast.success("Transcript updated locally", { position: "bottom-center" });
    };

    // AI Quiz Evaluator
    const generateQuiz = async () => {
        setLoadingQuiz(true);
        try {
            const res = await api.post("/ai/generate-quiz", { courseId: id });
            setQuizData(res.data.quiz);
            setScoreInfo(null);
            setUserAnswers({});
        } catch (err) { toast.error("Evaluator is busy"); }
        finally { setLoadingQuiz(false); }
    };

    const submitQuiz = async () => {
        const questions = quizData?.questions || [];
        if (Object.keys(userAnswers).length < questions.length) {
            return toast.error("Complete all questions first");
        }
        const submission = questions.map((q, i) => ({
            userAns: userAnswers[i],
            correct: q.correctAnswer
        }));
        try {
            const res = await api.post("/ai/submit-lecture-quiz", { courseId: id, answers: submission });
            setScoreInfo(res.data);
            fetchHistory(); // Refresh history tab
            toast.success("Performance synchronized");
        } catch (err) { toast.error("Sync failed"); }
    };

    // AI Stream Handler
    const handleAskAI = async (e) => {
        e?.preventDefault();
        if (!query.trim() || isGenerating) return;
        const q = query; setQuery(""); setIsGenerating(true);
        setChat(prev => [...prev, { role: "user", content: q }, { role: "assistant", content: "", isLoading: true }]);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/ask-tutor-stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ courseId: id, question: q, chatHistory: chat.slice(-4) })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let text = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value).split("\n");
                for (const line of chunk) {
                    if (line.startsWith("data: ") && line !== "data: [DONE]") {
                        const json = JSON.parse(line.substring(6));
                        text += json.choices[0].delta?.content || "";
                        setChat(prev => {
                            const up = [...prev];
                            up[up.length - 1] = { role: "assistant", content: text };
                            return up;
                        });
                    }
                }
            }
        } catch (err) { toast.error("AI disconnected"); }
        finally { setIsGenerating(false); }
    };

    if (!data) return (
        <div className="h-screen bg-[#0a0f18] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0f18] text-slate-200 p-6 flex flex-col gap-6 max-w-[1600px] mx-auto font-sans selection:bg-blue-500/30">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                        <PlayCircle className="text-blue-500" size={24} />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">{data.courseTitle}</h1>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-3">Session Metrics</span>
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-600/20">
                        Best: {quizHistory.length > 0 ? Math.max(...quizHistory.map(h => h.score)) : 0}/3
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1">
                {/* Video & Interactive Content */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl relative ring-1 ring-white/5">
                        <video src={data.videoUrl} controls className="w-full h-full" />
                    </div>

                    <div className="bg-[#111827] rounded-[2.5rem] border border-slate-800 flex flex-col flex-1 shadow-2xl overflow-hidden ring-1 ring-white/5">
                        <div className="flex border-b border-slate-800 px-8 pt-6 gap-8 bg-slate-900/40">
                            {[
                                { id: 'notes', label: 'Notes', icon: NotebookPen },
                                { id: 'quiz', label: 'AI Evaluation', icon: HelpCircle },
                                { id: 'history', label: 'Performance', icon: History }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`pb-4 text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 transition-all border-b-2 ${activeTab === tab.id ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                                >
                                    <tab.icon size={14} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar h-[350px]">
                            {activeTab === 'notes' && (
                                <div className="space-y-4 animate-in fade-in duration-500">
                                    <textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        className="w-full h-40 bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 text-slate-200 outline-none focus:border-blue-500/50 transition-all resize-none font-medium leading-relaxed"
                                        placeholder="Add a timestamped note to the transcript..."
                                    />
                                    <button onClick={handleAddNoteToTranscript} className="px-10 py-4 bg-blue-600 rounded-2xl font-bold hover:bg-blue-500 shadow-xl shadow-blue-600/20 active:scale-95 transition-all text-sm">Integrate Note</button>
                                </div>
                            )}

                            {activeTab === 'quiz' && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                    {!quizData ? (
                                        <div className="py-16 text-center bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-800">
                                            <HelpCircle className="mx-auto text-slate-700 mb-4" size={56} />
                                            <button onClick={generateQuiz} disabled={loadingQuiz} className="px-12 py-5 bg-indigo-600 rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-indigo-500 disabled:opacity-50 shadow-2xl shadow-indigo-600/20">
                                                {loadingQuiz ? <Loader2 className="animate-spin inline mr-2" /> : null}
                                                {loadingQuiz ? "Analyzing Context..." : "Begin AI Assessment"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {(quizData.questions || []).map((q, idx) => (
                                                <div key={idx} className="p-8 bg-slate-900/50 rounded-[2rem] border border-slate-800 hover:border-slate-700 transition-all shadow-lg">
                                                    <p className="font-bold text-lg mb-6 text-white leading-snug"><span className="text-blue-500 font-black mr-3">Q{idx + 1}.</span>{q.question}</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {q.options.map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => setUserAnswers({ ...userAnswers, [idx]: opt })}
                                                                className={`p-5 rounded-2xl border-2 text-left text-sm font-bold transition-all ${userAnswers[idx] === opt ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-[1.02]' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {!scoreInfo ? (
                                                <button onClick={submitQuiz} className="w-full py-6 bg-green-600 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-green-900/40 hover:bg-green-500 transition-all">Submit Evaluation</button>
                                            ) : (
                                                <div className="p-10 bg-blue-600/10 border-2 border-blue-600/20 rounded-[3rem] text-center animate-in zoom-in duration-500">
                                                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/40 border-4 border-white/20">
                                                        <CheckCircle2 size={40} className="text-white" />
                                                    </div>
                                                    <h4 className="text-4xl font-black text-white mb-2">{scoreInfo.score} / {scoreInfo.total}</h4>
                                                    <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Performance Recorded</p>
                                                    <button onClick={() => setQuizData(null)} className="px-8 py-3 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all">Retry with new questions</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">Learning History</h3>
                                    {loadingHistory ? (
                                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                                    ) : quizHistory.length > 0 ? (
                                        <div className="grid gap-4">
                                            {quizHistory.map((item, i) => (
                                                <div key={i} className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800 flex items-center justify-between hover:border-blue-500/30 transition-all group">
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.score >= 2 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                            {item.score >= 2 ? <CheckCircle2 size={20} /> : <TrendingUp size={20} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{new Date(item.lastAttempt).toLocaleDateString()}</p>
                                                            <p className="text-sm font-bold text-white">Assessment Attempt #{quizHistory.length - i}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-white leading-none mb-1">{item.score}<span className="text-xs text-slate-600 font-bold ml-1">/ {item.totalQuestions}</span></p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Verified Result</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-24 text-center opacity-20 grayscale flex flex-col items-center">
                                            <History size={64} className="mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No data records found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 max-h-[calc(100vh-140px)]">
                    <div className="bg-[#111827] rounded-[2.5rem] border border-slate-800 p-8 flex flex-col h-[35%] shadow-xl ring-1 ring-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.3em] flex items-center gap-2">
                                <FileText size={14} className="text-blue-500" /> Transcript
                            </h3>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-4 space-y-4 text-sm leading-relaxed text-slate-400 custom-scrollbar scroll-smooth">
                            {data.transcript.split('\n').map((line, i) => (
                                <p key={i} className="hover:text-blue-400 transition-colors cursor-default text-[13px] font-medium leading-relaxed">
                                    <span className="text-blue-500/30 font-mono text-[10px] mr-3">[{Math.floor(i / 2)}:{(i % 2) * 30 || '00'}]</span>
                                    {line.trim()}
                                </p>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#111827] rounded-[2.5rem] border border-slate-800 flex flex-col h-[65%] shadow-2xl overflow-hidden ring-1 ring-white/5">
                        <div className="p-6 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 border border-white/10">
                                    <MessageSquare size={20} className="text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-white tracking-tight">Virtual Assistant</h3>
                            </div>
                            {isGenerating && <div className="flex gap-1"><div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" /><div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-100" /></div>}
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-slate-900/10">
                            {chat.map((msg, i) => (
                                <div key={i} className={`p-5 rounded-[1.8rem] text-[13px] font-medium leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 ml-10 text-white shadow-xl border border-white/10' : 'bg-slate-800/80 border border-slate-700 mr-10 text-slate-200'}`}>
                                    {msg.isLoading ? <div className="flex gap-2"><div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse" /><div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse delay-75" /></div> : msg.content}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleAskAI} className="p-4 bg-black/40 border-t border-slate-800 flex gap-3">
                            <input value={query} onChange={e => setQuery(e.target.value)} disabled={isGenerating} className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm outline-none focus:border-blue-600 transition-all font-medium" placeholder="Analyze this lecture..." />
                            <button type="submit" disabled={isGenerating || !query.trim()} className="p-4 bg-blue-600 rounded-2xl hover:bg-blue-500 shadow-xl active:scale-90 transition-all"><Send size={20} className="text-white" /></button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}