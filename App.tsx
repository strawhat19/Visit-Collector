import './src/styles/platform';
import type { ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import Logo from './src/components/Logo';
import { palettes } from './src/ui/theme';
import { StatusBar } from 'expo-status-bar';
import Sidebar from './src/components/Sidebar';
import { devEnv } from './src/config/environment';
import Geography from './src/components/Geography';
import { useEffect, useMemo, useState } from 'react';
import AuthDialog from './src/components/AuthDialog';
import ModalShell from './src/components/ModalShell';
import { elementProps } from './src/ui/elementProps';
import HeaderBrand from './src/components/HeaderBrand';
import { useCollector } from './src/state/useCollector';
import AnalyticsGrid from './src/components/AnalyticsGrid';
import LocationDialog from './src/components/LocationDialog';
import Footer, { footerHeight } from './src/components/Footer';
import type { Activity, LocationInput } from './src/state/types';
import PreferencesDialog from './src/components/PreferencesDialog';
import { Card, IconButton, Segmented, TextButton } from './src/ui/components';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityRows, Breakdown, CountryRows, Metrics, PanelHeader, UniqueVisits, numberLabel } from './src/components/DashboardPanels';
import { AccessibilityInfo, ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import { Home, Globe2, Map, UsersRound, ChartNoAxesColumn, List, Settings, MapPin, Bell, Sun, Moon, UserRound, ChevronLeft, ChevronRight, Radio, ArrowUpRight, X, ListFilter, MousePointer2, Eye, AlertCircle } from 'lucide-react-native';

type Tab = `overview` | `audience` | `sources` | `activity`;
type Detail = { title: string; fields: Array<[string, string]> };

const DashboardViewport = ({ children, scrollable }: { children: ReactNode; scrollable: boolean }) => scrollable
  ? (
    <ScrollView
      {...elementProps(`dashboard-scroll`)}
      testID={`dashboard-scroll`}
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {children}
    </ScrollView>
  )
  : children;

const navigation = [
  { icon: Home, value: `overview`, title: `Overview` },
  { icon: UsersRound, value: `audience`, title: `Audience` },
  { value: `sources`, title: `Sources`, icon: ChartNoAxesColumn },
  { icon: List, value: `activity`, title: `Activity` },
] as const;
const geoTabs = [{ icon: Globe2, value: `globe` as const, label: `Globe` }, { icon: Map, value: `map` as const, label: `Map` }];
const mobileTabs = [{ icon: Globe2, label: `Geography`, value: `geography` as const }, { label: `Charts`, icon: ChartNoAxesColumn, value: `traffic` as const }, { icon: Eye, label: `Stats`, value: `stats` as const }];
const eventTabs = [{ icon: ListFilter, label: `All`, value: `all` as const }, { label: `Visits`, icon: MousePointer2, value: `visit` as const }, { icon: Eye, label: `Page Views`, value: `page` as const }];

const Collector = () => {
  const collector = useCollector();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const usableHeight = height - insets.top - insets.bottom;
  const systemTheme = useColorScheme();
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<Tab>(`overview`);
  const [expanded, setExpanded] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const [focusRequest, setFocusRequest] = useState(0);
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>();
  const [geoMode, setGeoMode] = useState<`map` | `globe`>(`globe`);
  const [selectedCountry, setSelectedCountry] = useState<string>();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [eventFilter, setEventFilter] = useState<`all` | `visit` | `page`>(`all`);
  const [mobilePanel, setMobilePanel] = useState<`geography` | `traffic` | `stats`>(`geography`);
  const mobile = width < 880 || usableHeight < 700;
  const viewportHeight = usableHeight - (mobile ? footerHeight.mobile : footerHeight.web);
  const shortViewport = mobile && viewportHeight < 576;
  const compact = viewportHeight < 750 || width < 1100;
  const dark = collector.preferences.theme === `system` ? systemTheme !== `light` : collector.preferences.theme === `dark`;
  const palette = dark ? palettes.dark : palettes.light;
  const reducedMotion = systemReducedMotion || collector.preferences.reducedMotion;
  const { data, user, mode, visits } = collector;
  const filterSpace = mobile && (uniqueOnly || sourceFilter) ? 44 : 0;
  const pageSize = Math.max(1, Math.min(10, Math.floor((viewportHeight - (mobile ? 445 : 363) - filterSpace) / 48)));
  const minimumPanelHeight = mobile ? mobilePanel === `stats` ? 156 : 320 : compact ? 470 : 504;
  const previewSpace = viewportHeight - (mobile ? 91 + 61 + 20 + 42 + 20 + 121 : 74 + 40 + 16 + 90) - minimumPanelHeight;
  const previewRows = Math.max(0, Math.min(mobile ? 2 : 3, Math.floor(previewSpace / 48)));
  const filteredEvents = (uniqueOnly ? data.uniqueVisits : data.activity).filter(event => (eventFilter === `all` || event.type === eventFilter) && (!sourceFilter || event.source === sourceFilter));
  const pages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const visibleEvents = filteredEvents.slice(Math.min(page, pages - 1) * pageSize, (Math.min(page, pages - 1) + 1) * pageSize);
  const points = useMemo(() => data.countries.flatMap(country => country.latitude !== null && country.longitude !== null ? [{ id: country.code, label: country.name, latitude: country.latitude, longitude: country.longitude, value: country.count, color: palette.red }] : []), [data.countries, palette.red]);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReducedMotion).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener(`reduceMotionChanged`, setSystemReducedMotion);
    if (Platform.OS === `web`) document.title = `Visit Collector`;
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!collector.ready || tab !== `overview`) return;
    devEnv && console.log(`Visits`, visits);
  }, [collector.ready, tab, visits]);
  useEffect(() => {
    setPage(0);
    setSourceFilter(undefined);
    setUniqueOnly(false);
  }, [mode]);
  useEffect(() => {
    if (Platform.OS === `web`) document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(undefined), 4000);
    return () => clearTimeout(timer);
  }, [message]);
  const feedback = () => {
    if (collector.preferences.haptics) Haptics.selectionAsync().catch(() => undefined);
  };
  const navigate = (next: Tab) => {
    feedback();
    if (next !== tab) collector.recordPage(next === `overview` ? `/` : `/${next}`);
    setTab(next);
    setPage(0);
    setEventFilter(`all`);
    setSourceFilter(undefined);
    setUniqueOnly(false);
  };
  const goHome = () => {
    navigate(`overview`);
    setMobilePanel(`geography`);
  };
  const changeMode = () => {
    feedback();
    setSelectedCountry(undefined);
    collector.setMode(mode === `local` ? `demo` : `local`).catch(error => setMessage(error.message));
  };
  const toggleTheme = () => {
    feedback();
    collector.updatePreferences({ theme: dark ? `light` : `dark` }).catch(error => setMessage(error.message));
  };
  const inspectEvent = (event: Activity) => setDetail({ title: event.type === `visit` ? `Visit Details` : `Page View Details`, fields: [[`Source`, event.source], [`Page`, event.path], [`IP Address`, event.ipAddress ?? `Not Collected`], [`Location`, data.countries.find(country => country.code === event.countryCode)?.name ?? `Not Shared`], [`Time`, new Date(event.at).toLocaleString()], [`Data`, mode === `demo` ? `Demo · Simulated Event` : `Recorded On This Device`]] });
  const selectCountry = (code: string) => {
    feedback();
    setSelectedCountry(current => current === code ? undefined : code);
  };
  const saveLocation = async (location: LocationInput) => {
    const code = await collector.addLocation(location);
    setSelectedCountry(code);
    setFocusRequest(value => value + 1);
    setMobilePanel(`geography`);
    feedback();
    setMessage(`Location Saved`);
  };
  const locations = selectedCountry ? [...data.countries].sort((left, right) => Number(right.code === selectedCountry) - Number(left.code === selectedCountry)) : data.countries;
  const geography = (
    <Card
      id={`locations`}
      className={`locations-card`}
      palette={palette}
      style={styles.geoCard}
    >
      <View
        {...elementProps(`app-geo-header`)}
        style={[styles.geoHeader, compact && { padding: 12 }]}
      >
        <View
          {...elementProps(`app-locations-title`)}
          style={styles.locationsTitle}
        >
          <Pressable
            style={styles.inline}
            accessibilityRole={`button`}
            onPress={() => setCountriesOpen(true)}
            accessibilityLabel={`View All Locations`}
            {...elementProps(`locations-open-button`)}
          >
            <MapPin
              size={15}
              color={palette.blue}
              {...elementProps(`app-map-pin-icon`)}
            />
            <Text
              {...elementProps(`app-card-title-text`)}
              style={[styles.cardTitle, { color: palette.text }]}
            >
              Locations
            </Text>
            <Text
              {...elementProps(`locations-count`)}
              style={[styles.secondary, { color: palette.muted }]}
            >
              {`· `}
              {data.countries.length}
            </Text>
          </Pressable>
          <Pressable
            {...elementProps(`app-add-location-button`)}
            accessibilityRole={`button`}
            accessibilityLabel={`Add Your Location`}
            onPress={() => {
              feedback();
              setLocationOpen(true);
            }}
            style={[styles.addLocation, { borderColor: palette.border, backgroundColor: palette.raised }]}
          >
            <MapPin
              {...elementProps(`app-map-pin-icon`, 2)}
              size={14}
              color={palette.blue}
            />
            <Text
              {...elementProps(`app-add-your-location`)}
              style={{ color: palette.blue, fontSize: 12, fontWeight: `500` }}
            >
              Add Your Location
            </Text>
          </Pressable>
        </View>
        <Segmented
          id={`locations-view`}
          stretch
          options={geoTabs}
          value={geoMode}
          palette={palette}
          small={compact}
          onChange={value => {
            feedback();
            setGeoMode(value);
          }}
        />
      </View>
      <View
        {...elementProps(`app-earth`)}
        style={styles.earth}
      >
        <Geography
          mode={geoMode}
          dark={dark}
          reducedMotion={reducedMotion}
          points={points}
          focusRequest={focusRequest}
          selectedCountry={selectedCountry}
          onSelectCountry={selectCountry}
        />
      </View>
      <CountryRows
        countries={locations}
        palette={palette}
        selected={selectedCountry}
        limit={compact ? 2 : 3}
        onSelect={selectCountry}
      />
    </Card>
  );
  const traffic = (
    <View
      {...elementProps(`app-traffic`)}
      style={styles.traffic}
    >
      <AnalyticsGrid
        data={data}
        palette={palette}
        mode={mode}
        reducedMotion={reducedMotion}
        compact={compact || mobile}
        onFeedback={feedback}
      />
      {!mobile && (
        <Metrics
          data={data}
          palette={palette}
          compact={compact}
        />
      )}
    </View>
  );
  const activityView = (
    <Card
      id={`activity`}
      className={`activity-card`}
      palette={palette}
      style={[styles.fullPanel, mobile && { padding: 14 }]}
    >
      <PanelHeader
        title={uniqueOnly ? `Unique Visits` : `Activity`}
        palette={palette}
      >
        <Text
          {...elementProps(`activity-event-count`)}
          style={[styles.secondary, { color: palette.muted }]}
        >
          {numberLabel(filteredEvents.length)}
          {` Event(s)`}
        </Text>
      </PanelHeader>
      <View
        {...elementProps(`app-filter-row`)}
        style={styles.filterRow}
      >
        <Segmented
          id={`activity-filter`}
          options={eventTabs}
          value={eventFilter}
          palette={palette}
          small
          onChange={value => {
            setEventFilter(value);
            setPage(0);
            feedback();
          }}
        />
        {uniqueOnly && (
          <Pressable
            {...elementProps(`app-filter-chip-button`)}
            accessibilityRole={`button`}
            accessibilityLabel={`Show All Activity`}
            onPress={() => {
              setUniqueOnly(false);
              setPage(0);
            }}
            style={[styles.filterChip, { backgroundColor: palette.selected }]}
          >
            <Text
              {...elementProps(`app-unique-visits`)}
              style={{ color: palette.blue, fontSize: 12 }}
            >
              Unique Visits
            </Text>
            <X
              {...elementProps(`app-x-icon`)}
              size={13}
              color={palette.blue}
            />
          </Pressable>
        )}
        {sourceFilter && (
          <Pressable
            {...elementProps(`app-filter-chip-button`, 2)}
            accessibilityRole={`button`}
            accessibilityLabel={`Clear Source Filter`}
            onPress={() => {
              setSourceFilter(undefined);
              setPage(0);
            }}
            style={[styles.filterChip, { backgroundColor: palette.selected }]}
          >
            <Text
              {...elementProps(`app-source-filter-name`)}
              style={{ color: palette.blue, fontSize: 12 }}
            >
              {sourceFilter}
            </Text>
            <X
              {...elementProps(`app-x-icon`, 2)}
              size={13}
              color={palette.blue}
            />
          </Pressable>
        )}
      </View>
      <View
        {...elementProps(`activity-list`)}
        style={{ flex: 1 }}
      >
        <ActivityRows
          events={visibleEvents}
          countries={data.countries}
          palette={palette}
          compact={mobile}
          onSelect={inspectEvent}
        />
      </View>
      <View
        {...elementProps(`app-pagination`)}
        style={[styles.pagination, { borderColor: palette.border }]}
      >
        <Text
          {...elementProps(`activity-page-label`)}
          style={[styles.secondary, { color: palette.muted }]}
        >
          {`Page `}
          {Math.min(page + 1, pages)}
          {` Of `}
          {pages}
        </Text>
        <View
          {...elementProps(`app-inline`)}
          style={styles.inline}
        >
          <IconButton
            icon={ChevronLeft}
            label={`Previous Activity Page`}
            palette={palette}
            disabled={page <= 0}
            onPress={() => setPage(value => Math.max(0, value - 1))}
          />
          <IconButton
            icon={ChevronRight}
            label={`Next Activity Page`}
            palette={palette}
            disabled={page >= pages - 1}
            onPress={() => setPage(value => Math.min(pages - 1, value + 1))}
          />
        </View>
      </View>
    </Card>
  );
  if (!collector.ready) return (
    <View
      {...elementProps(`app-loading`)}
      style={[styles.loading, { backgroundColor: palette.bg }]}
    >
      <Logo
        size={55}
      />
      <ActivityIndicator
        {...elementProps(`app-activity-indicator`)}
        size={`small`}
        color={palette.blue}
      />
      <Text
        {...elementProps(`app-opening-visit-collector`)}
        style={{ color: palette.muted }}
      >
        Opening Visit Collector
      </Text>
    </View>
  );
  return (
    <SafeAreaView
      {...elementProps(`app-root`)}
      style={[styles.root, { backgroundColor: palette.bg }]}
    >
      <StatusBar
        style={dark ? `light` : `dark`}
      />
      <View
        {...elementProps(`app-shell`)}
        style={styles.shell}
      >
        {!mobile && (
          <Sidebar
            items={navigation}
            active={tab}
            onHome={goHome}
            expanded={expanded}
            palette={palette}
            reducedMotion={reducedMotion}
            onNavigate={value => navigate(value as Tab)}
            onToggle={() => {
              feedback();
              setExpanded(value => !value);
            }}
            onSettings={() => {
              feedback();
              setSettingsOpen(true);
            }}
          />
        )}
        <View
          {...elementProps(`app-workspace`)}
          style={styles.workspace}
        >
          <View
            {...elementProps(`app-header`)}
            style={[styles.header, { borderColor: palette.border, backgroundColor: palette.rail }, mobile && styles.mobileHeader]}
          >
            <View
              {...elementProps(`app-header-main`)}
              style={[styles.headerMain, mobile && { gap: 7 }]}
            >
              <HeaderBrand
                onHome={goHome}
                mobile={mobile}
                palette={palette}
                expanded={expanded}
                narrow={width < 380}
                reducedMotion={reducedMotion}
              />
              {!mobile && (
                <View
                  {...elementProps(`app-greeting`)}
                  style={[styles.greeting, { borderColor: palette.border }, expanded && styles.expandedGreeting]}
                >
                  <Text
                    {...elementProps(`app-greeting-text`)}
                    numberOfLines={1}
                    style={[styles.greetingText, { color: palette.muted }]}
                  >
                    {`Welcome `}
                    <Text
                      {...elementProps(`app-visitor-name`)}
                      style={{ color: palette.text }}
                    >
                      {user?.username ?? `Guest`}
                    </Text>
                    {` (Visitor #`}
                    {collector.visitorNumber}
                    )
                  </Text>
                </View>
              )}
              <View
                {...elementProps(`app-toolbar`)}
                style={styles.toolbar}
              >
                {!mobile && (
                  <Pressable
                    {...elementProps(`app-data-mode-button`)}
                    testID={`data-mode`}
                    accessibilityRole={`button`}
                    accessibilityLabel={mode === `local` ? `Switch To Demo Data` : `Switch To Local Data`}
                    onPress={changeMode}
                    style={[styles.dataMode, { backgroundColor: palette.raised, borderColor: palette.border }]}
                  >
                    <Radio
                      {...elementProps(`app-radio-icon`)}
                      size={13}
                      color={mode === `demo` ? palette.blue : palette.green}
                    />
                    <Text
                      {...elementProps(`desktop-data-mode-label`)}
                      style={{ color: palette.muted, fontSize: 12, fontWeight: `500` }}
                    >
                      {mode === `demo` ? `Demo Data` : `This Device`}
                    </Text>
                  </Pressable>
                )}
                <IconButton
                  icon={dark ? Sun : Moon}
                  label={dark ? `Switch To Light Mode` : `Switch To Dark Mode`}
                  palette={palette}
                  onPress={toggleTheme}
                />
                <IconButton
                  icon={Bell}
                  label={`Notifications`}
                  palette={palette}
                  onPress={() => {
                    feedback();
                    setNotificationsOpen(true);
                  }}
                />
                <Pressable
                  {...elementProps(`app-avatar-button`)}
                  testID={`account-button`}
                  accessibilityRole={`button`}
                  accessibilityLabel={user ? `Open Account` : `Sign In`}
                  onPress={() => {
                    feedback();
                    setAuthOpen(true);
                  }}
                  style={[styles.avatar, { backgroundColor: palette.raised, borderColor: palette.border }]}
                >
                  {user ? (
                    <Text
                      {...elementProps(`app-visitor-name`, 2)}
                      style={{ color: palette.text, fontSize: 13, fontWeight: `600` }}
                    >
                      {user.username.slice(0, 2).toUpperCase()}
                    </Text>
                  ) : (
                    <UserRound
                      {...elementProps(`app-user-round-icon`)}
                      size={19}
                      color={palette.muted}
                    />
                  )}
                </Pressable>
              </View>
            </View>
            {mobile && (
              <View
                {...elementProps(`app-mobile-greeting`)}
                style={styles.mobileGreeting}
              >
                <Text
                  {...elementProps(`app-greeting-text`, 2)}
                  numberOfLines={1}
                  style={[styles.greetingText, { color: palette.muted, fontSize: 12, flex: 1 }]}
                >
                  {`Welcome `}
                  <Text
                    {...elementProps(`app-visitor-name`, 3)}
                    style={{ color: palette.text }}
                  >
                    {user?.username ?? `Guest`}
                  </Text>
                  {` (Visitor #`}
                  {collector.visitorNumber}
                  )
                </Text>
                <Pressable
                  {...elementProps(`app-mobile-mode-button`)}
                  accessibilityRole={`button`}
                  accessibilityLabel={mode === `local` ? `Switch To Demo Data` : `Switch To Local Data`}
                  onPress={changeMode}
                  style={styles.mobileMode}
                >
                  <View
                    {...elementProps(`app-mode-dot`)}
                    style={[styles.modeDot, { backgroundColor: mode === `demo` ? palette.blue : palette.green }]}
                  />
                  <Text
                    {...elementProps(`mobile-data-mode-label`)}
                    style={{ color: palette.muted, fontSize: 11 }}
                  >
                    {mode === `demo` ? `Demo Data` : `This Device`}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          <DashboardViewport
            key={tab}
            scrollable={shortViewport}
          >
            <View
              {...elementProps(`app-content`)}
              testID={`dashboard`}
              style={[styles.content, mobile && { padding: compact ? 10 : 12, gap: 10 }, shortViewport && { minHeight: 520 }]}
            >
              {collector.storageError && (
                <Pressable
                  {...elementProps(`storage-details-button`)}
                  accessibilityRole={`button`}
                  accessibilityLabel={`Storage Details`}
                  style={styles.inline}
                  onPress={() => setDetail({ title: `Storage Unavailable`, fields: [[`Status`, collector.storageError ?? ``]] })}
                >
                  <AlertCircle
                    {...elementProps(`app-alert-circle-icon`)}
                    size={15}
                    color={palette.red}
                  />
                  <Text
                    {...elementProps(`app-storage-message`)}
                    numberOfLines={1}
                    style={{ color: palette.red, fontSize: 12 }}
                  >
                    {collector.storageError}
                  </Text>
                </Pressable>
              )}
              {tab === `overview` ? (
                <>
                  {mobile && (
                    <View
                      {...elementProps(`app-mobile-tab-row`)}
                      style={styles.mobileTabRow}
                    >
                      <View
                        {...elementProps(`mobile-panel-tabs`)}
                        style={{ flex: 1 }}
                      >
                        <Segmented
                          id={`mobile-dashboard`}
                          stretch
                          options={mobileTabs}
                          value={mobilePanel}
                          palette={palette}
                          small
                          onChange={value => {
                            feedback();
                            setMobilePanel(value);
                          }}
                        />
                      </View>
                      <IconButton
                        icon={Settings}
                        label={`Settings`}
                        palette={palette}
                        small
                        onPress={() => setSettingsOpen(true)}
                      />
                    </View>
                  )}
                  <View
                    {...elementProps(`app-top-grid`)}
                    style={[styles.topGrid, mobile && { flexDirection: `column` }]}
                  >
                    {(!mobile || mobilePanel === `geography`) && geography}
                    {(!mobile || mobilePanel === `traffic`) && traffic}
                    {mobile && mobilePanel === `stats` && (
                      <View
                        {...elementProps(`mobile-stats-panel`)}
                        style={styles.mobileStats}
                      >
                        <Metrics
                          data={data}
                          palette={palette}
                          compact
                        />
                      </View>
                    )}
                  </View>
                  {previewRows > 0 ? (
                    <UniqueVisits
                      rows={previewRows}
                      events={data.uniqueVisits}
                      countries={data.countries}
                      palette={palette}
                      compact={mobile}
                      onViewAll={() => {
                        navigate(`activity`);
                        setUniqueOnly(true);
                      }}
                      onSelect={inspectEvent}
                    />
                  ) : (
                    <View
                      {...elementProps(`unique-visits-shortcut`)}
                      style={styles.visitShortcut}
                    >
                      <TextButton
                        id={`unique-visits`}
                        icon={List}
                        palette={palette}
                        onPress={() => {
                          navigate(`activity`);
                          setUniqueOnly(true);
                        }}
                      >
                        {`Unique Visits · `}
                        {numberLabel(data.uniqueVisits.length)}
                      </TextButton>
                    </View>
                  )}
                </>
              ) : tab === `activity` ? activityView : (
                <>
                  <View
                    {...elementProps(`app-top-grid`, 2)}
                    style={[styles.topGrid, mobile && { flexDirection: `column` }]}
                  >
                    {!mobile && geography}
                    <Breakdown
                      data={data}
                      palette={palette}
                      kind={tab}
                      onSource={name => tab === `sources` ? (navigate(`activity`), setSourceFilter(name)) : setDetail({ title: name, fields: [[`Visitors`, `${data.devices.find(device => device.name === name)?.count ?? 0}`], [`Scope`, mode === `demo` ? `Simulated Demo Traffic` : `Device Type Recorded At Visit Time`]] })}
                    />
                  </View>
                  <Metrics
                    data={data}
                    palette={palette}
                    compact={compact || mobile}
                  />
                </>
              )}
            </View>
          </DashboardViewport>
          <Footer
            mobile={mobile}
            palette={palette}
            onError={setMessage}
          />
          {mobile && (
            <View
              {...elementProps(`app-bottom-nav`)}
              style={[styles.bottomNav, { borderColor: palette.border, backgroundColor: palette.rail }]}
            >
              {navigation.map(({ value, title, icon: Icon }) => (
                <Pressable
                  {...elementProps(`mobile-nav-button`, value)}
                  key={value}
                  accessibilityRole={`button`}
                  accessibilityLabel={value === `overview` ? `Live` : title}
                  aria-pressed={tab === value}
                  accessibilityState={{ selected: tab === value }}
                  onPress={() => navigate(value)}
                  style={styles.bottomButton}
                >
                  <Icon
                    {...elementProps(`mobile-nav-icon`, value)}
                    size={21}
                    strokeWidth={1.8}
                    color={tab === value ? palette.blue : palette.muted}
                  />
                  <Text
                    {...elementProps(`mobile-nav-label`, value)}
                    style={{ fontSize: 10, fontWeight: `500`, color: tab === value ? palette.blue : palette.muted }}
                  >
                    {value === `overview` ? `Live` : title}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                {...elementProps(`mobile-settings-button`)}
                accessibilityRole={`button`}
                accessibilityLabel={`Settings`}
                onPress={() => setSettingsOpen(true)}
                style={styles.bottomButton}
              >
                <Settings
                  {...elementProps(`app-settings-icon`)}
                  size={21}
                  strokeWidth={1.8}
                  color={palette.muted}
                />
                <Text
                  {...elementProps(`app-settings`)}
                  style={{ fontSize: 10, color: palette.muted }}
                >
                  Settings
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
      <LocationDialog
        visible={locationOpen}
        palette={palette}
        reducedMotion={reducedMotion}
        onClose={() => setLocationOpen(false)}
        onSave={saveLocation}
      />
      <AuthDialog
        reducedMotion={reducedMotion}
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        palette={palette}
        dark={dark}
        user={user}
        onSignIn={async (email, password) => {
          await collector.signIn(email, password);
          feedback();
          setAuthOpen(false);
          setMessage(`Welcome Back`);
        }}
        onSignUp={async (username, email, password) => {
          await collector.signUp(username, email, password);
          feedback();
          setAuthOpen(false);
          setMessage(`Account Created`);
        }}
        onSignOut={async () => {
          await collector.signOut();
          setAuthOpen(false);
          setMessage(`Signed Out`);
        }}
      />
      <PreferencesDialog
        reducedMotion={reducedMotion}
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        palette={palette}
        preferences={collector.preferences}
        onChange={async patch => {
          await collector.updatePreferences(patch);
          feedback();
        }}
        mode={mode}
        onModeChange={collector.setMode}
        onClearHistory={collector.clearHistory}
        onResetLocalData={collector.clearLocalData}
      />
      <ModalShell
        visible={notificationsOpen}
        title={`Notifications`}
        onClose={() => setNotificationsOpen(false)}
        palette={palette}
        reducedMotion={reducedMotion}
      >
        <View
          {...elementProps(`app-notification-icon`)}
          style={[styles.notificationIcon, { backgroundColor: palette.selected }]}
        >
          <Bell
            {...elementProps(`app-bell-icon`)}
            size={24}
            color={palette.blue}
          />
        </View>
        <Text
          {...elementProps(`app-dialog-title-text`)}
          style={[styles.dialogTitle, { color: palette.text }]}
        >
          Nothing To Catch Up On
        </Text>
        <Text
          {...elementProps(`app-dialog-body-text`)}
          style={[styles.dialogBody, { color: palette.muted }]}
        >
          Traffic alerts and push notifications are planned for a future update. Your local visit activity is available now.
        </Text>
        <Pressable
          {...elementProps(`notification-activity-button`)}
          accessibilityRole={`button`}
          onPress={() => {
            setNotificationsOpen(false);
            navigate(`activity`);
          }}
          style={[styles.primaryButton, { backgroundColor: palette.blue }]}
        >
          <Text
            {...elementProps(`notification-activity-label`)}
            style={styles.primaryLabel}
          >
            View Activity
          </Text>
          <ArrowUpRight
            {...elementProps(`app-arrow-up-right-icon`)}
            size={17}
            color={`#FFFFFF`}
          />
        </Pressable>
      </ModalShell>
      <ModalShell
        visible={countriesOpen}
        title={`Visitor Locations`}
        onClose={() => setCountriesOpen(false)}
        palette={palette}
        reducedMotion={reducedMotion}
      >
        <CountryRows
          countries={locations}
          palette={palette}
          selected={selectedCountry}
          limit={101}
          onSelect={code => {
            selectCountry(code);
            setCountriesOpen(false);
          }}
        />
        <Text
          {...elementProps(`app-dialog-body-text`, 2)}
          style={[styles.dialogBody, { color: palette.muted }]}
        >
          {mode === `demo` ? `These locations belong to the simulated demo stream.` : `Locations you add stay on this device. Visits without a saved location appear as Unknown Location.`}
        </Text>
      </ModalShell>
      <ModalShell
        visible={!!detail}
        title={detail?.title ?? `Details`}
        onClose={() => setDetail(null)}
        palette={palette}
        reducedMotion={reducedMotion}
      >
        {detail?.fields.map(([label, value]) => (
          <View
            {...elementProps(`detail-field-row`, label)}
            key={label}
            style={styles.detailRow}
          >
            <Text
              {...elementProps(`detail-field-label`, label)}
              style={[styles.secondary, { color: palette.muted }]}
            >
              {label}
            </Text>
            <Text
              {...elementProps(`detail-field-value`, label)}
              selectable
              style={{ color: palette.text, fontSize: 14, lineHeight: 21, flex: 1, textAlign: `right` }}
            >
              {value}
            </Text>
          </View>
        ))}
      </ModalShell>
      {message && (
        <View
          {...elementProps(`app-toast`)}
          accessibilityRole={`alert`}
          accessibilityLiveRegion={`polite`}
          style={[styles.toast, { backgroundColor: palette.raised, borderColor: palette.border }]}
        >
          <Text
            {...elementProps(`app-toast-message`)}
            style={{ color: palette.text, fontSize: 13 }}
          >
            {message}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const App = () => (
  <SafeAreaProvider
    {...elementProps(`app-safe-area-provider`)}
  >
    <Collector />
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  secondary: { fontSize: 12 },
  greetingText: { fontSize: 13 },
  root: { flex: 1, minHeight: 0 },
  earth: { flex: 1, minHeight: 100 },
  geoHeader: { gap: 10, padding: 16 },
  geoCard: { flex: 0.95, minHeight: 0 },
  mobileStats: { flex: 1, minHeight: 0 },
  visitShortcut: { alignItems: `flex-end` },
  dialogBody: { fontSize: 14, lineHeight: 22 },
  cardTitle: { fontSize: 16, fontWeight: `600` },
  workspace: { flex: 1, minWidth: 0, minHeight: 0 },
  modeDot: { width: 5, height: 5, borderRadius: 3 },
  fullPanel: { flex: 1, minHeight: 0, padding: 22 },
  shell: { flex: 1, flexDirection: `row`, minHeight: 0 },
  expandedGreeting: { paddingLeft: 0, borderLeftWidth: 0 },
  content: { flex: 1, minHeight: 0, padding: 20, gap: 16 },
  traffic: { flex: 1.65, minWidth: 0, minHeight: 0, gap: 10 },
  inline: { flexDirection: `row`, gap: 4, alignItems: `center` },
  greeting: { borderLeftWidth: 1, paddingLeft: 12, flexShrink: 1 },
  topGrid: { flex: 1, minHeight: 0, flexDirection: `row`, gap: 16 },
  headerMain: { flexDirection: `row`, alignItems: `center`, gap: 12 },
  primaryLabel: { color: `#FFFFFF`, fontSize: 14, fontWeight: `600` },
  dialogTitle: { fontSize: 21, fontWeight: `600`, letterSpacing: -0.5 },
  loading: { flex: 1, gap: 24, alignItems: `center`, justifyContent: `center` },
  mobileMode: { gap: 6, height: 27, flexDirection: `row`, alignItems: `center` },
  mobileHeader: { height: 91, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 7 },
  mobileGreeting: { flexDirection: `row`, gap: 10, alignItems: `center`, paddingTop: 7 },
  bottomNav: { borderTopWidth: 1, flexDirection: `row`, height: 61, paddingHorizontal: 6 },
  header: { height: 74, borderBottomWidth: 1, justifyContent: `center`, paddingHorizontal: 24 },
  filterChip: { gap: 7, padding: 9, borderRadius: 5, flexDirection: `row`, alignItems: `center` },
  bottomButton: { flex: 1, minHeight: 48, justifyContent: `center`, alignItems: `center`, gap: 5 },
  toolbar: { marginLeft: `auto`, flexDirection: `row`, gap: 3, alignItems: `center`, flexShrink: 0 },
  mobileTabRow: { gap: 8, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between` },
  detailRow: { flexDirection: `row`, alignItems: `flex-start`, gap: 24, justifyContent: `space-between` },
  filterRow: { flexDirection: `row`, flexWrap: `wrap`, alignItems: `center`, gap: 10, paddingVertical: 18 },
  notificationIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: `center`, alignItems: `center` },
  locationsTitle: { flexWrap: `wrap`, flexDirection: `row`, justifyContent: `space-between`, alignItems: `center`, gap: 8 },
  primaryButton: { minHeight: 46, alignItems: `center`, justifyContent: `center`, gap: 9, borderRadius: 8, flexDirection: `row` },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: `center`, justifyContent: `center`, marginLeft: 7 },
  addLocation: { minHeight: 32, gap: 5, paddingHorizontal: 9, borderWidth: 1, borderRadius: 7, flexDirection: `row`, alignItems: `center` },
  pagination: { flexDirection: `row`, alignItems: `center`, justifyContent: `space-between`, borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  toast: { position: `absolute`, bottom: 80, alignSelf: `center`, borderWidth: 1, borderRadius: 10, paddingHorizontal: 19, paddingVertical: 13 },
  dataMode: { paddingHorizontal: 12, height: 32, borderRadius: 7, borderWidth: 1, marginRight: 10, alignItems: `center`, gap: 7, flexDirection: `row` },
});

export default App;
