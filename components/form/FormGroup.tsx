import { ReactNode } from 'react';

export default function FormGroup({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <fieldset className="border-[1px] rounded-2xl border-gray-300 pb-6 pt-1 lg:px-4 mx-auto my-6">
        <legend className="ml-1.5 px-1.5">{name}</legend>

        {children}
      </fieldset>
    </>
  );
}
