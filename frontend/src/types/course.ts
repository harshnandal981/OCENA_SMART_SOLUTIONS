export type CourseSummary = {
  id: string;
  title: string;
  description: string;
  difficulty?: string;
  audience?: string;
  thumbnail_url?: string | null;
  created_at: string;
};

export type CourseProgressSummary = {
  completed_lessons: number;
  total_lessons: number;
  percentage: number;
};

export type LessonDetail = {
  id: string;
  module_id: string;
  title: string;
  description: string;
  order_index: number;
  content?: string | null;
  quiz?: QuizRecord | null;
};

export type ModuleDetail = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: LessonDetail[];
};

export type GeneratedCourseResponse = {
  id: string;
  topic: string;
  difficulty: string;
  audience: string;
  title: string;
  description: string;
  learning_outcomes: string[];
  thumbnail_url?: string | null;
  modules: ModuleDetail[];
};

export type QuizRecord = {
  id: string;
  lesson_id: string;
  questions_json: QuizContent;
};

export type QuizMcq = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
};

export type QuizTrueFalse = {
  question: string;
  correct_answer: boolean;
  explanation: string;
};

export type QuizShortAnswer = {
  question: string;
  sample_answer: string;
  explanation: string;
};

export type QuizContent = {
  mcqs: QuizMcq[];
  true_false: QuizTrueFalse[];
  short_answers: QuizShortAnswer[];
};
