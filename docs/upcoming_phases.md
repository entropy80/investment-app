# Upcoming Phases - Investment App

**Last Updated:** 2026-01-21

> **Note:** Completed phases are documented in [CHANGELOG.md](./CHANGELOG.md)

---

## Progress Summary

| Phase | Name | Priority | Status | Description |
|-------|------|----------|--------|-------------|
| 1 | CSV Parser Expansion | Medium | Pending | Evaluate next parsers (Wise, Revolut, Fidelity) |
| 2 | Research: SimpleFIN | Low | Pending | Bank data integration for U.S. developers |

---

## Phase 1: CSV Parser Expansion

Review the CSV parser roadmap and evaluate next parsers to implement.

### Reference

- [CSV Parser Roadmap](./csv-parsing/roadmap.md)

### Current Support

| Institution | Type | Status |
|-------------|------|--------|
| Interactive Brokers | Brokerage | ✅ Supported |
| Charles Schwab | Brokerage | ✅ Supported |
| Chase Bank | Bank | ✅ Supported |
| Bank of America | Bank | ✅ Supported |
| NBK (Kuwait) | Bank | ✅ Supported |

### High Priority Candidates

| Institution | Type | Why |
|-------------|------|-----|
| **Wise** | Fintech | #1 multi-currency platform for nomads |
| **Revolut** | Fintech | 45M users, comprehensive international features |
| **Fidelity** | Brokerage | Major US brokerage, popular with expats |

### Tasks

| Task | Status |
|------|--------|
| Review current roadmap priorities | ⬜ Pending |
| Research Wise CSV export format | ⬜ Pending |
| Research Revolut CSV export format | ⬜ Pending |
| Decide next parser to implement | ⬜ Pending |

---

## Phase 2: Research - SimpleFIN and Bank Data Aggregation

Research bank data integration options for U.S. developers, focusing on SimpleFIN and the broader aggregation landscape.

### Overview

SimpleFIN is a bank data aggregation service that provides a simpler alternative to Plaid for accessing bank transaction data.

### Research Questions

| Question | Notes |
|----------|-------|
| What is SimpleFIN? | API service for bank data access |
| How does it compare to Plaid? | Pricing, coverage, ease of use |
| What banks are supported? | Coverage for target user base |
| Integration complexity | API documentation, SDK availability |
| Cost structure | Pricing for small apps vs enterprise |
| Privacy/security model | Data handling practices |

### Aggregation Landscape

| Provider | Type | Notes |
|----------|------|-------|
| **Plaid** | Market leader | Expensive, comprehensive |
| **SimpleFIN** | Alternative | Simpler, potentially cheaper |
| **Finicity** (Mastercard) | Enterprise | Visa competitor |
| **Yodlee** | Legacy | Acquired by Envestnet |
| **MX** | Open finance | Focus on data enhancement |
| **Akoya** | Bank-owned | Direct API connections |

### Potential Use Cases

- Automatic transaction import (replace manual CSV)
- Real-time balance updates
- Categorization and insights
- Budget tracking integration

### Output

Research document summarizing findings and recommendation for whether to pursue integration.

---

## Dependencies Summary

| Phase | Dependencies |
|-------|--------------|
| CSV Parser Expansion | Sample CSV files from target institutions |
| SimpleFIN Research | API documentation review |

---
