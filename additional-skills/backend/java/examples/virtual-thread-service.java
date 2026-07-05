package com.example.app.pricing;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.Subtask;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Pricing service that fetches data from multiple sources concurrently
 * using virtual threads and structured concurrency.
 *
 * Spring Boot 3.2+ with spring.threads.virtual.enabled=true means
 * this service's methods already run on virtual threads when called
 * from a controller.
 */
@Service
public class PricingService {

    private static final Logger log = LoggerFactory.getLogger(PricingService.class);

    private final ProductCatalogClient catalogClient;
    private final InventoryClient inventoryClient;
    private final DiscountEngine discountEngine;
    private final ExchangeRateClient exchangeRateClient;

    public PricingService(ProductCatalogClient catalogClient,
                          InventoryClient inventoryClient,
                          DiscountEngine discountEngine,
                          ExchangeRateClient exchangeRateClient) {
        this.catalogClient = catalogClient;
        this.inventoryClient = inventoryClient;
        this.discountEngine = discountEngine;
        this.exchangeRateClient = exchangeRateClient;
    }

    /**
     * Calculate price by fetching product, inventory, and exchange rate concurrently.
     * Uses StructuredTaskScope to manage subtask lifecycle:
     * - All subtasks complete or all are cancelled on failure.
     * - No leaked threads, no orphaned work.
     */
    public PriceQuote calculatePrice(String productId, String currency) {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {

            // Fork concurrent subtasks — each runs on its own virtual thread
            Subtask<Product> productTask = scope.fork(() ->
                catalogClient.getProduct(productId));

            Subtask<InventoryStatus> inventoryTask = scope.fork(() ->
                inventoryClient.checkStock(productId));

            Subtask<ExchangeRate> rateTask = scope.fork(() ->
                exchangeRateClient.getRate("USD", currency));

            // Wait for all subtasks to complete (or first failure)
            scope.join();
            scope.throwIfFailed();

            // All results available — compute price
            var product = productTask.get();
            var inventory = inventoryTask.get();
            var rate = rateTask.get();

            var basePrice = product.basePrice();
            var discount = discountEngine.calculate(product, inventory);
            var finalPrice = basePrice
                .subtract(discount)
                .multiply(rate.factor());

            log.info("Priced {} at {} {}", productId, finalPrice, currency);

            return new PriceQuote(productId, finalPrice, currency, inventory.available());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PricingException("Pricing interrupted for " + productId, e);
        } catch (Exception e) {
            throw new PricingException("Failed to calculate price for " + productId, e);
        }
    }

    /**
     * Fetch prices for multiple products concurrently.
     * Each product price calculation is itself concurrent (nested structured concurrency).
     */
    public List<PriceQuote> calculateBulkPrices(List<String> productIds, String currency) {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {

            List<Subtask<PriceQuote>> tasks = productIds.stream()
                .map(id -> scope.fork(() -> calculatePrice(id, currency)))
                .toList();

            scope.join();
            scope.throwIfFailed();

            return tasks.stream()
                .map(Subtask::get)
                .toList();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PricingException("Bulk pricing interrupted", e);
        } catch (Exception e) {
            throw new PricingException("Bulk pricing failed", e);
        }
    }

    /**
     * Race multiple pricing providers — return fastest response.
     * Uses ShutdownOnSuccess to cancel slower providers once one responds.
     */
    public PriceQuote getQuoteFromFastestProvider(String productId) {
        try (var scope = new StructuredTaskScope.ShutdownOnSuccess<PriceQuote>()) {

            scope.fork(() -> providerA.quote(productId));
            scope.fork(() -> providerB.quote(productId));
            scope.fork(() -> providerC.quote(productId));

            scope.join();

            return scope.result();  // first successful result

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PricingException("Provider race interrupted", e);
        } catch (Exception e) {
            throw new PricingException("All providers failed for " + productId, e);
        }
    }

    // Placeholder dependencies (would be injected)
    private final PricingProvider providerA = null;
    private final PricingProvider providerB = null;
    private final PricingProvider providerC = null;
}
