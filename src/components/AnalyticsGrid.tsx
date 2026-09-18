import { Card } from '../ui/components';
import TrafficChart from './TrafficChart';
import type { Palette } from '../ui/theme';
import { memo, useId, useState } from 'react';
import { elementProps } from '../ui/elementProps';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnalyticsSnapshot, DataMode } from '../state/types';
import { Globe, Monitor, Smartphone, ChartColumn, UsersRound, type LucideIcon } from 'lucide-react-native';

type TimelineMode = `visits` | `users`;
type Category = { name: string; count: number };
type AnalyticsGridProps = {
  mode: DataMode;
  palette: Palette;
  compact: boolean;
  data: AnalyticsSnapshot;
  reducedMotion: boolean;
  onFeedback?: () => void;
};
type CategoryCardProps = {
  title: string;
  color: string;
  icon: LucideIcon;
  palette: Palette;
  compact: boolean;
  items: Category[];
  reducedMotion: boolean;
  onFeedback?: () => void;
};

const timelineOptions: Array<{ value: TimelineMode; label: string; icon: LucideIcon }> = [
  { value: `visits`, label: `Visits`, icon: ChartColumn },
  { value: `users`, label: `Users`, icon: UsersRound },
];

const CategoryCard = ({ title, color, icon: Icon, items, palette, compact, reducedMotion, onFeedback }: CategoryCardProps) => {
  const scope = useId();
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const buckets = items.map(item => ({ label: item.name, value: item.count }));
  return (
    <Card
      id={scope}
      palette={palette}
      className={`analytics-category-card`}
      style={[styles.card, compact && styles.compactCard]}
    >
      <View
        {...elementProps(`analytics-category-header`, scope)}
        style={styles.categoryHeader}
      >
        <View
          {...elementProps(`analytics-category-heading`, scope)}
          style={styles.heading}
        >
          <Icon
            size={compact ? 14 : 16}
            color={color}
            strokeWidth={1.8}
            {...elementProps(`analytics-category-icon`, scope)}
          />
          <Text
            numberOfLines={2}
            {...elementProps(`analytics-category-title`, scope)}
            style={[styles.title, compact && styles.compactTitle, { color: palette.text }]}
          >
            {title}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          {...elementProps(`analytics-category-total`, scope)}
          style={[styles.summary, { color: palette.muted }]}
        >
          {total.toLocaleString(`en-US`)}
          {` Visit(s)`}
        </Text>
      </View>
      <TrafficChart
        dense
        color={color}
        title={title}
        scope={`Visit(s)`}
        unit={`Visit(s)`}
        buckets={buckets}
        palette={palette}
        variant={`category`}
        onFeedback={onFeedback}
        reducedMotion={reducedMotion}
      />
    </Card>
  );
};

export const AnalyticsGrid = ({ data, palette, mode, compact, reducedMotion, onFeedback }: AnalyticsGridProps) => {
  const scope = useId();
  const [timelineMode, setTimelineMode] = useState<TimelineMode>(`visits`);
  const users = timelineMode === `users`;
  const timelineColor = users ? palette.green : palette.blue;
  const buckets = users ? data.userBuckets : data.buckets;
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const common = { palette, compact, onFeedback, reducedMotion };
  return (
    <View
      {...elementProps(`analytics-grid`, scope)}
      style={styles.grid}
    >
      <View
        {...elementProps(`analytics-grid-top-row`, scope)}
        style={styles.row}
      >
        <Card
          id={scope}
          palette={palette}
          className={`analytics-timeline-card`}
          style={[styles.card, compact && styles.compactCard]}
        >
          <View
            {...elementProps(`analytics-timeline-tabs`, scope)}
            accessibilityRole={`tablist`}
            accessibilityLabel={`Timeline Data`}
            style={[styles.tabs, { borderColor: palette.border, backgroundColor: palette.bg }]}
          >
            {timelineOptions.map(({ value, label, icon: Icon }) => (
              <Pressable
                key={value}
                {...elementProps(`analytics-timeline-tab`, `${scope}-${value}`)}
                accessibilityRole={`tab`}
                accessibilityLabel={label}
                aria-selected={timelineMode === value}
                accessibilityState={{ selected: timelineMode === value }}
                onPress={() => {
                  if (timelineMode !== value) {
                    onFeedback?.();
                    setTimelineMode(value);
                  }
                }}
                style={[styles.tab, { backgroundColor: timelineMode === value ? palette.selected : `transparent` }]}
              >
                <Icon
                  {...elementProps(`analytics-timeline-tab-icon`, `${scope}-${value}`)}
                  size={13}
                  strokeWidth={1.8}
                  color={timelineMode === value ? timelineColor : palette.muted}
                />
                <Text
                  {...elementProps(`analytics-timeline-tab-label`, `${scope}-${value}`)}
                  style={[styles.tabLabel, { color: timelineMode === value ? timelineColor : palette.muted }]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View
            {...elementProps(`analytics-timeline-summary`, scope)}
            style={styles.summaryRow}
          >
            <Text
              {...elementProps(`analytics-timeline-total`, scope)}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.total, { color: palette.text }]}
            >
              {total.toLocaleString(`en-US`)}
              {` `}
              {users ? `Signups` : `Visits`}
            </Text>
            <Text
              {...elementProps(`analytics-timeline-period`, scope)}
              style={[styles.period, { color: palette.muted }]}
            >
              {mode === `demo` ? `Demo · 1h` : `Last Hour`}
            </Text>
          </View>
          <TrafficChart
            dense
            color={timelineColor}
            buckets={buckets}
            palette={palette}
            variant={`timeline`}
            scope={`Last Hour · 5-Minute Bins`}
            title={users ? `Users` : `Visits`}
            unit={users ? `Signup(s)` : `Visit(s)`}
            onFeedback={onFeedback}
            reducedMotion={reducedMotion}
          />
        </Card>
        <CategoryCard
          {...common}
          icon={Globe}
          color={palette.blue}
          title={`Browsers`}
          items={data.browsers}
        />
      </View>
      <View
        {...elementProps(`analytics-grid-bottom-row`, scope)}
        style={styles.row}
      >
        <CategoryCard
          {...common}
          icon={Monitor}
          color={palette.green}
          title={`Operating Systems`}
          items={data.operatingSystems}
        />
        <CategoryCard
          {...common}
          icon={Smartphone}
          color={palette.red}
          title={`Devices`}
          items={data.devices}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  period: { fontSize: 9 },
  compactCard: { padding: 10 },
  compactTitle: { fontSize: 11 },
  grid: { gap: 8, flex: 1, minHeight: 304 },
  card: { flex: 1, minWidth: 0, padding: 12 },
  tabLabel: { fontSize: 11, fontWeight: `600` },
  summary: { fontSize: 10, flexShrink: 1, lineHeight: 14 },
  total: { fontSize: 11, flexShrink: 1, fontWeight: `600` },
  row: { gap: 8, flex: 1, minHeight: 148, flexDirection: `row` },
  title: { flex: 1, fontSize: 13, lineHeight: 15, fontWeight: `600` },
  tabs: { gap: 2, padding: 2, borderWidth: 1, borderRadius: 7, flexDirection: `row` },
  categoryHeader: { gap: 6, minHeight: 32, flexDirection: `row`, alignItems: `center` },
  heading: { gap: 6, flex: 1, minWidth: 0, flexDirection: `row`, alignItems: `center` },
  summaryRow: { gap: 4, minHeight: 20, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between` },
  tab: { gap: 4, flex: 1, minWidth: 0, minHeight: 26, borderRadius: 4, paddingHorizontal: 3, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
});

export default memo(AnalyticsGrid);
