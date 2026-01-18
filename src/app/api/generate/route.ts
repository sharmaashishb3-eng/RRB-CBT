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

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

async function generateQuestionsWithAI(
    subject: Subject,
    category: 'technical' | 'non_technical'
) {
    if (!PERPLEXITY_API_KEY) {
        throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    const prompt = `Generate ${subject.marks} multiple choice questions for the subject "${subject.name}" for an RRB JE (Railway Recruitment Board Junior Engineer) level examination.
Focus on these topics: ${subject.topics.join(', ')}.
The questions should be appropriate for ${category === 'technical' ? 'Technical (CS/IT)' : 'Non-Technical'} section.

Return ONLY a JSON array of objects with the following structure:
[
  {
    "question_text": "string",
    "options": { "a": "string", "b": "string", "c": "string", "d": "string" },
    "correct_answer": "a" | "b" | "c" | "d",
    "explanation": "string"
  }
]

Ensure the JSON is valid and contains exactly ${subject.marks} questions. Do not include any other text, markdown blocks, or explanation outside the JSON.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'sonar',
            messages: [
                { role: 'system', content: 'You are a professional educational content generator for RRB JE exams. You only output valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Perplexity API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    // Clean up content if it contains markdown code blocks
    if (content.includes('```json')) {
        content = content.split('```json')[1].split('```')[0];
    } else if (content.includes('```')) {
        content = content.split('```')[1].split('```')[0];
    }

    try {
        const questions = JSON.parse(content.trim());
        return questions.map((q: any) => ({
            ...q,
            category,
            subject: subject.name,
            difficulty: 'medium' as const, // Defaulting to medium for AI generated
            marks: 1,
        }));
    } catch (e) {
        console.error('Failed to parse AI response:', content);
        throw new Error(`Failed to parse AI generated questions for ${subject.name}`);
    }
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { technicalSubjects, nonTechnicalSubjects }: GenerateRequest = await request.json();
                const allQuestions: any[] = [];

                const total = technicalSubjects.length + nonTechnicalSubjects.length;
                let done = 0;

                // Technical
                for (const s of technicalSubjects) {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        progress: (done / total) * 90,
                        subject: `AI is generating ${s.name} questions...`
                    }) + '\n'));

                    const questions = await generateQuestionsWithAI(s, 'technical');
                    allQuestions.push(...questions);

                    done++;
                }

                // Non-technical
                for (const s of nonTechnicalSubjects) {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        progress: (done / total) * 90,
                        subject: `AI is generating ${s.name} questions...`
                    }) + '\n'));

                    const questions = await generateQuestionsWithAI(s, 'non_technical');
                    allQuestions.push(...questions);

                    done++;
                }

                // Shuffle
                const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);

                // Save
                controller.enqueue(encoder.encode(JSON.stringify({
                    progress: 95, subject: 'Saving to database...', status: 'saving'
                }) + '\n'));

                const title = `RRB JE AI Mock - ${new Date().toLocaleDateString('en-IN')}`;
                const { paper, error } = await saveQuestionPaper(title, shuffled, 100, 90);

                if (error) throw error;

                controller.enqueue(encoder.encode(JSON.stringify({
                    progress: 100, status: 'complete', paperId: paper?.id
                }) + '\n'));
            } catch (e) {
                console.error('Generation Error:', e);
                controller.enqueue(encoder.encode(JSON.stringify({
                    error: e instanceof Error ? e.message : 'Generation failed'
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
