import Select from 'react-select';
import { useTheme } from '../../context/ThemeContext';

// Tenant-wide searchable dropdown. Wraps react-select with our project styling
// (input-field-ish look, light + dark mode) so callers don't repeat the styles
// prop. Pass `options` as `[{ value, label, ...extras }]`.
//
// Two convenience flags:
//   - `clearable` (default true)
//   - `isDisabled`
//
// onChange returns the option's `value` (string), not the whole option, to match
// the existing <select onChange={(e) => setFoo(e.target.value)}> pattern in the
// pages we're replacing.

const buildStyles = (isDark) => {
  const c = isDark
    ? {
        bg: 'rgb(15 23 42)',           // slate-900
        bgFocus: 'rgb(30 41 59)',      // slate-800
        border: 'rgb(71 85 105)',      // slate-600
        borderFocus: 'rgb(37 99 235)', // brand-500
        text: 'rgb(241 245 249)',      // slate-100
        muted: 'rgb(148 163 184)',     // slate-400
        menuBg: 'rgb(30 41 59)',       // slate-800
        optionHover: 'rgb(51 65 85)',  // slate-700
        optionSelected: 'rgb(37 99 235)',
      }
    : {
        bg: 'white',
        bgFocus: 'white',
        border: 'rgb(226 232 240)',    // slate-200
        borderFocus: 'rgb(37 99 235)',
        text: 'rgb(30 41 59)',         // slate-800
        muted: 'rgb(148 163 184)',
        menuBg: 'white',
        optionHover: 'rgb(239 246 255)', // brand-50
        optionSelected: 'rgb(37 99 235)',
      };

  return {
    control: (base, state) => ({
      ...base,
      minHeight: '42px',
      backgroundColor: c.bg,
      borderColor: state.isFocused ? c.borderFocus : c.border,
      borderWidth: 2,
      borderRadius: 12,
      boxShadow: state.isFocused ? `0 0 0 3px rgba(37,99,235,0.15)` : 'none',
      '&:hover': { borderColor: state.isFocused ? c.borderFocus : c.border },
    }),
    valueContainer: (base) => ({ ...base, paddingLeft: 12, paddingRight: 8 }),
    singleValue: (base) => ({ ...base, color: c.text }),
    placeholder: (base) => ({ ...base, color: c.muted }),
    input: (base) => ({ ...base, color: c.text, margin: 0, padding: 0 }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base) => ({ ...base, color: c.muted, padding: 6 }),
    clearIndicator: (base) => ({ ...base, color: c.muted, padding: 4 }),
    menu: (base) => ({
      ...base,
      backgroundColor: c.menuBg,
      borderRadius: 12,
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
      zIndex: 60,
      overflow: 'hidden',
    }),
    menuList: (base) => ({ ...base, padding: 4 }),
    option: (base, state) => ({
      ...base,
      borderRadius: 8,
      padding: '8px 10px',
      fontSize: 13,
      backgroundColor: state.isSelected
        ? c.optionSelected
        : state.isFocused
          ? c.optionHover
          : 'transparent',
      color: state.isSelected ? 'white' : c.text,
      cursor: 'pointer',
      '&:active': { backgroundColor: state.isSelected ? c.optionSelected : c.optionHover },
    }),
    noOptionsMessage: (base) => ({ ...base, color: c.muted, fontSize: 12 }),
  };
};

export default function Searchable({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  clearable = true,
  isDisabled = false,
  className = '',
  // When the caller cares about the entire option (multi-key forms), they can pass
  // returnObject=true and get the full {value,label,...} back.
  returnObject = false,
  formatOptionLabel,
  noOptionsMessage,
}) {
  const { isDark } = useTheme();
  const styles = buildStyles(isDark);

  const selected = options.find(o => String(o.value) === String(value)) || null;

  return (
    <Select
      classNamePrefix="rs"
      className={className}
      value={selected}
      onChange={(opt) => onChange(opt ? (returnObject ? opt : opt.value) : '')}
      options={options}
      placeholder={placeholder}
      isClearable={clearable}
      isDisabled={isDisabled}
      formatOptionLabel={formatOptionLabel}
      noOptionsMessage={noOptionsMessage || (() => 'No matches')}
      styles={styles}
      // Keep the menu inside scrollable parents (modals) — without this, react-select
      // tries to portal to body which then gets clipped by the modal's overflow.
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
    />
  );
}
