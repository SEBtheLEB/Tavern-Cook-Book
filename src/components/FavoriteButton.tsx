import { Icon } from "./Icon";

interface FavoriteButtonProps {
  active: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}

export function FavoriteButton({ active, label, onToggle, className = "" }: FavoriteButtonProps) {
  return (
    <button
      className={`favorite-star-button ${active ? "active" : ""} ${className}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      title={active ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      aria-label={active ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      aria-pressed={active}
    >
      <Icon name="Star" className="h-5 w-5" />
    </button>
  );
}
