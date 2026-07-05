package com.example.app.shipping;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Domain modeling with sealed interfaces and pattern matching.
 *
 * Sealed interfaces restrict implementations to a known set,
 * enabling exhaustive pattern matching in switch expressions.
 * The compiler ensures all cases are handled.
 */

// --- Domain Model ---

public sealed interface ShippingMethod
    permits StandardShipping, ExpressShipping, SameDayShipping, PickupInStore {
}

public record StandardShipping(LocalDate estimatedDelivery) implements ShippingMethod {}
public record ExpressShipping(LocalDate estimatedDelivery, String carrier) implements ShippingMethod {}
public record SameDayShipping(String timeSlot) implements ShippingMethod {}
public record PickupInStore(String storeId, LocalDate readyBy) implements ShippingMethod {}


// --- Order Status (state machine) ---

public sealed interface OrderStatus
    permits OrderStatus.Draft, OrderStatus.Confirmed, OrderStatus.Shipped,
            OrderStatus.Delivered, OrderStatus.Cancelled {

    record Draft() implements OrderStatus {}
    record Confirmed(LocalDate confirmedAt) implements OrderStatus {}
    record Shipped(String trackingNumber, LocalDate shippedAt) implements OrderStatus {}
    record Delivered(LocalDate deliveredAt, String signedBy) implements OrderStatus {}
    record Cancelled(String reason, LocalDate cancelledAt) implements OrderStatus {}
}


// --- Payment Result (success/failure ADT) ---

public sealed interface PaymentResult
    permits PaymentResult.Authorized, PaymentResult.Declined,
            PaymentResult.RequiresAction, PaymentResult.Error {

    record Authorized(String transactionId, BigDecimal amount) implements PaymentResult {}
    record Declined(String reason, String declineCode) implements PaymentResult {}
    record RequiresAction(String actionUrl, String type) implements PaymentResult {}
    record Error(String message, Exception cause) implements PaymentResult {}
}


// --- Service using pattern matching ---

public class ShippingCostCalculator {

    /**
     * Exhaustive switch — compiler ensures all ShippingMethod variants handled.
     * Adding a new variant to the sealed interface = compile error here until handled.
     */
    public BigDecimal calculateCost(ShippingMethod method, BigDecimal orderTotal) {
        return switch (method) {
            case StandardShipping s -> orderTotal.compareTo(new BigDecimal("50")) >= 0
                ? BigDecimal.ZERO  // free standard shipping over $50
                : new BigDecimal("5.99");

            case ExpressShipping e -> new BigDecimal("14.99");

            case SameDayShipping sd -> new BigDecimal("24.99");

            case PickupInStore p -> BigDecimal.ZERO;
        };
    }

    /**
     * Guarded patterns — additional conditions within case branches.
     */
    public String describeDelivery(ShippingMethod method) {
        return switch (method) {
            case StandardShipping s when s.estimatedDelivery().isBefore(LocalDate.now().plusDays(3))
                -> "Fast standard delivery by " + s.estimatedDelivery();
            case StandardShipping s
                -> "Standard delivery by " + s.estimatedDelivery();
            case ExpressShipping e
                -> "Express via " + e.carrier() + " by " + e.estimatedDelivery();
            case SameDayShipping sd
                -> "Same-day delivery, time slot: " + sd.timeSlot();
            case PickupInStore p
                -> "Ready for pickup at store " + p.storeId() + " by " + p.readyBy();
        };
    }
}


// --- Order processing with status pattern matching ---

public class OrderProcessor {

    /**
     * Process order based on current status.
     * Sealed interface guarantees exhaustive handling.
     */
    public String getStatusMessage(OrderStatus status) {
        return switch (status) {
            case OrderStatus.Draft d -> "Order is in draft — confirm to proceed.";
            case OrderStatus.Confirmed c -> "Confirmed on " + c.confirmedAt() + ". Preparing shipment.";
            case OrderStatus.Shipped s -> "Shipped! Track with: " + s.trackingNumber();
            case OrderStatus.Delivered d -> "Delivered on " + d.deliveredAt() + ", signed by " + d.signedBy();
            case OrderStatus.Cancelled c -> "Cancelled: " + c.reason();
        };
    }

    /**
     * Payment result handling — each variant has different recovery strategy.
     */
    public OrderStatus handlePayment(PaymentResult result) {
        return switch (result) {
            case PaymentResult.Authorized a -> {
                log("Payment authorized: " + a.transactionId());
                yield new OrderStatus.Confirmed(LocalDate.now());
            }
            case PaymentResult.Declined d -> {
                log("Payment declined: " + d.reason() + " (" + d.declineCode() + ")");
                yield new OrderStatus.Draft();  // back to draft for retry
            }
            case PaymentResult.RequiresAction ra -> {
                log("3DS required: " + ra.actionUrl());
                yield new OrderStatus.Draft();  // pending user action
            }
            case PaymentResult.Error e -> {
                log("Payment error: " + e.message());
                throw new PaymentProcessingException(e.message(), e.cause());
            }
        };
    }

    private void log(String message) {
        // logger call
    }
}
