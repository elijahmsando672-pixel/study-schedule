import { Home, List, Timer, BookOpen, BarChart3, User } from 'lucide-react-native';
import { ComponentType } from 'react';

type IconName = 'home' | 'list' | 'timer' | 'book' | 'bar-chart-2' | 'user';

const iconMap: Record<IconName, ComponentType<{ size?: number; color?: string }>> = {
  home: Home,
  list: List,
  timer: Timer,
  book: BookOpen,
  'bar-chart-2': BarChart3, // Using BarChart3 as closest match
  user: User,
};

export function Icon(props: { name: IconName; size?: number; color?: string }) {
  const IconComponent = iconMap[props.name];
  if (!IconComponent) {
    return null;
  }
  return <IconComponent size={props.size || 24} color={props.color || '#000'} />;
}
