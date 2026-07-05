import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getDeviceLocale(): string;
  getTimezone(): string;
  getBatteryLevel(): Promise<number>;
  isCharging(): Promise<boolean>;
  getNetworkType(): Promise<'wifi' | 'cellular' | 'none' | 'unknown'>;
  getAvailableStorage(): Promise<number>;
  hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'selection'): void;
  getConstants(): {
    appVersion: string;
    buildNumber: string;
    bundleId: string;
    deviceModel: string;
    systemVersion: string;
    isTablet: boolean;
  };
}

export default TurboModuleRegistry.getEnforcing<Spec>('DeviceInfo');
