// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://chat-bot-schu.onrender.com');

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    register: `${API_BASE_URL}/api/auth/register`,
  },
  user: {
    profile: `${API_BASE_URL}/api/user`,
    avatar: `${API_BASE_URL}/api/user/avatar`,
  },
  chats: {
    list: `${API_BASE_URL}/api/chats`,
    create: `${API_BASE_URL}/api/chats`,
    messages: (chatId: string) => `${API_BASE_URL}/api/chats/${chatId}/messages`,
    editMessage: (chatId: string, messageId: string) => `${API_BASE_URL}/api/chats/${chatId}/messages/${messageId}/edit`,
  },
  visitors: `${API_BASE_URL}/api/visitors`,
};

export const getImageUrl = (path: string | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};
