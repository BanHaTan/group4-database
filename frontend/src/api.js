import axios from 'axios';

// Khi build production → dùng URL Render backend
// Khi dev local → dùng proxy (vite.config.js xử lý)
const BASE_URL = import.meta.env.PROD
  ? 'https://pm-system-api.onrender.com/api'  // ← Link Render của bạn
  : '/api';

const api = axios.create({
  baseURL: BASE_URL
});

// Gắn Token vào Header mỗi khi gọi API
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Xử lý khi Token hết hạn hoặc không hợp lệ
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // SỬA TẠI ĐÂY: Trỏ về đúng tên Repo của bạn trên GitHub Pages
      window.location.href = import.meta.env.PROD
        ? '/group4-database/'  // Khớp với 'base' trong vite.config.js
        : '/login';
    }
    return Promise.reject(err);
  }
);

export default api;