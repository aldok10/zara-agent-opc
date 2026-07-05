import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'product_catalog.freezed.dart';
part 'product_catalog.g.dart';

@freezed
class Product with _$Product {
  const factory Product({
    required String id,
    required String name,
    required double price,
    required String imageUrl,
    required String category,
    @Default(false) bool isFavorite,
  }) = _Product;

  factory Product.fromJson(Map<String, dynamic> json) => _$ProductFromJson(json);
}

@freezed
class ProductFilter with _$ProductFilter {
  const factory ProductFilter({
    @Default('') String query,
    String? category,
    @Default(SortBy.newest) SortBy sortBy,
  }) = _ProductFilter;
}

enum SortBy { newest, priceLow, priceHigh, nameAz }

@riverpod
class ProductFilterNotifier extends _$ProductFilterNotifier {
  @override
  ProductFilter build() => const ProductFilter();

  void setQuery(String query) => state = state.copyWith(query: query);
  void setCategory(String? category) => state = state.copyWith(category: category);
  void setSortBy(SortBy sortBy) => state = state.copyWith(sortBy: sortBy);
  void clear() => state = const ProductFilter();
}

@riverpod
class ProductCatalog extends _$ProductCatalog {
  @override
  Future<List<Product>> build() async {
    final repository = ref.watch(productRepositoryProvider);
    return repository.fetchAll();
  }

  Future<void> toggleFavorite(String productId) async {
    final repository = ref.read(productRepositoryProvider);
    await repository.toggleFavorite(productId);
    ref.invalidateSelf();
  }
}

@riverpod
List<Product> filteredProducts(FilteredProductsRef ref) {
  final productsAsync = ref.watch(productCatalogProvider);
  final filter = ref.watch(productFilterNotifierProvider);

  return productsAsync.maybeWhen(
    data: (products) {
      var filtered = products.where((p) {
        if (filter.query.isNotEmpty &&
            !p.name.toLowerCase().contains(filter.query.toLowerCase())) {
          return false;
        }
        if (filter.category != null && p.category != filter.category) {
          return false;
        }
        return true;
      }).toList();

      switch (filter.sortBy) {
        case SortBy.newest:
          break;
        case SortBy.priceLow:
          filtered.sort((a, b) => a.price.compareTo(b.price));
        case SortBy.priceHigh:
          filtered.sort((a, b) => b.price.compareTo(a.price));
        case SortBy.nameAz:
          filtered.sort((a, b) => a.name.compareTo(b.name));
      }
      return filtered;
    },
    orElse: () => [],
  );
}

class ProductCatalogPage extends ConsumerWidget {
  const ProductCatalogPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(productCatalogProvider);
    final filtered = ref.watch(filteredProductsProvider);
    final filter = ref.watch(productFilterNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          PopupMenuButton<SortBy>(
            icon: const Icon(Icons.sort),
            onSelected: ref.read(productFilterNotifierProvider.notifier).setSortBy,
            itemBuilder: (_) => SortBy.values
                .map((s) => PopupMenuItem(value: s, child: Text(s.name)))
                .toList(),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search products...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: ref.read(productFilterNotifierProvider.notifier).setQuery,
            ),
          ),
          Expanded(
            child: productsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Error: $e'),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () => ref.invalidate(productCatalogProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (_) => filtered.isEmpty
                  ? const Center(child: Text('No products found'))
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.75,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final product = filtered[index];
                        return ProductCard(
                          product: product,
                          onFavorite: () => ref
                              .read(productCatalogProvider.notifier)
                              .toggleFavorite(product.id),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, required this.onFavorite});

  final Product product;
  final VoidCallback onFavorite;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Image.network(
              product.imageUrl,
              fit: BoxFit.cover,
              width: double.infinity,
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name, style: Theme.of(context).textTheme.titleSmall),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('\$${product.price.toStringAsFixed(2)}'),
                    IconButton(
                      icon: Icon(
                        product.isFavorite ? Icons.favorite : Icons.favorite_border,
                        color: product.isFavorite ? Colors.red : null,
                      ),
                      onPressed: onFavorite,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
