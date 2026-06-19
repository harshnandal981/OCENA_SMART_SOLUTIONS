export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          topic: string;
          difficulty: string;
          audience: string;
          title: string;
          description: string;
          thumbnail_url: string | null;
          learning_outcomes: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic: string;
          difficulty: string;
          audience: string;
          title: string;
          description: string;
          thumbnail_url?: string | null;
          learning_outcomes?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          topic?: string;
          difficulty?: string;
          audience?: string;
          title?: string;
          description?: string;
          thumbnail_url?: string | null;
          learning_outcomes?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description: string;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          description: string;
          order_index: number;
          content: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          description: string;
          order_index: number;
          content?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          title?: string;
          description?: string;
          order_index?: number;
          content?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quizzes: {
        Row: {
          id: string;
          lesson_id: string;
          questions_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          questions_json?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          questions_json?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
