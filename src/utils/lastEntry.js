// Remembers the last entry a user picked on Portfolio or Transactions, so
// switching between those tabs (or reloading) doesn't force a re-pick.
// Lives in sessionStorage alongside the existing auth keys ('sports-exchange.email'
// / '.token') and is cleared automatically by NavBar's logOut() sessionStorage.clear().
const LAST_ENTRY_ID_KEY = 'sports-exchange.lastEntryId';

export function getLastEntryId() {
  return sessionStorage.getItem(LAST_ENTRY_ID_KEY);
}

export function setLastEntryId(entryId) {
  if (entryId) {
    sessionStorage.setItem(LAST_ENTRY_ID_KEY, entryId);
  }
}
