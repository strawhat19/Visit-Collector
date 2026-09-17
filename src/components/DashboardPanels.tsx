import ActivityRows from './ActivityTable';
import type { Palette } from '../ui/theme';
import { elementProps } from '../ui/elementProps';
import { useId, useState, type ReactNode } from 'react';
import { Card, IconButton, TextButton } from '../ui/components';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Activity, AnalyticsSnapshot } from '../state/types';
import { Eye, Radio, MapPin, ScanEye, Monitor, Smartphone, UsersRound, MousePointer2, ExternalLink, ChevronLeft, ChevronRight, UserRoundPlus } from 'lucide-react-native';

export { ActivityRows };

export const numberLabel = (value: number) => new Intl.NumberFormat(`en-US`).format(value);
export const PanelHeader = ({ title, children, palette }: { title: string; children?: ReactNode; palette: Palette }) => {
  const scope = useId();
  return <View {...elementProps(`panel-header`, scope)} style={styles.panelHeader}>
    <Text {...elementProps(`panel-header-title`, scope)} style={[styles.title, { color: palette.text }]}>{title}</Text>{children}
  </View>;
};

export const Metrics = ({ data, palette, compact }: { data: AnalyticsSnapshot; palette: Palette; compact: boolean }) => {
  const scope = useId();
  const metrics = [
    { key: `page-views`, title: `Page Views`, value: data.pageViews, icon: Eye, color: palette.blue },
    { key: `unique-views`, title: `Unique Views`, value: data.uniqueViews, icon: ScanEye, color: palette.green },
    { key: `signups`, title: `Users Signed Up`, value: data.signedUpUsers, icon: UserRoundPlus, color: palette.red },
    { key: `active-visitors`, title: `Active Visitors`, value: data.online, icon: Radio, color: palette.green },
    { key: `total-visits`, title: `Total Visits`, value: data.totalVisits, icon: MousePointer2, color: palette.blue },
    { key: `saved-locations`, title: `Saved Locations`, value: data.savedLocations, icon: MapPin, color: palette.red },
  ];
  return <View {...elementProps(`dashboard-metrics`, scope)} style={[styles.metrics, compact && { gap: 8 }]}>
    {[metrics.slice(0, 3), metrics.slice(3)].map((row, rowIndex) => <View key={rowIndex} {...elementProps(`metric-row`, `${scope}-${rowIndex}`)} style={[styles.metricRow, compact && { gap: 8 }]}>
      {row.map(({ key, title, value, icon: Icon, color }) => <Card key={key} id={`${scope}-${key}`} className={`metric-card`} palette={palette} style={[styles.metric, compact && styles.compactMetric]}>
        <View {...elementProps(`metric-heading`, `${scope}-${key}`)} style={styles.metricLabel}>
          <Icon {...elementProps(`metric-icon`, `${scope}-${key}`)} color={color} size={compact ? 14 : 16} strokeWidth={1.7} />
          <Text {...elementProps(`metric-label`, `${scope}-${key}`)} numberOfLines={2} style={[styles.metricTitle, { color: palette.muted }, compact && { fontSize: 11 }]}>{title}</Text>
        </View>
        <Text {...elementProps(`metric-value`, `${scope}-${key}`)} testID={`metric-value`} numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: palette.text }, compact && { fontSize: 22, lineHeight: 26, marginTop: 2 }]}>{numberLabel(value)}</Text>
      </Card>)}
    </View>)}
  </View>;
};

export const UniqueVisits = ({ events, countries, palette, compact, rows = 3, onViewAll, onSelect }: { events: Activity[]; countries: AnalyticsSnapshot[`countries`]; palette: Palette; compact: boolean; rows?: number; onViewAll: () => void; onSelect: (event: Activity) => void }) => <Card className={`unique-visits-card`} palette={palette} style={[styles.activity, compact && { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 3 }]}>
  <PanelHeader title={`Unique Visits`} palette={palette}><TextButton palette={palette} onPress={onViewAll}>View All</TextButton></PanelHeader>
  <ActivityRows events={events.slice(0, rows)} countries={countries} palette={palette} compact={compact} onSelect={onSelect} />
</Card>;

export const CountryRows = ({ countries, palette, selected, onSelect, limit = 3 }: { countries: AnalyticsSnapshot[`countries`]; palette: Palette; selected?: string; onSelect: (code: string) => void; limit?: number }) => {
  const scope = useId();
  return <View {...elementProps(`country-rows`, scope)} style={{ paddingBottom: 5, paddingHorizontal: 18 }}>
    {(countries.length ? countries : [{ code: `--`, name: `No Visits Yet`, count: 0, latitude: null, longitude: null }]).slice(0, limit).map(country => <Pressable key={country.code} {...elementProps(`country-row`, `${scope}-${country.code}`)} accessibilityRole={`button`} accessibilityLabel={`${country.name}: ${country.count} Visit(s)`} aria-pressed={selected === country.code} accessibilityState={{ selected: selected === country.code }} onPress={() => onSelect(country.code)}
      style={[styles.countryRow, { borderTopColor: palette.border }]}>
      <View
        style={styles.countryCode}
        {...elementProps(`country-code-badge`, `${scope}-${country.code}`)}
      >
        {country.code === `unknown` || country.code === `--` ? <Text {...elementProps(`country-unknown-label`, `${scope}-${country.code}`)} style={[styles.tiny, { color: palette.muted }]}>—</Text> : country.code.length === 2 ? <Text {...elementProps(`country-code-label`, `${scope}-${country.code}`)} style={[styles.tiny, { color: palette.muted, fontWeight: `600` }]}>{country.code.toUpperCase()}</Text> : <MapPin {...elementProps(`country-location-icon`, `${scope}-${country.code}`)} size={15} color={palette.muted} strokeWidth={1.8} />}
      </View>
      <Text {...elementProps(`country-name`, `${scope}-${country.code}`)} numberOfLines={1} style={[styles.countryName, { color: palette.text }]}>{country.name}</Text><Text {...elementProps(`country-visit-count`, `${scope}-${country.code}`)} style={[styles.countryCount, { color: palette.text }]}>{numberLabel(country.count)}</Text>
    </Pressable>)}
  </View>;
};

export const Breakdown = ({ data, palette, kind, onSource }: { data: AnalyticsSnapshot; palette: Palette; kind: `audience` | `sources`; onSource: (name: string) => void }) => {
  const scope = useId();
  const [height, setHeight] = useState(400);
  const [page, setPage] = useState(0);
  const items = kind === `sources` ? data.sources : data.devices.map(device => ({ ...device, percent: data.visitors ? device.count / Math.max(1, data.devices.reduce((total, row) => total + row.count, 0)) * 100 : 0 }));
  const pageSize = Math.max(1, Math.min(6, Math.floor((height - 155) / 64)));
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  return <Card id={scope} className={`breakdown-card`} palette={palette} style={styles.breakdown}>
    <View {...elementProps(`breakdown-height-probe`, scope)} style={{ top: 0, left: 0, right: 0, bottom: 0, position: `absolute`, pointerEvents: `none` }} onLayout={event => setHeight(event.nativeEvent.layout.height)} />
    <PanelHeader title={kind === `sources` ? `Traffic Sources` : `Devices`} palette={palette}><Text {...elementProps(`breakdown-category-count`, scope)} style={[styles.small, { color: palette.muted }]}>{items.length} {kind === `sources` ? `Sources` : `Types`}</Text></PanelHeader>
    <View {...elementProps(`breakdown-rows`, scope)} style={styles.breakdownRows}>{items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((item, index) => <Pressable key={item.name} {...elementProps(`breakdown-item`, `${scope}-${item.name}`)} accessibilityRole={`button`} onPress={() => onSource(item.name)} style={styles.breakdownItem}>
      <View {...elementProps(`breakdown-item-label-row`, `${scope}-${item.name}`)} style={styles.inline}>{kind === `sources` ? <ExternalLink {...elementProps(`breakdown-source-icon`, `${scope}-${item.name}`)} size={18} color={palette.muted} /> : item.name.toLowerCase().includes(`mobile`) ? <Smartphone {...elementProps(`breakdown-mobile-icon`, `${scope}-${item.name}`)} size={18} color={palette.muted} /> : <Monitor {...elementProps(`breakdown-desktop-icon`, `${scope}-${item.name}`)} size={18} color={palette.muted} />}<Text {...elementProps(`breakdown-item-name`, `${scope}-${item.name}`)} style={[styles.countryName, { color: palette.text }]}>{item.name}</Text><Text {...elementProps(`breakdown-item-count`, `${scope}-${item.name}`)} style={[styles.small, { color: palette.muted }]}>{item.count} · {item.percent.toFixed(0)}%</Text></View>
      <View {...elementProps(`breakdown-item-track`, `${scope}-${item.name}`)} style={[styles.track, { backgroundColor: palette.raised }]}><View {...elementProps(`breakdown-item-bar`, `${scope}-${item.name}`)} style={{ height: 5, borderRadius: 3, width: `${Math.max(1, item.percent)}%`, backgroundColor: [palette.blue, palette.green, palette.red][index % 3] }} /></View>
    </Pressable>)}</View>
    <View {...elementProps(`breakdown-footer`, scope)} style={[styles.breakdownFoot, { borderColor: palette.border }]}><UsersRound {...elementProps(`breakdown-visitors-icon`, scope)} size={18} color={palette.blue} /><Text {...elementProps(`breakdown-visitors-total`, scope)} style={[styles.small, { flex: 1, color: palette.muted }]}>{numberLabel(data.visitors)} Visitor(s)</Text>
      {pages > 1 && <View {...elementProps(`breakdown-pagination`, scope)} style={styles.inline}><IconButton small icon={ChevronLeft} palette={palette} label={`Previous Breakdown Page`} disabled={!currentPage} onPress={() => setPage(currentPage - 1)} /><Text {...elementProps(`breakdown-page-label`, scope)} style={[styles.tiny, { color: palette.muted }]}>{currentPage + 1}/{pages}</Text><IconButton small icon={ChevronRight} palette={palette} label={`Next Breakdown Page`} disabled={currentPage >= pages - 1} onPress={() => setPage(currentPage + 1)} /></View>}
    </View>
  </Card>;
};

export const styles = StyleSheet.create({
  metrics: { gap: 10 },
  tiny: { fontSize: 11 },
  small: { fontSize: 13 },
  countryName: { flex: 1, fontSize: 13 },
  breakdownItem: { gap: 10, minHeight: 42 },
  metricRow: { gap: 10, flexDirection: `row` },
  compactMetric: { padding: 8, minHeight: 72 },
  metric: { flex: 1, padding: 12, minHeight: 88 },
  breakdown: { flex: 1, minHeight: 0, padding: 22 },
  breakdownRows: { flex: 1, gap: 16, paddingTop: 20 },
  metricTitle: { flex: 1, fontSize: 12, lineHeight: 14 },
  track: { height: 5, borderRadius: 3, overflow: `hidden` },
  inline: { flexDirection: `row`, alignItems: `center`, gap: 8 },
  title: { fontSize: 16, fontWeight: `600`, letterSpacing: -0.25 },
  activity: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  countryCount: { fontSize: 15, fontWeight: `600`, fontVariant: [`tabular-nums`] },
  metricLabel: { gap: 6, minHeight: 28, alignItems: `center`, flexDirection: `row` },
  countryCode: { width: 30, height: 22, borderRadius: 4, alignItems: `center`, justifyContent: `center` },
  panelHeader: { minHeight: 30, flexDirection: `row`, justifyContent: `space-between`, alignItems: `center`, gap: 10 },
  breakdownFoot: { gap: 8, flexDirection: `row`, alignItems: `center`, paddingTop: 12, minHeight: 48, borderTopWidth: 1 },
  countryRow: { minHeight: 43, flexDirection: `row`, alignItems: `center`, gap: 12, borderTopWidth: 1, paddingHorizontal: 3 },
  metricValue: { fontSize: 26, lineHeight: 32, marginTop: 4, fontWeight: `600`, letterSpacing: -1, fontVariant: [`tabular-nums`] },
});
