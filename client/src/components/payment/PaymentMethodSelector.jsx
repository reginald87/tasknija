const CHANNELS = [
  { id: 'card', label: '💳 Card', description: 'Debit/credit card' },
  { id: 'bank', label: '🏦 Bank Transfer', description: 'Transfer from your bank account' },
  { id: 'ussd', label: '📱 USSD', description: 'Dial a USSD code from your phone' },
  { id: 'mobile_money', label: '📲 Mobile Money', description: 'Pay with mobile money wallet' }
];

export default function PaymentMethodSelector({ value, onChange }) {
  return (
    <fieldset className="payment-method-selector">
      <legend>Payment Method</legend>
      {CHANNELS.map(channel => (
        <label key={channel.id} className={`channel-option ${value === channel.id ? 'selected' : ''}`}>
          <input
            type="radio"
            name="payment-channel"
            value={channel.id}
            checked={value === channel.id}
            onChange={() => onChange(channel.id)}
          />
          <span className="channel-label">{channel.label}</span>
          <span className="channel-description">{channel.description}</span>
        </label>
      ))}
    </fieldset>
  );
}
