import { User } from '../types/models/user';
import { MOCK_ADMIN_USER } from '../mock';

class AuthService {
  async login(username: string, password: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (username === 'admincontrole' && password === 'admin@vogel') {
      return MOCK_ADMIN_USER;
    }
    
    throw new Error('Credenciais inválidas. Verifique seu usuário e senha.');
  }

  async logout(): Promise<void> {
    // Simular logout
  }
}

export const authService = new AuthService();
