/**
 * CategoryIcon — renders a lucide-react icon by string name.
 * Used wherever getCategoryIcon() returns an icon name.
 */
import {
  UtensilsCrossed, IceCreamCone, Coffee, Landmark, TreePine,
  ShoppingBag, Wine, BedDouble, Train, MapPin,
  type LucideProps,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  UtensilsCrossed,
  IceCreamCone,
  Coffee,
  Landmark,
  TreePine,
  ShoppingBag,
  Wine,
  BedDouble,
  Train,
  MapPin,
};

interface CategoryIconProps extends LucideProps {
  name: string;
}

export default function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const Icon = ICON_MAP[name] ?? MapPin;
  return <Icon {...props} />;
}
