import type { InventoryItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'resale_inventory';

export const InventoryService = {
    getAll: (): InventoryItem[] => {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    add: (janCode: string, purchasePrice: number, quantity: number = 1) => {
        const items = InventoryService.getAll();
        const newItem: InventoryItem = {
            id: uuidv4(),
            janCode,
            name: `Item ${janCode}`, // Placeholder name
            purchasePrice,
            quantity,
            timestamp: Date.now(),
        };
        items.unshift(newItem);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return newItem;
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
        const filtered = items.filter(i => i.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
};
