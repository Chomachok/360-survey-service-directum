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
  const { data, isFocused, isSelected } = props
  const initial = data.label.trim().charAt(0).toUpperCase()

  return (
    <components.Option {...props} innerProps={{ ...props.innerProps, 'aria-label': data.label }}>
      <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        isFocused || isSelected
          ? 'border-gray-300 bg-white'
          : 'border-gray-200 bg-white'
      }`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-400 text-sm font-semibold text-gray-800">
          {initial}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-gray-800">{data.label}</div>
          {data.email && (
            <a
              className="mt-1 block truncate text-sm text-gray-800 hover:underline"
              href={`mailto:${data.email}`}
              onClick={(event) => event.stopPropagation()}
            >
              {data.email}
            </a>
          )}
        </div>
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
