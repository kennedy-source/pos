import { PrismaClient, UserRole, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding UniForm POS database...\n');

  // ─── USERS ───────────────────────────────────────────────
  console.log('Creating users...');
  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const managerHash = await bcrypt.hash('Manager@1234', 12);
  const cashierHash = await bcrypt.hash('Cashier@1234', 12);
  const storekeeperHash = await bcrypt.hash('Storekeeper@1234', 12);
  const operatorHash = await bcrypt.hash('Operator@1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@uniformpos.co.ke' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@uniformpos.co.ke',
      phone: '0700000001',
      passwordHash: adminHash,
      pin: await bcrypt.hash('1234', 10),
      role: UserRole.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@uniformpos.co.ke' },
    update: {},
    create: {
      name: 'Grace Wanjiku',
      email: 'manager@uniformpos.co.ke',
      phone: '0700000002',
      passwordHash: managerHash,
      pin: await bcrypt.hash('2345', 10),
      role: UserRole.MANAGER,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@uniformpos.co.ke' },
    update: {},
    create: {
      name: 'John Kamau',
      email: 'cashier@uniformpos.co.ke',
      phone: '0700000003',
      passwordHash: cashierHash,
      pin: await bcrypt.hash('3456', 10),
      role: UserRole.CASHIER,
    },
  });

  const storekeeper = await prisma.user.upsert({
    where: { email: 'store@uniformpos.co.ke' },
    update: {},
    create: {
      name: 'Mary Achieng',
      email: 'store@uniformpos.co.ke',
      phone: '0700000004',
      passwordHash: storekeeperHash,
      pin: await bcrypt.hash('4567', 10),
      role: UserRole.STOREKEEPER,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'embroidery@uniformpos.co.ke' },
    update: {},
    create: {
      name: 'Peter Odhiambo',
      email: 'embroidery@uniformpos.co.ke',
      phone: '0700000005',
      passwordHash: operatorHash,
      pin: await bcrypt.hash('5678', 10),
      role: UserRole.EMBROIDERY_OPERATOR,
    },
  });

  console.log('✅ Users created\n');

  // ─── SCHOOLS ─────────────────────────────────────────────
  console.log('Creating schools...');
  const schools = await Promise.all([
    prisma.school.upsert({
      where: { code: 'NRB_ACAD' },
      update: {},
      create: {
        name: 'Nairobi Academy',
        code: 'NRB_ACAD',
        address: 'Hurlingham, Nairobi',
        contactName: 'Mrs. Njoki Kariuki',
        contactPhone: '0722111001',
      },
    }),
    prisma.school.upsert({
      where: { code: 'LIG_GIRLS' },
      update: {},
      create: {
        name: "Limuru Girls' High School",
        code: 'LIG_GIRLS',
        address: 'Limuru, Kiambu County',
        contactName: 'Mr. Samuel Mwangi',
        contactPhone: '0733222002',
      },
    }),
    prisma.school.upsert({
      where: { code: 'STR_ACAD' },
      update: {},
      create: {
        name: 'Strathmore School',
        code: 'STR_ACAD',
        address: 'Madaraka, Nairobi',
        contactName: 'Ms. Fatuma Hassan',
        contactPhone: '0711333003',
      },
    }),
    prisma.school.upsert({
      where: { code: 'LIG_BOYS' },
      update: {},
      create: {
        name: 'Limuru Boys High School',
        code: 'LIG_BOYS',
        address: 'Limuru, Kiambu County',
        contactName: 'Mr. George Otieno',
        contactPhone: '0722444004',
      },
    }),
    prisma.school.upsert({
      where: { code: 'KAB_PRI' },
      update: {},
      create: {
        name: 'Kabete Primary School',
        code: 'KAB_PRI',
        address: 'Kabete, Nairobi',
        contactName: 'Mrs. Alice Wambui',
        contactPhone: '0733555005',
      },
    }),
  ]);

  console.log('✅ Schools created\n');

  // ─── CATEGORIES ──────────────────────────────────────────
  console.log('Creating categories...');
  const categories: Record<string, any> = {};
  const categoryNames = [
    'Shirts', 'Trousers', 'Shorts', 'Skirts', 'Dresses',
    'Sweaters', 'Hoodies', 'Blazers', 'T-shirts', 'Tracksuits',
    'Socks', 'Ties', 'Belts', 'Caps', 'Bags',
    'Fleece Jackets', 'Windbreakers', 'Shoes', 'Embroidery Services',
  ];

  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = cat;
  }

  console.log('✅ Categories created\n');

  // ─── SUPPLIERS ───────────────────────────────────────────
  const supplier = await prisma.supplier.create({
    data: {
      name: 'Kenya Textile Mills Ltd',
      contactName: 'David Njoroge',
      phone: '0722999888',
      email: 'orders@ktm.co.ke',
      address: 'Industrial Area, Nairobi',
    },
  });

  // ─── SETTINGS ────────────────────────────────────────────
  const defaultSettings = [
    { key: 'shop_name', value: 'UniForm Shop Kenya', description: 'Business name on receipts' },
    { key: 'shop_address', value: 'Westlands, Nairobi, Kenya', description: 'Shop address' },
    { key: 'shop_phone', value: '0722 000 000', description: 'Contact phone' },
    { key: 'shop_email', value: 'info@uniformshop.co.ke', description: 'Contact email' },
    { key: 'currency', value: 'KES', description: 'Currency code' },
    { key: 'currency_symbol', value: 'KES', description: 'Currency display symbol' },
    { key: 'receipt_footer', value: 'Thank you for shopping with us! Goods once sold are not returnable without receipt.', description: 'Receipt footer text' },
    { key: 'mpesa_paybill', value: '247247', description: 'M-Pesa Paybill number' },
    { key: 'mpesa_account', value: 'UNIFORM', description: 'M-Pesa account reference' },
    { key: 'tax_rate', value: '0', description: 'VAT rate (%)' },
    { key: 'low_stock_threshold', value: '5', description: 'Global low stock reorder level' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  // ─── PRODUCTS ────────────────────────────────────────────
  console.log('Creating products...');

  // Helper to create a product with variants
  async function createProduct(data: {
    name: string;
    sku: string;
    categoryName: string;
    schoolCode?: string;
    gender: Gender;
    costPrice: number;
    sellingPrice: number;
    reorderLevel?: number;
    variants: { size: string; color: string; stock: number }[];
  }) {
    const school = data.schoolCode ? schools.find((s) => s.code === data.schoolCode) : null;
    const cat = categories[data.categoryName];

    const variantSkus = new Set<string>();
    const validVariants = data.variants.filter((v) => {
      const vSku = `${data.sku}-${v.size}-${v.color.replace(/\s+/g, '')}`.toUpperCase();
      if (variantSkus.has(vSku)) return false;
      variantSkus.add(vSku);
      return true;
    });

    return prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        categoryId: cat.id,
        schoolId: school?.id,
        supplierId: supplier.id,
        gender: data.gender,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        reorderLevel: data.reorderLevel ?? 5,
        createdById: admin.id,
        variants: {
          create: validVariants.map((v) => ({
            size: v.size,
            color: v.color,
            sku: `${data.sku}-${v.size}-${v.color.replace(/\s+/g, '')}`.toUpperCase(),
            currentStock: v.stock,
            reorderLevel: data.reorderLevel ?? 5,
          })),
        },
      },
    });
  }

  // Nairobi Academy Products
  await createProduct({
    name: 'Nairobi Academy Boys Shirt',
    sku: 'NRB-SHIRT-B',
    categoryName: 'Shirts',
    schoolCode: 'NRB_ACAD',
    gender: 'MALE',
    costPrice: 450,
    sellingPrice: 750,
    variants: [
      { size: '2XS', color: 'White', stock: 20 },
      { size: 'XS', color: 'White', stock: 30 },
      { size: 'S', color: 'White', stock: 40 },
      { size: 'M', color: 'White', stock: 35 },
      { size: 'L', color: 'White', stock: 25 },
      { size: 'XL', color: 'White', stock: 15 },
    ],
  });

  await createProduct({
    name: 'Nairobi Academy Boys Trousers',
    sku: 'NRB-TROU-B',
    categoryName: 'Trousers',
    schoolCode: 'NRB_ACAD',
    gender: 'MALE',
    costPrice: 600,
    sellingPrice: 1000,
    variants: [
      { size: '24', color: 'Navy', stock: 15 },
      { size: 'W26', color: 'Navy', stock: 20 },
      { size: 'W28', color: 'Navy', stock: 25 },
      { size: 'W30', color: 'Navy', stock: 20 },
      { size: 'W32', color: 'Navy', stock: 15 },
      { size: 'W34', color: 'Navy', stock: 10 },
    ],
  });

  await createProduct({
    name: 'Nairobi Academy Sweater',
    sku: 'NRB-SWEAT',
    categoryName: 'Sweaters',
    schoolCode: 'NRB_ACAD',
    gender: 'UNISEX',
    costPrice: 800,
    sellingPrice: 1400,
    variants: [
      { size: 'XS', color: 'Navy', stock: 10 },
      { size: 'S', color: 'Navy', stock: 20 },
      { size: 'M', color: 'Navy', stock: 20 },
      { size: 'L', color: 'Navy', stock: 15 },
      { size: 'XL', color: 'Navy', stock: 8 },
    ],
  });

  await createProduct({
    name: 'Nairobi Academy Blazer',
    sku: 'NRB-BLAZER',
    categoryName: 'Blazers',
    schoolCode: 'NRB_ACAD',
    gender: 'UNISEX',
    costPrice: 2200,
    sellingPrice: 3800,
    reorderLevel: 3,
    variants: [
      { size: 'S', color: 'Navy', stock: 5 },
      { size: 'M', color: 'Navy', stock: 8 },
      { size: 'L', color: 'Navy', stock: 6 },
      { size: 'XL', color: 'Navy', stock: 4 },
    ],
  });

  // Limuru Girls Products
  await createProduct({
    name: "Limuru Girls Blouse",
    sku: 'LIG-BLOUSE',
    categoryName: 'Shirts',
    schoolCode: 'LIG_GIRLS',
    gender: 'FEMALE',
    costPrice: 400,
    sellingPrice: 700,
    variants: [
      { size: 'XS', color: 'White', stock: 25 },
      { size: 'S', color: 'White', stock: 35 },
      { size: 'M', color: 'White', stock: 30 },
      { size: 'L', color: 'White', stock: 20 },
    ],
  });

  await createProduct({
    name: "Limuru Girls Skirt",
    sku: 'LIG-SKIRT',
    categoryName: 'Skirts',
    schoolCode: 'LIG_GIRLS',
    gender: 'FEMALE',
    costPrice: 550,
    sellingPrice: 950,
    variants: [
      { size: 'XS', color: 'Grey', stock: 15 },
      { size: 'S', color: 'Grey', stock: 20 },
      { size: 'M', color: 'Grey', stock: 18 },
      { size: 'L', color: 'Grey', stock: 12 },
    ],
  });

  await createProduct({
    name: "Limuru Girls Sweater",
    sku: 'LIG-SWEAT',
    categoryName: 'Sweaters',
    schoolCode: 'LIG_GIRLS',
    gender: 'FEMALE',
    costPrice: 750,
    sellingPrice: 1300,
    variants: [
      { size: 'S', color: 'Maroon', stock: 10 },
      { size: 'M', color: 'Maroon', stock: 15 },
      { size: 'L', color: 'Maroon', stock: 10 },
    ],
  });

  // Strathmore Products
  await createProduct({
    name: 'Strathmore Boys Shirt',
    sku: 'STR-SHIRT-B',
    categoryName: 'Shirts',
    schoolCode: 'STR_ACAD',
    gender: 'MALE',
    costPrice: 480,
    sellingPrice: 800,
    variants: [
      { size: 'S', color: 'Blue', stock: 30 },
      { size: 'M', color: 'Blue', stock: 35 },
      { size: 'L', color: 'Blue', stock: 25 },
      { size: 'XL', color: 'Blue', stock: 15 },
    ],
  });

  await createProduct({
    name: 'Strathmore Shorts',
    sku: 'STR-SHORTS-B',
    categoryName: 'Shorts',
    schoolCode: 'STR_ACAD',
    gender: 'MALE',
    costPrice: 500,
    sellingPrice: 850,
    variants: [
      { size: 'W24', color: 'Khaki', stock: 20 },
      { size: 'W26', color: 'Khaki', stock: 25 },
      { size: 'W28', color: 'Khaki', stock: 20 },
      { size: 'W30', color: 'Khaki', stock: 15 },
    ],
  });

  // Generic / Multi-school items
  await createProduct({
    name: 'School Socks (Pair)',
    sku: 'GEN-SOCKS',
    categoryName: 'Socks',
    gender: 'UNISEX',
    costPrice: 80,
    sellingPrice: 150,
    reorderLevel: 20,
    variants: [
      { size: 'S (UK 1-3)', color: 'White', stock: 60 },
      { size: 'M (UK 4-6)', color: 'White', stock: 80 },
      { size: 'L (UK 7-9)', color: 'White', stock: 60 },
      { size: 'S (UK 1-3)', color: 'Grey', stock: 40 },
      { size: 'M (UK 4-6)', color: 'Grey', stock: 50 },
      { size: 'L (UK 7-9)', color: 'Grey', stock: 40 },
    ],
  });

  await createProduct({
    name: 'School Belt',
    sku: 'GEN-BELT',
    categoryName: 'Belts',
    gender: 'UNISEX',
    costPrice: 150,
    sellingPrice: 280,
    variants: [
      { size: 'S', color: 'Black', stock: 30 },
      { size: 'M', color: 'Black', stock: 40 },
      { size: 'L', color: 'Black', stock: 30 },
    ],
  });

  await createProduct({
    name: 'School Bag (Large)',
    sku: 'GEN-BAG-L',
    categoryName: 'Bags',
    gender: 'UNISEX',
    costPrice: 1200,
    sellingPrice: 2200,
    reorderLevel: 3,
    variants: [
      { size: 'One Size', color: 'Black', stock: 12 },
      { size: 'One Size', color: 'Navy', stock: 10 },
    ],
  });

  await createProduct({
    name: 'School Bag (Medium)',
    sku: 'GEN-BAG-M',
    categoryName: 'Bags',
    gender: 'UNISEX',
    costPrice: 900,
    sellingPrice: 1700,
    reorderLevel: 3,
    variants: [
      { size: 'One Size', color: 'Black', stock: 15 },
      { size: 'One Size', color: 'Navy', stock: 12 },
    ],
  });

  await createProduct({
    name: 'PE T-Shirt',
    sku: 'GEN-PE-TSHIRT',
    categoryName: 'T-shirts',
    gender: 'UNISEX',
    costPrice: 300,
    sellingPrice: 550,
    variants: [
      { size: 'S', color: 'Red', stock: 25 },
      { size: 'M', color: 'Red', stock: 30 },
      { size: 'L', color: 'Red', stock: 25 },
      { size: 'XL', color: 'Red', stock: 15 },
    ],
  });

  await createProduct({
    name: 'PE Shorts',
    sku: 'GEN-PE-SHORTS',
    categoryName: 'Shorts',
    gender: 'UNISEX',
    costPrice: 280,
    sellingPrice: 500,
    variants: [
      { size: 'S', color: 'Black', stock: 25 },
      { size: 'M', color: 'Black', stock: 30 },
      { size: 'L', color: 'Black', stock: 25 },
    ],
  });

  await createProduct({
    name: 'School Tie',
    sku: 'GEN-TIE',
    categoryName: 'Ties',
    gender: 'UNISEX',
    costPrice: 200,
    sellingPrice: 380,
    variants: [
      { size: 'One Size', color: 'Navy/Gold Stripe', stock: 25 },
      { size: 'One Size', color: 'Maroon/Gold Stripe', stock: 20 },
    ],
  });

  await createProduct({
    name: 'Fleece Jacket',
    sku: 'GEN-FLEECE',
    categoryName: 'Fleece Jackets',
    gender: 'UNISEX',
    costPrice: 900,
    sellingPrice: 1600,
    variants: [
      { size: 'S', color: 'Navy', stock: 15 },
      { size: 'M', color: 'Navy', stock: 20 },
      { size: 'L', color: 'Navy', stock: 15 },
      { size: 'XL', color: 'Navy', stock: 10 },
    ],
  });

  // Embroidery service product (standalone)
  await prisma.product.create({
    data: {
      name: 'Logo Embroidery Service',
      sku: 'SVC-EMBROIDERY',
      categoryId: categories['Embroidery Services'].id,
      gender: 'UNISEX',
      costPrice: 0,
      sellingPrice: 0, // price is per job, variable
      reorderLevel: 0,
      createdById: admin.id,
      description: 'School logo embroidery service on garments',
    },
  });

  console.log('✅ Products created\n');

  // ─── CUSTOMERS ───────────────────────────────────────────
  console.log('Creating sample customers...');
  await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Alice Waweru',
        phone: '0712345678',
        email: 'alice.waweru@gmail.com',
        schoolId: schools[0].id, // Nairobi Academy
        visitCount: 3,
        totalPurchases: 8500,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Brian Otieno',
        phone: '0723456789',
        schoolId: schools[1].id, // Limuru Girls (parent)
        visitCount: 5,
        totalPurchases: 15200,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Catherine Muthoni',
        phone: '0734567890',
        email: 'cmuthoni@yahoo.com',
        schoolId: schools[2].id,
        visitCount: 2,
        totalPurchases: 4800,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'David Kimani',
        phone: '0745678901',
        visitCount: 8,
        totalPurchases: 32000,
        creditLimit: 5000,
      },
    }),
  ]);

  console.log('✅ Customers created\n');

  // ─── SAMPLE EMBROIDERY JOBS ───────────────────────────────
  console.log('Creating sample embroidery jobs...');

  await prisma.embroideryJob.create({
    data: {
      jobNumber: 'EMB-2024-0001',
      customerName: 'Nairobi Academy',
      customerPhone: '0722111001',
      schoolId: schools[0].id,
      designName: 'Nairobi Academy Crest',
      threadColors: 'Navy Blue, Gold, White',
      totalItems: 50,
      pricePerItem: 150,
      totalCost: 7500,
      depositPaid: 3000,
      balanceDue: 4500,
      priority: 'NORMAL',
      status: 'IN_PROGRESS',
      operatorId: operator.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: 'School blazers — chest pocket position',
      items: {
        create: [
          {
            garmentType: 'Blazer',
            quantity: 50,
            logoPosition: 'Left Chest',
            color: 'Navy',
          },
        ],
      },
      statusHistory: {
        create: [
          { toStatus: 'PENDING', changedById: admin.id, notes: 'Job created' },
          { fromStatus: 'PENDING', toStatus: 'IN_PROGRESS', changedById: operator.id, notes: 'Machine assigned' },
        ],
      },
    },
  });

  await prisma.embroideryJob.create({
    data: {
      jobNumber: 'EMB-2024-0002',
      customerName: 'Brian Otieno',
      customerPhone: '0723456789',
      schoolId: schools[1].id,
      designName: 'Limuru Girls Logo',
      threadColors: 'Maroon, Gold',
      totalItems: 5,
      pricePerItem: 200,
      totalCost: 1000,
      depositPaid: 500,
      balanceDue: 500,
      priority: 'URGENT',
      status: 'PENDING',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      notes: 'Urgent — needed for school opening',
      items: {
        create: [
          { garmentType: 'Sweater', quantity: 3, logoPosition: 'Left Chest', color: 'Maroon' },
          { garmentType: 'Shirt', quantity: 2, logoPosition: 'Left Chest', color: 'White' },
        ],
      },
      statusHistory: {
        create: [{ toStatus: 'PENDING', changedById: cashier.id, notes: 'Job created at POS' }],
      },
    },
  });

  await prisma.embroideryJob.create({
    data: {
      jobNumber: 'EMB-2024-0003',
      customerName: 'Strathmore School',
      customerPhone: '0711333003',
      schoolId: schools[2].id,
      designName: 'Strathmore Eagles',
      threadColors: 'Blue, White, Gold',
      totalItems: 100,
      pricePerItem: 120,
      totalCost: 12000,
      depositPaid: 12000,
      balanceDue: 0,
      priority: 'NORMAL',
      status: 'COMPLETED',
      operatorId: operator.id,
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      notes: 'PE T-shirts for sports day',
      items: {
        create: [{ garmentType: 'T-Shirt', quantity: 100, logoPosition: 'Back', color: 'Red' }],
      },
      statusHistory: {
        create: [
          { toStatus: 'PENDING', changedById: admin.id },
          { fromStatus: 'PENDING', toStatus: 'IN_PROGRESS', changedById: operator.id },
          { fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED', changedById: operator.id, notes: 'All 100 items done, QC passed' },
        ],
      },
    },
  });

  console.log('✅ Embroidery jobs created\n');

  console.log('─'.repeat(50));
  console.log('✅ DATABASE SEEDED SUCCESSFULLY!\n');
  console.log('📋 LOGIN CREDENTIALS:');
  console.log('  Admin:      admin@uniformpos.co.ke     / Admin@1234     (PIN: 1234)');
  console.log('  Manager:    manager@uniformpos.co.ke   / Manager@1234   (PIN: 2345)');
  console.log('  Cashier:    cashier@uniformpos.co.ke   / Cashier@1234   (PIN: 3456)');
  console.log('  Storekeeper: store@uniformpos.co.ke    / Storekeeper@1234 (PIN: 4567)');
  console.log('  Operator:   embroidery@uniformpos.co.ke / Operator@1234  (PIN: 5678)');
  console.log('─'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
