import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { RichLoreText, RichTextEditor } from "./RichText";

export interface StoryReaderSection {
  key: string;
  title: string;
  icon: string;
  value: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}

export interface StoryReaderStep {
  title: string;
  kicker?: string;
  text: string;
}

interface StoryBookPage {
  title: string;
  kicker?: string;
  text: string;
}

interface StoryReaderModalProps {
  title: string;
  eyebrow?: string;
  activeTab: string;
  sections: StoryReaderSection[];
  fullStory: string;
  fullStoryEditValue?: string;
  fullStoryPlaceholder?: string;
  steps?: StoryReaderStep[];
  isEditing?: boolean;
  onSetActiveTab: (tab: string) => void;
  onFullStoryChange?: (value: string) => void;
  onClose: () => void;
}

export function StoryReaderModal({
  title,
  eyebrow = "Longform Story Scroll",
  activeTab,
  sections,
  fullStory,
  fullStoryEditValue,
  fullStoryPlaceholder = "Write the complete in-depth story here.",
  steps = [],
  isEditing = false,
  onSetActiveTab,
  onFullStoryChange,
  onClose
}: StoryReaderModalProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeBookSpreadIndex, setActiveBookSpreadIndex] = useState(0);
  const activeSection = sections.find((section) => section.key === activeTab);
  const activeSectionTitle = activeSection?.title || "Full Story";
  const clampedStepIndex = Math.min(activeStepIndex, Math.max(steps.length - 1, 0));
  const activeStep = steps[clampedStepIndex];
  const bookPages = useMemo(() => buildStoryBookPages(fullStory, steps), [fullStory, steps]);
  const bookSpreadCount = Math.max(Math.ceil(bookPages.length / 2), 1);
  const clampedBookSpreadIndex = Math.min(activeBookSpreadIndex, bookSpreadCount - 1);
  const leftBookPage = bookPages[clampedBookSpreadIndex * 2];
  const rightBookPage = bookPages[clampedBookSpreadIndex * 2 + 1];
  const firstVisiblePageNumber = clampedBookSpreadIndex * 2 + 1;
  const lastVisiblePageNumber = Math.min(firstVisiblePageNumber + 1, bookPages.length);

  useEffect(() => {
    setActiveStepIndex(0);
    setActiveBookSpreadIndex(0);
  }, [title, steps.length]);

  const selectStep = (index: number) => {
    setActiveStepIndex(index);
  };

  return (
    <div className="character-story-reader-backdrop">
      <section className="character-story-reader">
        <header>
          <div>
            <p>{eyebrow}</p>
            <h2 className="font-display">{title}</h2>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close full story">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="character-story-reader-layout">
          <aside className="character-story-reader-tabs">
            <button className={activeTab === "full" ? "active" : ""} onClick={() => onSetActiveTab("full")}>
              <Icon name="ScrollText" className="h-4 w-4" />
              Full Story
            </button>
            {sections.map((section, index) => (
              <button
                key={section.key}
                className={activeTab === section.key ? "active" : ""}
                onClick={() => onSetActiveTab(section.key)}
              >
                <span>{index + 1}</span>
                <Icon name={section.icon} className="h-4 w-4" />
                {section.title}
              </button>
            ))}
          </aside>

          <div className="character-story-reader-body entry-scroll">
            <h3>{activeSectionTitle}</h3>
            {activeTab === "full" ? (
              isEditing && onFullStoryChange ? (
                <RichTextEditor
                  value={fullStoryEditValue || fullStory}
                  placeholder={fullStoryPlaceholder}
                  onChange={onFullStoryChange}
                  tall
                />
              ) : (
                <div className="character-story-reader-prose story-reader-prose-book">
                  {steps.length > 0 && activeStep && (
                    <div className="story-reader-steps">
                      <nav aria-label="Story steps">
                        {steps.map((step, index) => (
                          <button
                            key={`${step.title}-${index}`}
                            className={index === clampedStepIndex ? "active" : ""}
                            onClick={() => selectStep(index)}
                          >
                            <span>{index + 1}</span>
                            {step.title}
                          </button>
                        ))}
                      </nav>
                      <article>
                        {activeStep.kicker && <p className="story-reader-step-kicker">{activeStep.kicker}</p>}
                        <h4>{activeStep.title}</h4>
                        <RichLoreText text={activeStep.text} />
                      </article>
                    </div>
                  )}

                  <div className="story-reader-book-shell" aria-label="Book story view">
                    <div className="story-reader-book-topline">
                      <div>
                        <p>{eyebrow}</p>
                        <strong>{title}</strong>
                      </div>
                      <span>
                        Pages {firstVisiblePageNumber}
                        {lastVisiblePageNumber !== firstVisiblePageNumber ? `-${lastVisiblePageNumber}` : ""} of {bookPages.length}
                      </span>
                    </div>
                    <div className="story-reader-book">
                      <StoryBookPageView page={leftBookPage} pageNumber={firstVisiblePageNumber} />
                      <StoryBookPageView page={rightBookPage} pageNumber={firstVisiblePageNumber + 1} muted />
                    </div>
                    <div className="story-reader-book-controls">
                      <button
                        className="story-reader-book-turn"
                        disabled={clampedBookSpreadIndex <= 0}
                        onClick={() => setActiveBookSpreadIndex((index) => Math.max(index - 1, 0))}
                      >
                        <Icon name="ChevronLeft" className="h-4 w-4" />
                        Previous Page
                      </button>
                      <button
                        className="story-reader-book-turn"
                        disabled={clampedBookSpreadIndex >= bookSpreadCount - 1}
                        onClick={() => setActiveBookSpreadIndex((index) => Math.min(index + 1, bookSpreadCount - 1))}
                      >
                        Next Page
                        <Icon name="ChevronRight" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : activeSection ? (
              isEditing && activeSection.onChange ? (
                <RichTextEditor
                  value={activeSection.value}
                  placeholder={activeSection.placeholder || "Write this story section here."}
                  onChange={activeSection.onChange}
                  tall
                />
              ) : (
                <div className="character-story-reader-prose">
                  <RichLoreText text={activeSection.value || "No story notes added yet."} />
                </div>
              )
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function StoryBookPageView({
  page,
  pageNumber,
  muted = false
}: {
  page?: StoryBookPage;
  pageNumber: number;
  muted?: boolean;
}) {
  if (!page) {
    return (
      <article className="story-reader-book-page empty">
        <span>{pageNumber}</span>
      </article>
    );
  }

  return (
    <article className={`story-reader-book-page ${muted ? "right-page" : ""}`}>
      <div>
        {page.kicker && <p className="story-reader-step-kicker">{page.kicker}</p>}
        <h4>{page.title}</h4>
        <RichLoreText text={page.text} />
      </div>
      <span>{pageNumber}</span>
    </article>
  );
}

function buildStoryBookPages(fullStory: string, steps: StoryReaderStep[]): StoryBookPage[] {
  const cleanFullStory = stripStoryText(fullStory).trim();
  if (cleanFullStory && cleanFullStory !== "No full story has been written yet.") {
    return splitStoryIntoPages(fullStory).map((text, index) => ({
      title: index === 0 ? "Full Story" : `Full Story ${index + 1}`,
      kicker: "Story Book",
      text
    }));
  }

  const stepPages = steps
    .filter((step) => Boolean(stripStoryText(step.text).trim()))
    .map((step) => ({
      title: step.title,
      kicker: step.kicker,
      text: step.text
    }));
  if (stepPages.length > 1) return stepPages;

  return splitStoryIntoPages("").map((text, index) => ({
    title: index === 0 ? "Full Story" : `Full Story ${index + 1}`,
    kicker: "Story Book",
    text
  }));
}

function splitStoryIntoPages(value: string) {
  const cleanText = value.trim() || "No full story has been written yet.";
  const paragraphs = cleanText.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const pages: string[] = [];
  let current = "";
  const maxPageLength = 1250;

  paragraphs.forEach((paragraph) => {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxPageLength && current) {
      pages.push(current);
      current = paragraph;
      return;
    }
    current = next;
  });

  if (current) pages.push(current);
  return pages.length ? pages : ["No full story has been written yet."];
}

function stripStoryText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
}
