import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="container">
            {/* Hero Section */}
            <section className="hero">
                <div className="badge badge-primary mb-4">RRB JE CS/IT 2026</div>
                <h1 className="hero-title">
                    AI-Powered CBT Practice
                </h1>
                <p className="hero-subtitle">
                    Generate authentic question papers with AI, practice in real exam conditions,
                    and track your progress for RRB Junior Engineer CS/IT exam.
                </p>
                <div className="flex flex-col gap-4 items-center">
                    <Link href="/generate" className="btn btn-primary btn-lg">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                        </svg>
                        Generate Question Paper
                    </Link>
                    <Link href="/history" className="btn btn-outline">
                        View Saved Papers
                    </Link>
                </div>
            </section>

            {/* Exam Pattern Overview */}
            <section className="mt-12">
                <h2 className="text-center mb-8">Question Paper Pattern</h2>
                <div className="card-grid">
                    <div className="glass-card stat-card">
                        <div className="stat-value">100</div>
                        <div className="stat-label">Total Questions</div>
                    </div>
                    <div className="glass-card stat-card">
                        <div className="stat-value">100</div>
                        <div className="stat-label">Total Marks</div>
                    </div>
                    <div className="glass-card stat-card">
                        <div className="stat-value">90</div>
                        <div className="stat-label">Minutes Duration</div>
                    </div>
                </div>
            </section>

            {/* Subject Distribution */}
            <section className="mt-12">
                <h2 className="text-center mb-6">Subject Distribution</h2>
                <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                    <h3 className="text-primary mb-4">Technical Subjects (60 Marks)</h3>
                    <div className="subject-row">
                        <span className="subject-name">C/C++ Programming</span>
                        <span className="subject-marks">10 Marks</span>
                    </div>
                    <div className="subject-row">
                        <span className="subject-name">Data Structures</span>
                        <span className="subject-marks">8 Marks</span>
                    </div>
                    <div className="subject-row">
                        <span className="subject-name">DBMS & SQL</span>
                        <span className="subject-marks">10 Marks</span>
                    </div>
                    <div className="subject-row">
                        <span className="subject-name">Operating Systems</span>
                        <span className="subject-marks">8 Marks</span>
                    </div>
                    <div className="subject-row">
                        <span className="subject-name">Computer Networks</span>
                        <span className="subject-marks">8 Marks</span>
                    </div>
                    <div className="subject-row">
                        <span className="subject-name">Web Technologies</span>
                        <span className="subject-marks">8 Marks</span>
                    </div>
                    <div className="subject-row">
                        <span className="subject-name">Software Engineering</span>
                        <span className="subject-marks">8 Marks</span>
                    </div>

                    <h3 className="text-primary mb-4 mt-8">Non-Technical Sections (40 Marks)</h3>
                    <div className="subject-row">
                        <span className="subject-name">Reasoning</span>
                        <span className="subject-marks">10 Marks</span>
                    </div>
                    <div className="subject-row">
                        <span className="subject-name">Mathematics</span>
                        <span className="subject-marks">10 Marks</span>
                    </div>
                    <div className="subject-row">
                        <span className="subject-name">English Language</span>
                        <span className="subject-marks">10 Marks</span>
                    </div>
                    <div className="subject-row">
                        <span className="subject-name">General Studies/GK</span>
                        <span className="subject-marks">10 Marks</span>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="mt-12 mb-16">
                <h2 className="text-center mb-8">Platform Features</h2>
                <div className="card-grid">
                    <div className="glass-card feature-card">
                        <div className="feature-icon">🤖</div>
                        <h3 className="feature-title">AI Question Generation</h3>
                        <p className="feature-desc">
                            Powered by Perplexity AI to generate unique, relevant questions based on RRB JE syllabus.
                        </p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon">⏱️</div>
                        <h3 className="feature-title">Real Exam Simulation</h3>
                        <p className="feature-desc">
                            Timed tests with question palette, mark for review, and authentic CBT interface.
                        </p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon">📊</div>
                        <h3 className="feature-title">Performance Tracking</h3>
                        <p className="feature-desc">
                            Track your scores, analyze weak areas, and monitor progress over time.
                        </p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon">💾</div>
                        <h3 className="feature-title">Save & Retry</h3>
                        <p className="feature-desc">
                            All question papers are saved to cloud. Retry anytime to improve your score.
                        </p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon">📱</div>
                        <h3 className="feature-title">Mobile Optimized</h3>
                        <p className="feature-desc">
                            Practice anywhere with our mobile-first design. Works perfectly on all devices.
                        </p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon">🎯</div>
                        <h3 className="feature-title">Syllabus Aligned</h3>
                        <p className="feature-desc">
                            Questions strictly follow RRB JE CS/IT official syllabus and pattern.
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                padding: 'var(--space-8) 0',
                borderTop: '1px solid var(--glass-border)',
                color: 'var(--color-gray-500)',
                fontSize: 'var(--text-sm)'
            }}>
                <p>RRB JE CS/IT CBT Platform © 2026</p>
                <p className="mt-2">Powered by AI • Built for Success</p>
            </footer>
        </div>
    );
}
