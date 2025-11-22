import type { InventoryItem } from '../types';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { InventoryService } from '../services/inventory';

interface InventoryListProps {
    items: InventoryItem[];
    onUpdate: () => void; // Trigger refresh
                    )
}
                </div >
            ))}
        </div >
    );
};
