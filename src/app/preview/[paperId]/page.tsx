'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getQuestionPaperById, Question, QuestionPaper } from '@/lib/supabase';

export default function PreviewPage() {
    const params = useParams();
    const paperId = params.paperId as string;

    const [paper, setPaper] = useState<QuestionPaper | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [showAnswers, setShowAnswers] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const data = await getQuestionPaperById(paperId);
            setPaper(data.paper);
            setQuestions(data.questions);
            setLoading(false);
        }
        load();
    }, [paperId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!paper) {
        return (
            <div className="container text-center" style={{ paddingTop: 'var(--space-16)' }}>
                <h1>Paper Not Found</h1>
                <Link href="/history" className="btn btn-primary mt-8">Go to History</Link>
            </div>
        );
    }

    // Group by subject
    const bySubject = questions.reduce((acc, q) => {
        if (!acc[q.subject]) acc[q.subject] = [];
        acc[q.subject].push(q);
        return acc;
    }, {} as Record<string, Question[]>);

    return (
        <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-16)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <Link href="/history" className="btn btn-ghost">← Back</Link>
                <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Preview</h1>
                <button onClick={() => setShowAnswers(!showAnswers)} className="btn btn-sm btn-outline">
                    {showAnswers ? 'Hide' : 'Show'} Ans
                </button>
            </div>

            {/* Paper Info */}
            <div className="glass-card mb-6" style={{ padding: 'var(--space-4)' }}>
                <h2 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>{paper.title}</h2>
                <div className="flex gap-2" style={{ fontSize: 'var(--text-xs)' }}>
                    <span className="badge badge-primary">{paper.total_marks} Marks</span>
                    <span className="badge badge-success">{paper.duration_minutes} Min</span>
                    <span className="badge">{questions.length} Questions</span>
                </div>
            </div>

            {/* Start Button */}
            <Link href={`/exam/${paperId}`} className="btn btn-primary w-full mb-8">
                Start Exam
            </Link>

            {/* Questions by Subject */}
            {Object.entries(bySubject).map(([subject, qs]) => (
                <div key={subject} className="mb-8">
                    <h3 className="text-primary mb-4" style={{ fontSize: 'var(--text-base)' }}>
                        {subject} ({qs.length} Questions)
                    </h3>

                    {qs.map((q, i) => (
                        <div key={q.id} className="glass-card mb-4" style={{ padding: 'var(--space-4)' }}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="badge badge-primary">Q{q.question_number}</span>
                                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{q.difficulty}</span>
                            </div>

                            <p style={{ marginBottom: 'var(--space-3)', lineHeight: 1.6 }}>{q.question_text}</p>

                            <div className="flex flex-col gap-2" style={{ fontSize: 'var(--text-sm)' }}>
                                {(['a', 'b', 'c', 'd'] as const).map(opt => (
                                    <div
                                        key={opt}
                                        style={{
                                            padding: 'var(--space-2)',
                                            borderRadius: 'var(--radius-md)',
                                            background: showAnswers && opt === q.correct_answer
                                                ? 'rgba(16, 185, 129, 0.2)'
                                                : 'rgba(255,255,255,0.05)',
                                            color: showAnswers && opt === q.correct_answer
                                                ? 'var(--color-success)'
                                                : 'inherit'
                                        }}
                                    >
                                        <strong>{opt.toUpperCase()}.</strong> {q.options[opt]}
                                    </div>
                                ))}
                            </div>

                            {showAnswers && q.explanation && (
                                <div style={{
                                    marginTop: 'var(--space-3)',
                                    padding: 'var(--space-3)',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--text-sm)'
                                }}>
                                    <strong>💡</strong> {q.explanation}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
