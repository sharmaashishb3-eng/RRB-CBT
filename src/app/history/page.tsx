'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getQuestionPapers, deleteQuestionPaper, QuestionPaper } from '@/lib/supabase';

export default function HistoryPage() {
    const [papers, setPapers] = useState<QuestionPaper[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch by only rendering dates after client mount
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        async function load() {
            const data = await getQuestionPapers();
            setPapers(data);
            setLoading(false);
        }
        load();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm('Delete this question paper?')) {
            const success = await deleteQuestionPaper(id);
            if (success) {
                setPapers(prev => prev.filter(p => p.id !== id));
            }
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-16)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link href="/" className="btn btn-ghost">← Back</Link>
                <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>Saved Papers</h1>
                <Link href="/generate" className="btn btn-primary btn-sm">+ New</Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center" style={{ minHeight: '200px' }}>
                    <div className="spinner"></div>
                </div>
            ) : papers.length === 0 ? (
                <div className="glass-card text-center" style={{ padding: 'var(--space-10)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>📝</div>
                    <h2 className="mb-2">No Papers Yet</h2>
                    <p className="text-muted mb-8">Generate your first question paper to get started.</p>
                    <Link href="/generate" className="btn btn-primary">Generate Paper</Link>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {papers.map((paper) => (
                        <div key={paper.id} className="glass-card" style={{ padding: 'var(--space-4)' }}>
                            <div className="flex justify-between items-start mb-3">
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                                        {paper.title}
                                    </h3>
                                    <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                                        {mounted ? formatDate(paper.created_at) : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(paper.id)}
                                    className="btn btn-ghost btn-sm text-error"
                                    style={{ padding: 'var(--space-2)' }}
                                >
                                    🗑️
                                </button>
                            </div>

                            <div className="flex gap-2 mb-4" style={{ fontSize: 'var(--text-xs)' }}>
                                <span className="badge badge-primary">{paper.total_marks} Marks</span>
                                <span className="badge badge-success">{paper.duration_minutes} Min</span>
                                {paper.metadata && (
                                    <>
                                        <span className="badge">Tech: {(paper.metadata as Record<string, number>).technical_count || 60}</span>
                                        <span className="badge">Non-Tech: {(paper.metadata as Record<string, number>).non_technical_count || 40}</span>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Link href={`/exam/${paper.id}`} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                                    Start Exam
                                </Link>
                                <Link href={`/preview/${paper.id}`} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                                    Preview
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
