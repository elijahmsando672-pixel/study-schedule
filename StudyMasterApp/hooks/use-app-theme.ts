import { useColorScheme } from 'react-native';
import { AppTheme, type ThemeColors } from '@/constants/theme';

export function useAppTheme(): ThemeColors {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? AppTheme.dark : AppTheme.light;
}
