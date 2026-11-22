# Profile mode rules

- Profile modes: every surface reads the active profile mode through `useProfileModeState` (`src/lib/profile-mode/use-profile-mode.ts`); inside a workspace the mode follows the panel (`workspace-mode.ts`: CMS/Founder → staff, Portal → business, Concierge → concierge or staff, Cuenta/Mi Viaje → traveler) and is persisted silently, while public pages use the stored mode. Why: a stored preference disconnected from the open panel showed traveler links inside the CMS.
