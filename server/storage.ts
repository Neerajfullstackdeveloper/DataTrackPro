import { 
  users, 
  companies, 
  comments, 
  dataRequests, 
  holidays, 
  facebookDataRequests,
  type User, 
  type InsertUser,
  type Company,
  type InsertCompany,
  type Comment,
  type InsertComment,
  type DataRequest,
  type InsertDataRequest,
  type Holiday,
  type InsertHoliday,
  type FacebookDataRequest,
  type InsertFacebookDataRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, isNull, inArray, getTableColumns } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLoginTime(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  // Company management
  getAllCompanies(): Promise<Company[]>;
  getCompaniesByUser(userId: number): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany & { assignedToUserId?: number }): Promise<Company>;
  updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<void>;
  getCompaniesByCategory(category: string, userId?: number): Promise<Company[]>;

  // Comment management
  getCommentsByCompany(companyId: number): Promise<Comment[]>;
  getCommentsByUser(userId: number): Promise<Comment[]>;
  getTodaysCommentsByUser(userId: number): Promise<Comment[]>;
  createComment(comment: InsertComment & { userId: number }): Promise<{ comment: Comment, updatedCompany: Company }>;

  // Data request management
  getDataRequestsByUser(userId: number): Promise<DataRequest[]>;
  getPendingDataRequests(): Promise<DataRequest[]>;
  createDataRequest(request: InsertDataRequest & { userId: number }): Promise<DataRequest>;
  updateDataRequestStatus(id: number, status: string, approvedBy?: number): Promise<DataRequest | undefined>;
  assignCompaniesToUser(userId: number, count: number): Promise<Company[]>;

  // Holiday management
  getAllHolidays(): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, updates: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: number): Promise<void>;

  // Facebook data request management
  getFacebookDataRequestsByUser(userId: number): Promise<FacebookDataRequest[]>;
  getPendingFacebookDataRequests(): Promise<FacebookDataRequest[]>;
  createFacebookDataRequest(request: InsertFacebookDataRequest & { userId: number }): Promise<FacebookDataRequest>;
  updateFacebookDataRequestStatus(id: number, status: string, approvedBy?: number): Promise<FacebookDataRequest | undefined>;
  getFacebookDataRequestById(id: number): Promise<FacebookDataRequest | undefined>;

  sessionStore: session.Store;
}


export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log('Creating user in database:', {
        ...insertUser,
        password: '[REDACTED]'
      });
      
      // Check for existing user with same username
      const existingUsername = await this.getUserByUsername(insertUser.username);
      if (existingUsername) {
        throw new Error(`User with username '${insertUser.username}' already exists`);
      }
      
      // Check for existing user with same email
      const existingEmail = await this.getUserByEmail(insertUser.email);
      if (existingEmail) {
        throw new Error(`User with email '${insertUser.email}' already exists`);
      }
      
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
        
      console.log('User created successfully:', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
      
      return user;
    } catch (error: any) {
      console.error('Error creating user:', {
        name: error.name,
        message: error.message,
        code: error.code,
        constraint: error.constraint_name,
        detail: error.detail,
        stack: error.stack
      });
      
      // Handle unique constraint violations
      if (error.code === '23505') { // PostgreSQL unique violation code
        const field = error.constraint_name?.includes('username') ? 'username' :
                     error.constraint_name?.includes('email') ? 'email' :
                     error.constraint_name?.includes('employee_id') ? 'employeeId' : 'unknown';
        throw new Error(`User with this ${field} already exists`);
      }
      
      throw error;
    }
  }

  async updateUserLoginTime(id: number): Promise<void> {
    await db
      .update(users)
      .set({ loginTime: new Date() })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Company management
  async getAllCompanies(): Promise<Company[]> {
    const result = await db
      .select({
        ...getTableColumns(companies),
        assignedToUser: users,
      })
      .from(companies)
      .leftJoin(users, eq(companies.assignedToUserId, users.id))
      .orderBy(desc(companies.updatedAt));
    
    return result as Company[];
  }

  async getCompaniesByUser(userId: number): Promise<Company[]> {
    const result = await db
      .select({
        ...getTableColumns(companies),
        assignedToUser: users,
      })
      .from(companies)
      .leftJoin(users, eq(companies.assignedToUserId, users.id))
      .where(
        and(
          eq(companies.assignedToUserId, userId),
          eq(companies.category, "assigned")
        )
      )
      .orderBy(desc(companies.updatedAt));

    return result as Company[];
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(company: InsertCompany & { assignedToUserId?: number }): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values({
        ...company,
        updatedAt: new Date(),
      })
      .returning();
    return newCompany;
  }

  async updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getCompaniesByCategory(category: string, userId?: number): Promise<Company[]> {
    const filters = [eq(companies.category, category)];
    if (userId) {
      filters.push(eq(companies.assignedToUserId, userId));
    }

    const result = await db.select({
      ...getTableColumns(companies),
      assignedToUser: users,
    })
    .from(companies)
    .leftJoin(users, eq(companies.assignedToUserId, users.id))
    .where(and(...filters))
    .orderBy(desc(companies.updatedAt));

    return result as Company[];
  }

  // Comment management
  async getCommentsByCompany(companyId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.companyId, companyId))
      .orderBy(desc(comments.createdAt));
  }

  async getCommentsByUser(userId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.userId, userId))
      .orderBy(desc(comments.createdAt));
  }

  async getTodaysCommentsByUser(userId: number): Promise<Comment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.userId, userId),
          sql`DATE(${comments.createdAt}) = DATE(${today})`
        )
      )
      .orderBy(desc(comments.createdAt));
  }

  async createComment(
    commentData: InsertComment & { userId: number }
  ): Promise<{ comment: Comment, updatedCompany: Company }> {
    return db.transaction(async (tx) => {
      // Step 1: Create the new comment
      const [comment] = await tx
        .insert(comments)
        .values({
          ...commentData,
          commentDate: new Date(commentData.commentDate),
        })
        .returning();

      // Step 2: Update the company's category
      const [updatedCompany] = await tx
        .update(companies)
        .set({ category: commentData.category, updatedAt: new Date() })
        .where(eq(companies.id, commentData.companyId))
        .returning();

      if (!updatedCompany) {
        tx.rollback();
        throw new Error("Company not found, comment creation rolled back.");
      }

      return { comment, updatedCompany };
    });
  }

  // Data request management
  async getDataRequestsByUser(userId: number): Promise<DataRequest[]> {
    return await db
      .select()
      .from(dataRequests)
      .where(eq(dataRequests.userId, userId))
      .orderBy(desc(dataRequests.createdAt));
  }

  async getPendingDataRequests(): Promise<DataRequest[]> {
    return await db
      .select()
      .from(dataRequests)
      .where(eq(dataRequests.status, "pending"))
      .orderBy(desc(dataRequests.createdAt));
  }

  async createDataRequest(request: InsertDataRequest & { userId: number }): Promise<DataRequest> {
    const [newRequest] = await db
      .insert(dataRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updateDataRequestStatus(id: number, status: string, approvedBy?: number): Promise<DataRequest | undefined> {
    const [updatedRequest] = await db
      .update(dataRequests)
      .set({ 
        status, 
        approvedBy,
        updatedAt: new Date(),
      })
      .where(eq(dataRequests.id, id))
      .returning();
      
    return updatedRequest || undefined;
  }

  async assignCompaniesToUser(userId: number, count: number): Promise<Company[]> {
    try {
      const unassignedCompanies = await this.getUnassignedCompanies(count);

      if (unassignedCompanies.length === 0) {
        return [];
      }

      const companyIds = unassignedCompanies.map(c => c.id);

      await db
        .update(companies)
        .set({ 
          assignedToUserId: userId,
          updatedAt: new Date()
        })
        .where(inArray(companies.id, companyIds));

      const updatedCompanies = await db
        .select()
        .from(companies)
        .where(inArray(companies.id, companyIds));

      return updatedCompanies;
    } catch (error) {
      console.error('Error assigning companies:', error);
      throw error;
    }
  }

  // Holiday management
  async getAllHolidays(): Promise<Holiday[]> {
    return await db.select().from(holidays).orderBy(desc(holidays.date));
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db
      .insert(holidays)
      .values(holiday)
      .returning();
    return newHoliday;
  }

  async updateHoliday(id: number, updates: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const [updatedHoliday] = await db
      .update(holidays)
      .set(updates)
      .where(eq(holidays.id, id))
      .returning();
    return updatedHoliday || undefined;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  // Facebook data request management
  async getFacebookDataRequestsByUser(userId: number): Promise<FacebookDataRequest[]> {
    return await db
      .select()
      .from(facebookDataRequests)
      .where(eq(facebookDataRequests.userId, userId))
      .orderBy(desc(facebookDataRequests.createdAt));
  }

  async getPendingFacebookDataRequests(): Promise<FacebookDataRequest[]> {
    return await db
      .select()
      .from(facebookDataRequests)
      .where(eq(facebookDataRequests.status, "pending"))
      .orderBy(desc(facebookDataRequests.createdAt));
  }

  async createFacebookDataRequest(request: InsertFacebookDataRequest & { userId: number }): Promise<FacebookDataRequest> {
    const [newRequest] = await db
      .insert(facebookDataRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updateFacebookDataRequestStatus(id: number, status: string, approvedBy?: number): Promise<FacebookDataRequest | undefined> {
    const [updatedRequest] = await db
      .update(facebookDataRequests)
      .set({ 
        status, 
        approvedBy,
        updatedAt: new Date(),
      })
      .where(eq(facebookDataRequests.id, id))
      .returning();
      
    return updatedRequest || undefined;
  }

  async getFacebookDataRequestById(id: number): Promise<FacebookDataRequest | undefined> {
    const [request] = await db.select().from(facebookDataRequests).where(eq(facebookDataRequests.id, id));
    return request || undefined;
  }

  async getDataRequestById(id: number): Promise<DataRequest | undefined> {
    const [request] = await db.select().from(dataRequests).where(eq(dataRequests.id, id));
    return request || undefined;
  }

  async getUnassignedCompanies(limit: number) {
    return await db
      .select()
      .from(companies)
      .where(isNull(companies.assignedToUserId))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();

export async function assignCompanyToUser(companyId: number, userId: number) {
  const [updatedCompany] = await db
    .update(companies)
    .set({ assignedToUserId: userId, updatedAt: new Date() })
    .where(eq(companies.id, companyId))
    .returning();
  return updatedCompany;
}

export async function getCompaniesForUser(userId: number) {
  const userCompanies = await db
    .select()
    .from(companies)
    .where(eq(companies.assignedToUserId, userId));
  return userCompanies;
}
