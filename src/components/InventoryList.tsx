import type { InventoryItem } from '../types';
import { Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { InventoryService } from '../services/inventory';

interface InventoryListProps {
    items: InventoryItem[];
    onUpdate: () => void; // Trigger refresh
}

export const InventoryList = ({ items, onUpdate }: InventoryListProps) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ price: string, quantity: string }>({ price: '', quantity: '' });
    const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');

    const startEdit = (item: InventoryItem) => {
        setEditingId(item.id);
        setEditForm({ price: item.purchasePrice.toString(), quantity: item.quantity.toString() });
    };

    const saveEdit = (id: string) => {
        const price = parseInt(editForm.price) || 0;
        </div >
    );
};
