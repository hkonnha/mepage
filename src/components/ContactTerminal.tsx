import { FormEvent, useRef, useState } from 'react';

export const EMAIL = 'hkonnhaagaas@gmail.com';

const FIELDS = [
  { key: 'name', label: 'name' },
  { key: 'email', label: 'email' },
  { key: 'message', label: 'message' },
] as const;
const CONFIRM = FIELDS.length; // step index of the "send it?" question
const SENT = FIELDS.length + 1;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Values = Record<(typeof FIELDS)[number]['key'], string>;
const EMPTY: Values = { name: '', email: '', message: '' };

/** A contact form that looks like a terminal. It sends via your mail app. */
export default function ContactTerminal() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(EMPTY);
  const [lines, setLines] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(0);
    setValues(EMPTY);
    setLines([]);
    setDraft('');
    setError('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    setError('');

    if (step < FIELDS.length) {
      const field = FIELDS[step];
      if (!value) return setError(`${field.label} can't be empty.`);
      if (field.key === 'email' && !EMAIL_RE.test(value)) {
        return setError('that does not look like an email address.');
      }
      setValues({ ...values, [field.key]: value });
      setLines([...lines, `> ${field.label}: ${value}`]);
      setDraft('');
      setStep(step + 1);
      return;
    }

    if (step === CONFIRM) {
      if (/^y/i.test(value)) {
        const subject = encodeURIComponent(`Hello from ${values.name}`);
        const body = encodeURIComponent(
          `${values.message}\n\n${values.name} <${values.email}>`,
        );
        setLines([
          ...lines,
          '> send it? y',
          'opening your mail app...',
          'press send there to finish. thanks!',
        ]);
        setStep(SENT);
        window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
      } else if (/^n/i.test(value)) {
        setLines([...lines, '> send it? n', 'aborted.']);
        setStep(SENT);
      } else {
        setError('type y or n.');
        return;
      }
      setDraft('');
    }
  };

  const label =
    step < FIELDS.length
      ? FIELDS[step].label
      : step === CONFIRM
        ? 'send it? [y/n]'
        : '';

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-bar">
        <span>CONTACT.EXE</span>
        <span aria-hidden>_ □ ×</span>
      </div>
      <div className="terminal-body">
        <p className="dim">
          PORT TERMINAL V1.00 - type an answer, press ENTER.
        </p>
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {step < SENT ? (
          <form className="terminal-prompt" onSubmit={submit}>
            <label htmlFor="terminal-input">&gt; {label}:</label>
            <input
              id="terminal-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              maxLength={step === 2 ? 600 : 80}
            />
          </form>
        ) : (
          <button type="button" className="terminal-reset" onClick={reset}>
            [ new message ]
          </button>
        )}
        {error && <p className="terminal-error">! {error}</p>}
      </div>
    </div>
  );
}
