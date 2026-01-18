'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Subject distribution configuration
const TECHNICAL_SUBJECTS = [
    { name: 'C/C++ Programming', marks: 10, topics: ['pointers', 'arrays', 'functions', 'structures', 'file handling', 'OOP concepts'] },
    { name: 'Data Structures', marks: 8, topics: ['arrays', 'linked lists', 'stacks', 'queues', 'trees', 'sorting algorithms'] },
    { name: 'DBMS & SQL', marks: 10, topics: ['normalization', 'SQL queries', 'joins', 'transactions', 'ACID properties', 'ER diagrams'] },
    { name: 'Operating Systems', marks: 8, topics: ['process management', 'memory management', 'file systems', 'scheduling', 'deadlocks'] },
    { name: 'Computer Networks', marks: 8, topics: ['OSI model', 'TCP/IP', 'protocols', 'IP addressing', 'routing', 'network security'] },
    { name: 'Web Technologies', marks: 8, topics: ['HTML', 'CSS', 'JavaScript', 'HTTP', 'web servers', 'security'] },
    { name: 'Software Engineering', marks: 8, topics: ['SDLC', 'testing', 'agile', 'design patterns', 'UML diagrams'] },
];

const NON_TECHNICAL_SUBJECTS = [
    { name: 'Reasoning', marks: 10, topics: ['analogies', 'coding-decoding', 'series', 'syllogism', 'blood relations', 'directions'] },
    { name: 'Mathematics', marks: 10, topics: ['percentages', 'profit-loss', 'time-work', 'algebra', 'geometry', 'number system'] },
    { name: 'English Language', marks: 10, topics: ['grammar', 'vocabulary', 'comprehension', 'error spotting', 'sentence correction'] },
    { name: 'General Studies/GK', marks: 10, topics: ['current affairs', 'Indian history', 'geography', 'polity', 'science facts'] },
];

type GenerationStatus = 'idle' | 'generating' | 'saving' | 'complete' | 'error';

export default function GeneratePage() {
    const router = useRouter();
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [currentSubject, setCurrentSubject] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [generatedPaperId, setGeneratedPaperId] = useState<string | null>(null);

    const generateQuestionPaper = async () => {
        setStatus('generating');
        setProgress(0);
        setError(null);

        try {
            // Call our API route that will use Perplexity to generate questions
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    technicalSubjects: TECHNICAL_SUBJECTS,
                    nonTechnicalSubjects: NON_TECHNICAL_SUBJECTS,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate question paper');
            }

            // Handle streaming response for progress updates
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.progress) setProgress(data.progress);
                            if (data.subject) setCurrentSubject(data.subject);
                            if (data.status === 'saving') setStatus('saving');
                            if (data.status === 'complete' && data.paperId) {
                                setGeneratedPaperId(data.paperId);
                                setStatus('complete');
                            }
                            if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (e) {
                            // Ignore JSON parse errors for incomplete chunks
                        }
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStatus('error');
        }
    };

    const startExam = () => {
        if (generatedPaperId) {
            router.push(`/exam/${generatedPaperId}`);
        }
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-16)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link href="/" className="btn btn-ghost">
                    ← Back
                </Link>
                <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>Generate Paper</h1>
                <div style={{ width: '80px' }}></div>
            </div>

            {/* Main Content */}
            {status === 'idle' && (
                <>
                    {/* Subject Preview */}
                    <div className="glass-card mb-6" style={{ padding: 'var(--space-6)' }}>
                        <h2 className="mb-4" style={{ fontSize: 'var(--text-lg)' }}>
                            📋 Question Paper Configuration
                        </h2>

                        <div className="flex justify-between items-center mb-4" style={{
                            padding: 'var(--space-4)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <span>Total Questions</span>
                            <span className="font-bold text-primary">100</span>
                        </div>

                        <div className="flex justify-between items-center mb-4" style={{
                            padding: 'var(--space-4)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <span>Total Marks</span>
                            <span className="font-bold text-primary">100</span>
                        </div>

                        <div className="flex justify-between items-center" style={{
                            padding: 'var(--space-4)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <span>Duration</span>
                            <span className="font-bold text-primary">90 Minutes</span>
                        </div>
                    </div>

                    {/* Technical Subjects */}
                    <div className="glass-card mb-6" style={{ padding: 'var(--space-6)' }}>
                        <h3 className="text-primary mb-4">Technical Subjects (60 Marks)</h3>
                        {TECHNICAL_SUBJECTS.map((subject) => (
                            <div key={subject.name} className="subject-row">
                                <span className="subject-name">{subject.name}</span>
                                <span className="subject-marks">{subject.marks} Q</span>
                            </div>
                        ))}
                    </div>

                    {/* Non-Technical Subjects */}
                    <div className="glass-card mb-8" style={{ padding: 'var(--space-6)' }}>
                        <h3 className="text-primary mb-4">Non-Technical Sections (40 Marks)</h3>
                        {NON_TECHNICAL_SUBJECTS.map((subject) => (
                            <div key={subject.name} className="subject-row">
                                <span className="subject-name">{subject.name}</span>
                                <span className="subject-marks">{subject.marks} Q</span>
                            </div>
                        ))}
                    </div>

                    {/* Generate Button */}
                    <button onClick={generateQuestionPaper} className="btn btn-primary btn-lg w-full">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        Generate with AI
                    </button>

                    <p className="text-center mt-4 text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                        AI will generate unique questions for each subject based on RRB JE syllabus
                    </p>
                </>
            )}

            {/* Generating State */}
            {(status === 'generating' || status === 'saving') && (
                <div className="glass-card text-center" style={{ padding: 'var(--space-10)' }}>
                    <div className="spinner" style={{ margin: '0 auto var(--space-6)' }}></div>
                    <h2 className="mb-2">
                        {status === 'generating' ? 'Generating Questions...' : 'Saving to Database...'}
                    </h2>
                    <p className="text-muted mb-6">{currentSubject}</p>

                    <div className="progress-bar mb-2">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                        {Math.round(progress)}% Complete
                    </p>
                </div>
            )}

            {/* Complete State */}
            {status === 'complete' && (
                <div className="glass-card text-center" style={{ padding: 'var(--space-10)' }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: 'var(--space-4)',
                        animation: 'slideUp 0.5s ease'
                    }}>
                        ✅
                    </div>
                    <h2 className="mb-2">Question Paper Ready!</h2>
                    <p className="text-muted mb-8">100 questions generated and saved successfully</p>

                    <div className="flex flex-col gap-4">
                        <button onClick={startExam} className="btn btn-primary btn-lg">
                            Start Exam Now
                        </button>
                        <Link href={`/preview/${generatedPaperId}`} className="btn btn-outline">
                            Preview Questions
                        </Link>
                        <Link href="/history" className="btn btn-ghost">
                            View All Papers
                        </Link>
                    </div>
                </div>
            )}

            {/* Error State */}
            {status === 'error' && (
                <div className="glass-card text-center" style={{ padding: 'var(--space-10)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>❌</div>
                    <h2 className="mb-2 text-error">Generation Failed</h2>
                    <p className="text-muted mb-8">{error}</p>

                    <button onClick={() => setStatus('idle')} className="btn btn-primary">
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}
