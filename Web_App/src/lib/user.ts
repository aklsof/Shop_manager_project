/**
 * Represents a user from the `users` table in hybrid_store.
 * Replaces the old employee.ts which mapped to the non-existent tbluser table.
 */

export interface IUser {
  user_id: number;
  username: string;
  role: 'Store Associate' | 'Administrator';
  user_type: string;        // 'client' for web customers, matches users.user_type
  preferred_lang: string;   // 'en' | 'ar'
  is_active: boolean;
}
