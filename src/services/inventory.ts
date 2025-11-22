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
        }
};
