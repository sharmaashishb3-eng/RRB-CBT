import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface QuestionPaper {
    id: string;
    title: string;
    created_at: string;
    total_marks: number;
    duration_minutes: number;
    metadata: Record<string, unknown>;
}

export interface Question {
    id: string;
    paper_id: string;
    question_number: number;
    question_text: string;
    options: {
        a: string;
        b: string;
        c: string;
        d: string;
    };
    correct_answer: 'a' | 'b' | 'c' | 'd';
    category: 'technical' | 'non_technical';
    subject: string;
    difficulty: 'easy' | 'medium' | 'hard';
    marks: number;
    explanation?: string;
}

export interface ExamSession {
    id: string;
    paper_id: string;
    started_at: string;
    completed_at?: string;
    responses: Record<string, string>;
    score?: number;
    status: 'in_progress' | 'completed' | 'abandoned';
}

// CRUD Operations for Question Papers
export async function saveQuestionPaper(
    title: string,
    questions: Omit<Question, 'id' | 'paper_id' | 'question_number'>[],
    totalMarks: number = 100,
    durationMinutes: number = 90
): Promise<{ paper: QuestionPaper | null; error: Error | null }> {
    try {
        // Insert the paper
        const { data: paper, error: paperError } = await supabase
            .from('question_papers')
            .insert({
                title,
                total_marks: totalMarks,
                duration_minutes: durationMinutes,
                metadata: {
                    technical_count: questions.filter(q => q.category === 'technical').length,
                    non_technical_count: questions.filter(q => q.category === 'non_technical').length,
                }
            })
            .select()
            .single();

        if (paperError) throw paperError;

        // Insert all questions
        const questionsWithPaperId = questions.map((q, index) => ({
            ...q,
            paper_id: paper.id,
            question_number: index + 1,
        }));

        const { error: questionsError } = await supabase
            .from('questions')
            .insert(questionsWithPaperId);

        if (questionsError) throw questionsError;

        return { paper, error: null };
    } catch (error) {
        return { paper: null, error: error as Error };
    }
}

export async function getQuestionPapers(): Promise<QuestionPaper[]> {
    const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching papers:', error);
        return [];
    }

    return data || [];
}

export async function getQuestionPaperById(paperId: string): Promise<{
    paper: QuestionPaper | null;
    questions: Question[];
}> {
    const { data: paper, error: paperError } = await supabase
        .from('question_papers')
        .select('*')
        .eq('id', paperId)
        .single();

    if (paperError) {
        console.error('Error fetching paper:', paperError);
        return { paper: null, questions: [] };
    }

    const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('paper_id', paperId)
        .order('question_number', { ascending: true });

    if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        return { paper, questions: [] };
    }

    return { paper, questions: questions || [] };
}

export async function deleteQuestionPaper(paperId: string): Promise<boolean> {
    const { error } = await supabase
        .from('question_papers')
        .delete()
        .eq('id', paperId);

    if (error) {
        console.error('Error deleting paper:', error);
        return false;
    }

    return true;
}

// Exam Session Operations
export async function createExamSession(paperId: string): Promise<ExamSession | null> {
    const { data, error } = await supabase
        .from('exam_sessions')
        .insert({
            paper_id: paperId,
            responses: {},
            status: 'in_progress',
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating session:', error);
        return null;
    }

    return data;
}

export async function updateExamSession(
    sessionId: string,
    responses: Record<string, string>,
    completed: boolean = false,
    score?: number
): Promise<boolean> {
    const updateData: Partial<ExamSession> = { responses };

    if (completed) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        if (score !== undefined) updateData.score = score;
    }

    const { error } = await supabase
        .from('exam_sessions')
        .update(updateData)
        .eq('id', sessionId);

    if (error) {
        console.error('Error updating session:', error);
        return false;
    }

    return true;
}

export async function getExamSessionById(sessionId: string): Promise<{
    session: ExamSession | null;
    paper: QuestionPaper | null;
}> {
    const { data: session, error: sessionError } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (sessionError) {
        console.error('Error fetching session:', sessionError);
        return { session: null, paper: null };
    }

    const { data: paper, error: paperError } = await supabase
        .from('question_papers')
        .select('*')
        .eq('id', session.paper_id)
        .single();

    if (paperError) {
        console.error('Error fetching paper:', paperError);
        return { session, paper: null };
    }

    return { session, paper };
}
