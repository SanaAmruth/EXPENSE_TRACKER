import { Budget, Category, Expense, PaymentMode, PaymentProfile } from "./types";

export const categories: Category[] = [
  "Groceries",
  "Food",
  "Transport",
  "Health",
  "Shopping",
  "Bills"
];

export const paymentModes: PaymentMode[] = ["Cash", "UPI", "Card", "Bank"];

export const defaultPaymentProfile: PaymentProfile = {
  cashEnabled: true,
  upiAccounts: [
    { id: "upi-icici", label: "ICICI Salary", accountLabel: "UPI" },
    { id: "upi-hdfc", label: "HDFC Savings", accountLabel: "UPI" }
  ],
  cards: [
    { id: "card-millennia", label: "HDFC Millennia", accountLabel: "Credit Card" },
    { id: "card-amazon-pay", label: "ICICI Amazon Pay", accountLabel: "Credit Card" }
  ],
  bankAccounts: [
    { id: "bank-hdfc", label: "HDFC Savings", accountLabel: "NetBanking" },
    { id: "bank-sbi", label: "SBI Expense", accountLabel: "NetBanking" }
  ]
};

export const budgets: Budget[] = [
  { category: "Groceries", limit: 12000 },
  { category: "Food", limit: 8000 },
  { category: "Transport", limit: 5000 },
  { category: "Health", limit: 3000 },
  { category: "Shopping", limit: 10000 },
  { category: "Bills", limit: 6000 }
];

export const initialExpenses: Expense[] = [
  {
    id: "1",
    amount: 460,
    merchant: "Blinkit",
    date: "2026-04-16",
    time: "20:10",
    paymentMode: "UPI",
    paymentSource: "ICICI Salary • UPI",
    category: "Groceries",
    comment: "Vegetables and milk"
  },
  {
    id: "2",
    amount: 280,
    merchant: "Cafe Terra",
    date: "2026-04-14",
    time: "13:15",
    paymentMode: "Card",
    paymentSource: "HDFC Millennia",
    category: "Food",
    comment: "Lunch meeting"
  },
  {
    id: "3",
    amount: 980,
    merchant: "Uber",
    date: "2026-04-11",
    time: "22:00",
    paymentMode: "UPI",
    paymentSource: "HDFC Savings • UPI",
    category: "Transport",
    comment: "Airport ride"
  },
  {
    id: "4",
    amount: 2100,
    merchant: "Apollo",
    date: "2026-04-08",
    time: "09:30",
    paymentMode: "Card",
    paymentSource: "ICICI Amazon Pay",
    category: "Health",
    comment: "Medicines"
  },
  {
    id: "5",
    amount: 4999,
    merchant: "Amazon",
    date: "2026-04-03",
    time: "18:45",
    paymentMode: "Card",
    paymentSource: "HDFC Millennia",
    category: "Shopping",
    comment: "Headphones"
  },
  {
    id: "6",
    amount: 3200,
    merchant: "Electricity",
    date: "2026-04-01",
    time: "10:10",
    paymentMode: "Bank",
    paymentSource: "HDFC Savings",
    category: "Bills",
    comment: "Monthly bill"
  }
];
