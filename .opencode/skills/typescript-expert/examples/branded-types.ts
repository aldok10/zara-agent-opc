declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
type Email = Brand<string, "Email">;

const UserId = {
  parse(value: string): UserId {
    if (!value.startsWith("usr_") || value.length !== 28) {
      throw new TypeError(`Invalid UserId: ${value}`);
    }
    return value as UserId;
  },
  create(): UserId {
    const id = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    return id as UserId;
  },
} as const;

const OrderId = {
  parse(value: string): OrderId {
    if (!value.startsWith("ord_") || value.length !== 28) {
      throw new TypeError(`Invalid OrderId: ${value}`);
    }
    return value as OrderId;
  },
  create(): OrderId {
    const id = `ord_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    return id as OrderId;
  },
} as const;

const Email = {
  parse(value: string): Email {
    const normalized = value.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new TypeError(`Invalid email: ${value}`);
    }
    return normalized as Email;
  },
} as const;

interface User {
  id: UserId;
  email: Email;
  name: string;
}

interface Order {
  id: OrderId;
  userId: UserId;
  totalCents: number;
  status: "pending" | "confirmed" | "shipped" | "delivered";
}

function createUser(email: string, name: string): User {
  return {
    id: UserId.create(),
    email: Email.parse(email),
    name,
  };
}

function assignOrder(user: User): Order {
  return {
    id: OrderId.create(),
    userId: user.id,
    totalCents: 0,
    status: "pending",
  };
}

export { UserId, OrderId, Email, createUser, assignOrder };
export type { User, Order };
