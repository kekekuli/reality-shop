import {
  Args,
  Context,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
} from "@nestjs/graphql";
import { OrderService } from "../../modules/order/order.service";
import { UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, GqlAuthGuard } from "../auth/gql-auth.guard";
import { CreateOrderPayload, OrderConnection, OrderType } from "./order.type";
import { decodeCursor, encodeCursor } from "../../common/graphql/cursor";
import { toCreateOrderError, toOrder } from "./order.mapper";
import { CreateOrderInput } from "./order.input";
import { ErrorCode } from "../../common/errors/error-code";
import { CheckoutService } from "./checkout.service";

function parsePositiveId(value: string): bigint | null {
  try {
    const id = BigInt(value);
    return id > 0n ? id : null;
  } catch {
    return null;
  }
}

@Resolver()
export class OrderResolver {
  constructor(
    private readonly orderService: OrderService,
    private readonly checkoutService: CheckoutService,
  ) {}

  @Query(() => OrderConnection)
  @UseGuards(GqlAuthGuard)
  async orders(
    @Context("req") request: AuthenticatedRequest,
    @Args("first", {
      type: () => Int,
      defaultValue: 20,
    })
    first: number,
    @Args("after", {
      type: () => String,
      nullable: true,
    })
    after?: string,
  ): Promise<OrderConnection> {
    const userId = request.auth!.userId;

    const take = Math.min(first, 100);
    const cursor = after ? decodeCursor(after) : undefined;

    const rows = await this.orderService.findPageByUserId({
      userId,
      first: take,
      cursor,
    });

    const hasNextPage = rows.length > take;
    const pageRows = hasNextPage ? rows.slice(0, take) : rows;

    const edges = pageRows.map((row) => ({
      node: toOrder(row),
      cursor: encodeCursor(row.createdAt, row.id),
    }));
    const endCursor =
      edges.length > 0 ? edges[edges.length - 1].cursor : undefined;

    return {
      edges,
      pageInfo: {
        endCursor,
        hasNextPage,
      },
    };
  }

  @Query(() => OrderType, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async order(
    @Context("req") request: AuthenticatedRequest,
    @Args("orderNo", { type: () => ID }) orderNo: string,
  ): Promise<OrderType | null> {
    const row = await this.orderService.findByOrderNo(
      request.auth!.userId,
      orderNo,
    );

    return row ? toOrder(row) : null;
  }

  @Mutation(() => CreateOrderPayload)
  @UseGuards(GqlAuthGuard)
  async createOrder(
    @Args("input") input: CreateOrderInput,
    @Context("req") request: AuthenticatedRequest,
  ): Promise<CreateOrderPayload> {
    const userId = request.auth!.userId;
    const addressId = parsePositiveId(input.addressId);

    if (addressId === null) {
      return {
        errors: [
          {
            code: ErrorCode.ADDRESS_NOT_FOUND,
            addressId: input.addressId,
          },
        ],
      };
    }

    const items = [];
    for (const item of input.items) {
      const skuId = parsePositiveId(item.skuId);
      if (skuId === null) {
        return {
          errors: [
            {
              code: ErrorCode.SKU_NOT_FOUND,
              skuId: item.skuId,
            },
          ],
        };
      }

      items.push({ skuId, quantity: item.quantity });
    }

    const result = await this.checkoutService.checkout(
      userId,
      addressId,
      items,
    );

    if (result.ok) {
      return { data: toOrder(result.order), errors: [] };
    }

    if (result.errCode === ErrorCode.ADDRESS_NOT_FOUND) {
      return {
        errors: [
          {
            code: result.errCode,
            addressId: String(result.addressId),
          },
        ],
      };
    }

    return { errors: [toCreateOrderError(result)] };
  }
}
