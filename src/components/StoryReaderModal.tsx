import { useEffect, useState } from "react";
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
  const activeSection = sections.find((section) => section.key === activeTab);
  const activeSectionTitle = activeSection?.title || "Full Story";
  const clampedStepIndex = Math.min(activeStepIndex, Math.max(steps.length - 1, 0));
  const activeStep = steps[clampedStepIndex];

  useEffect(() => {
    setActiveStepIndex(0);
  }, [title, steps.length]);

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
                <div className="character-story-reader-prose">
                  {steps.length > 0 && activeStep && (
                    <div className="story-reader-steps">
                      <nav aria-label="Story steps">
                        {steps.map((step, index) => (
                          <button
                            key={`${step.title}-${index}`}
                            className={index === clampedStepIndex ? "active" : ""}
                            onClick={() => setActiveStepIndex(index)}
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

                  <div className="story-reader-full-scroll">
                    <RichLoreText text={fullStory} />
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
