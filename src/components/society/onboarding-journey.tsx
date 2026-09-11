"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  onboardingPhaseLabels,
  type OnboardingDestination,
  type OnboardingGuideView,
  type OnboardingPhase,
  type OnboardingStep,
} from "@/domain/onboarding";

import { SocietyDocumentHeader, SocietyDocumentToolbar } from "./society-document";
import styles from "./society.module.css";

const phases: OnboardingPhase[] = ["firstDay", "firstWeek", "firstFortnight"];
const progressKey = "hyped_onboarding_progress";

export function OnboardingJourney({ bannerImageUrl, bannerPosition, canEdit, guide }: { bannerImageUrl?: string | null; bannerPosition?: number; canEdit?: boolean; guide: OnboardingGuideView }) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(progressKey);
        const saved = stored ? JSON.parse(stored) as unknown : [];
        if (Array.isArray(saved)) {
          const validIds = new Set(guide.steps.map((step) => step.id));
          setCompletedIds(saved.filter((id): id is string => typeof id === "string" && validIds.has(id)));
        }
      } catch {
        window.localStorage.removeItem(progressKey);
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [guide.steps]);

  const completed = useMemo(() => new Set(completedIds), [completedIds]);
  const requiredSteps = guide.steps.filter((step) => step.required);
  const completedRequired = requiredSteps.filter((step) => completed.has(step.id)).length;
  const percentage = requiredSteps.length ? Math.round(completedRequired / requiredSteps.length * 100) : 100;
  const nextStep = guide.steps.find((step) => step.required && !completed.has(step.id))
    ?? guide.steps.find((step) => !completed.has(step.id))
    ?? null;

  function toggleStep(step: OnboardingStep) {
    const next = new Set(completedIds);
    if (next.has(step.id)) next.delete(step.id);
    else next.add(step.id);
    const ordered = guide.steps.filter((item) => next.has(item.id)).map((item) => item.id);
    setCompletedIds(ordered);
    window.localStorage.setItem(progressKey, JSON.stringify(ordered));
  }

  function resetProgress() {
    window.localStorage.removeItem(progressKey);
    setCompletedIds([]);
  }

  return (
    <div>
      <SocietyDocumentToolbar
        actions={completedIds.length ? <button onClick={resetProgress} type="button">Reset progress</button> : undefined}
        label="Start here"
        status={<small>{loaded ? `${percentage}% complete` : "Loading progress"}</small>}
      />

      <SocietyDocumentHeader
        bannerPage="start"
        canEdit={canEdit}
        imageUrl={bannerImageUrl}
        positionY={bannerPosition}
        eyebrow="New member checklist"
        label="Getting started"
        summary={guide.introduction}
        title={guide.title}
        tone="start"
      >
        <div className={styles.onboardingOutcome}><div><small>Outcome</small><strong>{guide.outcome}</strong></div></div>
      </SocietyDocumentHeader>

      <div className={styles.onboardingDocumentContent}>
        <section className={styles.onboardingProgressCard}>
          <div className={styles.progressDial} style={{ "--progress": `${percentage * 3.6}deg` } as React.CSSProperties}><span>{percentage}%</span></div>
          <div>
            <small>{percentage === 100 ? "Route complete" : "Your progress"}</small>
            <h2>{percentage === 100 ? "You’ve got the foundations." : `${completedRequired} of ${requiredSteps.length} essentials done`}</h2>
            <div className={styles.progressTrack}><span style={{ width: `${percentage}%` }} /></div>
          </div>
          {nextStep && <div className={styles.nextStepMini}><small>Up next · {nextStep.estimatedMinutes} min</small><strong>{nextStep.title}</strong><a href={`#${nextStep.id}`}>Jump to it ↓</a></div>}
        </section>

        <div className={styles.onboardingPhases}>
          {phases.map((phase, phaseIndex) => {
            const steps = guide.steps.filter((step) => step.phase === phase);
            if (!steps.length) return null;
            const required = steps.filter((step) => step.required);
            const phaseComplete = required.length > 0 && required.every((step) => completed.has(step.id));
            return (
              <section className={styles.onboardingPhase} key={phase}>
                <header><span>{String(phaseIndex + 1).padStart(2, "0")}</span><div><small>{phaseComplete ? "Phase complete" : "In your own time"}</small><h2>{onboardingPhaseLabels[phase]}</h2></div></header>
                <div>
                  {steps.map((step) => (
                    <article className={styles.onboardingStep} data-complete={completed.has(step.id)} id={step.id} key={step.id}>
                      <button aria-label={`${completed.has(step.id) ? "Mark incomplete" : "Mark complete"}: ${step.title}`} className={styles.stepCheck} onClick={() => toggleStep(step)} type="button">{completed.has(step.id) ? "✓" : ""}</button>
                      <div className={styles.stepContent}>
                        <div className={styles.stepMeta}><span>{step.estimatedMinutes} min</span><b>{step.required ? "Essential" : "Useful extra"}</b></div>
                        <h3>{step.title}</h3>
                        <p>{step.summary}</p>
                        {step.why && <blockquote><strong>Why it matters</strong>{step.why}</blockquote>}
                        <DestinationLink destination={step.destination} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DestinationLink({ destination }: { destination: OnboardingDestination }) {
  const href = destination.kind === "home"
    ? "/"
    : destination.kind === "people"
      ? "/people"
      : destination.kind === "teams"
        ? "/teams"
      : destination.kind === "wiki"
        ? `/wiki?page=${encodeURIComponent(destination.pageId)}`
        : destination.url;
  return destination.kind === "external"
    ? <a className={styles.stepAction} href={href} rel="noreferrer" target="_blank">{destination.label} ↗</a>
    : <Link className={styles.stepAction} href={href}>{destination.label} →</Link>;
}
