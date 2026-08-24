import {
  BookOpenCheck,
  Calculator,
  CalendarDays,
  CarFront,
  Coins,
  Columns3,
  Luggage,
  Route,
  ShipWheel,
  Waves,
  type LucideIcon,
} from 'lucide-react';

import type { ToolIconName } from '@/lib/tools/catalog';

const ICONS: Record<ToolIconName, LucideIcon> = {
  calculator: Calculator,
  car: CarFront,
  calendar: CalendarDays,
  passport: BookOpenCheck,
  waves: Waves,
  coins: Coins,
  route: Route,
  ship: ShipWheel,
  luggage: Luggage,
  compare: Columns3,
};

export default function ToolIcon({ name, className = 'h-6 w-6' }: { name: ToolIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}
