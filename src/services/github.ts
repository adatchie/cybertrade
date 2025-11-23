import axios from 'axios';
import type { InventoryItem } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubConfig {
    token: string;
    owner: string;
    repo: string;
    path: string;
}

export const GitHubService = {
    // Validate token and repo access
    validateConfig: async (config: GitHubConfig): Promise<boolean> => {
        try {
            await axios.get(`${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}`, {
                headers: {
                    Authorization: `Bearer ${config.token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            });
            return true;
        } catch (e) {
            console.error('GitHub config validation failed', e);
            return false;
        }
    },

    // Fetch inventory from GitHub
    fetchInventory: async (config: GitHubConfig): Promise<{ items: InventoryItem[], sha: string } | null> => {
        try {
            const response = await axios.get(`${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${config.path}`, {
                headers: {
                    Authorization: `Bearer ${config.token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            });

            const content = atob(response.data.content); // Decode Base64
            const items = JSON.parse(content);
            return { items, sha: response.data.sha };
        } catch (e: any) {
            if (e.response && e.response.status === 404) {
                // File doesn't exist yet, return empty list
                return { items: [], sha: '' };
            }
            console.error('Failed to fetch inventory from GitHub', e);
            throw e;
        }
    },

    // Save inventory to GitHub
    saveInventory: async (config: GitHubConfig, items: InventoryItem[], sha?: string): Promise<string> => {
        try {
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(items, null, 2)))); // Encode to Base64 (utf-8 safe)

            const data: any = {
                message: 'Update inventory data',
                content: content,
            };

            if (sha) {
                data.sha = sha;
            }

            const response = await axios.put(`${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${config.path}`, data, {
                headers: {
                    Authorization: `Bearer ${config.token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            });

            return response.data.content.sha;
        } catch (e) {
            console.error('Failed to save inventory to GitHub', e);
            throw e;
        }
    }
};
