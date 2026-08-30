import { homePremiumG4DefaultConfig } from "@/components/home-premium/home-premium-config";
const c = homePremiumG4DefaultConfig();
for (const [k, v] of Object.entries(c)) console.log(k, "=", JSON.stringify(v).slice(0, 220));
