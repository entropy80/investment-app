export interface BudgetTemplateCategory {
  name: string
  children: string[]
}

export const BUDGET_TEMPLATE: Record<string, BudgetTemplateCategory> = {
  INCOME: {
    name: "INCOME",
    children: [
      "Wage",
      "Rental Income",
      "Allowance",
      "Other"
    ]
  },
  HOME_EXPENSES: {
    name: "HOME EXPENSES",
    children: [
      "Rent",
      "Electricity",
      "Water/Sewer/Trash",
      "Internet",
      "Maintenance",
      "House Cleaning",
      "Home Supplies",
      "Lawn/Garden"
    ]
  },
  TRANSPORTATION: {
    name: "TRANSPORTATION",
    children: [
      "DMV Fees",
      "Auto Insurance",
      "Repairs",
      "Fuel"
    ]
  },
  HEALTH: {
    name: "HEALTH",
    children: [
      "Health Insurance",
      "Doctor/Dentist",
      "Medicine/Drugs",
      "Veterinarian"
    ]
  },
  DAILY_LIVING: {
    name: "DAILY LIVING",
    children: [
      "Groceries (Instacart)",
      "Amazon & Whole Foods",
      "Trader Joe's",
      "Other Supplements",
      "Cleaning & Care",
      "Clothing",
      "Moods",
      "Dining/Eating Out"
    ]
  },
  SUBSCRIPTIONS: {
    name: "SUBSCRIPTIONS",
    children: [
      "Google Fi",
      "Zain Mobile Data",
      "Spotify",
      "YouTube",
      "Other"
    ]
  },
  MISCELLANEOUS: {
    name: "MISCELLANEOUS",
    children: [
      "Taxes",
      "Legal Fees",
      "Tax CPA",
      "Storage"
    ]
  }
}

// Order of categories as they should appear
export const BUDGET_CATEGORY_ORDER = [
  "INCOME",
  "HOME_EXPENSES",
  "TRANSPORTATION",
  "HEALTH",
  "DAILY_LIVING",
  "SUBSCRIPTIONS",
  "MISCELLANEOUS"
]

// Month names for display
export const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
]

export const MONTH_FULL_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]
