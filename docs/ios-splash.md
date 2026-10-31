# Заставки запуска для iOS

Заставки для всех размеров из таблицы ниже уже лежат в icons/ и подключены в index.html. Таблица нужна, если понадобится перерисовать их или добавить новое устройство.

Нужны картинки PNG в двух вариантах, светлом и тёмном, по образцу icons/splash-1179x2556-light.png и icons/splash-1179x2556-dark.png. Положите их в icons/ с именами из таблицы и вставьте строки ниже в index.html рядом с существующими.

| Устройство | Размер картинки | Файлы |
|---|---|---|
| iPhone SE (2-го и 3-го поколения) | 750x1334 | splash-750x1334-light.png, splash-750x1334-dark.png |
| iPhone 12 mini, 13 mini | 1080x2340 | splash-1080x2340-light.png, splash-1080x2340-dark.png |
| iPhone 12, 13, 14 | 1170x2532 | splash-1170x2532-light.png, splash-1170x2532-dark.png |
| iPhone 16 Pro | 1206x2622 | splash-1206x2622-light.png, splash-1206x2622-dark.png |
| iPhone 14 Plus | 1284x2778 | splash-1284x2778-light.png, splash-1284x2778-dark.png |
| iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus | 1290x2796 | splash-1290x2796-light.png, splash-1290x2796-dark.png |
| iPhone 16 Pro Max | 1320x2868 | splash-1320x2868-light.png, splash-1320x2868-dark.png |
| iPad 10.9" (10-го поколения), iPad Air 10.9" | 1640x2360 | splash-1640x2360-light.png, splash-1640x2360-dark.png |
| iPad Pro 11" | 1668x2388 | splash-1668x2388-light.png, splash-1668x2388-dark.png |
| iPad Pro 12.9" | 2048x2732 | splash-2048x2732-light.png, splash-2048x2732-dark.png |
| iPad Pro 13" (M4) | 2064x2752 | splash-2064x2752-light.png, splash-2064x2752-dark.png |

Строки для index.html:

```html
<link rel="apple-touch-startup-image" href="icons/splash-750x1334-light.png"
      media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-750x1334-dark.png"
      media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-1080x2340-light.png"
      media="(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-1080x2340-dark.png"
      media="(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-1170x2532-light.png"
      media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-1170x2532-dark.png"
      media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-1206x2622-light.png"
      media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-1206x2622-dark.png"
      media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-1284x2778-light.png"
      media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-1284x2778-dark.png"
      media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-1290x2796-light.png"
      media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-1290x2796-dark.png"
      media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-1320x2868-light.png"
      media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-1320x2868-dark.png"
      media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-1640x2360-light.png"
      media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-1640x2360-dark.png"
      media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-1668x2388-light.png"
      media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-1668x2388-dark.png"
      media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-2048x2732-light.png"
      media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-2048x2732-dark.png"
      media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)">
<link rel="apple-touch-startup-image" href="icons/splash-2064x2752-light.png"
      media="(device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)">
<link rel="apple-touch-startup-image" href="icons/splash-2064x2752-dark.png"
      media="(device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)">
```

Вариант без картинок: убрать все строки apple-touch-startup-image. Тогда iOS при запуске покажет белый экран на долю секунды, а в тёмной теме будет заметна вспышка. Отдельного способа задать цвет заставки без картинок у iOS нет.
