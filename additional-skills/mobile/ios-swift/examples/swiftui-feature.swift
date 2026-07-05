import SwiftUI
import ComposableArchitecture

@Reducer
struct ProductListFeature {
    @ObservableState
    struct State: Equatable {
        var products: IdentifiedArrayOf<Product> = []
        var isLoading = false
        var searchQuery = ""
        var sortOrder: SortOrder = .newest
        @Presents var detail: ProductDetailFeature.State?

        var filteredProducts: IdentifiedArrayOf<Product> {
            let filtered = searchQuery.isEmpty
                ? products
                : products.filter { $0.name.localizedCaseInsensitiveContains(searchQuery) }
            return IdentifiedArray(uniqueElements: filtered.sorted(by: sortOrder))
        }

        enum SortOrder: String, CaseIterable {
            case newest, priceLow, priceHigh

            var label: String {
                switch self {
                case .newest: "Newest"
                case .priceLow: "Price: Low to High"
                case .priceHigh: "Price: High to Low"
                }
            }
        }
    }

    enum Action: BindableAction {
        case binding(BindingAction<State>)
        case onAppear
        case productsLoaded(Result<[Product], Error>)
        case productTapped(Product.ID)
        case detail(PresentationAction<ProductDetailFeature.Action>)
    }

    @Dependency(\.productClient) var productClient

    var body: some ReducerOf<Self> {
        BindingReducer()
        Reduce { state, action in
            switch action {
            case .binding:
                return .none
            case .onAppear:
                guard state.products.isEmpty else { return .none }
                state.isLoading = true
                return .run { send in
                    await send(.productsLoaded(Result {
                        try await productClient.fetchAll()
                    }))
                }
            case let .productsLoaded(.success(products)):
                state.isLoading = false
                state.products = IdentifiedArray(uniqueElements: products)
                return .none
            case .productsLoaded(.failure):
                state.isLoading = false
                return .none
            case let .productTapped(id):
                guard let product = state.products[id: id] else { return .none }
                state.detail = ProductDetailFeature.State(product: product)
                return .none
            case .detail:
                return .none
            }
        }
        .ifLet(\.$detail, action: \.detail) {
            ProductDetailFeature()
        }
    }
}

struct ProductListView: View {
    @Bindable var store: StoreOf<ProductListFeature>

    var body: some View {
        NavigationStack {
            Group {
                if store.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    productList
                }
            }
            .navigationTitle("Products")
            .searchable(text: $store.searchQuery, prompt: "Search products")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    sortMenu
                }
            }
            .sheet(item: $store.scope(state: \.detail, action: \.detail)) { detailStore in
                ProductDetailView(store: detailStore)
            }
        }
        .onAppear { store.send(.onAppear) }
    }

    private var productList: some View {
        List(store.filteredProducts) { product in
            ProductRow(product: product)
                .onTapGesture { store.send(.productTapped(product.id)) }
        }
    }

    private var sortMenu: some View {
        Menu {
            ForEach(ProductListFeature.State.SortOrder.allCases, id: \.self) { order in
                Button {
                    store.sortOrder = order
                } label: {
                    HStack {
                        Text(order.label)
                        if store.sortOrder == order {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
        }
    }
}

private struct ProductRow: View {
    let product: Product

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: product.imageURL) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray.opacity(0.2)
            }
            .frame(width: 60, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(product.name)
                    .font(.headline)
                Text(product.formattedPrice)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
