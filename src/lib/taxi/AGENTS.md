# Taxi Alux rules

- Taxi Alux uses `platform_settings` key `taxi_alux.settings` plus `taxi_drivers`, `taxi_rides`, `taxi_ride_events` and private `taxi_driver_invitations`; public quotes, token-only applications and every write go through RPCs, while the admin, traveler and driver surfaces use the existing PublicShell/Workspace Engine. Why: one fare/availability and admin-approval authority, no parallel transport/payment model, and existing rides remain operable when new requests are switched off.
