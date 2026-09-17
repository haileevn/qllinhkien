import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding H2T Home Inventory database...');

  // 1. Admin User
  const passwordHash = await bcrypt.hash('admin123456', 10);
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Quản trị viên H2T',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`✓ Admin user created/verified: ${user.username}`);

  // 2. Units
  const defaultUnits = [
    { name: 'cái', symbol: 'cái', isDefault: true, order: 1 },
    { name: 'bộ', symbol: 'bộ', isDefault: false, order: 2 },
    { name: 'hộp', symbol: 'hộp', isDefault: false, order: 3 },
    { name: 'cuộn', symbol: 'cuộn', isDefault: false, order: 4 },
    { name: 'mét', symbol: 'm', isDefault: false, order: 5 },
    { name: 'kg', symbol: 'kg', isDefault: false, order: 6 },
    { name: 'g', symbol: 'g', isDefault: false, order: 7 },
    { name: 'lít', symbol: 'L', isDefault: false, order: 8 },
    { name: 'chai', symbol: 'chai', isDefault: false, order: 9 },
    { name: 'gói', symbol: 'gói', isDefault: false, order: 10 },
    { name: 'thùng', symbol: 'thùng', isDefault: false, order: 11 },
    { name: 'thanh', symbol: 'thanh', isDefault: false, order: 12 },
    { name: 'viên', symbol: 'viên', isDefault: false, order: 13 },
  ];

  for (const u of defaultUnits) {
    await prisma.unit.upsert({
      where: { name: u.name },
      update: { symbol: u.symbol, isDefault: u.isDefault, order: u.order },
      create: u,
    });
  }
  console.log('✓ Units seeded');

  // 3. Categories & Subcategories
  const categoriesData = [
    {
      name: 'Linh kiện điện tử',
      slug: 'linh-kien-dien-tu',
      description: 'Vi điều khiển, cảm biến, bán dẫn, IC, module chức năng',
      icon: 'Cpu',
      children: [
        { name: 'Vi điều khiển & Phát triển', slug: 'vi-dieu-khien', description: 'ESP32, Arduino, STM32, Raspberry Pi' },
        { name: 'Cảm biến', slug: 'cam-bien', description: 'Nhiệt độ, độ ẩm, khoảng cách, chuyển động' },
        { name: 'Relay & Điều khiển', slug: 'relay-dieu-khien', description: 'Module relay, optocoupler, SSR' },
        { name: 'Linh kiện thụ động', slug: 'linh-kien-thu-dong', description: 'Điện trở, tụ điện, cuộn cảm, biến trở' },
        { name: 'Bán dẫn & IC', slug: 'ban-dan-ic', description: 'Diode, Transistor, MOSFET, IC nguồn' },
      ],
    },
    {
      name: 'Điện & Nguồn',
      slug: 'dien-va-nguon',
      description: 'Công tắc, ổ cắm, biến áp, adapter nguồn, dây điện',
      icon: 'Zap',
      children: [
        { name: 'Adapter & Bộ nguồn', slug: 'adapter-bo-nguon', description: 'Nguồn tổ ong, adapter DC 5V/12V/24V' },
        { name: 'Công tắc & Ổ cắm', slug: 'cong-tac-o-cam', description: 'Phích cắm, ổ cắm, CB, cầu dao' },
        { name: 'Dây điện nguồn', slug: 'day-dien-nguon', description: 'Dây đôi, dây đơn, dây chịu tải' },
      ],
    },
    {
      name: 'Dây & Adapter kết nối',
      slug: 'day-va-adapter',
      description: 'Cáp USB, cáp sạc, cáp mạng, cáp tín hiệu HDMI/Audio',
      icon: 'Cable',
      children: [
        { name: 'Cáp USB & Type-C', slug: 'cap-usb-type-c', description: 'Cáp sạc, cáp dữ liệu USB-A, Type-C, Lightning' },
        { name: 'Cáp mạng & Đầu bấm', slug: 'cap-mang-dau-bam', description: 'Dây CAT6, RJ45, patch cord' },
        { name: 'Cáp hiển thị & Âm thanh', slug: 'cap-hien-thi-am-thanh', description: 'HDMI, DisplayPort, Jack 3.5mm, RCA' },
      ],
    },
    {
      name: 'Ốc vít & Bulong kim khí',
      slug: 'oc-vit-bulong',
      description: 'Ốc vít, bulong, đai ốc, long đền, phụ kiện kim khí',
      icon: 'Nut',
      children: [
        { name: 'Ốc vít M2 - M3', slug: 'oc-vit-m2-m3', description: 'Ốc bắt mạch, ren nhuyễn, vít điện tử' },
        { name: 'Ốc bulong M4 - M8', slug: 'oc-bulong-m4-m8', description: 'Bulong lục giác, tán, long đền' },
        { name: 'Vít gỗ & Tắc kê', slug: 'vit-go-tac-ke', description: 'Tắc kê nhựa, vít tự khoan, vít nở' },
      ],
    },
    {
      name: 'Dụng cụ cầm tay & Đồ nghề',
      slug: 'dung-cu-cam-tay',
      description: 'Kìm, tua vít, lục giác, mỏ lết, búa, thước đo',
      icon: 'Wrench',
      children: [
        { name: 'Tua vít & Lục giác', slug: 'tua-vit-luc-giac', description: 'Bộ vít chính xác, lục giác bông' },
        { name: 'Kìm & Kéo cắt', slug: 'kim-keo-cat', description: 'Kìm tuốt dây, kìm bấm cos, kìm cắt chân linh kiện' },
        { name: 'Đo lường & Kiểm tra', slug: 'do-luong-kiem-tra', description: 'Đồng hồ vạn năng, bút thử điện, thước kẹp' },
      ],
    },
    {
      name: 'Dụng cụ điện & Máy móc',
      slug: 'dung-cu-dien-may-moc',
      description: 'Máy khoan, máy bắt vít, mỏ hàn, máy in 3D, máy cắt',
      icon: 'Hammer',
      children: [
        { name: 'Hàn & Khò nhiệt', slug: 'han-kho-nhiet', description: 'Mỏ hàn thiếc, trạm hàn T12, máy khò' },
        { name: 'Máy khoan & Bắt vít pin', slug: 'may-khoan-bat-vit', description: 'Máy khoan pin, máy siết bu lông' },
        { name: 'Máy in 3D & Chế tạo', slug: 'may-in-3d-che-tao', description: 'Máy in 3D FDM, cuộn nhựa PLA/PETG' },
      ],
    },
    {
      name: 'Pin & Sạc',
      slug: 'pin-va-sac',
      description: 'Pin Lithium, pin AA/AAA, mạch BMS sạc pin',
      icon: 'BatteryCharging',
      children: [
        { name: 'Pin sạc 18650 / 21700', slug: 'pin-18650-21700', description: 'Cell pin lithium ion dòng xả cao' },
        { name: 'Pin gia dụng AA/AAA/9V', slug: 'pin-aa-aaa', description: 'Pin đũa, pin tiểu, pin nút áo CR2032' },
        { name: 'Mạch sạc & BMS', slug: 'mach-sac-bms', description: 'Mạch bảo vệ pin 1S/2S/3S/4S, TP4056' },
      ],
    },
    {
      name: 'Smart Home & Mạng',
      slug: 'smart-home-mang',
      description: 'Thiết bị Zigbee, WiFi, Router, Switch, Camera',
      icon: 'Wifi',
      children: [
        { name: 'Thiết bị thông minh', slug: 'thiet-bi-thong-minh', description: 'Công tắc thông minh, cảm biến cửa Zigbee' },
        { name: 'Thiết bị mạng & WiFi', slug: 'thiet-bi-mang', description: 'Router, Switch Gigabit, Access Point' },
      ],
    },
    {
      name: 'Vật tư tiêu hao & Keo dán',
      slug: 'vat-tu-tieu-hao-keo',
      description: 'Băng keo, keo nến, keo tản nhiệt, thiếc hàn',
      icon: 'Package',
    },
    {
      name: 'Khác',
      slug: 'khac',
      description: 'Các vật tư khác chưa phân loại',
      icon: 'Folder',
    },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categoriesData) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, icon: cat.icon },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
      },
    });
    categoryMap[cat.slug] = parent.id;

    if (cat.children) {
      for (const child of cat.children) {
        const sub = await prisma.category.upsert({
          where: { slug: child.slug },
          update: { name: child.name, description: child.description, parentId: parent.id },
          create: {
            name: child.name,
            slug: child.slug,
            description: child.description,
            parentId: parent.id,
          },
        });
        categoryMap[child.slug] = sub.id;
      }
    }
  }
  console.log('✓ Categories seeded');

  // 4. Hierarchical Storage Locations
  // Root: Nhà
  const rootLocation = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { name: 'Nhà', code: 'NHA' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Nhà',
      code: 'NHA',
      description: 'Toàn bộ không gian nhà ở',
    },
  });

  // Level 1: Phòng làm việc, Kho sau nhà
  const phongLamViec = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { name: 'Phòng làm việc', code: 'PLV', parentId: rootLocation.id },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Phòng làm việc',
      code: 'PLV',
      description: 'Khu vực nghiên cứu, chế tạo & bàn máy tính',
      parentId: rootLocation.id,
    },
  });

  const khoSauNha = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: { name: 'Kho sau nhà', code: 'KSN', parentId: rootLocation.id },
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Kho sau nhà',
      code: 'KSN',
      description: 'Kho chứa máy móc, vật tư kim khí và thiết bị nặng',
      parentId: rootLocation.id,
    },
  });

  // Level 2: Inside Phòng làm việc -> Tủ linh kiện A, Bàn làm việc & Kệ đồ nghề
  const tuLinhKienA = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: { name: 'Tủ linh kiện A', code: 'TLA', parentId: phongLamViec.id },
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Tủ linh kiện A',
      code: 'TLA',
      description: 'Tủ mica chia ô nhiều tầng cho vi điều khiển & linh kiện nhỏ',
      parentId: phongLamViec.id,
    },
  });

  const banLamViec = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: { name: 'Bàn làm việc & Kệ đồ nghề', code: 'BLV', parentId: phongLamViec.id },
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      name: 'Bàn làm việc & Kệ đồ nghề',
      code: 'BLV',
      description: 'Khu vực thao tác hàn, đo đạc và đồ dùng thường xuyên',
      parentId: phongLamViec.id,
    },
  });

  // Level 3: Inside Tủ linh kiện A -> Ngăn 1, Ngăn 2, Ngăn 3
  const ngan1 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000006' },
    update: { name: 'Ngăn 1', code: 'N1', parentId: tuLinhKienA.id },
    create: {
      id: '00000000-0000-0000-0000-000000000006',
      name: 'Ngăn 1',
      code: 'N1',
      description: 'Tầng 1 tủ A - Chuyên board phát triển & sensor',
      parentId: tuLinhKienA.id,
    },
  });

  const ngan2 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000007' },
    update: { name: 'Ngăn 2', code: 'N2', parentId: tuLinhKienA.id },
    create: {
      id: '00000000-0000-0000-0000-000000000007',
      name: 'Ngăn 2',
      code: 'N2',
      description: 'Tầng 2 tủ A - Module Relay, Opto & Công suất',
      parentId: tuLinhKienA.id,
    },
  });

  const ngan3 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000008' },
    update: { name: 'Ngăn 3', code: 'N3', parentId: tuLinhKienA.id },
    create: {
      id: '00000000-0000-0000-0000-000000000008',
      name: 'Ngăn 3',
      code: 'N3',
      description: 'Tầng 3 tủ A - Hộp phân loại ESP32 & IoT',
      parentId: tuLinhKienA.id,
    },
  });

  // Level 4: Inside Ngăn -> Hộp
  const hopA1_01 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000009' },
    update: { name: 'Hộp A1-01', code: 'A1-01', parentId: ngan1.id },
    create: {
      id: '00000000-0000-0000-0000-000000000009',
      name: 'Hộp A1-01',
      code: 'A1-01',
      description: 'Hộp vi điều khiển Arduino & STM32',
      parentId: ngan1.id,
    },
  });

  const hopA1_02 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: { name: 'Hộp A1-02', code: 'A1-02', parentId: ngan1.id },
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Hộp A1-02',
      code: 'A1-02',
      description: 'Hộp đầu bấm & phụ kiện nhỏ',
      parentId: ngan1.id,
    },
  });

  const hopA2_04 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: { name: 'Hộp A2-04', code: 'A2-04', parentId: ngan2.id },
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Hộp A2-04',
      code: 'A2-04',
      description: 'Hộp chứa relay 5V & 12V các loại',
      parentId: ngan2.id,
    },
  });

  const hopA3_05 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: { name: 'Hộp A3-05', code: 'A3-05', parentId: ngan3.id },
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      name: 'Hộp A3-05',
      code: 'A3-05',
      description: 'Hộp chuyên đựng kit phát triển ESP32 / ESP8266',
      parentId: ngan3.id,
    },
  });

  // Level 2 inside Kho Sau Nhà -> Kệ B
  const keB = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000013' },
    update: { name: 'Kệ sắt B', code: 'KE-B', parentId: khoSauNha.id },
    create: {
      id: '00000000-0000-0000-0000-000000000013',
      name: 'Kệ sắt B',
      code: 'KE-B',
      description: 'Kệ sắt 3 tầng chịu lực',
      parentId: khoSauNha.id,
    },
  });

  const keB_Tang1 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000014' },
    update: { name: 'Tầng 1 (Máy móc)', code: 'B-T1', parentId: keB.id },
    create: {
      id: '00000000-0000-0000-0000-000000000014',
      name: 'Tầng 1 (Máy móc)',
      code: 'B-T1',
      description: 'Máy khoan, máy mài, hộp dụng cụ nặng',
      parentId: keB.id,
    },
  });

  const keB_Tang2 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000015' },
    update: { name: 'Tầng 2 (Thùng B2-03)', code: 'B2-03', parentId: keB.id },
    create: {
      id: '00000000-0000-0000-0000-000000000015',
      name: 'Tầng 2 (Thùng B2-03)',
      code: 'B2-03',
      description: 'Thùng phân loại ốc vít & kim khí',
      parentId: keB.id,
    },
  });

  const keB_Tang3 = await prisma.storageLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000016' },
    update: { name: 'Tầng 3 (Dây cuộn)', code: 'B-T3', parentId: keB.id },
    create: {
      id: '00000000-0000-0000-0000-000000000016',
      name: 'Tầng 3 (Dây cuộn)',
      code: 'B-T3',
      description: 'Cuộn dây điện nguồn, cáp mạng, ống gen',
      parentId: keB.id,
    },
  });
  console.log('✓ Storage locations seeded');

  // 5. Tags
  const tagNames = [
    'esp32', 'wifi', 'bluetooth', 'arduino', 'iot',
    'usb', 'type-c', 'cable', 'charging', '100w',
    'relay', '5v', 'automation', 'sensor',
    'cat6', 'rj45', 'networking',
    'inox', 'm3', 'hardware', 'screws',
    'soldering', 'tools', 'multimeter', 'measurement',
    'dewalt', 'drill', 'powertool', '18650', 'battery'
  ];

  const tagMap: Record<string, string> = {};
  for (const t of tagNames) {
    const slug = t.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tag = await prisma.tag.upsert({
      where: { name: t },
      update: { slug },
      create: { name: t, slug },
    });
    tagMap[t] = tag.id;
  }
  console.log('✓ Tags seeded');

  // 6. Sample Items
  const sampleItems = [
    {
      sku: 'ESP-32-DEVKIT-V1',
      name: 'ESP32 DevKit V1',
      slug: 'esp32-devkit-v1',
      description: 'Kit phát triển ESP32 WiFi/Bluetooth Dual-Core CP2102, cổng Micro-USB / USB-C',
      categoryId: categoryMap['vi-dieu-khien'] || categoryMap['linh-kien-dien-tu'],
      subcategory: 'Vi điều khiển',
      brand: 'Espressif',
      model: 'ESP-WROOM-32',
      quantity: 5,
      unit: 'cái',
      minimumQuantity: 2,
      condition: 'NEW',
      locationId: hopA3_05.id,
      container: 'Tủ linh kiện A',
      exactPosition: 'Ngăn 3 → Hộp A3-05',
      purchasePrice: 95000,
      purchaseDate: new Date('2026-05-10'),
      supplier: 'Shopee Linh Kiện SG',
      notes: 'ESP32 30 chân, đã test nạp firmware NodeMCU & Arduino IDE tốt',
      barcode: '8938500123011',
      qrCodeValue: 'ITEM:ESP-32-DEVKIT-V1',
      isFavorite: true,
      tags: ['esp32', 'wifi', 'bluetooth', 'arduino', 'iot'],
    },
    {
      sku: 'ARDUINO-NANO-V3',
      name: 'Arduino Nano V3 ATmega328P',
      slug: 'arduino-nano-v3',
      description: 'Board Arduino Nano V3 hàn sẵn chân, chip nạp CH340G',
      categoryId: categoryMap['vi-dieu-khien'] || categoryMap['linh-kien-dien-tu'],
      subcategory: 'Vi điều khiển',
      brand: 'Arduino Compatible',
      model: 'Nano V3.0',
      quantity: 10,
      unit: 'cái',
      minimumQuantity: 3,
      condition: 'NEW',
      locationId: hopA1_01.id,
      container: 'Tủ linh kiện A',
      exactPosition: 'Ngăn 1 → Hộp A1-01',
      purchasePrice: 45000,
      purchaseDate: new Date('2026-03-15'),
      supplier: 'Cửa hàng Minh Hà',
      notes: 'Dùng cho các dự án đo đạc nhỏ gọn không cần WiFi',
      barcode: '8938500123028',
      qrCodeValue: 'ITEM:ARDUINO-NANO-V3',
      isFavorite: false,
      tags: ['arduino', 'tools', 'iot'],
    },
    {
      sku: 'RELAY-5V-1CH-SONGLE',
      name: 'Module Relay 5V 1 Kênh Songle Opto Cách Ly',
      slug: 'module-relay-5v-1-kenh-songle',
      description: 'Module đóng cắt tải 220V 10A, kích mức Thấp/Cao có Jumper lựa chọn',
      categoryId: categoryMap['relay-dieu-khien'] || categoryMap['linh-kien-dien-tu'],
      subcategory: 'Relay',
      brand: 'Songle',
      model: 'SRD-05VDC-SL-C',
      quantity: 12,
      unit: 'cái',
      minimumQuantity: 5,
      condition: 'NEW',
      locationId: hopA2_04.id,
      container: 'Tủ linh kiện A',
      exactPosition: 'Ngăn 2 → Hộp A2-04',
      purchasePrice: 15000,
      purchaseDate: new Date('2026-06-20'),
      supplier: 'Nshop',
      notes: 'Relay đóng mở êm, kích hoạt 5V',
      barcode: '8938500123035',
      qrCodeValue: 'ITEM:RELAY-5V-1CH-SONGLE',
      isFavorite: true,
      tags: ['relay', '5v', 'automation', 'esp32'],
    },
    {
      sku: 'CABLE-TYPEC-100W-BASEUS',
      name: 'Dây Cáp USB Type-C 100W Baseus 1.2m',
      slug: 'day-cap-usb-type-c-100w-baseus-1-2m',
      description: 'Cáp bọc dù chống đứt, hỗ trợ sạc nhanh PD 100W và truyền dữ liệu 480Mbps',
      categoryId: categoryMap['cap-usb-type-c'] || categoryMap['day-va-adapter'],
      subcategory: 'Cáp Type-C',
      brand: 'Baseus',
      model: 'Cafule 100W',
      quantity: 4,
      unit: 'cái',
      minimumQuantity: 2,
      condition: 'NEW',
      locationId: banLamViec.id,
      container: 'Kệ phụ kiện cáp',
      exactPosition: 'Kệ bàn làm việc → Ngăn dây',
      purchasePrice: 85000,
      purchaseDate: new Date('2026-07-01'),
      supplier: 'Baseus Official',
      notes: 'Hỗ trợ sạc laptop MacBook & điện thoại',
      barcode: '6953156201984',
      qrCodeValue: 'ITEM:CABLE-TYPEC-100W-BASEUS',
      isFavorite: true,
      tags: ['usb', 'type-c', 'cable', 'charging', '100w'],
    },
    {
      sku: 'ADAPTER-12V-2A-DC',
      name: 'Adapter Nguồn 12V 2A DC 5.5x2.1mm',
      slug: 'adapter-nguon-12v-2a-dc-5-5x2-1mm',
      description: 'Nguồn xung DC 12V 2A chuẩn cắm chân 5.5x2.1mm, có đèn LED báo nguồn',
      categoryId: categoryMap['adapter-bo-nguon'] || categoryMap['dien-va-nguon'],
      subcategory: 'Adapter',
      brand: 'OEM',
      model: '12V-2A-EU',
      quantity: 3,
      unit: 'cái',
      minimumQuantity: 1,
      condition: 'GOOD',
      locationId: banLamViec.id,
      container: 'Kệ phụ kiện cáp',
      exactPosition: 'Hộc dưới bàn làm việc',
      purchasePrice: 40000,
      purchaseDate: new Date('2026-04-12'),
      supplier: 'Linh Kiện Điện Tử VN',
      notes: 'Dùng cấp nguồn camera, router hoặc đèn LED 12V',
      barcode: '8938500123059',
      qrCodeValue: 'ITEM:ADAPTER-12V-2A-DC',
      isFavorite: false,
      tags: ['tools', 'automation'],
    },
    {
      sku: 'CABLE-CAT6-COMMSCOPE-50M',
      name: 'Dây Cáp Mạng CAT6 UTP Commscope 50m',
      slug: 'day-cap-mang-cat6-utp-commscope-50m',
      description: 'Cuộn cáp mạng bấm sẵn hoặc chưa bấm lõi đồng 8 sợi nguyên chất',
      categoryId: categoryMap['cap-mang-dau-bam'] || categoryMap['day-va-adapter'],
      subcategory: 'Cáp mạng',
      brand: 'Commscope',
      model: 'CAT6 UTP 23AWG',
      quantity: 1,
      unit: 'cuộn',
      minimumQuantity: 1,
      condition: 'NEW',
      locationId: keB_Tang3.id,
      container: 'Kệ sắt B',
      exactPosition: 'Tầng 3 (Dây cuộn) → Móc treo',
      purchasePrice: 320000,
      purchaseDate: new Date('2026-02-18'),
      supplier: 'Thiết Bị Mạng Tuấn Phát',
      notes: 'Cuộn nguyên 50m dùng để kéo dây camera ngoài trời',
      barcode: '8938500123066',
      qrCodeValue: 'ITEM:CABLE-CAT6-COMMSCOPE-50M',
      isFavorite: false,
      tags: ['cat6', 'networking', 'cable'],
    },
    {
      sku: 'HEAD-RJ45-CAT6-100PCS',
      name: 'Hộp Đầu Bấm Mạng RJ45 Cat6 Chân Mạ Vàng (100 Hạt)',
      slug: 'hop-dau-bam-mang-rj45-cat6-100-hat',
      description: 'Hạt mạng RJ45 Cat6 chuyên dụng 3 chấu mạ vàng tiếp xúc tốt',
      categoryId: categoryMap['cap-mang-dau-bam'] || categoryMap['day-va-adapter'],
      subcategory: 'Đầu bấm',
      brand: 'AMP / Commscope',
      model: 'RJ45-CAT6-GOLD',
      quantity: 80,
      unit: 'cái',
      minimumQuantity: 20,
      condition: 'NEW',
      locationId: hopA1_02.id,
      container: 'Tủ linh kiện A',
      exactPosition: 'Ngăn 1 → Hộp A1-02',
      purchasePrice: 120000,
      purchaseDate: new Date('2026-05-25'),
      supplier: 'Thiết Bị Mạng Tuấn Phát',
      notes: 'Đã dùng 20 hạt, còn 80 hạt trong hộp mica',
      barcode: '8938500123073',
      qrCodeValue: 'ITEM:HEAD-RJ45-CAT6-100PCS',
      isFavorite: false,
      tags: ['cat6', 'rj45', 'networking'],
    },
    {
      sku: 'SCREW-M3-10-INOX304',
      name: 'Ốc Vít M3x10mm Đầu Tròn Thập Inox 304',
      slug: 'oc-vit-m3x10mm-inox-304',
      description: 'Ốc ren nhuyễn M3 bước 0.5mm dài 10mm thép không gỉ SUS304',
      categoryId: categoryMap['oc-vit-m2-m3'] || categoryMap['oc-vit-bulong'],
      subcategory: 'Ốc M3',
      brand: 'SUS304',
      model: 'M3x10 Pan Head',
      quantity: 150,
      unit: 'cái',
      minimumQuantity: 30,
      condition: 'NEW',
      locationId: keB_Tang2.id,
      container: 'Kệ sắt B',
      exactPosition: 'Tầng 2 (Thùng B2-03) → Khay ốc vít',
      purchasePrice: 45000,
      purchaseDate: new Date('2026-01-10'),
      supplier: 'Ốc Vít Kim Khí SG',
      notes: 'Ốc chuẩn vặn vỏ máy in 3D, chân đế mica',
      barcode: '8938500123080',
      qrCodeValue: 'ITEM:SCREW-M3-10-INOX304',
      isFavorite: false,
      tags: ['inox', 'm3', 'hardware', 'screws'],
    },
    {
      sku: 'TOOL-HAKKO-T12-OLED',
      name: 'Trạm Hàn Thiếc Hakko T12 Màn Hình OLED 72W',
      slug: 'tram-han-thiec-hakko-t12-oled-72w',
      description: 'Trạm hàn điện tử gia nhiệt cực nhanh trong 6 giây, tự động ngủ khi gác tay hàn',
      categoryId: categoryMap['han-kho-nhiet'] || categoryMap['dung-cu-dien-may-moc'],
      subcategory: 'Mỏ hàn',
      brand: 'Quicko / STC',
      model: 'T12-952 OLED',
      quantity: 1,
      unit: 'bộ',
      minimumQuantity: 1,
      condition: 'GOOD',
      locationId: banLamViec.id,
      container: 'Hộp đồ nghề kỹ thuật',
      exactPosition: 'Bàn làm việc chính',
      purchasePrice: 480000,
      purchaseDate: new Date('2026-04-05'),
      supplier: 'Điện Tử 365',
      notes: 'Kèm theo 2 mũi hàn T12-K và T12-ILS',
      barcode: '8938500123097',
      qrCodeValue: 'ITEM:TOOL-HAKKO-T12-OLED',
      isFavorite: true,
      tags: ['soldering', 'tools'],
    },
    {
      sku: 'METER-ANENG-AN8008',
      name: 'Đồng Hồ Vạn Năng Kỹ Thuật Số Aneng AN8008 True-RMS',
      slug: 'dong-ho-van-nang-aneng-an8008',
      description: 'Đồng hồ đo điện 9999 counts, đo điện áp, dòng mA/A, tụ điện, tần số, diode',
      categoryId: categoryMap['do-luong-kiem-tra'] || categoryMap['dung-cu-cam-tay'],
      subcategory: 'Đồng hồ đo',
      brand: 'Aneng',
      model: 'AN8008',
      quantity: 1,
      unit: 'cái',
      minimumQuantity: 1,
      condition: 'GOOD',
      locationId: banLamViec.id,
      container: 'Hộp đồ nghề kỹ thuật',
      exactPosition: 'Bàn làm việc → Hộp dụng cụ',
      purchasePrice: 380000,
      purchaseDate: new Date('2026-03-22'),
      supplier: 'Aneng Official Store',
      notes: 'Kèm que đo kim nhọn loại tốt',
      barcode: '8938500123103',
      qrCodeValue: 'ITEM:METER-ANENG-AN8008',
      isFavorite: true,
      tags: ['multimeter', 'measurement', 'tools'],
    },
    {
      sku: 'BATTERY-18650-SONY-VTC6',
      name: 'Pin Sạc 18650 Sony Murata VTC6 3000mAh 30A',
      slug: 'pin-sac-18650-sony-vtc6',
      description: 'Cell pin lithium dòng xả liên tục 30A dung lượng chuẩn 3000mAh',
      categoryId: categoryMap['pin-18650-21700'] || categoryMap['pin-va-sac'],
      subcategory: 'Pin 18650',
      brand: 'Sony Murata',
      model: 'US18650VTC6',
      quantity: 8,
      unit: 'viên',
      minimumQuantity: 4,
      condition: 'NEW',
      locationId: hopA1_01.id,
      container: 'Tủ linh kiện A',
      exactPosition: 'Ngăn 1 → Hộp A1-01',
      purchasePrice: 85000,
      purchaseDate: new Date('2026-08-14'),
      supplier: 'Pin Tuấn Vũ',
      notes: 'Đã sạc đầy 4.2V, cất trữ trong hộp chống sốc',
      barcode: '8938500123110',
      qrCodeValue: 'ITEM:BATTERY-18650-SONY-VTC6',
      isFavorite: true,
      tags: ['18650', 'battery', 'tools'],
    },
    {
      sku: 'TOOL-DEWALT-DCD796-BRUSHLESS',
      name: 'Máy Khoan Pin Bắt Vít Dewalt DCD796 Không Chổi Than',
      slug: 'may-khoan-pin-dewalt-dcd796',
      description: 'Máy khoan 3 chức năng (khoan, vít, búa) lực siết 70Nm động cơ Brushless',
      categoryId: categoryMap['may-khoan-bat-vit'] || categoryMap['dung-cu-dien-may-moc'],
      subcategory: 'Máy khoan pin',
      brand: 'Dewalt',
      model: 'DCD796N-KR',
      quantity: 1,
      unit: 'bộ',
      minimumQuantity: 1,
      condition: 'GOOD',
      locationId: keB_Tang1.id,
      container: 'Kệ sắt B',
      exactPosition: 'Tầng 1 (Máy móc) → Vali Dewalt',
      purchasePrice: 2250000,
      purchaseDate: new Date('2026-02-10'),
      supplier: 'Đại lý Dewalt VN',
      notes: 'Gồm 1 thân máy + 2 pin 20V Max 4.0Ah + 1 sạc nhanh DCB115',
      barcode: '885911478235',
      qrCodeValue: 'ITEM:TOOL-DEWALT-DCD796-BRUSHLESS',
      isFavorite: true,
      tags: ['dewalt', 'drill', 'powertool', 'tools'],
    },
    // Low stock item sample for testing
    {
      sku: 'FUSE-5A-GLASS-20MM',
      name: 'Cầu Chì Ống Thủy Tinh 5A 250V 5x20mm',
      slug: 'cau-chi-ong-thuy-tinh-5a-250v',
      description: 'Cầu chì bảo vệ quá dòng cho thiết bị điện tử gia dụng',
      categoryId: categoryMap['cong-tac-o-cam'] || categoryMap['dien-va-nguon'],
      subcategory: 'Cầu chì',
      brand: 'OEM',
      model: '5x20mm 5A',
      quantity: 1,
      unit: 'cái',
      minimumQuantity: 5, // Triggers "Sắp hết"
      condition: 'NEW',
      locationId: hopA1_02.id,
      container: 'Tủ linh kiện A',
      exactPosition: 'Ngăn 1 → Hộp A1-02',
      purchasePrice: 2000,
      purchaseDate: new Date('2026-01-15'),
      supplier: 'Linh Kiện SG',
      notes: 'Chỉ còn 1 cái dự phòng, cần mua thêm',
      barcode: '8938500123127',
      qrCodeValue: 'ITEM:FUSE-5A-GLASS-20MM',
      isFavorite: false,
      tags: ['tools'],
    },
    // Out of stock item sample for testing
    {
      sku: 'RESISTOR-10K-0805-REEL',
      name: 'Điện Trở Dán SMD 0805 10K Ohm 1% (Cuộn 5000 con)',
      slug: 'dien-tro-smd-0805-10k-ohm',
      description: 'Cuộn điện trở dán 10k 1/8W độ chính xác 1%',
      categoryId: categoryMap['linh-kien-thu-dong'] || categoryMap['linh-kien-dien-tu'],
      subcategory: 'Điện trở',
      brand: 'UniOhm',
      model: '0805-10K-1%',
      quantity: 0, // Triggers "Hết hàng"
      unit: 'cuộn',
      minimumQuantity: 1,
      condition: 'NEW',
      locationId: hopA1_02.id,
      container: 'Tủ linh kiện A',
      exactPosition: 'Ngăn 1 → Hộp A1-02',
      purchasePrice: 110000,
      purchaseDate: new Date('2025-11-20'),
      supplier: 'UniOhm VN',
      notes: 'Đã dùng hết cuộn cũ, cần nhập thêm',
      barcode: '8938500123134',
      qrCodeValue: 'ITEM:RESISTOR-10K-0805-REEL',
      isFavorite: false,
      tags: ['esp32', 'arduino'],
    },
  ];

  for (const itemData of sampleItems) {
    const { tags, ...data } = itemData;
    const item = await prisma.item.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });

    // Link tags
    if (tags && tags.length > 0) {
      await prisma.itemTag.deleteMany({ where: { itemId: item.id } });
      for (const tName of tags) {
        const tagId = tagMap[tName];
        if (tagId) {
          await prisma.itemTag.create({
            data: { itemId: item.id, tagId },
          });
        }
      }
    }

    // Add initial IN transaction
    const existingTx = await prisma.inventoryTransaction.findFirst({
      where: { itemId: item.id },
    });
    if (!existingTx && item.quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: 'IN',
          quantity: item.quantity,
          previousQuantity: 0,
          newQuantity: item.quantity,
          destinationLocationId: item.locationId,
          note: 'Khởi tạo số lượng kho ban đầu',
          createdBy: 'admin',
        },
      });
    }
  }
  console.log('✓ Sample inventory items & initial transactions seeded');

  console.log('\n🎉 Seed completed successfully!');
  console.log('Login credentials:');
  console.log('Username: admin');
  console.log('Password: admin123456');
}

main()
  .catch((e) => {
    console.error('Error in seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
