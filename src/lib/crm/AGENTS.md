# CRM rules

- CRM closure: prospects join CRM Arma tu viaje only by redeeming a hashed link at `/continuar/$token` (`src/lib/crm/closure*.ts`), reusing the active trip and case RPC; pay links only for direct-sale experiences. Why: consented, account-backed handoff.
- CRM presales: a «Preventa» is a `purpose='pay'` row of `crm_prospect_invites` (folio, quantity, frozen total, TTL); redemption creates the order through the existing direct-sale checkout, expiry is derived from `expires_at` and reconciled by the hourly CRM hook. Why: no parallel presale or payment model.
- CRM funnel: sales per channel are computed only by `funnel-rules.ts` from orders attributed to exactly one prospect (pay link first, then a unique linked account); ambiguous orders are not counted. Why: no guessed revenue in the Founder dashboard.
