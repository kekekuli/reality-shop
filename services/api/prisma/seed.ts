import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = await seedCategories();
  await seedAttrTemplates(categories);
  await seedProducts(categories);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });

async function seedCategories() {
  const root = await prisma.category.upsert({
    where: {
      slug: "electronics",
    },
    update: {},
    create: {
      slug: "electronics",
      name: "Electronics",
    },
  });

  const phones = await prisma.category.upsert({
    where: {
      slug: "phones",
    },
    update: {},
    create: {
      slug: "phones",
      name: "Phones",
      parent: {
        connect: {
          id: root.id,
        },
      },
    },
  });

  const laptops = await prisma.category.upsert({
    where: {
      slug: "laptops",
    },
    update: {},
    create: {
      slug: "laptops",
      name: "Laptops",
      parent: {
        connect: {
          id: root.id,
        },
      },
    },
  });

  return {
    root,
    phones,
    laptops,
  };
}

type Categories = Awaited<ReturnType<typeof seedCategories>>;

async function seedAttrTemplates({ phones, laptops }: Categories) {
  const phonesAttrTemplate = await prisma.attributeTemplate.upsert({
    where: {
      categoryId: phones.id,
    },
    update: {},
    create: {
      category: {
        connect: {
          id: phones.id,
        },
      },
      specAttrs: [
        {
          key: "color",
          label: "Color",
          values: ["silver", "blue", "white"],
        },
        {
          key: "storage",
          label: "Storage",
          values: ["64gb", "128gb", "256gb"],
        },
      ],
      filterAttrs: [
        {
          key: "brand",
          label: "Brand",
          type: "string",
        },
        {
          key: "chip",
          label: "Chip",
          type: "string",
        },
      ],
    },
  });

  const laptopsAttrTemplate = await prisma.attributeTemplate.upsert({
    where: {
      categoryId: laptops.id,
    },
    update: {},
    create: {
      category: {
        connect: {
          id: laptops.id,
        },
      },
      specAttrs: [
        {
          key: "color",
          label: "Color",
          values: ["silver", "blue", "white"],
        },
        {
          key: "ram",
          label: "RAM",
          values: ["16gb", "32gb", "64gb"],
        },
      ],
      filterAttrs: [
        {
          key: "brand",
          label: "Brand",
          type: "string",
        },
        {
          key: "chip",
          label: "Chip",
          type: "string",
        },
      ],
    },
  });

  return {
    phonesAttrTemplate,
    laptopsAttrTemplate,
  };
}

async function seedProducts({ phones, laptops }: Categories) {
  await prisma.product.upsert({
    where: {
      slug: "apple-iphone-14",
    },
    update: {},
    create: {
      slug: "apple-iphone-14",
      title: "Apple iPhone 14",
      brand: "apple",
      status: "on_sale",
      attrs: {
        brand: "apple",
        chip: "a15-bionic",
      },
      category: {
        connect: {
          id: phones.id,
        },
      },
      skus: {
        create: [
          {
            skuCode: "apple-iphone-14-silver-128gb",
            specValues: {
              color: "silver",
              storage: "128gb",
            },
            priceCents: 4999_00n,
            inventory: {
              create: {
                available: 120,
              },
            },
          },
          {
            skuCode: "apple-iphone-14-silver-256gb",
            specValues: {
              color: "silver",
              storage: "256gb",
            },
            priceCents: 5899_00n,
            inventory: {
              create: {
                available: 80,
              },
            },
          },
          {
            skuCode: "apple-iphone-14-blue-128gb",
            specValues: {
              color: "blue",
              storage: "128gb",
            },
            priceCents: 4999_00n,
            inventory: {
              create: {
                available: 45,
              },
            },
          },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "apple-iphone-17-pro",
    },
    update: {},
    create: {
      slug: "apple-iphone-17-pro",
      title: "Apple iPhone 17 Pro",
      brand: "apple",
      status: "on_sale",
      attrs: {
        brand: "apple",
        chip: "a17-pro",
      },
      category: {
        connect: {
          id: phones.id,
        },
      },
      skus: {
        create: [
          {
            skuCode: "apple-iphone-17-pro-silver-128gb",
            specValues: {
              color: "silver",
              storage: "128gb",
            },
            priceCents: 8999_00n,
            inventory: {
              create: {
                available: 120,
              },
            },
          },
          {
            skuCode: "apple-iphone-17-pro-silver-256gb",
            specValues: {
              color: "silver",
              storage: "256gb",
            },
            priceCents: 9999_00n,
            inventory: {
              create: {
                available: 100,
              },
            },
          },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "samsung-galaxy-s24",
    },
    update: {},
    create: {
      slug: "samsung-galaxy-s24",
      title: "Samsung Galaxy S24",
      brand: "samsung",
      status: "on_sale",
      attrs: {
        brand: "samsung",
        chip: "snapdragon-8-gen-3",
      },
      category: {
        connect: {
          id: phones.id,
        },
      },
      skus: {
        create: [
          {
            skuCode: "samsung-galaxy-s24-white-128gb",
            specValues: {
              color: "white",
              storage: "128gb",
            },
            priceCents: 4299_00n,
            inventory: {
              create: {
                available: 90,
              },
            },
          },
          {
            skuCode: "samsung-galaxy-s24-white-256gb",
            specValues: {
              color: "white",
              storage: "256gb",
            },
            priceCents: 4899_00n,
            inventory: {
              create: {
                available: 60,
              },
            },
          },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "apple-macbook-air-m3",
    },
    update: {},
    create: {
      slug: "apple-macbook-air-m3",
      title: "Apple MacBook Air M3",
      brand: "apple",
      status: "on_sale",
      attrs: {
        brand: "apple",
        chip: "m3",
      },
      category: {
        connect: {
          id: laptops.id,
        },
      },
      skus: {
        create: [
          {
            skuCode: "apple-macbook-air-m3-silver-16gb",
            specValues: {
              color: "silver",
              ram: "16gb",
            },
            priceCents: 8999_00n,
            inventory: {
              create: {
                available: 70,
              },
            },
          },
          {
            skuCode: "apple-macbook-air-m3-silver-32gb",
            specValues: {
              color: "silver",
              ram: "32gb",
            },
            priceCents: 11999_00n,
            inventory: {
              create: {
                available: 35,
              },
            },
          },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "dell-xps-15",
    },
    update: {},
    create: {
      slug: "dell-xps-15",
      title: "Dell XPS 15",
      brand: "dell",
      status: "on_sale",
      attrs: {
        brand: "dell",
        chip: "intel-core-ultra-7",
      },
      category: {
        connect: {
          id: laptops.id,
        },
      },
      skus: {
        create: [
          {
            skuCode: "dell-xps-15-white-16gb",
            specValues: {
              color: "white",
              ram: "16gb",
            },
            priceCents: 12999_00n,
            inventory: {
              create: {
                available: 25,
              },
            },
          },
          {
            skuCode: "dell-xps-15-blue-64gb",
            specValues: {
              color: "blue",
              ram: "64gb",
            },
            priceCents: 18999_00n,
            inventory: {
              create: {
                available: 12,
              },
            },
          },
        ],
      },
    },
  });
}
