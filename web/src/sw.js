import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

// Precache sa napĺňa počas inštalácie; až potom má zmysel preberať kontrolu.
// Pri `skipWaiting()` volanom hneď pri štarte sa nový worker aktivoval ešte
// pred dotiahnutím súborov a stránka sa načítala uprostred výmeny — odtiaľ
// biela obrazovka po nasadení.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {
  denylist: [/^\/api\//]
}));

self.addEventListener('push', event => {
    if (!event.data) return;
    let data;
    try { data = event.data.json(); }
    catch { data = { title: 'BetClub', body: event.data.text() }; }
    event.waitUntil(
        self.registration.showNotification(data.title || 'BetClub', {
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
