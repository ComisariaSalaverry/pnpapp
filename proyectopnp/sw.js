// sw.js — Service Worker del Panel de Registros
// Se encarga de: 1) recibir notificaciones push aunque la app esté cerrada,
//                2) guardar en caché lo básico para que la app abra sin internet.

const CACHE_NOMBRE = 'panel-registros-v1';
const ARCHIVOS_BASE = [
  './panel.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOMBRE).then((cache) => cache.addAll(ARCHIVOS_BASE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NOMBRE)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

// Sirve desde caché si no hay internet; si hay, intenta traer lo más nuevo
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    fetch(evento.request).catch(() => caches.match(evento.request))
  );
});

// === Esto es lo importante: recibir la notificación push y mostrarla ===
self.addEventListener('push', (evento) => {
  let datos = { titulo: 'Nuevo registro', cuerpo: 'Un cliente se acaba de registrar.' };
  try {
    datos = evento.data.json();
  } catch (e) {
    // si no llega en formato JSON, se usa el texto por defecto de arriba
  }

  evento.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [120, 60, 120],
      data: { url: './panel.html' }
    })
  );
});

// Al tocar la notificación, abre (o enfoca) el panel
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((listaClientes) => {
      for (const cliente of listaClientes) {
        if (cliente.url.includes('panel.html') && 'focus' in cliente) return cliente.focus();
      }
      if (clients.openWindow) return clients.openWindow('./panel.html');
    })
  );
});
