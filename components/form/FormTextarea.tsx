import { ReactNode } from 'react';

export default function FormTextarea({
  fieldName,
  placeholder,
  required,
  disabled,
  children,
}: {
  fieldName: string;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <div className="my-5 mx-6">
        <label className="text-lg font-semibold text-left">
          {children}
          {required && <p className="text-red-500 inline">*</p>}
        </label>{' '}
        <br />
        <textarea
          className="w-96 px-4 py-2 bg-gray-100 rounded outline-1 outline-gray-200"
          placeholder={placeholder}
          name={fieldName}
          required={required}
          disabled={disabled}
        />
      </div>
    </>
  );
}
