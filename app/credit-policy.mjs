// Pause registered signup/daily gifts while preserving their original code paths.
// Guest one-time trials and purchased credits keep their existing policies.
// Restore only together with a reviewed database migration that enables grants.
export const REGISTERED_FREE_CREDITS_ENABLED = false;
