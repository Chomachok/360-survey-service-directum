export enum SurveyStatus {
  Draft = 'Draft',
  Active = 'Active',
  Completed = 'Completed'
}

export enum QuestionType {
  Text = 'Text',
  SingleChoice = 'SingleChoice'
}

export enum AssessmentRole {
  SelfAssessment = 'SelfAssessment',
  Manager = 'Manager',
  Colleague = 'Colleague'
}

// Остальные интерфейсы без изменений
export interface Survey {
  id: number
  title: string
  description?: string
  status: SurveyStatus
  startDate: string
  endDate: string
  authorId: number
  authorName: string
  targetId: number
}

export interface CreateSurveyDto {
  title: string
  description?: string
  startDate: string
  endDate: string
  authorId: number
  targetId?: number,
  templateId?: number
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
  type: QuestionType
  options?: string[]
}

export interface CreateQuestionTemplateDto {
  name: string
  text: string
  type: QuestionType
  options?: string[]
}

export interface UpdateQuestionTemplateDto {
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

export interface UpdateQuestionDto {
  text: string
  type: QuestionType
  required: boolean
  options?: string[]
}

export interface SurveyTemplate {
  id: number
  name: string
  description?: string
  questions: TemplateQuestion[]
}

export interface TemplateQuestion {
  id: number
  text: string
  type: QuestionType
  required: boolean
  order: number
  options?: string[]
}

export interface CreateSurveyTemplateDto {
  name: string
  description?: string
  questions: CreateTemplateQuestionDto[]
}

export interface CreateTemplateQuestionDto {
  text: string
  type: QuestionType
  required: boolean
  order: number
  options?: string[]
}

export interface UpdateSurveyTemplateDto {
  name: string
  description?: string
  questions: CreateTemplateQuestionDto[]
}