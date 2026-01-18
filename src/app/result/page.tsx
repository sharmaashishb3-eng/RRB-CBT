'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ResultContent() {
    const searchParams = useSearchParams();

    const score = parseFloat(searchParams.get('score') || '0');
    const correct = parseInt(searchParams.get('correct') || '0');
    const wrong = parseInt(searchParams.get('wrong') || '0');
    const unanswered = parseInt(searchParams.get('unanswered') || '0');
    const total = parseInt(searchParams.get('total') || '100');

    const sessionId = searchParams.get('sessionId');

    const percentage = (score / total) * 100;
    const isPassed = percentage >= 40; // 40% passing marks

    return (
        <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
            {/* Result Card */}
            <div className="glass-card text-center" style={{ padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>
                    {isPassed ? '🎉' : '📚'}
                </div>

                <h1 style={{ marginBottom: 'var(--space-2)', color: isPassed ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {isPassed ? 'Congratulations!' : 'Keep Practicing!'}
                </h1>

                <p className="text-muted mb-8">
                    {isPassed
                        ? 'You have passed the mock test.'
                        : 'You need 40% to pass. Keep trying!'}
                </p>

                {/* Score Circle */}
                <div style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    background: `conic-gradient(${isPassed ? 'var(--color-success)' : 'var(--color-warning)'} ${percentage}%, rgba(255,255,255,0.1) 0)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-8)',
                }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: 'var(--color-gray-900)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                    }}>
                        <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>{score}</span>
                        <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>/{total}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="card-grid mb-8">
                    <div className="glass-card stat-card">
                        <div className="stat-value text-success">{correct}</div>
                        <div className="stat-label">Correct</div>
                    </div>
                    <div className="glass-card stat-card">
                        <div className="stat-value text-error">{wrong}</div>
                        <div className="stat-label">Wrong</div>
                    </div>
                    <div className="glass-card stat-card">
                        <div className="stat-value text-muted">{unanswered}</div>
                        <div className="stat-label">Unanswered</div>
                    </div>
                </div>

                {/* Analysis */}
                <div className="glass-card mb-8" style={{ padding: 'var(--space-4)', textAlign: 'left' }}>
                    <h3 className="mb-4">Performance Analysis</h3>
                    <div className="subject-row">
                        <span>Accuracy</span>
                        <span className="text-primary">{correct + wrong > 0 ? ((correct / (correct + wrong)) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="subject-row">
                        <span>Attempt Rate</span>
                        <span className="text-primary">{((total - unanswered) / total * 100).toFixed(1)}%</span>
                    </div>
                    <div className="subject-row">
                        <span>Negative Marks</span>
                        <span className="text-error">-{(wrong / 3).toFixed(2)}</span>
                    </div>
                    <div className="subject-row">
                        <span>Net Score</span>
                        <span className={isPassed ? 'text-success' : 'text-warning'}>{score.toFixed(2)}/{total}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-4">
                    {sessionId && (
                        <Link href={`/analysis/${sessionId}`} className="btn btn-primary btn-lg">
                            📊 View In-Depth Analysis
                        </Link>
                    )}
                    <Link href="/generate" className="btn btn-outline btn-lg">
                        + Generate New Paper
                    </Link>
                    <Link href="/history" className="btn btn-ghost">
                        View All Papers
                    </Link>
                    <Link href="/" className="btn btn-ghost">
                        Back to Home
                    </Link>
                </div>
            </div>

            {/* Tips */}
            {!isPassed && (
                <div className="glass-card mt-8" style={{ padding: 'var(--space-6)' }}>
                    <h3 className="mb-4">💡 Tips for Improvement</h3>
                    <ul style={{ paddingLeft: 'var(--space-6)', color: 'var(--color-gray-400)' }}>
                        <li style={{ marginBottom: 'var(--space-2)' }}>Focus on subjects where you got wrong answers</li>
                        <li style={{ marginBottom: 'var(--space-2)' }}>Review the RRB JE CS/IT syllabus thoroughly</li>
                        <li style={{ marginBottom: 'var(--space-2)' }}>Practice more mock tests to improve speed</li>
                        <li style={{ marginBottom: 'var(--space-2)' }}>Avoid negative marking by answering only when confident</li>
                    </ul>
                </div>
            )}
        </div>
    );
}

export default function ResultPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        }>
            <ResultContent />
        </Suspense>
    );
}
