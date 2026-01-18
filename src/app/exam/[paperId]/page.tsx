'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuestionPaperById, Question, createExamSession, updateExamSession } from '@/lib/supabase';

type QuestionStatus = 'not_visited' | 'not_answered' | 'answered' | 'marked' | 'answered_marked';

export default function ExamPage() {
    const params = useParams();
    const router = useRouter();
    const paperId = params.paperId as string;

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes
    const [loading, setLoading] = useState(true);
    const [showPalette, setShowPalette] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [paperTitle, setPaperTitle] = useState('');

    // Load paper and create session
    useEffect(() => {
        async function load() {
            const { paper, questions: qs } = await getQuestionPaperById(paperId);
            if (paper && qs.length > 0) {
                setQuestions(qs);
                setPaperTitle(paper.title);
                setTimeLeft(paper.duration_minutes * 60);

                // Mark first question as visited
                setVisitedQuestions(new Set([qs[0].id]));

                // Create exam session
                const session = await createExamSession(paperId);
                if (session) setSessionId(session.id);
            }
            setLoading(false);
        }
        load();
    }, [paperId]);

    // Timer
    useEffect(() => {
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const currentQuestion = questions[currentIndex];

    const getQuestionStatus = useCallback((questionId: string): QuestionStatus => {
        const hasAnswer = responses[questionId];
        const isMarked = markedForReview.has(questionId);
        const isVisited = visitedQuestions.has(questionId);

        if (hasAnswer && isMarked) return 'answered_marked';
        if (hasAnswer) return 'answered';
        if (isMarked) return 'marked';
        if (isVisited) return 'not_answered';
        return 'not_visited';
    }, [responses, markedForReview, visitedQuestions]);

    const handleOptionSelect = (option: string) => {
        if (!currentQuestion) return;
        setResponses(prev => ({ ...prev, [currentQuestion.id]: option }));
    };

    const handleClearResponse = () => {
        if (!currentQuestion) return;
        setResponses(prev => {
            const copy = { ...prev };
            delete copy[currentQuestion.id];
            return copy;
        });
    };

    const handleMarkForReview = () => {
        if (!currentQuestion) return;
        setMarkedForReview(prev => {
            const copy = new Set(prev);
            if (copy.has(currentQuestion.id)) {
                copy.delete(currentQuestion.id);
            } else {
                copy.add(currentQuestion.id);
            }
            return copy;
        });
    };

    const navigateTo = (index: number) => {
        if (index >= 0 && index < questions.length) {
            setCurrentIndex(index);
            setVisitedQuestions(prev => new Set(prev).add(questions[index].id));
            setShowPalette(false);
        }
    };

    const handleSaveAndNext = () => {
        navigateTo(currentIndex + 1);
    };

    const handleSubmit = async () => {
        // Calculate score
        let score = 0;
        let correct = 0;
        let wrong = 0;
        let unanswered = 0;

        questions.forEach(q => {
            const userAnswer = responses[q.id];
            if (!userAnswer) {
                unanswered++;
            } else if (userAnswer === q.correct_answer) {
                score += q.marks;
                correct++;
            } else {
                score -= q.marks / 3; // Negative marking
                wrong++;
            }
        });

        score = Math.max(0, Math.round(score * 100) / 100);

        // Update session
        if (sessionId) {
            await updateExamSession(sessionId, responses, true, score);
        }

        // Navigate to result
        router.push(`/result?score=${score}&correct=${correct}&wrong=${wrong}&unanswered=${unanswered}&total=${questions.length}&sessionId=${sessionId}`);
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getTimerClass = () => {
        if (timeLeft <= 300) return 'timer critical';
        if (timeLeft <= 600) return 'timer warning';
        return 'timer';
    };

    // Stats
    const stats = {
        answered: Object.keys(responses).length,
        notAnswered: visitedQuestions.size - Object.keys(responses).length,
        notVisited: questions.length - visitedQuestions.size,
        marked: markedForReview.size,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="container text-center" style={{ paddingTop: 'var(--space-16)' }}>
                <h1>Question Paper Not Found</h1>
                <Link href="/history" className="btn btn-primary mt-8">Go to History</Link>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '80px' }}>
            {/* Header */}
            <header className="exam-header">
                <div style={{ fontSize: 'var(--text-sm)', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {paperTitle}
                </div>
                <div className={getTimerClass()}>
                    ⏱️ {formatTime(timeLeft)}
                </div>
                <button onClick={() => setShowPalette(!showPalette)} className="btn btn-ghost btn-sm">
                    📋 {currentIndex + 1}/{questions.length}
                </button>
            </header>

            {/* Question Area */}
            <div className="container" style={{ paddingTop: 'var(--space-4)' }}>
                {/* Question Number & Subject */}
                <div className="flex justify-between items-center mb-4">
                    <span className="badge badge-primary">Q{currentQuestion.question_number}</span>
                    <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{currentQuestion.subject}</span>
                    <span className="badge badge-success">{currentQuestion.marks} Mark</span>
                </div>

                {/* Question Text */}
                <div className="glass-card mb-6" style={{ padding: 'var(--space-5)' }}>
                    <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7 }}>
                        {currentQuestion.question_text}
                    </p>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-3">
                    {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                        <div
                            key={opt}
                            className={`option-card ${responses[currentQuestion.id] === opt ? 'selected' : ''}`}
                            onClick={() => handleOptionSelect(opt)}
                        >
                            <span className="option-label">{opt.toUpperCase()}</span>
                            <span>{currentQuestion.options[opt]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Bar */}
            <div className="action-bar">
                <button onClick={handleClearResponse} className="btn btn-outline btn-sm">Clear</button>
                <button
                    onClick={handleMarkForReview}
                    className={`btn btn-sm ${markedForReview.has(currentQuestion.id) ? 'btn-accent' : 'btn-ghost'}`}
                >
                    {markedForReview.has(currentQuestion.id) ? '★ Marked' : '☆ Mark'}
                </button>
                {currentIndex < questions.length - 1 ? (
                    <button onClick={handleSaveAndNext} className="btn btn-primary btn-sm">
                        Save & Next →
                    </button>
                ) : (
                    <button onClick={() => setShowSubmitModal(true)} className="btn btn-accent btn-sm">
                        Submit
                    </button>
                )}
            </div>

            {/* Question Palette Modal */}
            {showPalette && (
                <div className="modal-overlay" onClick={() => setShowPalette(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ padding: 'var(--space-6)' }}>
                        <h3 className="mb-4">Question Palette</h3>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-2 mb-4" style={{ fontSize: 'var(--text-xs)' }}>
                            <span className="flex items-center gap-1"><span className="palette-cell answered" style={{ width: 20, height: 20, fontSize: 10 }}>✓</span>Answered</span>
                            <span className="flex items-center gap-1"><span className="palette-cell not-answered" style={{ width: 20, height: 20, fontSize: 10 }}>✗</span>Not Answered</span>
                            <span className="flex items-center gap-1"><span className="palette-cell marked-review" style={{ width: 20, height: 20, fontSize: 10 }}>★</span>Marked</span>
                            <span className="flex items-center gap-1"><span className="palette-cell not-visited" style={{ width: 20, height: 20, fontSize: 10 }}>○</span>Not Visited</span>
                        </div>

                        {/* Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-2)', maxHeight: '300px', overflowY: 'auto' }}>
                            {questions.map((q, i) => {
                                const status = getQuestionStatus(q.id);
                                return (
                                    <button
                                        key={q.id}
                                        className={`palette-cell ${status.replace('_', '-')} ${i === currentIndex ? 'current' : ''}`}
                                        onClick={() => navigateTo(i)}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Stats */}
                        <div className="flex justify-between mt-6" style={{ fontSize: 'var(--text-sm)' }}>
                            <span className="text-success">Answered: {stats.answered}</span>
                            <span className="text-error">Not Ans: {stats.notAnswered}</span>
                            <span className="text-muted">Not Visited: {stats.notVisited}</span>
                        </div>

                        <button onClick={() => setShowSubmitModal(true)} className="btn btn-accent w-full mt-4">
                            Submit Test
                        </button>
                    </div>
                </div>
            )}

            {/* Submit Confirmation Modal */}
            {showSubmitModal && (
                <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ padding: 'var(--space-6)' }}>
                        <h3 className="mb-4">Submit Test?</h3>
                        <div className="mb-6" style={{ fontSize: 'var(--text-sm)' }}>
                            <p className="text-success">✓ Answered: {stats.answered}</p>
                            <p className="text-error">✗ Not Answered: {questions.length - stats.answered}</p>
                            <p className="text-muted">Time Left: {formatTime(timeLeft)}</p>
                        </div>
                        <p className="text-warning mb-6" style={{ fontSize: 'var(--text-sm)' }}>
                            ⚠️ You cannot return to this test after submission.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowSubmitModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                Cancel
                            </button>
                            <button onClick={handleSubmit} className="btn btn-accent" style={{ flex: 1 }}>
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
