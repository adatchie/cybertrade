import type { InventoryItem } from '../types';

const STORAGE_KEY = 'resale_inventory';

export const InventoryService = {
    getAll: (): InventoryItem[] => {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    add: (item: Omit<InventoryItem, 'id' | 'timestamp' | 'status'> & { status?: 'active' | 'sold' }) => {
        const items = InventoryService.getAll();
        // Only group if status is active (don't group sold items for now)
        const existingItemIndex = item.status !== 'sold'
            ? items.findIndex(i => i.janCode === item.janCode && i.status === 'active')
            : -1;

        if (existingItemIndex !== -1) {
            // Update existing item
            const existingItem = items[existingItemIndex];
            items[existingItemIndex] = {
                ...existingItem,
                quantity: existingItem.quantity + item.quantity,
                name: item.name || existingItem.name,
                imageUrl: item.imageUrl || existingItem.imageUrl
            };
        } else {
            // Add new item
            const newItem: InventoryItem = {
                ...item,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                status: item.status || 'active'
            };
            items.push(newItem);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    },

    update: (id: string, updates: Partial<InventoryItem>) => {
        const items = InventoryService.getAll();
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updates };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
    },

    remove: (id: string) => {
        const items = InventoryService.getAll();
        const newItems = items.filter(i => i.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    },

    markAsSold: (id: string, soldPrice?: number) => {
        InventoryService.update(id, {
            status: 'sold',
            soldDate: Date.now(),
            soldPrice: soldPrice || 0
        });
    },

    importItem: (item: InventoryItem) => {
        const items = InventoryService.getAll();
        // Check if ID exists to avoid duplicates
        if (!items.find(i => i.id === item.id)) {
            items.push(item);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
    }
};
