import { useState } from 'react'
import type { FormEvent } from 'react'
import type { EmployeeInput } from '../api/employees'

interface EmployeeFormProps {
  initialValues?: EmployeeInput
  submitLabel: string
  isSubmitting: boolean
  onSubmit: (values: EmployeeInput) => void
}

export default function EmployeeForm({
  initialValues = { fullName: '', email: '' },
  submitLabel,
  isSubmitting,
  onSubmit,
}: EmployeeFormProps) {
  const [fullName, setFullName] = useState(initialValues.fullName)
  const [email, setEmail] = useState(initialValues.email)
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({})

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    const normalizedName = fullName.trim()
    const normalizedEmail = email.trim()

    if (!normalizedName) nextErrors.fullName = 'Укажите ФИО сотрудника.'
    if (!normalizedEmail) nextErrors.email = 'Укажите email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Введите корректный email, например name@example.com.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) {
      onSubmit({ fullName: normalizedName, email: normalizedEmail })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl space-y-5" noValidate>
      <div>
        <label htmlFor="employee-full-name" className="label-field">ФИО *</label>
        <input
          id="employee-full-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={event => {
            setFullName(event.target.value)
            setErrors(current => ({ ...current, fullName: undefined }))
          }}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? 'employee-full-name-error' : undefined}
          className={`input-field ${errors.fullName ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="Иванов Иван Иванович"
        />
        {errors.fullName && <p id="employee-full-name-error" className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
      </div>

      <div>
        <label htmlFor="employee-email" className="label-field">Email *</label>
        <input
          id="employee-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={event => {
            setEmail(event.target.value)
            setErrors(current => ({ ...current, email: undefined }))
          }}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'employee-email-error' : undefined}
          className={`input-field ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="ivanov@example.com"
        />
        {errors.email && <p id="employee-email-error" className="mt-1 text-sm text-red-500">{errors.email}</p>}
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Сохранение…' : submitLabel}
      </button>
    </form>
  )
}
