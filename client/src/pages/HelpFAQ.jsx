import { useState } from 'react';

const FAQ = [
  {
    q: 'How do I deposit funds?',
    a: 'Go to your wallet page and click "Fund Wallet". Choose your payment method (card, USSD, bank transfer, or mobile money), enter the amount, and complete the payment via Paystack. Your wallet will be credited automatically.'
  },
  {
    q: 'How does escrow work?',
    a: 'When you accept a quote with milestones, the first milestone amount is held in platform escrow. The vendor cannot withdraw until you confirm the milestone is complete. After confirmation, the amount minus platform fee is released to the vendor.'
  },
  {
    q: 'How do I withdraw my earnings?',
    a: 'Vendors can request withdrawal from the Withdrawals page. Funds are held while admin reviews (typically 1-3 business days) and transferred to your registered bank account.'
  },
  {
    q: 'What is a dispute?',
    a: 'If you are unhappy with a service, you can raise a dispute on the transaction. An admin will review and resolve in favor of either party.'
  },
  {
    q: 'How do I become a verified vendor?',
    a: 'Register as a vendor. Admin will review your application and verify your business. Verified vendors get a badge and access to premium features.'
  },
  {
    q: 'How do I report a problem?',
    a: 'Use the "Report" button on any business profile or user, or contact support at support@tasknija.com.'
  }
];

export default function HelpFAQ() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div className="help-faq">
      <h1>Help & FAQ</h1>
      <p className="help-intro">Frequently asked questions about using Tasknija.</p>

      <div className="faq-list">
        {FAQ.map((item, i) => (
          <div key={i} className={`faq-item ${openIdx === i ? 'open' : ''}`}>
            <button
              className="faq-question"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              aria-expanded={openIdx === i}
            >
              <span>{item.q}</span>
              <span aria-hidden="true">{openIdx === i ? '\u2212' : '+'}</span>
            </button>
            {openIdx === i && (
              <div className="faq-answer">
                <p>{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <section className="contact-support">
        <h2>Still need help?</h2>
        <p>Email <a href="mailto:support@tasknija.com">support@tasknija.com</a></p>
      </section>
    </div>
  );
}
