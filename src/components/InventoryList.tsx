import type { InventoryItem } from '../types';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { InventoryService } from '../services/inventory';

interface InventoryListProps {
    items: InventoryItem[];
    onUpdate: () => void; // Trigger refresh
}

export const InventoryList = ({ items, onUpdate }: InventoryListProps) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ price: string, quantity: string }>({ price: '', quantity: '' });

    const startEdit = (item: InventoryItem) => {
        setEditingId(item.id);
        setEditForm({ price: item.purchasePrice.toString(), quantity: item.quantity.toString() });
    };

    const saveEdit = (id: string) => {
        const price = parseInt(editForm.price) || 0;
        const quantity = parseInt(editForm.quantity) || 1;
        InventoryService.update(id, { purchasePrice: price, quantity });
        setEditingId(null);
        onUpdate();
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this item?')) {
            InventoryService.remove(id);
            onUpdate();
        }
    };

    if (items.length === 0) {
        return <div className="card"><p>No items in inventory.</p></div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map(item => (
                <div key={item.id} className="card">
                    {editingId === item.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{item.janCode}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem' }}>Price</label>
                                    <input
                                        type="number"
                                        value={editForm.price}
                                        onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem' }}>Qty</label>
                                    <input
                                        type="number"
                                        value={editForm.quantity}
                                        onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '5px' }}>
                                <button onClick={cancelEdit} className="btn" style={{ width: 'auto', padding: '8px', background: '#333' }}><X size={18} /></button>
                                <button onClick={() => saveEdit(item.id)} className="btn btn-primary" style={{ width: 'auto', padding: '8px' }}><Check size={18} /></button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{item.janCode}</div>
                                <div style={{ fontSize: '0.9rem' }}>{item.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Cost: ¥{item.purchasePrice.toLocaleString()} x {item.quantity}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => startEdit(item)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--secondary-color)', cursor: 'pointer' }}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
