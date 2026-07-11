export enum SurveyStatus {
  Draft = 'Draft',
  Active = 'Active',
  Completed = 'Completed'
}

export enum QuestionType {
  Text = 0,
  SingleChoice = 1,
}

export enum AssessmentRole {
  SelfAssessment = 'SelfAssessment',
  Manager = 'Manager',
  Colleague = 'Colleague'
}

export interface Survey {
  id: number
  title: string
  description?: string
  status: SurveyStatus
  startDate: string
  endDate: string
  authorId: number
  authorName: string
}

export interface CreateSurveyDto {
  title: string
  description?: string
  startDate: string
  endDate: string
  authorId: number
}

export interface Question {
  id: number
  text: string
  type: QuestionType
  required: boolean
  order: number
  options?: string[]
}

export interface CreateQuestionDto {
  text: string
  type: QuestionType
  required: boolean
  order: number
  options?: string[]
}

export interface QuestionTemplate {
  id: number
  name: string
  text: string
  type: QuestionType  // теперь числовой enum
  options?: string[]
}

export interface CreateQuestionTemplateDto {
  name: string
  text: string
  type: QuestionType
  options?: string[]
}

export interface MatrixItem {
  id: number
  evaluatorId: number
  evaluatorName: string
  targetId: number
  targetName: string
  role: AssessmentRole
  token: string
  completed: boolean
}

export interface PublicSurvey {
  surveyId: number
  surveyTitle: string
  targetName: string
  role: AssessmentRole
  questions: PublicQuestion[]
}

export interface PublicQuestion {
  id: number
  text: string
  type: QuestionType
  required: boolean
  options?: string[]
}

export interface AnswerSubmit {
  questionId: number
  textAnswer?: string
  selectedOption?: string
}

export interface UpdateQuestionTemplateDto {
  name: string
  text: string
  type: QuestionType
  options?: string[]
}