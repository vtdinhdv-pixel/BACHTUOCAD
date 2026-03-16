import { Subject, Question } from './types';

export const DEMO_SUBJECTS: Subject[] = [
  {
    id: 'grade-6',
    name: 'Toán Lớp 6',
    icon: '🐙',
    questionsCount: 15,
    description: 'Số tự nhiên, phân số, số thập phân và hình học cơ bản.'
  },
  {
    id: 'grade-7',
    name: 'Toán Lớp 7',
    icon: '🐠',
    questionsCount: 12,
    description: 'Số hữu tỉ, biểu thức đại số, tam giác và thống kê.'
  },
  {
    id: 'grade-8',
    name: 'Toán Lớp 8',
    icon: '🦀',
    questionsCount: 10,
    description: 'Đa thức, phân thức đại số, tứ giác và định lý Ta-lét.'
  },
  {
    id: 'grade-9',
    name: 'Toán Lớp 9',
    icon: '🐳',
    questionsCount: 8,
    description: 'Căn bậc hai, hàm số bậc nhất, hệ phương trình và đường tròn.'
  }
];

export const DEMO_QUESTIONS: Question[] = [
  {
    id: 'q1',
    subjectId: 'grade-6',
    content: 'Tính giá trị của biểu thức: $2^3 + 3 \times (5 - 2)$',
    type: 'multiple-choice',
    options: ['17', '15', '11', '20'],
    correctAnswer: '17',
    explanation: '$2^3 = 8$. $5 - 2 = 3$. $3 \times 3 = 9$. $8 + 9 = 17$.',
    difficulty: 'easy'
  },
  {
    id: 'q2',
    subjectId: 'grade-7',
    content: 'Tìm x biết: $\frac{x}{2} = \frac{3}{4}$',
    type: 'multiple-choice',
    options: ['1.5', '1', '2', '0.75'],
    correctAnswer: '1.5',
    explanation: '$x = \frac{3 \times 2}{4} = \frac{6}{4} = 1.5$.',
    difficulty: 'easy'
  },
  {
    id: 'q3',
    subjectId: 'grade-8',
    content: 'Phân tích đa thức sau thành nhân tử: $x^2 - 4$',
    type: 'multiple-choice',
    options: ['(x-2)(x+2)', '(x-2)^2', '(x+2)^2', 'x(x-4)'],
    correctAnswer: '(x-2)(x+2)',
    explanation: 'Đây là hằng đẳng thức hiệu hai bình phương: $a^2 - b^2 = (a-b)(a+b)$.',
    difficulty: 'medium'
  }
];

export const AI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Nhanh)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Thông minh)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Ổn định)' }
];
