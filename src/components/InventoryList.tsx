import type { InventoryItem } from '../types';
import { Trash2, Edit2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { InventoryService } from '../services/inventory';
import { PriceService } from '../services/prices';

interface InventoryListProps {
    items: InventoryItem[];
    onUpdate: () => void; // Trigger refresh
}

export const InventoryList = ({ items, onUpdate }: InventoryListProps) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ price: string, quantity: string }>({ price: '', quantity: '' });
    const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    const handleSell = (item: InventoryItem) => {
        const sellQtyStr = item.quantity > 1 ? prompt(`How many to sell? (Max: ${item.quantity})`, item.quantity.toString()) : '1';
        if (sellQtyStr === null) return;

        const sellQty = parseInt(sellQtyStr);
        if (isNaN(sellQty) || sellQty <= 0 || sellQty > item.quantity) {
            alert('Invalid quantity');
            return;
        }

        const priceStr = prompt('Enter sold price per unit (optional):', '0');
        if (priceStr !== null) {
            const price = parseInt(priceStr) || 0;
            if (sellQty < item.quantity) {
                // Reduce current item quantity
                InventoryService.update(item.id, { quantity: item.quantity - sellQty });
                // Add sold item
                InventoryService.add({
                    janCode: item.janCode,
                    name: item.name,
                    imageUrl: item.imageUrl,
                    purchasePrice: item.purchasePrice,
                    quantity: sellQty,
                    status: 'sold',
                    soldDate: Date.now(),
                    soldPrice: price
                } as any);
            } else {
                InventoryService.markAsSold(item.id, price);
            }
            onUpdate();
        }
    };

    const handleDelete = (item: InventoryItem) => {
        if (item.quantity > 1) {
            const delQtyStr = prompt(`How many to delete? (Max: ${item.quantity}) \nEnter "all" to delete everything.`, '1');
            if (delQtyStr === null) return;

            if (delQtyStr.toLowerCase() === 'all') {
                if (confirm('Permanently delete all units?')) {
                    InventoryService.remove(item.id);
                    onUpdate();
                }
                return;
            }

            const delQty = parseInt(delQtyStr);
            if (isNaN(delQty) || delQty <= 0 || delQty > item.quantity) {
                alert('Invalid quantity');
                return;
            }

            if (delQty === item.quantity) {
                if (confirm('Permanently delete all units?')) {
                    InventoryService.remove(item.id);
                    onUpdate();
                }
            } else {
                InventoryService.update(item.id, { quantity: item.quantity - delQty });
                onUpdate();
            }
        } else {
            if (confirm('Permanently delete this record?')) {
                InventoryService.remove(item.id);
                onUpdate();
            }
        }
    };

    const handleRefreshMetadata = async () => {
        if (!confirm('Update product info (images/names) for all items? This might take a while.')) return;

        setIsRefreshing(true);
        try {
            // Process unique JANs to avoid redundant requests
            const uniqueJans = Array.from(new Set(items.map(i => i.janCode)));

            for (const jan of uniqueJans) {
                try {
                    const results = await PriceService.fetchPrices(jan);
                    const wikiResult = results.find(r => r.shopName === '買取Wiki' && (r as any).productName);

                    if (wikiResult) {
                        const name = (wikiResult as any).productName;
                        const imageUrl = (wikiResult as any).imageUrl;

                        // Update all items with this JAN
                        const itemsToUpdate = items.filter(i => i.janCode === jan);
                        itemsToUpdate.forEach(item => {
                            if (!item.imageUrl || item.name.startsWith('Item ')) { // Only update if missing or generic
                                InventoryService.update(item.id, {
                                    name: name,
                                    imageUrl: imageUrl
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.error(`Failed to refresh ${jan}`, e);
                }
            }
            onUpdate();
            alert('Metadata updated!');
        } catch (error) {
            console.error(error);
            alert('Error updating metadata');
        } finally {
            setIsRefreshing(false);
        }
    };

    const filteredItems = items.filter(item => {
        const status = item.status || 'active'; // Default to active for old data
        return status === activeTab;
    });

    return (
        <div className="inventory-list">
            <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
                <button
                    className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: activeTab === 'active' ? 'var(--primary-color)' : '#333',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px'
                    }}
                >
                    Active Stock
                </button>
                <button
                    className={`tab-btn ${activeTab === 'sold' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sold')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: activeTab === 'sold' ? 'var(--primary-color)' : '#333',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px'
                    }}
                >
                    Sold History
                </button>
                <button
                    onClick={handleRefreshMetadata}
                    disabled={isRefreshing}
                    style={{
                        padding: '10px',
                        background: '#444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isRefreshing ? 'wait' : 'pointer'
                    }}
                    title="Refresh Metadata (Images/Names)"
                >
                    <RefreshCw size={20} className={isRefreshing ? 'spin' : ''} />
                </button>
            </div>

            {filteredItems.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>No items in {activeTab} list.</p>
            ) : (
                filteredItems.map((item) => (
                    <div key={item.id} className="inventory-item" style={{
                        background: '#1a1a1a',
                        padding: '15px',
                        borderRadius: '12px',
                        marginBottom: '10px',
                        border: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                            ) : (
                                <div style={{ width: '60px', height: '60px', background: '#333', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.7rem' }}>No Img</div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{item.name || item.janCode}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{item.janCode}</div>
                            </div>
                        </div>

                        {editingId === item.id ? (
                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                <input
                                    type="number"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                    style={{ width: '80px', padding: '5px' }}
                                    placeholder="Price"
                                />
                                <input
                                    type="number"
                                    value={editForm.quantity}
                                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                                    style={{ width: '50px', padding: '5px' }}
                                    placeholder="Qty"
                                />
                                <button onClick={() => saveEdit(item.id)} style={{ background: 'green', color: 'white', border: 'none', borderRadius: '4px' }}>Save</button>
                                <button onClick={() => setEditingId(null)} style={{ background: '#666', color: 'white', border: 'none', borderRadius: '4px' }}>Cancel</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ color: '#aaa' }}>Buy: ¥{item.purchasePrice.toLocaleString()}</div>
                                    <div style={{ color: '#aaa', fontWeight: 'bold' }}>Qty: {item.quantity}</div>
                                    {item.status === 'sold' && (
                                        <div style={{ color: '#4caf50', fontWeight: 'bold' }}>
                                            Sold: ¥{(item.soldPrice || 0).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {item.status !== 'sold' && (
                                        <>
                                            <Edit2 size={20} color="#4a90e2" onClick={() => startEdit(item)} style={{ cursor: 'pointer' }} />
                                            <button
                                                onClick={() => handleSell(item)}
                                                style={{
                                                    background: 'var(--primary-color)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '5px 10px',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Sell
                                            </button>
                                        </>
                                    )}
                                    <Trash2 size={20} color="#ff4444" onClick={() => handleDelete(item)} style={{ cursor: 'pointer' }} />
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};
