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
    category: 'technical' | 'non_technical'
) {
    const isPerplexity = provider === 'perplexity';
    const apiKey = isPerplexity ? PERPLEXITY_API_KEY : OPENROUTER_API_KEY;
    const url = isPerplexity
        ? 'https://api.perplexity.ai/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';

    const model = isPerplexity ? 'sonar' : 'meta-llama/llama-3.1-405b-instruct';

    const prompt = `Generate exactly ${subject.marks} multiple choice questions for "${subject.name}" (RRB JE level).
Topics: ${subject.topics.join(', ')}.
Section: ${category === 'technical' ? 'Technical (CS/IT)' : 'Non-Technical'}.

CRITICAL: Return ONLY a JSON array of objects. No markdown, no text.
Structure:
[
  {
    "question_text": "string",
    "options": { "a": "...", "b": "...", "c": "...", "d": "..." },
    "correct_answer": "a" | "b" | "c" | "d",
    "explanation": "string"
  }
]`;

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
                { role: 'system', content: 'You are a professional exam generator. You MUST output ONLY a valid JSON array. Do not include any text before or after the JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 4000,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`${provider.toUpperCase()} API ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
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
        let content = await callProvider(provider, subject, category);

        // Robust JSON extraction
        const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
            content = jsonMatch[0];
        }

        const questions = JSON.parse(content);
        const questionArray = Array.isArray(questions) ? questions : [questions];

        return questionArray.map((q: any) => ({
            ...q,
            category,
            subject: subject.name,
            difficulty: 'medium' as const,
            marks: 1,
        }));
    } catch (e) {
        console.error(`Error generating ${subject.name} via ${provider} (Attempt ${attempt}):`, e);

        // Multi-Model Fallback: Try the other provider if primary fails
        if (attempt < 2) {
            const fallbackProvider: Provider = provider === 'perplexity' ? 'openrouter' : 'perplexity';
            console.log(`Retrying ${subject.name} with ${fallbackProvider}...`);
            return generateQuestionsWithAI(subject, category, attempt + 1);
        }

        // Final Fallback if both fail
        return Array(subject.marks).fill(null).map((_, i) => ({
            question_text: `[AI Error] Could not generate question for ${subject.name}. Reference topic: ${subject.topics[i % subject.topics.length]}`,
            options: { a: 'A', b: 'B', c: 'C', d: 'D' },
            correct_answer: 'a' as const,
            explanation: `Generation failed after ${attempt} attempts on multiple models: ${e instanceof Error ? e.message : 'Unknown error'}`,
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
                    progress: 10,
                    subject: 'Orchestrating Multi-AI generation...'
                }) + '\n'));

                // Fire all requests in parallel across both providers
                const allPromises = [
                    ...technicalSubjects.map(s => generateQuestionsWithAI(s, 'technical')),
                    ...nonTechnicalSubjects.map(s => generateQuestionsWithAI(s, 'non_technical'))
                ];

                const waitInterval = setInterval(() => {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        progress: 10 + Math.random() * 70,
                        subject: 'Perplexity & OpenRouter are working together...'
                    }) + '\n'));
                }, 1500);

                const results = await Promise.all(allPromises);
                clearInterval(waitInterval);

                const allQuestions = results.flat();

                // Shuffle
                const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);

                const title = `RRB JE Multi-AI Mock - ${new Date().toLocaleDateString('en-IN')}`;

                controller.enqueue(encoder.encode(JSON.stringify({
                    progress: 95, subject: 'Finalizing paper...', status: 'saving'
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
