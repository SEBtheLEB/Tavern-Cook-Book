// Imported first by main.tsx: the offline guard is installed before any other module is evaluated.
import { installOfflineNetworkGuard, isWorkshopOffline } from "./workshopRuntime";

// STL Workshop Offline Preview: refuse every team, Google and paid-service request before the app starts.
if (isWorkshopOffline()) installOfflineNetworkGuard();
