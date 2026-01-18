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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

type Provider = 'perplexity' | 'google';

async function callProvider(
    provider: Provider,
    subject: Subject,
    category: 'technical' | 'non_technical',
    attempt: number
) {
    const isPerplexity = provider === 'perplexity';
    const isGoogle = provider === 'google';

    // Model Selection
    let model = '';
    if (isPerplexity) {
        model = attempt === 1 ? 'sonar' : 'sonar-pro';
    } else { // isGoogle
        model = 'gemini-1.5-flash';
    }

    const prompt = `Generate exactly ${subject.marks} multiple choice questions for "${subject.name}" (RRB JE level).
Topics: ${subject.topics.join(', ')}.
Section: ${category === 'technical' ? 'Technical (CS/IT)' : 'Non-Technical'}.

CRITICAL: Return ONLY a JSON array of objects. No markdown, no text.
Structure PER QUESTION:
{
  "question_text": "the question text here",
  "options": { "a": "option 1", "b": "option 2", "c": "option 3", "d": "option 4" },
  "correct_answer": "a",
  "explanation": "detailed explanation"
}`;

    if (isGoogle) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json"
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`GOOGLE API ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';
        return content;
    }

    // Perplexity (OpenAI-compatible)
    const url = 'https://api.perplexity.ai/chat/completions';
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'You are a professional exam generator for RRB JE. You MUST output ONLY a valid JSON array. Always use the specified keys: question_text, options (as object with keys a,b,c,d), correct_answer, explanation.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 3000,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`PERPLEXITY API ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '[]';
}

function normalizeQuestions(questions: any[], subjectName: string, category: string) {
    return (Array.isArray(questions) ? questions : [questions]).map((q: any) => {
        // Handle 'question' vs 'question_text'
        const text = q.question_text || q.question || q.text || 'Question text missing';

        // Handle options as array [opt1, opt2, opt3, opt4] or object
        let opts = q.options;
        if (Array.isArray(opts)) {
            opts = {
                a: String(opts[0] || ''),
                b: String(opts[1] || ''),
                c: String(opts[2] || ''),
                d: String(opts[3] || '')
            };
        } else if (typeof opts === 'object' && opts !== null) {
            // Ensure all keys exist
            opts = {
                a: String(opts.a || opts.A || ''),
                b: String(opts.b || opts.B || ''),
                c: String(opts.c || opts.C || ''),
                d: String(opts.d || opts.D || '')
            };
        } else {
            opts = { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' };
        }

        // Handle case-insensitive correct_answer
        const correct = String(q.correct_answer || q.answer || 'a').toLowerCase().trim();
        const validAnswers = ['a', 'b', 'c', 'd'];
        let correctKey = 'a';
        for (const key of validAnswers) {
            if (correct.includes(key)) {
                correctKey = key;
                break;
            }
        }

        return {
            question_text: text,
            options: opts,
            correct_answer: correctKey,
            explanation: q.explanation || q.reason || 'No explanation provided.',
            category,
            subject: subjectName,
            difficulty: 'medium' as const,
            marks: 1,
        };
    });
}

async function generateQuestionsWithAI(
    subject: Subject,
    category: 'technical' | 'non_technical',
    attempt = 1
): Promise<any[]> {
    // 1st Attempt: Use Preferred Provider
    // 2nd Attempt: Use Fallback Provider
    const preferredProviders: Record<string, Provider> = {
        'Reasoning': 'perplexity',
        'English Language': 'perplexity',
        'General Studies/GK': 'perplexity'
    };

    let provider: Provider = preferredProviders[subject.name] || 'google';

    if (attempt > 1) {
        provider = provider === 'google' ? 'perplexity' : 'google';
    }

    try {
        let content = await callProvider(provider, subject, category, attempt);

        // Robust JSON extraction
        const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
            content = jsonMatch[0];
        }

        const questions = JSON.parse(content);
        return normalizeQuestions(questions, subject.name, category);
    } catch (e) {
        console.error(`Error generating ${subject.name} via ${provider} (Attempt ${attempt}):`, e);

        if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1000));
            return generateQuestionsWithAI(subject, category, attempt + 1);
        }

        // Final Fallback: Structural placeholder to keep the paper alive
        return Array(subject.marks).fill(null).map((_, i) => ({
            question_text: `[AI Error] Could not generate question for ${subject.name}. Reference topic: ${subject.topics[i % subject.topics.length]}`,
            options: { a: 'A', b: 'B', c: 'C', d: 'D' },
            correct_answer: 'a',
            explanation: `Generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
            category,
            subject: subject.name,
            difficulty: 'medium' as const,
            marks: 1,
        }));
    }
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { technicalSubjects, nonTechnicalSubjects }: GenerateRequest = await request.json();
                const allRequested = [
                    ...technicalSubjects.map(s => ({ ...s, cat: 'technical' })),
                    ...nonTechnicalSubjects.map(s => ({ ...s, cat: 'non_technical' }))
                ];

                controller.enqueue(encoder.encode(JSON.stringify({ progress: 5, subject: 'Initializing Batch Generation...' }) + '\n'));

                let allQuestions: any[] = [];
                const batchSize = 3; // Processing subjects in batches of 3 to balance speed and reliability

                for (let i = 0; i < allRequested.length; i += batchSize) {
                    const batch = allRequested.slice(i, i + batchSize);
                    const progress = Math.round(5 + (i / allRequested.length) * 85);

                    controller.enqueue(encoder.encode(JSON.stringify({
                        progress,
                        subject: `Generating Batch: ${batch.map(s => s.name).join(', ')}...`
                    }) + '\n'));

                    const batchPromises = batch.map(s =>
                        generateQuestionsWithAI(s as Subject, s.cat as 'technical' | 'non_technical')
                    );

                    const batchResults = await Promise.all(batchPromises);
                    allQuestions = allQuestions.concat(batchResults.flat());
                }

                const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
                const title = `RRB JE CBT AI Mock - ${new Date().toLocaleDateString('en-IN')}`;

                controller.enqueue(encoder.encode(JSON.stringify({ progress: 95, subject: 'Deep-saving questions...', status: 'saving' }) + '\n'));

                const { paper, error } = await saveQuestionPaper(title, shuffled, 100, 90);
                if (error) throw error;

                controller.enqueue(encoder.encode(JSON.stringify({ progress: 100, status: 'complete', paperId: paper?.id }) + '\n'));
            } catch (e) {
                console.error('Batch Generation Error:', e);
                controller.enqueue(encoder.encode(JSON.stringify({ error: e instanceof Error ? e.message : 'Generation failed' }) + '\n'));
            } finally {
                controller.close();
            }
        }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
