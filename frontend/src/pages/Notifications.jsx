import { useState, useEffect } from 'react';
import api from '../api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  const load = () => api.get('/notifications').then(r => setNotifications(r.data));
  useEffect(() => { load(); }, []);

  const deleteOne = async (nid) => {
    await api.delete(`/notifications/${nid}`);
    load();
  };

  const deleteAll = async () => {
    if (!confirm('Xóa tất cả thông báo?')) return;
    await api.delete('/notifications');
    load();
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <div>
      <div className="page-header">
        <h1>🔔 Thông Báo</h1>
        {notifications.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={deleteAll}>🗑 Xóa tất cả</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔕</div>
          <p>Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map(n => (
            <div key={n.notification_id} className="notif-item">
              <div className="notif-msg">🔔 {n.message}</div>
              <div className="flex items-center gap-3">
                <span className="notif-time">{timeAgo(n.created_at)}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteOne(n.notification_id)} style={{ color: '#ef4444' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}