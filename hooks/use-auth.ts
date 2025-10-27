import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const userData = JSON.parse(token);
      setUser(userData);
    }
  }, []);

  return { user };
} 