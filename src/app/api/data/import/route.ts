import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSlug } from '@/lib/vietnamese';
import Papa from 'papaparse';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const isDryRun = formData.get('dryRun') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn tệp để nhập' }, { status: 400 });
    }

    const fileText = await file.text();
    const filename = file.name.toLowerCase();

    // 1. JSON Backup Restore
    if (filename.endsWith('.json')) {
      let jsonContent: any;
      try {
        jsonContent = JSON.parse(fileText);
      } catch {
        return NextResponse.json({ error: 'Định dạng tệp JSON không hợp lệ' }, { status: 400 });
      }

      if (!jsonContent.data || !jsonContent.data.items) {
        return NextResponse.json(
          { error: 'Cấu trúc tệp backup không hợp lệ hoặc thiếu dữ liệu items' },
          { status: 400 }
        );
      }

      const { categories = [], locations = [], units = [], tags = [], items = [], transactions = [] } = jsonContent.data;

      if (isDryRun) {
        return NextResponse.json({
          success: true,
          dryRun: true,
          type: 'json',
          stats: {
            categories: categories.length,
            locations: locations.length,
            units: units.length,
            tags: tags.length,
            items: items.length,
            transactions: transactions.length,
          },
        });
      }

      // Safe Upsert for Categories
      for (const cat of categories) {
        await prisma.category.upsert({
          where: { id: cat.id },
          update: {
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            icon: cat.icon,
            parentId: cat.parentId,
          },
          create: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            icon: cat.icon,
            parentId: cat.parentId,
          },
        });
      }

      // Safe Upsert for Locations
      for (const loc of locations) {
        await prisma.storageLocation.upsert({
          where: { id: loc.id },
          update: {
            name: loc.name,
            code: loc.code,
            description: loc.description,
            image: loc.image,
            parentId: loc.parentId,
          },
          create: {
            id: loc.id,
            name: loc.name,
            code: loc.code,
            description: loc.description,
            image: loc.image,
            parentId: loc.parentId,
          },
        });
      }

      // Safe Upsert for Units
      for (const u of units) {
        await prisma.unit.upsert({
          where: { id: u.id },
          update: { name: u.name, symbol: u.symbol, isDefault: u.isDefault, order: u.order },
          create: { id: u.id, name: u.name, symbol: u.symbol, isDefault: u.isDefault, order: u.order },
        });
      }

      // Safe Upsert for Tags
      for (const t of tags) {
        await prisma.tag.upsert({
          where: { id: t.id },
          update: { name: t.name, slug: t.slug },
          create: { id: t.id, name: t.name, slug: t.slug },
        });
      }

      // Safe Upsert for Items
      for (const item of items) {
        const { tags: itemTags, images: itemImages, ...itemData } = item;
        await prisma.item.upsert({
          where: { id: item.id },
          update: {
            sku: itemData.sku,
            name: itemData.name,
            slug: itemData.slug,
            description: itemData.description,
            categoryId: itemData.categoryId,
            subcategory: itemData.subcategory,
            brand: itemData.brand,
            model: itemData.model,
            quantity: itemData.quantity,
            unit: itemData.unit,
            minimumQuantity: itemData.minimumQuantity,
            condition: itemData.condition,
            locationId: itemData.locationId,
            container: itemData.container,
            exactPosition: itemData.exactPosition,
            purchasePrice: itemData.purchasePrice,
            purchaseDate: itemData.purchaseDate ? new Date(itemData.purchaseDate) : null,
            supplier: itemData.supplier,
            notes: itemData.notes,
            barcode: itemData.barcode,
            qrCodeValue: itemData.qrCodeValue,
            mainImage: itemData.mainImage,
            isFavorite: itemData.isFavorite,
          },
          create: {
            id: itemData.id,
            sku: itemData.sku,
            name: itemData.name,
            slug: itemData.slug,
            description: itemData.description,
            categoryId: itemData.categoryId,
            subcategory: itemData.subcategory,
            brand: itemData.brand,
            model: itemData.model,
            quantity: itemData.quantity,
            unit: itemData.unit,
            minimumQuantity: itemData.minimumQuantity,
            condition: itemData.condition,
            locationId: itemData.locationId,
            container: itemData.container,
            exactPosition: itemData.exactPosition,
            purchasePrice: itemData.purchasePrice,
            purchaseDate: itemData.purchaseDate ? new Date(itemData.purchaseDate) : null,
            supplier: itemData.supplier,
            notes: itemData.notes,
            barcode: itemData.barcode,
            qrCodeValue: itemData.qrCodeValue,
            mainImage: itemData.mainImage,
            isFavorite: itemData.isFavorite,
          },
        });

        // Reconnect tags
        if (itemTags && Array.isArray(itemTags)) {
          await prisma.itemTag.deleteMany({ where: { itemId: item.id } });
          for (const it of itemTags) {
            await prisma.itemTag.create({
              data: { itemId: item.id, tagId: it.tagId },
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã khôi phục thành công ${items.length} vật tư, ${categories.length} danh mục, ${locations.length} vị trí.`,
      });
    }

    // 2. CSV Import
    if (filename.endsWith('.csv')) {
      const parsedCsv = Papa.parse<Record<string, string>>(fileText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsedCsv.errors.length > 0 && parsedCsv.data.length === 0) {
        return NextResponse.json({ error: 'Lỗi phân tích cú pháp CSV' }, { status: 400 });
      }

      const rows = parsedCsv.data;
      const errors: string[] = [];
      const validRows: any[] = [];

      // Pre-fetch categories and locations for mapping
      const [allCategories, allLocations] = await Promise.all([
        prisma.category.findMany(),
        prisma.storageLocation.findMany(),
      ]);

      const defaultCategory = allCategories[0];
      const defaultLocation = allLocations[0];

      if (!defaultCategory || !defaultLocation) {
        return NextResponse.json(
          { error: 'Cần có ít nhất 1 Danh mục và 1 Vị trí trong hệ thống trước khi nhập CSV' },
          { status: 400 }
        );
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row['Tên vật tư'] || row['name'] || row['Name'];
        if (!name) {
          errors.push(`Dòng ${i + 2}: Thiếu Tên vật tư`);
          continue;
        }

        const categoryName = row['Danh mục'] || row['category'] || '';
        let categoryId = defaultCategory.id;
        if (categoryName) {
          const matchCat = allCategories.find(
            (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
          );
          if (matchCat) categoryId = matchCat.id;
        }

        const locationName = row['Vị trí lưu trữ'] || row['location'] || '';
        let locationId = defaultLocation.id;
        if (locationName) {
          const matchLoc = allLocations.find(
            (l) => l.name.toLowerCase() === locationName.trim().toLowerCase()
          );
          if (matchLoc) locationId = matchLoc.id;
        }

        const quantity = parseFloat(row['Số lượng'] || row['quantity'] || '0') || 0;
        const unit = row['Đơn vị'] || row['unit'] || 'cái';
        const minimumQuantity = parseFloat(row['Tối thiểu'] || row['min_quantity'] || '0') || 0;
        const sku = row['Mã SKU'] || row['sku'] || null;
        const brand = row['Thương hiệu'] || row['brand'] || null;
        const model = row['Model'] || row['model'] || null;
        const condition = row['Tình trạng'] || row['condition'] || 'NEW';
        const container = row['Tủ / Kệ'] || row['container'] || null;
        const exactPosition = row['Ngăn / Hộp / Vị trí chi tiết'] || row['exact_position'] || null;
        const purchasePrice = parseFloat(row['Giá mua'] || row['price'] || '0') || null;
        const notes = row['Ghi chú'] || row['notes'] || null;
        const barcode = row['Mã vạch'] || row['barcode'] || null;
        const rawTags = (row['Thẻ (Tags)'] || row['tags'] || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        validRows.push({
          name: name.trim(),
          categoryId,
          locationId,
          quantity,
          unit: unit.trim(),
          minimumQuantity,
          sku: sku?.trim() || null,
          brand: brand?.trim() || null,
          model: model?.trim() || null,
          condition,
          container: container?.trim() || null,
          exactPosition: exactPosition?.trim() || null,
          purchasePrice,
          notes: notes?.trim() || null,
          barcode: barcode?.trim() || null,
          tags: rawTags,
        });
      }

      if (isDryRun) {
        return NextResponse.json({
          success: true,
          dryRun: true,
          type: 'csv',
          totalRows: rows.length,
          validCount: validRows.length,
          errorCount: errors.length,
          errors: errors.slice(0, 10),
          preview: validRows.slice(0, 5),
        });
      }

      // Execute CSV Import
      let importedCount = 0;
      for (const itemData of validRows) {
        const baseSlug = createSlug(itemData.name);
        let slug = baseSlug;
        let count = 1;
        while (await prisma.item.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${count++}`;
        }

        const qrCodeValue = itemData.sku ? `ITEM:${itemData.sku}` : `ITEM:${slug}`;

        const created = await prisma.item.create({
          data: {
            name: itemData.name,
            slug,
            categoryId: itemData.categoryId,
            locationId: itemData.locationId,
            quantity: itemData.quantity,
            unit: itemData.unit,
            minimumQuantity: itemData.minimumQuantity,
            sku: itemData.sku,
            brand: itemData.brand,
            model: itemData.model,
            condition: itemData.condition,
            container: itemData.container,
            exactPosition: itemData.exactPosition,
            purchasePrice: itemData.purchasePrice,
            notes: itemData.notes,
            barcode: itemData.barcode,
            qrCodeValue,
          },
        });

        // Tags
        for (const t of itemData.tags) {
          const tSlug = createSlug(t);
          const tagRecord = await prisma.tag.upsert({
            where: { name: t.toLowerCase() },
            update: {},
            create: { name: t.toLowerCase(), slug: tSlug },
          });
          await prisma.itemTag.create({
            data: { itemId: created.id, tagId: tagRecord.id },
          });
        }

        // Initial transaction
        if (itemData.quantity > 0) {
          await prisma.inventoryTransaction.create({
            data: {
              itemId: created.id,
              type: 'IN',
              quantity: itemData.quantity,
              previousQuantity: 0,
              newQuantity: itemData.quantity,
              destinationLocationId: itemData.locationId,
              note: 'Nhập từ tệp CSV',
              createdBy: user.username,
            },
          });
        }

        importedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Đã nhập thành công ${importedCount} vật tư từ CSV.`,
        errors,
      });
    }

    return NextResponse.json({ error: 'Định dạng tệp không được hỗ trợ (chỉ nhận .json hoặc .csv)' }, { status: 400 });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Lỗi nhập dữ liệu' }, { status: 500 });
  }
}
