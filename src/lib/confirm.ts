/**
 * Simple confirmation dialog wrapper using native confirm().
 * Returns true if the user confirmed, false otherwise.
 */
export const confirmAction = (message: string): boolean => {
  return window.confirm(message);
};
