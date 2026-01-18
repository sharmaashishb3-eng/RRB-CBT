import { NextRequest, NextResponse } from 'next/server';
import { saveQuestionPaper } from '@/lib/supabase';

interface Subject {
    name: string;
    marks: number;
    topics: string[];
}

interface GenerateRequest {
    technicalSubjects: Subject[];
    nonTechnicalSubjects: Subject[];
}

// Question bank - imported separately to keep route clean
import { getQuestionBank } from '@/lib/questionBank';

async function generateQuestionsForSubject(
    subject: Subject,
    category: 'technical' | 'non_technical'
) {
    const questions = [];
    const bank = getQuestionBank();
    const subjectBank = bank[subject.name] || [];

    for (let i = 0; i < subject.marks; i++) {
        const q = subjectBank[i % subjectBank.length] || {
            question_text: `Question about ${subject.topics[i % subject.topics.length]} in ${subject.name}?`,
            options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' },
            correct_answer: 'a' as const,
            explanation: 'This is an auto-generated question.',
        };

        questions.push({
            ...q,
            category,
            subject: subject.name,
            difficulty: ['easy', 'medium', 'hard'][i % 3],
            marks: 1,
        });
    }

    return questions;
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { technicalSubjects, nonTechnicalSubjects }: GenerateRequest = await request.json();
                const allQuestions: Array<{
                    question_text: string;
                    options: { a: string; b: string; c: string; d: string };
                    correct_answer: 'a' | 'b' | 'c' | 'd';
                    category: 'technical' | 'non_technical';
                    subject: string;
                    difficulty: 'easy' | 'medium' | 'hard';
                    marks: number;
                    explanation: string;
                }> = [];

                const total = technicalSubjects.length + nonTechnicalSubjects.length;
                let done = 0;

                // Technical
                for (const s of technicalSubjects) {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        progress: (done / total) * 90,
                        subject: `Generating ${s.name}...`
                    }) + '\n'));
                    allQuestions.push(...(await generateQuestionsForSubject(s, 'technical')));
                    done++;
                    await new Promise(r => setTimeout(r, 50));
                }

                // Non-technical
                for (const s of nonTechnicalSubjects) {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        progress: (done / total) * 90,
                        subject: `Generating ${s.name}...`
                    }) + '\n'));
                    allQuestions.push(...(await generateQuestionsForSubject(s, 'non_technical')));
                    done++;
                    await new Promise(r => setTimeout(r, 50));
                }

                // Shuffle
                const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);

                // Save
                controller.enqueue(encoder.encode(JSON.stringify({
                    progress: 95, subject: 'Saving...', status: 'saving'
                }) + '\n'));

                const title = `RRB JE Mock - ${new Date().toLocaleDateString('en-IN')}`;
                const { paper, error } = await saveQuestionPaper(title, shuffled, 100, 90);

                if (error) throw error;

                controller.enqueue(encoder.encode(JSON.stringify({
                    progress: 100, status: 'complete', paperId: paper?.id
                }) + '\n'));
            } catch (e) {
                controller.enqueue(encoder.encode(JSON.stringify({
                    error: e instanceof Error ? e.message : 'Failed'
                }) + '\n'));
            } finally {
                controller.close();
            }
        }
    });

    return new NextResponse(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}
