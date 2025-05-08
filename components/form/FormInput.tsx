import { ReactNode, ChangeEvent } from "react";

export type FormSave = {
  errors?: Record<string, string[]>;
  data?: Record<string, any>;
};

export default function FormInput({
  fieldName,
  type,
  placeholder,
  required,
  state,
  disabled,
  children,
  value,
  defaultValue,
  onChange,
}: {
  fieldName: string;
  type?: string;
  placeholder: string;
  required?: boolean;
  state: FormSave;
  disabled?: boolean;
  children: ReactNode;
  value?: string;
  defaultValue?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <div className="md:my-5 my-4 w-full px-3 sm:px-4">
        <label className="md:text-lg text-base font-semibold text-left">
          {children}
          {required && <p className="text-red-500 inline">*</p>}
        </label>

        {/* Error Tooltip */}
        {state.errors && state.errors[fieldName] && (
          <div className="has-tooltip inline">
            <span className="tooltip rounded shadow-lg p-1 bg-gray-100 text-red-500/80 -mt-8 px-2 py-1">
              {state.errors[fieldName][0]}
            </span>
            <img
              src="/icon-error.svg"
              className="w-6 align-top inline ml-0.5"
            ></img>
          </div>
        )}

        <br />

        <input
          className="md:text-base text-sm w-full px-3 sm:px-4 md:py-2 py-1.5 bg-gray-100 disabled:bg-gray-200 rounded outline-1 outline-gray-200"
          placeholder={placeholder}
          type={type ?? "text"}
          name={fieldName}
          required={required}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </>
  );
}
