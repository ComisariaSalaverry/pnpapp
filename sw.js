// sw.js — Service Worker del Panel de Registros
// Recibe notificaciones push y guarda archivos básicos en caché.

const CACHE_NOMBRE = 'panel-registros-v2';

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

// Si hay internet, carga la versión actual.
// Si no hay internet, usa la versión guardada en caché.
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    fetch(evento.request).catch(() => caches.match(evento.request))
  );
});

// Recibir notificación push
self.addEventListener('push', (evento) => {
  let datos = {
    titulo: 'Nuevo registro',
    cuerpo: 'Un cliente se acaba de registrar.'
  };

  try {
    datos = evento.data.json();
  } catch (e) {
    // Se mantienen los datos por defecto
  }

  evento.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [120, 60, 120],
      data: {
        url: './panel.html'
      }
    })
  );
});

// Al tocar la notificación, abrir o enfocar el panel
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();

  evento.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((listaClientes) => {

      for (const cliente of listaClientes) {
        if (
          cliente.url.includes('panel.html') &&
          'focus' in cliente
        ) {
          return cliente.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow('./panel.html');
      }

    })
  );
});
