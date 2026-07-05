<?php

declare(strict_types=1);

namespace App\Actions\Order;

use App\DTOs\PlaceOrderData;
use App\Enums\OrderStatus;
use App\Events\OrderPlaced;
use App\Models\Order;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Action: Place a new order.
 *
 * - Validates business rules (not just form validation).
 * - Authorizes the user can place orders.
 * - Wraps in transaction for consistency.
 * - Dispatches domain event on success.
 */
final class PlaceOrderAction
{
    public function __invoke(User $user, PlaceOrderData $data): Order
    {
        $this->authorize($user);
        $this->validate($data);

        return DB::transaction(function () use ($user, $data): Order {
            $order = Order::create([
                'user_id' => $user->id,
                'status' => OrderStatus::Placed,
                'shipping_address' => $data->shippingAddress->toArray(),
                'notes' => $data->notes,
            ]);

            foreach ($data->items as $item) {
                $order->items()->create([
                    'product_id' => $item->productId,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unitPrice,
                ]);
            }

            $order->updateTotal();

            event(new OrderPlaced($order));

            return $order->refresh();
        });
    }

    private function authorize(User $user): void
    {
        if ($user->is_suspended) {
            throw new AuthorizationException('Suspended accounts cannot place orders.');
        }

        if ($user->orders()->pending()->count() >= 10) {
            throw new AuthorizationException('Maximum pending orders reached.');
        }
    }

    private function validate(PlaceOrderData $data): void
    {
        if ($data->items === []) {
            throw ValidationException::withMessages([
                'items' => ['At least one item is required.'],
            ]);
        }

        foreach ($data->items as $item) {
            if ($item->quantity < 1 || $item->quantity > 100) {
                throw ValidationException::withMessages([
                    'items' => ["Quantity must be between 1 and 100 for product {$item->productId}."],
                ]);
            }
        }
    }
}

// --- DTO (in App\DTOs\PlaceOrderData) ---

namespace App\DTOs;

final readonly class PlaceOrderData
{
    /**
     * @param list<OrderItemData> $items
     */
    public function __construct(
        public array $items,
        public ShippingAddress $shippingAddress,
        public ?string $notes = null,
    ) {}

    public static function fromRequest(PlaceOrderRequest $request): self
    {
        return new self(
            items: array_map(
                fn (array $item) => new OrderItemData(
                    productId: $item['product_id'],
                    quantity: $item['quantity'],
                    unitPrice: $item['unit_price'],
                ),
                $request->validated('items'),
            ),
            shippingAddress: ShippingAddress::fromArray($request->validated('shipping_address')),
            notes: $request->validated('notes'),
        );
    }
}

// --- Test ---

// tests/Feature/Actions/PlaceOrderActionTest.php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->action = app(PlaceOrderAction::class);
});

it('places order with valid data', function () {
    $data = new PlaceOrderData(
        items: [new OrderItemData(productId: 1, quantity: 2, unitPrice: 1500)],
        shippingAddress: ShippingAddress::fake(),
    );

    $order = ($this->action)($this->user, $data);

    expect($order)
        ->status->toBe(OrderStatus::Placed)
        ->items->toHaveCount(1);

    $this->assertDatabaseHas('orders', ['user_id' => $this->user->id]);
});

it('rejects suspended users', function () {
    $this->user->update(['is_suspended' => true]);
    $data = new PlaceOrderData(
        items: [new OrderItemData(productId: 1, quantity: 1, unitPrice: 1000)],
        shippingAddress: ShippingAddress::fake(),
    );

    expect(fn () => ($this->action)($this->user, $data))
        ->toThrow(AuthorizationException::class);
});

it('rejects empty items', function () {
    $data = new PlaceOrderData(items: [], shippingAddress: ShippingAddress::fake());

    expect(fn () => ($this->action)($this->user, $data))
        ->toThrow(ValidationException::class);
});

it('dispatches OrderPlaced event', function () {
    Event::fake([OrderPlaced::class]);

    $data = new PlaceOrderData(
        items: [new OrderItemData(productId: 1, quantity: 1, unitPrice: 500)],
        shippingAddress: ShippingAddress::fake(),
    );

    ($this->action)($this->user, $data);

    Event::assertDispatched(OrderPlaced::class);
});
