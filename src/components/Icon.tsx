import {
  Archive,
  BookOpen,
  ChefHat,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Clipboard,
  Cog,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileJson,
  GitBranch,
  Home,
  Import,
  Landmark,
  LayoutDashboard,
  Map,
  Megaphone,
  Moon,
  Package,
  PanelLeft,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Soup,
  Sparkles,
  Sun,
  Swords,
  Trash2,
  Upload,
  Users,
  WandSparkles,
  Wheat,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  Archive,
  BookOpen,
  ChefHat,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Clipboard,
  Cog,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileJson,
  GitBranch,
  Home,
  Import,
  Landmark,
  LayoutDashboard,
  Map,
  Megaphone,
  Moon,
  Package,
  PanelLeft,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Soup,
  Sparkles,
  Sun,
  Swords,
  Trash2,
  Upload,
  Users,
  WandSparkles,
  Wheat,
  X
};

interface IconProps {
  name: string;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, className = "h-5 w-5", strokeWidth = 2 }: IconProps) {
  const Component = icons[name] || BookOpen;
  return <Component className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
