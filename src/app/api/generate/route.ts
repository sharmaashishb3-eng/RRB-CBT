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
    category: 'technical' | 'non_technical',
    attempt = 1
): Promise<any[]> {
    if (!PERPLEXITY_API_KEY) {
        throw new Error('PERPLEXITY_API_KEY is not configured');
    }

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

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
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
            throw new Error(`API ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();

        // More robust JSON extraction
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
        console.error(`Error generating ${subject.name} (Attempt ${attempt}):`, e);
        
        // Retry logic
        if (attempt < 2) {
            console.log(`Retrying ${subject.name}...`);
            return generateQuestionsWithAI(subject, category, attempt + 1);
        }

        // Final Fallback
        return Array(subject.marks).fill(null).map((_, i) => ({
            question_text: `[AI Error] Could not generate question for ${subject.name}. Reference topic: ${subject.topics[i % subject.topics.length]}`,
            options: { a: 'A', b: 'B', c: 'C', d: 'D' },
            correct_answer: 'a' as const,
            explanation: `Generation failed after ${attempt} attempts: ${e instanceof Error ? e.message : 'Unknown error'}`,
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
                    subject: 'Starting parallel generation...'
                }) + '\n'));

                // Fire all requests in parallel
                const techPromises = technicalSubjects.map(s =>
                    generateQuestionsWithAI(s, 'technical')
                );
                const nonTechPromises = nonTechnicalSubjects.map(s =>
                    generateQuestionsWithAI(s, 'non_technical')
                );

                // Update progress while waiting
                const waitInterval = setInterval(() => {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        progress: 10 + Math.random() * 70, // Fake progress for visual feedback
                        subject: 'AI is processing multiple subjects simultaneously...'
                    }) + '\n'));
                }, 2000);

                const results = await Promise.all([...techPromises, ...nonTechPromises]);
                clearInterval(waitInterval);

                const allQuestions = results.flat();

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

