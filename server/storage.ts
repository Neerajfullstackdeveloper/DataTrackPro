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
import { eq, and, desc, sql } from "drizzle-orm";
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
  createComment(comment: InsertComment & { userId: number }): Promise<Comment>;
  updateCompanyStatus(companyId: number, category: string): Promise<void>;

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

  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

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
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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
    return await db.select().from(companies).orderBy(desc(companies.updatedAt));
  }

  async getCompaniesByUser(userId: number): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(eq(companies.assignedToUserId, userId))
      .orderBy(desc(companies.updatedAt));
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
    const query = db
      .select({
        id: companies.id,
        name: companies.name,
        industry: companies.industry,
        email: companies.email,
        phone: companies.phone,
        address: companies.address,
        website: companies.website,
        companySize: companies.companySize,
        notes: companies.notes,
        status: companies.status,
        assignedToUserId: companies.assignedToUserId,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .innerJoin(comments, eq(companies.id, comments.companyId))
      .where(eq(comments.category, category));

    if (userId) {
      query.where(and(eq(comments.category, category), eq(companies.assignedToUserId, userId)));
    }

    return await query.orderBy(desc(companies.updatedAt));
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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.userId, userId),
          sql`${comments.commentDate} >= ${today}`,
          sql`${comments.commentDate} < ${tomorrow}`
        )
      )
      .orderBy(desc(comments.commentDate));
  }

  async createComment(comment: InsertComment & { userId: number }): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();

    // Update company status based on comment category
    await this.updateCompanyStatus(comment.companyId, comment.category);

    return newComment;
  }

  async updateCompanyStatus(companyId: number, category: string): Promise<void> {
    await db
      .update(companies)
      .set({ updatedAt: new Date() })
      .where(eq(companies.id, companyId));
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
    const [request] = await db
      .update(dataRequests)
      .set({
        status,
        approvedBy,
        updatedAt: new Date(),
      })
      .where(eq(dataRequests.id, id))
      .returning();

    // If approved, assign companies to the user
    if (status === "approved" && request) {
      await this.assignCompaniesToUser(request.userId, 10);
      await db
        .update(dataRequests)
        .set({ companiesAssigned: 10 })
        .where(eq(dataRequests.id, id));
    }

    return request || undefined;
  }

  async assignCompaniesToUser(userId: number, count: number): Promise<Company[]> {
    // Get unassigned companies
    const unassignedCompanies = await db
      .select()
      .from(companies)
      .where(sql`${companies.assignedToUserId} IS NULL`)
      .limit(count);

    if (unassignedCompanies.length === 0) {
      return [];
    }

    // Assign them to the user
    const companyIds = unassignedCompanies.map(c => c.id);
    await db
      .update(companies)
      .set({ assignedToUserId: userId, updatedAt: new Date() })
      .where(sql`${companies.id} IN (${companyIds.join(',')})`);

    return unassignedCompanies;
  }

  // Holiday management
  async getAllHolidays(): Promise<Holiday[]> {
    return await db
      .select()
      .from(holidays)
      .orderBy(holidays.date);
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db
      .insert(holidays)
      .values(holiday)
      .returning();
    return newHoliday;
  }

  async updateHoliday(id: number, updates: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const [holiday] = await db
      .update(holidays)
      .set(updates)
      .where(eq(holidays.id, id))
      .returning();
    return holiday || undefined;
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
    const [request] = await db
      .update(facebookDataRequests)
      .set({
        status,
        approvedBy,
        updatedAt: new Date(),
      })
      .where(eq(facebookDataRequests.id, id))
      .returning();
    return request || undefined;
  }
}

export const storage = new DatabaseStorage();
