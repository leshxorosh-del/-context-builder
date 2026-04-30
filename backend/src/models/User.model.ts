import { query, withTransaction } from '../config/database';
import { PoolClient } from 'pg';

/**
 * User interface
 */
export interface IUser {
  id: string;
  email: string;
  password_hash: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * User without sensitive data
 */
export interface IUserPublic {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: Date;
}

/**
 * User creation data
 */
export interface IUserCreate {
  email: string;
  password_hash: string;
  nickname?: string;
}

/**
 * User update data
 */
export interface IUserUpdate {
  nickname?: string;
  avatar_url?: string;
}

/**
 * Create a new user
 */
export async function createUser(data: IUserCreate, client?: PoolClient): Promise<IUser> {
  const sql = `
    INSERT INTO users (email, password_hash, nickname)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  
  const params = [data.email, data.password_hash, data.nickname || null];
  
  if (client) {
    const result = await client.query<IUser>(sql, params);
    return result.rows[0];
  }
  
  const result = await query<IUser>(sql, params);
  return result.rows[0];
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<IUser | null> {
  const result = await query<IUser>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return result.rows[0] || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<IUser | null> {
  const result = await query<IUser>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update user
 */
export async function updateUser(id: string, data: IUserUpdate): Promise<IUser | null> {
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.nickname !== undefined) {
    updates.push(`nickname = $${paramIndex++}`);
    params.push(data.nickname);
  }

  if (data.avatar_url !== undefined) {
    updates.push(`avatar_url = $${paramIndex++}`);
    params.push(data.avatar_url);
  }

  if (updates.length === 0) {
    return findUserById(id);
  }

  params.push(id);
  
  const result = await query<IUser>(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );
  
  return result.rows[0] || null;
}

/**
 * Delete user (hard delete)
 */
export async function deleteUser(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM users WHERE id = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return result.rows.length > 0;
}

/**
 * Get user count
 */
export async function getUserCount(): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM users'
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Convert user to public format (without password)
 */
export function toPublicUser(user: IUser): IUserPublic {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    created_at: user.created_at
  };
}

/**
 * Create user with subscription in transaction
 */
export async function createUserWithSubscription(
  userData: IUserCreate
): Promise<IUser> {
  return withTransaction(async (client) => {
    // Create user
    const user = await createUser(userData, client);
    
    // Create default free subscription
    await client.query(`
      INSERT INTO subscriptions (user_id, plan, queries_remaining)
      VALUES ($1, 'free', 3)
    `, [user.id]);
    
    // Create default notification config
    await client.query(`
      INSERT INTO notification_configs (user_id)
      VALUES ($1)
    `, [user.id]);
    
    return user;
  });
}

export default {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  deleteUser,
  emailExists,
  getUserCount,
  toPublicUser,
  createUserWithSubscription
};
