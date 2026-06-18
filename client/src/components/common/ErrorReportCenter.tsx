import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultErrorReasons, getErrorReportEventName, getFriendlyErrorMessage, type ErrorReportRequest } from '@/lib/error-report';
import { supportTicketService } from '@/services';
import { toast } from 'sonner';

interface ErrorReportState extends ErrorReportRequest {
  open: boolean;
}

const defaultState: ErrorReportState = {
  open: false,
  title: '',
  message: '',
  source: 'website_error',
  errorMessage: '',
};

export function ErrorReportCenter() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ErrorReportState>(defaultState);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [reasonOptions, setReasonOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const eventName = getErrorReportEventName();
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ErrorReportRequest>).detail;
      setState({
        open: true,
        title: detail.title,
        message: detail.message,
        source: detail.source ?? 'website_error',
        errorMessage: detail.errorMessage ?? '',
      });
      setName(profile?.full_name ?? '');
      setEmail(profile?.email ?? user?.email ?? '');
      setSubject(detail.title);
      const nextReasons = detail.reasonOptions?.length ? detail.reasonOptions : getDefaultErrorReasons(detail.source ?? 'website_error');
      setReasonOptions(nextReasons);
      setReason(nextReasons[0] ?? 'Other');
      setDescription('');
    };

    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [profile?.email, profile?.full_name, user?.email]);

  const close = () => {
    if (submitting) return;
    setState(defaultState);
    setSubject('');
    setDescription('');
    setReason('');
    setReasonOptions([]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !subject.trim() || !reason.trim() || !description.trim()) {
      toast.error('Please fill in your email, reason, and issue details.');
      return;
    }

    setSubmitting(true);
    try {
      await supportTicketService.create({
        user_id: user?.id ?? null,
        name: name.trim() || null,
        email: email.trim(),
        subject: `${subject.trim()} - ${reason.trim()}`,
        description: `Reason: ${reason.trim()}\n\n${description.trim()}`,
        status: 'open',
        source: state.source ?? 'website_error',
        page_url: window.location.href,
        error_message: state.errorMessage?.trim() || null,
        browser_info: navigator.userAgent,
      });
      toast.success('Error report sent. Admin will see it in the dashboard.');
      close();
    } catch {
      toast.error('Failed to send error report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={close} aria-label="Close error report modal" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#7a4205] bg-[#2c1703] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e59c00] text-[#2c1703]">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{state.title}</h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-[#e5d4c2]">
                {getFriendlyErrorMessage(state.source ?? 'website_error')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#7a4205] bg-[#3a2108] text-[#e5d4c2] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-[#e5d4c2]">Name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} className="h-9 border-[#7a4205] bg-[#3a2108] text-sm text-white" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#e5d4c2]">Email</label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} className="h-9 border-[#7a4205] bg-[#3a2108] text-sm text-white" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#e5d4c2]">Subject</label>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} className="h-9 border-[#7a4205] bg-[#3a2108] text-sm text-white" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#e5d4c2]">Reason</label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-9 w-full rounded-md border border-[#7a4205] bg-[#3a2108] px-3 text-sm text-white outline-none"
            >
              {reasonOptions.map((option) => (
                <option key={option} value={option} className="text-white">
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#e5d4c2]">What happened?</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[110px] border-[#7a4205] bg-[#3a2108] text-sm text-white"
              placeholder="Tell us what you clicked and what you expected."
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-9 border-[#7a4205] bg-[#3a2108] text-sm text-white hover:bg-[#4a2a0b]" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" className="h-9 bg-[#f26522] text-sm text-white hover:bg-[#d94e0f]" loading={submitting}>
              Report Error
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
