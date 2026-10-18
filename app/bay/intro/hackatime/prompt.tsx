'use client';

import Image from 'next/image';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

// Hackatime Setup Page Prompt
// The main client-side modal that checks for account & heartbeat status
//
// slackId: The slack id of the user to check hackatime
export default function Prompt({ slackId }: { slackId: string }) {
  const [accountStatus, setAccountStatus] = useState(false);
  const [heartbeatStatus, setHeartbeatStatus] = useState(false);

  function recheck() {
    fetch(`/api/intro/hackatime?q=${slackId}`)
      .then((d) => d.json())
      .then((d) => setAccountStatus(d['exists']));

    fetch(`/api/intro/hackatime_heartbeat?q=${slackId}`)
      .then((d) => d.json())
      .then((d) => setHeartbeatStatus(d['exists']));

    if (!accountStatus || !heartbeatStatus) setTimeout(recheck, 5000);
  }

  useEffect(recheck, []);

  function next() {
    redirect('/bay/login/success');
  }

  return (
    <>
      <div className="text-dark-brown bg-sand/60 border border-sand p-6 rounded-md w-full max-w-4xl backdrop-blur-md mb-2">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">Create a Hackatime Account</h1>
        Hackatime is an important part of the Shipwrecked experience. Its the platform you&apos;ll
        use to log and track your coding hours throughout the event, helping you stay focused and
        giving the organizers insight into your progress. <br /> <br />
        To get started, click the button below, which will take you to the Hackatime landing page.
        There, you&apos;ll log in using <b>your Slack account</b> to ensure everything stays
        connected. Once you&apos;ve logged in, you&apos;ll see a button labeled{' '}
        <b>&quot;Set up Hackatime! Click me.&quot;</b> — go ahead and click that to complete your
        setup. After you’ve finished setting things up, return to this page. <br /> <br />
        If we can&apos;t find your hackatime account, don’t worry — simply click the refresh button,
        and we’ll check again. If that still doesn&apos;t work, make sure you logged in the{' '}
        <b>correct</b> slack account.
        <br /> <br />
        {/* Status Check */}
        <div className="flex justify-center">
          <div>
            <h2 className="text-center font-semibold text-2xl mr-2">
              <img src={`/mark-${accountStatus ? 'check' : 'cross'}.svg`} className="w-10 inline" />{' '}
              {!accountStatus ? 'No' : ''} Hackatime Account Found!
            </h2>
            <h2 className="text-center font-semibold text-2xl mr-2">
              <img
                src={`/mark-${heartbeatStatus ? 'check' : 'cross'}.svg`}
                className="w-10 inline"
              />{' '}
              {!heartbeatStatus ? 'No' : ''} Heartbeat from Hackatime Account Found!
            </h2>
          </div>

          <button
            className="ml-2 py-2 md:px-4 px-2 uppercase italic bg-dark-blue/60 text-sand border border-sand whitespace-nowrap text-xs md:text-base transition hover:border-yellow backdrop-blur-sm rounded-full cursor-pointer"
            onClick={recheck}
          >
            Check Again
          </button>
        </div>
        {/* Continue */}
        <div className="flex justify-end mt-2">
          <button
            className="py-2 md:px-4 px-2 uppercase disabled:bg-dark-blue/20 bg-dark-blue/60 text-sand border border-sand whitespace-nowrap text-xs md:text-base transition hover:not-disabled:border-yellow backdrop-blur-sm rounded-full cursor-pointer"
            onClick={next}
            disabled={!accountStatus || !heartbeatStatus}
          >
            <span className="flex items-center gap-3 flex-nowrap">
              Next!
              <Image
                src="/back-arrow.png"
                width={24}
                height={24}
                alt="next"
                className="w-8 h-8 -scale-x-100"
              />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
