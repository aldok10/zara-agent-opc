package com.example.app.order;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;

/**
 * Integration test using Testcontainers with Spring Boot 3.1+ @ServiceConnection.
 *
 * Real PostgreSQL and Kafka containers  -  no mocks, no H2.
 * Tests verify actual database behavior, event publishing, and cross-module communication.
 */
@SpringBootTest
@Testcontainers
class OrderIntegrationTest {

    // @ServiceConnection auto-configures spring.datasource.* from the container
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    // Kafka container  -  manual property registration (no @ServiceConnection for Kafka yet)
    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TestKafkaConsumer testConsumer;

    @Test
    void shouldCreateOrderAndPersist() {
        var command = new CreateOrderCommand(
            "customer-1",
            List.of(
                new OrderItem("SKU-001", 2, new BigDecimal("29.99")),
                new OrderItem("SKU-002", 1, new BigDecimal("49.99"))
            )
        );

        var order = orderService.createOrder(command);

        assertThat(order.id()).isNotNull();
        assertThat(order.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.items()).hasSize(2);
        assertThat(order.total()).isEqualByComparingTo(new BigDecimal("109.97"));

        // Verify persisted correctly
        var persisted = orderRepository.findById(order.id());
        assertThat(persisted).isPresent();
        assertThat(persisted.get().customerId()).isEqualTo("customer-1");
    }

    @Test
    void shouldPublishEventOnOrderCompletion() {
        var order = createTestOrder();

        orderService.completeOrder(order.id());

        // Await async event publication
        await().atMost(Duration.ofSeconds(5))
            .untilAsserted(() -> {
                var events = testConsumer.getReceivedEvents("orders.completed");
                assertThat(events)
                    .anyMatch(e -> e.orderId().equals(order.id()));
            });
    }

    @Test
    void shouldRejectOrderWithInvalidItems() {
        var command = new CreateOrderCommand(
            "customer-1",
            List.of()  // empty items  -  invalid
        );

        assertThatThrownBy(() -> orderService.createOrder(command))
            .isInstanceOf(InvalidOrderException.class)
            .hasMessageContaining("at least one item");
    }

    @Test
    void shouldHandleConcurrentOrderUpdates() {
        var order = createTestOrder();

        // Simulate concurrent modification (optimistic locking)
        var loaded1 = orderRepository.findById(order.id()).orElseThrow();
        var loaded2 = orderRepository.findById(order.id()).orElseThrow();

        orderService.addItem(loaded1.id(), new OrderItem("SKU-003", 1, new BigDecimal("9.99")));

        // Second update on stale version should fail
        assertThatThrownBy(() ->
            orderService.addItem(loaded2.id(), new OrderItem("SKU-004", 1, new BigDecimal("19.99"))))
            .isInstanceOf(OptimisticLockException.class);
    }

    @Test
    void shouldCalculateCorrectTotalWithDiscount() {
        var command = new CreateOrderCommand(
            "vip-customer",
            List.of(
                new OrderItem("SKU-001", 10, new BigDecimal("100.00"))
            )
        );

        var order = orderService.createOrder(command);

        // VIP customers get 10% discount on orders > $500
        assertThat(order.total()).isEqualByComparingTo(new BigDecimal("900.00"));
        assertThat(order.discountApplied()).isTrue();
    }

    // --- Test Helpers ---

    private Order createTestOrder() {
        return orderService.createOrder(new CreateOrderCommand(
            "customer-1",
            List.of(new OrderItem("SKU-001", 1, new BigDecimal("29.99")))
        ));
    }
}
