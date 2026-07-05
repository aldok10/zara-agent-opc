<?php

declare(strict_types=1);

namespace App\MessageHandler;

use App\Message\ProcessPaymentCommand;
use App\Repository\OrderRepositoryInterface;
use App\Service\PaymentGatewayInterface;
use App\Event\PaymentProcessed;
use App\Event\PaymentFailed;
use App\Exception\PaymentDeclinedException;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Messenger\Envelope;
use Symfony\Component\Messenger\Exception\UnrecoverableMessageHandlingException;
use Symfony\Component\Messenger\Stamp\DelayStamp;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

/**
 * Handles payment processing commands from the message bus.
 *
 * Retry strategy:
 * - Transient failures (gateway timeout): retry 3x with exponential backoff.
 * - Permanent failures (card declined): move to failed transport immediately.
 * - Idempotent: checks if already processed before executing.
 */
#[AsMessageHandler]
final readonly class ProcessPaymentHandler
{
    public function __construct(
        private OrderRepositoryInterface $orders,
        private PaymentGatewayInterface $gateway,
        private EventDispatcherInterface $dispatcher,
        private LoggerInterface $logger,
    ) {}

    public function __invoke(ProcessPaymentCommand $command): void
    {
        $order = $this->orders->findById($command->orderId);

        if ($order === null) {
            throw new UnrecoverableMessageHandlingException(
                "Order {$command->orderId} not found. Cannot process payment.",
            );
        }

        // Idempotency: skip if already paid
        if ($order->isPaid()) {
            $this->logger->info('Payment already processed', [
                'order_id' => $command->orderId->toString(),
            ]);
            return;
        }

        try {
            $result = $this->gateway->charge(
                amount: $order->total(),
                paymentMethodId: $command->paymentMethodId,
                idempotencyKey: "order-{$command->orderId->toString()}",
            );

            $order->markPaid($result->transactionId);
            $this->orders->save($order);

            $this->dispatcher->dispatch(new PaymentProcessed(
                orderId: $command->orderId,
                transactionId: $result->transactionId,
                amount: $order->total(),
            ));

            $this->logger->info('Payment processed', [
                'order_id' => $command->orderId->toString(),
                'transaction_id' => $result->transactionId,
            ]);
        } catch (PaymentDeclinedException $e) {
            // Permanent failure  -  do not retry
            $order->markPaymentFailed($e->declineCode);
            $this->orders->save($order);

            $this->dispatcher->dispatch(new PaymentFailed(
                orderId: $command->orderId,
                reason: $e->declineCode->value,
            ));

            throw new UnrecoverableMessageHandlingException(
                "Payment declined: {$e->declineCode->value}",
                previous: $e,
            );
        }
        // Other exceptions (GatewayTimeoutException, etc.) bubble up for retry
    }
}

// --- Command Message ---

namespace App\Message;

use App\ValueObject\OrderId;

final readonly class ProcessPaymentCommand
{
    public function __construct(
        public OrderId $orderId,
        public string $paymentMethodId,
    ) {}
}

// --- Messenger Configuration (messenger.yaml) ---
// framework:
//     messenger:
//         transports:
//             payments:
//                 dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
//                 options:
//                     queue_name: payments
//                 retry_strategy:
//                     max_retries: 3
//                     delay: 1000
//                     multiplier: 3
//                     max_delay: 30000
//             failed:
//                 dsn: 'doctrine://default?queue_name=failed'
//
//         routing:
//             'App\Message\ProcessPaymentCommand': payments

// --- Test ---

namespace App\Tests\MessageHandler;

use App\Message\ProcessPaymentCommand;
use App\MessageHandler\ProcessPaymentHandler;
use App\Repository\InMemoryOrderRepository;
use App\Service\FakePaymentGateway;
use App\ValueObject\OrderId;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Messenger\Exception\UnrecoverableMessageHandlingException;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

final class ProcessPaymentHandlerTest extends TestCase
{
    private InMemoryOrderRepository $orders;
    private FakePaymentGateway $gateway;
    private ProcessPaymentHandler $handler;

    protected function setUp(): void
    {
        $this->orders = new InMemoryOrderRepository();
        $this->gateway = new FakePaymentGateway();
        $dispatcher = $this->createMock(EventDispatcherInterface::class);

        $this->handler = new ProcessPaymentHandler(
            orders: $this->orders,
            gateway: $this->gateway,
            dispatcher: $dispatcher,
            logger: new NullLogger(),
        );
    }

    public function testProcessesPaymentSuccessfully(): void
    {
        $order = OrderMother::unpaid();
        $this->orders->save($order);
        $this->gateway->willSucceed('txn_123');

        ($this->handler)(new ProcessPaymentCommand(
            orderId: $order->id(),
            paymentMethodId: 'pm_test',
        ));

        self::assertTrue($this->orders->findById($order->id())->isPaid());
    }

    public function testSkipsAlreadyPaidOrders(): void
    {
        $order = OrderMother::paid();
        $this->orders->save($order);

        // Should not throw, should not call gateway
        ($this->handler)(new ProcessPaymentCommand(
            orderId: $order->id(),
            paymentMethodId: 'pm_test',
        ));

        self::assertSame(0, $this->gateway->chargeCallCount());
    }

    public function testThrowsUnrecoverableForDeclinedPayment(): void
    {
        $order = OrderMother::unpaid();
        $this->orders->save($order);
        $this->gateway->willDecline();

        $this->expectException(UnrecoverableMessageHandlingException::class);

        ($this->handler)(new ProcessPaymentCommand(
            orderId: $order->id(),
            paymentMethodId: 'pm_test',
        ));
    }

    public function testThrowsUnrecoverableForMissingOrder(): void
    {
        $this->expectException(UnrecoverableMessageHandlingException::class);

        ($this->handler)(new ProcessPaymentCommand(
            orderId: OrderId::generate(),
            paymentMethodId: 'pm_test',
        ));
    }
}
