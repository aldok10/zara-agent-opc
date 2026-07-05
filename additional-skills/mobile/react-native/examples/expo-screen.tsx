import { useCallback, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useStore } from 'zustand';
import Animated, { FadeIn } from 'react-native-reanimated';
import { orderStore } from '@/stores/order-store';
import { ErrorView } from '@/components/error-view';
import { LoadingIndicator } from '@/components/loading-indicator';
import type { Order } from '@/types/order';

export default function OrdersScreen() {
  const router = useRouter();
  const { orders, isLoading, error, fetchOrders } = useStore(orderStore);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOrderPress = useCallback(
    (orderId: string) => {
      router.push({ pathname: '/orders/[id]', params: { id: orderId } });
    },
    [router],
  );

  if (error) {
    return <ErrorView message={error} onRetry={fetchOrders} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Orders' }} />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <OrderRow order={item} index={index} onPress={handleOrderPress} />
        )}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={fetchOrders}
        ListEmptyComponent={
          isLoading ? <LoadingIndicator /> : <EmptyState />
        }
      />
    </>
  );
}

function OrderRow({
  order,
  index,
  onPress,
}: {
  order: Order;
  index: number;
  onPress: (id: string) => void;
}) {
  return (
    <Animated.View entering={FadeIn.delay(index * 50).duration(200)}>
      <Pressable
        style={styles.row}
        onPress={() => onPress(order.id)}
        accessibilityRole="button"
        accessibilityLabel={`Order ${order.id}, status ${order.status}`}
      >
        <Image
          source={{ uri: order.items[0]?.imageUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.rowContent}>
          <Text style={styles.orderId}>#{order.id}</Text>
          <Text style={styles.status}>{order.status}</Text>
          <Text style={styles.total}>
            ${order.total.toFixed(2)}
          </Text>
        </View>
        <StatusBadge status={order.status} />
      </Pressable>
    </Animated.View>
  );
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const color = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444',
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>No orders yet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
  },
  status: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  total: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});
