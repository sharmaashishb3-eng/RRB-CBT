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
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

type Provider = 'perplexity' | 'openrouter';

async function callProvider(
    provider: Provider,
    subject: Subject,
    category: 'technical' | 'non_technical',
    attempt: number
) {
    const isPerplexity = provider === 'perplexity';
    const apiKey = isPerplexity ? PERPLEXITY_API_KEY : OPENROUTER_API_KEY;
    const url = isPerplexity
        ? 'https://api.perplexity.ai/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';

    // 3-Tier Model Rotation to handle Credits (Error 402) and Rate Limits
    const models = isPerplexity 
        ? ['sonar'] 
        : ['anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-8b-instruct'];
    
    // Use attempt to rotate models if needed
    const model = models[(attempt - 1) % models.length];

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

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };

    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'http://localhost:3000';
        headers['X-Title'] = 'RRB-JE-CBT';
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'You are a professional exam generator for RRB JE. You MUST output ONLY a valid JSON array. Always use the specified keys: question_text, options (as object with keys a,b,c,d), correct_answer, explanation.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 2000, // Reduced from 4000 to prevent 402 Insufficient Credits errors
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`${provider.toUpperCase()} API ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
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
            opts = { a: 'A', b: 'B', c: 'C', d: 'D' };
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
    // Orchestration Logic: Map subjects to providers
    const perSubjectProvider: Record<string, Provider> = {
        'Reasoning': 'perplexity',
        'English Language': 'perplexity',
        'General Studies/GK': 'perplexity',
        'Mathematics': 'openrouter',
    };

    const provider: Provider = perSubjectProvider[subject.name] || (category === 'technical' ? 'openrouter' : 'perplexity');

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

        // Multi-Model Fallback: Try the other provider as fallback if primary fails
        if (attempt < 2) {
            const fallbackProvider: Provider = provider === 'perplexity' ? 'openrouter' : 'perplexity';
            console.log(`Retrying ${subject.name} with ${fallbackProvider}...`);
            return generateQuestionsWithAI(subject, category, attempt + 1);
        }

        // Final Fallback: Structural placeholder to keep the paper alive
        return Array(subject.marks).fill(null).map((_, i) => ({
            question_text: `[AI Error] Could not generate question for ${subject.name}. Reference topic: ${subject.topics[i % subject.topics.length]}`,
            options: { a: 'Check documentation', b: 'Review syllabus', c: 'Contact support', d: 'Retry generation' },
            correct_answer: 'a',
            explanation: `Generation failed after ${attempt} attempts on multiple providers. Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
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

                controller.enqueue(encoder.encode(JSON.stringify({
                    progress: 5,
                    subject: 'Orchestrating Multi-AI generation...'
                }) + '\n'));

                // Fire all requests in parallel across both providers
                const allPromises = [
                    ...technicalSubjects.map(s => generateQuestionsWithAI(s, 'technical')),
                    ...nonTechnicalSubjects.map(s => generateQuestionsWithAI(s, 'non_technical'))
                ];

                const waitInterval = setInterval(() => {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        progress: 10 + Math.random() * 80,
                        subject: 'Claude & Perplexity are collaborating on your paper...'
                    }) + '\n'));
                }, 2000);

                const results = await Promise.all(allPromises);
                clearInterval(waitInterval);

                const allQuestions = results.flat();

                // Shuffle for random distribution
                const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);

                const title = `RRB JE Multi-AI Mock - ${new Date().toLocaleDateString('en-IN')}`;

                controller.enqueue(encoder.encode(JSON.stringify({
                    progress: 95, subject: 'Finalizing paper structure...', status: 'saving'
                }) + '\n'));

                const { paper, error } = await saveQuestionPaper(title, shuffled, 100, 90);

                if (error) throw error;

                controller.enqueue(encoder.encode(JSON.stringify({
                    progress: 100, status: 'complete', paperId: paper?.id
                }) + '\n'));
            } catch (e) {
                console.error('Orchestration Error:', e);
                controller.enqueue(encoder.encode(JSON.stringify({
                    error: e instanceof Error ? e.message : 'Orchestration failed'
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
