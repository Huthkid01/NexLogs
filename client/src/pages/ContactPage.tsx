import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSiteContent } from '@/hooks/useSiteContent';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

type Form = z.infer<typeof schema>;

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const { content } = useSiteContent();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success(content.contact.successMessage);
    reset();
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <h1 className="text-3xl font-bold mb-8 text-center">{content.contact.title}</h1>
      <Card>
        <CardHeader><CardTitle>{content.contact.cardTitle}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div><Label>Name</Label><Input error={errors.name?.message} {...register('name')} /></div>
            <div><Label>Email</Label><Input type="email" error={errors.email?.message} {...register('email')} /></div>
            <div><Label>Subject</Label><Input error={errors.subject?.message} {...register('subject')} /></div>
            <div><Label>Message</Label><Textarea rows={5} error={errors.message?.message} {...register('message')} /></div>
            <Button type="submit" className="w-full" loading={loading}>Send Message</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
