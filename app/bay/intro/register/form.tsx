'use client';

import FormGroup from '@/components/form/FormGroup';
import FormInput from '@/components/form/FormInput';
import FormSelect from '@/components/form/FormSelect';
import countries from '@/types/countries';
import { save } from './actions';
import { useActionState, useEffect } from 'react';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { signIn } from 'next-auth/react';

// Client Side Registration Form
//
// If hasSession is true, hide the email/log in with slack option
export default function Form({ hasSession }: { hasSession?: boolean }) {
  const [state, formAction, pending] = useActionState(save, {
    errors: undefined,
    data: undefined,
    valid: false,
  });

  // If the state changes and the data is valid, redirect to the form completion page
  useEffect(() => {
    if (state.valid) redirect('/bay/intro/register/complete');
  }, [state]);

  return (
    <>
      <div className="text-dark-brown bg-sand/60 border border-sand p-6 rounded-md w-full max-w-4xl backdrop-blur-md mb-2">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">Complete your Registration</h1>
        Ahoy! Your registration is almost ready, just complete the form below!
        {/* Hide Email field if user has prev logged in */}
        <form className="flex flex-col justify-center" action={formAction}>
          {!hasSession && (
            <div className="lg:flex justify-center items-center">
              <div className="my-5 mx-6">
                <label className="text-lg font-semibold max-lg:flex justify-center max-lg:mb-2">
                  Email
                  <p className="text-red-500 inline">*</p>
                </label>

                <div className="lg:flex justify-center items-center">
                  <div className="max-lg:flex justify-center">
                    <input
                      name="Email"
                      required
                      className="mr-2 lg:mr-8 w-82 px-4 py-2 bg-gray-100 disabled:bg-gray-200 rounded outline-1 outline-gray-200"
                    />
                  </div>

                  <p className="text-center"> or </p>

                  <div className="max-lg:flex justify-center">
                    <button
                      className="ml-2 lg:ml-8 my-2"
                      onClick={() => signIn('slack', { callbackUrl: '/bay/login/success' })}
                    >
                      <img
                        src="https://platform.slack-edge.com/img/sign_in_with_slack.png"
                        srcSet="https://platform.slack-edge.com/img/sign_in_with_slack.png 1x, https://platform.slack-edge.com/img/sign_in_with_slack@2x.png 2x"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* 
          Form elements are grouped by two when a screen is large, else wrap
        */}
          <FormGroup name="About You">
            <div className="lg:flex justify-center">
              <FormInput fieldName="First Name" state={state} placeholder="Prophet" required>
                First Name
              </FormInput>
              <FormInput fieldName="Last Name" state={state} placeholder="Orpheus" required>
                Last Name
              </FormInput>
            </div>

            <div className="lg:flex justify-center">
              <FormInput
                fieldName="Github Username"
                state={state}
                placeholder="ProphetOrpheusAmazingsGithub"
                required
              >
                Github Username
              </FormInput>
              <FormInput fieldName="Birthday" type="date" state={state} placeholder="" required>
                Birthday
              </FormInput>
            </div>
          </FormGroup>

          <FormGroup name="Address Details">
            <div className="lg:flex justify-center">
              <FormInput
                fieldName="Address (Line 1)"
                state={state}
                placeholder="15 Falls Rd"
                required
              >
                Address (Line 1)
              </FormInput>
              <FormInput fieldName="Address (Line 2)" state={state} placeholder="">
                Address (Line 2)
              </FormInput>
            </div>

            <div className="lg:flex justify-center">
              <FormInput fieldName="State / Province" state={state} placeholder="Vermont" required>
                State / Province
              </FormInput>
              <FormInput fieldName="City" state={state} placeholder="Shelburne" required>
                City
              </FormInput>
            </div>

            <div className="lg:flex justify-center">
              <FormInput fieldName="ZIP / Postal Code" state={state} placeholder="05482" required>
                ZIP / Postal Code
              </FormInput>

              <FormSelect values={countries} fieldName="Country" required>
                Country
              </FormSelect>
            </div>
          </FormGroup>

          <div className="flex justify-end mt-2">
            <button
              className="py-2 md:px-4 px-2 uppercase disabled:bg-dark-blue/20 bg-dark-blue/60 text-sand border border-sand whitespace-nowrap text-xs md:text-base transition hover:not-disabled:border-yellow backdrop-blur-sm rounded-full cursor-pointer"
              disabled={pending}
            >
              <span className="flex items-center gap-1 flex-nowrap">
                Submit
                <Image
                  src="/mark-check.svg"
                  width={12}
                  height={12}
                  alt="next"
                  className="w-8 h-8"
                />
              </span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
