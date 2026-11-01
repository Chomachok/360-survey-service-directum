import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  LayoutDashboard,
  ListChecks,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Users,
} from 'lucide-react'

const pages = [
  { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard, section: 'Администрирование' },
  { id: 'survey-new', label: 'Создание опроса', icon: Plus, section: 'Администрирование' },
  { id: 'survey-edit', label: 'Карточка опроса', icon: FileText, section: 'Администрирование' },
  { id: 'questions', label: 'Вопросы опроса', icon: ListChecks, section: 'Администрирование' },
  { id: 'matrix', label: 'Матрица участников', icon: Users, section: 'Администрирование' },
  { id: 'results', label: 'Результаты', icon: BarChart3, section: 'Администрирование' },
  { id: 'question-templates', label: 'Шаблоны вопросов', icon: ListChecks, section: 'Шаблоны' },
  { id: 'survey-templates', label: 'Шаблоны опросов', icon: FileText, section: 'Шаблоны' },
  { id: 'respondent-templates', label: 'Шаблоны респондентов', icon: Users, section: 'Шаблоны' },
  { id: 'employees', label: 'Список сотрудников', icon: Users, section: 'Сотрудники' },
  { id: 'employee-new', label: 'Добавление сотрудника', icon: Plus, section: 'Сотрудники' },
  { id: 'employee-edit', label: 'Редактирование карточки', icon: Pencil, section: 'Сотрудники' },
  { id: 'employee-delete', label: 'Подтверждение удаления', icon: Trash2, section: 'Сотрудники' },
  { id: 'employee-import', label: 'Импорт CSV', icon: Upload, section: 'Сотрудники' },
  { id: 'user', label: 'Кабинет пользователя', icon: UserRound, section: 'Участник опроса' },
  { id: 'public-survey', label: 'Заполнение опроса', icon: CheckCircle2, section: 'Участник опроса' },
]

const employees = [
  { id: 1, name: 'Иванов Иван Иванович', email: 'ivanov@example.com' },
  { id: 2, name: 'Петрова Анна Сергеевна', email: 'petrova@example.com' },
  { id: 3, name: 'Смирнов Алексей Дмитриевич', email: 'smirnov@example.com' },
]

const surveys = [
  { title: 'Обратная связь 360° — команда разработки', status: 'Активен', period: '1–30 ноября 2026' },
  { title: 'Оценка взаимодействия в команде', status: 'Черновик', period: '15 ноября — 15 декабря 2026' },
  { title: 'Адаптация новых сотрудников', status: 'Завершён', period: '1–31 октября 2026' },
]

function ScreenHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-6">
      <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-directum-orange dark:border-orange-900/50 dark:bg-orange-950/30">
        <Eye size={14} /> {eyebrow}
      </span>
      <h1 className="text-2xl font-bold text-directum-dark dark:text-white sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="card !p-5"><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="mt-2 text-3xl font-bold text-directum-dark dark:text-white">{value}</p><p className="mt-1 text-xs text-directum-orange">{detail}</p></div>
}

function EmployeesTable({ mode = 'list' }: { mode?: 'list' | 'delete' }) {
  return (
    <div className="card overflow-hidden !p-0">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
        <div><h2 className="font-semibold text-directum-dark dark:text-white">Сотрудники</h2><p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Пример данных · 3 записи</p></div>
        {mode === 'list' && <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-directum-orange dark:bg-orange-950/40"><Plus size={16} /> Добавить</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-900/60 dark:text-gray-400"><tr><th className="px-5 py-3">ФИО</th><th className="px-5 py-3">Email</th><th className="px-5 py-3 text-right">Действия</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {employees.map((employee) => <tr key={employee.id} className="hover:bg-orange-50/50 dark:hover:bg-gray-700/40"><td className="px-5 py-4 font-medium text-directum-dark dark:text-gray-100">{employee.name}</td><td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300"><span className="inline-flex items-center gap-2"><Mail size={15} className="text-gray-400" />{employee.email}</span></td><td className="px-5 py-4 text-right"><span className="inline-flex items-center gap-2 text-xs text-gray-400"><Pencil size={14} /> Редактировать <Trash2 size={14} /> Удалить</span></td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">Демо-данные. Изменения отключены.</p>
    </div>
  )
}

function PreviewFields({ employee = false }: { employee?: boolean }) {
  return (
    <div className="card max-w-3xl space-y-5">
      <div><label className="label-field">{employee ? 'ФИО сотрудника' : 'Название опроса'} *</label><div className="input-field">{employee ? employees[0].name : surveys[0].title}</div></div>
      {employee ? <div><label className="label-field">Email *</label><div className="input-field">{employees[0].email}</div></div> : <>
        <div><label className="label-field">Описание</label><div className="input-field min-h-20">Оценка взаимодействия и рабочих практик команды</div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="label-field">Дата начала *</label><div className="input-field">01.11.2026</div></div><div><label className="label-field">Дата окончания *</label><div className="input-field">30.11.2026</div></div></div>
      </>}
      <button type="button" disabled className="btn-primary w-full opacity-60">{employee ? 'Сохранить карточку' : 'Создать опрос'} · демо</button>
    </div>
  )
}

function SurveyList() {
  return <div className="card overflow-hidden !p-0"><div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700"><h2 className="font-semibold text-directum-dark dark:text-white">Опросы</h2></div><div className="divide-y divide-gray-100 dark:divide-gray-700">{surveys.map((survey) => <div key={survey.title} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-directum-dark dark:text-white">{survey.title}</p><p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><CalendarDays size={13} />{survey.period}</p></div><span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-directum-orange dark:bg-orange-950/40">{survey.status}</span></div>)}</div></div>
}

function ScreenContent({ screen }: { screen: string }) {
  switch (screen) {
    case 'employees': return <EmployeesTable />
    case 'employee-new': return <PreviewFields employee />
    case 'employee-edit': return <PreviewFields employee />
    case 'employee-delete': return <div className="card max-w-xl text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40"><Trash2 /></div><h2 className="text-xl font-bold text-directum-dark dark:text-white">Удалить сотрудника?</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{employees[0].name} · {employees[0].email}</p><div className="mt-5 flex justify-center gap-3"><button disabled className="btn-secondary opacity-60">Отмена</button><button disabled className="rounded-lg bg-red-600 px-4 py-2 text-white opacity-60">Удалить · демо</button></div></div>
    case 'employee-import': return <div className="card max-w-3xl"><div className="mb-4 flex items-center gap-3"><Upload className="text-directum-orange" /><div><h2 className="font-semibold text-directum-dark dark:text-white">Импорт сотрудников</h2><p className="text-sm text-gray-500 dark:text-gray-400">CSV · заголовки FullName и Email</p></div></div><div className="rounded-xl border-2 border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">Перетащите CSV-файл сюда или выберите его</div><button disabled className="btn-primary mt-4 w-full opacity-60">Импортировать · демо</button></div>
    case 'survey-new': return <PreviewFields />
    case 'survey-edit': return <PreviewFields />
    case 'questions': return <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="card"><h2 className="mb-4 font-semibold text-directum-dark dark:text-white">Добавить вопрос</h2><div className="space-y-4"><div><label className="label-field">Текст вопроса</label><div className="input-field">Как вы оцениваете взаимодействие в команде?</div></div><div><label className="label-field">Тип ответа</label><div className="input-field">Текстовый ответ</div></div><button disabled className="btn-primary w-full opacity-60">Добавить вопрос · демо</button></div></div><div className="card"><h2 className="mb-4 font-semibold text-directum-dark dark:text-white">Вопросы опроса</h2>{['Как вы оцениваете взаимодействие в команде?', 'Что помогает вам достигать результата?', 'Что можно улучшить в совместной работе?'].map((q, i) => <div key={q} className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"><span className="mr-2 text-xs text-gray-400">#{i + 1}</span><span className="text-sm text-directum-dark dark:text-gray-200">{q}</span></div>)}</div></div>
    case 'matrix': return <div className="card overflow-x-auto"><h2 className="mb-4 font-semibold text-directum-dark dark:text-white">Матрица участников</h2><table className="w-full min-w-[560px] text-sm"><thead><tr><th className="p-3 text-left text-gray-500">Оценивающий</th>{employees.map((employee) => <th key={employee.id} className="p-3 text-center text-gray-500">{employee.name.split(' ')[0]}</th>)}</tr></thead><tbody>{employees.map((employee, i) => <tr key={employee.id} className="border-t border-gray-100 dark:border-gray-700"><td className="p-3 font-medium text-directum-dark dark:text-white">{employee.name}</td>{employees.map((target, j) => <td key={target.id} className="p-3 text-center">{i === j ? <span className="text-gray-300">—</span> : <CheckCircle2 size={17} className="mx-auto text-green-500" />}</td>)}</tr>)}</tbody></table><p className="mt-4 text-xs text-gray-500">Демо-матрица. Изменения отключены.</p></div>
    case 'results': return <div className="grid gap-5 lg:grid-cols-3"><MetricCard label="Ответов получено" value="24 / 30" detail="80% завершено" /><MetricCard label="Средняя оценка" value="4,2" detail="из 5 баллов" /><MetricCard label="Участников" value="12" detail="в текущем опросе" /><div className="card lg:col-span-3"><h2 className="mb-4 font-semibold text-directum-dark dark:text-white">Сводные результаты</h2>{['Командное взаимодействие', 'Инициативность', 'Коммуникация'].map((label, index) => <div key={label} className="mb-4"><div className="mb-1 flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">{label}</span><span className="font-medium text-directum-dark dark:text-white">{[4.4, 3.9, 4.3][index]}</span></div><div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-2 rounded-full bg-directum-orange" style={{ width: `${[88, 78, 86][index]}%` }} /></div></div>)}</div></div>
    case 'question-templates':
    case 'survey-templates':
    case 'respondent-templates': return <div className="grid gap-4 md:grid-cols-2">{['Базовый шаблон 360°', 'Командная обратная связь', 'Оценка компетенций'].map((name, i) => <div key={name} className="card"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-directum-orange dark:bg-orange-950/40"><ListChecks size={20} /></div><h2 className="font-semibold text-directum-dark dark:text-white">{name}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Шаблон для создания и настройки обратной связи.</p><p className="mt-4 text-xs text-gray-400">{i + 6} элементов · пример</p></div>)}</div>
    case 'user': return <div className="space-y-5"><div className="card flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-directum-orange dark:bg-orange-950/40"><UserRound size={26} /></div><div><p className="text-sm text-gray-500 dark:text-gray-400">Добро пожаловать</p><h2 className="text-xl font-bold text-directum-dark dark:text-white">Иван Иванов</h2></div></div><div className="grid gap-4 md:grid-cols-2">{surveys.slice(0, 2).map((survey, i) => <div key={survey.title} className="card"><div className="mb-3 flex items-center justify-between"><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-directum-orange dark:bg-orange-950/40">{i === 0 ? 'Ожидает ответа' : 'В процессе'}</span><Clock3 size={17} className="text-gray-400" /></div><h3 className="font-semibold text-directum-dark dark:text-white">{survey.title}</h3><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Срок до 30 ноября 2026</p><button disabled className="btn-primary mt-4 opacity-60">Открыть опрос · демо</button></div>)}</div></div>
    case 'public-survey': return <div className="card max-w-3xl"><div className="mb-5"><p className="text-sm font-medium text-directum-orange">Опрос 360°</p><h2 className="mt-1 text-xl font-bold text-directum-dark dark:text-white">Обратная связь о совместной работе</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Ваши ответы конфиденциальны.</p></div>{['Как вы оцениваете коммуникацию?', 'Насколько комфортно работать вместе?'].map((q, i) => <div key={q} className="mb-5"><label className="label-field">{i + 1}. {q}</label><div className="input-field min-h-20 text-gray-400">Введите ответ…</div></div>)}<button disabled className="btn-primary opacity-60">Отправить ответы · демо</button></div>
    default: return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Всего опросов" value="12" detail="3 активных" /><MetricCard label="Сотрудники" value="48" detail="в справочнике" /><MetricCard label="Ответы" value="86%" detail="за текущий период" /><MetricCard label="Ожидают" value="7" detail="незавершённых ответов" /></div><div className="mt-5"><SurveyList /></div></>
  }
}

export default function EmployeesPreview() {
  const { screen = 'dashboard' } = useParams()
  const activePage = pages.find((page) => page.id === screen) ?? pages[0]
  const sections = [...new Set(pages.map((page) => page.section))]

  return (
    <div className="min-h-screen bg-gray-50 text-directum-dark dark:bg-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <Link to="/preview/dashboard" className="flex items-center gap-3 font-semibold text-directum-dark dark:text-white"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-directum-orange text-white"><Users size={19} /></span><span>Directum360 <span className="font-normal text-gray-400">· предпросмотр</span></span></Link>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-directum-orange dark:text-gray-300"><ArrowLeft size={16} /> Ко входу</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:sticky lg:top-20">
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><ShieldCheck size={15} className="mb-1" /> Демо-режим<br />Все данные примеры, действия отключены.</div>
          <nav className="max-h-[55vh] space-y-4 overflow-y-auto lg:max-h-[calc(100vh-210px)]" aria-label="Страницы предпросмотра">
            {sections.map((section) => <div key={section}><p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{section}</p><div className="space-y-0.5">{pages.filter((page) => page.section === section).map((page) => { const Icon = page.icon; const active = page.id === activePage.id; return <Link key={page.id} to={`/preview/${page.id}`} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-directum-orange text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}><Icon size={16} /><span>{page.label}</span></Link> })}</div></div>)}
          </nav>
        </aside>

        <main className="min-w-0">
          <ScreenHeading eyebrow="Демонстрационный просмотр" title={activePage.label} description="Макет страницы в стиле приложения. Для работы с реальными данными войдите в систему." />
          <ScreenContent screen={activePage.id} />
          <p className="mt-5 text-center text-xs text-gray-400">Предпросмотр не отправляет запросы и не изменяет данные.</p>
        </main>
      </div>
    </div>
  )
}
