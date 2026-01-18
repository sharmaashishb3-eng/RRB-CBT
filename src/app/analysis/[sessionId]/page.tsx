'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getExamSessionById, getQuestionPaperById, ExamSession, QuestionPaper, Question } from '@/lib/supabase';

export default function AnalysisPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;

    const [session, setSession] = useState<ExamSession | null>(null);
    const [paper, setPaper] = useState<QuestionPaper | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!sessionId) return;

            const { session: sess, paper: p } = await getExamSessionById(sessionId);
            setSession(sess);
            setPaper(p);

            if (p) {
                const { questions: qs } = await getQuestionPaperById(p.id);
                setQuestions(qs);
            }
            setLoading(false);
        }
        load();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!session || !paper) {
        return (
            <div className="container text-center" style={{ paddingTop: 'var(--space-16)' }}>
                <h1>Analysis Not Found</h1>
                <Link href="/history" className="btn btn-primary mt-8">Go to History</Link>
            </div>
        );
    }

    // Helper to determine status
    const getStatus = (q: Question) => {
        const userAnswer = session.responses[q.id];
        if (!userAnswer) return 'unanswered';
        return userAnswer === q.correct_answer ? 'correct' : 'wrong';
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
            <div className="flex items-center justify-between mb-8">
                <Link href="/" className="btn btn-ghost">← Back to Home</Link>
                <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>Detailed Analysis</h1>
                <div className="badge badge-primary">{paper.title}</div>
            </div>

            <div className="flex flex-col gap-6">
                {questions.map((q, index) => {
                    const status = getStatus(q);
                    const userAnswer = session.responses[q.id];

                    return (
                        <div key={q.id} className="glass-card" style={{ padding: 'var(--space-6)', borderLeft: `4px solid var(--color-${status === 'correct' ? 'success' : status === 'wrong' ? 'error' : 'gray-400'})` }}>
                            <div className="flex justify-between mb-4">
                                <div className="flex gap-2">
                                    <span className="badge">Q{q.question_number}</span>
                                    <span style={{ fontWeight: 600 }}>{q.subject}</span>
                                </div>
                                <span className={`badge badge-${status === 'correct' ? 'success' : status === 'wrong' ? 'error' : 'ghost'}`}>
                                    {status === 'correct' ? 'Correct (+1)' : status === 'wrong' ? 'Wrong (-0.33)' : 'Unanswered'}
                                </span>
                            </div>

                            <p className="mb-6" style={{ fontSize: 'var(--text-lg)' }}>{q.question_text}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {(['a', 'b', 'c', 'd'] as const).map((opt) => {
                                    const isSelected = userAnswer === opt;
                                    const isCorrect = q.correct_answer === opt;

                                    let className = 'glass-card';
                                    let style = { padding: 'var(--space-4)', border: '1px solid transparent' };

                                    if (isCorrect) {
                                        style.border = '1px solid var(--color-success)';
                                        style.backgroundColor = 'rgba(var(--color-success-rgb), 0.1)';
                                    } else if (isSelected && !isCorrect) {
                                        style.border = '1px solid var(--color-error)';
                                        style.backgroundColor = 'rgba(var(--color-error-rgb), 0.1)';
                                    }

                                    return (
                                        <div key={opt} className={className} style={style}>
                                            <div className="flex items-center gap-2">
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: isCorrect ? 'var(--color-success)' : isSelected ? 'var(--color-error)' : 'inherit'
                                                }}>
                                                    {opt.toUpperCase()}.
                                                </span>
                                                <span>{q.options[opt]}</span>
                                                {isCorrect && <span className="text-success ml-auto">✓</span>}
                                                {isSelected && !isCorrect && <span className="text-error ml-auto">✗</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {q.explanation && (
                                <div className="glass-card bg-base-200" style={{ padding: 'var(--space-4)' }}>
                                    <h4 className="mb-2 text-primary" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>EXPLANATION</h4>
                                    <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{q.explanation}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
