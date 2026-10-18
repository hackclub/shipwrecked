import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import Link from 'next/link';

export default function FaqDisclosure() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Can I participate?',
      answer:
        'Anyone under 18 at the time of the event and who has completed The Bay is allowed to participate! Travel grants will be available to everyone who completes the program. Please contact us for any personalized questions.',
    },
    {
      question: 'Is this free to participate in?',
      answer:
        "Yes! Participation is entirely free—but only if you complete The Bay. Without completing The Bay, you won't be able to join us for Shipwrecked.",
    },
    {
      question: 'My parents want more information.',
      answer: (
        <>
          We are happy to answer any questions your parents may have. Please email:
          shipwrecked@hackclub.com. Also, please refer to the{' '}
          <Link href="/info/for-parents" className="text-blue-600 hover:text-blue-800 underline">
            parent&apos;s guide
          </Link>{' '}
          in our docs.
        </>
      ),
    },
    {
      question: 'Who can I contact for more information?',
      answer:
        'If you have any questions, please email: shipwrecked@hackclub.com or join the #shipwrecked channel on the Hack Club Slack.',
    },
  ];

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="p-4 space-y-4">
      {faqs.map((faq, index) => (
        <div key={index} className="not-last:border-b border-dark-brown">
          <button
            onClick={() => toggle(index)}
            className="w-full text-left text-dark-brown/60 hover:text-dark-brown transition py-2 font-semibold flex justify-between"
          >
            <span>{faq.question}</span>
            <span>{openIndex === index ? '➖' : '➕'}</span>
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                key={index}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden text-dark-brown"
              >
                <p className="py-2 text-sm md:text-base">{faq.answer}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
