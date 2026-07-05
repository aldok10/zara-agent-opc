import { createContext, useContext, useState, useCallback, useId } from 'react';

// --- Types ---

type TabsContextValue = {
  activeTab: string;
  setActiveTab: (id: string) => void;
  baseId: string;
};

type TabsProps = {
  defaultValue: string;
  children: React.ReactNode;
  onChange?: (value: string) => void;
};

type TabListProps = {
  children: React.ReactNode;
  'aria-label': string;
};

type TabProps = {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
};

type TabPanelProps = {
  value: string;
  children: React.ReactNode;
};

// --- Context ---

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs.* components must be used within <Tabs>');
  return ctx;
}

// --- Root ---

function Tabs({ defaultValue, children, onChange }: TabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultValue);
  const baseId = useId();

  const setActiveTab = useCallback(
    (id: string) => {
      setActiveTabState(id);
      onChange?.(id);
    },
    [onChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div data-component="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// --- TabList ---

function TabList({ children, 'aria-label': ariaLabel }: TabListProps) {
  const { baseId } = useTabs();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
    );
    const currentIndex = tabs.indexOf(e.target as HTMLButtonElement);
    if (currentIndex === -1) return;

    let nextIndex: number | undefined;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      id={`${baseId}-tablist`}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

// --- Tab ---

function Tab({ value, children, disabled = false }: TabProps) {
  const { activeTab, setActiveTab, baseId } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

// --- TabPanel ---

function TabPanel({ value, children }: TabPanelProps) {
  const { activeTab, baseId } = useTabs();
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// --- Attach sub-components ---

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export { Tabs };

// --- Usage Example ---
//
// <Tabs defaultValue="general" onChange={(tab) => console.log(tab)}>
//   <Tabs.List aria-label="Settings">
//     <Tabs.Tab value="general">General</Tabs.Tab>
//     <Tabs.Tab value="security">Security</Tabs.Tab>
//     <Tabs.Tab value="billing">Billing</Tabs.Tab>
//   </Tabs.List>
//   <Tabs.Panel value="general">
//     <h2>General Settings</h2>
//     <p>Manage your profile and preferences.</p>
//   </Tabs.Panel>
//   <Tabs.Panel value="security">
//     <h2>Security Settings</h2>
//     <p>Update password and 2FA.</p>
//   </Tabs.Panel>
//   <Tabs.Panel value="billing">
//     <h2>Billing</h2>
//     <p>Manage payment methods.</p>
//   </Tabs.Panel>
// </Tabs>
