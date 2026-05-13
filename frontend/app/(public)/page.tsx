import { HeroSection } from "@/components/landing/HeroSection";
import {
  HowItWorks,
  type HowItWorksStep,
} from "@/components/landing/HowItWorks";
import { FeaturedEvents } from "@/components/landing/FeaturedEvents";
import { DarkStorySection } from "@/components/landing/DarkStorySection";
import { RunnerSpotlight } from "@/components/landing/RunnerSpotlight";
import {
  TrustStrip,
  type TrustItem,
} from "@/components/landing/TrustStrip";
import { CtaBanner } from "@/components/landing/CtaBanner";
import {
  fetchPublicSettings,
  fetchPublicStats,
  fetchPublicFeed,
  parseJsonSetting,
} from "@/lib/hooks/useSiteSettings";

export default async function HomePage(): Promise<React.ReactNode> {
  const [s, stats, feed] = await Promise.all([
    fetchPublicSettings(),
    fetchPublicStats(),
    fetchPublicFeed(),
  ]);

  return (
    <>
      <HeroSection
        content={{
          eyebrow: s["hero.eyebrow"],
          heading: s["hero.heading"],
          italicWord: s["hero.italic_word"],
          subheading: s["hero.subheading"],
          subtitle: s["hero.subtitle"],
          primaryCta: s["hero.primary_cta"],
          secondaryCta: s["hero.secondary_cta"],
          trustLine: s["hero.trust_line"],
          imageUrl: s["hero.image_url"],
          videoUrl: s["hero.video_url"] || undefined,
        }}
        stats={
          stats
            ? {
                totalRaised: parseFloat(stats.total_raised),
                totalRunners: stats.total_runners,
                totalEvents: stats.total_events,
              }
            : undefined
        }
      />
      <HowItWorks
        content={{
          eyebrow: s["howitworks.eyebrow"],
          heading: s["howitworks.heading"],
          subtitle: s["howitworks.subtitle"],
        }}
        steps={parseJsonSetting<HowItWorksStep[]>(
          s["howitworks.steps"],
          [],
        )}
      />
      <FeaturedEvents />
      <DarkStorySection
        feed={feed}
        stats={
          stats
            ? {
                raisedThisMonth: parseFloat(stats.raised_this_month),
                raisedTotal: parseFloat(stats.total_raised),
                activeEvents: stats.active_events,
                totalEvents: stats.total_events,
                totalOrganisations: stats.total_organisations,
              }
            : undefined
        }
      />
      <RunnerSpotlight />
      <TrustStrip
        content={{
          eyebrow: s["truststrip.eyebrow"],
          heading: s["truststrip.heading"],
          subtitle: s["truststrip.subtitle"],
          testimonialQuote: s["testimonial.quote"],
          testimonialAuthor: s["testimonial.author"],
          testimonialRole: s["testimonial.role"],
        }}
        items={parseJsonSetting<TrustItem[]>(s["truststrip.items"], [])}
      />
      <CtaBanner
        content={{
          eyebrow: s["cta.eyebrow"],
          heading: s["cta.heading"],
          subtitle: s["cta.subtitle"],
        }}
        valueProps={parseJsonSetting<string[]>(s["cta.value_props"], [])}
        stats={
          stats
            ? {
                raisedThisMonth: parseFloat(stats.raised_this_month),
                newRunnersThisMonth: stats.new_runners_this_month,
                donorsThisMonth: stats.donors_this_month,
                activeEvents: stats.active_events,
              }
            : undefined
        }
      />
    </>
  );
}
