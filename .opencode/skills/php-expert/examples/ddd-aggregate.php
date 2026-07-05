<?php

declare(strict_types=1);

namespace Domain\Order;

use DateTimeImmutable;
use DomainException;

final class OrderId
{
    public function __construct(public readonly string $value) {}

    public static function generate(): self
    {
        return new self(bin2hex(random_bytes(16)));
    }
}

final class Money
{
    public function __construct(
        public readonly int $amountCents,
        public readonly string $currency = 'USD',
    ) {
        if ($amountCents < 0) {
            throw new DomainException('Money amount cannot be negative');
        }
    }

    public function add(self $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new DomainException("Cannot add {$this->currency} and {$other->currency}");
        }
        return new self($this->amountCents + $other->amountCents, $this->currency);
    }
}

final class OrderLine
{
    public function __construct(
        public readonly string $productId,
        public readonly int $quantity,
        public readonly Money $unitPrice,
    ) {
        if ($quantity < 1) {
            throw new DomainException('Quantity must be at least 1');
        }
    }

    public function lineTotal(): Money
    {
        return new Money($this->unitPrice->amountCents * $this->quantity, $this->unitPrice->currency);
    }
}

abstract class DomainEvent
{
    public readonly DateTimeImmutable $occurredAt;

    public function __construct()
    {
        $this->occurredAt = new DateTimeImmutable();
    }
}

final class OrderPlaced extends DomainEvent
{
    public function __construct(
        public readonly OrderId $orderId,
        public readonly string $customerId,
        public readonly Money $total,
    ) {
        parent::__construct();
    }
}

final class OrderCancelled extends DomainEvent
{
    public function __construct(
        public readonly OrderId $orderId,
        public readonly string $reason,
    ) {
        parent::__construct();
    }
}

final class Order
{
    private array $domainEvents = [];

    private function __construct(
        public readonly OrderId $id,
        public readonly string $customerId,
        private array $lines,
        private string $status,
        public readonly DateTimeImmutable $createdAt,
    ) {}

    public static function place(string $customerId, array $lines): self
    {
        if ($lines === []) {
            throw new DomainException('Order must have at least one line');
        }

        $order = new self(
            id: OrderId::generate(),
            customerId: $customerId,
            lines: $lines,
            status: 'placed',
            createdAt: new DateTimeImmutable(),
        );

        $order->recordEvent(new OrderPlaced($order->id, $customerId, $order->total()));

        return $order;
    }

    public function cancel(string $reason): void
    {
        if ($this->status !== 'placed') {
            throw new DomainException("Cannot cancel order in status: {$this->status}");
        }
        $this->status = 'cancelled';
        $this->recordEvent(new OrderCancelled($this->id, $reason));
    }

    public function total(): Money
    {
        $total = new Money(0);
        foreach ($this->lines as $line) {
            $total = $total->add($line->lineTotal());
        }
        return $total;
    }

    public function status(): string
    {
        return $this->status;
    }

    /** @return DomainEvent[] */
    public function releaseEvents(): array
    {
        $events = $this->domainEvents;
        $this->domainEvents = [];
        return $events;
    }

    private function recordEvent(DomainEvent $event): void
    {
        $this->domainEvents[] = $event;
    }
}
