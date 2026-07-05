<?php

declare(strict_types=1);

namespace Domain\Order;

use Domain\Order\Event\OrderPlaced;
use Domain\Order\Event\OrderCancelled;
use Domain\Order\Event\ItemAdded;
use Domain\Order\ValueObject\OrderId;
use Domain\Order\ValueObject\LineItem;
use Domain\Order\ValueObject\Money;
use Domain\Order\ValueObject\CustomerId;
use Domain\Order\Enum\OrderStatus;
use Domain\Order\Exception\InvalidOrderTransition;
use Domain\Order\Exception\OrderLimitExceeded;
use Domain\Shared\AggregateRoot;
use Domain\Shared\DomainEvent;

/**
 * Order Aggregate Root.
 *
 * Invariants:
 * - Order must have at least one line item.
 * - Maximum 50 line items per order.
 * - Total is always consistent with line items.
 * - Status transitions follow state machine rules.
 */
final class Order extends AggregateRoot
{
    private const int MAX_LINE_ITEMS = 50;

    /** @var list<LineItem> */
    private array $lineItems;
    private Money $total;
    private OrderStatus $status;

    private function __construct(
        private readonly OrderId $id,
        private readonly CustomerId $customerId,
        array $lineItems,
    ) {
        $this->lineItems = $lineItems;
        $this->status = OrderStatus::Draft;
        $this->recalculateTotal();
    }

    // --- Factory ---

    public static function create(OrderId $id, CustomerId $customerId, LineItem ...$items): self
    {
        if ($items === []) {
            throw new \DomainException('Order must have at least one line item.');
        }

        $order = new self($id, $customerId, array_values($items));
        $order->record(new OrderPlaced(
            orderId: $id,
            customerId: $customerId,
            total: $order->total,
            itemCount: count($items),
        ));

        return $order;
    }

    // --- Commands ---

    public function addItem(LineItem $item): void
    {
        if (count($this->lineItems) >= self::MAX_LINE_ITEMS) {
            throw OrderLimitExceeded::maxItems(self::MAX_LINE_ITEMS);
        }

        if (!$this->status->allowsModification()) {
            throw InvalidOrderTransition::cannotModify($this->status);
        }

        $this->lineItems[] = $item;
        $this->recalculateTotal();

        $this->record(new ItemAdded(
            orderId: $this->id,
            productId: $item->productId,
            quantity: $item->quantity,
        ));
    }

    public function cancel(string $reason): void
    {
        if (!$this->status->canTransitionTo(OrderStatus::Cancelled)) {
            throw InvalidOrderTransition::cannot($this->status, OrderStatus::Cancelled);
        }

        $this->status = OrderStatus::Cancelled;

        $this->record(new OrderCancelled(
            orderId: $this->id,
            reason: $reason,
            previousStatus: $this->status,
        ));
    }

    public function confirm(): void
    {
        if (!$this->status->canTransitionTo(OrderStatus::Confirmed)) {
            throw InvalidOrderTransition::cannot($this->status, OrderStatus::Confirmed);
        }

        $this->status = OrderStatus::Confirmed;
    }

    // --- Queries ---

    public function id(): OrderId
    {
        return $this->id;
    }

    public function total(): Money
    {
        return $this->total;
    }

    public function status(): OrderStatus
    {
        return $this->status;
    }

    public function itemCount(): int
    {
        return count($this->lineItems);
    }

    // --- Private ---

    private function recalculateTotal(): void
    {
        $this->total = Money::zero(Currency::USD);
        foreach ($this->lineItems as $item) {
            $this->total = $this->total->add($item->subtotal());
        }
    }
}

// --- Value Objects ---

namespace Domain\Order\ValueObject;

final readonly class OrderId
{
    private function __construct(public string $value) {}

    public static function generate(): self
    {
        return new self(\Symfony\Component\Uid\Ulid::generate());
    }

    public static function fromString(string $value): self
    {
        if (trim($value) === '') {
            throw new \InvalidArgumentException('OrderId cannot be empty.');
        }
        return new self($value);
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function toString(): string
    {
        return $this->value;
    }
}

final readonly class Money
{
    public function __construct(
        public int $amount,
        public Currency $currency,
    ) {
        if ($amount < 0) {
            throw new \InvalidArgumentException('Money amount cannot be negative.');
        }
    }

    public static function zero(Currency $currency): self
    {
        return new self(0, $currency);
    }

    public static function of(int $cents, Currency $currency): self
    {
        return new self($cents, $currency);
    }

    public function add(self $other): self
    {
        $this->ensureSameCurrency($other);
        return new self($this->amount + $other->amount, $this->currency);
    }

    public function multiply(int $factor): self
    {
        return new self($this->amount * $factor, $this->currency);
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount && $this->currency === $other->currency;
    }

    private function ensureSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new \DomainException("Cannot operate on different currencies: {$this->currency->value} vs {$other->currency->value}");
        }
    }
}

final readonly class LineItem
{
    public function __construct(
        public string $productId,
        public int $quantity,
        public Money $unitPrice,
    ) {
        if ($quantity < 1) {
            throw new \InvalidArgumentException('Quantity must be at least 1.');
        }
        if ($quantity > 999) {
            throw new \InvalidArgumentException('Quantity cannot exceed 999.');
        }
    }

    public function subtotal(): Money
    {
        return $this->unitPrice->multiply($this->quantity);
    }
}

// --- Enum with Behavior ---

namespace Domain\Order\Enum;

enum OrderStatus: string
{
    case Draft = 'draft';
    case Confirmed = 'confirmed';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    public function allowsModification(): bool
    {
        return match ($this) {
            self::Draft, self::Confirmed => true,
            default => false,
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::Draft => in_array($target, [self::Confirmed, self::Cancelled], true),
            self::Confirmed => in_array($target, [self::Paid, self::Cancelled], true),
            self::Paid => $target === self::Shipped,
            self::Shipped => $target === self::Delivered,
            default => false,
        };
    }
}

// --- Domain Event ---

namespace Domain\Order\Event;

use Domain\Order\ValueObject\OrderId;
use Domain\Order\ValueObject\CustomerId;
use Domain\Order\ValueObject\Money;
use Domain\Shared\DomainEvent;

final readonly class OrderPlaced implements DomainEvent
{
    public function __construct(
        public OrderId $orderId,
        public CustomerId $customerId,
        public Money $total,
        public int $itemCount,
        public \DateTimeImmutable $occurredAt = new \DateTimeImmutable(),
    ) {}
}

// --- Abstract Aggregate Root ---

namespace Domain\Shared;

abstract class AggregateRoot
{
    /** @var list<DomainEvent> */
    private array $recordedEvents = [];

    protected function record(DomainEvent $event): void
    {
        $this->recordedEvents[] = $event;
    }

    /** @return list<DomainEvent> */
    public function releaseEvents(): array
    {
        $events = $this->recordedEvents;
        $this->recordedEvents = [];
        return $events;
    }
}

interface DomainEvent
{
    // Marker interface  -  all events are readonly data carriers
}

// --- Repository Interface (Domain Layer) ---

namespace Domain\Order\Repository;

use Domain\Order\Order;
use Domain\Order\ValueObject\OrderId;

interface OrderRepository
{
    public function findById(OrderId $id): ?Order;
    public function save(Order $order): void;
    public function nextIdentity(): OrderId;
}
