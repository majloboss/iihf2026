self.addEventListener('push', event => {
    if (!event.data) return;
    let data;
    try { data = event.data.json(); } catch { data = { title: 'IIHF 2026', body: event.data.text() }; }
    event.waitUntil(
        self.registration.showNotification(data.title || 'IIHF 2026', {
            body: data.body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: { url: data.url || '/' },
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) {
                if (new URL(c.url).pathname === url && 'focus' in c) return c.focus();
            }
            return clients.openWindow(url);
        })
    );
});
