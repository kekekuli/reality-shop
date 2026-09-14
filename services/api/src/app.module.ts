import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { GraphQLModule } from "@nestjs/graphql";
import { env } from "./env";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "node:path";
import { CatalogBffModule } from "./bff/catalog/catalog-bff.module";
import { UserBffModule } from "./bff/user/user-bff.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { SkuService } from "./modules/catalog/sku.service";
import { ProductService } from "./modules/catalog/product.service";
import {
  createSkuByIdLoader,
  createSkusByProductIdLoader,
} from "./bff/catalog/sku.loader";
import { createProductByIdLoader } from "./bff/catalog/product.loader";
import type { Response, Request } from "express";
import { CartBffModule } from "./bff/cart/cart-bff.module";

@Module({
  controllers: [AppController],
  imports: [
    PrismaModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [CatalogModule],
      inject: [SkuService, ProductService],
      useFactory: (skuService: SkuService, productService: ProductService) => ({
        autoSchemaFile: join(process.cwd(), "src/schema.gql"),
        sortSchema: true,
        introspection: env.NODE_ENV !== "production",
        includeStacktraceInErrorResponses: env.NODE_ENV !== "production",
        context: ({ req, res }: { req: Request; res: Response }) => ({
          req,
          res,
          skusByProductIdLoader: createSkusByProductIdLoader(skuService),
          skuByIdLoader: createSkuByIdLoader(skuService),
          productByIdLoader: createProductByIdLoader(productService),
        }),
      }),
    }),
    CatalogBffModule,
    UserBffModule,
    CartBffModule,
  ],
})
export class AppModule {}
