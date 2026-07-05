# Hilt Dependency Injection (2026)

## Core Concepts

Hilt is built on Dagger 2 with Android-specific lifecycle-aware components. It generates the Dagger component hierarchy automatically.

Component hierarchy:
```
SingletonComponent (Application)
└── ActivityRetainedComponent (ViewModel)
    └── ViewModelComponent (per ViewModel)
    └── ActivityComponent (Activity)
        └── FragmentComponent (Fragment)
        └── ViewComponent (View)
```

## Modules

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideHttpClient(): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(30.seconds.toJavaDuration())
            .addInterceptor(AuthInterceptor())
            .build()

    @Provides
    @Singleton
    fun provideApi(client: OkHttpClient): ApiService =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_URL)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
            .create()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindUserRepo(impl: UserRepositoryImpl): UserRepository
}
```

`@Provides` for third-party classes you can't annotate.
`@Binds` for interface-to-implementation mapping (more efficient -- no method body needed).

## Qualifiers

When you have multiple bindings of the same type:

```kotlin
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class IoDispatcher

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class DefaultDispatcher

@Module
@InstallIn(SingletonComponent::class)
object DispatcherModule {

    @Provides
    @IoDispatcher
    fun provideIoDispatcher(): CoroutineDispatcher = Dispatchers.IO

    @Provides
    @DefaultDispatcher
    fun provideDefaultDispatcher(): CoroutineDispatcher = Dispatchers.Default
}

class DataSync @Inject constructor(
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher
)
```

## ViewModels

```kotlin
@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepo: CartRepository,
    private val savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val productId: String = savedStateHandle["productId"]!!

    val cartState: StateFlow<CartState> = cartRepo.observe(productId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), CartState.Loading)
}
```

`SavedStateHandle` is automatically provided by Hilt for navigation arguments and process death restoration.

Assisted injection (for runtime params not from the graph):
```kotlin
@AssistedFactory
interface PlayerFactory {
    fun create(@Assisted mediaUri: Uri): PlayerWrapper
}

class PlayerWrapper @AssistedInject constructor(
    @Assisted private val mediaUri: Uri,
    private val audioManager: AudioManager
)
```

## Testing with Hilt

```kotlin
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class CartFeatureTest {

    @get:Rule
    val hiltRule = HiltAndroidRule(this)

    @Inject lateinit var cartRepo: CartRepository

    @Before
    fun setup() { hiltRule.inject() }

    @Test
    fun addToCart_updatesState() { /* ... */ }
}

@Module
@InstallIn(SingletonComponent::class)
@TestInstallIn(replaces = [RepositoryModule::class])
object FakeRepositoryModule {
    @Provides @Singleton
    fun provideCartRepo(): CartRepository = FakeCartRepository()
}
```

For ViewModel unit tests (no Hilt needed):
```kotlin
@Test
fun cartViewModel_loadsProduct() = runTest {
    val fakeRepo = FakeCartRepository()
    val savedState = SavedStateHandle(mapOf("productId" to "abc"))
    val vm = CartViewModel(fakeRepo, savedState)

    advanceUntilIdle()
    assertIs<CartState.Loaded>(vm.cartState.value)
}
```

Prefer constructor injection in tests over Hilt test rules when possible -- faster, simpler, no Android runtime needed.
