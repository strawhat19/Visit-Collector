import type { Palette } from '../ui/theme';
import { useId, useMemo, useState } from 'react';
import { elementProps } from '../ui/elementProps';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { List, Network, ChevronRight } from 'lucide-react-native';
import type { Activity, AnalyticsSnapshot } from '../state/types';

type ColumnKey = `status` | `source` | `page` | `ip` | `location` | `time`;
type Column = { key: ColumnKey; label: string; weight: number };
type TableView = `network` | `traffic`;

export type ActivityTableProps = {
  events: Activity[];
  palette: Palette;
  compact?: boolean;
  onSelect: (event: Activity) => void;
  countries?: AnalyticsSnapshot[`countries`];
};

const columns: Column[] = [
  { key: `status`, label: `Status`, weight: 1.1 },
  { key: `source`, label: `Source`, weight: 0.85 },
  { key: `page`, label: `Page`, weight: 1.05 },
  { key: `ip`, label: `IP Address`, weight: 1.1 },
  { key: `location`, label: `Location`, weight: 1.25 },
  { key: `time`, label: `Time`, weight: 1.15 },
];
const views = [
  { value: `network` as const, label: `Network`, icon: Network },
  { value: `traffic` as const, label: `Traffic`, icon: List },
];
const dateFormat = new Intl.DateTimeFormat(undefined, { day: `2-digit`, year: `numeric`, month: `2-digit` });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: `numeric`, minute: `2-digit`, second: `2-digit` });

export const ActivityTable = ({ events, palette, countries, compact = false, onSelect }: ActivityTableProps) => {
  const scope = useId();
  const [view, setView] = useState<TableView>(`network`);
  const locations = useMemo(() => new Map(countries?.map(country => [country.code, country.name]) ?? []), [countries]);
  const visibleColumns = compact ? columns.filter(column => view === `network` ? [`ip`, `location`, `time`].includes(column.key) : [`status`, `source`, `page`].includes(column.key)) : columns;
  return (
    <View
      {...elementProps(`activity-table`, scope)}
      style={styles.table}
    >
      {compact && (
        <View
          {...elementProps(`activity-table-views`, scope)}
          accessibilityRole={`tablist`}
          accessibilityLabel={`Visit Columns`}
          style={[styles.tabs, { borderColor: palette.border, backgroundColor: palette.bg }]}
        >
          {views.map(({ value, label, icon: Icon }) => (
            <Pressable
              key={value}
              {...elementProps(`activity-table-view`, `${scope}-${value}`)}
              onPress={() => setView(value)}
              accessibilityRole={`tab`}
              accessibilityLabel={label}
              aria-selected={view === value}
              accessibilityState={{ selected: view === value }}
              style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.7 : 1, backgroundColor: view === value ? palette.selected : `transparent` }]}
            >
              <Icon
                {...elementProps(`activity-table-view-icon`, `${scope}-${value}`)}
                size={13}
                strokeWidth={1.8}
                color={view === value ? palette.blue : palette.muted}
              />
              <Text
                {...elementProps(`activity-table-view-label`, `${scope}-${value}`)}
                style={[styles.tabText, { color: view === value ? palette.blue : palette.muted }]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View
        {...elementProps(`activity-table-headings`, scope)}
        style={[styles.headings, compact && styles.compactRow, { borderColor: palette.border }]}
      >
        {visibleColumns.map(column => (
          <Text
            key={column.key}
            {...elementProps(`activity-column-heading`, `${scope}-${column.key}`)}
            numberOfLines={1}
            accessibilityRole={`header`}
            accessibilityLabel={column.key === `time` ? `Time In Your Local Time Zone` : column.label}
            style={[styles.cell, styles.headingText, { flex: column.weight, color: palette.muted }]}
          >
            {column.label}
          </Text>
        ))}
        <View
          {...elementProps(`activity-open-heading-space`, scope)}
          style={styles.openIcon}
        />
      </View>
      {events.length ? events.map(event => {
        const identity = `${scope}-${event.id}`;
        const date = new Date(event.at);
        const validDate = !Number.isNaN(date.getTime());
        const ip = event.ipAddress?.trim() || `Not Collected`;
        const location = locations.get(event.countryCode) ?? `Not Shared`;
        const status = event.type === `visit` ? `New Visitor` : `Page Viewed`;
        const timeLabel = validDate ? date.toLocaleString() : `Unknown Time`;
        const values = { ip, status, location, page: event.path, source: event.source, time: timeLabel };
        return (
          <Pressable
            key={event.id}
            {...elementProps(`activity-table-row`, identity)}
            onPress={() => onSelect(event)}
            accessibilityRole={`button`}
            accessibilityHint={`Open All Visit Details`}
            accessibilityLabel={`${status}. Source: ${event.source}. Page: ${event.path}. IP Address: ${ip}. Location: ${location}. Time: ${timeLabel}`}
            style={({ pressed }) => [styles.row, compact && styles.compactRow, { borderColor: palette.border, backgroundColor: pressed ? palette.raised : `transparent` }]}
          >
            {visibleColumns.map(column => column.key === `status` ? (
              <View
                key={column.key}
                {...elementProps(`activity-actions-cell actionsCell`, identity)}
                style={[styles.cell, styles.actionsCell, { flex: column.weight }]}
              >
                <View
                  {...elementProps(`activity-row-status rowStatus`, identity)}
                  style={styles.rowStatus}
                >
                  <View
                    {...elementProps(`activity-status-dot-wrap statusDotWrap`, identity)}
                    style={styles.statusDotWrap}
                  >
                    <View
                      {...elementProps(`activity-status-dot statusDot`, identity)}
                      style={[styles.statusDot, { backgroundColor: event.type === `visit` ? palette.green : palette.faint }]}
                    />
                  </View>
                  <Text
                    {...elementProps(`activity-status-text statusText`, identity)}
                    numberOfLines={1}
                    style={[styles.statusText, compact && styles.compactText, { color: palette.text }]}
                  >
                    {status}
                  </Text>
                </View>
              </View>
            ) : column.key === `time` ? (
              <View
                key={column.key}
                {...elementProps(`activity-time-cell`, identity)}
                style={[styles.cell, styles.timeCell, { flex: column.weight }]}
              >
                <Text
                  {...elementProps(`activity-date`, identity)}
                  numberOfLines={1}
                  style={[styles.timeText, { color: palette.text }]}
                >
                  {validDate ? dateFormat.format(date) : `Unknown Time`}
                </Text>
                {validDate && (
                  <Text
                    {...elementProps(`activity-clock-time`, identity)}
                    numberOfLines={1}
                    style={[styles.timeText, { color: palette.muted }]}
                  >
                    {timeFormat.format(date)}
                  </Text>
                )}
              </View>
            ) : (
              <Text
                key={column.key}
                {...elementProps(`activity-${column.key}-cell`, identity)}
                numberOfLines={1}
                accessibilityLabel={`${column.label}: ${values[column.key]}`}
                style={[styles.cell, styles.cellText, compact && styles.compactText, { flex: column.weight, color: column.key === `ip` || column.key === `location` ? palette.text : palette.muted }]}
              >
                {values[column.key]}
              </Text>
            ))}
            <ChevronRight
              {...elementProps(`activity-open-details-icon`, identity)}
              size={13}
              accessible={false}
              color={palette.faint}
              style={styles.openIcon}
            />
          </Pressable>
        );
      }) : (
        <View
          {...elementProps(`activity-table-empty`, scope)}
          style={styles.empty}
        >
          <Text
            {...elementProps(`activity-table-empty-label`, scope)}
            style={[styles.cellText, { color: palette.muted }]}
          >
            Your Next Visit Will Appear Here
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  table: { minWidth: 0 },
  compactRow: { gap: 8 },
  cellText: { fontSize: 12 },
  compactText: { fontSize: 11 },
  cell: { minWidth: 0, flexShrink: 1 },
  openIcon: { width: 13, flexShrink: 0 },
  actionsCell: { justifyContent: `center` },
  timeText: { fontSize: 11, lineHeight: 15 },
  tabText: { fontSize: 11, fontWeight: `600` },
  timeCell: { gap: 1, justifyContent: `center` },
  headingText: { fontSize: 11, fontWeight: `600` },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusDotWrap: { width: 10, flexShrink: 0, alignItems: `center` },
  statusText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: `500` },
  empty: { minHeight: 48, alignItems: `center`, justifyContent: `center` },
  rowStatus: { gap: 6, minWidth: 0, flexDirection: `row`, alignItems: `center` },
  row: { gap: 12, minHeight: 48, borderBottomWidth: 1, flexDirection: `row`, alignItems: `center` },
  headings: { gap: 12, height: 32, borderBottomWidth: 1, flexDirection: `row`, alignItems: `center` },
  tab: { gap: 5, borderRadius: 4, paddingHorizontal: 10, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
  tabs: { height: 32, padding: 2, borderWidth: 1, borderRadius: 7, marginBottom: 8, flexDirection: `row`, alignSelf: `flex-start` },
});

export default ActivityTable;
