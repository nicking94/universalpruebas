"use client";
import { InputProps } from "../lib/types/types";

const Input: React.FC<InputProps> = ({
  label,
  colorLabel = "text-gray_m dark:text-white",
  type,
  name,
  value,
  readOnly = false,
  onChange = () => {},
  placeholder,
  border = "border-1 border-gray_xl",
  accept,
  autoFocus = false,
  ref,
}) => {
  return (
    <div className="w-full">
      <label
        className={`${colorLabel} block text-sm font-semibold mb-2`}
        htmlFor={name}
      >
        {label}
      </label>
      <div className="flex gap-2">
        <input
          ref={ref}
          autoFocus={autoFocus}
          type={type}
          name={name}
          value={value}
          onChange={readOnly ? undefined : onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          accept={accept}
          className={` focus:shadow-lg focus:shadow-gray_xl dark:focus:shadow-gray_m w-full bg-white p-2 rounded-sm placeholder:text-gray_l  outline-none text-gray_b ${border} max-h-9`}
        />
      </div>
    </div>
  );
};

export default Input;
