// Mock API for Authentication
export type Role = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export const authApi = {
  async login(pin: string): Promise<{ user: User; token: string }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    if (pin === '1234') {
      return {
        user: { id: 'admin-1', name: 'Admin Pusat', role: 'ADMIN' },
        token: 'mock-jwt-token-admin-123',
      };
    }
    
    if (pin === '9999') {
      return {
        user: { id: 'super-1', name: 'Super Admin', role: 'SUPER_ADMIN' },
        token: 'mock-jwt-token-super-999',
      };
    }

    throw new Error('PIN tidak valid.');
  },
  
  async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    // Usually invalidates token on backend
  }
};
