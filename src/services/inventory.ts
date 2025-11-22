import type { InventoryItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'resale_inventory';

export const InventoryService = {
    getAll: (): InventoryItem[] => {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    add: (item: Omit<InventoryItem, 'id' | 'timestamp' | 'status'>) => {
        const items = InventoryService.getAll();
        const newItem: InventoryItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'active'
        };
        items.push(newItem);
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
    }
};
