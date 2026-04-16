import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  categories,
  defaultPaymentProfile,
  initialExpenses,
  paymentModes
} from "./data";
import { colors, spacing } from "./theme";
import {
  Budget,
  Category,
  Expense,
  PaymentInstrument,
  PaymentMode,
  PaymentProfile
} from "./types";
import {
  buildInsights,
  formatCurrency,
  getCurrentExpenseStamp,
  getBudgetStatus,
  getMonthTotal,
  getPaymentSources,
  groupByCategory,
  groupByMonth,
  smartParseExpense
} from "./utils";

type Screen = "Home" | "History" | "Budgets" | "Insights";
type HomeSegment = "Voice" | "Calendar" | "Recent";
type DraftExpense = {
  amount: string;
  merchant: string;
  paymentMode: PaymentMode;
  paymentSource: string;
  category: Category;
  comment: string;
};

type OnboardingChip = {
  id: string;
  label: string;
};

const formatPaymentSource = (instrument: PaymentInstrument) =>
  instrument.accountLabel
    ? `${instrument.label} • ${instrument.accountLabel}`
    : instrument.label;

const createDraft = (profile: PaymentProfile): DraftExpense => ({
  amount: "",
  merchant: "",
  paymentMode: profile.upiAccounts.length > 0 ? "UPI" : "Cash",
  paymentSource:
    profile.upiAccounts.length > 0
      ? formatPaymentSource(profile.upiAccounts[0])
      : "Cash Wallet",
  category: "Groceries",
  comment: ""
});

const makeChip = (prefix: string, value: string, index: number): OnboardingChip => ({
  id: `${prefix}-${index}-${value.toLowerCase().replace(/\s+/g, "-")}`,
  label: value
});

const buildProfile = ({
  cashEnabled,
  directBankEnabled,
  upiBanks,
  cardNames
}: {
  cashEnabled: boolean;
  directBankEnabled: boolean;
  upiBanks: OnboardingChip[];
  cardNames: OnboardingChip[];
}): PaymentProfile => ({
  cashEnabled,
  upiAccounts: upiBanks.map((item) => ({
    id: `upi-${item.id}`,
    label: item.label,
    accountLabel: "UPI"
  })),
  cards: cardNames.map((item) => ({
    id: `card-${item.id}`,
    label: item.label,
    accountLabel: "Card"
  })),
  bankAccounts: directBankEnabled
    ? upiBanks.map((item) => ({
        id: `bank-${item.id}`,
        label: item.label,
        accountLabel: "NetBanking"
      }))
    : []
});

const makeExpense = (draft: DraftExpense): Expense => ({
  ...getCurrentExpenseStamp(),
  id: String(Date.now()),
  amount: Number(draft.amount),
  merchant: draft.merchant || "Unknown",
  paymentMode: draft.paymentMode,
  paymentSource: draft.paymentSource,
  category: draft.category,
  comment: draft.comment
});

export function ExpenseTrackerApp() {
  const [screen, setScreen] = useState<Screen>("Home");
  const [homeSegment, setHomeSegment] = useState<HomeSegment>("Calendar");
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [profile, setProfile] = useState<PaymentProfile>(defaultPaymentProfile);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const [cashEnabled, setCashEnabled] = useState(true);
  const [directBankEnabled, setDirectBankEnabled] = useState(true);
  const [upiBanks, setUpiBanks] = useState<OnboardingChip[]>([
    makeChip("upi-bank", "ICICI Salary", 0),
    makeChip("upi-bank", "HDFC Savings", 1)
  ]);
  const [cardNames, setCardNames] = useState<OnboardingChip[]>([
    makeChip("card", "HDFC Millennia", 0),
    makeChip("card", "ICICI Amazon Pay", 1)
  ]);
  const [newUpiBankName, setNewUpiBankName] = useState("");
  const [newCardName, setNewCardName] = useState("");

  const [voiceText, setVoiceText] = useState(
    "Paid 340 by UPI from ICICI Salary for groceries at Reliance Fresh"
  );
  const [customCategory, setCustomCategory] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [draft, setDraft] = useState<DraftExpense>(createDraft(defaultPaymentProfile));

  const currentStamp = getCurrentExpenseStamp();
  const currentMonthKey = currentStamp.date.slice(0, 7);
  const availableCategories = useMemo(
    () => Array.from(new Set([...categories, ...expenses.map((expense) => expense.category)])),
    [expenses]
  );
  const activeSources = useMemo(
    () => getPaymentSources(profile, draft.paymentMode),
    [draft.paymentMode, profile]
  );
  const monthTotal = useMemo(
    () => getMonthTotal(expenses, currentMonthKey),
    [currentMonthKey, expenses]
  );
  const categoryStats = useMemo(() => groupByCategory(expenses), [expenses]);
  const monthStats = useMemo(() => groupByMonth(expenses), [expenses]);
  const budgetStats = useMemo(() => getBudgetStatus(expenses), [expenses]);
  const insights = useMemo(() => buildInsights(expenses), [expenses]);

  const syncMode = (paymentMode: PaymentMode) => {
    const sources = getPaymentSources(profile, paymentMode);
    setDraft((current) => ({
      ...current,
      paymentMode,
      paymentSource: sources[0] ? formatPaymentSource(sources[0]) : paymentMode
    }));
  };

  const addExpense = () => {
    if (!draft.amount) {
      return;
    }
    setExpenses((current) => [makeExpense(draft), ...current]);
    const nextSources = getPaymentSources(profile, draft.paymentMode);
    setDraft({
      amount: "",
      merchant: "",
      paymentMode: draft.paymentMode,
      paymentSource: nextSources[0]
        ? formatPaymentSource(nextSources[0])
        : draft.paymentMode,
      category: draft.category,
      comment: ""
    });
    setManualOpen(false);
  };

  const parseVoiceEntry = () => {
    const parsed = smartParseExpense(voiceText, profile);
    setDraft((current) => ({
      ...current,
      amount: parsed.amount ? String(parsed.amount) : current.amount,
      merchant: parsed.merchant,
      paymentMode: parsed.paymentMode,
      paymentSource: parsed.paymentSource,
      category: parsed.category,
      comment: parsed.comment
    }));
    setManualOpen(true);
  };

  const parseAndAddVoiceEntry = () => {
    const parsed = smartParseExpense(voiceText, profile);
    if (!parsed.amount) {
      return;
    }
    const voiceDraft: DraftExpense = {
      amount: String(parsed.amount),
      merchant: parsed.merchant,
      paymentMode: parsed.paymentMode,
      paymentSource: parsed.paymentSource,
      category: parsed.category,
      comment: parsed.comment
    };
    setDraft(voiceDraft);
    setExpenses((current) => [makeExpense(voiceDraft), ...current]);
    setManualOpen(true);
  };

  const addCustomCategory = () => {
    const nextCategory = customCategory.trim();
    if (!nextCategory) {
      return;
    }
    setDraft((current) => ({ ...current, category: nextCategory }));
    setCustomCategory("");
  };

  const addUpiBank = () => {
    const value = newUpiBankName.trim();
    if (!value) {
      return;
    }
    const next = makeChip("upi-bank", value, upiBanks.length);
    setUpiBanks((current) => [...current, next]);
    setNewUpiBankName("");
  };

  const addCard = () => {
    const value = newCardName.trim();
    if (!value) {
      return;
    }
    setCardNames((current) => [...current, makeChip("card", value, current.length)]);
    setNewCardName("");
  };

  const finishOnboarding = () => {
    const nextProfile = buildProfile({
      cashEnabled,
      directBankEnabled,
      upiBanks,
      cardNames
    });
    setProfile(nextProfile);
    setDraft(createDraft(nextProfile));
    setIsOnboarded(true);
  };

  if (!isOnboarded) {
    return (
      <OnboardingScreen
        directBankEnabled={directBankEnabled}
        upiBanks={upiBanks}
        cardNames={cardNames}
        newUpiBankName={newUpiBankName}
        newCardName={newCardName}
        onChangeNewUpiBank={setNewUpiBankName}
        onAddUpiBank={addUpiBank}
        onChangeNewCard={setNewCardName}
        onAddCard={addCard}
        onFinish={finishOnboarding}
      />
    );
  }

  return (
    <View style={styles.app}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroCaption}>VOICE-FIRST EXPENSE TRACKING</Text>
              <Text style={styles.heroTitle}>Quick add</Text>
            </View>
            <View style={styles.monthSpentPill}>
              <Text style={styles.monthSpentText} numberOfLines={1} ellipsizeMode="tail">
                {formatCurrency(monthTotal)} <Text style={styles.monthSpentSub}>this month</Text>
              </Text>
            </View>
          </View>

          <View style={styles.voiceHero}>
            <Text style={styles.voiceTitle}>Speak naturally</Text>
            <Text style={styles.voiceHint}>
              Convert voice to text, fill the expense fields, and save the expense in one action.
            </Text>
            <TextInput
              multiline
              value={voiceText}
              onChangeText={setVoiceText}
              placeholder="Paid 250 by UPI from HDFC Savings for pet care at city clinic"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.voiceInput]}
            />
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.primaryButton, styles.flexButton, styles.primaryButtonWrap]}
                onPress={parseAndAddVoiceEntry}
              >
                <Text style={styles.primaryButtonText} numberOfLines={2} ellipsizeMode="tail">
                  Convert and add expense
                </Text>
              </Pressable>
              <Pressable
                style={[styles.outlineButton, styles.flexButton]}
                onPress={parseVoiceEntry}
              >
                <Text style={styles.outlineButtonText}>Fill fields only</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.outlineButton, styles.manualToggleButton]}
            onPress={() => setManualOpen((current) => !current)}
          >
            <Text style={styles.outlineButtonText}>
              {manualOpen ? "Hide manual fields" : "Add expense manually"}
            </Text>
          </Pressable>

          {manualOpen ? (
            <View style={styles.manualSection}>
              <View style={styles.manualHeader}>
                <Text style={styles.manualTitle}>Manual expense</Text>
                <Text style={styles.manualMeta}>
                  Auto-stamps {currentStamp.date} at {currentStamp.time}
                </Text>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.currencyMark}>₹</Text>
                <TextInput
                  value={draft.amount}
                  onChangeText={(amount) => setDraft((current) => ({ ...current, amount }))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={styles.amountInput}
                />
              </View>

              <View style={styles.metaRow}>
                <SmallCard
                  label="MERCHANT"
                  value={draft.merchant}
                  placeholder="Where?"
                  onChange={(merchant) =>
                    setDraft((current) => ({ ...current, merchant }))
                  }
                />
                <SelectionCard
                  label="MODE"
                  value={draft.paymentMode}
                  options={paymentModes}
                  onSelect={syncMode}
                />
              </View>

              <View style={styles.sectionShell}>
                <Text style={styles.fieldLabel}>PAYMENT SOURCE</Text>
                <View style={styles.categoryRow}>
                  {activeSources.map((source) => {
                    const formatted = formatPaymentSource(source);
                    return (
                      <Pressable
                        key={source.id}
                        onPress={() =>
                          setDraft((current) => ({ ...current, paymentSource: formatted }))
                        }
                        style={[
                          styles.categoryPill,
                          draft.paymentSource === formatted && styles.categoryPillActive
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            draft.paymentSource === formatted && styles.categoryTextActive
                          ]}
                        >
                          {formatted}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.sectionShell}>
                <Text style={styles.fieldLabel}>CATEGORY</Text>
                <View style={styles.categoryRow}>
                  {availableCategories.map((category) => (
                    <Pressable
                      key={category}
                      onPress={() => setDraft((current) => ({ ...current, category }))}
                      style={[
                        styles.categoryPill,
                        draft.category === category && styles.categoryPillActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          draft.category === category && styles.categoryTextActive
                        ]}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.customCategoryRow}>
                  <TextInput
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    placeholder="Create a custom category"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.customCategoryInput]}
                  />
                  <Pressable style={styles.inlineButton} onPress={addCustomCategory}>
                    <Text style={styles.primaryButtonText}>Save</Text>
                  </Pressable>
                </View>
              </View>

              <TextInput
                value={draft.comment}
                onChangeText={(comment) => setDraft((current) => ({ ...current, comment }))}
                placeholder="Optional comment"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Pressable style={styles.primaryButton} onPress={addExpense}>
                <Text style={styles.primaryButtonText}>Add expense</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.segmentRow}>
          {(["Voice", "Calendar", "Recent"] as HomeSegment[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => setHomeSegment(item)}
              style={styles.segmentButton}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  homeSegment === item && styles.segmentLabelActive
                ]}
              >
                {item}
              </Text>
              {homeSegment === item ? <View style={styles.segmentUnderline} /> : null}
            </Pressable>
          ))}
        </View>

        {screen === "Home" ? (
          <HomeContent homeSegment={homeSegment} expenses={expenses} />
        ) : screen === "History" ? (
          <HistoryScreen expenses={expenses} />
        ) : screen === "Budgets" ? (
          <BudgetsScreen budgetStats={budgetStats} />
        ) : (
          <InsightsScreen
            categoryStats={categoryStats}
            monthStats={monthStats}
            insights={insights}
          />
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        {(["Home", "History", "Budgets", "Insights"] as Screen[]).map((item) => (
          <Pressable key={item} style={styles.navItem} onPress={() => setScreen(item)}>
            <Text style={[styles.navLabel, screen === item && styles.navLabelActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function OnboardingScreen({
  directBankEnabled,
  upiBanks,
  cardNames,
  newUpiBankName,
  newCardName,
  onChangeNewUpiBank,
  onAddUpiBank,
  onChangeNewCard,
  onAddCard,
  onFinish
}: {
  directBankEnabled: boolean;
  upiBanks: OnboardingChip[];
  cardNames: OnboardingChip[];
  newUpiBankName: string;
  newCardName: string;
  onChangeNewUpiBank: (value: string) => void;
  onAddUpiBank: () => void;
  onChangeNewCard: (value: string) => void;
  onAddCard: () => void;
  onFinish: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.onboardingCard}>
        <Text style={styles.heroCaption}>ONBOARDING</Text>
        <Text style={styles.onboardingTitle}>Set up your payments</Text>
        <Text style={styles.onboardingCopy}>
          Add the bank accounts and cards you want available during expense entry.
        </Text>

        <View style={styles.onboardingModeCard}>
          <View>
            <Text style={styles.listTitle}>Bank names</Text>
            <Text style={styles.listMeta}>
              Use these for UPI and direct bank payments.
            </Text>
          </View>
          {directBankEnabled ? (
            <>
              <View style={styles.bankBubbleWrap}>
                {upiBanks.map((bank) => (
                  <View key={bank.id} style={styles.bankBubbleStatic}>
                    <Text style={styles.bankBubbleText}>{bank.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.addRow}>
                <TextInput
                  value={newUpiBankName}
                  onChangeText={onChangeNewUpiBank}
                  placeholder="Add bank name"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.addChipInput]}
                />
                <Pressable
                  style={[styles.inlineButton, styles.addButton]}
                  onPress={onAddUpiBank}
                >
                  <Text style={styles.primaryButtonText}>+ Add bank</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.onboardingModeCard}>
          <Text style={styles.listTitle}>Credit cards</Text>
          <Text style={styles.listMeta}>Use rounded bubbles for every card you track.</Text>
          <View style={styles.bankBubbleWrap}>
            {cardNames.map((card) => (
              <View key={card.id} style={styles.bankBubbleStatic}>
                <Text style={styles.bankBubbleText}>{card.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              value={newCardName}
              onChangeText={onChangeNewCard}
              placeholder="Add card name"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.addChipInput]}
            />
            <Pressable style={[styles.inlineButton, styles.addButton]} onPress={onAddCard}>
              <Text style={styles.primaryButtonText}>+ Add card</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={onFinish}>
          <Text style={styles.primaryButtonText}>Continue to app</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HomeContent({
  homeSegment,
  expenses
}: {
  homeSegment: HomeSegment;
  expenses: Expense[];
}) {
  if (homeSegment === "Voice") {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Voice-first flow</Text>
        <Text style={styles.voiceHint}>
          Use the top voice box to capture expenses quickly. Manual controls stay visible
          above for corrections and fallback entry.
        </Text>
      </View>
    );
  }

  if (homeSegment === "Recent") {
    return (
      <View style={styles.sectionCard}>
        {expenses.slice(0, 5).map((expense) => (
          <View key={expense.id} style={styles.listRow}>
            <View>
              <Text style={styles.listTitle}>{expense.merchant}</Text>
              <Text style={styles.listMeta}>
                {expense.category} • {expense.paymentSource} • {expense.date}
              </Text>
            </View>
            <Text style={styles.listAmount}>{formatCurrency(expense.amount)}</Text>
          </View>
        ))}
      </View>
    );
  }

  return <CalendarHeatmap expenses={expenses} />;
}

function SmallCard({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={[styles.miniCard, styles.flexCard]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.miniValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function SelectionCard<T extends string>({
  label,
  value,
  options,
  onSelect
}: {
  label: string;
  value: T;
  options: T[];
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniLabel}>{label}</Text>
      <View style={styles.selectionStack}>
        {options.map((item) => (
          <Pressable key={item} onPress={() => onSelect(item)}>
            <Text
              style={[
                styles.selectionValue,
                item === value && styles.selectionValueActive
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CalendarHeatmap({ expenses }: { expenses: Expense[] }) {
  const days = Array.from({ length: 30 }, (_, index) => index + 1);
  const totals = new Map<number, number>();
  const counts = new Map<number, number>();
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  expenses.forEach((expense) => {
    const day = Number(expense.date.slice(-2));
    totals.set(day, (totals.get(day) ?? 0) + expense.amount);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });
  const max = Math.max(...totals.values(), 1);
  const hoveredTotal = hoveredDay ? totals.get(hoveredDay) ?? 0 : 0;
  const hoveredCount = hoveredDay ? counts.get(hoveredDay) ?? 0 : 0;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Calendar heatmap</Text>
          <Text style={styles.sectionLegend}>Low ▪︎ ▪︎ ▪︎ ▪︎ High</Text>
        </View>
        <Text style={styles.hoverSummary}>
          {hoveredDay
            ? `Apr ${hoveredDay}: ${formatCurrency(hoveredTotal)} across ${hoveredCount} expense${hoveredCount === 1 ? "" : "s"}`
            : "Hover a day to see total spend"}
        </Text>
      </View>
      <View style={styles.weekHeader}>
        {["S", "M", "T", "W", "T", "F", "S"].map((item) => (
          <Text key={item} style={styles.weekLabel}>
            {item}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {days.map((day) => {
          const spend = totals.get(day) ?? 0;
          const intensity = spend === 0 ? 0 : Math.ceil((spend / max) * 4);
          return (
            <Pressable
              key={day}
              onHoverIn={() => setHoveredDay(day)}
              onHoverOut={() => setHoveredDay(null)}
              style={[
                styles.dayCell,
                intensity === 1 && { backgroundColor: "#25253a" },
                intensity === 2 && { backgroundColor: "#433d73" },
                intensity === 3 && { backgroundColor: "#6e63cf" },
                intensity === 4 && { backgroundColor: "#978bfd" }
              ]}
            >
              <Text style={styles.dayLabel}>{day}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function HistoryScreen({ expenses }: { expenses: Expense[] }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Recent transactions</Text>
      {expenses.map((expense) => (
        <View key={expense.id} style={styles.listRow}>
          <View>
            <Text style={styles.listTitle}>{expense.merchant}</Text>
            <Text style={styles.listMeta}>
              {expense.date} at {expense.time} • {expense.comment}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.listAmount}>{formatCurrency(expense.amount)}</Text>
            <Text style={styles.listMeta}>{expense.paymentSource}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function BudgetsScreen({
  budgetStats
}: {
  budgetStats: Array<Budget & { spent: number; progress: number }>;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Category budgets</Text>
      {budgetStats.map((budget) => (
        <View key={budget.category} style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.listTitle}>{budget.category}</Text>
            <Text style={styles.listMeta}>
              {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${budget.progress * 100}%` }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function InsightsScreen({
  categoryStats,
  monthStats,
  insights
}: {
  categoryStats: Array<{ category: Category; total: number }>;
  monthStats: Array<{ label: string; total: number }>;
  insights: string[];
}) {
  const maxCategory = Math.max(...categoryStats.map((item) => item.total), 1);
  const maxMonth = Math.max(...monthStats.map((item) => item.total), 1);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Insights</Text>
      {insights.map((item) => (
        <Text key={item} style={styles.insightText}>
          {item}
        </Text>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Category split</Text>
      {categoryStats.map((item) => (
        <View key={item.category} style={styles.chartRow}>
          <Text style={styles.chartLabel}>{item.category}</Text>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { width: `${(item.total / maxCategory) * 100}%` }]}
            />
          </View>
          <Text style={styles.chartValue}>{formatCurrency(item.total)}</Text>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Monthly trend</Text>
      <View style={styles.monthChart}>
        {monthStats.map((item) => (
          <View key={item.label} style={styles.monthBarWrap}>
            <View
              style={[
                styles.monthBar,
                { height: 14 + (item.total / maxMonth) * 100 }
              ]}
            />
            <Text style={styles.weekLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.appBg
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 110
  },
  hero: {
    backgroundColor: colors.panel,
    borderRadius: 28,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#1f1d30"
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    gap: spacing.md
  },
  heroCaption: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 1.5
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    marginTop: 4
  },
  monthSpentPill: {
    backgroundColor: colors.panel,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 6,
    alignSelf: "flex-start",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    marginTop: 2,
  },
  monthSpentText: {
    color: colors.accentStrong,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  monthSpentSub: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  primaryButtonWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
  voiceHero: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  manualToggleButton: {
    marginBottom: spacing.md
  },
  manualSection: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: spacing.md
  },
  manualHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: spacing.sm
  },
  manualTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  manualMeta: {
    color: colors.textMuted,
    fontSize: 12
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#33332f",
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md
  },
  currencyMark: {
    color: colors.text,
    fontSize: 34,
    marginRight: spacing.sm
  },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 36,
    paddingVertical: 16
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  miniCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: spacing.sm,
    flex: 1
  },
  flexCard: {
    flex: 1.2
  },
  miniLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 6
  },
  miniValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  selectionStack: {
    gap: 4
  },
  selectionValue: {
    color: colors.textMuted,
    fontSize: 13
  },
  selectionValueActive: {
    color: colors.text,
    fontWeight: "700"
  },
  sectionShell: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: spacing.sm
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel
  },
  categoryPillActive: {
    backgroundColor: colors.accent
  },
  categoryText: {
    color: colors.textMuted,
    fontWeight: "600"
  },
  categoryTextActive: {
    color: "#fff"
  },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: spacing.md
  },
  voiceInput: {
    minHeight: 110,
    textAlignVertical: "top"
  },
  customCategoryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm
  },
  customCategoryInput: {
    flex: 1,
    marginBottom: 0,
    backgroundColor: colors.panel
  },
  outlineButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center"
  },
  outlineButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center"
  },
  inlineButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  flexButton: {
    flex: 1
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center"
  },
  segmentRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    marginBottom: spacing.md
  },
  segmentButton: {
    marginRight: spacing.lg,
    paddingBottom: spacing.sm
  },
  segmentLabel: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 16
  },
  segmentLabelActive: {
    color: colors.accentStrong
  },
  segmentUnderline: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 999,
    marginTop: 8
  },
  sectionCard: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#1f1d30"
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md
  },
  hoverSummary: {
    color: colors.textMuted,
    fontSize: 12,
    maxWidth: 150,
    textAlign: "right",
    lineHeight: 18
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700"
  },
  sectionLegend: {
    color: colors.textMuted,
    fontSize: 12
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  weekLabel: {
    color: colors.textMuted,
    width: "14.2%",
    textAlign: "center",
    fontSize: 12
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  dayCell: {
    width: "13.4%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "#171724",
    alignItems: "center",
    justifyContent: "center"
  },
  dayLabel: {
    color: colors.text,
    fontWeight: "700"
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1d30",
    gap: spacing.sm
  },
  listTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  listMeta: {
    color: colors.textMuted,
    marginTop: 4,
    maxWidth: 220
  },
  listAmount: {
    color: colors.text,
    fontWeight: "700"
  },
  voiceTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: spacing.xs
  },
  voiceHint: {
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md
  },
  budgetCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: spacing.md,
    marginTop: spacing.sm
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.cardMuted,
    borderRadius: 999,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent
  },
  insightText: {
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.sm,
    lineHeight: 20
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  chartLabel: {
    color: colors.text,
    width: 82
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.cardMuted,
    borderRadius: 999,
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.accentStrong
  },
  chartValue: {
    color: colors.textMuted,
    width: 90,
    textAlign: "right",
    fontSize: 12
  },
  monthChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.md,
    height: 140
  },
  monthBarWrap: {
    alignItems: "center",
    width: "15%"
  },
  monthBar: {
    width: 22,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginBottom: spacing.sm
  },
  bottomNav: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f1d30",
    paddingVertical: spacing.sm
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 6
  },
  navLabel: {
    color: colors.textMuted,
    fontWeight: "600"
  },
  navLabelActive: {
    color: colors.accentStrong
  },
  onboardingCard: {
    backgroundColor: colors.panel,
    borderRadius: 28,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#1f1d30"
  },
  onboardingTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginTop: spacing.sm
  },
  onboardingCopy: {
    color: colors.textMuted,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.lg
  },
  onboardingModeCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  onboardingModeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "center"
  },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.border
  },
  togglePillActive: {
    backgroundColor: colors.accent
  },
  toggleText: {
    color: "#fff",
    fontWeight: "700"
  },
  upiBoard: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md
  },
  upiColumn: {
    flex: 1
  },
  upiColumnTitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  upiLane: {
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  upiLaneReady: {
    borderColor: colors.accentDim
  },
  upiLaneActive: {
    borderColor: colors.accentStrong
  },
  upiLaneTitle: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: spacing.sm
  },
  assignmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  assignmentBubble: {
    backgroundColor: colors.accentDim,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  assignmentBubbleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600"
  },
  assignmentHint: {
    color: colors.textMuted,
    fontSize: 12
  },
  bankBubbleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  bankBubble: {
    backgroundColor: colors.panel,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  bankBubbleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  bankBubbleStatic: {
    backgroundColor: colors.panel,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  bankBubbleText: {
    color: colors.text,
    fontWeight: "600"
  },
  bankBubbleTextActive: {
    color: "#fff"
  },
  addRow: {
    flexDirection: "column",
    gap: spacing.sm,
    alignItems: "stretch",
    marginTop: spacing.md
  },
  addChipInput: {
    marginBottom: 0,
    backgroundColor: colors.panel
  },
  addButton: {
    width: "100%",
    alignItems: "center"
  }
});
