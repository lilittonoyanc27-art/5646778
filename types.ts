export type LetterStatus = 'pending' | 'correct' | 'incorrect';

export interface QuestionItem {
  id: number;
  letter: string;
  ruleES: string;
  ruleHY: string;
  questionES: string;
  questionHY: string;
  answerES: string;
  answerHY: string;
  acceptedAnswers: string[];
  note?: string;
}

export type GameState = 'idle' | 'playing' | 'paused' | 'finished';
