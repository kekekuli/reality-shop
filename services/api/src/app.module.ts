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
import { createSkusLoader } from "./bff/catalog/sku.loader";

@Module({
  controllers: [AppController],
  imports: [
    PrismaModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [CatalogModule],
      inject: [SkuService],
      useFactory: (skuService: SkuService) => ({
        autoSchemaFile: join(process.cwd(), "src/schema.gql"),
        sortSchema: true,
        introspection: env.NODE_ENV !== "production",
        includeStacktraceInErrorResponses: env.NODE_ENV !== "production",
        context: () => ({
          skusLoader: createSkusLoader(skuService),
        }),
      }),
    }),
    CatalogBffModule,
    UserBffModule,
  ],
})
export class AppModule {}
