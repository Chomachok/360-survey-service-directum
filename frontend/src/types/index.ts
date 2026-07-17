// src/types/index.ts

export enum SurveyStatus {
  Draft = 'Draft',
  Active = 'Active',
  Completed = 'Completed',
}

export enum QuestionType {
  Text = 'Text',
  SingleChoice = 'SingleChoice',
}

// AssessmentRole удалён, так как роли больше нет

export interface Survey {
  id: number
  title: string
  description?: string
  status: SurveyStatus
  startDate: string
  endDate: string
  authorId: number
  authorName: string
  targetId?: number
}

export interface CreateSurveyDto {
  title: string
  description?: string
  startDate: string
  endDate: string
  authorId: number
  templateId?: number
}

export interface UpdateSurveyDto {
  title: string
  description?: string
  startDate: string
  endDate: string
  targetId?: number
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

export interface UpdateQuestionDto {
  text: string
  type: QuestionType
  required: boolean
  options?: string[]
}

export interface UpdateQuestionOrderDto {
  id: number
  order: number
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
  token: string
  completed: boolean
}

export interface CreateMatrixItemDto {
  evaluatorId: number
  targetId: number
}

export interface PublicSurvey {
  surveyId: number
  surveyTitle: string
  targetName: string
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

export interface ResultDto {
  surveyId: number
  surveyTitle: string
  results: EmployeeResultDto[]
}

export interface EmployeeResultDto {
  employeeId: number
  employeeName: string
  evaluators: EvaluatorResultDto[]
}

export interface EvaluatorResultDto {
  evaluatorId: number
  evaluatorName: string
  answers: QuestionAnswerDto[]
}

export interface QuestionAnswerDto {
  questionText: string
  answerText?: string
  selectedOption?: string
}

export interface Employee {
  id: number
  fullName: string
  email: string
}

export interface EmployeeDto {
  id: number
  fullName: string
  email: string
}

export interface CreateEmployeeDto {
  fullName: string
  email: string
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

export interface RespondentTemplate {
  id: number
  name: string
  description?: string
  items: RespondentTemplateItem[]
  /** Оцениваемые, «зашитые» в шаблон. Пусто — шаблон универсальный (оцениваемый выбирается вручную). */
  targets: RespondentTemplateTarget[]
  /** Явные связи «кто кого оценивает». Пусто — каждый из items оценивает каждого из targets. */
  links: RespondentTemplateLinkDto[]
}

export interface RespondentTemplateLinkDto {
  evaluatorEmployeeId: number
  targetEmployeeId: number
}

export interface RespondentTemplateItem {
  id: number
  employeeId?: number
  employeeName?: string
}

export interface RespondentTemplateTarget {
  id: number
  employeeId: number
  employeeName: string
}

export interface CreateRespondentTemplateDto {
  name: string
  description?: string
  items: CreateRespondentTemplateItemDto[]
  targetEmployeeIds: number[]
  links: RespondentTemplateLinkDto[]
}

export interface CreateRespondentTemplateItemDto {
  employeeId: number
}

export interface UpdateRespondentTemplateDto {
  name: string
  description?: string
  items: CreateRespondentTemplateItemDto[]
  targetEmployeeIds: number[]
  links: RespondentTemplateLinkDto[]
}

export interface ApplyRespondentTemplateResult {
  created: number
  skipped: number
  items: MatrixItem[]
}

export interface UserSurvey {
  surveyId: number
  surveyTitle: string
  targetName: string
  token: string
  completed: boolean
}

// src/types/index.ts
export interface CreateTemplateQuestionDto {
  text: string
  type: QuestionType
  required: boolean
  order: number
  options?: string[]
  tempId?: string // для временных ключей React
}