/** A session identifier is not proof of ownership. */
export function canAccessAluxSession(
  ownerId: string | null,
  callerId: string | null,
  storedProofHash: string | null,
  suppliedProofHash: string | null,
): boolean {
  if (ownerId) return ownerId === callerId;
  return Boolean(storedProofHash && suppliedProofHash && storedProofHash === suppliedProofHash);
}