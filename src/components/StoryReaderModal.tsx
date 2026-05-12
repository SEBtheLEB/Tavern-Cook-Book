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

type StoryReaderMode = "pages" | "paragraphs" | "steps" | "manuscript" | "study";

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

const readerModes: Array<{ id: StoryReaderMode; label: string; icon: string; hint: string }> = [
  { id: "pages", label: "Page View", icon: "BookOpen", hint: "Read it like a spread." },
  { id: "paragraphs", label: "Paragraph Reader", icon: "Pilcrow", hint: "Move beat by beat." },
  { id: "steps", label: "Story Steps", icon: "ListChecks", hint: "Jump through major beats." },
  { id: "manuscript", label: "Manuscript", icon: "ScrollText", hint: "One long clean scroll." },
  { id: "study", label: "Study Cards", icon: "PanelsTopLeft", hint: "Scan the source sections." }
];

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
  const [readerMode, setReaderMode] = useState<StoryReaderMode>("pages");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeBookSpreadIndex, setActiveBookSpreadIndex] = useState(0);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);
  const activeSection = sections.find((section) => section.key === activeTab);
  const activeSectionTitle = activeSection?.title || "Full Story";
  const bookPages = useMemo(() => buildStoryBookPages(fullStory, steps), [fullStory, steps]);
  const readableSteps = useMemo(() => steps.length ? steps : bookPages.map((page) => ({ title: page.title, kicker: page.kicker, text: page.text })), [bookPages, steps]);
  const storyParagraphs = useMemo(() => buildStoryParagraphs(fullStory, sections, readableSteps), [fullStory, readableSteps, sections]);
  const clampedStepIndex = Math.min(activeStepIndex, Math.max(readableSteps.length - 1, 0));
  const activeStep = readableSteps[clampedStepIndex];
  const clampedParagraphIndex = Math.min(activeParagraphIndex, Math.max(storyParagraphs.length - 1, 0));
  const activeParagraph = storyParagraphs[clampedParagraphIndex];
  const bookSpreadCount = Math.max(Math.ceil(bookPages.length / 2), 1);
  const clampedBookSpreadIndex = Math.min(activeBookSpreadIndex, bookSpreadCount - 1);
  const leftBookPage = bookPages[clampedBookSpreadIndex * 2];
  const rightBookPage = bookPages[clampedBookSpreadIndex * 2 + 1];
  const firstVisiblePageNumber = clampedBookSpreadIndex * 2 + 1;
  const lastVisiblePageNumber = Math.min(firstVisiblePageNumber + 1, bookPages.length);

  useEffect(() => {
    setActiveStepIndex(0);
    setActiveBookSpreadIndex(0);
    setActiveParagraphIndex(0);
    setReaderMode("pages");
  }, [title, steps.length]);

  const selectStep = (index: number) => {
    setActiveStepIndex(index);
  };

  return (
    <div className="character-story-reader-backdrop">
      <section className="character-story-reader">
        <header className="character-story-reader-header">
          <div>
            <p>{eyebrow}</p>
            <h2 className="font-display">{title}</h2>
          </div>
          <button className="character-codex-action-button story-reader-back-button" onClick={onClose} title="Back">
            <Icon name="ChevronLeft" className="h-4 w-4" />
            Back
          </button>
        </header>

        {activeTab === "full" && !(isEditing && onFullStoryChange) && (
          <nav className="story-reader-mode-tabs" aria-label="Reading modes">
            {readerModes.map((mode) => (
              <button
                key={mode.id}
                className={readerMode === mode.id ? "active" : ""}
                onClick={() => setReaderMode(mode.id)}
              >
                <Icon name={mode.icon} className="h-4 w-4" />
                <span>{mode.label}</span>
                <small>{mode.hint}</small>
              </button>
            ))}
          </nav>
        )}

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
                <div className="story-reader-write-mode">
                  <div>
                    <p>Longform Text</p>
                    <strong>This is the main deep-story field for this module.</strong>
                  </div>
                  <RichTextEditor
                    value={fullStoryEditValue || fullStory}
                    placeholder={fullStoryPlaceholder}
                    onChange={onFullStoryChange}
                    tall
                  />
                </div>
              ) : (
                <div className="character-story-reader-prose story-reader-prose-book">
                  {readerMode === "pages" && (
                    <StoryReaderPageMode
                      title={title}
                      eyebrow={eyebrow}
                      bookPages={bookPages}
                      leftBookPage={leftBookPage}
                      rightBookPage={rightBookPage}
                      firstVisiblePageNumber={firstVisiblePageNumber}
                      lastVisiblePageNumber={lastVisiblePageNumber}
                      clampedBookSpreadIndex={clampedBookSpreadIndex}
                      bookSpreadCount={bookSpreadCount}
                      onPrevious={() => setActiveBookSpreadIndex((index) => Math.max(index - 1, 0))}
                      onNext={() => setActiveBookSpreadIndex((index) => Math.min(index + 1, bookSpreadCount - 1))}
                    />
                  )}

                  {readerMode === "paragraphs" && activeParagraph && (
                    <StoryReaderParagraphMode
                      paragraph={activeParagraph}
                      index={clampedParagraphIndex}
                      count={storyParagraphs.length}
                      onPrevious={() => setActiveParagraphIndex((index) => Math.max(index - 1, 0))}
                      onNext={() => setActiveParagraphIndex((index) => Math.min(index + 1, storyParagraphs.length - 1))}
                    />
                  )}

                  {readerMode === "steps" && activeStep && (
                    <StoryReaderStepsMode
                      steps={readableSteps}
                      activeStep={activeStep}
                      activeStepIndex={clampedStepIndex}
                      onSelectStep={selectStep}
                    />
                  )}

                  {readerMode === "manuscript" && (
                    <div className="story-reader-manuscript">
                      <RichLoreText text={fullStory || bookPages.map((page) => page.text).join("\n\n")} />
                    </div>
                  )}

                  {readerMode === "study" && (
                    <StoryReaderStudyMode sections={sections} steps={readableSteps} />
                  )}
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

function StoryReaderPageMode({
  title,
  eyebrow,
  bookPages,
  leftBookPage,
  rightBookPage,
  firstVisiblePageNumber,
  lastVisiblePageNumber,
  clampedBookSpreadIndex,
  bookSpreadCount,
  onPrevious,
  onNext
}: {
  title: string;
  eyebrow: string;
  bookPages: StoryBookPage[];
  leftBookPage?: StoryBookPage;
  rightBookPage?: StoryBookPage;
  firstVisiblePageNumber: number;
  lastVisiblePageNumber: number;
  clampedBookSpreadIndex: number;
  bookSpreadCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
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
          onClick={onPrevious}
        >
          <Icon name="ChevronLeft" className="h-4 w-4" />
          Previous Page
        </button>
        <button
          className="story-reader-book-turn"
          disabled={clampedBookSpreadIndex >= bookSpreadCount - 1}
          onClick={onNext}
        >
          Next Page
          <Icon name="ChevronRight" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StoryReaderParagraphMode({
  paragraph,
  index,
  count,
  onPrevious,
  onNext
}: {
  paragraph: StoryBookPage;
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="story-reader-paragraph-mode">
      <div className="story-reader-paragraph-progress">
        <span>Paragraph {index + 1} of {count}</span>
        <div><i style={{ width: `${Math.round(((index + 1) / Math.max(count, 1)) * 100)}%` }} /></div>
      </div>
      <article>
        {paragraph.kicker && <p className="story-reader-step-kicker">{paragraph.kicker}</p>}
        <h4>{paragraph.title}</h4>
        <RichLoreText text={paragraph.text} />
      </article>
      <div className="story-reader-book-controls">
        <button className="story-reader-book-turn" disabled={index <= 0} onClick={onPrevious}>
          <Icon name="ChevronLeft" className="h-4 w-4" />
          Previous Paragraph
        </button>
        <button className="story-reader-book-turn" disabled={index >= count - 1} onClick={onNext}>
          Next Paragraph
          <Icon name="ChevronRight" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StoryReaderStepsMode({
  steps,
  activeStep,
  activeStepIndex,
  onSelectStep
}: {
  steps: StoryReaderStep[];
  activeStep: StoryReaderStep;
  activeStepIndex: number;
  onSelectStep: (index: number) => void;
}) {
  return (
    <div className="story-reader-steps">
      <nav aria-label="Story steps">
        {steps.map((step, index) => (
          <button
            key={`${step.title}-${index}`}
            className={index === activeStepIndex ? "active" : ""}
            onClick={() => onSelectStep(index)}
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
  );
}

function StoryReaderStudyMode({
  sections,
  steps
}: {
  sections: StoryReaderSection[];
  steps: StoryReaderStep[];
}) {
  const cards = [
    ...sections.map((section) => ({ title: section.title, kicker: "Source Section", text: section.value })),
    ...steps.map((step) => ({ title: step.title, kicker: step.kicker || "Story Beat", text: step.text }))
  ].filter((item) => Boolean(stripStoryText(item.text).trim()));

  return (
    <div className="story-reader-study-grid">
      {cards.map((card, index) => (
        <article key={`${card.title}-${index}`}>
          <p className="story-reader-step-kicker">{card.kicker}</p>
          <h4>{card.title}</h4>
          <RichLoreText text={card.text} />
        </article>
      ))}
      {!cards.length && <p>No study cards are available yet.</p>}
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
  if (stepPages.length) return stepPages;

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

function buildStoryParagraphs(fullStory: string, sections: StoryReaderSection[], steps: StoryReaderStep[]): StoryBookPage[] {
  const cleanFullStory = fullStory.trim();
  const rawParagraphs = cleanFullStory
    ? cleanFullStory.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];
  if (rawParagraphs.length > 1) {
    return rawParagraphs.map((paragraph, index) => ({
      title: `Paragraph ${index + 1}`,
      kicker: "Paragraph Reader",
      text: paragraph
    }));
  }

  const source = steps.length
    ? steps.map((step) => ({ title: step.title, kicker: step.kicker, text: step.text }))
    : sections.map((section) => ({ title: section.title, kicker: "Source Section", text: section.value }));
  return source.filter((item) => Boolean(stripStoryText(item.text).trim()));
}

function stripStoryText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
}
