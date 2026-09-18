import PlatformIcon from './PlatformIcon';
import type { Palette } from '../ui/theme';
import { elementProps } from '../ui/elementProps';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { memo, useId, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type ChartProps = {
  unit?: string;
  color?: string;
  title?: string;
  scope?: string;
  dense?: boolean;
  palette: Palette;
  reducedMotion: boolean;
  onFeedback?: () => void;
  variant?: `timeline` | `category`;
  buckets: Array<{ label: string; value: number }>;
};

const Bar = memo(({ value, height, color, reducedMotion, label, selected, onSelect }: { value: number; height: number; color: string; reducedMotion: boolean; label: string; selected: boolean; onSelect: () => void }) => {
  const identity = useId();
  const animated = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(animated, { toValue: value, duration: reducedMotion ? 0 : 420, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [animated, value, reducedMotion]);
  return (
    <Pressable
      {...elementProps(`timeline-bar-button`, identity)}
      accessibilityRole={`button`}
      accessibilityLabel={label}
      aria-pressed={selected}
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={styles.barTouch}
    >
      <Animated.View
        {...elementProps(`timeline-bar-fill`, identity)}
        style={[styles.bar, { backgroundColor: color, opacity: selected ? 1 : 0.8, height: animated.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(2, height)] }) }]}
      />
    </Pressable>
  );
});

const CategoryBar = memo(({ label, value, total, color, palette, reducedMotion, unit, selected, onSelect, dense = false }: { label: string; color: string; value: number; total: number; palette: Palette; reducedMotion: boolean; unit: string; selected: boolean; dense?: boolean; onSelect: () => void }) => {
  const identity = useId();
  const animated = useRef(new Animated.Value(0)).current;
  const percent = total > 0 ? value / total * 100 : 0;
  useEffect(() => {
    const animation = Animated.timing(animated, { toValue: percent, duration: reducedMotion ? 0 : 420, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [animated, percent, reducedMotion]);
  return (
    <Pressable
      {...elementProps(`category-bar-button`, identity)}
      accessibilityRole={`button`}
      accessibilityLabel={`${label}: ${value} ${unit}, ${Math.round(percent)}%`}
      aria-pressed={selected}
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => [styles.categoryRow, dense && styles.denseCategoryRow, { opacity: pressed ? 0.65 : 1 }]}
    >
      <View
        {...elementProps(`category-bar-label-row`, identity)}
        style={[styles.categoryLabel, dense && { gap: 6 }]}
      >
        <PlatformIcon
          name={label}
          color={color}
          size={dense ? 14 : 18}
        />
        <Text
          numberOfLines={1}
          {...elementProps(`category-bar-name`, identity)}
          style={[styles.categoryName, dense && styles.denseCategoryName, { color: selected ? color : palette.text }]}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          {...elementProps(`category-bar-count`, identity)}
          style={[styles.categoryCount, dense && styles.denseText, { color: palette.muted }]}
        >
          {dense ? value.toLocaleString(`en-US`) : `${value.toLocaleString(`en-US`)} · ${Math.round(percent)}%`}
        </Text>
      </View>
      <View
        {...elementProps(`category-bar-track`, identity)}
        style={[styles.track, dense && { height: 4 }, { backgroundColor: palette.raised }]}
      >
        <Animated.View
          {...elementProps(`category-bar-fill`, identity)}
          style={[styles.fill, { backgroundColor: color, opacity: selected ? 1 : 0.8, width: animated.interpolate({ inputRange: [0, 100], outputRange: [`0%`, `100%`] }) }]}
        />
      </View>
    </Pressable>
  );
});

const CategoryChart = ({ buckets, palette, color = palette.blue, reducedMotion, title, unit = `Visit(s)`, scope = `Recorded Sessions`, onFeedback, dense = false }: ChartProps) => {
  const identity = useId();
  const [height, setHeight] = useState(140);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string>();
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const pageSize = Math.max(1, Math.floor((height - (dense ? 32 : 46)) / (dense ? 30 : 48)));
  const pages = Math.max(1, Math.ceil(buckets.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const selectedBucket = buckets.find(bucket => bucket.label === selected);
  const paginate = (next: number) => {
    onFeedback?.();
    setPage(next);
  };
  return (
    <View
      {...elementProps(`category-chart`, identity)}
      style={[styles.categoryChart, dense && styles.denseCategoryChart]}
      accessibilityLabel={`${title} By Recorded Visits`}
      onLayout={event => setHeight(event.nativeEvent.layout.height)}
    >
      <View
        {...elementProps(`category-chart-rows`, identity)}
        style={[styles.categoryRows, dense && { minHeight: 30 }]}
      >
        {buckets.length ? buckets.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(bucket => (
          <CategoryBar
            color={color}
            key={bucket.label}
            {...bucket}
            dense={dense}
            total={total}
            palette={palette}
            reducedMotion={reducedMotion}
            unit={unit}
            selected={selected === bucket.label}
            onSelect={() => {
              onFeedback?.();
              setSelected(selected === bucket.label ? undefined : bucket.label);
            }}
          />
        )) : (
          <View
            {...elementProps(`category-chart-empty`, identity)}
            style={styles.empty}
          >
            <Text
              {...elementProps(`category-chart-empty-label`, identity)}
              style={[styles.categoryName, dense && styles.denseCategoryName, { color: palette.muted }]}
            >
              {dense ? `No Visits Yet` : `No Visits Recorded Yet`}
            </Text>
          </View>
        )}
      </View>
      <View
        {...elementProps(`category-chart-footer`, identity)}
        style={[styles.categoryFooter, dense && styles.denseCategoryFooter, { borderColor: palette.border }]}
      >
        {(!dense || pages === 1) && (
          <Text
            {...elementProps(`category-chart-scope`, identity)}
            numberOfLines={1}
            accessibilityLiveRegion={`polite`}
            style={[styles.categoryScope, { color: palette.faint }]}
          >
            {selectedBucket ? `${selectedBucket.label} · ${selectedBucket.value} ${unit}` : scope}
          </Text>
        )}
        {pages > 1 ? (
          <View
            {...elementProps(`category-chart-pagination`, identity)}
            style={[styles.pager, dense && styles.densePager]}
          >
            <Pressable
              {...elementProps(`category-chart-previous`, identity)}
              hitSlop={dense ? 5 : 0}
              accessibilityRole={`button`}
              accessibilityLabel={`Previous ${title} Page`}
              disabled={currentPage === 0}
              aria-disabled={currentPage === 0}
              accessibilityState={{ disabled: currentPage === 0 }}
              onPress={() => paginate(currentPage - 1)}
              style={[styles.pageButton, dense && styles.densePageButton, { opacity: currentPage === 0 ? 0.35 : 1 }]}
            >
              <ChevronLeft
                {...elementProps(`category-chart-previous-icon`, identity)}
                size={dense ? 15 : 17}
                color={palette.muted}
              />
            </Pressable>
            <Text
              {...elementProps(`category-chart-page-label`, identity)}
              accessibilityLiveRegion={`polite`}
              style={[styles.axisText, dense && styles.denseText, { color: palette.muted }]}
            >
              {currentPage + 1}
              /
              {pages}
            </Text>
            <Pressable
              {...elementProps(`category-chart-next`, identity)}
              hitSlop={dense ? 5 : 0}
              accessibilityRole={`button`}
              accessibilityLabel={`Next ${title} Page`}
              disabled={currentPage === pages - 1}
              aria-disabled={currentPage === pages - 1}
              accessibilityState={{ disabled: currentPage === pages - 1 }}
              onPress={() => paginate(currentPage + 1)}
              style={[styles.pageButton, dense && styles.densePageButton, { opacity: currentPage === pages - 1 ? 0.35 : 1 }]}
            >
              <ChevronRight
                {...elementProps(`category-chart-next-icon`, identity)}
                size={dense ? 15 : 17}
                color={palette.muted}
              />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const TimelineChart = ({ buckets, palette, color = palette.blue, reducedMotion, title = `Visits`, unit = `Visit(s)`, scope = `Last Hour · 5-Minute Bins`, onFeedback, dense = false }: ChartProps) => {
  const identity = useId();
  const [plotHeight, setPlotHeight] = useState(160);
  const [selected, setSelected] = useState<string>();
  const max = Math.max(4, ...buckets.map(bucket => bucket.value));
  const ceiling = Math.ceil(max / 4) * 4;
  const selectedBucket = buckets.find(bucket => bucket.label === selected);
  const tickIndexes = [...new Set(dense ? [0, Math.max(0, buckets.length - 1)] : [0, Math.floor(buckets.length / 3), Math.floor(buckets.length * 2 / 3), Math.max(0, buckets.length - 1)])];
  return (
    <View
      {...elementProps(`timeline-chart`, identity)}
      style={[styles.chart, dense && styles.denseChart]}
      accessibilityLabel={`${title} Over Time`}
    >
      <View
        {...elementProps(`timeline-plot-row`, identity)}
        style={styles.plotRow}
        onLayout={event => setPlotHeight(Math.max(30, event.nativeEvent.layout.height))}
      >
        <View
          {...elementProps(`timeline-value-axis`, identity)}
          style={[styles.axis, dense && { width: 22 }]}
        >
          {(dense ? [ceiling, 0] : [ceiling, ceiling / 2, 0]).map(tick => (
            <Text
              key={tick}
              {...elementProps(`timeline-value-tick`, `${identity}-${tick}`)}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.axisText, dense && styles.denseText, { color: palette.faint }]}
            >
              {tick}
            </Text>
          ))}
        </View>
        <View
          {...elementProps(`timeline-plot`, identity)}
          style={styles.plot}
        >
          {[0, 50, 100].map(position => (
            <View
              key={position}
              {...elementProps(`timeline-grid-line`, `${identity}-${position}`)}
              style={[styles.grid, { top: `${position}%`, borderColor: palette.border }]}
            />
          ))}
          <View
            {...elementProps(`timeline-bars`, identity)}
            style={[styles.bars, dense && { gap: 3, paddingHorizontal: 0 }]}
          >
            {buckets.map(bucket => (
              <Bar
                key={bucket.label}
                value={bucket.value / ceiling}
                height={plotHeight - 2}
                color={color}
                reducedMotion={reducedMotion}
                selected={selected === bucket.label}
                label={`${bucket.label}: ${bucket.value} ${unit}`}
                onSelect={() => {
                  onFeedback?.();
                  setSelected(selected === bucket.label ? undefined : bucket.label);
                }}
              />
            ))}
          </View>
        </View>
      </View>
      <View
        {...elementProps(`timeline-time-axis`, identity)}
        style={[styles.ticks, dense && styles.denseTicks]}
      >
        {tickIndexes.map(index => (
          <Text
            key={index}
            {...elementProps(`timeline-time-tick`, `${identity}-${index}`)}
            style={[styles.axisText, dense && styles.denseText, { color: palette.muted }]}
          >
            {buckets[index]?.label ?? ``}
          </Text>
        ))}
      </View>
      {(!dense || selectedBucket) && (
        <Text
          {...elementProps(`timeline-selection-label`, identity)}
          accessibilityLiveRegion={`polite`}
          numberOfLines={1}
          style={[styles.selection, dense && { paddingTop: 3 }, { color: palette.faint }]}
        >
          {selectedBucket ? `${selectedBucket.label} · ${selectedBucket.value} ${unit}` : scope}
        </Text>
      )}
    </View>
  );
};

const TrafficChart = (props: ChartProps) => props.variant === `category` ? (
  <CategoryChart
    {...props}
  />
) : (
  <TimelineChart
    {...props}
  />
);

const styles = StyleSheet.create({
  denseText: { fontSize: 9 },
  denseCategoryName: { fontSize: 11 },
  denseCategoryChart: { minHeight: 62 },
  categoryName: { flex: 1, minWidth: 0, fontSize: 12 },
  plot: { flex: 1, position: `relative` },
  categoryRows: { flex: 1, minHeight: 48 },
  categoryScope: { flex: 1, fontSize: 10 },
  categoryChart: { flex: 1, minHeight: 94 },
  fill: { height: `100%`, borderRadius: 3 },
  densePageButton: { width: 30, height: 30 },
  denseCategoryRow: { gap: 4, minHeight: 30 },
  denseTicks: { marginTop: 3, marginLeft: 22 },
  denseChart: { minHeight: 62, paddingTop: 4 },
  denseCategoryFooter: { gap: 0, minHeight: 32 },
  chart: { flex: 1, minHeight: 80, paddingTop: 8 },
  densePager: { flex: 1, justifyContent: `space-between` },
  track: { height: 6, borderRadius: 3, overflow: `hidden` },
  plotRow: { flex: 1, flexDirection: `row`, minHeight: 25 },
  axisText: { fontSize: 11, fontVariant: [`tabular-nums`] },
  pager: { flexDirection: `row`, alignItems: `center`, gap: 3 },
  categoryCount: { fontSize: 11, fontVariant: [`tabular-nums`] },
  selection: { fontSize: 10, paddingTop: 9, textAlign: `right` },
  categoryRow: { minHeight: 48, gap: 8, justifyContent: `center` },
  empty: { flex: 1, justifyContent: `center`, alignItems: `center` },
  categoryLabel: { flexDirection: `row`, alignItems: `center`, gap: 12 },
  axis: { width: 31, justifyContent: `space-between`, paddingBottom: 0 },
  bar: { width: `100%`, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barTouch: { flex: 1, height: `100%`, justifyContent: `flex-end`, minWidth: 2 },
  pageButton: { width: 44, height: 44, alignItems: `center`, justifyContent: `center` },
  grid: { position: `absolute`, left: 0, right: 0, borderTopWidth: 1, borderStyle: `dashed` },
  bars: { flex: 1, flexDirection: `row`, alignItems: `flex-end`, gap: 6, paddingHorizontal: 2 },
  ticks: { marginLeft: 31, marginTop: 10, flexDirection: `row`, justifyContent: `space-between` },
  categoryFooter: { borderTopWidth: 1, minHeight: 44, flexDirection: `row`, alignItems: `center`, gap: 8 },
});

export default memo(TrafficChart);
