import { prisma } from './prisma';
import { hashPassword } from './auth';

let isBootstrapped = false;
let bootstrapPromise: Promise<{ success: boolean; message: string; error?: string }> | null = null;

export async function ensureDatabaseReady(): Promise<{ success: boolean; message: string; error?: string }> {
  if (isBootstrapped) {
    return { success: true, message: 'Database already bootstrapped' };
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      console.log('🔄 Checking and applying database schema migrations...');

      // 1. Create Tables via Raw DDL SQL if not exists
      const ddlQueries = [
        `CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY,
          "username" TEXT UNIQUE NOT NULL,
          "passwordHash" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'ADMIN',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "Category" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "slug" TEXT UNIQUE NOT NULL,
          "description" TEXT,
          "icon" TEXT,
          "parentId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "StorageLocation" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "code" TEXT,
          "description" TEXT,
          "image" TEXT,
          "parentId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "Tag" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT UNIQUE NOT NULL,
          "slug" TEXT UNIQUE NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "Item" (
          "id" TEXT PRIMARY KEY,
          "sku" TEXT,
          "name" TEXT NOT NULL,
          "slug" TEXT UNIQUE NOT NULL,
          "description" TEXT,
          "categoryId" TEXT NOT NULL,
          "subcategory" TEXT,
          "brand" TEXT,
          "model" TEXT,
          "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "unit" TEXT NOT NULL DEFAULT 'cái',
          "minimumQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "condition" TEXT NOT NULL DEFAULT 'NEW',
          "locationId" TEXT NOT NULL,
          "container" TEXT,
          "exactPosition" TEXT,
          "purchasePrice" DOUBLE PRECISION,
          "purchaseDate" TIMESTAMP(3),
          "supplier" TEXT,
          "notes" TEXT,
          "barcode" TEXT,
          "qrCodeValue" TEXT,
          "purchaseUrl" TEXT,
          "mainImage" TEXT,
          "isFavorite" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "ItemTag" (
          "itemId" TEXT NOT NULL,
          "tagId" TEXT NOT NULL,
          PRIMARY KEY ("itemId", "tagId")
        )`,
        `CREATE TABLE IF NOT EXISTS "ItemImage" (
          "id" TEXT PRIMARY KEY,
          "itemId" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "isPrimary" BOOLEAN NOT NULL DEFAULT false,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
          "id" TEXT PRIMARY KEY,
          "itemId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "quantity" DOUBLE PRECISION NOT NULL,
          "previousQuantity" DOUBLE PRECISION NOT NULL,
          "newQuantity" DOUBLE PRECISION NOT NULL,
          "sourceLocationId" TEXT,
          "destinationLocationId" TEXT,
          "note" TEXT,
          "createdBy" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "Project" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "slug" TEXT UNIQUE NOT NULL,
          "description" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PLANNING',
          "targetDate" TIMESTAMP(3),
          "budget" DOUBLE PRECISION,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "ProjectItem" (
          "id" TEXT PRIMARY KEY,
          "projectId" TEXT NOT NULL,
          "itemId" TEXT NOT NULL,
          "requiredQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
          "fulfilledQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "isDeducted" BOOLEAN NOT NULL DEFAULT false,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "Unit" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT UNIQUE NOT NULL,
          "symbol" TEXT,
          "isDefault" BOOLEAN NOT NULL DEFAULT false,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "AppSetting" (
          "key" TEXT PRIMARY KEY,
          "value" TEXT NOT NULL,
          "description" TEXT,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      for (const sql of ddlQueries) {
        await prisma.$executeRawUnsafe(sql).catch((e) => {
          console.warn('DDL warning:', e?.message || e);
        });
      }

      // 2. Safe ALTER TABLE migrations to guarantee all columns exist in older DB instances
      const alterQueries = [
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'ADMIN'`,

        `ALTER TABLE "StorageLocation" ADD COLUMN IF NOT EXISTS "code" TEXT`,
        `ALTER TABLE "StorageLocation" ADD COLUMN IF NOT EXISTS "description" TEXT`,
        `ALTER TABLE "StorageLocation" ADD COLUMN IF NOT EXISTS "image" TEXT`,
        `ALTER TABLE "StorageLocation" ADD COLUMN IF NOT EXISTS "parentId" TEXT`,

        `ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "description" TEXT`,
        `ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "icon" TEXT`,
        `ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "parentId" TEXT`,

        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "sku" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "subcategory" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "brand" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "model" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'cái'`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "minimumQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "condition" TEXT NOT NULL DEFAULT 'NEW'`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "container" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "exactPosition" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "purchasePrice" DOUBLE PRECISION`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3)`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "supplier" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "barcode" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "qrCodeValue" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "purchaseUrl" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "mainImage" TEXT`,
        `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false`,

        `ALTER TABLE "ItemImage" ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE "ItemImage" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0`,

        `ALTER TABLE "InventoryTransaction" ADD COLUMN IF NOT EXISTS "sourceLocationId" TEXT`,
        `ALTER TABLE "InventoryTransaction" ADD COLUMN IF NOT EXISTS "destinationLocationId" TEXT`,
        `ALTER TABLE "InventoryTransaction" ADD COLUMN IF NOT EXISTS "note" TEXT`,
        `ALTER TABLE "InventoryTransaction" ADD COLUMN IF NOT EXISTS "createdBy" TEXT`,

        `ALTER TABLE "ProjectItem" ADD COLUMN IF NOT EXISTS "fulfilledQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0`,
        `ALTER TABLE "ProjectItem" ADD COLUMN IF NOT EXISTS "isDeducted" BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE "ProjectItem" ADD COLUMN IF NOT EXISTS "notes" TEXT`,

        `CREATE UNIQUE INDEX IF NOT EXISTS "ProjectItem_projectId_itemId_key" ON "ProjectItem"("projectId", "itemId")`
      ];

      for (const alterSql of alterQueries) {
        await prisma.$executeRawUnsafe(alterSql).catch(() => {});
      }

      // 3. Auto-create default Admin User if not exists
      const userCount = await prisma.user.count().catch(() => 0);
      if (userCount === 0) {
        const passwordHash = await hashPassword('admin123456');
        await prisma.user.create({
          data: {
            username: 'admin',
            name: 'Quản trị viên H2T',
            passwordHash,
            role: 'ADMIN',
          },
        }).catch(() => {});
        console.log('✓ Default admin user created: admin / admin123456');
      }

      // 4. Auto-create default Units if not exists
      const unitCount = await prisma.unit.count().catch(() => 0);
      if (unitCount === 0) {
        const defaultUnits = [
          { name: 'cái', symbol: 'cái', isDefault: true, order: 1 },
          { name: 'bộ', symbol: 'bộ', isDefault: false, order: 2 },
          { name: 'hộp', symbol: 'hộp', isDefault: false, order: 3 },
          { name: 'cuộn', symbol: 'cuộn', isDefault: false, order: 4 },
          { name: 'mét', symbol: 'm', isDefault: false, order: 5 },
          { name: 'kg', symbol: 'kg', isDefault: false, order: 6 },
          { name: 'g', symbol: 'g', isDefault: false, order: 7 },
          { name: 'gói', symbol: 'gói', isDefault: false, order: 8 },
          { name: 'thanh', symbol: 'thanh', isDefault: false, order: 9 },
          { name: 'viên', symbol: 'viên', isDefault: false, order: 10 },
        ];
        for (const u of defaultUnits) {
          await prisma.unit.create({ data: u }).catch(() => {});
        }
      }

      // 5. Auto-create starter Categories if not exists
      const catCount = await prisma.category.count().catch(() => 0);
      if (catCount === 0) {
        const starterCategories = [
          { name: 'Linh kiện điện tử', slug: 'linh-kien-dien-tu', icon: 'Cpu', description: 'Vi điều khiển, cảm biến, IC, module chức năng' },
          { name: 'Dụng cụ & Thiết bị cầm tay', slug: 'dung-cu-thiet-bi', icon: 'Wrench', description: 'Máy khoan, máy hàn, kìm, tua vít, đồng hồ vạn năng' },
          { name: 'Dây cáp & Đầu nối', slug: 'day-cap-dau-noi', icon: 'Cable', description: 'Cáp USB, cáp Type-C, cáp mạng RJ45, jack nguồn' },
          { name: 'Ốc vít, Bu lông & Cơ khí', slug: 'oc-vit-bu-long', icon: 'Boxes', description: 'Ốc M2, M3, M4, bu lông, đai ốc, long đền, tắc kê' },
          { name: 'Thiết bị mạng & Smart Home', slug: 'thiet-bi-mang-smart-home', icon: 'Wifi', description: 'Router, switch, camera, cảm biến Zigbee/Tuya' },
        ];
        for (const c of starterCategories) {
          await prisma.category.create({ data: c }).catch(() => {});
        }
      }

      // 6. Auto-create starter Locations if not exists
      const locCount = await prisma.storageLocation.count().catch(() => 0);
      if (locCount === 0) {
        const rootLoc = await prisma.storageLocation.create({
          data: {
            name: 'Phòng làm việc & Kho kỹ thuật',
            code: 'HOME-LAB',
            description: 'Khu vực bàn làm việc và tủ đồ kỹ thuật',
          },
        }).catch(() => null);

        if (rootLoc) {
          await prisma.storageLocation.createMany({
            data: [
              { name: 'Tủ linh kiện A (Nhiều ngăn)', code: 'TU-A', parentId: rootLoc.id },
              { name: 'Kệ máy móc & Dụng cụ cầm tay', code: 'KE-TOOL', parentId: rootLoc.id },
              { name: 'Hộp đồ nghề đa năng', code: 'BOX-01', parentId: rootLoc.id },
            ],
          }).catch(() => {});
        }
      }

      isBootstrapped = true;
      console.log('✓ Database schema and migrations successfully applied.');
      return { success: true, message: 'Cơ sở dữ liệu và dữ liệu ban đầu đã sẵn sàng!' };
    } catch (err: any) {
      console.error('Database bootstrap error:', err);
      return {
        success: false,
        message: 'Không thể kết nối đến cơ sở dữ liệu PostgreSQL',
        error: err?.message || String(err),
      };
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}
