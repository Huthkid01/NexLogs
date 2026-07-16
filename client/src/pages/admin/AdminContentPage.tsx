import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { defaultSiteContent, type SiteContent } from '@/contexts/site-content';
import { useSiteContent } from '@/hooks/useSiteContent';

function cloneContent(content: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(content)) as SiteContent;
}

const sectionMeta = {
  homepage: {
    title: 'Homepage',
    description: 'Control the main labels shown on the homepage and marketplace teaser.',
  },
  footer: {
    title: 'Footer',
    description: 'Edit footer text, side menu Telegram promo, trust items, and social links.',
  },
  about: {
    title: 'About Page',
    description: 'Update the public about page title and story.',
  },
  faq: {
    title: 'FAQ Page',
    description: 'Control the FAQ title and question/answer pairs displayed publicly.',
  },
  support: {
    title: 'Support Page',
    description: 'Manage support channels, tutorials, and the refund policy shortcut button.',
  },
  terms: {
    title: 'Terms & Conditions',
    description: 'Edit the title, contact email, and each legal section shown on the terms page.',
  },
  refund: {
    title: 'Refund Policy',
    description: 'Manage the refund page intro, policy bullets, and support link label.',
  },
} as const;

type ContentSection = keyof typeof sectionMeta;

type AdminContentEditorProps = {
  content: SiteContent;
  currentSection: ContentSection;
  setContent: (next: SiteContent) => void;
  resetContent: () => void;
};

function AdminContentEditor({ content, currentSection, setContent, resetContent }: AdminContentEditorProps) {
  const [draft, setDraft] = useState<SiteContent>(() => cloneContent(content));
  const currentMeta = sectionMeta[currentSection];

  const saveChanges = () => {
    setContent(cloneContent(draft));
    toast.success('Website content updated.');
  };

  const resetChanges = () => {
    resetContent();
    setDraft(cloneContent(defaultSiteContent));
    toast.success('Website content reset to defaults.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Site Content</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentMeta.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={resetChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Defaults
          </Button>
          <Button onClick={saveChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Content
          </Button>
        </div>
      </div>

      {currentSection === 'homepage' && <Card>
        <CardHeader>
          <CardTitle>Home Page</CardTitle>
          <CardDescription>Control the main labels shown on the homepage and marketplace teaser.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="home-subscriptions">Subscriptions Section Title</Label>
            <Input id="home-subscriptions" value={draft.home.subscriptionsTitle} onChange={(e) => setDraft({ ...draft, home: { ...draft.home, subscriptionsTitle: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="home-categories">Categories Label</Label>
            <Input id="home-categories" value={draft.home.categoriesLabel} onChange={(e) => setDraft({ ...draft, home: { ...draft.home, categoriesLabel: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="home-purchase-rdp">Purchase RDP Button</Label>
            <Input id="home-purchase-rdp" value={draft.home.purchaseRdpLabel} onChange={(e) => setDraft({ ...draft, home: { ...draft.home, purchaseRdpLabel: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="home-buy-numbers">SMS Verification Numbers Button</Label>
            <Input id="home-buy-numbers" value={draft.home.buyNumbersLabel} onChange={(e) => setDraft({ ...draft, home: { ...draft.home, buyNumbersLabel: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="home-catalog">Default Product Section Title</Label>
            <Input id="home-catalog" value={draft.home.catalogTitle} onChange={(e) => setDraft({ ...draft, home: { ...draft.home, catalogTitle: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="home-latest">Latest Products Label</Label>
            <Input id="home-latest" value={draft.home.latestProductsLabel} onChange={(e) => setDraft({ ...draft, home: { ...draft.home, latestProductsLabel: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="home-login-prompt">Guest Prompt Button</Label>
            <Input id="home-login-prompt" value={draft.home.loginPromptLabel} onChange={(e) => setDraft({ ...draft, home: { ...draft.home, loginPromptLabel: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="home-browse-all">Browse All Products Label</Label>
            <Input id="home-browse-all" value={draft.home.browseAllProductsLabel} onChange={(e) => setDraft({ ...draft, home: { ...draft.home, browseAllProductsLabel: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="home-empty-title">Empty Catalog Title</Label>
            <Input
              id="home-empty-title"
              value={draft.home.emptyCatalogTitle}
              onChange={(e) => setDraft({ ...draft, home: { ...draft.home, emptyCatalogTitle: e.target.value } })}
            />
          </div>
          <div>
            <Label htmlFor="home-empty-description">Empty Catalog Message</Label>
            <Textarea
              id="home-empty-description"
              value={draft.home.emptyCatalogDescription}
              onChange={(e) => setDraft({ ...draft, home: { ...draft.home, emptyCatalogDescription: e.target.value } })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="home-request-telegram">Telegram Button Label</Label>
              <Input
                id="home-request-telegram"
                value={draft.home.requestOnTelegramLabel}
                onChange={(e) => setDraft({ ...draft, home: { ...draft.home, requestOnTelegramLabel: e.target.value } })}
              />
            </div>
            <div>
              <Label htmlFor="home-request-whatsapp">WhatsApp Button Label</Label>
              <Input
                id="home-request-whatsapp"
                value={draft.home.requestOnWhatsAppLabel}
                onChange={(e) => setDraft({ ...draft, home: { ...draft.home, requestOnWhatsAppLabel: e.target.value } })}
              />
            </div>
          </div>
        </CardContent>
      </Card>}

      {currentSection === 'footer' && <Card>
        <CardHeader>
          <CardTitle>Footer</CardTitle>
          <CardDescription>Edit footer text, side menu Telegram promo, trust items, and social links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="footer-description">Brand Description</Label>
            <Textarea id="footer-description" value={draft.footer.brandDescription} onChange={(e) => setDraft({ ...draft, footer: { ...draft.footer, brandDescription: e.target.value } })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="footer-legal">Legal Heading</Label>
              <Input id="footer-legal" value={draft.footer.legalTitle} onChange={(e) => setDraft({ ...draft, footer: { ...draft.footer, legalTitle: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="footer-connect">Connect Heading</Label>
              <Input id="footer-connect" value={draft.footer.connectTitle} onChange={(e) => setDraft({ ...draft, footer: { ...draft.footer, connectTitle: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="footer-trust">Trust Heading</Label>
              <Input id="footer-trust" value={draft.footer.trustTitle} onChange={(e) => setDraft({ ...draft, footer: { ...draft.footer, trustTitle: e.target.value } })} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {draft.footer.trustItems.map((item, index) => (
              <div key={`trust-${index}`}>
                <Label htmlFor={`trust-item-${index}`}>Trust Item {index + 1}</Label>
                <Input
                  id={`trust-item-${index}`}
                  value={item}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      footer: {
                        ...draft.footer,
                        trustItems: draft.footer.trustItems.map((trustItem, trustIndex) => (
                          trustIndex === index ? e.target.value : trustItem
                        )),
                      },
                    })}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="footer-telegram-title">Side Menu Telegram Title</Label>
              <Input
                id="footer-telegram-title"
                value={draft.footer.telegramPromoTitle}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    footer: { ...draft.footer, telegramPromoTitle: e.target.value },
                  })}
              />
            </div>
            <div>
              <Label htmlFor="footer-telegram-description">Side Menu Telegram Description</Label>
              <Textarea
                id="footer-telegram-description"
                value={draft.footer.telegramPromoDescription}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    footer: { ...draft.footer, telegramPromoDescription: e.target.value },
                  })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="footer-telegram-url">Footer Telegram URL</Label>
              <Input
                id="footer-telegram-url"
                value={draft.footer.socialLinks.find((link) => link.label.toLowerCase() === 'telegram')?.href ?? ''}
                placeholder="https://telegram.me/nexlogs or @nexlogs"
                onChange={(e) => {
                  const whatsapp = draft.footer.socialLinks.find((link) => link.label.toLowerCase() === 'whatsapp');
                  setDraft({
                    ...draft,
                    footer: {
                      ...draft.footer,
                      socialLinks: [
                        { label: 'Telegram', href: e.target.value },
                        ...(whatsapp ? [whatsapp] : [{ label: 'WhatsApp', href: 'https://wa.me/15855938030' }]),
                      ],
                    },
                  });
                }}
              />
            </div>
            <div>
              <Label htmlFor="footer-whatsapp-url">Footer WhatsApp Number / URL</Label>
              <Input
                id="footer-whatsapp-url"
                value={draft.footer.socialLinks.find((link) => link.label.toLowerCase() === 'whatsapp')?.href ?? ''}
                placeholder="+15855938030 or https://wa.me/15855938030"
                onChange={(e) => {
                  const telegram = draft.footer.socialLinks.find((link) => link.label.toLowerCase() === 'telegram');
                  setDraft({
                    ...draft,
                    footer: {
                      ...draft.footer,
                      socialLinks: [
                        ...(telegram ? [telegram] : [{ label: 'Telegram', href: 'https://telegram.me/nexlogs' }]),
                        { label: 'WhatsApp', href: e.target.value },
                      ],
                    },
                  });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>}

      {currentSection === 'about' && <Card>
        <CardHeader>
          <CardTitle>About Page</CardTitle>
          <CardDescription>Update the public about page title and story.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="about-title">Page Title</Label>
            <Input id="about-title" value={draft.about.title} onChange={(e) => setDraft({ ...draft, about: { ...draft.about, title: e.target.value } })} />
          </div>
          {draft.about.paragraphs.map((paragraph, index) => (
            <div key={`about-paragraph-${index}`}>
              <Label htmlFor={`about-paragraph-${index}`}>Paragraph {index + 1}</Label>
              <Textarea
                id={`about-paragraph-${index}`}
                value={paragraph}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    about: {
                      ...draft.about,
                      paragraphs: draft.about.paragraphs.map((item, paragraphIndex) => (
                        paragraphIndex === index ? e.target.value : item
                      )),
                    },
                  })}
              />
            </div>
          ))}
        </CardContent>
      </Card>}

      {currentSection === 'faq' && <Card>
        <CardHeader>
          <CardTitle>FAQ Page</CardTitle>
          <CardDescription>Control the FAQ title and question/answer pairs displayed publicly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="faq-title">FAQ Title</Label>
            <Input id="faq-title" value={draft.faq.title} onChange={(e) => setDraft({ ...draft, faq: { ...draft.faq, title: e.target.value } })} />
          </div>
          {draft.faq.items.map((item, index) => (
            <div key={`faq-item-${index}`} className="grid gap-4 rounded-lg border border-border p-4">
              <div>
                <Label htmlFor={`faq-question-${index}`}>Question {index + 1}</Label>
                <Input
                  id={`faq-question-${index}`}
                  value={item.question}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      faq: {
                        ...draft.faq,
                        items: draft.faq.items.map((faqItem, faqIndex) => (
                          faqIndex === index ? { ...faqItem, question: e.target.value } : faqItem
                        )),
                      },
                    })}
                />
              </div>
              <div>
                <Label htmlFor={`faq-answer-${index}`}>Answer {index + 1}</Label>
                <Textarea
                  id={`faq-answer-${index}`}
                  value={item.answer}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      faq: {
                        ...draft.faq,
                        items: draft.faq.items.map((faqItem, faqIndex) => (
                          faqIndex === index ? { ...faqItem, answer: e.target.value } : faqItem
                        )),
                      },
                    })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>}

      {currentSection === 'support' && <Card>
        <CardHeader>
          <CardTitle>Support Page</CardTitle>
          <CardDescription>Manage support channels, tutorials, and the refund policy shortcut button.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="support-refund-button">Refund Policy Button Label</Label>
              <Input id="support-refund-button" value={draft.support.refundPolicyButtonLabel} onChange={(e) => setDraft({ ...draft, support: { ...draft.support, refundPolicyButtonLabel: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="support-title">Support Title</Label>
              <Input id="support-title" value={draft.support.title} onChange={(e) => setDraft({ ...draft, support: { ...draft.support, title: e.target.value } })} />
            </div>
          </div>
          <div>
            <Label htmlFor="support-intro">Support Intro</Label>
            <Textarea id="support-intro" value={draft.support.intro} onChange={(e) => setDraft({ ...draft, support: { ...draft.support, intro: e.target.value } })} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {draft.support.channels.map((channel, index) => (
              <div key={`support-channel-${index}`} className="space-y-3 rounded-lg border border-border p-4">
                <div>
                  <Label htmlFor={`support-channel-title-${index}`}>Channel Title {index + 1}</Label>
                  <Input
                    id={`support-channel-title-${index}`}
                    value={channel.title}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        support: {
                          ...draft.support,
                          channels: draft.support.channels.map((supportChannel, channelIndex) => (
                            channelIndex === index ? { ...supportChannel, title: e.target.value } : supportChannel
                          )),
                        },
                      })}
                  />
                </div>
                <div>
                  <Label htmlFor={`support-channel-description-${index}`}>Channel Description {index + 1}</Label>
                  <Textarea
                    id={`support-channel-description-${index}`}
                    value={channel.description}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        support: {
                          ...draft.support,
                          channels: draft.support.channels.map((supportChannel, channelIndex) => (
                            channelIndex === index ? { ...supportChannel, description: e.target.value } : supportChannel
                          )),
                        },
                      })}
                  />
                </div>
                <div>
                  <Label htmlFor={`support-channel-href-${index}`}>Channel URL {index + 1}</Label>
                  <Input
                    id={`support-channel-href-${index}`}
                    value={channel.href}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        support: {
                          ...draft.support,
                          channels: draft.support.channels.map((supportChannel, channelIndex) => (
                            channelIndex === index ? { ...supportChannel, href: e.target.value } : supportChannel
                          )),
                        },
                      })}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>}

      {currentSection === 'terms' && <Card>
        <CardHeader>
          <CardTitle>Terms &amp; Conditions</CardTitle>
          <CardDescription>Edit the title, contact email, and each legal section shown on the terms page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="terms-title">Terms Title</Label>
              <Input id="terms-title" value={draft.terms.title} onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, title: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="terms-updated-label">Last Updated Label</Label>
              <Input id="terms-updated-label" value={draft.terms.lastUpdatedLabel} onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, lastUpdatedLabel: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="terms-refund-link">Refund Link Label</Label>
              <Input id="terms-refund-link" value={draft.terms.refundLinkLabel} onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, refundLinkLabel: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="terms-contact-email">Contact Email</Label>
              <Input id="terms-contact-email" value={draft.terms.contactEmail} onChange={(e) => setDraft({ ...draft, terms: { ...draft.terms, contactEmail: e.target.value } })} />
            </div>
          </div>

          {draft.terms.sections.map((section, index) => (
            <div key={`terms-section-${index}`} className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <Label htmlFor={`terms-section-title-${index}`}>Section Title {index + 1}</Label>
                <Input
                  id={`terms-section-title-${index}`}
                  value={section.title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      terms: {
                        ...draft.terms,
                        sections: draft.terms.sections.map((termSection, sectionIndex) => (
                          sectionIndex === index ? { ...termSection, title: e.target.value } : termSection
                        )),
                      },
                    })}
                />
              </div>
              <div>
                <Label htmlFor={`terms-section-body-${index}`}>Section Body {index + 1}</Label>
                <Textarea
                  id={`terms-section-body-${index}`}
                  value={section.body}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      terms: {
                        ...draft.terms,
                        sections: draft.terms.sections.map((termSection, sectionIndex) => (
                          sectionIndex === index ? { ...termSection, body: e.target.value } : termSection
                        )),
                      },
                    })}
                />
              </div>
              {section.bullets && (
                <div>
                  <Label htmlFor={`terms-section-bullets-${index}`}>Bullets {index + 1}</Label>
                  <Textarea
                    id={`terms-section-bullets-${index}`}
                    value={section.bullets.join('\n')}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        terms: {
                          ...draft.terms,
                          sections: draft.terms.sections.map((termSection, sectionIndex) => (
                            sectionIndex === index
                              ? {
                                ...termSection,
                                bullets: e.target.value
                                  .split('\n')
                                  .map((bullet) => bullet.trim())
                                  .filter(Boolean),
                              }
                              : termSection
                          )),
                        },
                      })}
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>}

      {currentSection === 'refund' && <Card>
        <CardHeader>
          <CardTitle>Refund Policy</CardTitle>
          <CardDescription>Manage the refund page intro, policy bullets, and support link label.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="refund-title">Refund Title</Label>
              <Input id="refund-title" value={draft.refund.title} onChange={(e) => setDraft({ ...draft, refund: { ...draft.refund, title: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="refund-support-link">Support Link Label</Label>
              <Input id="refund-support-link" value={draft.refund.supportLinkLabel} onChange={(e) => setDraft({ ...draft, refund: { ...draft.refund, supportLinkLabel: e.target.value } })} />
            </div>
          </div>
          <div>
            <Label htmlFor="refund-intro">Refund Intro</Label>
            <Textarea id="refund-intro" value={draft.refund.intro} onChange={(e) => setDraft({ ...draft, refund: { ...draft.refund, intro: e.target.value } })} />
          </div>
          {draft.refund.rules.map((rule, index) => (
            <div key={`refund-rule-${index}`}>
              <Label htmlFor={`refund-rule-${index}`}>Refund Rule {index + 1}</Label>
              <Textarea
                id={`refund-rule-${index}`}
                value={rule}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    refund: {
                      ...draft.refund,
                      rules: draft.refund.rules.map((refundRule, ruleIndex) => (
                        ruleIndex === index ? e.target.value : refundRule
                      )),
                    },
                  })}
              />
            </div>
          ))}
          <div>
            <Label htmlFor="refund-update-note">Update Note</Label>
            <Textarea id="refund-update-note" value={draft.refund.updateNote} onChange={(e) => setDraft({ ...draft, refund: { ...draft.refund, updateNote: e.target.value } })} />
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}

export default function AdminContentPage() {
  const { section } = useParams<{ section: string }>();
  const { content, setContent, resetContent } = useSiteContent();
  const currentSection = (section as ContentSection | undefined) ?? 'homepage';

  if (!(currentSection in sectionMeta)) {
    return <Navigate to="/admin/content/homepage" replace />;
  }

  return (
    <AdminContentEditor
      key={`${currentSection}-${JSON.stringify(content)}`}
      content={content}
      currentSection={currentSection}
      setContent={setContent}
      resetContent={resetContent}
    />
  );
}
