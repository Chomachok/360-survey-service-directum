import { StylesConfig } from 'react-select'

export const reactSelectStyles: StylesConfig<any, false> = {
  control: (base, { isDisabled }) => ({
    ...base,
    backgroundColor: isDisabled ? '#f3f4f6' : '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: '0.5rem',
    padding: '0 0.25rem',
    minHeight: '42px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#9ca3af',
    },
    '&:focus-within': {
      borderColor: '#FF8600',
      boxShadow: '0 0 0 3px rgba(255, 134, 0, 0.2)',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#9ca3af',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#1E2128',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.5rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    zIndex: 9999,
  }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    backgroundColor: isSelected ? '#FF8600' : isFocused ? '#FCE3A0' : '#ffffff',
    color: isSelected ? '#ffffff' : '#1E2128',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#FF8600',
      color: '#ffffff',
    },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base, { isDisabled }) => ({
    ...base,
    color: isDisabled ? '#9ca3af' : '#6b7280',
    '&:hover': {
      color: '#FF8600',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: '#6b7280',
    '&:hover': {
      color: '#ef4444',
    },
  }),
}