import { useMemo, useRef, useState, type ChangeEvent, type ComponentProps } from 'react';
import { Images, ImagePlus, LayoutTemplate, Link as LinkIcon, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSiteContent } from '@/hooks/useSiteContent';
import type { SiteContent } from '@/contexts/site-content';
import { SlideBanner } from '@/components/home/SlideBanner';
import { normalizeSlideImage, SLIDE_BANNER_GUIDE, SLIDE_BANNER_HEIGHT, SLIDE_BANNER_WIDTH } from '@/lib/slide-banner';
import { toast } from 'sonner';

type SlideFormState = {
  id: string | null;
  imageUrl: string;
  title: string;
  description: string;
  ctaLabel: string;
  linkUrl: string;
  order: number;
  active: boolean;
};

const defaultFormState: SlideFormState = {
  id: null,
  imageUrl: '',
  title: '',
  description: '',
  ctaLabel: '',
  linkUrl: '',
  order: 0,
  active: true,
};

function resolveSlideImageUrl(imageUrl: string) {
  const value = imageUrl.trim();
  if (!value) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  if (value.startsWith('/')) return new URL(value, window.location.origin).toString();
  return new URL(`/${value}`, window.location.origin).toString();
}

export default function AdminSlidesPage() {
  const { content, setContent } = useSiteContent();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SlideFormState>(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const slides = useMemo(
    () => [...content.slides].sort((a, b) => a.order - b.order),
    [content.slides]
  );
  const activeSlides = slides.filter((slide) => slide.active);

  const previewImageUrl = resolveSlideImageUrl(form.imageUrl);

  const openAddModal = () => {
    setForm({
      ...defaultFormState,
      order: slides.length,
    });
    setModalOpen(true);
  };

  const openEditModal = (id: string) => {
    const slide = slides.find((item) => item.id === id);
    if (!slide) return;

    setForm({
      id: slide.id,
      imageUrl: slide.imageUrl,
      title: slide.title,
      description: slide.description,
      ctaLabel: slide.ctaLabel,
      linkUrl: slide.linkUrl,
      order: slide.order,
      active: slide.active,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(defaultFormState);
    setSubmitting(false);
  };

  const updateSlides = (nextSlides: SiteContent['slides']) => {
    setContent({
      ...content,
      slides: nextSlides,
    });
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const optimized = await normalizeSlideImage(file);
      setForm((current) => ({
        ...current,
        imageUrl: optimized,
      }));
      toast.success(`Image resized to ${SLIDE_BANNER_WIDTH}×${SLIDE_BANNER_HEIGHT} for all devices.`);
    } catch {
      toast.error('Could not process that image. Try another file.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = (event) => {
    event.preventDefault();
    if (!form.imageUrl.trim() || !form.title.trim()) {
      toast.error('Please add a slide image and title.');
      return;
    }

    setSubmitting(true);
    const nextSlide = {
      id: form.id ?? `slide-${Date.now()}`,
      imageUrl: form.imageUrl.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      ctaLabel: form.ctaLabel.trim(),
      linkUrl: form.linkUrl.trim(),
      order: Number.isFinite(form.order) ? form.order : slides.length,
      active: form.active,
    };
    const nextSlides = form.id
      ? content.slides.map((slide) => (slide.id === form.id ? nextSlide : slide))
      : [...content.slides, nextSlide];

    updateSlides(nextSlides);
    toast.success(form.id ? 'Slide updated' : 'Slide added');
    closeModal();
  };

  const handleDelete = (id: string) => {
    updateSlides(content.slides.filter((slide) => slide.id !== id));
    toast.success('Slide removed');
  };

  const handleToggle = (id: string) => {
    updateSlides(content.slides.map((slide) => (
      slide.id === id ? { ...slide, active: !slide.active } : slide
    )));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Slide Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage homepage slides and promo banners from one place.
          </p>
        </div>
        <Button className="bg-[#f26522] hover:bg-[#d94e0f]" onClick={openAddModal}>
          <ImagePlus className="h-4 w-4" />
          Add Slide
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Images className="h-4 w-4 text-[#f26522]" />
              Active Slides
            </CardTitle>
            <CardDescription>Live homepage slides currently in rotation.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeSlides.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutTemplate className="h-4 w-4 text-[#f26522]" />
              Draft Slides
            </CardTitle>
            <CardDescription>Slides saved for later before publishing.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{slides.length - activeSlides.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription>Website slider and admin slide manager now use the same data.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload any image — we crop and resize it to {SLIDE_BANNER_WIDTH}×{SLIDE_BANNER_HEIGHT}px so it fills the banner on mobile and desktop with no empty bars.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Website Slides</CardTitle>
          <CardDescription>These are the same slider images currently shown on the website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {slides.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center">
              <p className="text-sm text-muted-foreground">No slides added yet. Click `Add Slide` to create your first homepage banner.</p>
            </div>
          )}
          {slides.map((slide) => (
            <div key={slide.id} className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/70 p-4 md:flex-row md:items-center">
              <div className="relative w-full md:w-80">
                <SlideBanner
                  src={resolveSlideImageUrl(slide.imageUrl)}
                  alt={slide.title || 'Slide image'}
                  variant="desktop-preview"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-sm font-semibold text-white">{slide.title}</p>
                  {slide.ctaLabel && (
                    <span className="mt-2 inline-flex rounded-full bg-[#f26522] px-3 py-1 text-xs font-semibold text-white">
                      {slide.ctaLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{slide.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${slide.active ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200'}`}>
                    {slide.active ? 'Active' : 'Draft'}
                  </span>
                </div>
                {slide.description && <p className="text-sm text-muted-foreground">{slide.description}</p>}
                {slide.ctaLabel && (
                  <p className="text-xs font-medium text-[#f26522]">
                    CTA Button: {slide.ctaLabel}
                  </p>
                )}
                {slide.linkUrl && (
                  <p className="flex items-center gap-2 break-all text-xs text-[#3b82f6]">
                    <LinkIcon className="h-3.5 w-3.5" />
                    {slide.linkUrl}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                <button
                  type="button"
                  onClick={() => handleToggle(slide.id)}
                  className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${slide.active ? 'bg-[#22c55e]' : 'bg-slate-300 dark:bg-slate-700'}`}
                  aria-label={slide.active ? 'Deactivate slide' : 'Activate slide'}
                >
                  <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${slide.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(slide.id)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(slide.id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="absolute inset-0" onClick={closeModal} />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#1f2937] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">{form.id ? 'Edit Slider' : 'Add New Slider'}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close add slide modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-5 py-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Slider Image *</label>
                <p className="text-xs leading-relaxed text-slate-400">{SLIDE_BANNER_GUIDE}</p>
                <Input
                  value={form.imageUrl}
                  onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="Paste image URL or upload below..."
                  className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-400"
                />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 bg-slate-800/70 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Optimizing image…' : 'Upload image (auto-resize for all devices)'}
                </button>
                {previewImageUrl && (
                  <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className="text-xs font-medium text-slate-300">Preview — how it will look on the site</p>
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Mobile</p>
                      <SlideBanner src={previewImageUrl} alt="Mobile slide preview" variant="mobile-preview" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Desktop</p>
                      <SlideBanner src={previewImageUrl} alt="Desktop slide preview" variant="desktop-preview" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Title *</label>
                <Input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="e.g. Summer Coffee Collection"
                  className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Optional tagline shown on the slide"
                  className="min-h-[96px] border-slate-600 bg-slate-700 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">CTA Button Text</label>
                <Input
                  value={form.ctaLabel}
                  onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))}
                  placeholder="e.g. Shop Now"
                  className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Link URL</label>
                <Input
                  value={form.linkUrl}
                  onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))}
                  placeholder="/marketplace, /support, #catalog, or https://..."
                  className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-slate-200">Display Order</label>
                  <Input
                    type="number"
                    value={form.order}
                    onChange={(event) => setForm((current) => ({ ...current, order: Number(event.target.value) }))}
                    className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-400"
                  />
                </div>

                <label className="flex items-center gap-3 pt-6 text-sm text-slate-200">
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, active: !current.active }))}
                    className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-[#22c55e]' : 'bg-slate-500'}`}
                    aria-label={form.active ? 'Disable slide' : 'Enable slide'}
                  >
                    <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-700" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#9333ea] hover:bg-[#7e22ce]" loading={submitting}>
                  <Plus className="h-4 w-4" />
                  {form.id ? 'Save Changes' : 'Create Slider'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
