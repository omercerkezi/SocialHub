import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { PLATFORMS, validateComposition } from "../../packages/contracts/index.js";
import { createClient } from "./src/api";
import { FORMAT_LABELS, PLATFORM_LABELS, stampFor, when } from "./src/copy";
import { theme, type } from "./src/theme";

const TABS = [
  ["today", "Today"],
  ["calendar", "Calendar"],
  ["posts", "Posts"],
  ["library", "Library"],
  ["more", "More"],
];

export default function App() {
  const [token, setToken] = useState("");
  const [tab, setTab] = useState("today");
  const [postId, setPostId] = useState(null);
  if (!token) return <Login onToken={setToken} />;
  const api = useMemo(() => createClient(token), [token]);
  const openPost = (id) => {
    setPostId(id);
    setTab("posts");
  };
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Text style={styles.banner} accessibilityRole="text">
        Simulated publishing is on. SocialHub is not sending anything to Facebook, Instagram, LinkedIn, or TikTok.
      </Text>
      <View style={styles.body}>
        {postId ? (
          <Composer api={api} id={postId === "new" ? null : postId} onClose={() => setPostId(null)} />
        ) : null}
        {!postId && tab === "today" ? <Today api={api} onOpen={openPost} /> : null}
        {!postId && tab === "calendar" ? <Calendar api={api} onOpen={openPost} /> : null}
        {!postId && tab === "posts" ? <Posts api={api} onOpen={openPost} /> : null}
        {!postId && tab === "library" ? <Library api={api} /> : null}
        {!postId && tab === "more" ? <More api={api} /> : null}
      </View>
      <View style={styles.tabs}>
        {TABS.map(([id, label]) => (
          <Pressable key={id} onPress={() => { setPostId(null); setTab(id); }} style={styles.tab}>
            <Text style={[styles.tabLabel, tab === id && !postId ? styles.tabOn : null]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Login({ onToken }) {
  const [email, setEmail] = useState("owner@socialhub.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit() {
    setPending(true);
    setError("");
    try {
      const result = await createClient("")("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onToken(result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <View style={styles.login}>
      <Text style={type.title}>Sign in</Text>
      <Text style={styles.finding}>The desk for Furnio, Smart Leads, and the brands you add later. Publishing here is simulated.</Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={submit} disabled={pending}>
        <Text style={styles.primaryLabel}>{pending ? "Signing in" : "Sign in"}</Text>
      </Pressable>
    </View>
  );
}

function Today({ api, onOpen }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/dashboard").then(setData).catch((err) => setError(err.message));
  }, [api]);
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!data) return <ActivityIndicator color={theme.accent} />;
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={type.title}>Today's run</Text>
      <Text style={styles.finding}>{data.finding}</Text>
      <View style={styles.slip}>
        <Text style={type.meta}>{data.next?.brandName || "Desk"}</Text>
        <Text style={styles.slipTitle}>{data.next?.title || "Nothing is scheduled"}</Text>
        {data.next ? <Text style={type.body}>{when(data.next.scheduledAt)}</Text> : null}
        {data.next ? <Text style={styles.stamp}>{stampFor(data.next).word}. {stampFor(data.next).note}</Text> : null}
        {data.next ? <TextButton label="Open post" onPress={() => onOpen(data.next.id)} /> : null}
      </View>
      <Section title="Failed">
        {(data.failed || []).map((post) => (
          <Row key={post.id} title={post.title} meta={`${post.brandName} · ${stampFor(post).word}`} onPress={() => onOpen(post.id)} />
        ))}
        {data.failed?.length ? null : <Text style={type.meta}>No failed simulations are waiting.</Text>}
      </Section>
    </ScrollView>
  );
}

function Calendar({ api, onOpen }) {
  const [view, setView] = useState("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [posts, setPosts] = useState([]);
  const range = rangeFor(view, cursor);
  useEffect(() => {
    api(`/calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`)
      .then(setPosts)
      .catch(() => setPosts([]));
  }, [api, range.from, range.to]);
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={type.title}>Calendar</Text>
      <Text style={styles.finding}>{range.label}</Text>
      <View style={styles.segment}>
        {["day", "week", "month"].map((item) => (
          <Pressable key={item} onPress={() => setView(item)} style={[styles.segmentItem, view === item && styles.segmentOn]}>
            <Text style={styles.segmentLabel}>{item[0].toUpperCase() + item.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.segment}>
        <TextButton label="Previous" onPress={() => setCursor(shift(view, cursor, -1))} />
        <TextButton label="Today" onPress={() => setCursor(new Date())} />
        <TextButton label="Next" onPress={() => setCursor(shift(view, cursor, 1))} />
      </View>
      {posts.map((post) => (
        <Row key={post.id} title={post.title} meta={`${post.brandName} · ${when(post.scheduledAt || post.publishedAt)} · ${stampFor(post).word}`} onPress={() => onOpen(post.id)} />
      ))}
      {posts.length ? null : <Text style={type.meta}>Nothing is dated in this range.</Text>}
    </ScrollView>
  );
}

function Posts({ api, onOpen }) {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/posts").then(setPosts).catch((err) => setError(err.message));
  }, [api]);
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.rowBetween}>
        <Text style={type.title}>Posts</Text>
        <Pressable style={styles.primary} onPress={() => onOpen("new")}>
          <Text style={styles.primaryLabel}>New post</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {(posts || []).map((post) => (
        <Row key={post.id} title={post.title} meta={`${post.brandName} · ${stampFor(post).word}`} onPress={() => onOpen(post.id)} />
      ))}
    </ScrollView>
  );
}

function Composer({ api, id, onClose }) {
  const [form, setForm] = useState({ brandId: "", title: "", body: "", format: "text", accountIds: [], mediaIds: [] });
  const [brands, setBrands] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [media, setMedia] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    api("/brands").then(setBrands);
    if (!id) return;
    api(`/posts/${id}`).then((post) => {
      setForm({
        brandId: post.brandId,
        title: post.title,
        body: post.body,
        format: post.format,
        accountIds: post.targets.map((target) => target.accountId),
        mediaIds: post.media.map((item) => item.id),
      });
      setLocked(["published", "publishing", "partial"].includes(post.status));
      setNotice(`${stampFor(post).word}. ${stampFor(post).note}`);
    });
  }, [api, id]);
  useEffect(() => {
    if (!form.brandId) return;
    api(`/accounts?brandId=${form.brandId}`).then(setAccounts);
    api(`/media?brandId=${form.brandId}`).then(setMedia);
  }, [api, form.brandId]);
  const selectedAccounts = accounts.filter((account) => form.accountIds.includes(account.id));
  const selectedMedia = form.mediaIds.map((mediaId) => media.find((item) => item.id === mediaId)).filter(Boolean);
  const issues = selectedAccounts.flatMap((account) =>
    validateComposition({ format: form.format, body: form.body, media: selectedMedia, platform: account.platform }).map(
      (issue) => `${PLATFORM_LABELS[account.platform]}: ${issue.message}`,
    ),
  );
  async function run() {
    setError("");
    try {
      const payload = { ...form, collectionId: null };
      const saved = id
        ? await api(`/posts/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await api("/posts", { method: "POST", body: JSON.stringify(payload) });
      const result = await api(`/posts/${saved.id}/publish`, { method: "POST" });
      setNotice((result.targets || []).map((target) => target.summary).join(" "));
      setLocked(true);
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <TextButton label="Back to posts" onPress={onClose} />
      <Text style={type.title}>{id ? form.title || "Edit post" : "New post"}</Text>
      <Text style={styles.finding}>{notice || "A draft stays on the desk until you run a simulation."}</Text>
      <Text style={type.meta}>Brand</Text>
      <View style={styles.segment}>
        {brands.map((brand) => (
          <Pressable key={brand.id} onPress={() => setForm((current) => ({ ...current, brandId: brand.id, accountIds: [] }))} style={[styles.segmentItem, form.brandId === brand.id && styles.segmentOn]}>
            <Text style={styles.segmentLabel}>{brand.name}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Name" value={form.title} onChangeText={(title) => setForm((current) => ({ ...current, title }))} />
      <Field label="Caption" value={form.body} onChangeText={(body) => setForm((current) => ({ ...current, body }))} multiline />
      <Text style={type.meta}>Format</Text>
      <View style={styles.segment}>
        {Object.entries(FORMAT_LABELS).map(([value, label]) => (
          <Pressable key={value} onPress={() => setForm((current) => ({ ...current, format: value }))} style={[styles.segmentItem, form.format === value && styles.segmentOn]}>
            <Text style={styles.segmentLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {accounts.map((account) => {
        const on = form.accountIds.includes(account.id);
        return (
          <Pressable
            key={account.id}
            onPress={() =>
              setForm((current) => ({
                ...current,
                accountIds: on ? current.accountIds.filter((item) => item !== account.id) : [...current.accountIds, account.id],
              }))
            }
          >
            <Text style={type.body}>
              {on ? "Selected" : "Select"} {PLATFORM_LABELS[account.platform]} · @{account.handle} · {account.connectionMode === "live" ? "Live" : "Simulated"}
            </Text>
          </Pressable>
        );
      })}
      {selectedAccounts.map((account) => (
        <Text key={account.id} style={type.meta}>
          Preview only. Not sent to {PLATFORM_LABELS[account.platform]}.
        </Text>
      ))}
      {issues.map((issue) => (
        <Text key={issue} style={styles.error}>{issue}</Text>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={run} disabled={locked || issues.length > 0}>
        <Text style={styles.primaryLabel}>{selectedAccounts.some((account) => account.connectionMode === "live") ? "Try live publish" : "Run simulation"}</Text>
      </Pressable>
      <Text style={type.meta}>Run simulation does not send the post. The result will say so.</Text>
    </ScrollView>
  );
}

function Library({ api }) {
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState("");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/brands").then((rows) => {
      setBrands(rows);
      setBrandId((current) => current || rows[0]?.id || "");
    });
  }, [api]);
  useEffect(() => {
    api(brandId ? `/media?brandId=${brandId}` : "/media").then(setItems).catch((err) => setError(err.message));
  }, [api, brandId]);
  async function add() {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"] });
    if (picked.canceled || !brandId) return;
    const asset = picked.assets[0];
    const body = new FormData();
    body.append("brandId", brandId);
    body.append("altText", asset.fileName || "Phone library file");
    body.append("file", { uri: asset.uri, name: asset.fileName || "upload.jpg", type: asset.mimeType || "image/jpeg" });
    try {
      await api("/media", { method: "POST", body });
      setItems(await api(`/media?brandId=${brandId}`));
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={type.title}>Library</Text>
      <Text style={styles.finding}>Files for posts. Sample swatches are generated, not photographs.</Text>
      <View style={styles.segment}>
        {brands.map((brand) => (
          <Pressable key={brand.id} onPress={() => setBrandId(brand.id)} style={[styles.segmentItem, brandId === brand.id && styles.segmentOn]}>
            <Text style={styles.segmentLabel}>{brand.name}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.primary} onPress={add}>
        <Text style={styles.primaryLabel}>Add from this phone</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.map((item) => (
        <Text key={item.id} style={styles.rowText}>{item.originalName} · {item.kind} · {item.altText || "No description"}</Text>
      ))}
    </ScrollView>
  );
}

function More({ api }) {
  const [pane, setPane] = useState("menu");
  if (pane === "brands") return <Brands api={api} onBack={() => setPane("menu")} />;
  if (pane === "history") return <History api={api} onBack={() => setPane("menu")} />;
  return (
    <View style={styles.pad}>
      <Text style={type.title}>More</Text>
      <TextButton label="Brands" onPress={() => setPane("brands")} />
      <TextButton label="History" onPress={() => setPane("history")} />
    </View>
  );
}

function Brands({ api, onBack }) {
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState("");
  function load() {
    api("/brands").then(async (rows) => {
      const detailed = await Promise.all(rows.map(async (brand) => ({ ...brand, accounts: await api(`/accounts?brandId=${brand.id}`) })));
      setBrands(detailed);
    }).catch((err) => setError(err.message));
  }
  useEffect(load, [api]);
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <TextButton label="Back" onPress={onBack} />
      <Text style={type.title}>Brands</Text>
      <Text style={styles.finding}>Each brand keeps its own accounts. Connections here are simulated.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {brands.map((brand) => (
        <View key={brand.id} style={styles.panel}>
          <Text style={styles.slipTitle}>{brand.name}</Text>
          {(brand.accounts || []).map((account) => (
            <Text key={account.id} style={type.body}>
              {PLATFORM_LABELS[account.platform]} · @{account.handle} · {account.connectionMode === "live" ? "Live" : "Simulated"}
            </Text>
          ))}
          <ConnectForm api={api} brandId={brand.id} onDone={load} />
        </View>
      ))}
    </ScrollView>
  );
}

function ConnectForm({ api, brandId, onDone }) {
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  async function connect() {
    setError("");
    try {
      await api(`/brands/${brandId}/accounts`, {
        method: "POST",
        body: JSON.stringify({ platform, displayName, handle, connectionMode: "simulated" }),
      });
      setDisplayName("");
      setHandle("");
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <View>
      <View style={styles.segment}>
        {PLATFORMS.map((item) => (
          <Pressable key={item} onPress={() => setPlatform(item)} style={[styles.segmentItem, platform === item && styles.segmentOn]}>
            <Text style={styles.segmentLabel}>{PLATFORM_LABELS[item]}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Name" value={displayName} onChangeText={setDisplayName} />
      <Field label="Handle" value={handle} onChangeText={setHandle} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.secondary} onPress={connect}>
        <Text style={styles.secondaryLabel}>Connect simulation</Text>
      </Pressable>
    </View>
  );
}

function History({ api, onBack }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/history").then(setRows);
  }, [api]);
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <TextButton label="Back" onPress={onBack} />
      <Text style={type.title}>History</Text>
      <Text style={styles.finding}>Each attempt says whether it was simulated. A simulated success was not sent.</Text>
      {rows.map((row) => (
        <Text key={row.id} style={styles.rowText}>
          {row.title} · {PLATFORM_LABELS[row.platform]} · {row.statusLabel}. {row.summary}
        </Text>
      ))}
    </ScrollView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={type.meta}>{label}</Text>
      <TextInput style={[styles.input, props.multiline && styles.inputTall]} placeholderTextColor={theme.muted} {...props} />
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ title, meta, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={type.body}>{title}</Text>
      <Text style={type.meta}>{meta}</Text>
    </Pressable>
  );
}

function TextButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

function rangeFor(view, cursor) {
  const start = new Date(cursor);
  start.setHours(0, 0, 0, 0);
  if (view === "day") {
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString(), label: start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) };
  }
  if (view === "month") {
    const from = new Date(start.getFullYear(), start.getMonth(), 1);
    const to = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    return { from: from.toISOString(), to: to.toISOString(), label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
  }
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString(), label: `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` };
}

function shift(view, cursor, direction) {
  const next = new Date(cursor);
  if (view === "month") next.setMonth(next.getMonth() + direction);
  else if (view === "week") next.setDate(next.getDate() + direction * 7);
  else next.setDate(next.getDate() + direction);
  return next;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.ground, paddingTop: 48 },
  body: { flex: 1 },
  banner: { marginHorizontal: 16, marginBottom: 8, color: theme.accentInk, backgroundColor: theme.accentSoft, padding: 12, borderRadius: theme.radiusControl, fontSize: 12, lineHeight: 17 },
  login: { flex: 1, backgroundColor: theme.ground, justifyContent: "center", padding: 24, gap: 12 },
  pad: { padding: 16, gap: 12, paddingBottom: 32 },
  finding: { ...type.body, color: theme.muted, maxWidth: 520 },
  slip: { backgroundColor: theme.manila, borderColor: theme.manilaEdge, borderWidth: 1, borderRadius: theme.radiusCard, padding: 24, gap: 8, minHeight: 180 },
  slipTitle: { fontSize: 24, fontWeight: "600", color: theme.ink },
  stamp: { alignSelf: "flex-start", borderWidth: 1, borderColor: theme.accent, color: theme.accentInk, borderRadius: theme.radiusControl, paddingVertical: 8, paddingHorizontal: 12, fontWeight: "600", fontSize: 14 },
  panel: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: theme.radiusCard, padding: 16, gap: 8 },
  section: { fontSize: 18, fontWeight: "600", color: theme.ink },
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border, gap: 2 },
  rowText: { ...type.body, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.border },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  field: { gap: 6 },
  input: { minHeight: 40, borderWidth: 1, borderColor: theme.control, borderRadius: theme.radiusControl, backgroundColor: theme.surface, paddingHorizontal: 10, fontSize: 16, color: theme.ink },
  inputTall: { minHeight: 96, textAlignVertical: "top", paddingVertical: 8 },
  primary: { minHeight: 40, paddingHorizontal: 14, borderRadius: theme.radiusControl, backgroundColor: theme.ink, alignItems: "center", justifyContent: "center" },
  primaryLabel: { color: theme.surface, fontSize: 14, fontWeight: "600" },
  secondary: { minHeight: 40, paddingHorizontal: 14, borderRadius: theme.radiusControl, borderWidth: 1, borderColor: theme.control, alignItems: "center", justifyContent: "center", backgroundColor: theme.surface },
  secondaryLabel: { color: theme.ink, fontSize: 14 },
  link: { color: theme.accentInk, fontSize: 14, paddingVertical: 8 },
  error: { color: theme.negativeInk, fontSize: 14 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface },
  tab: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontSize: 12, color: theme.muted },
  tabOn: { color: theme.accentInk, fontWeight: "600" },
  segment: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: theme.radiusControl, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  segmentOn: { backgroundColor: theme.accentSoft, borderColor: theme.accent },
  segmentLabel: { fontSize: 12, color: theme.ink },
});
