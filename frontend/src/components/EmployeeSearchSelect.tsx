import { useState } from 'react'
import Select from 'react-select'
import { reactSelectStyles } from '../styles/reactSelectStyles'

export interface EmployeeOption {
  value: number
  label: string
}

export const employeeFilter = (option: { label: string }, input: string) => {
  const query = input.trim().toLocaleLowerCase()
  return query.length < 3 || option.label.toLocaleLowerCase().includes(query)
}

export const employeeNoOptions = (input: string) =>
  input.trim().length < 3 ? 'Список сотрудников пуст' : 'Сотрудник не найден'

interface Props {
  options: EmployeeOption[]
  value: number
  onChange: (id: number) => void
}

export default function EmployeeSearchSelect({ options, value, onChange }: Props) {
  const [input, setInput] = useState('')

  return (
    <Select<EmployeeOption>
      className="min-w-0 flex-1"
      options={options}
      value={options.find(option => option.value === value) ?? null}
      onChange={option => {
        onChange(option?.value ?? -1)
        setInput('')
      }}
      inputValue={input}
      onInputChange={(next, action) => {
        if (action.action === 'input-change') setInput(next)
      }}
      filterOption={employeeFilter}
      noOptionsMessage={({ inputValue }) => employeeNoOptions(inputValue)}
      placeholder="Выберите сотрудника или введите имя либо почту"
      isClearable
      styles={reactSelectStyles}
      menuPortalTarget={document.body}
      menuPosition="fixed"
    />
  )
}
