import { useState } from 'react'
import Select, { components } from 'react-select'
import type { OptionProps, SingleValue } from 'react-select'
import type { Employee } from '../types'
import { reactSelectStyles } from '../styles/reactSelectStyles'

export interface EmployeeOption {
  value: number
  label: string
  email?: string
}

interface EmployeeSelectProps {
  options: EmployeeOption[]
  value: EmployeeOption | null
  onChange: (option: SingleValue<EmployeeOption>) => void
  placeholder?: string
  isClearable?: boolean
  isSearchable?: boolean
  isDisabled?: boolean
  autoFocus?: boolean
  openMenuOnFocus?: boolean
  compact?: boolean
}

function EmployeeOptionRow(props: OptionProps<EmployeeOption, false>) {
  const [cardOpen, setCardOpen] = useState(false)
  const { data, isFocused, isSelected } = props

  return (
    <components.Option {...props}>
      <div className="group/employee-option">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-expanded={cardOpen}
            className={`text-left ${isSelected ? 'text-white' : 'text-[var(--rs-text)]'}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation()
              setCardOpen((open) => !open)
            }}
          >
            {data.label}
          </button>
        </div>
        {data.email && (
          <div className={`mt-1 hidden rounded-md border px-2.5 py-2 text-xs shadow-sm group-hover/employee-option:block group-focus-within/employee-option:block ${
            isFocused || isSelected
              ? 'border-white/20 bg-black/10 text-white'
              : 'border-gray-200 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
          } ${cardOpen ? '!block' : ''}`}>
            <a className="block text-white hover:underline" href={`mailto:${data.email}`} onClick={(event) => event.stopPropagation()}>
              {data.email}
            </a>
          </div>
        )}
      </div>
    </components.Option>
  )
}

export const toEmployeeOptions = (employees: Employee[] = []): EmployeeOption[] =>
  employees.map((employee) => ({ value: employee.id, label: employee.fullName, email: employee.email }))

export default function EmployeeSelect({ compact = false, ...props }: EmployeeSelectProps) {
  return (
    <Select<EmployeeOption, false>
      {...props}
      components={{ Option: EmployeeOptionRow }}
      styles={compact ? {
        ...reactSelectStyles,
        control: (base) => ({ ...base, minHeight: '32px', fontSize: '13px' }),
      } : reactSelectStyles}
      menuPortalTarget={document.body}
      menuPosition="fixed"
    />
  )
}
