import {LineCapShape} from 'leaflet';

export interface IconConfig {
  main: string;
  flipped?: string;
  rotate?: number;
  size: [number, number];
  anchor: [number, number];
  popupAnchor: [number, number];
}

export interface PathConfig {
  color: string;
  weight: number;
  dashArray?: string;
  opacity?: number;
  lineCap?: LineCapShape;
}

export interface MapTheme {
  name: string;
  tileLayer: {
    url: string;
    attribution: string;
  };
  icons: {
    airplane: IconConfig;
    airport: IconConfig;
    [key: string]: IconConfig; // For additional icons like POIs
  };
  paths: {
    elapsed: PathConfig;
    remaining: PathConfig;
  };
}

const mapThemes: MapTheme[] = [
  {
    name: 'Shipwrecked',
    tileLayer: {
      url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
      attribution:
        '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    icons: {
      airplane: {
        main: 'https://hc-cdn.hel1.your-objectstorage.com/s/v3/8cfc2a78921b50c382dfa277fdaefd88ac3b9315_ship2.png',
        flipped: 'https://hc-cdn.hel1.your-objectstorage.com/s/v3/297455d51c8f363e33b8776ec6551b8822ec838d_ship2-flipped.png',
        rotate: 270,
        size: [50, 50],
        anchor: [25, 25],
        popupAnchor: [0, -25]
      },
      airport: {
        main: 'https://hc-cdn.hel1.your-objectstorage.com/s/v3/67dc1b7ca7f8cbfd5fb4c27ba4d7f16c5fa699c3_airport.png',
        size: [50, 50],
        anchor: [25, 45],
        popupAnchor: [0, -25]
      },
      shipwreckedPOI: {
        'main': 'https://hc-cdn.hel1.your-objectstorage.com/s/v3/cc11a3f4e1bb2378c4f3bd9ef57843bb603ecb0c_island2.png',
        'size': [50, 50],
        'anchor': [25, 25],
        'popupAnchor': [0, -25]
      }
    },
    paths: {
      elapsed: {
        color: '#f1f4f7',
        weight: 2,
        dashArray: '4, 4'
      },
      remaining: {
        color: '#d0341a',
        weight: 4,
        dashArray: '10, 15',
        lineCap: 'square'
      }
    }
  },
  {
    name: 'Basic',
    tileLayer: {
      url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    icons: {
      airplane: {
        main: 'https://hc-cdn.hel1.your-objectstorage.com/s/v3/ee918de9195e004cce5defbe47eaba0a6c4ed07a_icons8-plane_1_.svg',
        size: [30, 30],
        anchor: [15, 15],
        popupAnchor: [0, -15],
        rotate: 270
      },
      airport: {
        main: 'https://hc-cdn.hel1.your-objectstorage.com/s/v3/c50d192d62515308001abb2fc4a7e119df0d908c_icons8-pin_1_.svg',
        size: [30, 30],
        anchor: [15, 27.5],
        popupAnchor: [0, -15]
      },
      shipwreckedPOI: {
        main: 'https://hc-cdn.hel1.your-objectstorage.com/s/v3/cc83cff7b47faf4d231bbf405892d97a6663a3a9_icons8-island.svg',
        size: [30, 30],
        anchor: [15, 15],
        popupAnchor: [0, -15]
      }
    },
    paths: {
      elapsed: {
        color: '#111f3e',
        weight: 3,
        opacity: 0.5,
        dashArray: '5, 10'
      },
      remaining: {
        color: '#3f51b5',
        weight: 3,
        opacity: 0.5,
        dashArray: '5, 10'
      }
    }
  }
];

export default mapThemes;
