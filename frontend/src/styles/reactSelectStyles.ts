import { StylesConfig } from 'react-select'

/**
 * react-select рисует себя инлайновыми стилями, поэтому классы Tailwind
 * (в т.ч. dark:) на него не действуют — раньше контрол и меню были жёстко белыми
 * и в ночной теме выглядели как белые плашки.
 *
 * Решение: все цвета берём из CSS-переменных, которые объявлены в index.css
 * для светлой темы и переопределены под `.dark`. Инлайновый style с var()
 * резолвится в момент отрисовки, поэтому селект переключается вместе с темой сам,
 * без прокидывания темы пропсами.
 *
 * Меню выносится в портал (menuPortalTarget={document.body}) — переменные объявлены
 * на :root, так что внутри портала они тоже доступны.
 */
export const reactSelectStyles: StylesConfig<any, false> = {
  control: (base, { isDisabled }) => ({
    ...base,
    backgroundColor: isDisabled ? 'var(--rs-bg-disabled)' : 'var(--rs-bg)',
    borderColor: 'var(--rs-border)',
    borderRadius: '0.5rem',
    padding: '0 0.25rem',
    minHeight: '42px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'var(--rs-border-hover)',
    },
    '&:focus-within': {
      borderColor: '#FF8600',
      boxShadow: '0 0 0 3px rgba(255, 134, 0, 0.2)',
    },
  }),
  input: (base) => ({
    ...base,
    color: 'var(--rs-text)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--rs-placeholder)',
  }),
  singleValue: (base, { isDisabled }) => ({
    ...base,
    color: isDisabled ? 'var(--rs-placeholder)' : 'var(--rs-text)',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--rs-menu-bg)',
    border: '1px solid var(--rs-border)',
    borderRadius: '0.5rem',
    boxShadow: 'var(--rs-shadow)',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menuList: (base) => ({
    ...base,
    backgroundColor: 'var(--rs-menu-bg)',
  }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    backgroundColor: isSelected
      ? '#FF8600'
      : isFocused
        ? 'var(--rs-option-hover)'
        : 'var(--rs-menu-bg)',
    color: isSelected ? '#ffffff' : 'var(--rs-text)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#FF8600',
      color: '#ffffff',
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'var(--rs-placeholder)',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base, { isDisabled }) => ({
    ...base,
    color: isDisabled ? 'var(--rs-placeholder)' : 'var(--rs-indicator)',
    '&:hover': {
      color: '#FF8600',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--rs-indicator)',
    '&:hover': {
      color: '#ef4444',
    },
  }),
}
