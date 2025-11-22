import { useState, useEffect } from 'react';
import { Scan, List, TrendingUp } from 'lucide-react';
import './index.css';
import { Scanner } from './components/Scanner';
import { InventoryList } from './components/InventoryList';
import { InventoryService } from './services/inventory';
import { PriceService } from './services/prices';
import type { InventoryItem, ShopPrice } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'inventory' | 'analysis'>('scan');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Scan State
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [prices, setPrices] = useState<ShopPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState<string>('');

  useEffect(() => {
    setInventory(InventoryService.getAll());
  }, []);

  const handleScan = async (code: string) => {
    if (scannedCode === code) return; // Prevent duplicate processing
    setScannedCode(code);
    setLoadingPrices(true);

    try {
      const fetchedPrices = await PriceService.fetchPrices(code);
      setPrices(fetchedPrices);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleAddToInventory = () => {
    if (!scannedCode) return;
    const price = parseInt(purchasePrice) || 0;
    InventoryService.add(scannedCode, price, 1);
    setInventory(InventoryService.getAll());

    // Reset
    setScannedCode(null);
    setPrices([]);
    setPurchasePrice('');
    alert('Added to inventory!');
  };

  const handleRemoveItem = (id: string) => {
    if (confirm('Delete this item?')) {
      InventoryService.remove(id);
      setInventory(InventoryService.getAll());
    }
  };

  const bestPrice = PriceService.getBestPrice(prices);

  return (
    <div className="app-container">
      <header style={{
        padding: '16px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>
          <span className="text-neon">CYBER</span> TRADER
        </h1>
      </header>

      <main className="container" style={{ paddingTop: '20px' }}>
        {activeTab === 'scan' && (
          <>
            {!scannedCode ? (
              <Scanner onScan={handleScan} />
            ) : (
              <div className="card">
                <h2 className="text-neon">Scanned: {scannedCode}</h2>

                {loadingPrices ? (
                  <p>Fetching prices...</p>
                ) : (
                  <div style={{ margin: '20px 0' }}>
                    <h3>Price Check</h3>

                    {bestPrice && (
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: 'var(--primary-color)',
                        border: '1px solid var(--primary-color)',
                        padding: '10px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        marginBottom: '20px'
                      }}>
                        ¥{bestPrice.price.toLocaleString()}
                        <div style={{ fontSize: '0.8rem', color: 'white' }}>Best: {bestPrice.shopName}</div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                      {prices.map((shop) => (
                        <a
                          key={shop.shopName}
                          href={shop.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'var(--surface-color-light)',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            color: 'white',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          <span>{shop.shopName}</span>
                          {shop.price > 0 ? (
                            <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>¥{shop.price.toLocaleString()}</span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Check Site &rarr;</span>
                          )}
                        </a>
                      ))}
                    </div>

                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px' }}>Purchase Cost</label>
                      <input
                        type="number"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="Enter cost..."
                      />
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                      <button className="btn" style={{ background: '#333' }} onClick={() => setScannedCode(null)}>Cancel</button>
                      <button className="btn btn-primary" onClick={handleAddToInventory}>Add to Stock</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'inventory' && (
          <InventoryList items={inventory} onUpdate={() => setInventory(InventoryService.getAll())} />
        )}

        {activeTab === 'analysis' && (
          <div className="card">
            <h2>Profit Analysis</h2>
            <p>Total Items: {inventory.length}</p>
            {/* Future implementation */}
          </div>
        )}
      </main>

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--surface-color)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px',
        zIndex: 100
      }}>
        <NavButton
          icon={<Scan />}
          label="Scan"
          active={activeTab === 'scan'}
          onClick={() => setActiveTab('scan')}
        />
        <NavButton
          icon={<List />}
          label="Stock"
          active={activeTab === 'inventory'}
          onClick={() => setActiveTab('inventory')}
        />
        <NavButton
          icon={<TrendingUp />}
          label="Profit"
          active={activeTab === 'analysis'}
          onClick={() => setActiveTab('analysis')}
        />
      </nav>
    </div>
  );
}

const NavButton = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      color: active ? 'var(--primary-color)' : 'var(--text-secondary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      cursor: 'pointer'
    }}
  >
    {icon}
    <span style={{ fontSize: '0.75rem' }}>{label}</span>
  </button>
);

export default App;
