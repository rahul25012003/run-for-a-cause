import {
  Activity,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  Coins,
  Crown,
  Eye,
  FileSpreadsheet,
  Footprints,
  HandHeart,
  Heart,
  Landmark,
  Lock,
  MapPin,
  Mountain,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Map a lucide icon name (string from CMS) to its component. Whitelisted —
 * unknown names fall back to a sensible default so the page can never crash
 * on a typo'd icon name in the database.
 */
const ICONS: Record<string, LucideIcon> = {
  Activity,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  Coins,
  Crown,
  Eye,
  FileSpreadsheet,
  Footprints,
  HandHeart,
  Heart,
  Landmark,
  Lock,
  MapPin,
  Mountain,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
};

export function resolveIcon(
  name: string | undefined | null,
  fallback: LucideIcon = Sparkles,
): LucideIcon {
  if (!name) return fallback;
  return ICONS[name] ?? fallback;
}

export const ICON_NAMES = Object.keys(ICONS).sort();
