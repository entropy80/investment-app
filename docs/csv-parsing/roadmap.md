# CSV Parser Roadmap: Banks & Brokerages for Digital Nomads and Expats

**Last Updated:** 2026-01-09

Research on preferred financial institutions for digital nomads and expats to guide CSV parser development priorities.

---

## Current Parser Support

| Institution | Type | Status | Parser File |
|-------------|------|--------|-------------|
| Interactive Brokers (IBKR) | Brokerage | ✅ Supported | `src/lib/import/parsers/ibkr.ts` |
| Charles Schwab | Brokerage | ✅ Supported | `src/lib/import/parsers/schwab.ts` |
| Chase Bank | Bank | ✅ Supported | `src/lib/import/parsers/chase-bank.ts` |
| Bank of America | Bank | ✅ Supported | `src/lib/import/parsers/bofa.ts` |
| NBK (Kuwait) | Bank | ✅ Supported | `src/lib/import/parsers/nbk.ts` |

---

## Brokerages (Priority Order for CSV Parser Development)

| Priority | Brokerage | Why Popular | Status |
|----------|-----------|-------------|--------|
| 1 | **Interactive Brokers** | #1 choice for expats - 200+ countries, 150 markets, easy country transfers | ✅ Supported |
| 2 | **Charles Schwab** | #2 choice - no foreign transaction fees, unlimited ATM rebates worldwide | ✅ Supported |
| 3 | **Saxo Bank** | 1M+ clients, 71,000+ instruments, strong in Europe/Asia | ❌ Not supported |
| 4 | **Fidelity** | Popular US brokerage, removed FX surcharge in 2025, free ATM worldwide | ❌ Not supported |
| 5 | **TD Ameritrade** | Now merged with Schwab, legacy users may have old exports | ⚠️ Partial (via Schwab) |

---

## Banks/Fintechs (Priority Order)

| Priority | Bank/Fintech | Why Popular | Status |
|----------|--------------|-------------|--------|
| 1 | **Wise** | 50+ currencies, mid-market rates, most popular for multi-currency | ❌ Not supported |
| 2 | **Revolut** | 150+ currencies, 45M users, comprehensive app | ❌ Not supported |
| 3 | **Charles Schwab Bank** | Zero foreign fees, ATM rebates, tied to brokerage | ✅ Supported |
| 4 | **Bank of America** | Large US bank presence | ✅ Supported |
| 5 | **JP Morgan Chase** | Large US bank, popular with travelers | ✅ Supported |
| 6 | **HSBC Premier** | Global presence, good for international expats | ❌ Not supported |
| 7 | **Capital One 360** | Zero fees, online-only, popular with US nomads | ❌ Not supported |
| 8 | **Monzo** | UK's largest digital bank, 12M customers | ❌ Not supported |
| 9 | **National Bank of Kuwait** | Regional (GCC) coverage | ✅ Supported |

---

## Recommended Next Parsers to Build

### High Priority (Most Impact)

1. **Wise** - Dominates multi-currency space for nomads
2. **Revolut** - Second most popular fintech for nomads
3. **Fidelity** - Major US brokerage, common among US expats

### Medium Priority

4. **Saxo Bank** - Popular in Europe/Asia
5. **HSBC** - Strong international presence
6. **Capital One 360** - Popular US digital bank

### ~~Quick Wins (Developer Has Account Access)~~ ✅ Completed

The following parsers were implemented on 2026-01-08:

- ~~Bank of America~~ → ✅ `src/lib/import/parsers/bofa.ts`
- ~~JP Morgan Chase~~ → ✅ `src/lib/import/parsers/chase-bank.ts`
- ~~National Bank of Kuwait~~ → ✅ `src/lib/import/parsers/nbk.ts`

---

## Key Considerations

### Why These Institutions Matter for Expats

1. **Multi-currency support** - Nomads earn and spend in different currencies
2. **No foreign transaction fees** - Essential for international spending
3. **Global ATM access** - Cash withdrawal without excessive fees
4. **Online account management** - No branch visits required
5. **Cross-border transfers** - Easy movement of funds internationally

### Common Challenges

- Many brokerages close accounts when users move countries
- Traditional banks hide markup in exchange rates (4-5% typical)
- US citizens face PFIC tax consequences with foreign-registered funds
- Some institutions require fixed addresses

---

## Sources

- [Best International Brokerages for Expats 2025 | Portfolio Path](https://www.theportfoliopath.com/tool-categories/international-brokerages)
- [5 Best Brokers For Expats In 2025 | DayTrading.com](https://www.daytrading.com/brokers/expats)
- [9 Best International Banks for Expats & Digital Nomads | Monito](https://www.monito.com/en/wiki/best-international-bank-accounts-digital-nomads)
- [Best Banks for Digital Nomads 2025 | Statrys](https://statrys.com/blog/best-banks-digital-nomads)
- [Best Banks for Digital Nomads | Nomads Embassy](https://nomadsembassy.com/best-banks-for-digital-nomads/)
- [Best US Banks for Expats Living Abroad 2025 | SavvyNomad](https://blog.savvynomad.io/best-banks-for-us-expats/)
