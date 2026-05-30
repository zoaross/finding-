import { createFileRoute } from "@tanstack/react-router";
import { StarField } from "@/components/StarField";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { FeatureBar } from "@/components/landing/FeatureBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { GlobalStats } from "@/components/landing/GlobalStats";
import { UseCases } from "@/components/landing/UseCases";
import { UserVoices } from "@/components/landing/UserVoices";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";
import { LandingLanguageProvider } from "@/components/landing/landingI18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finding — AI-native social matching" },
      {
        name: "description",
        content:
          "Finding is a social network where AI understands what people need and connects them with people who can help.",
      },
      { property: "og:title", content: "Finding — AI-native social matching" },
      {
        property: "og:description",
        content:
          "A global AI-native social network for demand and supply matching across people, languages, and contexts.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <LandingLanguageProvider>
      <main className="relative min-h-screen">
        <StarField />
        <Navbar />
        <Hero />
        <FeatureBar />
        <HowItWorks />
        <GlobalStats />
        <UseCases />
        <UserVoices />
        <CtaSection />
        <Footer />
      </main>
    </LandingLanguageProvider>
  );
}
